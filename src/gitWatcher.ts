import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class GitWatcher implements vscode.Disposable {
  private watcher: fs.FSWatcher | null = null;
  private currentBranch: string | null = null;
  private readonly onBranchChangeEmitter = new vscode.EventEmitter<{ from: string | null; to: string }>();
  public readonly onBranchChange = this.onBranchChangeEmitter.event;

  private gitDir: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.gitDir = this.findGitDir();
    if (this.gitDir) {
      this.currentBranch = this.readBranch();
      this.startWatching();
    }
  }

  private findGitDir(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return null; }

    const root = workspaceFolders[0].uri.fsPath;
    const gitDir = path.join(root, '.git');

    try {
      const stat = fs.statSync(gitDir);
      if (stat.isDirectory()) { return gitDir; }
      // Handle worktree: .git is a file containing "gitdir: <path>"
      if (stat.isFile()) {
        const content = fs.readFileSync(gitDir, 'utf8').trim();
        const match = content.match(/^gitdir:\s*(.+)$/);
        if (match) {
          const resolved = path.isAbsolute(match[1]) ? match[1] : path.resolve(root, match[1]);
          return resolved;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private readBranch(): string | null {
    if (!this.gitDir) { return null; }

    try {
      const headPath = path.join(this.gitDir, 'HEAD');
      const content = fs.readFileSync(headPath, 'utf8').trim();

      // Symbolic ref: "ref: refs/heads/main"
      const match = content.match(/^ref: refs\/heads\/(.+)$/);
      if (match) { return match[1]; }

      // Detached HEAD: raw commit hash, use first 8 chars
      if (/^[0-9a-f]{40}$/.test(content)) {
        return `detached:${content.substring(0, 8)}`;
      }

      return null;
    } catch {
      return null;
    }
  }

  private startWatching(): void {
    if (!this.gitDir) { return; }

    const headPath = path.join(this.gitDir, 'HEAD');

    try {
      this.watcher = fs.watch(headPath, () => {
        // Debounce: git operations can trigger multiple rapid writes
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
        this.debounceTimer = setTimeout(() => this.checkBranch(), 150);
      });
    } catch {
      // Fallback: poll every 2 seconds if fs.watch fails
      const interval = setInterval(() => this.checkBranch(), 2000);
      this.watcher = { close: () => clearInterval(interval) } as any;
    }
  }

  private checkBranch(): void {
    const newBranch = this.readBranch();
    if (newBranch && newBranch !== this.currentBranch) {
      const from = this.currentBranch;
      this.currentBranch = newBranch;
      this.onBranchChangeEmitter.fire({ from, to: newBranch });
    }
  }

  public getBranch(): string | null {
    return this.currentBranch;
  }

  public dispose(): void {
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
    if (this.watcher) { this.watcher.close(); }
    this.onBranchChangeEmitter.dispose();
  }
}
