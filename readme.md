# Branch Workspaces

Remembers your open tabs, editor splits, cursor positions, and scroll positions per Git branch. Switch branches and pick up exactly where you left off.

## How it works

1. You're on `main` with 5 files open across two splits.
2. You switch to `feature/login`.
3. Branch Workspaces saves everything for `main`, then restores whatever you had open on `feature/login`.
4. Switch back to `main` and your 5 files are back, scrolled to the same spot, cursor in the same place.

No config needed. Works out of the box.

## What gets saved

- Open editor tabs (file paths)
- Editor group layout (splits)
- Cursor positions and selections
- Scroll positions
- Pinned tab state
- Active editor focus

State saves automatically as you work and on every branch switch. Files that no longer exist on the new branch are skipped.

## Commands

Open the command palette (`Ctrl+Shift+P`) and type "Branch Workspaces":

- **Save Current State** - manually save the current tab/editor state
- **Restore State for Current Branch** - manually restore saved state
- **Clear State for Current Branch** - delete saved state for this branch
- **Clear All Saved States** - delete saved state for all branches

## Settings

All under `branchWorkspaces.*` in VS Code settings:

- **enabled** (true) - turn auto save/restore on or off
- **saveTabs** (true) - save open editor tabs
- **saveLayout** (true) - save editor group layout (splits)
- **saveCursors** (true) - save cursor positions
- **saveScroll** (true) - save scroll positions
- **closeTabs** (true) - close current tabs before restoring
- **showStatusBar** (true) - show tab count in the status bar
- **debounceMs** (500) - delay in ms before saving after editor changes

## Status bar

Shows how many tabs are saved for the current branch and how many branches are tracked. Click it to manually save.

## Storage

State is stored in VS Code's workspace storage. Per-project, local to your machine. Nothing is written to your repo or synced anywhere.

## Requirements

- VS Code 1.110.0+
- A Git repository in your workspace

## License

MIT
