import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { CursorService } from '../../core/api/cursor.service';
import { ResourceService } from '../../core/api/resource.service';
import { SprintAllocation, SprintDetailResponse } from '../../shared/models/api.models';
import { routes } from './sprints.routes';
import { SprintService } from './sprints.service';

describe('SprintService and routes', () => {
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

  it('keeps the list route and adds a lazy Sprint detail route', () => {
    expect(routes.some(route => route.path === '')).toBe(true);
    expect(routes.some(route => route.path === ':sprintId')).toBe(true);
  });
});
