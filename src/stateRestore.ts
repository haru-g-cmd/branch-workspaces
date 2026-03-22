import * as vscode from 'vscode';
import * as fs from 'fs';
import { BranchState, EditorState } from './types';

export async function restoreState(state: BranchState): Promise<void> {
  const config = vscode.workspace.getConfiguration('branchWorkspaces');
  const closeTabs = config.get<boolean>('closeTabs', true);
  const saveCursors = config.get<boolean>('saveCursors', true);
  const saveScroll = config.get<boolean>('saveScroll', true);

  if (closeTabs) {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (state.groups.length === 0) { return; }

  for (const group of state.groups) {
    for (const editor of group.editors) {
      await openEditor(editor, group.viewColumn, saveCursors, saveScroll);
    }
  }

  // Activate the editor that was last active
  const activeGroup = state.groups[state.activeGroupIndex] ?? state.groups[0];
  if (activeGroup) {
    const activeEditor = activeGroup.editors.find(e => e.isActive) ?? activeGroup.editors[0];
    if (activeEditor) {
      await openEditor(activeEditor, activeGroup.viewColumn, saveCursors, saveScroll, true);
    }
  }
}

async function openEditor(
  editor: EditorState,
  viewColumn: number,
  restoreCursor: boolean,
  restoreScroll: boolean,
  focus: boolean = false
): Promise<void> {
  if (!fs.existsSync(editor.filePath)) { return; }

  const uri = vscode.Uri.file(editor.filePath);

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const textEditor = await vscode.window.showTextDocument(doc, {
      viewColumn,
      preview: false,
      preserveFocus: !focus
    });

    // Pin must happen on the focused editor, so temporarily focus it
    if (editor.isPinned) {
      const pinnedEditor = await vscode.window.showTextDocument(doc, {
        viewColumn,
        preview: false,
        preserveFocus: false
      });
      await vscode.commands.executeCommand('workbench.action.pinEditor');
      // Restore preserveFocus state if this tab shouldn't have focus
      if (!focus) {
        // No need to explicitly unfocus; the next tab open will shift focus
      }
    }

    // Restore cursor position
    if (restoreCursor && editor.selections.length > 0) {
      const selections = editor.selections.map(s =>
        new vscode.Selection(
          new vscode.Position(s.anchorLine, s.anchorCharacter),
          new vscode.Position(s.activeLine, s.activeCharacter)
        )
      );
      textEditor.selections = selections;
    } else if (restoreCursor) {
      const pos = new vscode.Position(editor.cursorLine, editor.cursorCharacter);
      textEditor.selection = new vscode.Selection(pos, pos);
    }

    // Restore scroll position
    if (restoreScroll && editor.scrollTop > 0) {
      const range = new vscode.Range(
        new vscode.Position(editor.scrollTop, 0),
        new vscode.Position(editor.scrollTop, 0)
      );
      textEditor.revealRange(range, vscode.TextEditorRevealType.AtTop);
    }
  } catch {
    // File might be binary, locked, or inaccessible
  }
}
