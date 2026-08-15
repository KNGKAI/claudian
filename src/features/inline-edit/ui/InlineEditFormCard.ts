import type {
  InlineEditCheckboxField,
  InlineEditFormField,
  InlineEditFormLayout,
  InlineEditSelectField,
} from '../../../core/providers/types';

export interface InlineEditFormCardHandle {
  destroy(): void;
  setBusy(isBusy: boolean): void;
}

export interface InlineEditFormCardOptions {
  layout: InlineEditFormLayout;
  onCancel: () => void;
  onSubmit: (values: Record<string, string | boolean>) => void;
}

export function renderInlineEditFormCard(
  container: HTMLElement,
  options: InlineEditFormCardOptions,
): InlineEditFormCardHandle {
  container.empty();

  const rootEl = container.createEl('section', { cls: 'claudian-inline-form-card' });

  const headerEl = rootEl.createDiv({ cls: 'claudian-inline-form-card-header' });

  headerEl.createEl('h3', {
    cls: 'claudian-inline-form-card-title',
    text: options.layout.title,
  });

  if (options.layout.description) {
    headerEl.createEl('p', {
      cls: 'claudian-inline-form-card-description',
      text: options.layout.description,
    });
  }

  const formEl = rootEl.createEl('form', { cls: 'claudian-inline-form' });

  const fieldsetEl = formEl.createEl('fieldset', { cls: 'claudian-inline-form-fieldset' });

  for (const section of options.layout.sections) {
    const sectionEl = fieldsetEl.createEl('section', { cls: 'claudian-inline-form-section' });

    if (section.title || section.description) {
      const sectionHeaderEl = sectionEl.createDiv({ cls: 'claudian-inline-form-section-header' });

      if (section.title) {
        sectionHeaderEl.createEl('h4', {
          cls: 'claudian-inline-form-section-title',
          text: section.title,
        });
      }

      if (section.description) {
        sectionHeaderEl.createEl('p', {
          cls: 'claudian-inline-form-section-description',
          text: section.description,
        });
      }
    }

    const columns = section.columns ?? 1;
    const gridEl = sectionEl.createDiv({ cls: `claudian-inline-form-grid columns-${columns}` });

    for (const field of section.fields) {
      createFieldEl(gridEl, field);
    }
  }

  const actionsEl = formEl.createDiv({ cls: 'claudian-inline-form-actions' });

  const cancelButton = actionsEl.createEl('button', {
    cls: 'claudian-inline-form-action secondary',
    text: options.layout.cancelLabel ?? 'Cancel',
  });
  cancelButton.type = 'button';
  cancelButton.addEventListener('click', () => options.onCancel());

  const submitButton = actionsEl.createEl('button', {
    cls: 'claudian-inline-form-action primary',
    text: options.layout.submitLabel ?? 'Continue',
  });
  submitButton.type = 'submit';

  formEl.addEventListener('submit', (event) => {
    event.preventDefault();
    options.onSubmit(collectFormValues(fieldsetEl, options.layout));
  });

  return {
    destroy() {
      rootEl.remove();
    },
    setBusy(isBusy: boolean) {
      fieldsetEl.disabled = isBusy;
      rootEl.classList.toggle('is-busy', isBusy);
    },
  };
}

function createFieldEl(parentEl: HTMLElement, field: InlineEditFormField): HTMLElement {
  const wrapperEl = parentEl.createDiv({ cls: 'claudian-inline-form-field' });
  wrapperEl.dataset.fieldType = field.type;
  wrapperEl.dataset.fieldId = field.id;
  if (field.span) {
    wrapperEl.classList.add(`span-${field.span}`);
  }

  if (field.type === 'checkbox') {
    return createCheckboxFieldEl(wrapperEl, field);
  }

  const labelEl = wrapperEl.createEl('label', { cls: 'claudian-inline-form-label' });
  labelEl.setAttribute('for', field.id);
  labelEl.textContent = field.label;

  if (field.description) {
    wrapperEl.createDiv({
      cls: 'claudian-inline-form-field-description',
      text: field.description,
    });
  }

  const controlEl = createControlEl(wrapperEl, field);
  controlEl.id = field.id;
  controlEl.setAttribute('name', field.id);
  if ('placeholder' in field && field.placeholder) {
    controlEl.setAttribute('placeholder', field.placeholder);
  }
  if (field.required) {
    controlEl.required = true;
  }

  if (field.helperText) {
    wrapperEl.createDiv({
      cls: 'claudian-inline-form-helper',
      text: field.helperText,
    });
  }

  return wrapperEl;
}

