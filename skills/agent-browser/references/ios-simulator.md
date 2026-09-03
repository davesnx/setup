# iOS Simulator (Mobile Safari)

Automate Mobile Safari on an iOS Simulator or a physical iOS device, using the same navigate-snapshot-interact workflow as desktop.

**Related**: [commands.md](commands.md) for the desktop command reference, [SKILL.md](../SKILL.md) for quick start.

## Requirements

macOS with Xcode, and Appium:

```bash
npm install -g appium && appium driver install xcuitest
```

## Basic Workflow

```bash
# List available iOS simulators
agent-browser device list

# Launch Safari on a specific device
agent-browser -p ios --device "iPhone 16 Pro" open https://example.com

# Same workflow as desktop: snapshot, interact, re-snapshot
agent-browser -p ios snapshot -i
agent-browser -p ios tap @e1          # Tap (alias for click)
agent-browser -p ios fill @e2 "text"
agent-browser -p ios swipe up         # Mobile-specific gesture

# Take screenshot
agent-browser -p ios screenshot mobile.png

# Close session (shuts down simulator)
agent-browser -p ios close
```

## Real Devices

Works with physical iOS devices if pre-configured. Use `--device "<UDID>"`, where UDID comes from `xcrun xctrace list devices`.
