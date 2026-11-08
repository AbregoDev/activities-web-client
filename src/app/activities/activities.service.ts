import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, of, tap } from 'rxjs';
import { Activity } from './activity.interface';

interface CachedActivities {
  readonly activities: readonly Activity[];
  readonly expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CachedActivities>();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly maxCachedMonths = 5;

  getActivitiesByMonth(
    year: number,
    month: number,
    refresh = false,
  ): Observable<readonly Activity[]> {
    return defer(() => {
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        throw new RangeError('Year must be an integer between 1 and 9999.');
      }
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new RangeError('Month must be an integer between 1 and 12.');
      }

      this.removeExpiredElementsInCache();

      const key = `${year}-${String(month).padStart(2, '0')}`;
      const cached = this.cache.get(key);
      // Reinserting a cache hit keeps recently used months last in eviction order.
      this.cache.delete(key);
      if (!refresh && cached) {
        this.cache.set(key, cached);
        return of(cached.activities);
      }

      const url = '/api/activities/GetActivitiesByMonth';
      const params = { year, month };
      return this.http
        .get<readonly Activity[]>(url, { params })
        .pipe(tap((activities) => this.writeActivitiesToCache(key, activities)));
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

  private writeActivitiesToCache(key: string, activities: readonly Activity[]): void {
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
    while (this.cache.size > this.maxCachedMonths) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }
}
