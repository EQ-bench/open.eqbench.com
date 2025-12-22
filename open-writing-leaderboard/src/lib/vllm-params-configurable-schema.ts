// JSON Schema definition for vLLM parameters
// Used for UI generation, frontend validation, and backend validation
//
// Output format: { args: [{ arg: "--flag", value: null | string | number }], envVars: { KEY: "value" } }
// - For presence-only flags (e.g. --enforce-eager): value is null
// - For key-value args (e.g. --dtype auto): value is the value
// - Args not in the list are not set (omitted from CLI)

export interface VllmArg {
  arg: string;
  value: string | number | null;
}

export interface VllmArgsOutput {
  args: VllmArg[];
  envVars: Record<string, string>;
}

// Schema field types
interface NumberField {
  type: "number";
  arg: string;
  label: string;
  description: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  default: number | null; // null = not set
}

interface SelectField {
  type: "select";
  arg: string;
  label: string;
  description: string;
  options: readonly { value: string | null; label: string }[];
  default: string | null; // null = not set
}

interface TextField {
  type: "text";
  arg: string;
  label: string;
  description: string;
  placeholder?: string;
  default: null; // text fields default to not set
}

// Boolean type is for presence/absence flags like --enforce-eager
// null = not set, true = include flag
interface BooleanField {
  type: "boolean";
  arg: string;
  label: string;
  description: string;
  default: boolean | null; // null = not set
}

// Env var select field (no arg, just key-value)
interface EnvVarSelectField {
  type: "select";
  label: string;
  description: string;
  options: readonly { value: string | null; label: string }[];
  default: string | null;
}

type EngineParamField = NumberField | SelectField | TextField | BooleanField;
type EnvVarField = EnvVarSelectField;

