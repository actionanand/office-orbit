import { HistoricalAnalyticsResponse } from '../../shared/models/api.models';
import { analyticsCharts, compactSprintLabel } from './analytics-chart.models';

const analytics: HistoricalAnalyticsResponse = {
  schemaVersion: 1,
  generatedAt: '2026-10-15T10:00:00.000Z',
  from: '2026-09-16',
  to: '2026-10-15',
  workActivity: {
    count: 3,
    weeks: [{ weekStart: '2026-09-14', count: 2 }],
    categories: [
      { label: 'Office Work', count: 2 },
      { label: 'Learning', count: 1 },
    ],
    types: [
      { label: 'Work', count: 2 },
      { label: 'Learning', count: 1 },
    ],
  },
  spillSummary: {
    distinctJiras: 4,
    jirasWithAnySpill: 2,
    totalSpillEvents: 2,
    spillPercentage: 50,
    averageSpillsPerSpilledJira: 1,
  },
  spillTrend: { firstSprintRate: 50, latestSprintRate: 25, changePercentagePoints: -25, direction: 'improving' },
  sprints: [
    {
      id: 'sprint-1',
      sprint: 'CRI - 26.3 - Sprint 6',
      startDate: null,
      endDate: null,
      active: false,
      jiraCount: 4,
      incomingSpillJiras: 1,
      outgoingSpillJiras: 2,
      outgoingSpillRate: 50,
      capacityDays: 10,
      availableDays: 8,
      plannedDays: 10,
      remainingPlannedDays: -2,
      utilizationPercent: 125,
      allocationConflictPairs: 2,
    },
  ],
  topSpilledJiras: [
    {
      id: 'jira-1',
      jiraKey: 'LSC-1',
      summary: 'Historical spill',
      fullHistorySpillCount: 5,
      selectedRangeOutgoingSpillCount: 0,
    },
  ],
};

describe('analytics chart view models', () => {
  it('preserves Worker order for activity category and type data', () => {
    expect(analyticsCharts.workActivity(analytics).datasets[0].values).toEqual([2]);
    expect(analyticsCharts.categoryMix(analytics).labels).toEqual(['Office Work', 'Learning']);
    expect(analyticsCharts.typeMix(analytics).labels).toEqual(['Work', 'Learning']);
  });

  it('uses compact axis labels while preserving full Sprint names in exact values and tooltips', () => {
    expect(compactSprintLabel(analytics.sprints[0].sprint)).toBe('26.3 · S6');
    const chart = analyticsCharts.spillRate(analytics);
    expect(chart.rows[0].label).toBe('CRI - 26.3 - Sprint 6');
    expect(chart.tooltipItems?.[0].title).toBe('CRI - 26.3 - Sprint 6');
    expect(chart.tooltipItems?.[0].lines).toEqual([
      { label: 'JIRAs', value: 4 },
      { label: 'Outgoing spill JIRAs', value: 2 },
      { label: 'Spill rate', value: 50, suffix: '%' },
    ]);
  });

  it('keeps exact-value columns aligned with row values for spill rate and capacity', () => {
    const spillRate = analyticsCharts.spillRate(analytics);
    const capacity = analyticsCharts.capacity(analytics);
    expect(spillRate.tableColumns.map(column => column.label)).toEqual(['JIRAs', 'Outgoing spill JIRAs', 'Spill rate']);
    expect(capacity.tableColumns.map(column => column.label)).toEqual([
      'Capacity',
      'Available',
      'Planned',
      'Remaining',
      'Utilization',
    ]);
    expect(spillRate.rows[0].values).toHaveLength(spillRate.tableColumns.length);
    expect(capacity.rows[0].values).toHaveLength(capacity.tableColumns.length);
  });

  it('gives every generated exact-value table one value cell per defined column', () => {
    const charts = [
      analyticsCharts.workActivity(analytics),
      analyticsCharts.categoryMix(analytics),
      analyticsCharts.typeMix(analytics),
      analyticsCharts.spillRate(analytics),
      analyticsCharts.spillDirection(analytics),
      analyticsCharts.capacity(analytics),
      analyticsCharts.utilization(analytics),
      analyticsCharts.topSpilled(analytics),
    ];
    charts.forEach(chart => {
      chart.rows.forEach(row => expect(row.values).toHaveLength(chart.tableColumns.length));
    });
  });

  it('keeps full Sprint names for incoming and outgoing spill tooltip titles', () => {
    expect(analyticsCharts.spillDirection(analytics).tooltipItems?.[0]).toEqual({
      title: 'CRI - 26.3 - Sprint 6',
    });
  });

  it('preserves negative remaining capacity and utilization over one hundred percent in tables and tooltips', () => {
    const capacity = analyticsCharts.capacity(analytics);
    expect(capacity.datasets[2].values).toEqual([-2]);
    expect(analyticsCharts.utilization(analytics).datasets[0].values).toEqual([125]);
    expect(capacity.rows[0].values).toEqual([10, 8, 10, -2, 125]);
    expect(capacity.tooltipItems?.[0].lines).toEqual([
      { label: 'Capacity', value: 10 },
      { label: 'Available', value: 8 },
      { label: 'Planned', value: 10 },
      { label: 'Remaining', value: -2 },
      { label: 'Utilization', value: 125, suffix: '%' },
    ]);
  });

  it('keeps full-history top-spill counts distinct from selected-range outgoing counts in tables and tooltips', () => {
    const chart = analyticsCharts.topSpilled(analytics);
    expect(chart.datasets[0].values).toEqual([5]);
    expect(chart.tableColumns.map(column => column.label)).toEqual([
      'Full-history spills',
      'Selected-range outgoing spills',
    ]);
    expect(chart.rows[0].values).toEqual([5, 0]);
    expect(chart.tooltipItems?.[0]).toEqual({
      title: 'LSC-1',
      lines: [
        { label: 'Summary', value: 'Historical spill' },
        { label: 'Full-history spills', value: 5 },
        { label: 'Selected-range outgoing spills', value: 0 },
      ],
    });
  });
});
