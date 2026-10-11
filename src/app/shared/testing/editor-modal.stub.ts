import { Component, TemplateRef, contentChild, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/** Renders Ionic modal contents synchronously so editor tests exercise the real form template. */
@Component({
  // Match Ionic's selector to exercise real editor templates without a native overlay.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ion-modal',
  imports: [NgTemplateOutlet],
  template: `<ng-container [ngTemplateOutlet]="content() ?? null" />`,
})
export class EditorModalStubComponent {
  readonly isOpen = input(false);
  readonly canDismiss = input<unknown>();
  readonly didPresent = output<void>();
  readonly didDismiss = output<void>();
  readonly content = contentChild<TemplateRef<unknown>>(TemplateRef);
}
