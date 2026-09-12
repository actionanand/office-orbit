import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { WorkLogService } from './work-logs.service';
export const routes: Routes = [
  {
    path: '',
    providers: [WorkLogService, { provide: ReadFeatureService, useExisting: WorkLogService }],
    loadComponent: () => import('./work-log.page').then(m => m.WorkLogPage),
  },
];
