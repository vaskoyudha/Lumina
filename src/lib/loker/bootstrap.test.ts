/** @jest-environment node */
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { bootstrapScanRoot, scanDataDir } from "@/lib/loker/bootstrap";

describe("bootstrapScanRoot", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "lumina-scan-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("seeds portals and the engine skeletons on first run", async () => {
    await bootstrapScanRoot(root);
    const portals = await readFile(path.join(root, "portals.yml"), "utf8");
    expect(portals).toContain("job_boards");
    const pipeline = await readFile(
      path.join(root, "data", "pipeline.md"),
      "utf8",
    );
    expect(pipeline).toContain("## Pending");
    expect(pipeline).toContain("## Processed");
    const history = await readFile(
      path.join(root, "data", "scan-history.tsv"),
      "utf8",
    );
    expect(history.startsWith("url\tfirst_seen")).toBe(true);
    await expect(stat(path.join(root, "reports"))).resolves.toBeDefined();
    await expect(stat(path.join(root, "jds"))).resolves.toBeDefined();
    await expect(
      stat(path.join(root, "batch", "tracker-additions")),
    ).resolves.toBeDefined();
  });

  it("never overwrites a file the owner already edited", async () => {
    await bootstrapScanRoot(root);
    const portalsPath = path.join(root, "portals.yml");
    await writeFile(portalsPath, "mine: true\n", "utf8");
    await bootstrapScanRoot(root);
    expect(await readFile(portalsPath, "utf8")).toBe("mine: true\n");
  });

  it("honours LOKER_SCAN_DATA_DIR when no root is passed", async () => {
    const previous = process.env.LOKER_SCAN_DATA_DIR;
    process.env.LOKER_SCAN_DATA_DIR = root;
    try {
      const { scanDataDir } = await import("@/lib/loker/bootstrap");
      expect(scanDataDir()).toBe(root);
    } finally {
      if (previous === undefined) delete process.env.LOKER_SCAN_DATA_DIR;
      else process.env.LOKER_SCAN_DATA_DIR = previous;
    }
  });

  it("resolves a relative LOKER_SCAN_DATA_DIR against the working directory", () => {
    const previous = process.env.LOKER_SCAN_DATA_DIR;
    process.env.LOKER_SCAN_DATA_DIR = "relative-dir";
    try {
      expect(scanDataDir()).toBe(path.resolve(process.cwd(), "relative-dir"));
    } finally {
      if (previous === undefined) delete process.env.LOKER_SCAN_DATA_DIR;
      else process.env.LOKER_SCAN_DATA_DIR = previous;
    }
  });

  it("never overwrites a skeleton file the owner already edited", async () => {
    await bootstrapScanRoot(root);
    const pipelinePath = path.join(root, "data", "pipeline.md");
    await writeFile(pipelinePath, "mine", "utf8");
    await bootstrapScanRoot(root);
    expect(await readFile(pipelinePath, "utf8")).toBe("mine");
  });
});
