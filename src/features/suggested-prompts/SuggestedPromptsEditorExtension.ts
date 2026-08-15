import { type Extension } from '@codemirror/state';
import type {
  EditorView,
  WidgetType} from '@codemirror/view';
import {
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate
} from '@codemirror/view';

import type { SuggestedPrompt } from '../../core/types/settings';
import { type SuggestedPromptClickHandler,SuggestedPromptsWidget } from './SuggestedPromptsWidget';

const SHOW_SUGGESTED_PROMPTS_CLASS = 'claudian-suggested-prompts-visible';

interface SuggestedPromptsEditorExtensionOptions {
  getPrompts: () => SuggestedPrompt[];
  onPromptClick: SuggestedPromptClickHandler;
}

function buildDecorations(
  view: EditorView,
  prompts: SuggestedPrompt[],
  widget: WidgetType,
): DecorationSet {
  if (prompts.length === 0) {
    return Decoration.none;
  }

  const { state } = view;
  const decorations: ReturnType<Decoration['range']>[] = [];

  for (const { from, to } of state.selection.ranges) {
    if (from !== to) {
      continue;
    }

    const line = state.doc.lineAt(from);
    const isEmptyLine = line.text.trim().length === 0;
    if (!isEmptyLine) {
      continue;
    }

    const pos = line.to;
    decorations.push(
      Decoration.widget({
        widget,
        block: false,
        side: 1,
      }).range(pos),
    );
  }

  return Decoration.set(decorations);
}

function createViewPlugin(options: SuggestedPromptsEditorExtensionOptions): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private widget: SuggestedPromptsWidget;

      constructor(view: EditorView) {
        this.widget = new SuggestedPromptsWidget(options.getPrompts(), options.onPromptClick);
        this.decorations = buildDecorations(view, options.getPrompts(), this.widget);
        this.updateEditorClass(view);
      }

      update(update: ViewUpdate) {
        const prompts = options.getPrompts();
        const shouldRebuild = update.docChanged
          || update.selectionSet
          || !this.widget.eq(new SuggestedPromptsWidget(prompts, options.onPromptClick));

        if (shouldRebuild) {
          this.widget = new SuggestedPromptsWidget(prompts, options.onPromptClick);
          this.decorations = buildDecorations(update.view, prompts, this.widget);
        }

        this.updateEditorClass(update.view);
      }

      private updateEditorClass(view: EditorView) {
        const hasDecorations = this.decorations.size > 0;
        view.dom.classList.toggle(SHOW_SUGGESTED_PROMPTS_CLASS, hasDecorations);
      }

      destroy() {
        this.decorations = Decoration.none;
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  );
}

export function buildSuggestedPromptsEditorExtension(
  options: SuggestedPromptsEditorExtensionOptions,
): Extension {
  return createViewPlugin(options);
}
