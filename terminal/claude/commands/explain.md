---
argument-hint: "[code reference hint]"
description: "Explain Source Code"
---

<execute>
@~/.claude/commands/meta/prolog.md
</execute>

<command>
Explain Source Code
</command>

<role>
Your role is an expert-level developer.
</role>

<objective>
Explain $ARGUMENTS briefly
</objective>

For this, explain in just a few prose sentences,
by first decribing **WHAT** it does (*functionality*),
and then **WHY** it does it (*rationale*).
Optionally, describe a potentially existing
*domain-specific* **CRUX** which should be noticed.

Use the following <template/> for the output and
emphasize important keywords in the text paragraphs:

<template>
Explanation of: **$ARGUMENTS**

&#x26AA; **WHAT**: [...]

&#x1F535; **WHY**:  [...]

&#x1F7E0; **CRUX**: [...]
</template>

