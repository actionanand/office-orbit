import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: `<span [class]="'status-badge ' + tone()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly kind = input('neutral');
  readonly tone = computed(() => {
    if (this.kind() === 'jira-status') {
      switch (this.label().trim().toLowerCase()) {
        case 'not started':
          return 'neutral';
        case 'cancelled':
        case 'canceled':
          return 'warning';
        case 'blocked':
          return 'danger';
        case 'in progress':
          return 'info';
        case 'done':
        default:
          return 'success';
      }
    }
    const value = `${this.kind()} ${this.label()}`.toLowerCase();
    if (value.includes('blocked') || value.includes('negative')) return 'danger';
    if (
      value.includes('pending') ||
      value.includes('spillover') ||
      value.includes('spilled') ||
      value.includes('improvement')
    )
      return 'warning';
    if (
      value.includes('active') ||
      value.includes('confirmed') ||
      value.includes('positive') ||
      value.includes('demoed')
    )
      return 'success';
    return 'neutral';
  });
}
