import { Routes } from '@angular/router';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { FeedbackService } from './feedback.service';
export const routes: Routes = [
  {
    path: '',
    providers: [{ provide: ReadFeatureService, useClass: FeedbackService }],
    loadComponent: () => import('../resource/resource.page').then(m => m.ResourcePage),
  },
];
