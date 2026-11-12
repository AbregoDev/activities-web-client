export interface Activity {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string | null;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly isCompleted: boolean;
}

export interface ActivityDataRequest {
  readonly name: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
}

export type CreateActivityRequest = ActivityDataRequest;

export type UpdateActivityRequest = Partial<ActivityDataRequest>;

export interface ActivityDateRange {
  readonly startDate: string;
  readonly endDate: string;
}
