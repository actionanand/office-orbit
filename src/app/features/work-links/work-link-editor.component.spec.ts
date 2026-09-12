import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { WorkLinkEditorComponent } from './work-link-editor.component';

describe('WorkLinkEditorComponent', () => {
  it('blocks invalid URLs and clears an empty URL with null', async () => {
    const item = {
      id: 'new',
      createdTime: '',
      lastEditedTime: '',
      link: 'Docs',
      type: null,
      url: null,
      notes: '',
      active: true,
      companyIds: [],
      projectIds: [],
    };
    const create = vi.fn().mockReturnValue(of({ data: item }));
    await TestBed.configureTestingModule({
      imports: [WorkLinkEditorComponent],
      providers: [
        { provide: MutationApiService, useValue: { create, patch: vi.fn() } },
        { provide: RelationOptionsService, useValue: {} },
      ],
    }).compileComponents();
    const component = TestBed.createComponent(WorkLinkEditorComponent).componentInstance;
    component.form.patchValue({ link: 'Docs', url: 'invalid' });
    expect(component.canSave()).toBe(false);
    await component.save();
    expect(create).not.toHaveBeenCalled();
    component.form.patchValue({ url: '', typeOptionId: 'type-id', companyId: 'company-id', projectId: 'project-id' });
    await component.save();
    expect(create).toHaveBeenCalledWith(
      '/api/work-links',
      expect.objectContaining({
        typeOptionId: 'type-id',
        url: null,
        companyId: 'company-id',
        projectId: 'project-id',
      }),
    );
  });
});
