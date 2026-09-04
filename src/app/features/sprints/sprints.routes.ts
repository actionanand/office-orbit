import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { SprintService } from './sprints.service';
export const routes: Routes = [
  {
    path: '',
    providers: [{ provide: ReadFeatureService, useClass: SprintService }],
    loadComponent: () => import('../resource/resource.page').then(m => m.ResourcePage),
  },
];
