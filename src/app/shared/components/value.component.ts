import { Component, computed, input } from '@angular/core';
import { displayValue, humanize } from '../models/api.models';
@Component({
  selector: 'app-value',
  template: `@if (array(); as values) {
      <div class="nested-value">
        @for (entry of values; track $index) {
          <app-value [value]="entry" [depth]="depth() + 1" />
        }
      </div>
    } @else if (entries(); as fields) {
      <dl class="detail-fields">
        @for (entry of fields; track entry[0]) {
          <div>
            <dt>{{ label(entry[0]) }}</dt>
            <dd><app-value [value]="entry[1]" [depth]="depth() + 1" /></dd>
          </div>
        }
      </dl>
    } @else {
      <span>{{ text(value()) }}</span>
    }`,
})
export class ValueComponent {
  readonly value = input<unknown>();
  readonly depth = input(0);
  readonly array = computed(() =>
    this.depth() < 6 && Array.isArray(this.value()) ? (this.value() as unknown[]) : null,
  );
  readonly entries = computed(() => {
    const value = this.value();
    return this.depth() < 6 && value !== null && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value)
      : null;
  });
  readonly label = humanize;
  readonly text = displayValue;
}
