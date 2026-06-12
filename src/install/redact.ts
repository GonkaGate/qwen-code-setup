const REDACTED = "[REDACTED]";

const SECRET_PATTERNS: readonly [RegExp, string][] = [
  [/\bgp-[A-Za-z0-9._-]+/g, "gp-***"],
  [/\bBearer\s+[^"'\s]+/gi, `Bearer ${REDACTED}`],
  [
    /(["']?GONKAGATE_API_KEY["']?\s*[:=]\s*)["']?[^"',\n\r}]+["']?/g,
    `$1"${REDACTED}"`,
  ],
  [/(env\.GONKAGATE_API_KEY\s*[:=]\s*)[^,\n\r\s]+/g, `$1${REDACTED}`],
  [
    /(["']?Authorization["']?\s*:\s*["']?)Bearer\s+[^"'\n\r]+(["']?)/gi,
    `$1Bearer ${REDACTED}$2`,
  ],
];

export function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

export function redactUnknown(value: unknown): string {
  if (value instanceof Error) {
    return redactSecrets(value.message);
  }

  if (typeof value === "string") {
    return redactSecrets(value);
  }

  return redactSecrets(JSON.stringify(value));
}

export function redactedJsonStringify(value: unknown): string {
  return redactSecrets(JSON.stringify(value));
}
