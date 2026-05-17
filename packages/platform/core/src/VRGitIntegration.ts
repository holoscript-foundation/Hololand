/**
 * VRGitIntegration
 *
 * Phase 5: Self-Building World — Git operations from inside VR.
 *
 * Allows Brittney (or any VR agent) to:
 *   - Auto-commit after writing .hsplus files
 *   - Rollback to a previous commit  ("undo that last change")
 *   - View recent commit history
 *   - Tag important snapshots ("save this as checkpoint")
 *
 * Works by shelling out to `git` CLI. Operates in the project directory
 * that contains the .hsplus source files.
 *
 * Usage:
 *   const git = new VRGitIntegration({ repoDir: '/path/to/hololand-central' });
 *   await git.commitChange('zones/new_zone.hsplus', 'Brittney: Added Crystal Zone');
 *   await git.rollback(); // undoes last commit
 */

import { createLogger } from '@hololand/logger';

const logger = createLogger('VRGitIntegration');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitConfig {
  /** Path to the repository root */
  repoDir: string;

  /** Author name for commits */
  authorName: string;

  /** Author email for commits */
  authorEmail: string;

  /** Auto-commit after every file write */
  autoCommit: boolean;

  /** Prefix for auto-generated commit messages */
  commitPrefix: string;

  /** Maximum commits to return from history query */
  maxHistoryLength: number;

  /** Enable verbose logging */
  debug: boolean;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  filesChanged: string[];
}

export interface GitOperationResult {
  success: boolean;
  message: string;
  commitHash?: string;
  error?: string;
}

export interface RollbackResult extends GitOperationResult {
  revertedCommit?: CommitInfo;
}

