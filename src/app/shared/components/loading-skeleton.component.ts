import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  template: `<section class="loading-layout" aria-label="Loading content" aria-busy="true">
    @for (row of rowItems(); track row) {
      <div class="skeleton-row" aria-hidden="true"><span></span><span></span><span></span></div>
    }
  </section>`,
})
export class LoadingSkeletonComponent {
  readonly rows = input(4);
  readonly rowItems = computed(() => Array.from({ length: this.rows() }, (_, index) => index));
}
