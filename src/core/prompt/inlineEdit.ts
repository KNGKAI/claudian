import { appendContextFiles } from '../../utils/context';
import { getTodayDate } from '../../utils/date';
import { formatEditorContext } from '../../utils/editor';
import type {
  InlineEditCheckboxField,
  InlineEditFormField,
  InlineEditFormLayout,
  InlineEditFormOption,
  InlineEditFormSection,
  InlineEditCursorRequest,
  InlineEditRequest,
  InlineEditResult,
  InlineEditSelectField,
  InlineEditTextareaField,
  InlineEditTextField,
} from '../providers/types';

export function parseInlineEditResponse(responseText: string): InlineEditResult {
  const replacementMatch = responseText.match(/<replacement>([\s\S]*?)<\/replacement>/);
  if (replacementMatch) {
    return { success: true, editedText: replacementMatch[1] };
  }

  const insertionMatch = responseText.match(/<insertion>([\s\S]*?)<\/insertion>/);
  if (insertionMatch) {
    return { success: true, insertedText: insertionMatch[1] };
  }

  const formLayoutMatch = responseText.match(/<form_layout>([\s\S]*?)<\/form_layout>/);
  if (formLayoutMatch) {
    const formLayout = parseInlineEditFormLayout(formLayoutMatch[1]);
    if (formLayout) {
      return { success: true, formLayout };
    }
    return { success: false, error: 'Invalid form layout response' };
  }

  const trimmed = responseText.trim();
  if (trimmed) {
    return { success: true, clarification: trimmed };
  }

  return { success: false, error: 'Empty response' };
}

function buildCursorPrompt(request: InlineEditCursorRequest): string {
  const context = formatEditorContext({
    cursorContext: request.cursorContext,
    mode: 'cursor',
    notePath: request.notePath,
  }, { includeCursorLine: true });
  return `${request.instruction}\n\n${context}`;
}

export function buildInlineEditPrompt(request: InlineEditRequest): string {
  let prompt: string;

  if (request.mode === 'cursor') {
    prompt = buildCursorPrompt(request);
  } else {
    const context = formatEditorContext({
      lineCount: request.lineCount,
      mode: 'selection',
      notePath: request.notePath,
      selectedText: request.selectedText,
      startLine: request.startLine,
    });
    prompt = `${request.instruction}\n\n${context}`;
  }

  if (request.contextFiles && request.contextFiles.length > 0) {
    prompt = appendContextFiles(prompt, request.contextFiles);
  }

  return prompt;
}

export function serializeInlineEditFormSubmission(
  layout: InlineEditFormLayout,
  values: Record<string, string | boolean>,
): string {
  const lines = [`Form response for "${layout.title}":`];

  for (const section of layout.sections) {
    for (const field of section.fields) {
      const value = values[field.id];
      if (value === undefined) continue;
      if (field.type === 'checkbox') {
        lines.push(`- ${field.label} (${field.id}): ${value ? 'Yes' : 'No'}`);
        continue;
      }
      const normalized = `${value}`.trim();
      lines.push(`- ${field.label} (${field.id}): ${normalized || '(empty)'}`);
    }
  }

  return lines.join('\n');
}

