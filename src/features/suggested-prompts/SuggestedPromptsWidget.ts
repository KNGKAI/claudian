import { WidgetType } from '@codemirror/view';

import type { SuggestedPrompt } from '../../core/types/settings';

export type SuggestedPromptClickHandler = (prompt: SuggestedPrompt) => void;

export class SuggestedPromptsWidget extends WidgetType {
  private prompts: SuggestedPrompt[];
  private onClick: SuggestedPromptClickHandler;

  constructor(prompts: SuggestedPrompt[], onClick: SuggestedPromptClickHandler) {
    super();
    this.prompts = prompts;
    this.onClick = onClick;
  }

  toDOM(): HTMLElement {
    const container = createDiv();
    container.className = 'claudian-suggested-prompts-chip-strip';
    container.setAttribute('role', 'list');
    container.setAttribute('aria-label', 'Suggested prompts');

    for (const prompt of this.prompts) {
      const chip = createEl('button');
      chip.className = 'claudian-suggested-prompts-chip';
      chip.type = 'button';
      chip.textContent = prompt.label;
      chip.setAttribute('role', 'listitem');
      chip.setAttribute('aria-label', `Send prompt: ${prompt.label}`);
      chip.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onClick(prompt);
      });
      container.appendChild(chip);
    }

    return container;
  }

  eq(other: SuggestedPromptsWidget): boolean {
    if (this.prompts.length !== other.prompts.length) {
      return false;
    }

    for (let i = 0; i < this.prompts.length; i++) {
      const a = this.prompts[i];
      const b = other.prompts[i];
      if (a.id !== b.id || a.label !== b.label || a.prompt !== b.prompt) {
        return false;
      }
    }

    return true;
  }

  ignoreEvent(event: Event): boolean {
    return event.type !== 'mousedown' && event.type !== 'click';
  }
}
