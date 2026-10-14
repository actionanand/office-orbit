import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { CursorService } from '../../core/api/cursor.service';
import { ResourceService } from '../../core/api/resource.service';
import { SprintAllocation, SprintDetailResponse } from '../../shared/models/api.models';
import { routes } from './sprints.routes';
import { SprintService } from './sprints.service';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { DataCacheService } from '../../core/cache/data-cache.service';

describe('SprintService and routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataCacheService,
        {
          provide: MutationApiService,
          useValue: { create: vi.fn(), patch: vi.fn() },
        },
      ],
    });
  });
  it('requests encoded Sprint detail through the shared cache-aware API service', async () => {
    const response = { sprint: { id: 'sprint/id' }, jiras: [], count: 0 } as unknown as SprintDetailResponse;
    const detail = vi.fn(() => of(response));
    TestBed.configureTestingModule({
      providers: [
        SprintService,
        { provide: ResourceService, useValue: { detail } },
        { provide: CursorService, useValue: {} },
      ],
    });
    await expect(firstValueFrom(TestBed.inject(SprintService).detail('sprint/id', true))).resolves.toBe(response);
    expect(detail).toHaveBeenCalledWith('/api/sprints/sprint%2Fid', {}, true);
  });

  it('enriches allocation rows with JIRAs from their Sprint details', async () => {
    const response = {
      sprint: { id: 'sprint-id' },
      jiras: [
        {
          id: 'jira-id',
          jiraKey: 'LSC-85120',
          summary: 'GRC alert migration',
          allocationId: 'allocation-id',
        },
      ],
      count: 1,
    } as unknown as SprintDetailResponse;
    const detail = vi.fn(() => of(response));
    const allocation: SprintAllocation = {
      id: 'allocation-id',
      allocation: 'LSC-85120 allocation',
      plannedDays: 4,
      notes: '',
      sprintIds: ['sprint-id'],
      jiraIds: ['jira-id'],
      sprintActive: true,
      spillReason: '',
      spilled: false,
      sprintStart: null,
      firstSprintStart: null,
    };
    TestBed.configureTestingModule({
      providers: [
        SprintService,
        { provide: ResourceService, useValue: { detail } },
        { provide: CursorService, useValue: {} },
      ],
    });

    const result = await firstValueFrom(TestBed.inject(SprintService).allocationJiras([allocation]));

    expect(result[allocation.id]?.[0]?.summary).toBe('GRC alert migration');
    expect(detail).toHaveBeenCalledWith('/api/sprints/sprint-id', {}, false);
  });

  it('sends only supported Sprint and Planned Days fields through the shared mutation service', async () => {
    const create = vi.fn(() => of({ data: { id: 'sprint-id' } }));
    const patch = vi.fn(() => of({ data: { sprintDetail: { sprint: {}, jiras: [], count: 0 } } }));
    TestBed.configureTestingModule({
      providers: [
        SprintService,
        { provide: ResourceService, useValue: { detail: vi.fn() } },
        { provide: CursorService, useValue: {} },
        { provide: MutationApiService, useValue: { create, patch } },
      ],
    });
    const service = TestBed.inject(SprintService);
    const body = {
      sprint: 'Sprint 8',
      projectId: 'project-id',
      startDate: '2026-10-14',
      endDate: '2026-10-27',
      plannedLeaveDays: 1,
      holidayDays: 2,
      makeActive: false,
    };
    await firstValueFrom(service.create(body));
    expect(create).toHaveBeenCalledWith('/api/sprints', body);
    await firstValueFrom(service.update('sprint/id', { sprint: 'Sprint 8 revised' }));
    expect(patch).toHaveBeenCalledWith('/api/sprints', 'sprint/id', { sprint: 'Sprint 8 revised' });
    await firstValueFrom(service.updatePlannedDays('allocation/id', 3.25));
    expect(patch).toHaveBeenCalledWith('/api/sprint-allocations', 'allocation/id', { plannedDays: 3.25 });
  });

  it('keeps the list route and adds a lazy Sprint detail route', () => {
    expect(routes.some(route => route.path === '')).toBe(true);
    expect(routes.some(route => route.path === ':sprintId')).toBe(true);
  });
});
