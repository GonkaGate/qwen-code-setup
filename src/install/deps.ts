import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, chmod, mkdir, readFile, stat, unlink } from "node:fs/promises";
import { arch, homedir, platform, tmpdir } from "node:os";
import { delimiter } from "node:path";
import process from "node:process";
import type { Readable } from "node:stream";
import { password, select } from "@inquirer/prompts";
import writeFileAtomic from "write-file-atomic";

export interface FileSystemDeps {
  readFile(path: string): Promise<string>;
  writeFile(
    path: string,
    contents: string,
    options?: { mode?: number },
  ): Promise<void>;
  mkdir(
    path: string,
    options?: { recursive?: boolean; mode?: number },
  ): Promise<void>;
  chmod?(path: string, mode: number): Promise<void>;
  removeFile?(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{
    readonly mode?: number;
    isFile(): boolean;
    isDirectory(): boolean;
  }>;
}

export interface StdinDeps {
  readonly isTTY: boolean;
  readAll(): Promise<string>;
}

export interface PromptDeps {
  secret(message: string): Promise<string>;
  select<T extends string>(message: string, choices: readonly T[]): Promise<T>;
}

export interface CommandRunOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly input?: string;
  readonly timeoutMs?: number;
  readonly windowsHide?: boolean;
}

export interface CommandRunResult {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface CommandRunnerDeps {
  run(
    command: string,
    args: readonly string[],
    options?: CommandRunOptions,
  ): Promise<CommandRunResult>;
}

export interface HttpRequest {
  readonly method: "GET" | "POST";
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs?: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface HttpClientDeps {
  request(request: HttpRequest): Promise<HttpResponse>;
}

export interface ClockDeps {
  now(): Date;
  isoNow(): string;
}

export interface RuntimeEnvironmentDeps {
  get(name: string): string | undefined;
  toObject(): Readonly<Record<string, string | undefined>>;
}

export interface PlatformFacts {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly pathDelimiter: string;
  readonly isWindows: boolean;
  readonly homeDir: string;
  readonly tmpDir: string;
  readonly cwd: string;
}

export interface InstallDependencies {
  readonly fs: FileSystemDeps;
  readonly stdin: StdinDeps;
  readonly prompts: PromptDeps;
  readonly commands: CommandRunnerDeps;
  readonly http: HttpClientDeps;
  readonly clock: ClockDeps;
  readonly env: RuntimeEnvironmentDeps;
  readonly platform: PlatformFacts;
}

export function getEnvValue(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  targetPlatform: NodeJS.Platform,
): string | undefined {
  if (targetPlatform !== "win32") {
    return env[name];
  }

  const match = Object.keys(env).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );

  return match === undefined ? undefined : env[match];
}

export function normalizeEnvironment(
  env: Readonly<Record<string, string | undefined>>,
  targetPlatform: NodeJS.Platform,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }

    normalized[targetPlatform === "win32" ? key.toUpperCase() : key] = value;
  }

  return normalized;
}

export function resolveCommandCandidates(
  command: string,
  env: Readonly<Record<string, string | undefined>>,
  targetPlatform: NodeJS.Platform,
): string[] {
  if (targetPlatform !== "win32") {
    return [command];
  }

  if (/[\\/]/.test(command) || /\.[A-Za-z0-9]+$/.test(command)) {
    return [command];
  }

  const pathext =
    getEnvValue(env, "PATHEXT", targetPlatform) ?? ".COM;.EXE;.BAT;.CMD";
  const extensions = pathext
    .split(";")
    .map((extension) => extension.trim())
    .filter(Boolean);

  return extensions.map((extension) => `${command}${extension}`);
}

export function createNodeFileSystem(): FileSystemDeps {
  return {
    readFile: (path) => readFile(path, "utf8"),
    writeFile: (path, contents, options) =>
      writeFileAtomic(path, contents, { mode: options?.mode }),
    mkdir: (path, options) => mkdir(path, options).then(() => undefined),
    chmod,
    removeFile: unlink,
    exists: async (path) => {
      try {
        await access(path, fsConstants.F_OK);
        return true;
      } catch {
        return false;
      }
    },
    stat,
  };
}

export function createNodeStdin(
  input: Readable & { readonly isTTY?: boolean } = process.stdin,
): StdinDeps {
  return {
    isTTY: input.isTTY === true,
    readAll: async () => {
      let contents = "";
      input.setEncoding("utf8");

      for await (const chunk of input) {
        contents += String(chunk);
      }

      return contents;
    },
  };
}

export function createNodeCommandRunner(
  facts: PlatformFacts = createNodePlatformFacts(),
): CommandRunnerDeps {
  return {
    run: (command, args, options = {}) =>
      new Promise((resolve, reject) => {
        const child = spawn(command, [...args], {
          cwd: options.cwd,
          env: {
            ...process.env,
            ...normalizeEnvironment(options.env ?? {}, facts.platform),
          },
          windowsHide: options.windowsHide ?? facts.isWindows,
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let timeout: NodeJS.Timeout | undefined;

        if (options.timeoutMs !== undefined) {
          timeout = setTimeout(() => child.kill("SIGTERM"), options.timeoutMs);
        }

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
          stdout += String(chunk);
        });
        child.stderr.on("data", (chunk) => {
          stderr += String(chunk);
        });
        child.on("error", reject);
        child.on("close", (exitCode, signal) => {
          if (timeout !== undefined) {
            clearTimeout(timeout);
          }
          resolve({ exitCode, signal, stdout, stderr });
        });

        if (options.input !== undefined) {
          child.stdin.end(options.input);
        } else {
          child.stdin.end();
        }
      }),
  };
}

export function createNodeHttpClient(
  fetchImpl: typeof fetch = fetch,
): HttpClientDeps {
  return {
    request: async (request) => {
      const controller = new AbortController();
      const timeout =
        request.timeoutMs === undefined
          ? undefined
          : setTimeout(() => controller.abort(), request.timeoutMs);

      try {
        const response = await fetchImpl(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        });
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return {
          status: response.status,
          headers,
          body: await response.text(),
        };
      } finally {
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
      }
    },
  };
}

export function createNodeClock(): ClockDeps {
  return {
    now: () => new Date(),
    isoNow: () => new Date().toISOString(),
  };
}

export function createNodeRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironmentDeps {
  return {
    get: (name) => env[name],
    toObject: () => ({ ...env }),
  };
}

export function createNodePlatformFacts(): PlatformFacts {
  const currentPlatform = platform();

  return {
    platform: currentPlatform,
    arch: arch(),
    pathDelimiter: delimiter,
    isWindows: currentPlatform === "win32",
    homeDir: homedir(),
    tmpDir: tmpdir(),
    cwd: process.cwd(),
  };
}

export function createNodeInstallDependencies(): InstallDependencies {
  return {
    fs: createNodeFileSystem(),
    stdin: createNodeStdin(),
    prompts: {
      secret: (message) => password({ mask: "*", message }),
      select: (message, choices) =>
        select({
          message,
          choices: choices.map((value) => ({ name: value, value })),
        }),
    },
    commands: createNodeCommandRunner(),
    http: createNodeHttpClient(),
    clock: createNodeClock(),
    env: createNodeRuntimeEnvironment(),
    platform: createNodePlatformFacts(),
  };
}
