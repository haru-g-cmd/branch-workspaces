import * as vscode from 'vscode';
import { GitWatcher } from './gitWatcher';
import { StateManager } from './stateStore';
import { captureState } from './stateCapture';
import { restoreState } from './stateRestore';

let gitWatcher: GitWatcher;
let stateManager: StateManager;
let statusBarItem: vscode.StatusBarItem;
let saveDebounceTimer: NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext) {
  stateManager = new StateManager(context);
  gitWatcher = new GitWatcher();

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBarItem.command = 'branchWorkspaces.saveState';
  updateStatusBar();

  // Branch switch handler
  gitWatcher.onBranchChange(async ({ from, to }) => {
    try {
      const config = vscode.workspace.getConfiguration('branchWorkspaces');
      if (!config.get<boolean>('enabled', true)) { return; }

      if (from) {
        const state = captureState(from);
        await stateManager.save(state);
      }

      const savedState = stateManager.get(to);
      if (savedState) {
        await restoreState(savedState);
        vscode.window.setStatusBarMessage(`$(check) Restored workspace for branch: ${to}`, 3000);
      } else {
        vscode.window.setStatusBarMessage(`$(git-branch) Switched to branch: ${to} (no saved state)`, 3000);
      }

      updateStatusBar();
    } catch {
      // Silent fail on branch switch errors
    }
  });

  // Auto-save on editor changes (debounced)
  const onEditorChange = () => {
    const config = vscode.workspace.getConfiguration('branchWorkspaces');
    if (!config.get<boolean>('enabled', true)) { return; }

    const branch = gitWatcher.getBranch();
    if (!branch) { return; }

    if (saveDebounceTimer) { clearTimeout(saveDebounceTimer); }
    const debounceMs = config.get<number>('debounceMs', 500);

    saveDebounceTimer = setTimeout(async () => {
      const state = captureState(branch);
      await stateManager.save(state);
      updateStatusBar();
    }, debounceMs);
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(onEditorChange),
    vscode.window.onDidChangeVisibleTextEditors(onEditorChange),
    vscode.window.tabGroups.onDidChangeTabs(onEditorChange),
    vscode.window.onDidChangeTextEditorVisibleRanges(onEditorChange)
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('branchWorkspaces.saveState', async () => {
      const branch = gitWatcher.getBranch();
      if (!branch) {
        vscode.window.showWarningMessage('Branch Workspaces: No Git branch detected.');
        return;
      }
      const state = captureState(branch);
      await stateManager.save(state);
      updateStatusBar();
      vscode.window.setStatusBarMessage(`$(check) State saved for branch: ${branch}`, 3000);
    }),

    vscode.commands.registerCommand('branchWorkspaces.restoreState', async () => {
      const branch = gitWatcher.getBranch();
      if (!branch) {
        vscode.window.showWarningMessage('Branch Workspaces: No Git branch detected.');
        return;
      }
      const savedState = stateManager.get(branch);
      if (!savedState) {
        vscode.window.showInformationMessage(`Branch Workspaces: No saved state for branch "${branch}".`);
        return;
      }
      await restoreState(savedState);
      vscode.window.setStatusBarMessage(`$(check) Restored workspace for branch: ${branch}`, 3000);
    }),

    vscode.commands.registerCommand('branchWorkspaces.clearState', async () => {
      const branch = gitWatcher.getBranch();
      if (!branch) {
        vscode.window.showWarningMessage('Branch Workspaces: No Git branch detected.');
        return;
      }
      await stateManager.delete(branch);
      updateStatusBar();
      vscode.window.showInformationMessage(`Branch Workspaces: Cleared state for branch "${branch}".`);
    }),

    vscode.commands.registerCommand('branchWorkspaces.clearAll', async () => {
      const count = stateManager.getBranchCount();
      const answer = await vscode.window.showWarningMessage(
        `Clear saved states for all ${count} branches?`,
        { modal: true },
        'Clear All'
      );
      if (answer === 'Clear All') {
        await stateManager.clearAll();
        updateStatusBar();
        vscode.window.showInformationMessage('Branch Workspaces: All saved states cleared.');
      }
    })
  );

  context.subscriptions.push(gitWatcher, statusBarItem);
}

function updateStatusBar(): void {
  const config = vscode.workspace.getConfiguration('branchWorkspaces');
  if (!config.get<boolean>('showStatusBar', true)) {
    statusBarItem.hide();
    return;
  }

  const branch = gitWatcher.getBranch();
  if (!branch) {
    statusBarItem.hide();
    return;
  }

  const tabCount = stateManager.getTabCount(branch);
  const branchCount = stateManager.getBranchCount();

  statusBarItem.text = `$(layers) ${tabCount} tabs saved`;
  statusBarItem.tooltip = `Branch Workspaces: ${tabCount} tabs saved for "${branch}" | ${branchCount} branches tracked\nClick to save current state`;
  statusBarItem.show();
}

export function deactivate(): Thenable<void> | undefined {
  if (saveDebounceTimer) { clearTimeout(saveDebounceTimer); }

  if (gitWatcher && stateManager) {
    const branch = gitWatcher.getBranch();
    if (branch) {
      const state = captureState(branch);
      return stateManager.save(state);
    }
  }

  return undefined;
}
