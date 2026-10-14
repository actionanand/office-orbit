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

  it('uses compact sprint labels without modifying full Sprint names in exact values', () => {
    expect(compactSprintLabel(analytics.sprints[0].sprint)).toBe('26.3 · S6');
    expect(analyticsCharts.spillRate(analytics).rows[0].label).toBe('CRI - 26.3 - Sprint 6');
  });

  it('preserves negative remaining capacity and utilization over one hundred percent', () => {
    expect(analyticsCharts.capacity(analytics).datasets[2].values).toEqual([-2]);
    expect(analyticsCharts.utilization(analytics).datasets[0].values).toEqual([125]);
  });

  it('keeps full-history top-spill counts distinct from selected-range outgoing counts', () => {
    const chart = analyticsCharts.topSpilled(analytics);
    expect(chart.datasets[0].values).toEqual([5]);
    expect(chart.rows[0].values[1].value).toBe(0);
  });
});
