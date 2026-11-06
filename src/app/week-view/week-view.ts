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
    { name: 'Monday', weekend: false },
    { name: 'Tuesday', weekend: false },
    { name: 'Wednesday', weekend: false },
    { name: 'Thursday', weekend: false },
    { name: 'Friday', weekend: false },
    { name: 'Saturday', weekend: true },
    { name: 'Sunday', weekend: true },
  ];

  protected readonly visibleDays = computed(() => {
    const days = this.weekStartsOn() === 'sunday'
      ? [...this.weekdays.slice(6), ...this.weekdays.slice(0, 6)]
      : this.weekdays;

    return this.showWeekends() ? days : days.filter((day) => !day.weekend);
  });
}