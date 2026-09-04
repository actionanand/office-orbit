import { Routes } from '@angular/router';
import { authGuard, loginGuard, unlockGuard } from './core/guards/auth.guard';
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'unlock',
    canActivate: [unlockGuard],
    loadComponent: () => import('./features/unlock/unlock.page').then(m => m.UnlockPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./shared/components/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      { path: 'jiras', loadChildren: () => import('./features/jiras/jiras.routes').then(m => m.routes) },
      {
        path: 'work-logs',
        loadChildren: () => import('./features/work-logs/work-logs.routes').then(m => m.routes),
      },
      {
        path: 'sprints',
        loadChildren: () => import('./features/sprints/sprints.routes').then(m => m.routes),
      },
      {
        path: 'releases',
        loadChildren: () => import('./features/releases/releases.routes').then(m => m.routes),
      },
      {
        path: 'feedback',
        loadChildren: () => import('./features/feedback/feedback.routes').then(m => m.routes),
      },
      {
        path: 'work-links',
        loadChildren: () => import('./features/work-links/work-links.routes').then(m => m.routes),
      },
      {
        path: 'jiras/:jiraKey',
        loadComponent: () => import('./features/jiras/jira-detail.page').then(m => m.JiraDetailPage),
      },
      { path: 'more', loadComponent: () => import('./features/more/more.page').then(m => m.MorePage) },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'app/dashboard' },
  { path: '**', redirectTo: 'app/dashboard' },
];
