import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { JiraOption, ListResponse } from '../../shared/models/api.models';
import { JiraPickerComponent } from './jira-picker.component';
import { JiraPickerService } from './jira-picker.service';

const current: JiraOption = {
  id: 'current',
  jiraKey: 'LSC-84944',
  summary: 'Frontendapp Angular upgrade',
  status: 'In progress',
  inActiveSprint: true,
};
const historical: JiraOption = {
  id: 'historical',
  jiraKey: 'LSDEVOPS-7147',
  summary: 'Deploying cortellis-frontend',
  status: 'In progress',
  inActiveSprint: false,
};

describe('JiraPickerComponent', () => {
  let query: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    query = vi.fn(() => of(page([current])));
    TestBed.configureTestingModule({
      imports: [JiraPickerComponent],
      providers: [{ provide: JiraPickerService, useValue: { query } }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  async function create() {
    const fixture = TestBed.createComponent(JiraPickerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads current-Sprint options on open and does not query a one-character global search', async () => {
    const fixture = await create();
    fixture.componentInstance.openPicker();
    await vi.runAllTimersAsync();
    expect(query).toHaveBeenCalledWith('');
    expect(fixture.componentInstance.results()).toEqual([current]);

    fixture.componentInstance.searchChanged(new CustomEvent('ionInput', { detail: { value: 'D' } }));
    await vi.runAllTimersAsync();
    expect(query).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.results()).toEqual([]);
  });

  it('debounces global search and cancels a stale request when the search changes', async () => {
    const slow = new Subject<ListResponse<JiraOption>>();
    query.mockImplementation((q: string) => (q === 'DEV' ? slow : of(page(q === 'LSC' ? [current] : []))));
    const fixture = await create();
    fixture.componentInstance.openPicker();
    await vi.runAllTimersAsync();

    fixture.componentInstance.searchChanged(new CustomEvent('ionInput', { detail: { value: 'DEV' } }));
    await vi.advanceTimersByTimeAsync(300);
    expect(slow.observed).toBe(true);
    fixture.componentInstance.searchChanged(new CustomEvent('ionInput', { detail: { value: 'LSC' } }));
    await vi.advanceTimersByTimeAsync(300);
    expect(slow.observed).toBe(false);
    expect(fixture.componentInstance.results()).toEqual([current]);
  });

  it.each([
    ['LSC-84944', current],
    ['deployment', historical],
  ])('shows the server result when searching by %s', async (search, match) => {
    query.mockImplementation((q: string) => of(page(q ? [match] : [current])));
    const fixture = await create();
    fixture.componentInstance.openPicker();
    await vi.runAllTimersAsync();

    fixture.componentInstance.searchChanged(new CustomEvent('ionInput', { detail: { value: search } }));
    await vi.advanceTimersByTimeAsync(300);

    expect(query).toHaveBeenLastCalledWith(search);
    expect(fixture.componentInstance.results()).toEqual([match]);
  });

  it('keeps a selected historical JIRA when search is cleared and applies only IDs and refs', async () => {
    query.mockImplementation((q: string) => of(page(q ? [historical] : [current])));
    const fixture = await create();
    const emitted = vi.fn();
    fixture.componentInstance.selectionChange.subscribe(emitted);
    fixture.componentInstance.openPicker();
    await vi.runAllTimersAsync();
    fixture.componentInstance.searchChanged(new CustomEvent('ionInput', { detail: { value: 'DEVOPS' } }));
    await vi.advanceTimersByTimeAsync(300);
    fixture.componentInstance.toggle(historical, true);
    fixture.componentInstance.searchChanged(new CustomEvent('ionInput', { detail: { value: '' } }));
    await vi.advanceTimersByTimeAsync(300);
    expect(fixture.componentInstance.draftSelection()).toEqual([historical]);
    fixture.componentInstance.apply();
    expect(emitted).toHaveBeenCalledWith({
      ids: ['historical'],
      jiras: [{ id: 'historical', key: 'LSDEVOPS-7147', summary: 'Deploying cortellis-frontend' }],
    });
  });

  it('discards draft changes on Cancel without emitting a selection', async () => {
    const fixture = await create();
    fixture.componentRef.setInput('selectedIds', ['current']);
    fixture.componentRef.setInput('selectedJiras', [
      { id: current.id, key: current.jiraKey, summary: current.summary },
    ]);
    const emitted = vi.fn();
    fixture.componentInstance.selectionChange.subscribe(emitted);
    fixture.componentInstance.openPicker();
    await vi.runAllTimersAsync();
    fixture.componentInstance.toggle(historical, true);

    fixture.componentInstance.cancel();

    expect(emitted).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedIds()).toEqual(['current']);
  });

  it('keeps one selection and omits excluded JIRAs in single-select mode', async () => {
    const fixture = await create();
    fixture.componentRef.setInput('multiple', false);
    fixture.componentRef.setInput('excludeIds', [current.id]);
    fixture.componentInstance.openPicker();
    await vi.runAllTimersAsync();
    fixture.componentInstance.toggle(current, true);
    expect(fixture.componentInstance.draftSelection()).toEqual([]);
    fixture.componentInstance.toggle(historical, true);
    fixture.componentInstance.toggle({ ...historical, id: 'other', jiraKey: 'LSC-2' }, true);
    expect(fixture.componentInstance.draftSelection()).toHaveLength(1);
    expect(fixture.componentInstance.draftSelection()[0]?.id).toBe('other');
  });

  it('loads one cursor page, appends unique options, and blocks concurrent load-more requests', async () => {
    const continuation = new Subject<ListResponse<JiraOption>>();
    query.mockImplementation((_q: string, cursor: string | null) =>
      cursor ? continuation : of(page([current], true, 'opaque-next')),
    );
    const fixture = await create();
    fixture.componentInstance.openPicker();
    await vi.runAllTimersAsync();
    fixture.componentInstance.loadMore();
    fixture.componentInstance.loadMore();
    expect(query).toHaveBeenCalledTimes(2);
    continuation.next(page([current, historical]));
    continuation.complete();
    expect(fixture.componentInstance.results()).toEqual([current, historical]);
  });
});

function page(data: JiraOption[], hasMore = false, nextCursor: string | null = null): ListResponse<JiraOption> {
  return { data, count: data.length, hasMore, nextCursor };
}
