import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { ReleaseService } from './releases.service';
export const routes: Routes = [
  {
    path: '',
    providers: [ReleaseService, { provide: ReadFeatureService, useExisting: ReleaseService }],
    loadComponent: () => import('../resource/resource.page').then(m => m.ResourcePage),
  },
];