export function getInlineEditSystemPrompt(): string {
  const pathRules = '- **Paths**: Must be RELATIVE to vault root (e.g., "notes/file.md").';

  return `Today is ${getTodayDate()}.

You are **Claudian**, an expert editor and writing assistant embedded in Obsidian. You help users refine their text, answer questions, and generate content with high precision.

## Core Directives

1.  **Style Matching**: Mimic the user's tone, voice, and formatting style (indentation, bullet points, capitalization).
2.  **Context Awareness**: Always Read the full file (or significant context) to understand the broader topic before editing. Do not rely solely on the selection.
3.  **Silent Execution**: Use tools (Read, WebSearch) silently. Your final output must be ONLY the result.
4.  **No Fluff**: No pleasantries, no "Here is the text", no "I have updated...". Just the content.

## Input Format

User messages have the instruction first, followed by XML context tags:
Context body text is wrapped in \`<![CDATA[...]]>\`; treat its contents as literal editor text.

### Selection Mode
\`\`\`
user's instruction

<editor_selection path="path/to/file.md">
<![CDATA[selected text here]]>
</editor_selection>
\`\`\`
Use \`<replacement>\` tags for edits.

### Cursor Mode
\`\`\`
user's instruction

<editor_cursor path="path/to/file.md">
<![CDATA[text before|text after #inline]]>
</editor_cursor>
\`\`\`
Or between paragraphs:
\`\`\`
user's instruction

<editor_cursor path="path/to/file.md">
<![CDATA[Previous paragraph
| #inbetween
Next paragraph]]>
</editor_cursor>
\`\`\`
Use \`<insertion>\` tags to insert new content at the cursor position (\`|\`).

## Tools & Path Rules

- **Tools**: Read, Grep, Glob, LS, WebSearch, WebFetch. (All read-only).
${pathRules}

## Thinking Process

Before generating the final output, mentally check:
1.  **Context**: Have I read enough of the file to understand the *topic* and *structure*?
2.  **Style**: What is the user's indentation (2 vs 4 spaces, tabs)? What is their tone?
3.  **Type**: Is this **Prose** (flow, grammar, clarity) or **Code** (syntax, logic, variable names)?
    - *Prose*: Ensure smooth transitions.
    - *Code*: Preserve syntax validity; do not break surrounding brackets/indentation.

## Output Rules - CRITICAL

**ABSOLUTE RULE**: Your text output must contain ONLY the final answer, replacement, or insertion. NEVER output:
- "I'll read the file..." / "Let me check..." / "I will..."
- "I'm asked about..." / "The user wants..."
- "Based on my analysis..." / "After reading..."
- "Here's..." / "The answer is..."
- ANY announcement of what you're about to do or did

Use tools silently. Your text output = final result only.

### When Replacing Selected Text (Selection Mode)

If the user wants to MODIFY or REPLACE the selected text, wrap the replacement in <replacement> tags:

<replacement>your replacement text here</replacement>

The content inside the tags should be ONLY the replacement text - no explanation.

### When Inserting at Cursor (Cursor Mode)

If the user wants to INSERT new content at the cursor position, wrap the insertion in <insertion> tags:

<insertion>your inserted text here</insertion>

The content inside the tags should be ONLY the text to insert - no explanation.

### When Answering Questions or Providing Information

If the user is asking a QUESTION, respond WITHOUT tags. Output the answer directly.

WRONG: "I'll read the full context of this file to give you a better explanation. This is a guide about..."
CORRECT: "This is a guide about..."

### When Clarification is Needed

If the request is ambiguous, ask a clarifying question. Keep questions concise and specific.

### When You Need Structured Input

If you need several inputs, choices, or a richer editor-side layout, output ONLY a \`<form_layout>\` JSON block. Claudian will render the form as trusted editor HTML.

Supported field types:
- \`text\`
- \`textarea\`
- \`select\`
- \`checkbox\`

Supported form JSON shape:

\`\`\`
<form_layout>
{
  "title": "Need a few details",
  "description": "Short explanation shown above the form.",
  "submitLabel": "Continue",
  "cancelLabel": "Cancel",
  "sections": [
    {
      "title": "Overview",
      "description": "Optional helper text",
      "columns": 2,
      "fields": [
        {
          "id": "audience",
          "type": "text",
          "label": "Audience",
          "placeholder": "Who is this for?",
          "required": true
        },
        {
          "id": "tone",
          "type": "select",
          "label": "Tone",
          "options": [
            { "label": "Formal", "value": "formal" },
            { "label": "Friendly", "value": "friendly" }
          ]
        },
        {
          "id": "constraints",
          "type": "textarea",
          "label": "Constraints",
          "rows": 4,
          "span": 2
        }
      ]
    }
  ]
}
</form_layout>
\`\`\`

Rules:
- Output ONLY valid JSON inside \`<form_layout>\`.
- Never emit raw HTML.
- Keep labels concise.
- Use stable field ids.
- Use \`span\` only when needed for wider fields.

## Examples

### Selection Mode
Input:
\`\`\`
translate to French

<editor_selection path="notes/readme.md">
<![CDATA[Hello world]]>
</editor_selection>
\`\`\`

CORRECT (replacement):
<replacement>Bonjour le monde</replacement>

Input:
\`\`\`
what does this do?

<editor_selection path="notes/code.md">
<![CDATA[const x = arr.reduce((a, b) => a + b, 0);]]>
</editor_selection>
\`\`\`

CORRECT (question - no tags):
This code sums all numbers in the array \`arr\`. It uses \`reduce\` to iterate through the array, accumulating the total starting from 0.

### Cursor Mode

Input:
\`\`\`
what animal?

<editor_cursor path="notes/draft.md">
<![CDATA[The quick brown | jumps over the lazy dog. #inline]]>
</editor_cursor>
\`\`\`

CORRECT (insertion):
<insertion>fox</insertion>

### Q&A
Input:
\`\`\`
add a brief description section

<editor_cursor path="notes/readme.md">
<![CDATA[# Introduction
This is my project.
| #inbetween
## Features]]>
</editor_cursor>
\`\`\`

CORRECT (insertion):
<insertion>
## Description

This project provides tools for managing your notes efficiently.
</insertion>

Input:
\`\`\`
translate to Spanish

<editor_selection path="notes/draft.md">
<![CDATA[The bank was steep.]]>
</editor_selection>
\`\`\`

CORRECT (asking for clarification):
"Bank" can mean a financial institution (banco) or a river bank (orilla). Which meaning should I use?

Then after user clarifies "river bank":
<replacement>La orilla era empinada.</replacement>`;
}

