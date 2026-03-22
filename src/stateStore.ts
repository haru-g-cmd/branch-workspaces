import * as vscode from 'vscode';
import { BranchState, StateStore } from './types';

const STORAGE_KEY = 'branchWorkspaces.states';

export class StateManager {
  constructor(private context: vscode.ExtensionContext) {}

  public async save(state: BranchState): Promise<void> {
    const store = this.getAll();
    store[state.branch] = state;
    await this.context.workspaceState.update(STORAGE_KEY, store);
  }

  public get(branch: string): BranchState | undefined {
    const store = this.getAll();
    return store[branch];
  }

  public getAll(): StateStore {
    return this.context.workspaceState.get<StateStore>(STORAGE_KEY) || {};
  }

  public async delete(branch: string): Promise<void> {
    const store = this.getAll();
    delete store[branch];
    await this.context.workspaceState.update(STORAGE_KEY, store);
  }

  public async clearAll(): Promise<void> {
    await this.context.workspaceState.update(STORAGE_KEY, {});
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
