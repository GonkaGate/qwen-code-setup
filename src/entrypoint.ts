import { realpathSync } from "node:fs";

export function isEntrypointInvocation(
  moduleUrl: string,
  invokedPath: string | undefined,
): boolean {
  if (invokedPath === undefined) {
    return false;
  }

  try {
    return realpathSync(new URL(moduleUrl)) === realpathSync(invokedPath);
  } catch {
    return false;
  }
}
