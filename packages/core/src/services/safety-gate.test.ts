import { describe, expect, it, vi } from 'vitest';
import { PROTECTED_PATH_PATTERNS, expandProtectedPath } from '@luman/domain';
import type { ExecutionMode } from '@luman/domain';
import { InMemoryFileSystem } from '../fs/in-memory-file-system';
import { PathGuard } from '../fs/path-guard';
import { directory, file, standardFixture } from '../fs/fs-tree';
import type { FileSystem } from '../fs/file-system';
import { DefaultSafetyGate, DenyAllSafetyGate, type SafetyRequest } from './safety-gate';

/** Synthetic home — never derived from os.homedir() (AGENTS.md §6.8). */
const HOME = '/Users/testuser';
const SAFE_PATH = '/Users/testuser/projects/luman/README.md';

/**
 * A `FileSystem` that fails the test if anything beyond `stat` /
 * `readDirectory` is called.
 *
 * The port has no mutation method, so this cannot catch a delete — it catches
 * the gate reaching for *any* capability beyond reading metadata while
 * planning. Dry-run must touch nothing.
 */
function spyFileSystem(inner: FileSystem): FileSystem & { statCalls: number } {
  const spy = {
    statCalls: 0,
    async stat(path: string) {
      spy.statCalls += 1;
      return inner.stat(path);
    },
    async readDirectory(path: string) {
      return inner.readDirectory(path);
    },
    async exists(): Promise<boolean> {
      throw new Error('exists() must not be called while planning');
    },
    async realPath(path: string) {
      return inner.realPath(path);
    },
  };
  return spy as FileSystem & { statCalls: number };
}

function gate(options: { fs?: FileSystem; roots?: readonly string[] } = {}) {
  const inner = options.fs ?? new InMemoryFileSystem({ tree: standardFixture() });
  const guard = new PathGuard(inner, {
    allowedRoots: options.roots ?? ['/Users/testuser', '/tmp'],
    homeDir: HOME,
  });
  return new DefaultSafetyGate({ guard, fs: inner });
}

/** A fully-armed execute request — every precondition satisfied. */
const armed = (overrides: Partial<SafetyRequest> = {}): SafetyRequest => ({
  paths: [SAFE_PATH],
  mode: 'execute',
  confirmedByUser: true,
  executionEnabled: true,
  ...overrides,
});