export const vllmParamsSchema = {
  engineParams: {
    "gpu-memory-utilization": {
      type: "number",
      arg: "--gpu-memory-utilization",
      label: "GPU Memory Utilization",
      description: "Fraction of GPU memory to use (0.5-0.98)",
      min: 0.5,
      max: 0.98,
      step: 0.01,
      placeholder: "0.9",
      default: 0.92,
    },
    "max-model-len": {
      type: "number",
      arg: "--max-model-len",
      label: "Max Model Length",
      description: "Maximum context length for the model (allowed range: 16k-65k). Needs to fit planning turn + 3 chapters.",
      min: 16000,
      max: 65536,
      step: 1,
      placeholder: "32768",
      default: 32768,
    },
    "dtype": {
      type: "select",
      arg: "--dtype",
      label: "Data Type",
      description: "Data type for model weights",
      options: [
        { value: null, label: "Not Set" },
        { value: "auto", label: "Auto" },
        { value: "float16", label: "float16" },
        { value: "bfloat16", label: "bfloat16" },
      ],
      default: null,
    },
    "quantization": {
      type: "select",
      arg: "--quantization",
      label: "Quantization",
      description: "Quantization method",
      options: [
        { value: null, label: "Not Set" },
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
      default: null,
    },
    "kv-cache-dtype": {
      type: "select",
      arg: "--kv-cache-dtype",
      label: "KV Cache Data Type",
      description: "Data type for KV cache",
      options: [
        { value: null, label: "Not Set" },
        { value: "auto", label: "Auto" },
        { value: "fp8", label: "FP8" },
        { value: "fp8_e4m3", label: "FP8 E4M3" },
        { value: "fp8_e5m2", label: "FP8 E5M2" },
      ],
      default: null,
    },
    "tokenizer": {
      type: "text",
      arg: "--tokenizer",
      label: "Custom Tokenizer",
      description: "Custom tokenizer to use (HuggingFace ID)",
      placeholder: "e.g., org/tokenizer-name",
      default: null,
    },
    "tokenizer-mode": {
      type: "select",
      arg: "--tokenizer-mode",
      label: "Tokenizer Mode",
      description: "Tokenizer mode",
      options: [
        { value: null, label: "Not Set" },
        { value: "auto", label: "Auto" },
        { value: "slow", label: "Slow" },
        { value: "mistral", label: "Mistral" },
      ],
      default: null,
    },
    "enforce-eager": {
      type: "boolean",
      arg: "--enforce-eager",
      label: "Enforce Eager",
      description: "Disable CUDA graph optimization",
      default: null,
    },
    "enable-prefix-caching": {
      type: "boolean",
      arg: "--enable-prefix-caching",
      label: "Enable Prefix Caching",
      description: "Enable automatic prefix caching",
      default: null,
    },
    "max-num-seqs": {
      type: "number",
      arg: "--max-num-seqs",
      label: "Max Number of Sequences",
      description: "Maximum number of sequences per iteration",
      min: 1,
      max: 1024,
      step: 1,
      placeholder: "Default",
      default: null,
    },
    "max-num-batched-tokens": {
      type: "number",
      arg: "--max-num-batched-tokens",
      label: "Max Batched Tokens",
      description: "Maximum number of batched tokens per iteration",
      min: 1,
      max: 131072,
      step: 1,
      placeholder: "Default",
      default: null,
    },
    "max-parallel-loading-workers": {
      type: "number",
      arg: "--max-parallel-loading-workers",
      label: "Max Parallel Loading Workers",
      description: "Number of workers for parallel model loading",
      min: 1,
      max: 32,
      step: 1,
      placeholder: "Default",
      default: null,
    },
    "enable-expert-parallel": {
      type: "boolean",
      arg: "--enable-expert-parallel",
      label: "Enable Expert Parallel",
      description: "Enable expert parallelism for MoE models",
      default: null,
    },
    "disable-custom-all-reduce": {
      type: "boolean",
      arg: "--disable-custom-all-reduce",
      label: "Disable Custom All-Reduce",
      description: "Disable custom all-reduce kernel",
      default: null,
    },
  } as const satisfies Record<string, EngineParamField>,

  envVars: {
    VLLM_ATTENTION_BACKEND: {
      type: "select",
      label: "Attention Backend",
      description: "Attention backend to use",
      options: [
        { value: null, label: "Not Set" },
        { value: "FLASH_ATTN", label: "Flash Attention" },
        { value: "XFORMERS", label: "xFormers" },
        { value: "FLASHINFER", label: "FlashInfer" },
        { value: "TRITON_MLA", label: "Triton MLA" },
      ],
      default: null,
    },
    VLLM_USE_V1: {
      type: "select",
      label: "Use V1 Engine",
      description: "Use V1 engine architecture",
      options: [
        { value: null, label: "Not Set" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: null,
    },
    VLLM_USE_TRITON_FLASH_ATTN: {
      type: "select",
      label: "Triton Flash Attention",
      description: "Use Triton Flash Attention",
      options: [
        { value: null, label: "Not Set" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: null,
    },
    VLLM_DISABLE_FLASHINFER: {
      type: "select",
      label: "Disable FlashInfer",
      description: "Disable FlashInfer backend",
      options: [
        { value: null, label: "Not Set" },
        { value: "1", label: "Disabled (1)" },
        { value: "0", label: "Enabled (0)" },
      ],
      default: null,
    },
    VLLM_USE_FLASHINFER_SAMPLER: {
      type: "select",
      label: "FlashInfer Sampler",
      description: "Use FlashInfer sampler",
      options: [
        { value: null, label: "Not Set" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: null,
    },
    VLLM_USE_TRTLLM_ATTENTION: {
      type: "select",
      label: "TensorRT-LLM Attention",
      description: "Use TensorRT-LLM attention",
      options: [
        { value: null, label: "Not Set" },
        { value: "1", label: "Enabled (1)" },
        { value: "0", label: "Disabled (0)" },
      ],
      default: null,
    },
    VLLM_WORKER_MULTIPROC_METHOD: {
      type: "select",
      label: "Worker Multiproc Method",
      description: "Multiprocessing method for workers",
      options: [
        { value: null, label: "Not Set" },
        { value: "spawn", label: "Spawn" },
        { value: "fork", label: "Fork" },
      ],
      default: null,
    },
  } as const satisfies Record<string, EnvVarField>,
} as const;

// Renamed export for clarity
export const vllmConfigurableSchema = vllmParamsSchema;

// Type definitions derived from schema
export type ConfigurableEngineParamKey = keyof typeof vllmParamsSchema.engineParams;
export type ConfigurableEnvVarKey = keyof typeof vllmParamsSchema.envVars;

// Keep old names for backwards compatibility
export type EngineParamKey = ConfigurableEngineParamKey;
export type EnvVarKey = ConfigurableEnvVarKey;

// Form state types (what the UI works with)
export interface VllmFormState {
  engineParams: {
    [K in ConfigurableEngineParamKey]?: string | number | boolean | null;
  };
  envVars: {
    [K in ConfigurableEnvVarKey]?: string | null;
  };
}

// Helper to get default form state
export function getDefaultFormState(): VllmFormState {
  const state: VllmFormState = {
    engineParams: {},
    envVars: {},
  };

  for (const [key, config] of Object.entries(vllmParamsSchema.engineParams)) {
    if (config.default !== null) {
      state.engineParams[key as ConfigurableEngineParamKey] = config.default;
    }
  }

  for (const [key, config] of Object.entries(vllmParamsSchema.envVars)) {
    if (config.default !== null) {
      state.envVars[key as ConfigurableEnvVarKey] = config.default;
    }
  }

  return state;
}

// Convert form state to output format for API
export function formStateToArgsOutput(formState: VllmFormState): VllmArgsOutput {
  const args: VllmArg[] = [];
  const envVars: Record<string, string> = {};

  // Process engine params
  for (const [key, value] of Object.entries(formState.engineParams)) {
    if (value === null || value === undefined || value === "") continue;

    const config = vllmParamsSchema.engineParams[key as ConfigurableEngineParamKey];
    if (!config) continue;

    if (config.type === "boolean") {
      // Boolean flags: only include if true
      if (value === true) {
        args.push({ arg: config.arg, value: null });
      }
    } else if (config.type === "number") {
      // Number args: include with value
      if (typeof value === "number" && !isNaN(value)) {
        args.push({ arg: config.arg, value });
      }
    } else if (config.type === "select" || config.type === "text") {
      // Select/text args: include with string value
      if (typeof value === "string" && value !== "") {
        args.push({ arg: config.arg, value });
      }
    }
  }

  // Process env vars
  for (const [key, value] of Object.entries(formState.envVars)) {
    if (value === null || value === undefined || value === "") continue;
    envVars[key] = value;
  }

  return { args, envVars };
}

// Validation helpers
export function getAllowedEngineParams(): Set<string> {
  return new Set(Object.keys(vllmParamsSchema.engineParams));
}

export function getAllowedEnvVars(): Set<string> {
  return new Set(Object.keys(vllmParamsSchema.envVars));
}

export function getEnvVarValidValues(): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  for (const [key, config] of Object.entries(vllmParamsSchema.envVars)) {
    const values: string[] = [];
    for (const opt of config.options) {
      if (opt.value !== null) {
        values.push(opt.value);
      }
    }
    result[key] = new Set(values);
  }
  return result;
}

export function getAllowedQuantizationMethods(): Set<string> {
  const quantConfig = vllmParamsSchema.engineParams.quantization;
  const values: string[] = [];
  for (const opt of quantConfig.options) {
    if (opt.value !== null) {
      values.push(opt.value);
    }
  }
  return new Set(values);
}

// Validation function for vLLM args output (from API submission)
export function validateAndSanitizeVllmArgs(input: unknown): VllmArgsOutput {
  const result: VllmArgsOutput = { args: [], envVars: {} };

  if (!input || typeof input !== "object") return result;

  const inputObj = input as Record<string, unknown>;

  // Validate args array
  if (Array.isArray(inputObj.args)) {
    // Build a map from arg string to config
    const argToConfig: Record<string, typeof vllmParamsSchema.engineParams[ConfigurableEngineParamKey]> = {};
    for (const [, config] of Object.entries(vllmParamsSchema.engineParams)) {
      argToConfig[config.arg] = config;
    }

    for (const item of inputObj.args) {
      if (!item || typeof item !== "object") continue;
      const argItem = item as Record<string, unknown>;

      const arg = argItem.arg;
      const value = argItem.value;

      if (typeof arg !== "string") continue;

      const config = argToConfig[arg];
      if (!config) continue;

      // Validate based on type
      if (config.type === "boolean") {
        // Boolean flags should have null value
        if (value === null) {
          result.args.push({ arg, value: null });
        }
      } else if (config.type === "number") {
        if (typeof value === "number" && !isNaN(value)) {
          let numVal = value;
          if (config.min !== undefined && numVal < config.min) {
            numVal = config.min;
          }
          if (config.max !== undefined && numVal > config.max) {
            numVal = config.max;
          }
          result.args.push({ arg, value: numVal });
        }
      } else if (config.type === "select") {
        if (typeof value === "string") {
          const validOptions = new Set<string>();
          for (const o of config.options) {
            if (o.value !== null) {
              validOptions.add(o.value);
            }
          }
          if (validOptions.has(value)) {
            result.args.push({ arg, value });
          }
        }
      } else if (config.type === "text") {
        if (typeof value === "string" && value.trim()) {
          // Sanitize text inputs
          const sanitizedValue = value.trim().replace(/[^a-zA-Z0-9_\-\/\.]/g, "");
          if (sanitizedValue) {
            result.args.push({ arg, value: sanitizedValue });
          }
        }
      }
    }
  }

  // Validate envVars object
  if (inputObj.envVars && typeof inputObj.envVars === "object") {
    const allowedEnvVars = getAllowedEnvVars();
    const envVarValidValues = getEnvVarValidValues();

    for (const [key, value] of Object.entries(inputObj.envVars as Record<string, unknown>)) {
      if (!allowedEnvVars.has(key)) continue;
      if (typeof value !== "string") continue;
      if (!envVarValidValues[key]?.has(value)) continue;

      result.envVars[key] = value;
    }
  }

  return result;
}

// Legacy types for backwards compatibility during migration
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

// Legacy VllmParams type - now deprecated, use VllmArgsOutput instead
export interface VllmParams {
  args?: VllmArg[];
  envVars?: Record<string, string>;
  // Legacy fields for reading old submissions
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
  [key: string]: unknown;
}

// Legacy helper - deprecated
export function getDefaultVllmParams(): VllmParams {
  const formState = getDefaultFormState();
  const output = formStateToArgsOutput(formState);
  return {
    args: output.args,
    envVars: output.envVars,
  };
}

// Legacy validation - deprecated, use validateAndSanitizeVllmArgs
export function validateAndSanitizeVllmParams(params: VllmParams | undefined): VllmParams {
  if (!params) return {};

  // If new format, validate it
  if (params.args !== undefined || params.envVars !== undefined) {
    const validated = validateAndSanitizeVllmArgs(params);
    return {
      args: validated.args,
      envVars: validated.envVars,
    };
  }

  // Legacy format - convert to new format
  const formState: VllmFormState = {
    engineParams: {},
    envVars: {},
  };

  // Map old snake_case keys to new kebab-case keys
  const keyMapping: Record<string, ConfigurableEngineParamKey> = {
    gpu_memory_utilization: "gpu-memory-utilization",
    max_model_len: "max-model-len",
    dtype: "dtype",
    quantization: "quantization",
    kv_cache_dtype: "kv-cache-dtype",
    tokenizer: "tokenizer",
    tokenizer_mode: "tokenizer-mode",
    enforce_eager: "enforce-eager",
    enable_prefix_caching: "enable-prefix-caching",
    max_num_seqs: "max-num-seqs",
    max_num_batched_tokens: "max-num-batched-tokens",
    max_parallel_loading_workers: "max-parallel-loading-workers",
    enable_expert_parallel: "enable-expert-parallel",
    disable_custom_all_reduce: "disable-custom-all-reduce",
  };

  for (const [oldKey, newKey] of Object.entries(keyMapping)) {
    const value = params[oldKey];
    if (value !== undefined && value !== null && value !== "") {
      formState.engineParams[newKey] = value as string | number | boolean;
    }
  }

  // Handle ENV_VARS
  if (params.ENV_VARS) {
    for (const [key, value] of Object.entries(params.ENV_VARS)) {
      if (value !== undefined && value !== "") {
        formState.envVars[key as ConfigurableEnvVarKey] = value;
      }
    }
  }

  const output = formStateToArgsOutput(formState);
  return {
    args: output.args,
    envVars: output.envVars,
  };
}
