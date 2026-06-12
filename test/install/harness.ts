import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { InstallDependencies } from "../../src/install/deps.js";
import { createFakeInstallDependencies } from "./test-deps.js";

export interface TempInstallHarness {
  readonly root: string;
  readonly home: string;
  readonly project: string;
  readonly qwenBin: string;
  readonly deps: InstallDependencies;
  cleanup(): void;
}

export function createTempInstallHarness(): TempInstallHarness {
  const root = mkdtempSync(join(tmpdir(), "qwen-code-setup-"));
  const home = join(root, "home");
  const project = join(root, "project");
  const bin = join(root, "bin");
  const qwenBin = join(bin, "qwen");

  mkdirSync(home, { recursive: true });
  mkdirSync(project, { recursive: true });
  mkdirSync(bin, { recursive: true });
  writeFileSync(qwenBin, "#!/usr/bin/env sh\nprintf '0.18.0\\n'\n", {
    mode: 0o700,
  });

  return {
    root,
    home,
    project,
    qwenBin,
    deps: createFakeInstallDependencies({
      platform: {
        platform: "linux",
        arch: "x64",
        pathDelimiter: ":",
        isWindows: false,
        homeDir: home,
        tmpDir: root,
        cwd: project,
      },
    }),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
