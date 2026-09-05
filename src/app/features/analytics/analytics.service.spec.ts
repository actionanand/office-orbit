import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CursorService } from '../../core/api/cursor.service';
import { workLogFixture } from '../../shared/models/work-log.fixture';
import { AnalyticsService, aggregateWork } from './analytics.service';
import { BarChartComponent } from '../../shared/components/bar-chart.component';
describe('Bounded analytics', () => {
  it('aggregates real values by category, type and week', () => {
    const summary = aggregateWork([
      workLogFixture('a'),
      workLogFixture('b', { category: 'Grooming', type: 'Learning' }),
    ]);
    expect(summary.categories).toEqual([
      { label: 'Office Work', value: 1 },
      { label: 'Grooming', value: 1 },
    ]);
    expect(summary.types[1]).toEqual({ label: 'Learning', value: 1 });
    expect(summary.weeks[0].value).toBe(2);
  });
  it('reuses the bounded range until explicit refresh', async () => {
    const range = vi.fn().mockResolvedValue([workLogFixture('a')]);
    TestBed.configureTestingModule({ providers: [{ provide: CursorService, useValue: { range } }] });
    const service = TestBed.inject(AnalyticsService);
    await firstValueFrom(service.load('2026-09-01', '2026-09-30'));
    await firstValueFrom(service.load('2026-09-01', '2026-09-30'));
    expect(range).toHaveBeenCalledTimes(1);
    expect(range.mock.calls[0][1]).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    await firstValueFrom(service.load('2026-09-01', '2026-09-30', true));
    expect(range).toHaveBeenCalledTimes(2);
  });
  it('renders supplied values visibly and in SVG', () => {
    const fixture = TestBed.createComponent(BarChartComponent);
    fixture.componentRef.setInput('label', 'Category mix');
    fixture.componentRef.setInput('values', [{ label: 'Office Work', value: 18 }]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('18');
    expect(element.querySelector('.chart-fill')?.getAttribute('width')).toBe('100');
  });
});
