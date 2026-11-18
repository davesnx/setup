"""Session-only PreToolUse guard. Does not approve or override other hooks."""

import json
import sys


def main() -> int:
    try:
        request = json.load(sys.stdin)
        tool = request["tool_name"]
        if tool == "EndConversation" or (
            tool == "Skill" and request["tool_input"]["skill"] == sys.argv[1]
        ):
            return 0
    except (ValueError, KeyError, TypeError, IndexError):
        pass
    print("Only the evaluation candidate may be invoked in this selection test.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
