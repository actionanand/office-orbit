import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { JiraService } from './jiras.service';
import { ReleaseService } from '../releases/releases.service';
export const routes: Routes = [
  {
    path: '',
    providers: [JiraService, ReleaseService, { provide: ReadFeatureService, useExisting: JiraService }],
    loadComponent: () => import('../resource/resource.page').then(m => m.ResourcePage),
  },
];
