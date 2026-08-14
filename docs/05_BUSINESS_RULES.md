# Business Rules

Safe:

- Cache cleanup
- Logs
- Temporary files

Unsafe:

- Downloads
- User documents
- Photos

Confirmation required:

- Application uninstall
- File deletion

## Protected paths

The canonical list. `PathGuard` (INF-004) rejects every entry here, and the
`PathClassification` data in `@luman/domain` (INF-002) is generated from it.
Nothing in this list is ever traversed for cleanup or classified `safe`, and no
scan enumerates its contents.

| Pattern      | What it covers                                    |
| ------------ | ------------------------------------------------- |
| `~`          | The home directory itself, as a target            |
| `~/Desktop`  | Desktop                                           |
| `~/Documents`| Documents                                         |
| `~/Downloads`| Downloads                                         |
| `~/Pictures` | Pictures, including the Photos library            |
| `~/Movies`   | Movies                                            |
| `~/Music`    | Music                                             |
| `~/Library`  | User library — preferences, containers, app state |
| `/System`    | System volume                                     |
| `/Library`   | System-wide library                               |
| `/private`   | `/etc`, `/var`, `/tmp` via the real path          |

Rules for using this list:

- **Store these as relative patterns, never absolute paths.** An absolute path
  would embed the developer's username in the source.
- **Resolve before matching.** `~/Documents/../Downloads` is Downloads, not
  Documents. Normalize and resolve `..` and symlinks first, then compare against
  the resolved real path.
- **A subpath of a protected path is protected.** Matching is prefix-based on
  resolved path segments, not string equality.
- **Protected beats safe.** A cache directory *inside* `~/Library` is still
  protected. When two rules disagree, the more cautious answer wins.

Being protected is a property of a **location**. It is distinct from
`SafetyLevel`, which classifies a **finding**. A finding may be `safe` while the
path it points at is protected — in which case the path wins and the finding is
not actionable.
