import { Service } from '@angular/core';

export interface ResourceNavigationState {
  selected: string;
  search: string;
}

@Service()
export class NavigationStateService {
  private readonly resources = new Map<string, ResourceNavigationState>();

  read(kind: string): ResourceNavigationState | null {
    return this.resources.get(kind) ?? null;
  }

  save(kind: string, state: ResourceNavigationState): void {
    this.resources.set(kind, state);
  }

  clear(): void {
    this.resources.clear();
  }
}
