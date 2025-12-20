// Required vLLM parameters that are enforced by the server
// These are NOT shown to users and are merged into the final config

export const vllmRequiredParams = {
  engineParams: {
    // Engine params that are always enforced
  },
  envVars: {
    // NCCL settings for stability
    NCCL_NET_PLUGIN: "none",
    NCCL_TUNER_PLUGIN: "none",
  },
  generationParams: {
    // Generation params are always server-controlled
    // These override any user-submitted values
  },
} as const;

export type RequiredEngineParamKey = keyof typeof vllmRequiredParams.engineParams;
export type RequiredEnvVarKey = keyof typeof vllmRequiredParams.envVars;
export type RequiredGenerationParamKey = keyof typeof vllmRequiredParams.generationParams;

// Get required engine params as a plain object
export function getRequiredEngineParams(): Record<string, unknown> {
  return { ...vllmRequiredParams.engineParams };
}

// Get required env vars as a plain object
export function getRequiredEnvVars(): Record<string, string> {
  return { ...vllmRequiredParams.envVars } as Record<string, string>;
}

// Get required generation params as a plain object
export function getRequiredGenerationParams(): Record<string, unknown> {
  return { ...vllmRequiredParams.generationParams };
}

// Merge user params with required params (required params take precedence)
export function mergeWithRequiredParams<T extends Record<string, unknown>>(
  userParams: T
): T {
  const requiredEngine = getRequiredEngineParams();
  const requiredEnvVars = getRequiredEnvVars();

  const merged = { ...userParams };

  // Merge engine params (required overrides user)
  for (const [key, value] of Object.entries(requiredEngine)) {
    (merged as Record<string, unknown>)[key] = value;
  }

  // Merge env vars (required overrides user)
  if (Object.keys(requiredEnvVars).length > 0) {
    const userEnvVars = (merged as Record<string, unknown>).ENV_VARS as Record<string, string> | undefined;
    (merged as Record<string, unknown>).ENV_VARS = {
      ...userEnvVars,
      ...requiredEnvVars,
    };
  }

  return merged;
}
