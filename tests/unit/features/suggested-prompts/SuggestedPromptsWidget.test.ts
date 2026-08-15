/** @jest-environment jsdom */

import { SuggestedPromptsWidget } from '@/features/suggested-prompts/SuggestedPromptsWidget';

describe('SuggestedPromptsWidget', () => {
  it('renders a chip for each prompt', () => {
    const prompts = [
      { id: 'a', label: 'Summarize', prompt: 'Summarize this.' },
      { id: 'b', label: 'Refactor', prompt: 'Refactor this.' },
    ];
    const onClick = jest.fn();

    const widget = new SuggestedPromptsWidget(prompts, onClick);
    const dom = widget.toDOM();

    expect(dom.classList.contains('claudian-suggested-prompts-chip-strip')).toBe(true);
    const chips = dom.querySelectorAll('.claudian-suggested-prompts-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toBe('Summarize');
    expect(chips[1].textContent).toBe('Refactor');
  });

  it('calls onClick with the corresponding prompt when a chip is clicked', () => {
    const prompts = [
      { id: 'a', label: 'Summarize', prompt: 'Summarize this.' },
    ];
    const onClick = jest.fn();

    const widget = new SuggestedPromptsWidget(prompts, onClick);
    const dom = widget.toDOM();
    const chip = dom.querySelector('.claudian-suggested-prompts-chip') as HTMLButtonElement;

    const event = new MouseEvent('click', { bubbles: true });
    chip.dispatchEvent(event);

    expect(onClick).toHaveBeenCalledWith(prompts[0]);
  });

  it('returns true from ignoreEvent for non-pointer events', () => {
    const widget = new SuggestedPromptsWidget([], jest.fn());
    expect(widget.ignoreEvent(new Event('keydown'))).toBe(true);
    expect(widget.ignoreEvent(new Event('mousedown'))).toBe(false);
    expect(widget.ignoreEvent(new Event('click'))).toBe(false);
  });

  it('considers widgets equal when prompts match', () => {
    const prompts = [{ id: 'a', label: 'Label', prompt: 'Prompt' }];
    const a = new SuggestedPromptsWidget(prompts, jest.fn());
    const b = new SuggestedPromptsWidget(prompts, jest.fn());
    expect(a.eq(b)).toBe(true);
  });

  it('considers widgets unequal when prompts differ', () => {
    const a = new SuggestedPromptsWidget([{ id: 'a', label: 'Label', prompt: 'Prompt' }], jest.fn());
    const b = new SuggestedPromptsWidget([{ id: 'a', label: 'Label', prompt: 'Changed' }], jest.fn());
    expect(a.eq(b)).toBe(false);
  });
});
