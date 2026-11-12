import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Checkbox } from 'primeng/checkbox';
import { Activity } from '../activity.interface';

@Component({
  selector: 'app-activity-item',
  imports: [FormsModule, Checkbox],
  templateUrl: './activity-item.html',
  styleUrl: './activity-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.completed]': 'activity().isCompleted',
    '(click)': 'requestEdit($event)',
  },
})
export class ActivityItem {
  readonly activity = input.required<Activity>();
  readonly completedChange = output<boolean>();
  readonly editRequested = output<void>();

  protected requestEdit(event: Event): void {
    if (event.target instanceof Element && event.target.closest('p-checkbox')) {
      return;
    }

    this.editRequested.emit();
  }
}
