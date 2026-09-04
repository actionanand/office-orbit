import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { WorkLogService } from './work-logs.service';
export const routes: Routes = [
  {
    path: '',
    providers: [{ provide: ReadFeatureService, useClass: WorkLogService }],
    loadComponent: () => import('./work-log.page').then(m => m.WorkLogPage),
  },
];
