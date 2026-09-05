import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrintService } from '../../core/platform/print.service';
import { provideHttpClient } from '@angular/common/http';
import { WorkLog } from '../../shared/models/api.models';
import { WorkLogPage } from './work-log.page';
import { WorkLogStore } from './work-log.store';

const log = (id: string, date: string): WorkLog => ({
  id,
  createdTime: '',
  lastEditedTime: '',
  update: `Work ${id}`,
  date,
  category: 'Office Work',
  type: 'Review',
  workMode: 'WFO',
  comment: '',
  wentWrong: '',
  appraisal: false,
  projectIds: [],
  jiraIds: [],
  companyIds: [],
  teamIds: [],
  jiraStatuses: [],
  sprintIds: [],
  spilloverCount: 0,
  projects: [],
  jiras: [],
  companies: [],
  teams: [],
  sprints: [],
});

describe('WorkLogPage calendar', () => {
  it('selects one calendar day without fetching another page', async () => {
    const items = signal([log('one', '2026-09-12'), log('two', '2026-09-13')]);
    const store = {
      mode: signal('calendar'),
      selectedPath: signal('/api/work-logs'),
      filters: signal({ from: '', to: '', category: '', type: '', workMode: '' }),
      search: signal(''),
      month: signal('2026-09'),
      selectedDate: signal<string | null>(null),
      items,
      visible: computed(() => items()),
      count: signal(2),
      hasMore: signal(false),
      loading: signal(false),
      error: signal(''),
      lastUpdated: signal<number | null>(null),
      load: vi.fn().mockResolvedValue(undefined),
      setMode: vi.fn(),
      moveMonth: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [WorkLogPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: WorkLogStore, useValue: store },
        { provide: PrintService, useValue: { supported: true, print: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(WorkLogPage);
    fixture.detectChanges();
    fixture.componentInstance.selectDate('2026-09-12');
    fixture.detectChanges();
    expect(fixture.componentInstance.displayedLogs().map(item => item.id)).toEqual(['one']);
    expect(store.load).toHaveBeenCalledTimes(1);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[aria-label="List view"]')?.textContent?.trim()).toBe('');
    expect(element.querySelector('[aria-label="Calendar view"] ion-icon')).not.toBeNull();
  });

  it('opens export options before printing', async () => {
    const print = vi.fn();
    const items = signal<WorkLog[]>([]);
    const store = {
      mode: signal('list'),
      selectedPath: signal('/api/work-logs'),
      filters: signal({ from: '', to: '', category: '', type: '', workMode: '' }),
      search: signal(''),
      month: signal('2026-09'),
      selectedDate: signal<string | null>(null),
      items,
      visible: computed(() => items()),
      count: signal(0),
      hasMore: signal(false),
      loading: signal(false),
      error: signal(''),
      lastUpdated: signal<number | null>(null),
      load: vi.fn().mockResolvedValue(undefined),
      setMode: vi.fn(),
      moveMonth: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [WorkLogPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: WorkLogStore, useValue: store },
        { provide: PrintService, useValue: { supported: true, print } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(WorkLogPage);
    fixture.componentInstance.print();
    expect(fixture.componentInstance.exportOpen()).toBe(true);
    expect(print).not.toHaveBeenCalled();
  });
});
