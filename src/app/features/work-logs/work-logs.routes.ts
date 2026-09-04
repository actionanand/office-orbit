import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { WorkLogService } from './work-logs.service';
export const routes: Routes = [
  {
    path: '',
    providers: [{ provide: ReadFeatureService, useClass: WorkLogService }],
    loadComponent: () => import('../resource/resource.page').then(m => m.ResourcePage),
  },
];
