import { TestBed } from '@angular/core/testing';
import { IonModal } from '@ionic/angular';
import { EditorModalStubComponent } from '../../shared/testing/editor-modal.stub';
import { CredentialEditorComponent } from './credential-editor.component';

describe('CredentialEditorComponent', () => {
  it('emits a normalized plaintext payload only when the form is valid', () => {
    TestBed.configureTestingModule({ imports: [CredentialEditorComponent] }).overrideComponent(
      CredentialEditorComponent,
      {
        remove: { imports: [IonModal] },
        add: { imports: [EditorModalStubComponent] },
      },
    );
    const fixture = TestBed.createComponent(CredentialEditorComponent);
    fixture.componentRef.setInput('open', true);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.submit();
    expect(saved).not.toHaveBeenCalled();

    fixture.componentInstance.form.patchValue({
      name: 'Production database',
      type: 'database',
      username: 'orbit',
      secret: 'vault-secret',
      tags: 'production, database, production',
    });
    fixture.componentInstance.submit();

    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadVersion: 1,
        name: 'Production database',
        type: 'database',
        username: 'orbit',
        secret: 'vault-secret',
        tags: ['production', 'database', 'production'],
      }),
    );
  });

  it('does not emit while a save is already active', () => {
    TestBed.configureTestingModule({ imports: [CredentialEditorComponent] });
    const fixture = TestBed.createComponent(CredentialEditorComponent);
    fixture.componentRef.setInput('saving', true);
    fixture.componentInstance.form.patchValue({ name: 'Credential' });
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);

    fixture.componentInstance.submit();

    expect(saved).not.toHaveBeenCalled();
  });

  it('reports user edits and secret visibility changes as vault activity', () => {
    TestBed.configureTestingModule({ imports: [CredentialEditorComponent] }).overrideComponent(
      CredentialEditorComponent,
      {
        remove: { imports: [IonModal] },
        add: { imports: [EditorModalStubComponent] },
      },
    );
    const fixture = TestBed.createComponent(CredentialEditorComponent);
    const activity = vi.fn();
    fixture.componentInstance.activity.subscribe(activity);
    fixture.componentRef.setInput('open', true);
    TestBed.tick();

    expect(activity).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.name.setValue('Production credential');
    fixture.componentInstance.toggleSecret();

    expect(activity).toHaveBeenCalledTimes(2);
  });
});
