import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { LocalMarkdownPreviewComponent } from './local-markdown-preview.component';
import { ProductivityService } from './productivity.service';
import { ReferenceLibraryPage } from './reference-library.page';

describe('Local Markdown preview', () => {
  it('uses the shared viewer and exposes the exact source', async () => {
    const fixture = TestBed.createComponent(LocalMarkdownPreviewComponent);
    fixture.componentRef.setInput('filename', 'private.md');
    fixture.componentRef.setInput('markdown', '# Private\n\n```typescript\nconst value = 1;\n```');
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('ion-modal') as HTMLIonModalElement;
    await modal.present();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.source()).toBe(false);
    expect(modal.querySelector('app-markdown-viewer')).not.toBeNull();
    fixture.componentInstance.source.set(true);
    expect(fixture.componentInstance.markdown()).toBe('# Private\n\n```typescript\nconst value = 1;\n```');
  });

  it('reads locally, avoids import and persistence, and clears memory on close and destroy', async () => {
    const importMarkdown = vi.fn();
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    TestBed.configureTestingModule({
      imports: [ReferenceLibraryPage],
      providers: [
        {
          provide: ProductivityService,
          useValue: {
            referenceMetadata: vi.fn(() => of({ resource: 'reference-library', fields: [] })),
            referenceList: vi.fn(() => of({ data: [], count: 0, hasMore: false, nextCursor: null })),
            importMarkdown,
          },
        },
        { provide: SnackbarService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ReferenceLibraryPage);
    const component = fixture.componentInstance;
    const markdown = '# Local only\n\n$E = mc^2$';
    const file = new File([markdown], 'local.markdown', { type: 'text/markdown' });
    Object.defineProperty(file, 'text', { value: vi.fn(async () => markdown) });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    await component.selectPreviewFile({ target: input } as unknown as Event);
    expect(file.text).toHaveBeenCalledOnce();
    expect(component.previewFilename()).toBe('local.markdown');
    expect(component.previewMarkdown()).toBe(markdown);
    expect(importMarkdown).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    component.closePreview();
    expect(component.previewFilename()).toBe('');
    expect(component.previewMarkdown()).toBe('');
    component.previewFilename.set('destroy.md');
    component.previewMarkdown.set('secret');
    fixture.destroy();
    expect(component.previewFilename()).toBe('');
    expect(component.previewMarkdown()).toBe('');
  });
});
