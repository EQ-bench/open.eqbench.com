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
import {
  vllmConfigurableSchema,
  getDefaultFormState,
  formStateToArgsOutput,
  type VllmFormState,
  type ConfigurableEngineParamKey,
  type ConfigurableEnvVarKey,
} from "@/lib/vllm-params-configurable-schema";

type ModelType = "huggingface";

interface SubmissionResponse {
  success?: boolean;
  submissionId?: string;
  error?: string;
  existingSubmissionId?: string;
  resetAt?: string;
}

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function SubmitForm() {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [modelType] = useState<ModelType>("huggingface");
  const [modelId, setModelId] = useState("");
  const [formState, setFormState] = useState<VllmFormState>(getDefaultFormState());
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    submissionId: string;
  } | null>(null);

  const updateEngineParam = (key: ConfigurableEngineParamKey, value: string | number | boolean | null) => {
    setFormState((prev) => ({
      ...prev,
      engineParams: {
        ...prev.engineParams,
        [key]: value,
      },
    }));
  };

  const updateEnvVar = (key: ConfigurableEnvVarKey, value: string | null) => {
    setFormState((prev) => ({
      ...prev,
      envVars: {
        ...prev.envVars,
        [key]: value,
      },
    }));
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

    // Convert form state to API format
    const vllmParams = formStateToArgsOutput(formState);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelType,
          modelId,
          vllmParams,
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

  // Render a form field based on schema config
  const renderEngineParam = (key: ConfigurableEngineParamKey) => {
    const config = vllmConfigurableSchema.engineParams[key];
    const currentValue = formState.engineParams[key];

    switch (config.type) {
      case "number":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{config.label}</Label>
            <Input
              id={key}
              type="number"
              min={config.min}
              max={config.max}
              step={config.step}
              placeholder={config.placeholder}
              value={currentValue !== null && currentValue !== undefined ? String(currentValue) : ""}
              onChange={(e) => {
                const val = e.target.value;
                updateEngineParam(key, val === "" ? null : parseFloat(val));
              }}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        );

      case "text":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{config.label}</Label>
            <Input
              id={key}
              placeholder={config.placeholder}
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={(e) => {
                const val = e.target.value;
                updateEngineParam(key, val === "" ? null : val);
              }}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        );

      case "select":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{config.label}</Label>
            <select
              id={key}
              className={selectClassName}
              value={currentValue === null || currentValue === undefined ? "__null__" : String(currentValue)}
              onChange={(e) => {
                const val = e.target.value;
                updateEngineParam(key, val === "__null__" ? null : val);
              }}
              disabled={isSubmitting}
            >
              {config.options.map((opt) => (
                <option key={opt.value ?? "__null__"} value={opt.value ?? "__null__"}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        );

      case "boolean":
        // Render as a dropdown with Not Set / True / False
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{config.label}</Label>
            <select
              id={key}
              className={selectClassName}
              value={currentValue === null || currentValue === undefined ? "__null__" : currentValue === true ? "true" : "false"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__null__") {
                  updateEngineParam(key, null);
                } else {
                  updateEngineParam(key, val === "true");
                }
              }}
              disabled={isSubmitting}
            >
              <option value="__null__">Not Set</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        );

      default:
        return null;
    }
  };

  // Render environment variable field
  const renderEnvVar = (key: ConfigurableEnvVarKey) => {
    const config = vllmConfigurableSchema.envVars[key];
    const currentValue = formState.envVars[key];

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key}>{config.label}</Label>
        <select
          id={key}
          className={selectClassName}
          value={currentValue === null || currentValue === undefined ? "__null__" : currentValue}
          onChange={(e) => {
            const val = e.target.value;
            updateEnvVar(key, val === "__null__" ? null : val);
          }}
          disabled={isSubmitting}
        >
          {config.options.map((opt) => (
            <option key={opt.value ?? "__null__"} value={opt.value ?? "__null__"}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Get engine params in display order (numbers first, then selects, then text, then booleans)
  const engineParamKeys = Object.keys(vllmConfigurableSchema.engineParams) as ConfigurableEngineParamKey[];
  const numberParams = engineParamKeys.filter(
    (k) => vllmConfigurableSchema.engineParams[k].type === "number"
  );
  const selectParams = engineParamKeys.filter(
    (k) => vllmConfigurableSchema.engineParams[k].type === "select"
  );
  const textParams = engineParamKeys.filter(
    (k) => vllmConfigurableSchema.engineParams[k].type === "text"
  );
  const booleanParams = engineParamKeys.filter(
    (k) => vllmConfigurableSchema.engineParams[k].type === "boolean"
  );

  const envVarKeys = Object.keys(vllmConfigurableSchema.envVars) as ConfigurableEnvVarKey[];

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
                    {/* Number params */}
                    {numberParams.map(renderEngineParam)}
                    {/* Select params */}
                    {selectParams.map(renderEngineParam)}
                    {/* Text params */}
                    {textParams.map(renderEngineParam)}
                    {/* Boolean params */}
                    {booleanParams.map(renderEngineParam)}
                  </div>

                  {/* Environment Variables Section */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-4">Environment Variables</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {envVarKeys.map(renderEnvVar)}
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
                    <strong className="text-foreground">Hardware:</strong> The eval server uses two NVIDIA H100s with 80GB VRAM each.
                  </p>
                  <p>
                    <strong className="text-foreground">Environment:</strong> vLLM 0.13.0, Torch 12.9. Your model will be loaded with the specified settings.
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