export interface SnapshotResult extends GitOperationResult {
  tag?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: GitConfig = {
  repoDir: '.',
  authorName: 'Brittney AI',
  authorEmail: 'brittney@hololand.dev',
  autoCommit: true,
  commitPrefix: 'Brittney:',
  maxHistoryLength: 20,
  debug: false,
};

// ---------------------------------------------------------------------------
// VRGitIntegration
// ---------------------------------------------------------------------------

export class VRGitIntegration {
  private config: GitConfig;
  private execCommand: (
    cmd: string,
    cwd: string
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  private commitStack: string[] = []; // Stack of recent commit hashes for undo

  constructor(config: Partial<GitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.execCommand = this.createExecutor();

    logger.info('VRGitIntegration initialized', {
      repoDir: this.config.repoDir,
      autoCommit: this.config.autoCommit,
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Commit a file change with a descriptive message.
   * Used after Brittney writes a new .hsplus file.
   */
  async commitChange(filePath: string, description?: string): Promise<GitOperationResult> {
    const message = description
      ? `${this.config.commitPrefix} ${description}`
      : `${this.config.commitPrefix} Modified ${this.basename(filePath)}`;

    try {
      // Stage the file
      await this.exec(`git add "${filePath}"`);

      // Check if there are staged changes
      const status = await this.exec('git diff --cached --name-only');
      if (!status.stdout.trim()) {
        return {
          success: true,
          message: 'No changes to commit',
        };
      }

      // Commit
      const result = await this.exec(
        `git commit -m "${this.escapeShellArg(message)}" --author="${this.config.authorName} <${this.config.authorEmail}>"`
      );

      // Extract commit hash
      const hashMatch = result.stdout.match(/\[[\w/]+ ([a-f0-9]+)\]/);
      const commitHash = hashMatch?.[1] ?? '';

      if (commitHash) {
        this.commitStack.push(commitHash);
      }

      logger.info('Committed change', { file: filePath, hash: commitHash, message });

      return {
        success: true,
        message: `Committed: ${message}`,
        commitHash,
      };
    } catch (error) {
      logger.error('Commit failed', { file: filePath, error });
      return {
        success: false,
        message: 'Commit failed',
        error: String(error),
      };
    }
  }

  /**
   * Commit multiple files at once (e.g., zone + NPC file together).
   */
  async commitMultiple(filePaths: string[], description: string): Promise<GitOperationResult> {
    const message = `${this.config.commitPrefix} ${description}`;

    try {
      // Stage all files
      for (const fp of filePaths) {
        await this.exec(`git add "${fp}"`);
      }

      // Check if there are staged changes
      const status = await this.exec('git diff --cached --name-only');
      if (!status.stdout.trim()) {
        return { success: true, message: 'No changes to commit' };
      }

      const result = await this.exec(
        `git commit -m "${this.escapeShellArg(message)}" --author="${this.config.authorName} <${this.config.authorEmail}>"`
      );

      const hashMatch = result.stdout.match(/\[[\w/]+ ([a-f0-9]+)\]/);
      const commitHash = hashMatch?.[1] ?? '';
      if (commitHash) this.commitStack.push(commitHash);

      logger.info('Committed multiple files', {
        files: filePaths.length,
        hash: commitHash,
        message,
      });

      return { success: true, message: `Committed: ${message}`, commitHash };
    } catch (error) {
      logger.error('Multi-commit failed', { error });
      return { success: false, message: 'Commit failed', error: String(error) };
    }
  }

  /**
   * Rollback the last Brittney commit (git revert).
   * Returns info about the reverted commit.
   */
  async rollback(): Promise<RollbackResult> {
    try {
      // Get the last commit hash
      const lastHash = this.commitStack.pop();
      const target = lastHash ?? 'HEAD';

      // Get commit info before reverting
      const commitInfo = await this.getCommitInfo(target);

      // Git revert without opening editor
      await this.exec(`git revert --no-edit ${target}`);

      logger.info('Rolled back commit', { hash: target, message: commitInfo?.message });

      return {
        success: true,
        message: `Reverted: ${commitInfo?.message ?? target}`,
        revertedCommit: commitInfo ?? undefined,
      };
    } catch (error) {
      logger.error('Rollback failed', { error });
      return {
        success: false,
        message: 'Rollback failed',
        error: String(error),
      };
    }
  }

  /**
   * Rollback to a specific commit hash (git revert all commits after it).
   */
  async rollbackTo(targetHash: string): Promise<RollbackResult> {
    try {
      const commitInfo = await this.getCommitInfo(targetHash);

      // Revert all commits between HEAD and targetHash
      await this.exec(`git revert --no-edit ${targetHash}..HEAD`);

      // Clear the commit stack (we've gone back in history)
      this.commitStack.length = 0;

      logger.info('Rolled back to', { hash: targetHash, message: commitInfo?.message });

      return {
        success: true,
        message: `Reverted to: ${commitInfo?.message ?? targetHash}`,
        revertedCommit: commitInfo ?? undefined,
      };
    } catch (error) {
      logger.error('Rollback-to failed', { error });
      return {
        success: false,
        message: 'Rollback failed',
        error: String(error),
      };
    }
  }

  /**
   * Create a named snapshot/tag (e.g., "save this as checkpoint").
   */
  async createSnapshot(name: string, description?: string): Promise<SnapshotResult> {
    const tagName = `snapshot/${name.replace(/\s+/g, '-').toLowerCase()}`;
    const tagMsg = description ?? `Snapshot: ${name}`;

    try {
      await this.exec(`git tag -a "${tagName}" -m "${this.escapeShellArg(tagMsg)}"`);

      logger.info('Created snapshot', { tag: tagName });

      return {
        success: true,
        message: `Snapshot created: ${tagName}`,
        tag: tagName,
      };
    } catch (error) {
      logger.error('Snapshot failed', { error });
      return {
        success: false,
        message: 'Snapshot failed',
        error: String(error),
      };
    }
  }

  /**
   * Get recent commit history.
   */
  async getHistory(count?: number): Promise<CommitInfo[]> {
    const limit = count ?? this.config.maxHistoryLength;

    try {
      const result = await this.exec(
        `git log -${limit} --pretty=format:"%H|%h|%s|%an|%ai" --name-only`
      );

      return this.parseGitLog(result.stdout);
    } catch (error) {
      logger.error('History query failed', { error });
      return [];
    }
  }

  /**
   * Get current git status (modified, staged, untracked files).
   */
  async getStatus(): Promise<{ modified: string[]; staged: string[]; untracked: string[] }> {
    try {
      const result = await this.exec('git status --porcelain');

      const modified: string[] = [];
      const staged: string[] = [];
      const untracked: string[] = [];

      for (const line of result.stdout.split('\n').filter(Boolean)) {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status.startsWith('?')) {
          untracked.push(file);
        } else if (status[0] !== ' ') {
          staged.push(file);
        }
        if (status[1] === 'M') {
          modified.push(file);
        }
      }

      return { modified, staged, untracked };
    } catch (error) {
      logger.error('Status query failed', { error });
      return { modified: [], staged: [], untracked: [] };
    }
  }

  /**
   * Check if the repo is clean (no uncommitted changes).
   */
  async isClean(): Promise<boolean> {
    const status = await this.getStatus();
    return (
      status.modified.length === 0 && status.staged.length === 0 && status.untracked.length === 0
    );
  }

  /**
   * Get the current branch name.
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this.exec('git branch --show-current');
      return result.stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  // -------------------------------------------------------------------------
  // File Write + Auto-Commit
  // -------------------------------------------------------------------------

  /**
   * Write a file and optionally auto-commit.
   * This is the primary API for Brittney voice commands:
   *   Voice → generate .hsplus → writeAndCommit → hot-reload picks it up.
   */
  async writeAndCommit(
    filePath: string,
    content: string,
    description: string
  ): Promise<GitOperationResult> {
    try {
      // Write file to disk
      await this.writeFile(filePath, content);

      if (this.config.autoCommit) {
        return this.commitChange(filePath, description);
      }

      return {
        success: true,
        message: `File written: ${filePath} (auto-commit disabled)`,
      };
    } catch (error) {
      logger.error('Write and commit failed', { file: filePath, error });
      return {
        success: false,
        message: 'Write failed',
        error: String(error),
      };
    }
  }

  /**
   * Write multiple files and commit them together.
   */
  async writeMultipleAndCommit(
    files: Array<{ path: string; content: string }>,
    description: string
  ): Promise<GitOperationResult> {
    try {
      for (const file of files) {
        await this.writeFile(file.path, file.content);
      }

      if (this.config.autoCommit) {
        return this.commitMultiple(
          files.map((f) => f.path),
          description
        );
      }

      return {
        success: true,
        message: `${files.length} files written (auto-commit disabled)`,
      };
    } catch (error) {
      logger.error('Write-multiple failed', { error });
      return {
        success: false,
        message: 'Write failed',
        error: String(error),
      };
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async writeFile(filePath: string, content: string): Promise<void> {
    if (typeof (globalThis as any).process !== 'undefined') {
      const fs = await import('fs/promises');
      const path = await import('path');
      const fullPath = path.resolve(this.config.repoDir, filePath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    } else {
      throw new Error('File writing is only supported in Node.js environments');
    }
  }

  private async exec(command: string): Promise<{ stdout: string; stderr: string }> {
    const result = await this.execCommand(command, this.config.repoDir);

    if (result.exitCode !== 0 && this.config.debug) {
      logger.debug('Command failed', { command, stderr: result.stderr, exitCode: result.exitCode });
    }

    if (result.exitCode !== 0) {
      throw new Error(`Git command failed (exit ${result.exitCode}): ${result.stderr}`);
    }

    return result;
  }

  private createExecutor(): (
    cmd: string,
    cwd: string
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Returns an executor function that uses child_process.exec
    return async (cmd: string, cwd: string) => {
      if (typeof (globalThis as any).process === 'undefined') {
        throw new Error('Git operations require Node.js environment');
      }

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        const { stdout, stderr } = await execAsync(cmd, {
          cwd,
          env: {
            ...(globalThis as any).process.env,
            GIT_AUTHOR_NAME: this.config.authorName,
            GIT_AUTHOR_EMAIL: this.config.authorEmail,
            GIT_COMMITTER_NAME: this.config.authorName,
            GIT_COMMITTER_EMAIL: this.config.authorEmail,
          },
        });

        return { stdout, stderr, exitCode: 0 };
      } catch (error: any) {
        return {
          stdout: error.stdout ?? '',
          stderr: error.stderr ?? error.message,
          exitCode: error.code ?? 1,
        };
      }
    };
  }

  private async getCommitInfo(ref: string): Promise<CommitInfo | null> {
    try {
      const result = await this.exec(
        `git log -1 --pretty=format:"%H|%h|%s|%an|%ai" --name-only ${ref}`
      );

      const commits = this.parseGitLog(result.stdout);
      return commits[0] ?? null;
    } catch {
      return null;
    }
  }

  private parseGitLog(output: string): CommitInfo[] {
    const commits: CommitInfo[] = [];
    const blocks = output.split('\n\n').filter(Boolean);

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      if (lines.length === 0) continue;

      const parts = lines[0].split('|');
      if (parts.length < 5) continue;

      commits.push({
        hash: parts[0],
        shortHash: parts[1],
        message: parts[2],
        author: parts[3],
        date: parts[4],
        filesChanged: lines.slice(1),
      });
    }

    return commits;
  }

  private basename(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] ?? filePath;
  }

  private escapeShellArg(arg: string): string {
    return arg.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  dispose(): void {
    this.commitStack.length = 0;
    logger.info('VRGitIntegration disposed');
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createVRGitIntegration(config?: Partial<GitConfig>): VRGitIntegration {
  return new VRGitIntegration(config);
}
