import {
  buildInlineEditPrompt,
  parseInlineEditResponse,
  serializeInlineEditFormSubmission,
} from '@/core/prompt/inlineEdit';

describe('buildInlineEditPrompt', () => {
  it('serializes selection paths and bodies with canonical XML', () => {
    const prompt = buildInlineEditPrompt({
      instruction: 'Explain this',
      mode: 'selection',
      notePath: 'notes/"draft" & plan.md',
      selectedText: 'if (a < b && marker === "]]>") {\n</editor_selection>\n}',
      startLine: 2,
      lineCount: 3,
    });

    expect(prompt).toBe(
      'Explain this\n\n<editor_selection path="notes/&quot;draft&quot; &amp; plan.md" lines="2-4">\n<![CDATA[if (a < b && marker === "]]]]><![CDATA[>") {\n</editor_selection>\n}]]>\n</editor_selection>',
    );
  });

  it('preserves inline-edit cursor line metadata', () => {
    const prompt = buildInlineEditPrompt({
      instruction: 'Continue',
      mode: 'cursor',
      notePath: 'notes/"draft".md',
      cursorContext: {
        beforeCursor: 'left < right',
        afterCursor: ' && done',
        isInbetween: false,
        line: 4,
        column: 5,
      },
    });

    expect(prompt).toBe(
      'Continue\n\n<editor_cursor path="notes/&quot;draft&quot;.md" line="5">\n<![CDATA[left < right| && done #inline]]>\n</editor_cursor>',
    );
  });
});

describe('parseInlineEditResponse', () => {
  it('parses structured form layouts', () => {
    const result = parseInlineEditResponse(`<form_layout>
{
  "title": "Need more details",
  "description": "Answer these questions",
  "submitLabel": "Continue",
  "sections": [
    {
      "title": "Brief",
      "columns": 2,
      "fields": [
        {
          "id": "audience",
          "type": "text",
          "label": "Audience",
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
          "id": "ship",
          "type": "checkbox",
          "label": "Ready to ship"
        }
      ]
    }
  ]
}
</form_layout>`);

    expect(result).toEqual({
      success: true,
      formLayout: {
        title: 'Need more details',
        description: 'Answer these questions',
        submitLabel: 'Continue',
        sections: [
          {
            title: 'Brief',
            columns: 2,
            fields: [
              {
                id: 'audience',
                label: 'Audience',
                required: true,
                type: 'text',
              },
              {
                id: 'tone',
                label: 'Tone',
                options: [
                  { label: 'Formal', value: 'formal' },
                  { label: 'Friendly', value: 'friendly' },
                ],
                type: 'select',
              },
              {
                id: 'ship',
                label: 'Ready to ship',
                type: 'checkbox',
              },
            ],
          },
        ],
      },
    });
  });
});

describe('serializeInlineEditFormSubmission', () => {
  it('serializes text, select, and checkbox values for follow-up turns', () => {
    expect(serializeInlineEditFormSubmission({
      title: 'Need more details',
      sections: [
        {
          fields: [
            { id: 'audience', label: 'Audience', type: 'text' },
            {
              id: 'tone',
              label: 'Tone',
              type: 'select',
              options: [{ label: 'Formal', value: 'formal' }],
            },
            { id: 'ship', label: 'Ready to ship', type: 'checkbox' },
          ],
        },
      ],
    }, {
      audience: 'Developers',
      ship: true,
      tone: 'formal',
    })).toBe(
      'Form response for "Need more details":\n'
      + '- Audience (audience): Developers\n'
      + '- Tone (tone): formal\n'
      + '- Ready to ship (ship): Yes',
    );
  });
});
