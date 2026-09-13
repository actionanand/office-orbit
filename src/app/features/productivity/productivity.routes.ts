import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'todos' },
  {
    path: 'todos',
    loadComponent: () => import('./productivity-list.page').then(m => m.ProductivityListPage),
    data: { kind: 'todos' },
  },
  {
    path: 'tasks',
    loadComponent: () => import('./productivity-list.page').then(m => m.ProductivityListPage),
    data: { kind: 'tasks' },
  },
  {
    path: 'memos',
    loadComponent: () => import('./productivity-list.page').then(m => m.ProductivityListPage),
    data: { kind: 'memos' },
  },
  {
    path: 'memos/:pageId',
    loadComponent: () => import('./markdown-detail.page').then(m => m.MarkdownDetailPage),
    data: { kind: 'memos' },
  },
  {
    path: 'reference-library',
    loadComponent: () => import('./reference-library.page').then(m => m.ReferenceLibraryPage),
  },
  {
    path: 'reference-library/:pageId',
    loadComponent: () => import('./markdown-detail.page').then(m => m.MarkdownDetailPage),
    data: { kind: 'reference-library' },
  },
];
