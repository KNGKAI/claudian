import { Text } from '@codemirror/state';
import { createMockEl } from '@test/helpers/MockElement';
import { Notice } from 'obsidian';

import { ProviderRegistry } from '@/core/providers/ProviderRegistry';
import { InlineEditSession } from '@/features/inline-edit/ui/InlineEditModal';

jest.mock('@/shared/components/SelectionHighlight', () => ({
  hideSelectionHighlight: jest.fn(),
  showSelectionHighlight: jest.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createSession() {
  const sourceDoc = Text.of(['hello']);
  const editorView: any = {
    dispatch: jest.fn(),
    dom: createMockEl(),
    focus: jest.fn(),
    state: { doc: sourceDoc },
  };
  const editor = {
    getCursor: jest.fn((which: string) => which === 'from'
      ? { line: 0, ch: 0 }
      : { line: 0, ch: 5 }),
    getSelection: jest.fn(() => 'hello'),
    replaceRange: jest.fn(),
  };
  const service = {
    cancel: jest.fn(),
    continueConversation: jest.fn(),
    editText: jest.fn(),
    resetConversation: jest.fn(),
    setModelOverride: jest.fn(),
  };
  jest.spyOn(ProviderRegistry, 'createInlineEditService').mockReturnValue(service as any);
  const resolve = jest.fn();
  const plugin: any = {
    providerHost: {},
    settings: { hiddenProviderCommands: {} },
    getView: jest.fn(() => null),
  };
  const app: any = {
    metadataCache: {},
    vault: { getMarkdownFiles: jest.fn(() => []) },
  };
  const session = new InlineEditSession(
    app,
    plugin,
    editorView,
    editor as any,
    { mode: 'selection', selectedText: 'hello' },
    'note.md',
    () => [],
    resolve,
    { providerId: 'claude' },
  );
  Object.assign(session as any, {
    editedText: 'world',
    sourceSnapshot: { doc: sourceDoc, from: 0, to: 5, text: 'hello' },
  });
  return { editor, editorView, resolve, service, session, sourceDoc };
}

function findNamedControl(root: any, name: string): any {
  if (!root) return null;
  if (root.name === name || root.getAttribute?.('name') === name) return root;
  for (const child of root.children ?? []) {
    const found = findNamedControl(child, name);
    if (found) return found;
  }
  return null;
}

function findTag(root: any, tagName: string): any {
  if (!root) return null;
  if (root.tagName === tagName) return root;
  for (const child of root.children ?? []) {
    const found = findTag(child, tagName);
    if (found) return found;
  }
  return null;
}

describe('InlineEditSession', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refuses a result when the captured source document changed', () => {
    const { editor, editorView, resolve, session } = createSession();
    editorView.state.doc = Text.of(['HELLO']);

    session.accept();

    expect(editor.replaceRange).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledWith({ decision: 'reject' });
    expect(Notice).toHaveBeenCalledWith(
      'Inline edit was not applied because the source document or selection changed.',
    );
  });

  it('settles, edits, and focuses only once', () => {
    const { editor, editorView, resolve, session } = createSession();

    session.accept();
    session.accept();
    session.reject();

    expect(editor.replaceRange).toHaveBeenCalledTimes(1);
    expect(editorView.focus).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith({ decision: 'accept', editedText: 'world' });
  });

  it('scopes keyboard handling to its preview or editor DOM', () => {
    const { editorView, session } = createSession();
    const preview = createMockEl();
    const previewChild = createMockEl('button');
    const outside = createMockEl();
    preview.appendChild(previewChild);
    (session as any).containerEl = preview;

    expect((session as any).isKeyboardEventInContext({ target: previewChild })).toBe(true);
    expect((session as any).isKeyboardEventInContext({ target: editorView.dom })).toBe(true);
    expect((session as any).isKeyboardEventInContext({ target: outside })).toBe(false);
  });

  it('ignores a provider result that arrives after the session is rejected', async () => {
    const { editorView, resolve, service, session } = createSession();
    const result = createDeferred<{ success: true; editedText: string }>();
    service.editText.mockReturnValue(result.promise);
    Object.assign(session as any, {
      editedText: null,
      inputEl: Object.assign(createMockEl('input'), { value: 'rewrite' }),
      spinnerEl: createMockEl(),
    });

    const generation = (session as any).generate();
    await Promise.resolve();
    session.reject();
    editorView.dispatch.mockClear();
    result.resolve({ success: true, editedText: 'world' });
    await generation;

    expect(editorView.dispatch).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith({ decision: 'reject' });
  });

  it('rejects a provider result before previewing when its source snapshot changed', async () => {
    const { editorView, resolve, service, session } = createSession();
    const result = createDeferred<{ success: true; editedText: string }>();
    service.editText.mockReturnValue(result.promise);
    const showDiff = jest.fn();
    Object.assign(session as any, {
      editedText: null,
      inputEl: Object.assign(createMockEl('input'), { value: 'rewrite' }),
      showDiffInPlace: showDiff,
      spinnerEl: createMockEl(),
    });

    const generation = (session as any).generate();
    await Promise.resolve();
    editorView.state.doc = Text.of(['changed']);
    result.resolve({ success: true, editedText: 'world' });
    await generation;

    expect(showDiff).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledWith({ decision: 'reject' });
    expect(Notice).toHaveBeenCalledWith(
      'Inline edit was not applied because the source document or selection changed.',
    );
  });

  it('leaves clarification mode after provider continuity is invalidated', async () => {
    const { service, session } = createSession();
    service.continueConversation.mockResolvedValue({
      error: 'The provider environment changed. Start a new inline edit.',
      resetRequired: true,
      success: false,
    });
    const inputEl = Object.assign(createMockEl('input'), {
      disabled: false,
      focus: jest.fn(),
      placeholder: '',
      value: 'continue',
    });
    Object.assign(session as any, {
      inputEl,
      isConversing: true,
      spinnerEl: createMockEl(),
    });

    await (session as any).generate();

    expect((session as any).isConversing).toBe(false);
    expect(inputEl.placeholder).toContain('provider environment changed');
  });

  it('renders a trusted editor form card and continues the conversation with submitted values', async () => {
    const { service, session } = createSession();
    service.editText.mockResolvedValueOnce({
      formLayout: {
        title: 'Need more details',
        submitLabel: 'Continue',
        sections: [
          {
            columns: 2,
            fields: [
              { id: 'audience', label: 'Audience', type: 'text', required: true },
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
      },
      success: true,
    });
    service.continueConversation.mockResolvedValueOnce({
      editedText: 'world',
      success: true,
    });

    const originalDocument = (global as any).document;
    const mockDocument = {
      body: createMockEl('body'),
      createElement: (tagName: string) => createMockEl(tagName),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    (global as any).document = mockDocument;

    try {
      const inputEl = Object.assign(createMockEl('input'), {
        disabled: false,
        focus: jest.fn(),
        value: 'rewrite',
      });
      const spinnerEl = createMockEl();
      const containerEl = createMockEl();
      const inputWrapEl = createMockEl();
      const agentReplyEl = createMockEl();
      const formHostEl = createMockEl();
      containerEl.appendChild(inputWrapEl);
      containerEl.appendChild(agentReplyEl);
      containerEl.appendChild(formHostEl);
      Object.assign(session as any, {
        agentReplyEl,
        containerEl,
        formHostEl,
        inputEl,
        inputWrapEl,
        spinnerEl,
      });

      await (session as any).generate();

      expect(formHostEl.querySelector('.claudian-inline-form-card')).not.toBeNull();

      const audienceInput = findNamedControl(formHostEl, 'audience');
      const toneSelect = findNamedControl(formHostEl, 'tone');
      const shipCheckbox = findNamedControl(formHostEl, 'ship');
      const formEl = findTag(formHostEl, 'FORM');
      expect(audienceInput).not.toBeNull();
      expect(toneSelect).not.toBeNull();
      expect(shipCheckbox).not.toBeNull();
      expect(formEl).not.toBeNull();

      audienceInput.value = 'Developers';
      toneSelect.value = 'formal';
      shipCheckbox.checked = true;
      formEl.dispatchEvent({ preventDefault: jest.fn(), type: 'submit' });
      await Promise.resolve();

      expect(service.continueConversation).toHaveBeenCalledWith(
        'Form response for "Need more details":\n'
          + '- Audience (audience): Developers\n'
          + '- Tone (tone): formal\n'
          + '- Ready to ship (ship): Yes',
        [],
      );
    } finally {
      (global as any).document = originalDocument;
    }
  });
});
