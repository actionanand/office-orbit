import {
  AfterViewInit,
  Component,
  DOCUMENT,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  TooltipItem,
} from 'chart.js';
import { AnalyticsChartModel, AnalyticsChartTooltipLine } from './analytics-chart.models';

Chart.register(
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

@Component({
  selector: 'app-analytics-chart',
  template: `<figure class="analytics-chart" [attr.aria-labelledby]="model().id + '-title'">
    <figcaption [id]="model().id + '-title'">
      <strong>{{ model().title }}</strong
      ><span>{{ model().description }}</span>
    </figcaption>
    <div class="analytics-chart-canvas">
      <canvas #canvas [attr.aria-label]="model().title + '. ' + model().description" role="img"></canvas>
    </div>
    <details class="analytics-chart-values">
      <summary>View exact values</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">Item</th>
            @for (column of model().tableColumns; track column.label) {
              <th scope="col">{{ column.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of model().rows; track row.label) {
            <tr>
              <th scope="row">{{ row.label }}</th>
              @for (column of model().tableColumns; track column.label; let columnIndex = $index) {
                <td>{{ formatChartValue(row.values[columnIndex], column.suffix) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </details>
  </figure>`,
})
export class AnalyticsChartComponent implements AfterViewInit, OnDestroy {
  readonly model = input.required<AnalyticsChartModel>();
  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly document = inject(DOCUMENT);
  private chart: Chart<'line' | 'bar', number[], string> | null = null;
  private observer: MutationObserver | null = null;
  private ready = false;

  constructor() {
    effect(() => {
      this.model();
      if (this.ready) this.render();
    });
  }

  ngAfterViewInit(): void {
    this.ready = true;
    if (typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(() => this.render());
      this.observer.observe(this.document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    this.render();
  }

  ngOnDestroy(): void {
    this.destroyChart();
    this.observer?.disconnect();
  }

  formatChartValue(value: number, suffix = ''): string {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}${suffix}`;
  }

  private render(): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    this.destroyChart();
    const view = this.document.defaultView;
    if (!view) return;
    const root = view.getComputedStyle(this.document.documentElement);
    const text = root.getPropertyValue('--ion-text-color').trim() || '#172b21';
    const muted = root.getPropertyValue('--muted').trim() || '#566b60';
    const line = root.getPropertyValue('--line').trim() || '#d4e1d8';
    const colors = [root.getPropertyValue('--accent').trim() || '#116b43', '#2377c9', '#b26818'];
    const model = this.model();
    const xIsPercentage = model.percentage === true && model.horizontal === true;
    const yIsPercentage = model.percentage === true && model.horizontal !== true;
    const configuration: ChartConfiguration<'line' | 'bar', number[], string> = {
      type: model.type,
      data: {
        labels: model.labels,
        datasets: model.datasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.values,
          borderColor: colors[index % colors.length],
          backgroundColor: `${colors[index % colors.length]}99`,
          borderWidth: 2,
          pointRadius: model.type === 'line' ? 3 : 0,
          tension: 0.25,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: model.horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: model.datasets.length > 1, labels: { color: text } },
          tooltip: {
            callbacks: {
              title: contexts => this.tooltipTitle(contexts, model),
              label: context => this.tooltipLabel(context, model),
              afterBody: contexts => this.tooltipDetails(contexts, model),
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: muted,
              callback: value => this.formatTick(value, xIsPercentage),
              autoSkip: true,
            },
            grid: { color: line },
          },
          y: {
            ticks: {
              color: muted,
              callback: value => this.formatTick(value, yIsPercentage),
              autoSkip: true,
            },
            grid: { color: line },
          },
        },
      },
    };
    this.chart = new Chart<'line' | 'bar', number[], string>(canvas, configuration);
  }

  private tooltipTitle(contexts: TooltipItem<'line' | 'bar'>[], model: AnalyticsChartModel): string {
    const context = contexts[0];
    if (!context) return '';
    return model.tooltipItems?.[context.dataIndex]?.title ?? context.label;
  }

  private tooltipLabel(context: TooltipItem<'line' | 'bar'>, model: AnalyticsChartModel): string | string[] {
    if (model.tooltipItems?.[context.dataIndex]?.lines?.length) return [];
    const parsedValue = model.horizontal ? context.parsed.x : context.parsed.y;
    const value = typeof parsedValue === 'number' ? parsedValue : 0;
    return `${context.dataset.label}: ${this.formatChartValue(value, model.percentage ? '%' : '')}`;
  }

  private tooltipDetails(contexts: TooltipItem<'line' | 'bar'>[], model: AnalyticsChartModel): string[] {
    const context = contexts[0];
    if (!context) return [];
    return (model.tooltipItems?.[context.dataIndex]?.lines ?? []).map(line => this.formatTooltipLine(line));
  }

  private formatTooltipLine(line: AnalyticsChartTooltipLine): string {
    const value = typeof line.value === 'number' ? this.formatChartValue(line.value, line.suffix) : line.value;
    return `${line.label}: ${value}`;
  }

  private formatTick(value: string | number, percentage: boolean): string {
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? this.formatChartValue(numericValue, percentage ? '%' : '') : String(value);
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
