import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MarkdownInputComponent } from './markdown-input.component';

@Component({
  imports: [ReactiveFormsModule, MarkdownInputComponent],
  template: `<form (submit)="submitted = true">
    <app-markdown-input label="Description" variant="full" [formControl]="control" />
  </form>`,
})
class TestEditorHostComponent {
  readonly control = new FormControl('First paragraph\n\n- Item one\n- Item two\n\nLast paragraph', {
    nonNullable: true,
  });
  submitted = false;
}

describe('MarkdownInputComponent', () => {
  function render() {
    const fixture = TestBed.createComponent(TestEditorHostComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const textarea = element.querySelector('textarea')!;
    return { fixture, element, textarea, control: fixture.componentInstance.control };
  }

  it('loads the exact source and associates its visible label with the textarea', () => {
    const { element, textarea, control } = render();
    expect(textarea.value).toBe(control.value);
    expect(element.querySelector('label')?.htmlFor).toBe(textarea.id);
    expect(control.pristine).toBe(true);
  });

  it.each([0, 12, 26, 38, 55])('keeps typing at source position %s and propagates dirty/touched state', position => {
    const { fixture, textarea, control } = render();
    const initial = control.value;
    textarea.focus();
    textarea.setSelectionRange(position, position);
    textarea.setRangeText(' updated', position, position, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(control.value).toBe(initial.slice(0, position) + ' updated' + initial.slice(position));
    expect(control.dirty).toBe(true);
    expect(textarea.selectionStart).toBe(position + 8);
    textarea.dispatchEvent(new Event('blur'));
    expect(control.touched).toBe(true);
  });

  it('formats the selected range, keeps focus and never submits the enclosing form', () => {
    const { fixture, element, textarea, control } = render();
    const position = control.value.indexOf('Item two');
    textarea.setSelectionRange(position, position + 8);
    element.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!.click();
    fixture.detectChanges();
    expect(control.value).toContain('- **Item two**');
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('Item two');
    expect(document.activeElement).toBe(textarea);
    expect(control.dirty).toBe(true);
    expect(fixture.componentInstance.submitted).toBe(false);
    expect([...element.querySelectorAll('button')].every(button => button.type === 'button')).toBe(true);
  });

  it('disables the textarea and every toolbar control through the CVA', () => {
    const { fixture, element, textarea, control } = render();
    control.disable();
    fixture.detectChanges();
    expect(textarea.disabled).toBe(true);
    expect([...element.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
  });

  it('renders labeled icon controls and applies list indentation through the form control', () => {
    const { fixture, element, textarea, control } = render();
    const tools = [...element.querySelectorAll<HTMLButtonElement>('.markdown-input-tools button')];
    expect(tools.every(button => button.querySelector('ion-icon, svg'))).toBe(true);
    expect(tools.every(button => button.title && button.getAttribute('aria-label'))).toBe(true);
    control.setValue('- Parent\n- Child');
    fixture.detectChanges();
    textarea.setSelectionRange(12, 12);
    element.querySelector<HTMLButtonElement>('[aria-label="Indent list"]')!.click();
    fixture.detectChanges();
    expect(control.value).toBe('- Parent\n    - Child');
    element.querySelector<HTMLButtonElement>('[aria-label="Outdent list"]')!.click();
    fixture.detectChanges();
    expect(control.value).toBe('- Parent\n- Child');
    expect(control.dirty).toBe(true);
  });

  it('uses the existing viewer for preview and preserves source and selection when returning to Write', async () => {
    const { fixture, element, textarea, control } = render();
    const original = control.value;
    textarea.setSelectionRange(20, 23);
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('.markdown-input-modes button')];
    buttons[1].click();
    fixture.detectChanges();
    expect(element.querySelector('app-markdown-viewer ul')).not.toBeNull();
    expect(textarea.hidden).toBe(true);
    buttons[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(textarea.value).toBe(original);
    expect(control.value).toBe(original);
    expect(control.pristine).toBe(true);
    expect(textarea.selectionStart).toBe(20);
    expect(textarea.selectionEnd).toBe(23);
  });

  it('handles formatting shortcuts while leaving native undo, redo and clipboard shortcuts alone', () => {
    const { fixture, textarea, control } = render();
    textarea.setSelectionRange(0, 5);
    const bold = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true, bubbles: true });
    textarea.dispatchEvent(bold);
    fixture.detectChanges();
    expect(bold.defaultPrevented).toBe(true);
    expect(control.value).toMatch(/^\*\*First\*\*/);
    for (const key of ['z', 'c', 'v', 'x', 'a']) {
      const event = new KeyboardEvent('keydown', { key, ctrlKey: true, cancelable: true, bubbles: true });
      textarea.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('keeps raw HTML as source and lets the existing preview sanitize unsafe content', () => {
    const { fixture, element, textarea, control } = render();
    const source = '<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))';
    control.setValue(source);
    fixture.detectChanges();
    expect(textarea.value).toBe(source);
    const preview = element.querySelectorAll<HTMLButtonElement>('.markdown-input-modes button')[1];
    preview.click();
    fixture.detectChanges();
    expect(element.querySelector('.markdown-input-preview script')).toBeNull();
    expect(element.querySelector('.markdown-input-preview a[href^="javascript:"]')).toBeNull();
    expect(control.value).toBe(source);
  });
});
