import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IonModal } from '@ionic/angular';
import { of } from 'rxjs';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { MarkdownInputComponent } from '../../shared/components/markdown-input.component';
import { JiraCreateRequest } from '../../shared/models/api.models';
import { EditorModalStubComponent } from '../../shared/testing/editor-modal.stub';
import { JiraCreateComponent } from './jira-create.component';
import { JiraService } from './jiras.service';

const source = '  ## Upgrade\n\n- Angular\n- Backstage\n\n**Important**\n';

describe('JiraCreateComponent Description', () => {
  async function render() {
    const create = vi.fn((body: JiraCreateRequest) => of({ data: { id: 'new-jira', jiraKey: body.jiraKey } }));
    const confirm = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      imports: [JiraCreateComponent],
      providers: [
        { provide: JiraService, useValue: { metadata: () => of({ resource: 'jiras', fields: [] }), create } },
        { provide: RelationOptionsService, useValue: { load: () => of([]) } },
        { provide: ConfirmationService, useValue: { confirm } },
      ],
    }).overrideComponent(JiraCreateComponent, {
      remove: { imports: [IonModal] },
      add: { imports: [EditorModalStubComponent] },
    });
    const fixture = TestBed.createComponent(JiraCreateComponent);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const textarea = element.querySelector<HTMLTextAreaElement>('app-markdown-input textarea')!;
    const component = fixture.componentInstance;
    component.form.patchValue({ jiraKey: 'LSC-99999', summary: 'Angular upgrade' });
    return { fixture, element, textarea, component, create, confirm };
  }

  it('places one full Description editor after Summary and initializes/reset it empty', async () => {
    const { fixture, element, textarea, component } = await render();
    const editors = fixture.debugElement.queryAll(By.directive(MarkdownInputComponent));
    expect(editors).toHaveLength(1);
    expect((editors[0].componentInstance as MarkdownInputComponent).variant()).toBe('full');
    expect(element.querySelector('[formcontrolname="summary"]')?.nextElementSibling?.tagName).toBe(
      'APP-MARKDOWN-INPUT',
    );
    expect(textarea.value).toBe('');
    expect(component.form.controls.descriptionMarkdown.value).toBe('');
    component.form.controls.descriptionMarkdown.setValue(source);
    await component.load();
    expect(component.form.controls.descriptionMarkdown.value).toBe('');
    expect(component.form.pristine).toBe(true);
  });

  it('preserves typed Markdown including whitespace in the create payload without HTML conversion', async () => {
    const { fixture, textarea, component, create, confirm } = await render();
    textarea.value = source;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.form.controls.descriptionMarkdown.value).toBe(source);
    expect(component.form.dirty).toBe(true);
    await component.requestClose();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Discard JIRA?' }));
    const saved = vi.fn();
    component.saved.subscribe(saved);
    await component.save();
    expect(create).toHaveBeenCalledWith({
      jiraKey: 'LSC-99999',
      summary: 'Angular upgrade',
      descriptionMarkdown: source,
      projectId: null,
      statusOptionId: null,
      tagOptionIds: [],
      inActiveSprint: false,
      demoRequired: false,
      appraisal: false,
    });
    expect(saved).toHaveBeenCalledWith({ id: 'new-jira', jiraKey: 'LSC-99999' });
    expect(component.form.pristine).toBe(true);
  });

  it('omits an empty Description while preserving existing key/Summary validation', async () => {
    const { component, create } = await render();
    component.form.controls.jiraKey.setValue('not-a-key');
    await component.save();
    expect(create).not.toHaveBeenCalled();
    expect(component.form.controls.jiraKey.invalid).toBe(true);
    component.form.controls.jiraKey.setValue('LSC-99999');
    component.form.controls.summary.setValue('');
    await component.save();
    expect(create).not.toHaveBeenCalled();
    expect(component.form.controls.summary.invalid).toBe(true);
    component.form.controls.summary.setValue('Angular upgrade');
    await component.save();
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).not.toHaveProperty('descriptionMarkdown');
  });
});
