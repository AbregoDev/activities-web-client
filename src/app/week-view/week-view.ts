import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  interval,
  map,
  merge,
  switchMap,
  tap,
} from 'rxjs';
import { SelectButton } from 'primeng/selectbutton';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ActivitiesService } from '../activities/activities.service';
import { Activity, ActivityDateRange } from '../activities/activity.interface';
import { ActivityItem } from '../activities/activity-item/activity-item';

type WeekStart = 'monday' | 'sunday';

interface DayActivity {
  readonly activity: Activity;
  readonly startMinutes: number;
  readonly durationMinutes: number;
}

const MINUTE_PRECISION = 5;
const CURRENT_TIME_UPDATE_INTERVAL = 5 * 60 * 1000;

@Component({
  selector: 'app-week-view',
  imports: [FormsModule, SelectButton, ToggleSwitch, ActivityItem],
  templateUrl: './week-view.html',
  styleUrl: './week-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekView {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly refreshRequests = new Subject<void>();
  private readonly selectedDate = signal(new Date());
  private readonly todayDateKey = signal(this.toDateKey(this.selectedDate()));
  private readonly monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
  private readonly currentTime = signal(new Date());
  protected readonly currentTimePositionMinutes = computed(() => {
    const now = this.currentTime();
    return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  });

  protected readonly weekStartsOn = signal<WeekStart>('monday');
  protected readonly showWeekends = signal(true);
  protected readonly loadingActivities = signal(false);
  private readonly activities = signal<readonly Activity[]>([]);
  protected readonly startOptions = [
    { label: 'Monday', value: 'monday' },
    { label: 'Sunday', value: 'sunday' },
  ];
  protected readonly hours = Array.from(
    { length: 24 },
    (_, hour) => `${String(hour).padStart(2, '0')}:00`,
  );

  private readonly weekdays = [
    { name: 'Sunday', weekend: true },
    { name: 'Monday', weekend: false },
    { name: 'Tuesday', weekend: false },
    { name: 'Wednesday', weekend: false },
    { name: 'Thursday', weekend: false },
    { name: 'Friday', weekend: false },
    { name: 'Saturday', weekend: true },
  ];

  private readonly weekStartDate = computed(() => {
    const selected = this.selectedDate();
    const start = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
    const firstDay = this.weekStartsOn() === 'monday' ? 1 : 0;
    start.setDate(start.getDate() - ((start.getDay() - firstDay + 7) % 7));
    return start;
  });

  protected readonly weekDays = computed(() =>
    Array.from({ length: 7 }, (_, offset) => {
      const date = this.addDays(this.weekStartDate(), offset);
      return {
        ...this.weekdays[date.getDay()],
        dateKey: this.toDateKey(date),
        dateLabel: this.formatDate(date),
        isToday: this.toDateKey(date) === this.todayDateKey(),
      };
    }),
  );

  readonly weekRange = computed(() => ({
    startDate: this.weekDays()[0].dateKey,
    endDate: this.weekDays()[6].dateKey,
  }));

  protected readonly weekLabel = computed(
    () => `${this.weekDays()[0].dateLabel} - ${this.weekDays()[6].dateLabel}`,
  );

  protected readonly visibleDays = computed(() => {
    const days = this.weekDays();
    return this.showWeekends() ? days : days.filter((day) => !day.weekend);
  });

  protected readonly activitiesByDay = computed(() => {
    const byDay = new Map<string, DayActivity[]>();
    for (const activity of this.activities()) {
      const start =
        Math.floor(this.toMinutes(activity.startTime) / MINUTE_PRECISION) * MINUTE_PRECISION;
      const end = Math.ceil(this.toMinutes(activity.endTime) / MINUTE_PRECISION) * MINUTE_PRECISION;
      const dayActivities = byDay.get(activity.date) ?? [];
      dayActivities.push({ activity, startMinutes: start, durationMinutes: end - start });
      byDay.set(activity.date, dayActivities);
    }
    return byDay;
  });

  constructor() {
    interval(CURRENT_TIME_UPDATE_INTERVAL)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.currentTime.set(new Date()));

    merge(
      toObservable(this.weekRange).pipe(
        distinctUntilChanged(
          (previous, current) =>
            previous.startDate === current.startDate && previous.endDate === current.endDate,
        ),
        map((range) => ({ range, refresh: false })),
      ),
      this.refreshRequests.pipe(map(() => ({ range: this.weekRange(), refresh: true }))),
    )
      .pipe(
        switchMap(({ range, refresh }) => {
          this.loadingActivities.set(true);
          this.activities.set([]);
          return this.getActivitiesForWeek(range, refresh).pipe(
            tap((activities) => this.activities.set(activities)),
            catchError((error: unknown) => {
              console.error('Failed to fetch activities for week', range, error);
              return EMPTY;
            }),
            finalize(() => this.loadingActivities.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  private getActivitiesForWeek(
    range: ActivityDateRange,
    refresh: boolean,
  ): Observable<readonly Activity[]> {
    const months = new Set([range.startDate.slice(0, 7), range.endDate.slice(0, 7)]);
    return forkJoin(
      Array.from(months, (monthKey) => {
        const [year, month] = monthKey.split('-').map(Number);
        return this.activitiesService.getActivitiesByMonth(year, month, refresh);
      }),
    ).pipe(
      map((monthsActivities) =>
        monthsActivities
          .flat()
          .filter((activity) => activity.date >= range.startDate && activity.date <= range.endDate),
      ),
    );
  }

  protected refreshActivities(): void {
    if (!this.loadingActivities()) {
      this.refreshRequests.next();
    }
  }

  protected setActivityCompleted(id: string, isCompleted: boolean): void {
    this.patchLocalActivity(id, isCompleted);
    this.activitiesService.updateActivityCompletion(id, isCompleted).subscribe({
      error: () => this.patchLocalActivity(id, !isCompleted),
    });
  }

  private patchLocalActivity(id: string, isCompleted: boolean): void {
    this.activities.update((activities) =>
      activities.map((activity) => (activity.id === id ? { ...activity, isCompleted } : activity)),
    );
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  protected moveWeek(direction: -1 | 1): void {
    this.todayDateKey.set(this.toDateKey(new Date()));
    this.selectedDate.update((date) => this.addDays(date, direction * 7));
  }

  protected goToCurrentWeek(): void {
    const today = new Date();
    this.todayDateKey.set(this.toDateKey(today));
    this.selectedDate.set(today);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatDate(date: Date): string {
    return `${date.getDate()}/${this.monthFormatter.format(date).toLowerCase()}/${date.getFullYear()}`;
  }
}
