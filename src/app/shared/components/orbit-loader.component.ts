import { Component, input } from '@angular/core';

@Component({
  selector: 'app-orbit-loader',
  host: {
    role: 'status',
    'aria-label': 'Loading',
    '[style.--loader-color-1]': 'colorOne()',
    '[style.--loader-color-2]': 'colorTwo()',
    '[style.--loader-dimension]': "size() * 48 + 'px'",
    '[style.--loader-perspective]': "size() * 1000 + 'px'",
    '[style.font-size]': "size() * 16 + 'px'",
  },
  template: '<span class="loader" aria-hidden="true"></span><span class="sr-only">Loading</span>',
})
export class OrbitLoaderComponent {
  readonly colorOne = input('var(--accent)');
  readonly colorTwo = input('var(--accent)');
  readonly size = input(1);
}
