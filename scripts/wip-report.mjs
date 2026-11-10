#!/usr/bin/env node
/**
 * Report uncommitted work across every git worktree.
 *
 * The repo is edited by several sessions at once, so an uncommitted edit belongs
 * to the working directory, not to the branch. A branch switch in the shared
 * checkout silently carries that edit somewhere else. Run this before switching.
 *
 * Usage:
 *   node scripts/wip-report.mjs            # report, always exit 0
 *   node scripts/wip-report.mjs --strict   # exit 1 when anything needs attention
 */

import { execFileSync } from "node:child_process";

const strict = process.argv.includes("--strict");

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function maybeGit(args, cwd) {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

function parseWorktrees(porcelain) {
  const worktrees = [];
  let current = null;

  for (const line of porcelain.split("\n")) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice("worktree ".length), branch: null };
      worktrees.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("branch refs/heads/")) {
      current.branch = line.slice("branch refs/heads/".length);
    }
  }

  return worktrees;
}

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const worktrees = parseWorktrees(git(["worktree", "list", "--porcelain"], root));

const rows = [];
let needsAttention = 0;

for (const worktree of worktrees) {
  const where = worktree.path;
  const label = worktree.branch ?? "(detached)";

  const status = maybeGit(["status", "--porcelain"], where) ?? "";
  const lines = status.split("\n").filter(Boolean);
  const untracked = lines.filter((line) => line.startsWith("??")).length;
  const tracked = lines.length - untracked;

  const counts = maybeGit(["rev-list", "--left-right", "--count", "origin/main...HEAD"], where);
  let behind = null;
  let ahead = null;
  if (counts) {
    const [left, right] = counts.split("\t").map(Number);
    behind = left;
    ahead = right;
  }

  const upstream = maybeGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    where,
  );
  const unpushed = upstream
    ? Number(maybeGit(["rev-list", "--count", "@{upstream}..HEAD"], where) ?? 0)
    : ahead ?? 0;

  const atRisk = tracked > 0 || unpushed > 0;
  if (atRisk) needsAttention += 1;

  rows.push({
    label,
    where,
    tracked,
    untracked,
    ahead,
    behind,
    upstream,
    unpushed,
    atRisk,
  });
}

for (const row of rows) {
  const dirty = [
    row.tracked > 0 ? `${row.tracked} modified` : null,
    row.untracked > 0 ? `${row.untracked} untracked` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const position =
    row.ahead === null
      ? "no origin/main"
      : `${row.ahead} ahead / ${row.behind} behind origin/main`;

  const push = row.upstream
    ? row.unpushed > 0
      ? `${row.unpushed} unpushed`
      : "pushed"
    : row.ahead && row.ahead > 0
      ? "no upstream"
      : "no upstream";

  const verdict = row.atRisk ? "AT RISK" : "clean";

  console.log(`${verdict.padEnd(8)} ${row.label}`);
  console.log(`         ${row.where}`);
  console.log(`         ${position} | ${push} | ${dirty || "no local changes"}`);
}

console.log("");
if (needsAttention === 0) {
  console.log("All worktrees are clean and pushed.");
} else {
  console.log(`${needsAttention} worktree(s) hold work that a branch switch could hide.`);
  console.log("Commit by path and push the branch before switching.");
}

process.exit(strict && needsAttention > 0 ? 1 : 0);
