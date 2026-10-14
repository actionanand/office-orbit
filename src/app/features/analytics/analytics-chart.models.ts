import { ChartType } from 'chart.js';
import { HistoricalAnalyticsResponse } from '../../shared/models/api.models';

export interface AnalyticsChartDataset {
  label: string;
  values: number[];
}

export interface AnalyticsChartRow {
  label: string;
  values: Array<{ label: string; value: number; suffix?: string }>;
}

export interface AnalyticsChartModel {
  id: string;
  title: string;
  description: string;
  type: Extract<ChartType, 'line' | 'bar'>;
  horizontal?: boolean;
  percentage?: boolean;
  labels: string[];
  datasets: AnalyticsChartDataset[];
  rows: AnalyticsChartRow[];
}

const compactSprintLabel = (sprint: string): string => {
  const match = /(?:^|\s)(\d+(?:\.\d+)?)\s*-\s*Sprint\s*(\d+)/iu.exec(sprint);
  return match ? `${match[1]} · S${match[2]}` : sprint;
};

const countRows = (items: ReadonlyArray<{ label: string; count: number }>): AnalyticsChartRow[] =>
  items.map(item => ({ label: item.label, values: [{ label: 'Work logs', value: item.count }] }));

const sprintRows = (
  response: HistoricalAnalyticsResponse,
  fields: ReadonlyArray<{ label: string; key: keyof HistoricalAnalyticsResponse['sprints'][number]; suffix?: string }>,
): AnalyticsChartRow[] =>
  response.sprints.map(sprint => ({
    label: sprint.sprint,
    values: fields.map(field => ({ label: field.label, value: sprint[field.key] as number, suffix: field.suffix })),
  }));

export const analyticsCharts = {
  workActivity(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'work-activity',
      title: 'Work activity by week',
      description: 'Work Log count for each populated week in the selected range.',
      type: 'line',
      labels: response.workActivity.weeks.map(item => item.weekStart),
      datasets: [{ label: 'Work Logs', values: response.workActivity.weeks.map(item => item.count) }],
      rows: response.workActivity.weeks.map(item => ({
        label: item.weekStart,
        values: [{ label: 'Work Logs', value: item.count }],
      })),
    };
  },
  categoryMix(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'category-mix',
      title: 'Work logs by category',
      description: 'Categories are shown in Worker-provided order.',
      type: 'bar',
      horizontal: true,
      labels: response.workActivity.categories.map(item => item.label),
      datasets: [{ label: 'Work Logs', values: response.workActivity.categories.map(item => item.count) }],
      rows: countRows(response.workActivity.categories),
    };
  },
  typeMix(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'type-mix',
      title: 'Work logs by type',
      description: 'Work types are shown in Worker-provided order.',
      type: 'bar',
      horizontal: true,
      labels: response.workActivity.types.map(item => item.label),
      datasets: [{ label: 'Work Logs', values: response.workActivity.types.map(item => item.count) }],
      rows: countRows(response.workActivity.types),
    };
  },
  spillRate(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'spill-rate',
      title: 'Spill rate by Sprint',
      description: 'Outgoing spill rate for each Sprint in Worker-provided chronological order.',
      type: 'line',
      percentage: true,
      labels: response.sprints.map(sprint => compactSprintLabel(sprint.sprint)),
      datasets: [{ label: 'Spill rate', values: response.sprints.map(sprint => sprint.outgoingSpillRate) }],
      rows: sprintRows(response, [
        { label: 'JIRAs', key: 'jiraCount' },
        { label: 'Outgoing spill JIRAs', key: 'outgoingSpillJiras' },
        { label: 'Spill rate', key: 'outgoingSpillRate', suffix: '%' },
      ]),
    };
  },
  spillDirection(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'spill-direction',
      title: 'Incoming and outgoing spill JIRAs',
      description: 'Incoming and outgoing spill JIRAs for each selected Sprint.',
      type: 'bar',
      labels: response.sprints.map(sprint => compactSprintLabel(sprint.sprint)),
      datasets: [
        { label: 'Incoming', values: response.sprints.map(sprint => sprint.incomingSpillJiras) },
        { label: 'Outgoing', values: response.sprints.map(sprint => sprint.outgoingSpillJiras) },
      ],
      rows: sprintRows(response, [
        { label: 'Incoming', key: 'incomingSpillJiras' },
        { label: 'Outgoing', key: 'outgoingSpillJiras' },
      ]),
    };
  },
  capacity(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'capacity',
      title: 'Sprint capacity planning',
      description: 'Available, planned, and remaining planned days. Remaining values may be negative.',
      type: 'bar',
      labels: response.sprints.map(sprint => compactSprintLabel(sprint.sprint)),
      datasets: [
        { label: 'Available', values: response.sprints.map(sprint => sprint.availableDays) },
        { label: 'Planned', values: response.sprints.map(sprint => sprint.plannedDays) },
        { label: 'Remaining', values: response.sprints.map(sprint => sprint.remainingPlannedDays) },
      ],
      rows: sprintRows(response, [
        { label: 'Capacity', key: 'capacityDays' },
        { label: 'Available', key: 'availableDays' },
        { label: 'Planned', key: 'plannedDays' },
        { label: 'Remaining', key: 'remainingPlannedDays' },
        { label: 'Utilization', key: 'utilizationPercent', suffix: '%' },
      ]),
    };
  },
  utilization(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'utilization',
      title: 'Sprint utilization',
      description: 'Utilization can exceed 100 percent when planning exceeds availability.',
      type: 'line',
      percentage: true,
      labels: response.sprints.map(sprint => compactSprintLabel(sprint.sprint)),
      datasets: [{ label: 'Utilization', values: response.sprints.map(sprint => sprint.utilizationPercent) }],
      rows: sprintRows(response, [{ label: 'Utilization', key: 'utilizationPercent', suffix: '%' }]),
    };
  },
  topSpilled(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'top-spilled',
      title: 'Most spilled JIRAs',
      description: 'Full-history spill counts. Selected-range outgoing counts are available in the exact values.',
      type: 'bar',
      horizontal: true,
      labels: response.topSpilledJiras.map(item => item.jiraKey),
      datasets: [
        { label: 'Full-history spills', values: response.topSpilledJiras.map(item => item.fullHistorySpillCount) },
      ],
      rows: response.topSpilledJiras.map(item => ({
        label: item.jiraKey,
        values: [
          { label: 'Full-history spills', value: item.fullHistorySpillCount },
          { label: 'Selected-range outgoing spills', value: item.selectedRangeOutgoingSpillCount },
        ],
      })),
    };
  },
};

export { compactSprintLabel };
