/** @jest-environment jsdom */

import { createMockEl } from '@test/helpers/MockElement';

import { normalizeSuggestedPrompts, SuggestedPromptsManager } from '@/features/suggested-prompts/SuggestedPromptsManager';
import { t } from '@/i18n/i18n';

jest.mock('@/i18n/i18n', () => ({
  t: jest.fn((key: string, params?: Record<string, string>) => {
    if (params) {
      return `${key}:${Object.values(params).join(',')}`;
    }
    return key;
  }),
  setLocale: jest.fn(),
  getAvailableLocales: jest.fn().mockReturnValue(['en']),
  getLocaleDisplayName: jest.fn().mockReturnValue('English'),
}));

jest.mock('obsidian', () => ({
  ...jest.requireActual('obsidian'),
  setIcon: jest.fn(),
  Notice: jest.fn(),
  Modal: class {},
  Setting: class {
    setName = jest.fn().mockReturnThis();
    setDesc = jest.fn().mockReturnThis();
    addText = jest.fn().mockReturnThis();
    addTextArea = jest.fn().mockReturnThis();
  },
}));

jest.mock('@/shared/modals/ConfirmModal', () => ({
  confirmDelete: jest.fn().mockResolvedValue(true),
}));

describe('normalizeSuggestedPrompts', () => {
  it('returns an empty array for non-arrays', () => {
    expect(normalizeSuggestedPrompts(null)).toEqual([]);
    expect(normalizeSuggestedPrompts('x')).toEqual([]);
    expect(normalizeSuggestedPrompts({})).toEqual([]);
  });

  it('filters out invalid entries', () => {
    const result = normalizeSuggestedPrompts([
      { id: 'a', label: 'A', prompt: 'Prompt A' },
      { id: 'b', label: '', prompt: 'Missing label' },
      { id: 'c', label: 'C', prompt: '' },
      null,
      'invalid',
    ]);

    expect(result).toEqual([{ id: 'a', label: 'A', prompt: 'Prompt A' }]);
  });
});

describe('SuggestedPromptsManager', () => {
  function createContainer(): HTMLElement {
    return createMockEl('div');
  }

  function createPlugin(initialPrompts: unknown[] = []): {
    app: { workspace: { getLeavesOfType: jest.Mock } };
    settings: { suggestedPrompts: unknown[] };
    mutateSettings: jest.Mock;
  } {
    return {
      app: { workspace: { getLeavesOfType: jest.fn().mockReturnValue([]) } },
      settings: { suggestedPrompts: initialPrompts },
      mutateSettings: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('renders an empty state when there are no prompts', () => {
    const container = createContainer();
    const plugin = createPlugin();

    new SuggestedPromptsManager(container, plugin as any);

    expect(container.querySelector('.claudian-suggested-prompts-empty')).not.toBeNull();
    expect(t).toHaveBeenCalledWith('settings.suggestedPrompts.noPrompts');
  });

  it('renders a list item for each prompt', () => {
    const container = createContainer();
    const plugin = createPlugin([
      { id: 'a', label: 'Summarize', prompt: 'Summarize this.' },
      { id: 'b', label: 'Refactor', prompt: 'Refactor this.' },
    ]);

    new SuggestedPromptsManager(container, plugin as any);

    const items = container.querySelectorAll('.claudian-suggested-prompts-item');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.claudian-suggested-prompts-item-label')?.textContent).toBe('Summarize');
  });
});
