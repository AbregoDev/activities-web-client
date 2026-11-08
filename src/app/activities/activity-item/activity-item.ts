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
  host: { '[class.completed]': 'activity().isCompleted' },
})
export class ActivityItem {
  readonly activity = input.required<Activity>();
  readonly completedChange = output<boolean>();
}
