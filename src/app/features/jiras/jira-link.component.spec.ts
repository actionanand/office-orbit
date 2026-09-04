import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LinksService } from '../../core/platform/links.service';
import { JiraLinkComponent } from './jira-link.component';
import { JiraLinkService } from './jira-link.service';

describe('JiraLinkComponent', () => {
  it('routes a JIRA key internally and hides an unavailable external action', async () => {
    await TestBed.configureTestingModule({
      imports: [JiraLinkComponent],
      providers: [
        provideRouter([]),
        { provide: JiraLinkService, useValue: { externalUrl: () => of(null) } },
        { provide: LinksService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(JiraLinkComponent);
    fixture.componentRef.setInput('jiraKey', 'CRI-1234');
    fixture.componentRef.setInput('showExternal', true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/app/jiras/CRI-1234');
    expect(element.querySelector('ion-button')).toBeNull();
  });
});
