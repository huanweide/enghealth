**中文** · [README.md](./README.md)

<p align="center">
  <a href="https://github.com/huanweide/family-showcase"><img src="https://img.shields.io/badge/Engineering%20Health%20Family-18%20axes-22c55e" alt="Engineering Health Family"></a>
  <a href="https://github.com/huanweide/enghealth/stargazers"><img src="https://img.shields.io/github/stars/huanweide/enghealth" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/huanweide/enghealth" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D16-brightgreen" alt="Node"></a>
</p>

# enghealth

> The Engineering Health Family's "meta-dashboard / unified checkup entry point" — a zero-dependency single-file CLI.

> [!WARNING]
> **This axis has been merged into the [doctors](https://github.com/huanweide/doctors) monorepo and is no longer maintained.**
> The code now lives at [`doctors/packages/enghealth/`](https://github.com/huanweide/doctors/tree/main/packages/enghealth) and runs as the `doctors eng` subcommand (or `node packages/enghealth/index.js`). This repository no longer accepts changes — please use <https://github.com/huanweide/doctors>.

**Part of the [Engineering Health Family](https://github.com/huanweide/family-showcase)** (18 zero-dependency checkup axes). This repo is the **orchestration layer**: one command → family-wide scorecard. See also [doctors](https://github.com/huanweide/doctors) (monorepo hub) and [family-showcase](https://github.com/huanweide/family-showcase) (18-axis panorama).

The Engineering Health Family already has its **14-piece set** (nine source-layer axes + the git four-piece + the config-layer `pkgdoctor`), but each acts alone as a zero-dependency solo operator. **enghealth aggregates the whole family into one command, one scorecard, one total score.**

```
enghealth  =  self overview (zero-dep scan)  +  Σ(14 sibling CLIs' health scores)  →  unified scorecard + total + CI gate
```

## Why it exists

Single-point checkup tools are everywhere, but no zero-dependency single-file tool **orchestrates a whole family of sibling checkup tools into one report**. enghealth's value is not in repeating any single dimension, but in "unified orchestration + unified gate + unified reproducibility": run once and you know how healthy your project is across every dimension the family covers.

## Who should use this

- You already use several family checkup tools and want one command that aggregates their scores into a single report and a single CI gate.
- You want a project-hygiene overview even with zero sibling tools installed.

## Who should NOT use this

- You are looking for the actively maintained version — use [`doctors eng`](https://github.com/huanweide/doctors) instead.
- You expect enghealth to re-implement each individual dimension — it orchestrates; it does not replace the sibling tools.

## Features

- **Zero-dependency**: single-file `index.js`, only Node built-in modules, runs out of the box, no `npm install`.
- **Self overview checkup**: zero-dependency scan of `LICENSE / README / lockfile / .gitignore / test presence / package.json validity / .env leak / is-it-a-git-repo`.
- **Optional enhancement (family orchestration)**: auto-discovers the 14 sibling CLIs on PATH or in `--tools-dir`, runs each with `--json`, and **tolerantly parses** their health scores into a matrix. A missing / failed sibling, or JSON without a health-score field, is all **downgraded to "skipped"** — never misjudged.
- **Unified health score + CI gate**: `--fail-on-low <n>` (fail if any sibling is below n) and `--min-overall <n>` (fail if the total is below n); the gate is expressed via the process exit code, fitting GitHub Actions / GitLab CI.

## Install

**Zero-dependency, zero-install** — clone and use directly; only Node.js >= 16 on the machine:

```bash
git clone https://github.com/huanweide/enghealth.git
cd enghealth
node index.js .              # check the current directory
node index.js --help
```

To use the `enghealth` command directly:

```bash
npm link                     # register as a global command
enghealth .
```

### On `npx enghealth` and `npm i -g` (important)

**This project is not published to npm yet**, so the following forms **do not work right now** — use `node index.js` / `npm link`:

```bash
# ❌ currently无效: there is no enghealth package on npm
npx enghealth .

# ❌ dangerous: of these 14 names, 11 do not exist on npm,
# and the other 3 (testlite / secscan / docdoctor) are completely unrelated packages on npm
#   —— testlite  is a testing library (bdsomer/testlite)
#   —— secscan  is Mozilla's JS static-analysis tool (mozilla/scanjs)
#   —— docdoctor is a tool that fixes rST docs
# Copying this command would install and run a bunch of third-party code unrelated to your project.
npm i -g devdoctor testlite debtlens a11ydoctor awaitscan cycscan secscan \
         dupscan typedoctor repodoctor docdoctor commitdoctor reldoctor pkgdoctor
```

For sibling checkups, point `--tools-dir` explicitly at **your own cloned** tools directory (see below), not at the same-named npm packages.

## Usage

```bash
# Check the current directory (defaults to . if no target given)
enghealth .

# Show only the total score and gate conclusion
enghealth . --quiet

# Join family sibling checkups (--tools-dir can be given multiple times)
enghealth . --tools-dir /path/to/tools-dir

# CI gate: total >= 60, any sibling >= 70
enghealth . --min-overall 60 --fail-on-low 70

# Output pure JSON only (gate expressed via exit code)
enghealth . --json
```

## Example output (with family linkage)

```
========================================
 Engineering Health Family · Unified Report (enghealth)
========================================
Target directory : /path/to/project
Overview health : 100/100 (enghealth's own zero-dep scan)
Sibling tools joined : 14/14
----------------------------------------
Dimension           Category   Score      Status
Dependency check    source    92         good
Test hygiene        source    80         fair
Tech-debt density   source    100        good
Frontend a11y       source    100        good
Async perf          source    100        good
Structural complex  source    95         good
Security antipattern source   100        good
Duplicate code      source    100        good
Type discipline     source    100        good
Repo hygiene        git       100        good
Doc health          git       100        good
Commit convention   git       100        good
Release consistency  git       100        good
Config convention   config    100        good
----------------------------------------
Total : 100/100
Overview findings: none
----------------------------------------
CI gate: PASS
```

## Options

| Option | Description |
|---|---|
| `[target directory]` | Directory to check, defaults to `.` |
| `--tools-dir <dir>` | Point at the family sibling CLI source directory (repeatable); falls back to looking for `ol-<name>/index.js` |
| `--json` | Output pure JSON to stdout only; gate expressed via exit code |
| `--quiet` | Output only the total score and gate conclusion |
| `--fail-on-low <n>` | Gate fails if any sibling health score is below `n` (default 70) |
| `--min-overall <n>` | Gate fails if the total is below `n` (default 60) |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Exit codes

- `0`: checkup complete and gate passed (or display-only mode).
- `2`: gate failed (CI should block on this) or argument error.

## Missing-dimension semantics (fault-tolerant design)

- Sibling tool **not installed / no `--tools-dir` given**: marked `skipped(not installed)`; does not affect total or gate.
- Sibling tool **call failed (exit≠0) or JSON has no health-score field**: marked `skipped(failed|unparsable)`, downgraded, not misjudged — enghealth only orchestrates, it does not take the sibling's blame.
- Sibling tool **ran fine but the target project does not match its dimension** (e.g. `typedoctor` scanning a pure-JS single-file project with no TS types to check): marked `missing` (dimension not applicable), not counted in the total's denominator — avoiding "no such dimension" being miscomputed as "0-score bad project".

enghealth's own overview always runs independently: **even with zero sibling tools installed, it still gives you a project-hygiene overview report.**

## Relationship to the family

enghealth is the family's **orchestration layer**; it re-implements no single dimension:

| Category | Sibling tools | Dimension |
|---|---|---|
| Source | devdoctor / testlite / debtlens / a11ydoctor / awaitscan / cycscan / secscan / dupscan / typedoctor | deps / tests / tech-debt / frontend-a11y / async-perf / complexity / security / dup-code / type-discipline |
| Git | repodoctor / docdoctor / commitdoctor / reldoctor | repo-hygiene / doc-health / commit-convention / release-consistency |
| Config | pkgdoctor | package.json convention |
| Orchestration | **enghealth** | unified entry + total + CI gate |

## CI gate usage

Ready to drop into CI: run the tool in your pipeline; it outputs health scores and severities, and exits non-zero on any unmet item, blocking the problematic commit (see parameters above).

## License

MIT

---

Maintained by **huanweide** · [GitHub](https://github.com/huanweide)

← [Back to the code-health family overview](https://github.com/huanweide/family-showcase)
