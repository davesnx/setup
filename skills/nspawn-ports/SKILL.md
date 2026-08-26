---
name: nspawn-ports
description: Use when starting, configuring, or exposing a service inside systemd-nspawn.
---

# Nspawn Ports

If `systemd-detect-virt --container` returns `systemd-nspawn`:

- Bind the service to `0.0.0.0` on an unused port from `25000-25099`.
- Access it locally at `febox-uk.ahrefs.net:<port>` while the VPN is enabled.
