#!/usr/bin/env bun

// Type for the optional local module
type GetModelDisplayName = (displayName: string | undefined) => string;

// Default implementation for model display name
function defaultGetModelDisplayName(displayName: string | undefined): string {
  if (!displayName) {
    return "Unknown";
  }

  // AWS Inference Profile ARN pattern: arn:aws:bedrock:...
  if (displayName.startsWith("arn:aws:")) {
    return "by AWS";
  }

  return displayName;
}

// Try to load local configuration, fallback to default
let getModelDisplayName: GetModelDisplayName = defaultGetModelDisplayName;

try {
  // Use absolute path to ~/.claude/statusline.extends.ts instead of relative path
  // This ensures we load the correct file even when statusline.ts is a symlink
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const extendsPath = `${homeDir}/.claude/statusline.extends.ts`;

  const localModule = await import(extendsPath);
  if (typeof localModule.getModelDisplayName === "function") {
    getModelDisplayName = localModule.getModelDisplayName;
  }
} catch (error) {
  // statusline.extends.ts not found, use default implementation
  // Uncomment the line below to debug import errors:
  // console.error("Failed to load statusline.extends.ts:", error);
}

interface SessionData {
  hook_event_name?: string;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  model: {
    id: string;
    display_name: string;
  };
  workspace: {
    current_dir: string;
    project_dir: string;
  };
  version?: string;
  output_style: {
    name: string;
  };
  cost: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window: {
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;
    current_usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    }
  };
  rate_limits?: {
    five_hour?: {
      used_percentage: number;
      resets_at: number;
    };
    seven_day?: {
      used_percentage: number;
      resets_at: number;
    };
  };
}


function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return tokens.toString();
}

// Context percentage calculation modes
type ContextCalculationMode = "buffer" | "threshold" | "raw";

// Auto-compact buffer size (reserved space for compaction)
const AUTO_COMPACT_BUFFER = 33_000;

// Auto-compact threshold (95% of context window)
const AUTO_COMPACT_THRESHOLD_RATIO = 0.95;

/**
 * Calculate context usage percentage based on the specified mode.
 *
 * @param usedTokens - Current token usage
 * @param contextWindowSize - Total context window size (e.g., 200K)
 * @param mode - Calculation mode:
 *   - "buffer": Use effective context (total - 45K buffer). Recommended.
 *   - "threshold": Use 95% auto-compact threshold.
 *   - "raw": Use total context window size (less accurate).
 * @returns Percentage of context used
 */
function calculateContextPercentage(
  usedTokens: number,
  contextWindowSize: number,
  mode: ContextCalculationMode = "buffer"
): number {
  let effectiveSize: number;

  switch (mode) {
    case "buffer":
      // Effective context = total - autocompact buffer (45K)
      // This matches /context command's "Free space" calculation
      effectiveSize = contextWindowSize - AUTO_COMPACT_BUFFER;
      break;
    case "threshold":
      // Use 95% threshold (official auto-compact trigger point)
      effectiveSize = contextWindowSize * AUTO_COMPACT_THRESHOLD_RATIO;
      break;
    case "raw":
    default:
      // Use total context window (less accurate)
      effectiveSize = contextWindowSize;
      break;
  }

  return (usedTokens / effectiveSize) * 100;
}

function getColorForPercentage(percentage: number): string {
  if (percentage < 70) {
    return "\x1b[32m"; // Green
  } else if (percentage < 90) {
    return "\x1b[33m"; // Yellow
  } else {
    return "\x1b[31m"; // Red
  }
}

// Color helper function for status line items
function colorize(text: string, color?: string): string {
  if (!color) return text;
  return `${color}${text}\x1b[0m`;
}

// Predefined colors for easy use
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
  brightOrange: "\x1b[38;5;214m",
};

// Format remaining time until a Unix epoch (seconds) as a short relative label.
// Examples: "6d 14h", "2h15m", "45m", "now"
function formatTimeUntil(resetsAt: number): string {
  const diffSec = resetsAt - Math.floor(Date.now() / 1000);
  if (diffSec <= 0) return "now";

  const days = Math.floor(diffSec / 86_400);
  const hours = Math.floor((diffSec % 86_400) / 3_600);
  const minutes = Math.floor((diffSec % 3_600) / 60);

  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
}

// Build the rate limit segment for the second status line row.
// Returns an empty string when the section should be hidden:
//   - model name contains "by AWS" (Bedrock sessions never include rate_limits)
//   - rate_limits is absent (pre-first-response, or non Pro/Max accounts)
function formatRateLimits(
  rateLimits: SessionData["rate_limits"],
  modelName: string
): string {
  if (modelName.includes("by AWS")) return "";
  if (!rateLimits) return "";

  const segments: string[] = [];

  const render = (
    label: string,
    pct: number | undefined,
    resetsAt: number | undefined
  ) => {
    if (pct == null) return;
    // Round to integer to align with Claude Code's /usage panel display
    const rounded = Math.round(pct);
    const color = getColorForPercentage(pct);
    const remaining = resetsAt != null ? ` (${formatTimeUntil(resetsAt)})` : "";
    segments.push(`${label}: ${color}${rounded}%\x1b[0m${remaining}`);
  };

  render("5h", rateLimits.five_hour?.used_percentage, rateLimits.five_hour?.resets_at);
  render("7d", rateLimits.seven_day?.used_percentage, rateLimits.seven_day?.resets_at);

  return segments.join(" / ");
}

