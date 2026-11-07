import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';
import { ToggleSwitch } from 'primeng/toggleswitch';

type WeekStart = 'monday' | 'sunday';

@Component({
  selector: 'app-week-view',
  imports: [FormsModule, SelectButton, ToggleSwitch],
  templateUrl: './week-view.html',
  styleUrl: './week-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekView {
  private readonly selectedDate = signal(new Date());
  private readonly todayDateKey = signal(this.toDateKey(this.selectedDate()));
  private readonly monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

  protected readonly weekStartsOn = signal<WeekStart>('monday');
  protected readonly showWeekends = signal(true);
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
