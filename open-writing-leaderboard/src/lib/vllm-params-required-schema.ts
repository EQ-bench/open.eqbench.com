// Required vLLM parameters that are enforced by the server
// These are NOT shown to users and are merged into the final config

import type { VllmArgsOutput, VllmArg } from "./vllm-params-configurable-schema";

export const vllmRequiredParams = {
  // Args that are always added (will be appended to user args)
  args: [] as VllmArg[],
  // Env vars that are always set (merged with user env vars, required takes precedence)
  envVars: {
    // NCCL settings for stability
    NCCL_NET_PLUGIN: "none",
    NCCL_TUNER_PLUGIN: "none",
  } as Record<string, string>,
} as const;

// Get required args
export function getRequiredArgs(): VllmArg[] {
  return [...vllmRequiredParams.args];
}

// Get required env vars as a plain object
export function getRequiredEnvVars(): Record<string, string> {
  return { ...vllmRequiredParams.envVars };
}

// Merge user params with required params (required params take precedence)
export function mergeWithRequiredParams(userParams: VllmArgsOutput): VllmArgsOutput {
  const requiredArgs = getRequiredArgs();
  const requiredEnvVars = getRequiredEnvVars();

  // Build a set of required arg names to avoid duplicates
  const requiredArgNames = new Set(requiredArgs.map(a => a.arg));

  // Filter out any user args that conflict with required args, then add required
  const mergedArgs = [
    ...userParams.args.filter(a => !requiredArgNames.has(a.arg)),
    ...requiredArgs,
  ];

  // Merge env vars (required takes precedence)
  const mergedEnvVars = {
    ...userParams.envVars,
    ...requiredEnvVars,
  };

  return {
    args: mergedArgs,
    envVars: mergedEnvVars,
  };
}
