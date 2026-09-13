import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-productivity-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `<nav class="productivity-nav" aria-label="Productivity sections">
    @for (item of items; track item.path) {
      <a [routerLink]="'/app/productivity/' + item.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{
        item.label
      }}</a>
    }
  </nav>`,
})
export class ProductivityNavComponent {
  readonly items = [
    { path: 'todos', label: 'To Do' },
    { path: 'tasks', label: 'Tasks' },
    { path: 'memos', label: 'Memos' },
    { path: 'reference-library', label: 'Reference Library' },
  ];
}
