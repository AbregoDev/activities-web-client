import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { ActivitiesService } from '../activities.service';
import { Activity, ActivityDataRequest } from '../activity.interface';

const timeRangeValidator: ValidatorFn = (control) => {
  const startTime = control.get('startTime')?.value;
  const endTime = control.get('endTime')?.value;
  if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
    return null;
  }

  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  return endMinutes > startMinutes ? null : { invalidTimeRange: true };
};

@Component({
  selector: 'app-create-activity-dialog',
  imports: [DatePicker, Dialog, ReactiveFormsModule],
  templateUrl: './create-activity-dialog.html',
  styleUrl: './create-activity-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateActivityDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input.required<boolean>();
  readonly activity = input<Activity | null>(null);
  readonly visibleChange = output<boolean>();
  readonly activitySaved = output<void>();
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = this.formBuilder.group(
    {
      name: this.formBuilder.nonNullable.control('', {
        validators: [(control) => (control.value.trim().length > 0 ? null : { required: true })],
      }),
      date: this.formBuilder.control<Date | null>(new Date(), Validators.required),
      startTime: this.formBuilder.control<Date | null>(null, Validators.required),
      endTime: this.formBuilder.control<Date | null>(null, Validators.required),
    },
    { validators: timeRangeValidator },
  );

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }

      const activity = this.activity();
      if (activity) {
        this.form.reset({
          name: activity.name,
          date: this.parseDate(activity.date),
          startTime: this.parseTime(activity.startTime),
          endTime: this.parseTime(activity.endTime),
        });
      } else {
        this.form.reset({ name: '', date: new Date(), startTime: null, endTime: null });
      }
      this.submitError.set(null);
    });
  }

  protected submit(): void {
    this.submitError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, date, startTime, endTime } = this.form.getRawValue();
    if (
      !name.trim() ||
      !(date instanceof Date) ||
      !(startTime instanceof Date) ||
      !(endTime instanceof Date)
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const request: ActivityDataRequest = {
      name: name.trim(),
      date: this.formatDate(date),
      startTime: this.formatTime(startTime),
      endTime: this.formatTime(endTime),
    };
    const activity = this.activity();
    const operation = activity
      ? this.activitiesService.updateActivity(activity.id, request)
      : this.activitiesService.createActivity(request);
    const operationName = activity ? 'update' : 'create';

    this.isSubmitting.set(true);
    operation
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.activitySaved.emit(),
        error: (error: unknown) => {
          console.error(`Failed to ${operationName} activity`, error);
          this.submitError.set(
            error instanceof HttpErrorResponse && error.status === 0
              ? 'Could not reach the server. Please try again.'
              : `Unable to ${operationName} the activity. Please try again.`,
          );
        },
      });
  }

  protected close(): void {
    if (!this.isSubmitting()) {
      this.visibleChange.emit(false);
    }
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseDate(date: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private parseTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date();
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
  }
}
