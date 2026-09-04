import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { WorkLinksService } from './work-links.service';
export const routes: Routes = [
  {
    path: '',
    providers: [{ provide: ReadFeatureService, useClass: WorkLinksService }],
    loadComponent: () => import('../resource/resource.page').then(m => m.ResourcePage),
  },
];
