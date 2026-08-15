import type { App } from 'obsidian';
import { Modal, Notice, setIcon, Setting } from 'obsidian';

import type { FeatureHost } from '../FeatureHost';
import type { SuggestedPrompt } from '../../core/types/settings';
import { t } from '../../i18n/i18n';
import { confirmDelete } from '../../shared/modals/ConfirmModal';

function createSuggestedPromptId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeSuggestedPrompts(value: unknown): SuggestedPrompt[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const prompts: SuggestedPrompt[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
    const prompt = typeof candidate.prompt === 'string' ? candidate.prompt.trim() : '';

    if (id && label && prompt) {
      prompts.push({ id, label, prompt });
    }
  }

  return prompts;
}

class SuggestedPromptModal extends Modal {
  private plugin: FeatureHost;
  private prompt: SuggestedPrompt | null;
  private onSave: (prompt: SuggestedPrompt) => void;

  constructor(
    app: App,
    plugin: FeatureHost,
    prompt: SuggestedPrompt | null,
    onSave: (prompt: SuggestedPrompt) => void,
  ) {
    super(app);
    this.plugin = plugin;
    this.prompt = prompt;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    this.setTitle(this.prompt
      ? t('settings.suggestedPrompts.modal.titleEdit')
      : t('settings.suggestedPrompts.modal.titleAdd')
    );
    this.modalEl.addClass('claudian-suggested-prompt-modal');

    let labelEl: HTMLInputElement;
    let promptEl: HTMLTextAreaElement;

    const save = () => {
      const label = labelEl.value.trim();
      const prompt = promptEl.value.trim();

      if (!label) {
        new Notice(t('settings.suggestedPrompts.labelRequired'));
        return;
      }

      if (!prompt) {
        new Notice(t('settings.suggestedPrompts.promptRequired'));
        return;
      }

      this.onSave({
        id: this.prompt?.id ?? createSuggestedPromptId(),
        label,
        prompt,
      });
      this.close();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.isComposing && e.ctrlKey) {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape' && !e.isComposing) {
        e.preventDefault();
        this.close();
      }
    };

    new Setting(contentEl)
      .setName(t('settings.suggestedPrompts.modal.label'))
      .setDesc(t('settings.suggestedPrompts.modal.labelDesc'))
      .addText((text) => {
        labelEl = text.inputEl;
        text.setValue(this.prompt?.label ?? '');
        labelEl.addEventListener('keydown', handleKeyDown);
      });

    new Setting(contentEl)
      .setName(t('settings.suggestedPrompts.modal.prompt'))
      .setDesc(t('settings.suggestedPrompts.modal.promptDesc'))
      .addTextArea((text) => {
        promptEl = text.inputEl;
        text.setValue(this.prompt?.prompt ?? '');
        promptEl.rows = 6;
        promptEl.addEventListener('keydown', handleKeyDown);
      });

    const buttonContainer = contentEl.createDiv({ cls: 'claudian-suggested-prompt-buttons' });

    const cancelBtn = buttonContainer.createEl('button', {
      text: t('common.cancel'),
      cls: 'claudian-cancel-btn',
    });
    cancelBtn.addEventListener('click', () => this.close());

    const saveBtn = buttonContainer.createEl('button', {
      text: this.prompt ? t('common.save') : t('common.add'),
      cls: 'claudian-save-btn',
    });
    saveBtn.addEventListener('click', () => save());

