export interface Activity {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string | null;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly isCompleted: boolean;
}

export interface CreateActivityRequest {
  readonly name: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface ActivityDateRange {
  readonly startDate: string;
  readonly endDate: string;
}
