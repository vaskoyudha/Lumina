import { existsSync } from "node:fs";
import { lstat, readdir, realpath, symlink } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standaloneModules = path.join(
  root,
  ".next",
  "standalone",
  ".next",
  "node_modules",
);
const rootModules = path.join(root, "node_modules");

if (existsSync(standaloneModules)) {
  for (const entry of await readdir(standaloneModules)) {
    const source = path.join(standaloneModules, entry);
    const info = await lstat(source).catch(() => null);
    if (!info?.isSymbolicLink()) continue;

    const target = path.join(rootModules, entry);
    if (existsSync(target)) continue;

    const resolved = await realpath(source).catch(() => null);
    if (!resolved) continue;

    await symlink(path.relative(rootModules, resolved), target).catch(
      (error) => {
        console.warn(`could not link ${entry}: ${error.message}`);
      },
    );
  }
}
