import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, of, tap } from 'rxjs';
import { Activity, ActivityDateRange } from './activity.interface';

interface CachedActivities {
  readonly activities: readonly Activity[];
  readonly expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CachedActivities>();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly maxCachedRanges = 20;

  getActivities(range: ActivityDateRange, refresh = false): Observable<readonly Activity[]> {
    return defer(() => {
      this.removeExpiredElementsInCache();

      const key = `${range.startDate}/${range.endDate}`;
      const cached = this.cache.get(key);
      // Since the cache is limited to maxCachedRanges, removing the cached element and then resetting it
      // ensures it'll not be removed when the cache exceeds the maxCachedRanges limit.
      // (Below the code deletes the older entry)
      this.cache.delete(key);
      if (!refresh && cached) {
        this.cache.set(key, cached);
        return of(cached.activities);
      }

      const url = '/api/activities/range';
      const params = { startDate: range.startDate, endDate: range.endDate };
      return this.http.get<readonly Activity[]>(url, { params })
        .pipe(
          tap(activities => this.writeActivitiesToCache(key, activities))
        );
    });
  }

  updateActivityCompletion(id: string, isCompleted: boolean): Observable<Activity> {
    return this.http
      .patch<Activity>(`/api/activities/${id}`, { isCompleted })
      .pipe(tap((updated) => this.patchActivityInCache(updated)));
  }

  private patchActivityInCache(updated: Activity): void {
    for (const [key, entry] of this.cache) {
      if (entry.activities.some((activity) => activity.id === updated.id)) {
        this.cache.set(key, {
          ...entry,
          activities: entry.activities.map((activity) =>
            activity.id === updated.id ? updated : activity,
          ),
        });
      }
    }
  }

  private writeActivitiesToCache(key: string, activities: any) {
    this.cache.delete(key);
    this.cache.set(key, {
      activities,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    this.removeExcessElementsInCache();
  }

  private removeExpiredElementsInCache(): void {
    const now = Date.now();

    for (const [cachedKey, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(cachedKey);
      }
    }
  }

  private removeExcessElementsInCache(): void {
    while (this.cache.size > this.maxCachedRanges) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }
}
