"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, AlertCircle, CheckCircle2, Settings, Lightbulb } from "lucide-react";

type ModelType = "huggingface";

interface VllmEnvVars {
  VLLM_ATTENTION_BACKEND?: string;
  VLLM_USE_TRITON_FLASH_ATTN?: string;
  VLLM_USE_V1?: string;
  VLLM_DISABLE_FLASHINFER?: string;
  VLLM_USE_FLASHINFER_SAMPLER?: string;
  VLLM_USE_TRTLLM_ATTENTION?: string;
}

interface VllmParams {
  // Engine/init params only - generation params are controlled by the eval server
  gpu_memory_utilization?: number;
  max_model_len?: number;
  dtype?: string;
  quantization?: string;
  // Additional engine args
  tokenizer?: string;
  tokenizer_mode?: string;
  enforce_eager?: boolean;
  enable_prefix_caching?: boolean;
  max_concurrent?: number;
  // Environment variables
  ENV_VARS?: VllmEnvVars;
}

interface SubmissionResponse {
  success?: boolean;
  submissionId?: string;
  error?: string;
  existingSubmissionId?: string;
  resetAt?: string;
}

const DEFAULT_VLLM_PARAMS: VllmParams = {
  gpu_memory_utilization: 0.9,
  max_model_len: 32768,
  dtype: "auto",
};

// vLLM 0.11.0 supported quantization methods
const QUANTIZATION_OPTIONS = [
  { value: "", label: "None" },
  { value: "awq", label: "AWQ" },
  { value: "gptq", label: "GPTQ" },
  { value: "marlin", label: "Marlin" },
  { value: "int8", label: "INT8" },
  { value: "fp8", label: "FP8" },
  { value: "bitblas", label: "BitBLAS" },
  { value: "bitsandbytes", label: "bitsandbytes" },
  { value: "gguf", label: "GGUF" },
];

// Tokenizer mode options
const TOKENIZER_MODE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "auto", label: "Auto" },
  { value: "slow", label: "Slow" },
  { value: "mistral", label: "Mistral" },
];

// Environment variable options
const ENV_VAR_OPTIONS = {
  VLLM_ATTENTION_BACKEND: [
    { value: "", label: "Default" },
    { value: "FLASH_ATTN", label: "FLASH_ATTN" },
    { value: "XFORMERS", label: "XFORMERS" },
    { value: "FLASHINFER", label: "FLASHINFER" },
    { value: "TRITON_MLA", label: "TRITON_MLA" },
  ],
  VLLM_USE_TRITON_FLASH_ATTN: [
    { value: "", label: "Default" },
    { value: "1", label: "Enabled (1)" },
    { value: "0", label: "Disabled (0)" },
  ],
  VLLM_USE_V1: [
    { value: "", label: "Default" },
    { value: "1", label: "Enabled (1)" },
    { value: "0", label: "Disabled (0)" },
  ],
  VLLM_DISABLE_FLASHINFER: [
    { value: "", label: "Default" },
    { value: "1", label: "Disabled (1)" },
    { value: "0", label: "Enabled (0)" },
  ],
  VLLM_USE_FLASHINFER_SAMPLER: [
    { value: "", label: "Default" },
    { value: "1", label: "Enabled (1)" },
    { value: "0", label: "Disabled (0)" },
  ],
  VLLM_USE_TRTLLM_ATTENTION: [
    { value: "", label: "Default" },
    { value: "1", label: "Enabled (1)" },
    { value: "0", label: "Disabled (0)" },
  ],
};

