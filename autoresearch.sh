#!/bin/bash
set -euo pipefail

zsh -n \
  terminal/zsh/.zshrc \
  terminal/zsh/.zprofile \
  terminal/zsh/.zimrc \
  terminal/zsh/instant-prompt.zsh \
  terminal/zsh/themes/prompt_davesnx_setup

python3 - <<'PY'
import os
import statistics
import subprocess
import time

env = os.environ.copy()
env["ZSH_BENCHMARK"] = "1"
command = ["zsh", "-l", "-i", "-c", "exit"]

def measure():
    started = time.perf_counter_ns()
    subprocess.run(
        command,
        check=True,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return (time.perf_counter_ns() - started) / 1_000_000

measure()
samples = [measure() for _ in range(10)]
print("SAMPLES startup_ms=" + ",".join(f"{sample:.3f}" for sample in samples))
print(f"METRIC startup_ms={statistics.median(samples):.3f}")
print(f"METRIC min_ms={min(samples):.3f}")
print(f"METRIC max_ms={max(samples):.3f}")
PY