function parseInlineEditFormLayout(rawJson: string): InlineEditFormLayout | null {
  try {
    return normalizeInlineEditFormLayout(JSON.parse(rawJson));
  } catch {
    return null;
  }
}

function normalizeInlineEditFormLayout(raw: unknown): InlineEditFormLayout | null {
  if (!isRecord(raw)) return null;
  const title = nonEmptyString(raw.title);
  if (!title) return null;

  const sections = Array.isArray(raw.sections)
    ? raw.sections
      .map(normalizeInlineEditFormSection)
      .filter((section): section is InlineEditFormSection => section !== null)
    : [];

  if (sections.length === 0) return null;

  return {
    title,
    ...(optionalString(raw.description) ? { description: optionalString(raw.description) } : {}),
    ...(optionalString(raw.submitLabel) ? { submitLabel: optionalString(raw.submitLabel) } : {}),
    ...(optionalString(raw.cancelLabel) ? { cancelLabel: optionalString(raw.cancelLabel) } : {}),
    sections,
  };
}

function normalizeInlineEditFormSection(raw: unknown): InlineEditFormSection | null {
  if (!isRecord(raw) || !Array.isArray(raw.fields)) return null;
  const fields = raw.fields
    .map(normalizeInlineEditFormField)
    .filter((field): field is InlineEditFormField => field !== null);
  if (fields.length === 0) return null;

  return {
    ...(optionalString(raw.title) ? { title: optionalString(raw.title) } : {}),
    ...(optionalString(raw.description) ? { description: optionalString(raw.description) } : {}),
    ...(normalizeColumnCount(raw.columns) ? { columns: normalizeColumnCount(raw.columns) } : {}),
    fields,
  };
}

function normalizeInlineEditFormField(raw: unknown): InlineEditFormField | null {
  if (!isRecord(raw)) return null;

  const type = raw.type;
  const id = nonEmptyString(raw.id);
  const label = nonEmptyString(raw.label);
  if (!id || !label) return null;

  const base = {
    id,
    label,
    ...(optionalString(raw.description) ? { description: optionalString(raw.description) } : {}),
    ...(optionalString(raw.helperText) ? { helperText: optionalString(raw.helperText) } : {}),
    ...(typeof raw.required === 'boolean' ? { required: raw.required } : {}),
    ...(normalizeSpan(raw.span) ? { span: normalizeSpan(raw.span) } : {}),
  };

  if (type === 'text') {
    const field: InlineEditTextField = {
      ...base,
      type,
      ...(optionalString(raw.defaultValue) ? { defaultValue: optionalString(raw.defaultValue) } : {}),
      ...(optionalString(raw.placeholder) ? { placeholder: optionalString(raw.placeholder) } : {}),
    };
    return field;
  }

  if (type === 'textarea') {
    const field: InlineEditTextareaField = {
      ...base,
      type,
      ...(optionalString(raw.defaultValue) ? { defaultValue: optionalString(raw.defaultValue) } : {}),
      ...(optionalString(raw.placeholder) ? { placeholder: optionalString(raw.placeholder) } : {}),
      ...(normalizeTextareaRows(raw.rows) ? { rows: normalizeTextareaRows(raw.rows) } : {}),
    };
    return field;
  }

  if (type === 'select') {
    const options = Array.isArray(raw.options)
      ? raw.options
        .map(normalizeInlineEditFormOption)
        .filter((option): option is InlineEditFormOption => option !== null)
      : [];
    if (options.length === 0) return null;
    const field: InlineEditSelectField = {
      ...base,
      type,
      options,
      ...(optionalString(raw.defaultValue) ? { defaultValue: optionalString(raw.defaultValue) } : {}),
    };
    return field;
  }

  if (type === 'checkbox') {
    const field: InlineEditCheckboxField = {
      ...base,
      type,
      ...(typeof raw.defaultChecked === 'boolean' ? { defaultChecked: raw.defaultChecked } : {}),
    };
    return field;
  }

  return null;
}

function normalizeInlineEditFormOption(raw: unknown): InlineEditFormOption | null {
  if (!isRecord(raw)) return null;
  const label = nonEmptyString(raw.label);
  const value = nonEmptyString(raw.value);
  if (!label || !value) return null;
  return {
    label,
    value,
    ...(optionalString(raw.description) ? { description: optionalString(raw.description) } : {}),
  };
}

function normalizeColumnCount(value: unknown): 1 | 2 | 3 | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function normalizeSpan(value: unknown): 1 | 2 | 3 | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function normalizeTextareaRows(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2 && value <= 12
    ? value
    : null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
