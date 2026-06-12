import type {
  ClockDeps,
  CommandRunnerDeps,
  FileSystemDeps,
  HttpClientDeps,
  InstallDependencies,
  PlatformFacts,
  PromptDeps,
  RuntimeEnvironmentDeps,
  StdinDeps,
} from "../../src/install/deps.js";

export function createMemoryFileSystem(
  initialFiles: Readonly<Record<string, string>> = {},
): FileSystemDeps & { readonly files: Map<string, string> } {
  const files = new Map(Object.entries(initialFiles));

  return {
    files,
    readFile: async (path) => {
      const value = files.get(path);
      if (value === undefined) {
        throw new Error(`Missing file: ${path}`);
      }
      return value;
    },
    writeFile: async (path, contents) => {
      files.set(path, contents);
    },
    mkdir: async () => undefined,
    removeFile: async (path) => {
      files.delete(path);
    },
    exists: async (path) => files.has(path),
    stat: async (path) => {
      if (!files.has(path)) {
        throw new Error(`Missing file: ${path}`);
      }
      return {
        mode: 0o600,
        isFile: () => true,
        isDirectory: () => false,
      };
    },
  };
}

export function createFakeCommandRunner(
  result = { exitCode: 0, signal: null, stdout: "", stderr: "" },
): CommandRunnerDeps {
  return {
    run: async () => result,
  };
}

export function createFakeHttpClient(
  response = { status: 200, headers: {}, body: "{}" },
): HttpClientDeps {
  return {
    request: async () => response,
  };
}

export function createFakeInstallDependencies(
  overrides: Partial<InstallDependencies> = {},
): InstallDependencies {
  const platform: PlatformFacts = {
    platform: "linux",
    arch: "x64",
    pathDelimiter: ":",
    isWindows: false,
    homeDir: "/tmp/qwen-home",
    tmpDir: "/tmp",
    cwd: "/tmp/project",
  };
  const envValues: Record<string, string | undefined> = {};
  const env: RuntimeEnvironmentDeps = {
    get: (name) => envValues[name],
    toObject: () => ({ ...envValues }),
  };
  const clock: ClockDeps = {
    now: () => new Date("2026-06-12T00:00:00.000Z"),
    isoNow: () => "2026-06-12T00:00:00.000Z",
  };
  const stdin: StdinDeps = {
    isTTY: false,
    readAll: async () => "",
  };
  const prompts: PromptDeps = {
    secret: async () => "gp-test-secret",
    select: async (_message, choices) => choices[0],
  };

  return {
    fs: createMemoryFileSystem(),
    stdin,
    prompts,
    commands: createFakeCommandRunner(),
    http: createFakeHttpClient(),
    clock,
    env,
    platform,
    ...overrides,
  };
}
