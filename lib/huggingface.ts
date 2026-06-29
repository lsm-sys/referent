import "server-only";

import { InferenceClient } from "@huggingface/inference";
import { ErrorCode } from "@/lib/error-codes";
import { AppError } from "@/lib/errors";

const HF_INFERENCE_MODELS = [
  "stabilityai/stable-diffusion-xl-base-1.0",
  "runwayml/stable-diffusion-v1-5",
] as const;

const INFERENCE_PROVIDERS_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_INFERENCE_BASE_URL =
  "https://router.huggingface.co/hf-inference/models";
const MAX_MODEL_LOAD_ATTEMPTS = 4;

export type GeneratedImage = {
  data: Buffer;
  contentType: string;
};

function getApiKey(): string {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new AppError(ErrorCode.IMAGE_CONFIG_MISSING);
  }

  return apiKey;
}

function parseContentType(header: string | null): string {
  if (header?.startsWith("image/")) {
    return header.split(";")[0]?.trim() ?? "image/png";
  }

  return "image/png";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPermissionError(value: unknown): boolean {
  const text =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : JSON.stringify(value);

  return (
    text.includes("sufficient permissions") ||
    text.includes("Inference Providers")
  );
}

function throwIfPermissionError(value: unknown): void {
  if (isPermissionError(value)) {
    throw new AppError(ErrorCode.IMAGE_PERMISSION_DENIED, { cause: value });
  }
}

async function generateViaHfInference(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<GeneratedImage> {
  const url = `${HF_INFERENCE_BASE_URL}/${model}`;

  for (let attempt = 0; attempt < MAX_MODEL_LOAD_ATTEMPTS; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width: 1024,
          height: 768,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (response.status === 503) {
      const payload = (await response.json().catch(() => null)) as {
        estimated_time?: number;
      } | null;
      const waitMs = Math.min((payload?.estimated_time ?? 10) * 1000, 20_000);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throwIfPermissionError(body);
      throw new AppError(ErrorCode.IMAGE_FAILED, { cause: body });
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await response.text();
      throwIfPermissionError(body);
      throw new AppError(ErrorCode.IMAGE_FAILED, { cause: body });
    }

    const data = Buffer.from(await response.arrayBuffer());

    if (data.length === 0) {
      throw new AppError(ErrorCode.IMAGE_FAILED);
    }

    return {
      data,
      contentType: parseContentType(contentType),
    };
  }

  throw new AppError(ErrorCode.IMAGE_FAILED, {
    cause: "Model is loading on Hugging Face",
  });
}

async function generateViaInferenceProviders(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<GeneratedImage> {
  const client = new InferenceClient(apiKey);

  try {
    const blob = await client.textToImage(
      {
        model,
        inputs: prompt,
        provider: "auto",
        parameters: {
          width: 1024,
          height: 768,
        },
      },
      { outputType: "blob" },
    );

    const data = Buffer.from(await blob.arrayBuffer());

    if (data.length === 0) {
      throw new AppError(ErrorCode.IMAGE_FAILED);
    }

    return {
      data,
      contentType: blob.type?.startsWith("image/") ? blob.type : "image/png",
    };
  } catch (error) {
    throwIfPermissionError(error);
    throw error;
  }
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const apiKey = getApiKey();
  let lastError: unknown;

  for (const model of HF_INFERENCE_MODELS) {
    try {
      return await generateViaHfInference(apiKey, model, prompt);
    } catch (error) {
      if (error instanceof AppError) {
        if (error.code === ErrorCode.IMAGE_CONFIG_MISSING) {
          throw error;
        }

        if (error.code === ErrorCode.IMAGE_PERMISSION_DENIED) {
          throw error;
        }
      }

      console.error(`HF hf-inference failed (${model}):`, error);
      lastError = error;
    }
  }

  try {
    return await generateViaInferenceProviders(
      apiKey,
      INFERENCE_PROVIDERS_MODEL,
      prompt,
    );
  } catch (error) {
    console.error("HF inference providers failed:", error);

    if (error instanceof AppError) {
      throw error;
    }

    if (isPermissionError(error)) {
      throw new AppError(ErrorCode.IMAGE_PERMISSION_DENIED, { cause: error });
    }

    throw new AppError(ErrorCode.IMAGE_FAILED, { cause: error ?? lastError });
  }
}
