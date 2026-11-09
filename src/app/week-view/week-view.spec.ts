import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SelectButton } from 'primeng/selectbutton';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivitiesService } from '../activities/activities.service';
import { Activity } from '../activities/activity.interface';
import { WeekView } from './week-view';

describe('WeekView', () => {
  let fixture: ComponentFixture<WeekView>;
  let element: HTMLElement;
  const activities: readonly Activity[] = [
    {
      id: 'd2fb3623-5424-4d1c-8fb1-7488c98faa58',
      name: 'Study Statistic',
      categoryId: null,
      date: '2026-11-07',
      startTime: '19:00:00',
      endTime: '20:30:00',
      isCompleted: false,
    },
    {
      id: 'dd2b13a8-e626-49b4-ae84-169c58f0729c',
      name: 'Walk the dog',
      categoryId: null,
      date: '2026-11-08',
      startTime: '09:00:00',
      endTime: '10:00:00',
      isCompleted: true,
    },
    {
      id: 'c8eb8525-9cb4-408f-bf90-a91d18cc4f35',
      name: 'Study Physics',
      categoryId: null,
      date: '2026-11-08',
      startTime: '20:30:00',
      endTime: '21:30:00',
      isCompleted: false,
    },
  ];

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 12));
    await TestBed.configureTestingModule({
      imports: [WeekView],
      providers: [
        {
          provide: ActivitiesService,
          useValue: { getActivitiesByMonth: () => of(activities) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WeekView);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function navigate(direction: 'Previous' | 'Next'): Promise<void> {
    element.querySelector<HTMLButtonElement>(`button[aria-label="${direction} week"]`)!.click();
    await fixture.whenStable();
  }

  async function setWeekStart(value: 'monday' | 'sunday'): Promise<void> {
    fixture.debugElement
      .query(By.directive(SelectButton))
      .triggerEventHandler('ngModelChange', value);
    await fixture.whenStable();
  }

  async function goToCurrentWeek(): Promise<void> {
    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Current week')!
      .click();
    await fixture.whenStable();
  }

  it('highlights only today across the header and all hourly cells', async () => {
    expect(element.querySelectorAll('.day-heading.today')).toHaveLength(1);
    expect(element.querySelector('.day-heading.today time')?.getAttribute('datetime')).toBe(
      '2026-11-06',
    );
    expect(element.querySelector('.day-heading.today')?.getAttribute('aria-current')).toBe('date');
    expect(element.querySelectorAll('.hour-cell.today')).toHaveLength(24);
    await navigate('Next');
    expect(element.querySelectorAll('.today')).toHaveLength(0);
    await goToCurrentWeek();
    expect(element.querySelectorAll('.hour-cell.today')).toHaveLength(24);
    expect(fixture.componentInstance.weekRange().startDate).toBe('2026-11-02');
    await navigate('Previous');
    await goToCurrentWeek();
    expect(fixture.componentInstance.weekRange().startDate).toBe('2026-11-02');
  });

  it('returns to the current week using the current date and Sunday preference', async () => {
    await setWeekStart('sunday');
    await navigate('Previous');
    vi.setSystemTime(new Date(2026, 10, 8, 12));
    await goToCurrentWeek();
    expect(fixture.componentInstance.weekRange()).toEqual({
      startDate: '2026-11-08',
      endDate: '2026-11-14',
    });
    expect(element.querySelector('.day-heading.today time')?.getAttribute('datetime')).toBe(
      '2026-11-08',
    );
    expect(element.querySelector('.day-heading.today')?.classList.contains('weekend')).toBe(true);
    fixture.debugElement
      .query(By.directive(ToggleSwitch))
      .triggerEventHandler('ngModelChange', false);
    await fixture.whenStable();
    expect(element.querySelectorAll('.today')).toHaveLength(0);
    expect(element.querySelectorAll('.day-heading time')).toHaveLength(5);
    expect(fixture.componentInstance.weekRange().startDate).toBe('2026-11-08');
  });

  it('shows the current Monday–Sunday range and dated columns', () => {
    expect(element.querySelector('.week-range')?.textContent).toBe('2/nov/2026 - 8/nov/2026');
    expect(fixture.componentInstance.weekRange()).toEqual({
      startDate: '2026-11-02',
      endDate: '2026-11-08',
    });
    expect(
      Array.from(element.querySelectorAll('.day-heading time'), (time) =>
        time.getAttribute('datetime'),
      ),
    ).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
    expect(element.querySelectorAll('.hour-heading')).toHaveLength(24);
  });

  it('moves in both directions and restores the original week', async () => {
    await navigate('Next');
    expect(element.querySelector('.week-range')?.textContent).toBe('9/nov/2026 - 15/nov/2026');
    expect(element.querySelector('.day-heading time')?.getAttribute('datetime')).toBe('2026-11-09');
    await navigate('Previous');
    expect(fixture.componentInstance.weekRange().startDate).toBe('2026-11-02');
    await navigate('Previous');
    expect(fixture.componentInstance.weekRange()).toEqual({
      startDate: '2026-10-26',
      endDate: '2026-11-01',
    });
  });

  it('preserves the selected day when changing week starts after navigation', async () => {
    await navigate('Next');
    await setWeekStart('sunday');
    expect(fixture.componentInstance.weekRange()).toEqual({
      startDate: '2026-11-08',
      endDate: '2026-11-14',
    });
    expect(element.querySelector('.day-heading')?.textContent).toContain('Sunday');
    await setWeekStart('monday');
    expect(fixture.componentInstance.weekRange().startDate).toBe('2026-11-09');
  });

  it('anchors Sunday to the preceding Monday when switching to Monday-start', async () => {
    vi.setSystemTime(new Date(2026, 10, 8, 12));
    fixture.destroy();
    fixture = TestBed.createComponent(WeekView);
    element = fixture.nativeElement;
    await fixture.whenStable();
    await setWeekStart('sunday');
    expect(fixture.componentInstance.weekRange().startDate).toBe('2026-11-08');
    await setWeekStart('monday');
    expect(fixture.componentInstance.weekRange().startDate).toBe('2026-11-02');
  });

  it('hides weekend columns without changing the fetching range', async () => {
    await setWeekStart('sunday');
    const range = fixture.componentInstance.weekRange();
    fixture.debugElement
      .query(By.directive(ToggleSwitch))
      .triggerEventHandler('ngModelChange', false);
    await fixture.whenStable();
    expect(element.querySelectorAll('.day-heading time')).toHaveLength(5);
    expect(element.querySelector('.day-heading time')?.getAttribute('datetime')).toBe('2026-11-02');
    expect(element.querySelectorAll('.calendar-row:nth-child(2) .hour-cell')).toHaveLength(5);
    expect(fixture.componentInstance.weekRange()).toEqual(range);
    expect(element.querySelector('.week-range')?.textContent).toBe('1/nov/2026 - 7/nov/2026');
  });

  it.each([
    [new Date(2026, 11, 31, 12), '2027-01-04', '2027-01-10'],
    [new Date(2028, 1, 25, 12), '2028-02-28', '2028-03-05'],
    [new Date(2026, 2, 6, 12), '2026-03-09', '2026-03-15'],
    [new Date(2026, 9, 30, 12), '2026-11-02', '2026-11-08'],
  ])(
    'navigates across year, leap day, and daylight-saving boundaries from %s',
    async (date, startDate, endDate) => {
      vi.setSystemTime(date);
      fixture.destroy();
      fixture = TestBed.createComponent(WeekView);
      element = fixture.nativeElement;
      await fixture.whenStable();
      await navigate('Next');
      expect(fixture.componentInstance.weekRange()).toEqual({ startDate, endDate });
      expect(element.querySelectorAll('.day-heading time')).toHaveLength(7);
    },
  );

  function expectActivityColumns(): void {
    const dates = Array.from(element.querySelectorAll('.day-heading time'), (time) =>
      time.getAttribute('datetime'),
    );
    const columns = element.querySelectorAll<HTMLElement>('.activity-column');
    expect(columns).toHaveLength(dates.length);
    columns.forEach((column, index) => {
      expect(column.style.gridColumn).toBe(String(index + 2));
      expect(Array.from(column.querySelectorAll('label'), (label) => label.textContent)).toEqual(
        activities
          .filter((activity) => activity.date === dates[index])
          .map((activity) => activity.name),
      );
    });
  }

  it('places API activities in their dated columns independently of the current-time indicator', () => {
    expect(element.querySelector('.activity-layer')?.firstElementChild?.className).toBe(
      'current-time-indicator',
    );
    expectActivityColumns();
    expect(element.querySelectorAll('app-activity-item')).toHaveLength(3);
    const cards = element.querySelectorAll<HTMLElement>('app-activity-item');
    expect(Array.from(cards, (card) => card.style.getPropertyValue('--start'))).toEqual([
      '1140',
      '540',
      '1230',
    ]);
    expect(Array.from(cards, (card) => card.style.getPropertyValue('--duration'))).toEqual([
      '90',
      '60',
      '60',
    ]);
  });

  it('keeps activity columns aligned when changing week start and hiding weekends', async () => {
    await setWeekStart('sunday');
    expectActivityColumns();
    expect(element.querySelectorAll('app-activity-item')).toHaveLength(1);
    await navigate('Next');
    expectActivityColumns();
    expect(element.querySelector('.activity-column')?.textContent).toContain('Walk the dog');
    expect(element.querySelectorAll('app-activity-item')).toHaveLength(2);
    fixture.debugElement
      .query(By.directive(ToggleSwitch))
      .triggerEventHandler('ngModelChange', false);
    await fixture.whenStable();
    expectActivityColumns();
    expect(element.querySelectorAll('app-activity-item')).toHaveLength(0);
  });
});