function createCheckboxFieldEl(
  wrapperEl: HTMLElement,
  field: InlineEditCheckboxField,
): HTMLElement {
  wrapperEl.classList.add('is-checkbox');
  const checkboxLabelEl = wrapperEl.createEl('label', {
    cls: 'claudian-inline-form-checkbox-label',
  });
  checkboxLabelEl.setAttribute('for', field.id);

  const inputEl = checkboxLabelEl.createEl('input');
  inputEl.type = 'checkbox';
  inputEl.id = field.id;
  inputEl.name = field.id;
  inputEl.checked = field.defaultChecked === true;

  const textWrapEl = checkboxLabelEl.createSpan({ cls: 'claudian-inline-form-checkbox-copy' });

  textWrapEl.createSpan({ cls: 'claudian-inline-form-label', text: field.label });

  if (field.description) {
    textWrapEl.createSpan({
      cls: 'claudian-inline-form-field-description',
      text: field.description,
    });
  }

  if (field.helperText) {
    wrapperEl.createDiv({ cls: 'claudian-inline-form-helper', text: field.helperText });
  }

  return wrapperEl;
}

function createControlEl(
  parentEl: HTMLElement,
  field: Exclude<InlineEditFormField, InlineEditCheckboxField>,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (field.type === 'textarea') {
    const textareaEl = parentEl.createEl('textarea', {
      cls: 'claudian-inline-form-control is-textarea',
    });
    textareaEl.rows = field.rows ?? 4;
    textareaEl.value = field.defaultValue ?? '';
    return textareaEl;
  }

  if (field.type === 'select') {
    return createSelectEl(parentEl, field);
  }

  const inputEl = parentEl.createEl('input', { cls: 'claudian-inline-form-control' });
  inputEl.type = 'text';
  inputEl.value = field.defaultValue ?? '';
  return inputEl;
}

function createSelectEl(parentEl: HTMLElement, field: InlineEditSelectField): HTMLSelectElement {
  const selectEl = parentEl.createEl('select', { cls: 'claudian-inline-form-control' });

  if (!field.required) {
    const emptyOptionEl = selectEl.createEl('option');
    emptyOptionEl.value = '';
    emptyOptionEl.textContent = 'Select an option';
  }

  for (const option of field.options) {
    const optionEl = selectEl.createEl('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    if (option.description) {
      optionEl.title = option.description;
    }
    if (field.defaultValue === option.value) {
      optionEl.selected = true;
    }
  }

  return selectEl;
}

function collectFormValues(
  fieldsetEl: HTMLFieldSetElement,
  layout: InlineEditFormLayout,
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};

  for (const section of layout.sections) {
    for (const field of section.fields) {
      const controlEl = findControlByName(fieldsetEl, field.id);
      if (!controlEl) continue;
      values[field.id] = field.type === 'checkbox'
        ? (controlEl as HTMLInputElement).checked
        : controlEl.value;
    }
  }

  return values;
}

function findControlByName(
  rootEl: HTMLElement,
  fieldName: string,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const attrMatch = rootEl.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `[name="${fieldName}"]`,
  );
  if (attrMatch) {
    return attrMatch;
  }

  const scan = (node: HTMLElement): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null => {
    const currentName = (node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).name
      || node.getAttribute?.('name');
    if (currentName === fieldName) {
      return node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    }
    for (const child of Array.from(node.children)) {
      const found = scan(child as HTMLElement);
      if (found) {
        return found;
      }
    }
    return null;
  };

  return scan(rootEl);
}