function getGitDiffStats(): { additions: number; deletions: number } {
  try {
    const result = Bun.spawnSync(["git", "diff", "--numstat"], {
      cwd: process.cwd(),
      stderr: "ignore",
    });
    if (result.exitCode === 0) {
      const lines = result.stdout.toString().trim().split("\n");
      let additions = 0;
      let deletions = 0;

      for (const line of lines) {
        if (line.trim()) {
          const [add, del] = line.split("\t");
          if (add !== "-" && del !== "-") {
            additions += parseInt(add) || 0;
            deletions += parseInt(del) || 0;
          }
        }
      }

      return { additions, deletions };
    }
  } catch {
    return { additions: 0, deletions: 0 };
  }
  return { additions: 0, deletions: 0 };
}

function getGitBranch(): string {
  // Get current git branch if git branch available
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: process.cwd(),
      stderr: "ignore",
    });
    if (result.exitCode === 0) {
      return ` ${result.stdout.toString().trim()}`;
    }
  } catch {
    return "";
  }
  return "";
}

function getClaudeVersion(): string {
  try {
    const result = Bun.spawnSync(["claude", "-v"], {
      stderr: "ignore",
    });
    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }
  } catch {
    return "";
  }
  return "";
}

function formatCurrentDir(currentDir: string): string {
  if (!currentDir) return "";

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (!homeDir || !currentDir.startsWith(homeDir)) {
    // Return only the last directory name for paths outside home directory
    const pathParts = currentDir.split("/").filter((part) => part !== "");
    return pathParts[pathParts.length - 1] || currentDir;
  }

  // Get relative path from home directory
  const relativePath = currentDir.slice(homeDir.length).replace(/^\//, "");
  const pathParts = relativePath.split("/").filter((part) => part !== "");

  // Return ~ for home directory itself
  if (pathParts.length === 0) {
    return "~";
  }

  // Return only the last directory name
  return pathParts[pathParts.length - 1];
}

async function main() {
  const input = await Bun.stdin.text();
  const data: SessionData = JSON.parse(input);

  // Calculate current tokens from context_window.current_usage
  let totalTokens = 0;

  const usage = data.context_window?.current_usage;
  if (usage) {
    totalTokens =
      (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0);
  }

  // Calculate context percentage using effective context (excluding autocompact buffer)
  // Change the mode to "threshold" or "raw" if needed
  const percentageRaw = calculateContextPercentage(
    totalTokens,
    data.context_window.context_window_size,
    "buffer" // "buffer" (recommended) | "threshold" | "raw"
  );
  const percentage = (Math.round(percentageRaw * 100) / 100).toFixed(2);
  const color = getColorForPercentage(percentageRaw);

  // Format output: Opus 4.1 | Tokens: 1.0k | Context: 10%
  const modelName = getModelDisplayName(data.model?.display_name);

  const tokensDisplay = formatTokens(totalTokens);
  const gtitBranch = getGitBranch();
  const diffStats = getGitDiffStats();
  const gitStats =
    gtitBranch && (diffStats.additions > 0 || diffStats.deletions > 0)
      ? ` (+${diffStats.additions}, -${diffStats.deletions})`
      : "";
  // current dir show last 2 depth from user home with … icon

  const currentDir = formatCurrentDir(data.workspace?.current_dir || "");
  const usageCostUsd = `${(data.cost?.total_cost_usd || 0).toFixed(2)} USD`;
  const claudeVersion = getClaudeVersion();
  const outputStyle = data.output_style?.name || "";
  const rateLimits = formatRateLimits(data.rate_limits, modelName);

  process.stdout.write(
    `\x1b[0m${colorize(`  ${modelName}`, colors.brightYellow)} | ${colorize(
      `  ${currentDir}`,
      colors.brightBlue
    )} | ${colorize(gtitBranch, colors.brightOrange)}${colorize(
      gitStats,
      colors.brightOrange
    )}\n\x1b[0m${colorize(
      `  ${tokensDisplay} tok`,
      colors.brightWhite
    )} (${color}${percentage}%\x1b[0m) | ${colorize(
      `  ${usageCostUsd}`,
      colors.brightMagenta
    )}${outputStyle && outputStyle !== "default" ? ` | ${colorize(` ${outputStyle}`, colors.cyan)}` : ""
    }${rateLimits ? ` | ${rateLimits}` : ""}${claudeVersion ? ` | ${colorize(`v${claudeVersion}`, colors.white)}` : ""}\x1b[0m `
  );
}

main().catch(console.error);
