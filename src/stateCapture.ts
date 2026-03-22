import * as vscode from 'vscode';
import { BranchState, EditorGroupState, EditorState, SerializedSelection } from './types';

export function captureState(branch: string): BranchState {
  const config = vscode.workspace.getConfiguration('branchWorkspaces');
  const saveTabs = config.get<boolean>('saveTabs', true);
  const saveCursors = config.get<boolean>('saveCursors', true);
  const saveScroll = config.get<boolean>('saveScroll', true);
  const saveLayout = config.get<boolean>('saveLayout', true);

  const groups: EditorGroupState[] = [];
  let activeGroupIndex = 0;

  if (!saveTabs) {
    return { branch, timestamp: Date.now(), groups: [], activeGroupIndex: 0 };
  }

  const tabGroups = vscode.window.tabGroups;

  for (const group of tabGroups.all) {
    if (group === tabGroups.activeTabGroup) {
      activeGroupIndex = groups.length;
    }

    const editors: EditorState[] = [];

    for (const tab of group.tabs) {
      // Only save file-based tabs (skip settings, webviews, etc.)
      if (!(tab.input instanceof vscode.TabInputText)) { continue; }

      const filePath = tab.input.uri.fsPath;
      let cursorLine = 0;
      let cursorCharacter = 0;
      let scrollTop = 0;
      let selections: SerializedSelection[] = [];

      // Get cursor/scroll from the visible editor if it matches this tab
      if (saveCursors || saveScroll) {
        const visibleEditor = vscode.window.visibleTextEditors.find(
          e => e.document.uri.fsPath === filePath &&
               e.viewColumn === group.viewColumn
        );

        if (visibleEditor) {
          if (saveCursors) {
            cursorLine = visibleEditor.selection.active.line;
            cursorCharacter = visibleEditor.selection.active.character;
            selections = visibleEditor.selections.map(s => ({
              anchorLine: s.anchor.line,
              anchorCharacter: s.anchor.character,
              activeLine: s.active.line,
              activeCharacter: s.active.character
            }));
          }

          if (saveScroll) {
            scrollTop = visibleEditor.visibleRanges[0]?.start.line ?? 0;
          }
        }
      }

      editors.push({
        filePath,
        viewColumn: saveLayout ? (group.viewColumn ?? 1) : 1,
        isActive: tab.isActive,
        isPinned: tab.isPinned,
        cursorLine,
        cursorCharacter,
        scrollTop,
        selections
      });
    }

    if (editors.length > 0) {
      groups.push({
        viewColumn: saveLayout ? (group.viewColumn ?? 1) : 1,
        editors
      });
    }
  }

  return {
    branch,
    timestamp: Date.now(),
    groups,
    activeGroupIndex
  };
}
