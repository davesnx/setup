# JSONL State Protocol

Read this before initializing, re-initializing, reading, or writing experiment state. Use [recovery.md](recovery.md) when state is missing or records disagree.

All experiment state lives in `autoresearch.jsonl`. This is the source of truth for resuming across sessions.

## Config Header

The first line (and any re-initialization line) is a config header:

```json
{"type":"config","name":"<session name>","metricName":"<primary metric name>","metricUnit":"<unit>","bestDirection":"lower|higher","target":null,"maxExperiments":30,"plateauBatches":3,"timeBudgetMinutes":120,"parallelExperiments":3}
```

Rules:

- First line of the file is always a config header.
- Each subsequent config header (re-init) starts a new **segment**. Segment index increments with each config header.
- The baseline for a segment is the first result line after the config header.

## Result Lines

Each experiment result is appended as a JSON line:

```json
{"run":1,"batch":0,"hypothesis":"baseline","baseCommit":"abc1234","candidateRef":"baseline","commit":"abc1234","metric":42.3,"metrics":{"secondary_metric":123},"status":"keep","files":[],"description":"baseline","timestamp":1234567890,"segment":0}
```

Fields:

- `run`: sequential run number (1-indexed, across all segments)
- `batch`: batch number; baseline is batch 0
- `hypothesis`: short stable identifier for the tested idea
- `baseCommit`: best commit from which the candidate started
- `candidateRef`: SHA-256 of the candidate patch, or `baseline`
- `commit`: best 7-character commit after the decision; retained so existing dashboards continue to work
- `metric`: primary metric value (0 for crashes)
- `metrics`: object of secondary metric values - **once you start tracking a secondary metric, include it in every subsequent result**
- `status`: `keep` | `runner_up` | `discard` | `crash` | `checks_failed`
- `files`: files changed by the candidate, used to decide whether combination testing is safe
- `description`: short description of what this experiment tried
- `timestamp`: Unix epoch seconds
- `segment`: current segment index

## Initialization

To initialize, write the config header through a temporary file and rename it atomically:

```bash
entry='{"type":"config","name":"<name>","metricName":"<metric>","metricUnit":"<unit>","bestDirection":"<lower|higher>","target":null,"maxExperiments":30,"plateauBatches":3,"timeBudgetMinutes":120,"parallelExperiments":3}'
tmp="autoresearch.jsonl.tmp.$$"
printf '%s\n' "$entry" > "$tmp" && mv "$tmp" autoresearch.jsonl
```

To re-initialize, add a new config header through `write_jsonl_entry`:

```bash
write_jsonl_entry '{"type":"config","name":"<name>","metricName":"<metric>","metricUnit":"<unit>","bestDirection":"<lower|higher>","target":null,"maxExperiments":30,"plateauBatches":3,"timeBudgetMinutes":120,"parallelExperiments":3}'
```

## Data Integrity Protocol

**CRITICAL: JSONL data must never be corrupted or lost.**

### Pre-Write Validation

Before writing any new experiment result, validate the JSONL file:

```bash
validate_jsonl() {
    local jsonl_file="autoresearch.jsonl"
    if [[ -f "$jsonl_file" ]]; then
        local run_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
        echo "Current runs in JSONL: $run_count" >&2
        tail -n 5 "$jsonl_file" 2>/dev/null | while IFS= read -r line; do
            if ! echo "$line" | python3 -m json.tool >/dev/null 2>&1; then
                echo "WARNING: Invalid JSON found in state file" >&2
                return 1
            fi
        done
        echo "JSONL validation: OK" >&2
        return 0
    fi
    return 0
}
validate_jsonl || echo "WARNING: JSONL validation failed. Proceeding with caution." >&2
```

### Atomic Write Pattern

Never append directly to JSONL. Use atomic write pattern:

```bash
write_jsonl_entry() {
    local entry="$1"
    local jsonl_file="autoresearch.jsonl"
    local temp_file="${jsonl_file}.tmp.$$"
    cat "$jsonl_file" > "$temp_file" 2>/dev/null || touch "$temp_file"
    echo "$entry" >> "$temp_file"
    if ! echo "$entry" | python3 -m json.tool >/dev/null 2>&1; then
        rm -f "$temp_file"
        echo "WARNING: Invalid JSON entry, not writing" >&2
        return 1
    fi
    mv "$temp_file" "$jsonl_file"
    local new_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
    echo "Write verification: $new_count runs in JSONL" >&2
    return 0
}
```

### Post-Write Verification

After every write operation, verify the data was written correctly:

```bash
verify_write() {
    local expected_run=$1
    local jsonl_file="autoresearch.jsonl"
    if [[ -f "$jsonl_file" ]]; then
        local actual_count=$(grep -c '"run":' "$jsonl_file" 2>/dev/null || echo 0)
        if [[ "$actual_count" -lt "$expected_run" ]]; then
            echo "WARNING: Run count mismatch! Expected $expected_run, got $actual_count" >&2
            return 1
        fi
        echo "Write verification: OK (run $expected_run present)" >&2
        return 0
    fi
    return 1
}
```

### Backups

Before any user-confirmable action (manual intervention, major changes), create a backup:

```bash
cp autoresearch.jsonl "autoresearch.jsonl.backup.$(date +%s)" 2>/dev/null || true
# Keep only last 5 backups
ls -t autoresearch.jsonl.backup.* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
```
