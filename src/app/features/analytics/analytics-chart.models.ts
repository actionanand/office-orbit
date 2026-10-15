import { ChartType } from 'chart.js';
import { HistoricalAnalyticsResponse } from '../../shared/models/api.models';

export interface AnalyticsChartDataset {
  label: string;
  values: number[];
}

export interface AnalyticsChartTableColumn {
  label: string;
  suffix?: string;
}

export interface AnalyticsChartRow {
  label: string;
  values: number[];
}

export interface AnalyticsChartTooltipLine {
  label: string;
  value: number | string;
  suffix?: string;
}

export interface AnalyticsChartTooltip {
  title: string;
  lines?: AnalyticsChartTooltipLine[];
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
  tableColumns: AnalyticsChartTableColumn[];
  rows: AnalyticsChartRow[];
  tooltipItems?: AnalyticsChartTooltip[];
}

const compactSprintLabel = (sprint: string): string => {
  const match = /(?:^|\s)(\d+(?:\.\d+)?)\s*-\s*Sprint\s*(\d+)/iu.exec(sprint);
  return match ? `${match[1]} · S${match[2]}` : sprint;
};

const countRows = (items: ReadonlyArray<{ label: string; count: number }>): AnalyticsChartRow[] =>
  items.map(item => ({ label: item.label, values: [item.count] }));

type SprintAnalytics = HistoricalAnalyticsResponse['sprints'][number];
type NumericSprintKey = {
  [Key in keyof SprintAnalytics]: SprintAnalytics[Key] extends number ? Key : never;
}[keyof SprintAnalytics];

const sprintRows = (
  response: HistoricalAnalyticsResponse,
  fields: ReadonlyArray<{ key: NumericSprintKey }>,
): AnalyticsChartRow[] =>
  response.sprints.map(sprint => ({
    label: sprint.sprint,
    values: fields.map(field => sprint[field.key]),
  }));

type SprintTableColumn = AnalyticsChartTableColumn & {
  key: NumericSprintKey;
};

const workLogColumn: AnalyticsChartTableColumn = { label: 'Work logs' };
const spillRateColumns: SprintTableColumn[] = [
  { label: 'JIRAs', key: 'jiraCount' },
  { label: 'Outgoing spill JIRAs', key: 'outgoingSpillJiras' },
  { label: 'Spill rate', key: 'outgoingSpillRate', suffix: '%' },
];
const spillDirectionColumns: SprintTableColumn[] = [
  { label: 'Incoming', key: 'incomingSpillJiras' },
  { label: 'Outgoing', key: 'outgoingSpillJiras' },
];
const capacityColumns: SprintTableColumn[] = [
  { label: 'Capacity', key: 'capacityDays' },
  { label: 'Available', key: 'availableDays' },
  { label: 'Planned', key: 'plannedDays' },
  { label: 'Remaining', key: 'remainingPlannedDays' },
  { label: 'Utilization', key: 'utilizationPercent', suffix: '%' },
];
const utilizationColumns: SprintTableColumn[] = [{ label: 'Utilization', key: 'utilizationPercent', suffix: '%' }];

export const analyticsCharts = {
  workActivity(response: HistoricalAnalyticsResponse): AnalyticsChartModel {
    return {
      id: 'work-activity',
      title: 'Work activity by week',
      description: 'Work Log count for each populated week in the selected range.',
      type: 'line',
      labels: response.workActivity.weeks.map(item => item.weekStart),
      datasets: [{ label: 'Work Logs', values: response.workActivity.weeks.map(item => item.count) }],
      tableColumns: [workLogColumn],
      rows: response.workActivity.weeks.map(item => ({
        label: item.weekStart,
        values: [item.count],
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
      tableColumns: [workLogColumn],
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
      tableColumns: [workLogColumn],
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
      tableColumns: spillRateColumns,
      rows: sprintRows(response, spillRateColumns),
      tooltipItems: response.sprints.map(sprint => ({
        title: sprint.sprint,
        lines: [
          { label: 'JIRAs', value: sprint.jiraCount },
          { label: 'Outgoing spill JIRAs', value: sprint.outgoingSpillJiras },
          { label: 'Spill rate', value: sprint.outgoingSpillRate, suffix: '%' },
        ],
      })),
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
      tableColumns: spillDirectionColumns,
      rows: sprintRows(response, spillDirectionColumns),
      tooltipItems: response.sprints.map(sprint => ({ title: sprint.sprint })),
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
      tableColumns: capacityColumns,
      rows: sprintRows(response, capacityColumns),
      tooltipItems: response.sprints.map(sprint => ({
        title: sprint.sprint,
        lines: [
          { label: 'Capacity', value: sprint.capacityDays },
          { label: 'Available', value: sprint.availableDays },
          { label: 'Planned', value: sprint.plannedDays },
          { label: 'Remaining', value: sprint.remainingPlannedDays },
          { label: 'Utilization', value: sprint.utilizationPercent, suffix: '%' },
        ],
      })),
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
      tableColumns: utilizationColumns,
      rows: sprintRows(response, utilizationColumns),
      tooltipItems: response.sprints.map(sprint => ({
        title: sprint.sprint,
        lines: [{ label: 'Utilization', value: sprint.utilizationPercent, suffix: '%' }],
      })),
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
      tableColumns: [{ label: 'Full-history spills' }, { label: 'Selected-range outgoing spills' }],
      rows: response.topSpilledJiras.map(item => ({
        label: item.jiraKey,
        values: [item.fullHistorySpillCount, item.selectedRangeOutgoingSpillCount],
      })),
      tooltipItems: response.topSpilledJiras.map(item => ({
        title: item.jiraKey,
        lines: [
          { label: 'Summary', value: item.summary },
          { label: 'Full-history spills', value: item.fullHistorySpillCount },
          { label: 'Selected-range outgoing spills', value: item.selectedRangeOutgoingSpillCount },
        ],
      })),
    };
  },
};

export { compactSprintLabel };
