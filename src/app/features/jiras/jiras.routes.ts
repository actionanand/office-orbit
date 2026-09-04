import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { JiraService } from './jiras.service';
export const routes: Routes = [
  {
    path: '',
    providers: [{ provide: ReadFeatureService, useClass: JiraService }],
    loadComponent: () => import('../resource/resource.page').then(m => m.ResourcePage),
  },
];
