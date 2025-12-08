const HF_API_BASE = "https://huggingface.co/api";

interface HFModelInfo {
  id: string;
  author?: string;
  sha?: string;
  lastModified?: string;
  private?: boolean;
  gated?: boolean | string;
  disabled?: boolean;
  library_name?: string;
  tags?: string[];
  pipeline_tag?: string;
  // Many more fields available but these are what we need
}

export interface ModelValidationResult {
  valid: boolean;
  error?: string;
  modelInfo?: HFModelInfo;
}

/**
 * Validate that a HuggingFace model ID exists and is accessible
 */
export async function validateHuggingFaceModel(
  modelId: string
): Promise<ModelValidationResult> {
  // Basic format validation
  if (!modelId || typeof modelId !== "string") {
    return { valid: false, error: "Model ID is required" };
  }

  // Model ID should be in format "owner/model-name" or just "model-name" for official models
  const modelIdPattern = /^[\w.-]+(?:\/[\w.-]+)?$/;
  if (!modelIdPattern.test(modelId)) {
    return {
      valid: false,
      error: "Invalid model ID format. Expected format: 'owner/model-name'",
    };
  }

  try {
    const response = await fetch(`${HF_API_BASE}/models/${modelId}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      return {
        valid: false,
        error: `Model "${modelId}" not found on Hugging Face`,
      };
    }

    if (response.status === 403) {
      return {
        valid: false,
        error: `Model "${modelId}" is private or requires authentication`,
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        error: `Failed to verify model: HTTP ${response.status}`,
      };
    }

    const modelInfo: HFModelInfo = await response.json();

    // Check if model is disabled
    if (modelInfo.disabled) {
      return {
        valid: false,
        error: `Model "${modelId}" has been disabled`,
      };
    }

    // Check if it's a text generation model (optional, could be too restrictive)
    // For now, we'll allow any model and let the eval system handle compatibility

    return {
      valid: true,
      modelInfo,
    };
  } catch (error) {
    console.error("HuggingFace API error:", error);
    return {
      valid: false,
      error: "Failed to connect to HuggingFace API",
    };
  }
}

/**
 * Validate a GGUF URL
 * We only allow GGUF files from trusted sources (HuggingFace)
 */
export function validateGgufUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "GGUF URL is required" };
  }

  try {
    const parsed = new URL(url);

    // Only allow HuggingFace URLs
    if (!parsed.hostname.endsWith("huggingface.co")) {
      return {
        valid: false,
        error: "GGUF files must be hosted on Hugging Face (huggingface.co)",
      };
    }

    // Check file extension
    if (!parsed.pathname.toLowerCase().endsWith(".gguf")) {
      return {
        valid: false,
        error: "URL must point to a .gguf file",
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}
