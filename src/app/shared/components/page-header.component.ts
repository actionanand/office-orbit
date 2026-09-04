import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `<header class="page-heading">
    @if (eyebrow()) {
      <p class="eyebrow">{{ eyebrow() }}</p>
    }
    <h1>{{ title() }}</h1>
    @if (description()) {
      <p>{{ description() }}</p>
    }
  </header>`,
})
export class PageHeaderComponent {
  readonly eyebrow = input('Office Orbit');
  readonly title = input.required<string>();
  readonly description = input('');
}
