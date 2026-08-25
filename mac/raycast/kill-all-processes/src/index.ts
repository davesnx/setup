import { Alert, closeMainWindow, confirmAlert, getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";

type Arguments = {
  processName: string;
};

type Preferences = {
  forceKill: boolean;
  skipConfirmation: boolean;
};

const isWindows = process.platform === "win32";

function execFileAsync(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function encodePowerShellCommand(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

function escapePowerShellSingleQuotedString(value: string): string {
  return value.replace(/'/g, "''");
}

async function killAllProcessesByName(processName: string, force: boolean): Promise<void> {
  if (isWindows) {
    const escapedProcessName = escapePowerShellSingleQuotedString(processName);
    const forceFlag = force ? " -Force" : "";
    const script = `
$ErrorActionPreference = 'Stop'
$name = '${escapedProcessName}'
$normalizedName = $name -replace '\\.exe$', ''
$processes = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq $normalizedName }
if (-not $processes) {
  throw "No running processes named '$name'"
}
$processes | Stop-Process${forceFlag}
`;

    await execFileAsync("powershell", ["-NoLogo", "-NoProfile", "-EncodedCommand", encodePowerShellCommand(script)]);
    return;
  }

  await execFileAsync("killall", force ? ["-9", processName] : [processName]);
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const processName = props.arguments.processName.trim();
  const preferences = getPreferenceValues<Preferences>();

  if (!processName || processName === "-" || processName.startsWith("-")) {
    await showToast({
      title: "Invalid Process Name",
      message: "Enter an exact process name, for example: node",
      style: Toast.Style.Failure,
    });
    return;
  }

  if (!preferences.skipConfirmation) {
    const confirmed = await confirmAlert({
      title: `${preferences.forceKill ? "Force k" : "K"}ill all "${processName}" processes?`,
      message: "This will terminate every running process with this exact name.",
      primaryAction: {
        title: "Kill All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      await showToast({ title: "Cancelled", style: Toast.Style.Failure });
      return;
    }
  }

  const toast = await showToast({
    title: `Killing all "${processName}" processes`,
    style: Toast.Style.Animated,
  });

  try {
    await killAllProcessesByName(processName, preferences.forceKill);
    toast.title = `Killed all "${processName}" processes`;
    toast.style = Toast.Style.Success;
    await closeMainWindow();
  } catch (error) {
    toast.title = `Failed to kill "${processName}"`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
    toast.style = Toast.Style.Failure;
  }
}
