/**
 * Extracts salient error information from vLLM and benchmark logs
 */

export interface ExtractedError {
  category: string;
  message: string;
  suggestion?: string;
  rawLine: string;
}

interface ErrorPattern {
  pattern: RegExp;
  category: string;
  getMessage: (match: RegExpMatchArray) => string;
  suggestion?: string;
}

const VLLM_ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Free memory on device \(([^)]+)\).*is less than desired GPU memory utilization \(([^,]+), ([^)]+)\)/,
    category: "VRAM Error",
    getMessage: (match) =>
      `Not enough free GPU memory at startup. Available: ${match[1]}, Required: ${match[3]}`,
    suggestion: "Try reducing gpu_memory_utilization.",
  },
  {
    // Using [\s\S]*? instead of .*? with /s flag for cross-line matching
    pattern: /(\d+\.?\d*)\s*GiB KV cache is needed, which is larger than the available KV cache memory \((\d+\.?\d*)\s*GiB\)[\s\S]*?maximum model length is (\d+)/,
    category: "KV Cache Error",
    getMessage: (match) =>
      `Model needs ${match[1]} GiB KV cache but only ${match[2]} GiB is available. Max supported context length: ${match[3]} tokens.`,
    suggestion: "Try reducing max_model_len or increasing gpu_memory_utilization.",
  },
  {
    // Fallback for KV cache errors without "maximum model length" info
    pattern: /(\d+\.?\d*)\s*GiB KV cache is needed, which is larger than the available KV cache memory \((\d+\.?\d*)\s*GiB\)/,
    category: "KV Cache Error",
    getMessage: (match) =>
      `Model needs ${match[1]} GiB KV cache but only ${match[2]} GiB is available.`,
    suggestion: "Try reducing max_model_len or increasing gpu_memory_utilization.",
  },
  {
    pattern: /CUDA out of memory/i,
    category: "CUDA OOM",
    getMessage: () => "GPU ran out of memory during model loading or inference.",
    suggestion: "Try a smaller model, reduce max_model_len, or use quantization.",
  },
  {
    pattern: /OutOfMemoryError/i,
    category: "Out of Memory",
    getMessage: () => "System ran out of memory.",
    suggestion: "The model may be too large for the available resources.",
  },
  {
    pattern: /torch\.cuda\.OutOfMemoryError/,
    category: "CUDA OOM",
    getMessage: () => "PyTorch CUDA out of memory error.",
    suggestion: "Try reducing batch size, max_model_len, or use a quantized model.",
  },
  {
    pattern: /Model.*not found|Repository Not Found|404.*model/i,
    category: "Model Not Found",
    getMessage: () => "The specified model could not be found.",
    suggestion: "Check that the model ID is correct and the model is publicly accessible.",
  },
  {
    // Gated/restricted model access - e.g. "Access to model google/gemma-3-4b-it is restricted"
    pattern: /Access to model ([^\s]+) is restricted/,
    category: "Gated Model",
    getMessage: (match) => `Access to model ${match[1]} is restricted. Authentication required.`,
    suggestion: "This model is gated on Hugging Face. Only publicly accessible models can be evaluated.",
  },
  {
    pattern: /Access.*denied|401|403.*Unauthorized/i,
    category: "Access Denied",
    getMessage: () => "Access to the model was denied.",
    suggestion: "The model may be gated or private. Ensure it's publicly accessible.",
  },
  {
    pattern: /Connection.*refused|ECONNREFUSED/i,
    category: "Connection Error",
    getMessage: () => "Failed to connect to a required service.",
    suggestion: "This may be a temporary infrastructure issue. Try resubmitting.",
  },
  {
    pattern: /Timeout|timed out/i,
    category: "Timeout",
    getMessage: () => "Operation timed out.",
    suggestion: "The model may be too slow or there was a network issue.",
  },
];

/**
 * Extract the most relevant error line from a log entry
 */
function extractErrorLine(text: string): string | null {
  // Look for common error patterns in order of specificity
  const errorLinePatterns = [
    /^.*ValueError:.*$/m,
    /^.*RuntimeError:.*$/m,
    /^.*Error:.*$/m,
    /^.*Exception:.*$/m,
    /^.*ERROR.*$/m,
  ];

  for (const pattern of errorLinePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean up ANSI codes and process prefixes
      return match[0]
        .replace(/\x1b\[[0-9;]*m/g, "") // Remove ANSI color codes
        .replace(/\[0;36m\([^)]+\)\[0;0m\s*/g, "") // Remove vLLM process prefixes like [0;36m(EngineCore_DP0 pid=937235)[0;0m
        .replace(/^\s*\[[^\]]+\]\s*/, "") // Remove timestamp prefixes like [07:26:59]
        .trim();
    }
  }

  return null;
}

/**
 * Extract errors from log text (stdout, stderr, or error_msg)
 */
export function extractErrors(logText: string): ExtractedError[] {
  const errors: ExtractedError[] = [];
  const seenMessages = new Set<string>();
  const seenCategories = new Set<string>();

  // Try each pattern against the full text
  // Patterns are ordered from most specific to least specific,
  // so we skip a category once we've matched it
  for (const errorPattern of VLLM_ERROR_PATTERNS) {
    // Skip if we already have an error in this category
    if (seenCategories.has(errorPattern.category)) continue;

    const match = logText.match(errorPattern.pattern);
    if (match) {
      const message = errorPattern.getMessage(match);

      // Avoid duplicates
      if (seenMessages.has(message)) continue;
      seenMessages.add(message);
      seenCategories.add(errorPattern.category);

      // Try to find the actual error line for rawLine
      const rawLine = extractErrorLine(logText) || match[0];

      errors.push({
        category: errorPattern.category,
        message,
        suggestion: errorPattern.suggestion,
        rawLine: rawLine.substring(0, 500), // Limit length
      });
    }
  }

  // If no known patterns matched, try to extract generic error lines
  if (errors.length === 0) {
    const rawLine = extractErrorLine(logText);
    if (rawLine && rawLine.length > 10) {
      // Clean up the raw line for display
      const cleanLine = rawLine
        .replace(/^.*?(ValueError|RuntimeError|Error|Exception):/i, "$1:")
        .trim();

      if (cleanLine.length > 10) {
        errors.push({
          category: "Error",
          message: cleanLine.length > 200 ? cleanLine.substring(0, 200) + "..." : cleanLine,
          rawLine: rawLine.substring(0, 500),
        });
      }
    }
  }

  return errors;
}

/**
 * Extract errors from multiple log entries
 */
export function extractErrorsFromLogs(logs: Array<{ data: string; stream: string }>): ExtractedError[] {
  const allErrors: ExtractedError[] = [];
  const seenMessages = new Set<string>();

  // Prioritize stderr logs
  const sortedLogs = [...logs].sort((a, b) => {
    const aIsStderr = a.stream.toLowerCase() === "stderr" || a.stream.toLowerCase() === "error";
    const bIsStderr = b.stream.toLowerCase() === "stderr" || b.stream.toLowerCase() === "error";
    if (aIsStderr && !bIsStderr) return -1;
    if (!aIsStderr && bIsStderr) return 1;
    return 0;
  });

  for (const log of sortedLogs) {
    const errors = extractErrors(log.data);
    for (const error of errors) {
      if (!seenMessages.has(error.message)) {
        seenMessages.add(error.message);
        allErrors.push(error);
      }
    }
    // Limit to first 3 unique errors
    if (allErrors.length >= 3) break;
  }

  return allErrors;
}
