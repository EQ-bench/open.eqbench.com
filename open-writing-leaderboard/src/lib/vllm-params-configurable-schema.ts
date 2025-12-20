// JSON Schema definition for vLLM parameters
// Used for UI generation, frontend validation, and backend validation

export const vllmParamsSchema = {
  engineParams: {
    gpu_memory_utilization: {
      type: "number",
      label: "GPU Memory Utilization",
      description: "Fraction of GPU memory to use (0.1-1.0)",
      min: 0.5,
      max: 0.98,
      step: 0.001,
      placeholder: "0.9",
      default: 0.92,
    },
    max_model_len: {
      type: "number",
      label: "Max Model Length",
      description: "Maximum context length for the model",
      min: 16384,
      max: 65536,
      step: 1,
      placeholder: "32768",
      default: 32768,
    },
    dtype: {
      type: "select",
      label: "Data Type",
      description: "Data type for model weights",
      options: [
        { value: "auto", label: "Auto" },
        { value: "float16", label: "float16" },
        { value: "bfloat16", label: "bfloat16" },
      ],
      default: "auto",
    },
    quantization: {
      type: "select",
      label: "Quantization",
      description: "Quantization method",
      options: [
        { value: "", label: "None" },
        { value: "aqlm", label: "AQLM" },
        { value: "awq", label: "AWQ" },
        { value: "awq_marlin", label: "AWQ Marlin" },
        { value: "bitsandbytes", label: "bitsandbytes" },
        { value: "compressed-tensors", label: "Compressed Tensors" },
        { value: "deepspeedfp", label: "DeepSpeed FP" },
        { value: "experts_int8", label: "Experts INT8" },
        { value: "fbgemm_fp8", label: "FBGEMM FP8" },
        { value: "fp8", label: "FP8" },
        { value: "gguf", label: "GGUF" },
        { value: "gptq", label: "GPTQ" },
        { value: "gptq_marlin", label: "GPTQ Marlin" },
        { value: "gptq_marlin_24", label: "GPTQ Marlin 2:4" },
        { value: "marlin", label: "Marlin" },
        { value: "modelopt", label: "ModelOpt" },
        { value: "neuron_quant", label: "Neuron Quant" },
        { value: "qqq", label: "QQQ" },
        { value: "tpu_int8", label: "TPU INT8" },
      ],
      default: "",
    },
    kv_cache_dtype: {
      type: "select",
      label: "KV Cache Data Type",
      description: "Data type for KV cache",
      options: [
        { value: "auto", label: "Auto" },
        { value: "fp8", label: "FP8" },
        { value: "fp8_e4m3", label: "FP8 E4M3" },
        { value: "fp8_e5m2", label: "FP8 E5M2" },
      ],
      default: "auto",
    },
    tokenizer: {
      type: "text",
      label: "Custom Tokenizer",
      description: "Custom tokenizer to use (HuggingFace ID)",
      placeholder: "e.g., org/tokenizer-name",
    },
    tokenizer_mode: {
      type: "select",
      label: "Tokenizer Mode",
      description: "Tokenizer mode",
      options: [
        { value: "", label: "Default" },
        { value: "auto", label: "Auto" },
        { value: "slow", label: "Slow" },
        { value: "mistral", label: "Mistral" },
      ],
      default: "",
    },
    enforce_eager: {
      type: "boolean",
      label: "Enforce Eager",
      description: "Disable CUDA graph optimization",
      default: false,
    },
    enable_prefix_caching: {
      type: "boolean",
      label: "Enable Prefix Caching",
      description: "Enable automatic prefix caching",
      default: false,
    },
    max_concurrent: {
      type: "number",
      label: "Max Concurrent Requests",
      description: "Maximum concurrent requests to process",
      min: 1,
      max: 256,
      step: 1,
      placeholder: "Default",
    },
    max_num_seqs: {
      type: "number",
      label: "Max Number of Sequences",
      description: "Maximum number of sequences per iteration",
      min: 1,
      max: 1024,
      step: 1,
      placeholder: "Default",
    },
    max_num_batched_tokens: {
      type: "number",
      label: "Max Batched Tokens",
      description: "Maximum number of batched tokens per iteration",
      min: 1,
      max: 131072,
      step: 1024,
      placeholder: "Default",
    },
    max_parallel_loading_workers: {
      type: "number",
      label: "Max Parallel Loading Workers",
      description: "Number of workers for parallel model loading",
      min: 1,
      max: 32,
      step: 1,
      placeholder: "Default",
    },
    enable_expert_parallel: {
      type: "boolean",
      label: "Enable Expert Parallel",
      description: "Enable expert parallelism for MoE models",
      default: false,
    },
    disable_custom_all_reduce: {
      type: "boolean",
      label: "Disable Custom All-Reduce",
      description: "Disable custom all-reduce kernel",
      default: false,
    },
  },
  envVars: {
    VLLM_ATTENTION_BACKEND: {
      type: "select",
      label: "Attention Backend",
      description: "Attention backend to use",
      options: [
        { value: "", label: "Default" },
        { value: "FLASH_ATTN", label: "Flash Attention" },
        { value: "XFORMERS", label: "xFormers" },
        { value: "FLASHINFER", label: "FlashInfer" },
        { value: "TRITON_MLA", label: "Triton MLA" },
      ],
      default: "",
    },
    VLLM_USE_V1: {
      type: "select",
      label: "Use V1 Engine",
      description: "Use V1 engine architecture",
      options: [
        { value: "", label: "Default" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: "",
    },
    VLLM_USE_TRITON_FLASH_ATTN: {
      type: "select",
      label: "Triton Flash Attention",
      description: "Use Triton Flash Attention",
      options: [
        { value: "", label: "Default" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: "",
    },
    VLLM_DISABLE_FLASHINFER: {
      type: "select",
      label: "Disable FlashInfer",
      description: "Disable FlashInfer backend",
      options: [
        { value: "", label: "Default" },
        { value: "1", label: "Disabled (1)" },
        { value: "0", label: "Enabled (0)" },
      ],
      default: "",
    },
    VLLM_USE_FLASHINFER_SAMPLER: {
      type: "select",
      label: "FlashInfer Sampler",
      description: "Use FlashInfer sampler",
      options: [
        { value: "", label: "Default" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: "",
    },
    VLLM_USE_TRTLLM_ATTENTION: {
      type: "select",
      label: "TensorRT-LLM Attention",
      description: "Use TensorRT-LLM attention",
      options: [
        { value: "", label: "Default" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: "",
    },
    VLLM_WORKER_MULTIPROC_METHOD: {
      type: "select",
      label: "Worker Multiproc Method",
      description: "Multiprocessing method for workers",
      options: [
        { value: "", label: "Default" },
        { value: "spawn", label: "Spawn" },
        { value: "fork", label: "Fork" },
      ],
      default: "",
    },
  },
} as const;

// Renamed export for clarity
export const vllmConfigurableSchema = vllmParamsSchema;

// Type definitions derived from schema
export type ConfigurableEngineParamKey = keyof typeof vllmParamsSchema.engineParams;
export type ConfigurableEnvVarKey = keyof typeof vllmParamsSchema.envVars;

// Keep old names for backwards compatibility
export type EngineParamKey = ConfigurableEngineParamKey;
export type EnvVarKey = ConfigurableEnvVarKey;

export interface VllmEnvVars {
  VLLM_ATTENTION_BACKEND?: string;
  VLLM_USE_TRITON_FLASH_ATTN?: string;
  VLLM_USE_V1?: string;
  VLLM_DISABLE_FLASHINFER?: string;
  VLLM_USE_FLASHINFER_SAMPLER?: string;
  VLLM_USE_TRTLLM_ATTENTION?: string;
  VLLM_WORKER_MULTIPROC_METHOD?: string;
  [key: string]: string | undefined;
}

export interface VllmParams {
  gpu_memory_utilization?: number;
  max_model_len?: number;
  dtype?: string;
  quantization?: string;
  kv_cache_dtype?: string;
  tokenizer?: string;
  tokenizer_mode?: string;
  enforce_eager?: boolean;
  enable_prefix_caching?: boolean;
  max_concurrent?: number;
  max_num_seqs?: number;
  max_num_batched_tokens?: number;
  max_parallel_loading_workers?: number;
  enable_expert_parallel?: boolean;
  disable_custom_all_reduce?: boolean;
  ENV_VARS?: VllmEnvVars;
  [key: string]: string | number | boolean | VllmEnvVars | undefined;
}

// Helper to get default params
export function getDefaultVllmParams(): VllmParams {
  const params: VllmParams = {};
  for (const [key, config] of Object.entries(vllmParamsSchema.engineParams)) {
    if ("default" in config && config.default !== "" && config.default !== undefined) {
      (params as Record<string, unknown>)[key] = config.default;
    }
  }
  return params;
}

// Validation helpers
export function getAllowedEngineParams(): Set<string> {
  return new Set([...Object.keys(vllmParamsSchema.engineParams), "ENV_VARS"]);
}

export function getAllowedEnvVars(): Set<string> {
  return new Set(Object.keys(vllmParamsSchema.envVars));
}

export function getEnvVarValidValues(): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  for (const [key, config] of Object.entries(vllmParamsSchema.envVars)) {
    if (config.type === "select") {
      result[key] = new Set(
        config.options.map((opt) => opt.value).filter((v) => v !== "")
      );
    }
  }
  return result;
}

export function getAllowedQuantizationMethods(): Set<string> {
  const quantConfig = vllmParamsSchema.engineParams.quantization;
  if (quantConfig.type === "select") {
    return new Set(
      quantConfig.options.map((opt) => opt.value).filter((v) => v !== "")
    );
  }
  return new Set();
}

// Validation function for vLLM params
export function validateAndSanitizeVllmParams(params: VllmParams | undefined): VllmParams {
  if (!params) return {};

  const sanitized: VllmParams = {};
  const allowedParams = getAllowedEngineParams();
  const allowedQuantMethods = getAllowedQuantizationMethods();
  const allowedEnvVars = getAllowedEnvVars();
  const envVarValidValues = getEnvVarValidValues();

  for (const [key, value] of Object.entries(params)) {
    if (!allowedParams.has(key)) continue;

    if (key === "ENV_VARS" && typeof value === "object" && value !== null) {
      const sanitizedEnvVars: VllmEnvVars = {};
      for (const [envKey, envValue] of Object.entries(value as Record<string, unknown>)) {
        if (
          allowedEnvVars.has(envKey) &&
          typeof envValue === "string" &&
          envVarValidValues[envKey]?.has(envValue)
        ) {
          (sanitizedEnvVars as Record<string, string>)[envKey] = envValue;
        }
      }
      if (Object.keys(sanitizedEnvVars).length > 0) {
        sanitized.ENV_VARS = sanitizedEnvVars;
      }
      continue;
    }

    const paramConfig = vllmParamsSchema.engineParams[key as EngineParamKey];
    if (!paramConfig) continue;

    // Validate based on type
    switch (paramConfig.type) {
      case "number":
        if (typeof value === "number" && !isNaN(value)) {
          let numVal = value;
          if ("min" in paramConfig && numVal < paramConfig.min) numVal = paramConfig.min;
          if ("max" in paramConfig && numVal > paramConfig.max) numVal = paramConfig.max;
          (sanitized as Record<string, unknown>)[key] = numVal;
        }
        break;
      case "boolean":
        if (typeof value === "boolean") {
          (sanitized as Record<string, unknown>)[key] = value;
        }
        break;
      case "text":
        if (typeof value === "string" && value.trim()) {
          // Sanitize text inputs (tokenizer names)
          const sanitizedValue = value.trim().replace(/[^a-zA-Z0-9_\-\/\.]/g, "");
          if (sanitizedValue) {
            (sanitized as Record<string, unknown>)[key] = sanitizedValue;
          }
        }
        break;
      case "select":
        if (typeof value === "string") {
          const validOptions: Set<string> = new Set(paramConfig.options.map((o) => o.value));
          if (validOptions.has(value)) {
            if (key === "quantization" && value && !allowedQuantMethods.has(value)) {
              continue;
            }
            (sanitized as Record<string, unknown>)[key] = value;
          }
        }
        break;
    }
  }

  return sanitized;
}
