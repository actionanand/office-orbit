import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { codeSlashOutline, codeWorkingOutline, linkOutline, listOutline } from 'ionicons/icons';
import { MarkdownViewerComponent } from '../../features/productivity/markdown-viewer.component';
import { formatMarkdown, MarkdownAction } from '../utils/markdown-editor';

let nextEditorId = 0;

interface MarkdownTool {
  action: MarkdownAction;
  label: string;
  icon?: string;
  path?: string;
}

@Component({
  selector: 'app-markdown-input',
  imports: [MarkdownViewerComponent, IonIcon],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MarkdownInputComponent), multi: true }],
  host: { class: 'markdown-input' },
  template: `
    <label [for]="editorId">{{ label() }}</label>
    <div class="markdown-input-frame">
      <div class="markdown-input-controls">
        <div class="markdown-input-modes" role="group" [attr.aria-label]="label() + ' editing mode'">
          <button type="button" [disabled]="disabled()" [attr.aria-pressed]="!preview()" (click)="setPreview(false)">
            Write
          </button>
          <button type="button" [disabled]="disabled()" [attr.aria-pressed]="preview()" (click)="setPreview(true)">
            Preview
          </button>
        </div>
        <div class="markdown-input-tools" role="group" [attr.aria-label]="label() + ' formatting'" [hidden]="preview()">
          @for (tool of tools; track tool.action) {
            <button
              type="button"
              [disabled]="disabled()"
              [title]="tool.label"
              [attr.aria-label]="tool.label"
              (pointerdown)="$event.preventDefault()"
              (click)="format(tool.action)">
              @if (tool.icon) {
                <ion-icon [icon]="tool.icon" aria-hidden="true" />
              } @else {
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                  <path [attr.d]="tool.path" />
                </svg>
              }
            </button>
          }
          @if (variant() === 'full') {
            @for (tool of extraTools; track tool.action) {
              <button
                type="button"
                [disabled]="disabled()"
                [title]="tool.label"
                [attr.aria-label]="tool.label"
                (pointerdown)="$event.preventDefault()"
                (click)="format(tool.action)">
                @if (tool.icon) {
                  <ion-icon [icon]="tool.icon" aria-hidden="true" />
                } @else {
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                    <path [attr.d]="tool.path" />
                  </svg>
                }
              </button>
            }
          }
        </div>
      </div>
      <textarea
        #editor
        [id]="editorId"
        [rows]="rows()"
        [value]="value()"
        [disabled]="disabled()"
        [hidden]="preview()"
        (input)="typed($event)"
        (blur)="touched()"
        (keydown)="shortcut($event)"></textarea>
      @if (preview()) {
        <div class="markdown-input-preview compact-markdown" role="region" [attr.aria-label]="label() + ' preview'">
          @if (value()) {
            <app-markdown-viewer [markdown]="value()" />
          } @else {
            <p>No content to preview.</p>
          }
        </div>
      }
    </div>
  `,
})
export class MarkdownInputComponent implements ControlValueAccessor {
  readonly label = input('Markdown');
  readonly rows = input(5);
  readonly variant = input<'basic' | 'full'>('basic');
  readonly editorId = `markdown-input-${++nextEditorId}`;
  readonly value = signal('');
  readonly disabled = signal(false);
  readonly preview = signal(false);
  private readonly editor = viewChild<ElementRef<HTMLTextAreaElement>>('editor');
  private readonly injector = inject(Injector);
  readonly tools: readonly MarkdownTool[] = [
    {
      action: 'bold',
      label: 'Bold',
      path: 'M15.6 10.79A3.9 3.9 0 0 0 17 8c0-2.21-1.79-4-4-4H6v16h8c2.21 0 4-1.79 4-4 0-1.93-1.1-3.58-2.4-4.21zM9 7h4a1 1 0 0 1 0 2H9V7zm5 10H9v-4h5a2 2 0 0 1 0 4z',
    },
    { action: 'italic', label: 'Italic', path: 'M10 4v3h2.21l-3.42 10H6v3h8v-3h-2.21l3.42-10H18V4z' },
    { action: 'unordered', label: 'Unordered list', icon: listOutline },
    {
      action: 'ordered',
      label: 'Ordered list',
      path: 'M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1V14h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z',
    },
    {
      action: 'indent',
      label: 'Indent list',
      path: 'M3 8v8l4-4-4-4zm0-5v2h18V3H3zm6 6h12V7H9v2zm0 4h12v-2H9v2zm0 4h12v-2H9v2zM3 21h18v-2H3v2z',
    },
    {
      action: 'outdent',
      label: 'Outdent list',
      path: 'M7 8l-4 4 4 4V8zM3 3v2h18V3H3zm6 6h12V7H9v2zm0 4h12v-2H9v2zm0 4h12v-2H9v2zM3 21h18v-2H3v2z',
    },
    { action: 'code', label: 'Inline code', icon: codeSlashOutline },
    { action: 'link', label: 'Link', icon: linkOutline },
  ];
  readonly extraTools: readonly MarkdownTool[] = [
    { action: 'heading', label: 'Heading', path: 'M5 4v3h5.5v13h3V7H19V4z' },
    { action: 'quote', label: 'Blockquote', path: 'M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z' },
    { action: 'fence', label: 'Code block', icon: codeWorkingOutline },
  ];
  private changed: (value: string) => void = () => undefined;
  touched: () => void = () => undefined;

  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' ? value : '');
  }
  registerOnChange(fn: (value: string) => void): void {
    this.changed = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  typed(event: Event): void {
    if (this.disabled()) return;
    const value = (event.target as HTMLTextAreaElement).value;
    // The native textarea already contains this value. Angular writes the same value,
    // so ordinary typing does not replace the surface or disturb its selection.
    this.value.set(value);
    this.changed(value);
  }
  format(action: MarkdownAction): void {
    const editor = this.editor()?.nativeElement;
    if (!editor || this.disabled() || this.preview()) return;
    const result = formatMarkdown(editor.value, editor.selectionStart, editor.selectionEnd, action);
    editor.focus();
    editor.setSelectionRange(result.replaceStart, result.replaceEnd);
    // Native insertion keeps toolbar edits in the browser's undo history. Engines
    // without this command still support the standard textarea range API.
    const inserted = editor.ownerDocument.execCommand?.('insertText', false, result.replacement);
    if (!inserted) editor.setRangeText(result.replacement, result.replaceStart, result.replaceEnd, 'preserve');
    if (this.value() !== result.value) {
      this.value.set(result.value);
      this.changed(result.value);
    }
    editor.setSelectionRange(result.selectionStart, result.selectionEnd);
  }
  setPreview(preview: boolean): void {
    if (this.disabled()) return;
    this.preview.set(preview);
    if (!preview) afterNextRender(() => this.editor()?.nativeElement.focus(), { injector: this.injector });
  }
  shortcut(event: KeyboardEvent): void {
    if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || this.disabled())
      return;
    const action = ({ b: 'bold', i: 'italic', k: 'link' } as const)[event.key.toLowerCase() as 'b' | 'i' | 'k'];
    if (!action) return;
    event.preventDefault();
    this.format(action);
  }
}
