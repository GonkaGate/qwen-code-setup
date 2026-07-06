import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import { InstallerError } from "./errors.js";
import type { InstallDependencies } from "./deps.js";
import { redactSecrets, redactUnknown } from "./redact.js";

export interface GonkagateModel {
  readonly id: string;
  readonly name?: string;
}

export interface GonkagateModelList {
  readonly models: readonly GonkagateModel[];
  readonly modelIds: readonly string[];
}

export type GonkagateModelsResult =
  | {
      readonly ok: true;
      readonly models: GonkagateModelList;
    }
  | {
      readonly ok: false;
      readonly error: InstallerError;
    };

const MODELS_RESPONSE_MAX_BYTES = 1024 * 1024;
const MODELS_REQUEST_TIMEOUT_MS = 10_000;

export async function fetchGonkagateModels(
  deps: InstallDependencies,
  apiKey: string,
): Promise<GonkagateModelsResult> {
  try {
    const response = await deps.http.request({
      method: "GET",
      url: `${QWEN_CODE_SETUP_CONTRACT.canonicalBaseUrl}/models`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeoutMs: MODELS_REQUEST_TIMEOUT_MS,
    });

    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        error: modelAvailabilityError(
          `GonkaGate /v1/models returned HTTP ${response.status}.`,
        ),
      };
    }

    if (Buffer.byteLength(response.body, "utf8") > MODELS_RESPONSE_MAX_BYTES) {
      return {
        ok: false,
        error: modelAvailabilityError(
          "GonkaGate /v1/models response exceeded the bounded parser limit.",
        ),
      };
    }

    const models = extractModelsFromModelsResponse(response.body);

    return {
      ok: true,
      models: {
        models,
        modelIds: models.map((model) => model.id),
      },
    };
  } catch (error) {
    if (error instanceof InstallerError) {
      return { ok: false, error };
    }

    return {
      ok: false,
      error: modelAvailabilityError(
        `GonkaGate /v1/models request failed: ${redactUnknown(error)}`,
      ),
    };
  }
}

export function extractModelsFromModelsResponse(
  body: string,
): GonkagateModel[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw modelAvailabilityError(
      `GonkaGate /v1/models response was not valid JSON: ${redactUnknown(
        error,
      )}`,
    );
  }

  const data = toRecord(parsed).data;

  if (!Array.isArray(data)) {
    throw modelAvailabilityError(
      "GonkaGate /v1/models response did not contain a data array.",
    );
  }

  const modelsById = new Map<string, GonkagateModel>();

  for (const entry of data) {
    const record = toRecord(entry);
    const id = record.id;

    if (typeof id !== "string" || id.trim() === "") {
      throw modelAvailabilityError(
        "GonkaGate /v1/models response contained a model without a string id.",
      );
    }

    const modelId = id.trim();
    if (!modelsById.has(modelId)) {
      const name = record.name;
      modelsById.set(modelId, {
        id: modelId,
        ...(typeof name === "string" && name.trim() !== ""
          ? { name: name.trim() }
          : {}),
      });
    }
  }

  if (modelsById.size === 0) {
    throw modelAvailabilityError(
      "GonkaGate /v1/models response did not return any models.",
    );
  }

  return [...modelsById.values()];
}

export function extractModelIdsFromModelsResponse(body: string): string[] {
  return extractModelsFromModelsResponse(body).map((model) => model.id);
}

function modelAvailabilityError(message: string): InstallerError {
  return new InstallerError(
    "validated_models_unavailable",
    redactSecrets(message),
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