describe('mode defaulting', () => {
  it('treats an omitted mode as dry-run', async () => {
    const result = await gate().plan({ paths: [SAFE_PATH] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.mode).toBe('dry-run');
  });

  it('refuses an unrecognised mode', async () => {
    // Unreachable via TypeScript, but reachable over IPC or from settings.
    const result = await gate().plan({
      paths: [SAFE_PATH],
      mode: 'obliterate' as ExecutionMode,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNSAFE_OPERATION_BLOCKED');
  });

  it('accepts preview and reports a plan', async () => {
    const result = await gate().plan({ paths: [SAFE_PATH], mode: 'preview' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.mode).toBe('preview');
  });
});

describe('dry-run and preview touch nothing', () => {
  it.each(['dry-run', 'preview'] as const)('%s calls only stat', async (mode) => {
    const inner = new InMemoryFileSystem({ tree: standardFixture() });
    const spy = spyFileSystem(inner);
    const guard = new PathGuard(spy, { allowedRoots: ['/Users/testuser'], homeDir: HOME });

    const result = await new DefaultSafetyGate({ guard, fs: spy }).plan({
      paths: [SAFE_PATH],
      mode,
    });

    expect(result.ok).toBe(true);
    expect(spy.statCalls).toBeGreaterThan(0);
  });

  it('reports sizes and a total without modifying anything', async () => {
    const result = await gate().plan({ paths: [SAFE_PATH], mode: 'dry-run' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalBytes).toBe(512);
      expect(result.value.entries[0]?.allowed).toBe(true);
    }
  });

  it('describes a dry run as having changed nothing', async () => {
    const result = await gate().plan({ paths: [SAFE_PATH] });
    if (result.ok) expect(result.value.explanation).toContain('changed nothing');
  });
});

describe('execute preconditions — each absence is refused', () => {
  it('refuses when confirmation is missing', async () => {
    const result = await gate().plan(armed({ confirmedByUser: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNSAFE_OPERATION_BLOCKED');
      expect(result.error.context?.reason).toBe('not-confirmed');
    }
  });

  it('refuses when the plan is empty', async () => {
    const result = await gate().plan(armed({ paths: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('empty-plan');
  });

  it('refuses when the execution flag is off', async () => {
    const result = await gate().plan(armed({ executionEnabled: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('execution-flag-off');
  });

  it('refuses when a path fails the guard', async () => {
    const result = await gate().plan(armed({ paths: ['/Users/testuser/Documents/taxes.pdf'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PATH_NOT_ALLOWED');
  });

  it('refuses even when every precondition is satisfied', async () => {
    // The branch exists so its preconditions are testable. Performing the
    // operation is Sprint 07's; nothing here may execute.
    const result = await gate().plan(armed());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNSAFE_OPERATION_BLOCKED');
      expect(result.error.context?.reason).toBe('execution-not-implemented');
    }
  });
});

describe('protected paths fail closed', () => {
  // One case per entry in docs/05_BUSINESS_RULES.md §Protected paths.
  for (const { pattern } of PROTECTED_PATH_PATTERNS) {
    it(`refuses a plan containing ${pattern}`, async () => {
      const result = await gate({ roots: ['/'] }).plan({
        paths: [expandProtectedPath(pattern, HOME)],
      });
      expect(result.ok, `${pattern} should be refused`).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('PATH_NOT_ALLOWED');
    });
  }

  it('fails the whole plan when one path of many is protected', async () => {
    // No partial execution. A mixed list is exactly how a cleanup tool deletes
    // something it should not.
    const result = await gate({ roots: ['/'] }).plan({
      paths: [SAFE_PATH, '/Users/testuser/Documents/taxes.pdf', '/tmp/scratch.tmp'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PATH_NOT_ALLOWED');
  });

  it('refuses a symlink that resolves into a protected location', async () => {
    const result = await gate({ roots: ['/'] }).plan({
      paths: ['/Users/testuser/projects/link-to-docs'],
    });
    expect(result.ok).toBe(false);
  });
});

describe('audit logging', () => {
  it('logs a refusal without recording any path', async () => {
    const info = vi.fn();
    const logger = { info, debug: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
    const inner = new InMemoryFileSystem({ tree: standardFixture() });
    const guard = new PathGuard(inner, { allowedRoots: ['/'], homeDir: HOME });

    await new DefaultSafetyGate({ guard, fs: inner, logger: logger as never }).plan({
      paths: ['/Users/testuser/Documents/taxes.pdf'],
    });

    expect(info).toHaveBeenCalledOnce();
    const fields = info.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(fields.outcome).toBe('refused');
    expect(fields.pathCount).toBe(1);
    expect(JSON.stringify(fields)).not.toContain('taxes.pdf');
    expect(JSON.stringify(fields)).not.toContain('testuser');
  });

  it('logs a successful plan too', async () => {
    const info = vi.fn();
    const logger = { info, debug: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
    const inner = new InMemoryFileSystem({ tree: standardFixture() });
    const guard = new PathGuard(inner, { allowedRoots: ['/Users/testuser'], homeDir: HOME });

    await new DefaultSafetyGate({ guard, fs: inner, logger: logger as never }).plan({
      paths: [SAFE_PATH],
    });

    expect((info.mock.calls[0]?.[1] as Record<string, unknown>).outcome).toBe('planned');
  });
});

describe('the gate never throws', () => {
  it('returns a refusal for a nonsense path rather than throwing', async () => {
    await expect(gate().plan({ paths: ['not-absolute'] })).resolves.toHaveProperty('ok', false);
  });

  it('returns a refusal for a missing path', async () => {
    await expect(gate().plan({ paths: ['/Users/testuser/gone'] })).resolves.toHaveProperty(
      'ok',
      false,
    );
  });

  it('handles an empty dry-run plan as an allowed no-op', async () => {
    const result = await gate().plan({ paths: [] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.entries).toEqual([]);
      expect(result.value.totalBytes).toBe(0);
    }
  });
});

describe('DenyAllSafetyGate', () => {
  it('refuses everything, including a fully-armed execute request', async () => {
    const result = await new DenyAllSafetyGate().plan();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNSAFE_OPERATION_BLOCKED');
  });
});

describe('size accounting', () => {
  it('sums sizes across a multi-path plan', async () => {
    const fs = new InMemoryFileSystem({
      tree: { tmp: directory({ 'a.bin': file(100), 'b.bin': file(250) }) },
    });
    const guard = new PathGuard(fs, { allowedRoots: ['/tmp'], homeDir: HOME });

    const result = await new DefaultSafetyGate({ guard, fs }).plan({
      paths: ['/tmp/a.bin', '/tmp/b.bin'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.totalBytes).toBe(350);
  });
});
