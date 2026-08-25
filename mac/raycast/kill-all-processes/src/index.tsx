import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Image,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import { useEffect, useState } from "react";

type Preferences = {
  forceKill: boolean;
  skipConfirmation: boolean;
};

type Process = {
  id: number;
  name: string;
  path: string;
  cpu: number;
  memoryKb: number;
};

type ProcessGroup = Process & {
  count: number;
};

const isWindows = process.platform === "win32";

function execFileAsync(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout);
    });
  });
}

function encodePowerShellCommand(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

function escapePowerShellSingleQuotedString(value: string): string {
  return value.replace(/'/g, "''");
}

function parseMacProcesses(output: string): Process[] {
  return output
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+([\d.,]+)\s+(\d+)\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map(([, id, cpu, memoryKb, executablePath]) => ({
      id: Number(id),
      name: path.basename(executablePath),
      path: executablePath,
      cpu: Number(cpu.replace(",", ".")),
      memoryKb: Number(memoryKb),
    }));
}

function parseWindowsProcesses(output: string): Process[] {
  const parsed = JSON.parse(output) as
    | { id: number; name: string; cpu: number; memoryKb: number; path: string }
    | { id: number; name: string; cpu: number; memoryKb: number; path: string }[];

  return (Array.isArray(parsed) ? parsed : [parsed]).map((process) => ({
    ...process,
    path: process.path ?? "",
  }));
}

async function fetchProcesses(): Promise<Process[]> {
  if (!isWindows) {
    return parseMacProcesses(await execFileAsync("ps", ["-axo", "pid=,pcpu=,rss=,comm="]));
  }

  const script = `
$processes = Get-Process | Where-Object { $_.Id -ne 0 } | ForEach-Object {
  [PSCustomObject]@{
    id = $_.Id
    name = $_.ProcessName
    cpu = if ($_.CPU) { $_.CPU } else { 0 }
    memoryKb = [math]::Round($_.WorkingSet64 / 1KB)
    path = if ($_.Path) { $_.Path } else { '' }
  }
}
$processes | ConvertTo-Json -Compress
`;
  const output = await execFileAsync("powershell", [
    "-NoLogo",
    "-NoProfile",
    "-EncodedCommand",
    encodePowerShellCommand(script),
  ]);
  return parseWindowsProcesses(output);
}

function groupProcesses(processes: Process[]): ProcessGroup[] {
  const groups = new Map<string, ProcessGroup>();

  for (const process of processes) {
    const current = groups.get(process.name);
    if (current) {
      current.count += 1;
      current.cpu += process.cpu;
      current.memoryKb += process.memoryKb;
      continue;
    }

    groups.set(process.name, { ...process, count: 1 });
  }

  return [...groups.values()].sort((a, b) => b.cpu - a.cpu);
}

function getProcessIcon(process: ProcessGroup): Image.ImageLike {
  const appPath = process.path.match(/^(.+\.app)(?:\/.*)?$/)?.[1];
  if (appPath) {
    return { fileIcon: appPath };
  }
  if (isWindows && process.path) {
    return { fileIcon: process.path };
  }
  return Icon.Terminal;
}

async function killAllProcessesByName(processName: string, force: boolean): Promise<void> {
  if (isWindows) {
    const escapedProcessName = escapePowerShellSingleQuotedString(processName);
    const forceFlag = force ? " -Force" : "";
    const script = `
$ErrorActionPreference = 'Stop'
$processes = Get-Process -Name '${escapedProcessName}' -ErrorAction SilentlyContinue
if (-not $processes) {
  throw "No running processes named '${escapedProcessName}'"
}
$processes | Stop-Process${forceFlag}
`;

    await execFileAsync("powershell", ["-NoLogo", "-NoProfile", "-EncodedCommand", encodePowerShellCommand(script)]);
    return;
  }

  await execFileAsync("killall", force ? ["-9", processName] : [processName]);
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [processes, setProcesses] = useState<ProcessGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function loadProcesses(showFailure = false) {
    setIsLoading(true);
    setError(undefined);
    try {
      setProcesses(groupProcesses(await fetchProcesses()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(message);
      if (showFailure) {
        await showToast({ title: "Failed to Fetch Processes", message, style: Toast.Style.Failure });
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProcesses();
  }, []);

  async function killAll(process: ProcessGroup) {
    const action = preferences.forceKill ? "Force Kill All" : "Kill All";
    if (
      !preferences.skipConfirmation &&
      !(await confirmAlert({
        title: `${action} "${process.name}" processes?`,
        message: `This will terminate ${process.count} running ${process.count === 1 ? "process" : "processes"}.`,
        primaryAction: { title: action, style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }

    const toast = await showToast({ title: `${action}: ${process.name}`, style: Toast.Style.Animated });
    try {
      await killAllProcessesByName(process.name, preferences.forceKill);
      toast.title = `Killed all "${process.name}" processes`;
      toast.style = Toast.Style.Success;
      setProcesses((current) => current.filter((item) => item.name !== process.name));
      await closeMainWindow();
    } catch (error) {
      toast.title = `Failed to kill "${process.name}"`;
      toast.message = error instanceof Error ? error.message : "Unknown error";
      toast.style = Toast.Style.Failure;
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by process name">
      {error ? <List.EmptyView title="Failed to Fetch Processes" description={error} /> : null}
      {!error && !isLoading && processes.length === 0 ? <List.EmptyView title="No Processes Found" /> : null}
      <List.Section title="Processes" subtitle={`${processes.length} names`}>
        {processes.map((process) => (
          <List.Item
            key={process.name}
            title={process.name}
            subtitle={`${process.count} ${process.count === 1 ? "process" : "processes"}`}
            icon={getProcessIcon(process)}
            accessories={[
              { text: `${process.cpu.toFixed(1)}% CPU` },
              { text: `${(process.memoryKb / 1024).toFixed(1)} MB` },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={preferences.forceKill ? "Force Kill All" : "Kill All"}
                  icon={Icon.XMarkCircleFilled}
                  onAction={() => killAll(process)}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => loadProcesses(true)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
