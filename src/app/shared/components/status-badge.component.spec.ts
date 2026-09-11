import { TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  it.each([
    ['Not started', 'neutral'],
    ['Cancelled', 'warning'],
    ['Canceled', 'warning'],
    ['Blocked', 'danger'],
    ['In progress', 'info'],
    ['Done', 'success'],
    ['Ready for release', 'success'],
  ])('maps JIRA status %s to %s', (label, tone) => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('label', label);
    fixture.componentRef.setInput('kind', 'jira-status');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-badge')?.classList).toContain(tone);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(label);
  });

  it('preserves generic badge inference', () => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('label', 'Spilled once');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-badge')?.classList).toContain('warning');
  });
});
