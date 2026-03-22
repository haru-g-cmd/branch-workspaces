import * as vscode from 'vscode';
import { BranchState, StateStore } from './types';

const STORAGE_KEY = 'branchWorkspaces.states';

export class StateManager {
  constructor(private context: vscode.ExtensionContext) {}

  public save(state: BranchState): void {
    const store = this.getAll();
    store[state.branch] = state;
    this.context.workspaceState.update(STORAGE_KEY, store);
  }

  public get(branch: string): BranchState | undefined {
    const store = this.getAll();
    return store[branch];
  }

  public getAll(): StateStore {
    return this.context.workspaceState.get<StateStore>(STORAGE_KEY) || {};
  }

  public delete(branch: string): void {
    const store = this.getAll();
    delete store[branch];
    this.context.workspaceState.update(STORAGE_KEY, store);
  }

  public clearAll(): void {
    this.context.workspaceState.update(STORAGE_KEY, {});
  }

  public getBranchCount(): number {
    return Object.keys(this.getAll()).length;
  }

  public getTabCount(branch: string): number {
    const state = this.get(branch);
    if (!state) { return 0; }
    return state.groups.reduce((sum, g) => sum + g.editors.length, 0);
  }
}
