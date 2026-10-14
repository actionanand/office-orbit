import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ReleaseItem } from '../../shared/models/api.models';
import { ReleaseItemEditorComponent } from './release-item-editor.component';
import { ReleaseService } from './releases.service';

const item: ReleaseItem = {
  id: 'release-id',
  createdTime: '',
  lastEditedTime: '',
  releaseItem: 'Old release',
  componentName: 'Client',
  deploymentType: 'Retired option',
  versionNumber: '1',
  branch: 'main',
  formalAnnouncedDate: null,
  confirmedReleaseDate: null,
  notes: '',
  jiraIds: ['jira-id'],
  jiraStatuses: [],
  sprintIds: [],
  spilloverCount: 0,
};

describe('ReleaseItemEditorComponent', () => {
  const releases = {
    metadata: vi.fn(() =>
      of({
        resource: 'releases',
        fields: [
          {
            key: 'deploymentTypeOptionId',
            label: 'Deployment Type',
            type: 'select',
            writable: true,
            options: [{ id: 'production-id', name: 'Production', color: 'green' }],
          },
        ],
      }),
    ),
    update: vi.fn(() => of({ data: item })),
    create: vi.fn(() => of({ data: item })),
  };

  beforeEach(() => {
    releases.update.mockClear();
    TestBed.configureTestingModule({
      imports: [ReleaseItemEditorComponent],
      providers: [
        { provide: ReleaseService, useValue: releases },
        {
          provide: AlterControlsService,
          useValue: { alterReleaseManagementEnabled: signal(true), refresh: vi.fn().mockResolvedValue(null) },
        },
      ],
    });
  });

  it('omits an unknown historical Deployment Type until the user changes it', async () => {
    const fixture = TestBed.createComponent(ReleaseItemEditorComponent);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const editor = fixture.componentInstance;
    expect(editor.unknownDeploymentType()).toBe('Retired option');
    await editor.save();
    expect(releases.update).toHaveBeenCalledOnce();
    const calls = releases.update.mock.calls as unknown as Array<[string, Record<string, unknown>]>;
    expect(calls[0]?.[1]).not.toHaveProperty('deploymentTypeOptionId');

    editor.deploymentChanged.set(true);
    editor.form.controls.deploymentTypeOptionId.setValue('');
    await editor.save();
    expect(calls[1]?.[1]).toMatchObject({ deploymentTypeOptionId: null });
  });
});