    window.setTimeout(() => labelEl?.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class SuggestedPromptsManager {
  private containerEl: HTMLElement;
  private plugin: FeatureHost;

  constructor(containerEl: HTMLElement, plugin: FeatureHost) {
    this.containerEl = containerEl;
    this.plugin = plugin;
    this.render();
  }

  private render(): void {
    this.containerEl.empty();

    const headerEl = this.containerEl.createDiv({ cls: 'claudian-suggested-prompts-header' });
    headerEl.createSpan({
      text: t('settings.suggestedPrompts.name'),
      cls: 'claudian-suggested-prompts-label',
    });

    const addBtn = headerEl.createEl('button', {
      cls: 'claudian-settings-action-btn',
      attr: { 'aria-label': t('settings.suggestedPrompts.addBtn') },
    });
    setIcon(addBtn, 'plus');
    addBtn.addEventListener('click', () => {
      this.openAddModal();
    });

    const prompts = normalizeSuggestedPrompts(this.plugin.settings.suggestedPrompts);

    if (prompts.length === 0) {
      const emptyEl = this.containerEl.createDiv({ cls: 'claudian-suggested-prompts-empty' });
      emptyEl.setText(t('settings.suggestedPrompts.noPrompts'));
      return;
    }

    const listEl = this.containerEl.createDiv({ cls: 'claudian-suggested-prompts-list' });

    for (const prompt of prompts) {
      const itemEl = listEl.createDiv({ cls: 'claudian-suggested-prompts-item' });

      const infoEl = itemEl.createDiv({ cls: 'claudian-suggested-prompts-info' });
      const labelEl = infoEl.createDiv({ cls: 'claudian-suggested-prompts-item-label' });
      labelEl.setText(prompt.label);
      const previewEl = infoEl.createDiv({ cls: 'claudian-suggested-prompts-item-preview' });
      previewEl.setText(prompt.prompt);

      const actionsEl = itemEl.createDiv({ cls: 'claudian-suggested-prompts-actions' });

      const editBtn = actionsEl.createEl('button', {
        cls: 'claudian-settings-action-btn',
        attr: { 'aria-label': t('common.edit') },
      });
      setIcon(editBtn, 'pencil');
      editBtn.addEventListener('click', () => {
        this.openEditModal(prompt);
      });

      const deleteBtn = actionsEl.createEl('button', {
        cls: 'claudian-settings-action-btn claudian-settings-delete-btn',
        attr: { 'aria-label': t('common.delete') },
      });
      setIcon(deleteBtn, 'trash-2');
      deleteBtn.addEventListener('click', () => {
        void (async (): Promise<void> => {
          try {
            if (await confirmDelete(
              this.plugin.app,
              t('settings.suggestedPrompts.deleteConfirm', { label: prompt.label })
            )) {
              await this.deletePrompt(prompt);
            }
          } catch {
            new Notice(t('settings.suggestedPrompts.deleteFailed'));
          }
        })();
      });
    }
  }

  private openAddModal(): void {
    const modal = new SuggestedPromptModal(
      this.plugin.app,
      this.plugin,
      null,
      (prompt) => {
        void (async (): Promise<void> => {
          await this.plugin.mutateSettings((settings) => {
            const prompts = normalizeSuggestedPrompts(settings.suggestedPrompts);
            prompts.push(prompt);
            settings.suggestedPrompts = prompts;
          });
          this.render();
          new Notice(t('settings.suggestedPrompts.added', { label: prompt.label }));
        })();
      }
    );
    modal.open();
  }

  private openEditModal(prompt: SuggestedPrompt): void {
    const modal = new SuggestedPromptModal(
      this.plugin.app,
      this.plugin,
      prompt,
      (updated) => {
        void (async (): Promise<void> => {
          await this.plugin.mutateSettings((settings) => {
            const prompts = normalizeSuggestedPrompts(settings.suggestedPrompts);
            const index = prompts.findIndex((p) => p.id === updated.id);
            if (index >= 0) {
              prompts[index] = updated;
            }
            settings.suggestedPrompts = prompts;
          });
          this.render();
          new Notice(t('settings.suggestedPrompts.updated', { label: updated.label }));
        })();
      }
    );
    modal.open();
  }

  private async deletePrompt(prompt: SuggestedPrompt): Promise<void> {
    await this.plugin.mutateSettings((settings) => {
      const prompts = normalizeSuggestedPrompts(settings.suggestedPrompts).filter(
        (p) => p.id !== prompt.id
      );
      settings.suggestedPrompts = prompts;
    });
    this.render();
    new Notice(t('settings.suggestedPrompts.deleted', { label: prompt.label }));
  }
}