export function SubmitForm() {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [modelType] = useState<ModelType>("huggingface");
  const [modelId, setModelId] = useState("");
  const [vllmParams, setVllmParams] = useState<VllmParams>(DEFAULT_VLLM_PARAMS);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    submissionId: string;
  } | null>(null);

  const updateVllmParam = <K extends keyof VllmParams>(
    key: K,
    value: VllmParams[K] | string
  ) => {
    setVllmParams((prev) => ({
      ...prev,
      [key]: value === "" ? undefined : value,
    }));
  };

  const updateEnvVar = (key: keyof VllmEnvVars, value: string) => {
    setVllmParams((prev) => {
      const newEnvVars = { ...prev.ENV_VARS };
      if (value === "") {
        delete newEnvVars[key];
      } else {
        newEnvVars[key] = value;
      }
      return {
        ...prev,
        ENV_VARS: Object.keys(newEnvVars).length > 0 ? newEnvVars : undefined,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!turnstileToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    const value = modelId.trim();
    if (!value) {
      setError("Please enter a model ID");
      return;
    }

    setIsSubmitting(true);

    // Filter out undefined/empty params
    const cleanParams: VllmParams = {};
    for (const [key, val] of Object.entries(vllmParams)) {
      if (val !== undefined && val !== "") {
        cleanParams[key as keyof VllmParams] = val as never;
      }
    }

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelType,
          modelId,
          vllmParams: cleanParams,
          turnstileToken,
        }),
      });

      const data: SubmissionResponse = await response.json();

      if (!response.ok) {
        if (data.existingSubmissionId) {
          setError(
            `${data.error} View it at /submissions/${data.existingSubmissionId}`
          );
        } else if (data.resetAt) {
          const resetDate = new Date(data.resetAt);
          setError(
            `${data.error} You can submit again after ${resetDate.toLocaleString()}.`
          );
        } else {
          setError(data.error || "Submission failed");
        }
        // Reset turnstile for retry
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }

      setSuccess({ submissionId: data.submissionId! });

      // Redirect to submission status page after short delay
      setTimeout(() => {
        router.push(`/submissions/${data.submissionId}`);
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Model Details</CardTitle>
          <CardDescription>
            Enter the details of the model you want to evaluate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Input */}
          <div className="space-y-2">
            <Label htmlFor="modelId">Hugging Face Model ID</Label>
            <Input
              id="modelId"
              placeholder="e.g., meta-llama/Llama-3.1-8B-Instruct"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground">
              Enter the full model ID from Hugging Face (owner/model-name)
            </p>
          </div>

          {/* Advanced Options */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Options (vLLM Parameters)
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_model_len">Max Context Length</Label>
                      <Input
                        id="max_model_len"
                        type="number"
                        min={16384}
                        max={65536}
                        step={1024}
                        placeholder="32768"
                        value={vllmParams.max_model_len ?? ""}
                        onChange={(e) =>
                          updateVllmParam(
                            "max_model_len",
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        16K-64K, default 32K. Split evenly across 4 output turns.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gpu_memory_utilization">
                        GPU Memory Utilization
                      </Label>
                      <Input
                        id="gpu_memory_utilization"
                        type="number"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        placeholder="0.9"
                        value={vllmParams.gpu_memory_utilization ?? ""}
                        onChange={(e) =>
                          updateVllmParam(
                            "gpu_memory_utilization",
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Fraction of GPU memory to use (0.1-1.0)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dtype">Data Type</Label>
                      <select
                        id="dtype"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={vllmParams.dtype ?? "auto"}
                        onChange={(e) => updateVllmParam("dtype", e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="auto">Auto</option>
                        <option value="float16">float16</option>
                        <option value="bfloat16">bfloat16</option>
                        <option value="float32">float32</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Model data type
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantization">Quantization</Label>
                      <select
                        id="quantization"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={vllmParams.quantization ?? ""}
                        onChange={(e) =>
                          updateVllmParam("quantization", e.target.value || undefined)
                        }
                        disabled={isSubmitting}
                      >
                        {QUANTIZATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Quantization method (if applicable)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tokenizer">Custom Tokenizer</Label>
                      <Input
                        id="tokenizer"
                        placeholder="e.g., org/tokenizer-name"
                        value={vllmParams.tokenizer ?? ""}
                        onChange={(e) =>
                          updateVllmParam("tokenizer", e.target.value || undefined)
                        }
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional custom tokenizer (HuggingFace ID)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tokenizer_mode">Tokenizer Mode</Label>
                      <select
                        id="tokenizer_mode"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={vllmParams.tokenizer_mode ?? ""}
                        onChange={(e) =>
                          updateVllmParam("tokenizer_mode", e.target.value || undefined)
                        }
                        disabled={isSubmitting}
                      >
                        {TOKENIZER_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Tokenizer loading mode
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_concurrent">Max Concurrent Requests</Label>
                      <Input
                        id="max_concurrent"
                        type="number"
                        min={1}
                        max={256}
                        placeholder="Default"
                        value={vllmParams.max_concurrent ?? ""}
                        onChange={(e) =>
                          updateVllmParam(
                            "max_concurrent",
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max concurrent requests to engine
                      </p>
                    </div>

                    <div className="space-y-2 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enforce_eager"
                        checked={vllmParams.enforce_eager ?? false}
                        onChange={(e) =>
                          updateVllmParam("enforce_eager", e.target.checked || undefined)
                        }
                        disabled={isSubmitting}
                        className="h-4 w-4 rounded border-input"
                      />
                      <div>
                        <Label htmlFor="enforce_eager" className="cursor-pointer">
                          Enforce Eager Mode
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Disable CUDA graphs
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enable_prefix_caching"
                        checked={vllmParams.enable_prefix_caching ?? false}
                        onChange={(e) =>
                          updateVllmParam("enable_prefix_caching", e.target.checked || undefined)
                        }
                        disabled={isSubmitting}
                        className="h-4 w-4 rounded border-input"
                      />
                      <div>
                        <Label htmlFor="enable_prefix_caching" className="cursor-pointer">
                          Enable Prefix Caching
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Cache common prompt prefixes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Environment Variables Section */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-4">Environment Variables</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="VLLM_ATTENTION_BACKEND">Attention Backend</Label>
                        <select
                          id="VLLM_ATTENTION_BACKEND"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={vllmParams.ENV_VARS?.VLLM_ATTENTION_BACKEND ?? ""}
                          onChange={(e) => updateEnvVar("VLLM_ATTENTION_BACKEND", e.target.value)}
                          disabled={isSubmitting}
                        >
                          {ENV_VAR_OPTIONS.VLLM_ATTENTION_BACKEND.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="VLLM_USE_V1">Use V1 Engine</Label>
                        <select
                          id="VLLM_USE_V1"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={vllmParams.ENV_VARS?.VLLM_USE_V1 ?? ""}
                          onChange={(e) => updateEnvVar("VLLM_USE_V1", e.target.value)}
                          disabled={isSubmitting}
                        >
                          {ENV_VAR_OPTIONS.VLLM_USE_V1.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="VLLM_USE_TRITON_FLASH_ATTN">Triton Flash Attention</Label>
                        <select
                          id="VLLM_USE_TRITON_FLASH_ATTN"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={vllmParams.ENV_VARS?.VLLM_USE_TRITON_FLASH_ATTN ?? ""}
                          onChange={(e) => updateEnvVar("VLLM_USE_TRITON_FLASH_ATTN", e.target.value)}
                          disabled={isSubmitting}
                        >
                          {ENV_VAR_OPTIONS.VLLM_USE_TRITON_FLASH_ATTN.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="VLLM_DISABLE_FLASHINFER">Disable FlashInfer</Label>
                        <select
                          id="VLLM_DISABLE_FLASHINFER"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={vllmParams.ENV_VARS?.VLLM_DISABLE_FLASHINFER ?? ""}
                          onChange={(e) => updateEnvVar("VLLM_DISABLE_FLASHINFER", e.target.value)}
                          disabled={isSubmitting}
                        >
                          {ENV_VAR_OPTIONS.VLLM_DISABLE_FLASHINFER.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="VLLM_USE_FLASHINFER_SAMPLER">FlashInfer Sampler</Label>
                        <select
                          id="VLLM_USE_FLASHINFER_SAMPLER"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={vllmParams.ENV_VARS?.VLLM_USE_FLASHINFER_SAMPLER ?? ""}
                          onChange={(e) => updateEnvVar("VLLM_USE_FLASHINFER_SAMPLER", e.target.value)}
                          disabled={isSubmitting}
                        >
                          {ENV_VAR_OPTIONS.VLLM_USE_FLASHINFER_SAMPLER.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="VLLM_USE_TRTLLM_ATTENTION">TensorRT-LLM Attention</Label>
                        <select
                          id="VLLM_USE_TRTLLM_ATTENTION"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={vllmParams.ENV_VARS?.VLLM_USE_TRTLLM_ATTENTION ?? ""}
                          onChange={(e) => updateEnvVar("VLLM_USE_TRTLLM_ATTENTION", e.target.value)}
                          disabled={isSubmitting}
                        >
                          {ENV_VAR_OPTIONS.VLLM_USE_TRTLLM_ATTENTION.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Eval Server Tips */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="tips" className="border-none">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
                <span className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Eval Server Info
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Hardware:</strong> The eval server uses an NVIDIA H200 with 140GB VRAM.
                  </p>
                  <p>
                    <strong className="text-foreground">Runtime:</strong> vLLM 0.11.0. Your model will be loaded with the specified settings.
                  </p>
                  <p>
                    <strong className="text-foreground">Time Limit:</strong> Evaluations are limited to 2 hours. Models that exceed this limit will be marked as failed.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Turnstile CAPTCHA */}
          <div className="space-y-2">
            <Label>Verification</Label>
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              onSuccess={setTurnstileToken}
              onError={() => {
                setTurnstileToken(null);
                setError("CAPTCHA verification failed. Please try again.");
              }}
              onExpire={() => setTurnstileToken(null)}
              options={{
                theme: "auto",
              }}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-500 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Model submitted successfully! Redirecting to status page...
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !turnstileToken || success !== null}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit for Evaluation"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Submission Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Rate Limits:</strong> You can submit up to 3 models per 24
            hours.
          </p>
          <p>
            <strong>Evaluation Time:</strong> Each model typically takes 1-3
            hours to evaluate depending on queue length.
          </p>
          <p>
            <strong>Requirements:</strong> Models must be publicly accessible on
            Hugging Face. Private or gated models are not supported.
          </p>
          <p>
            <strong>Results:</strong> Once evaluation completes, results will
            appear on the leaderboard automatically.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
