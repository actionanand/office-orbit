import { Component, computed, input } from '@angular/core';
export interface ChartValue {
  label: string;
  value: number;
}
@Component({
  selector: 'app-bar-chart',
  template: `<figure class="native-chart" [attr.aria-label]="label()">
    <figcaption>{{ label() }}</figcaption>
    @for (item of values(); track item.label) {
      <div class="chart-row">
        <span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong>
        <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="8" rx="3" class="chart-track" />
          <rect [attr.width]="(item.value / maximum()) * 100" height="8" rx="3" class="chart-fill" />
        </svg>
      </div>
    }
  </figure>`,
})
export class BarChartComponent {
  readonly label = input.required<string>();
  readonly values = input.required<ChartValue[]>();
  readonly maximum = computed(() => Math.max(1, ...this.values().map(item => item.value)));
}
