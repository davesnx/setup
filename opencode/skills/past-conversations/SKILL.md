---
name: past-conversations
description: Find and inspect past conversations. Use when the user asks you to recall a previous conversation.
---

# Discovery of past conversations

All past conversations with the user exist in the sqlite3 database located at `~/.local/share/opencode/opencode.db`.

Query the database with the `sqlite3` program. All text from conversations are store in the `part` table which has this schema:

```
CREATE TABLE `part` (
	`id` text PRIMARY KEY,
	`message_id` text NOT NULL,
	`session_id` text NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	`data` text NOT NULL,
);
```

`data` is JSON object representing the message parts. You should only search JSON objects with `type: "text"`, and you should search the `text` field. Sort the messages by the `time_created` field, and group them by `session_id` which represents the conversation.
