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
  document: Document;
  layout: InlineEditFormLayout;
  onCancel: () => void;
  onSubmit: (values: Record<string, string | boolean>) => void;
}

export function renderInlineEditFormCard(
  container: HTMLElement,
  options: InlineEditFormCardOptions,
): InlineEditFormCardHandle {
  container.replaceChildren();

  const rootEl = options.document.createElement('section');
  rootEl.className = 'claudian-inline-form-card';
  container.appendChild(rootEl);

  const headerEl = options.document.createElement('div');
  headerEl.className = 'claudian-inline-form-card-header';
  rootEl.appendChild(headerEl);

  const titleEl = options.document.createElement('h3');
  titleEl.className = 'claudian-inline-form-card-title';
  titleEl.textContent = options.layout.title;
  headerEl.appendChild(titleEl);

  if (options.layout.description) {
    const descriptionEl = options.document.createElement('p');
    descriptionEl.className = 'claudian-inline-form-card-description';
    descriptionEl.textContent = options.layout.description;
    headerEl.appendChild(descriptionEl);
  }

  const formEl = options.document.createElement('form');
  formEl.className = 'claudian-inline-form';
  rootEl.appendChild(formEl);

  const fieldsetEl = options.document.createElement('fieldset');
  fieldsetEl.className = 'claudian-inline-form-fieldset';
  formEl.appendChild(fieldsetEl);

  for (const section of options.layout.sections) {
    const sectionEl = options.document.createElement('section');
    sectionEl.className = 'claudian-inline-form-section';
    fieldsetEl.appendChild(sectionEl);

    if (section.title || section.description) {
      const sectionHeaderEl = options.document.createElement('div');
      sectionHeaderEl.className = 'claudian-inline-form-section-header';
      sectionEl.appendChild(sectionHeaderEl);

      if (section.title) {
        const sectionTitleEl = options.document.createElement('h4');
        sectionTitleEl.className = 'claudian-inline-form-section-title';
        sectionTitleEl.textContent = section.title;
        sectionHeaderEl.appendChild(sectionTitleEl);
      }

      if (section.description) {
        const sectionDescriptionEl = options.document.createElement('p');
        sectionDescriptionEl.className = 'claudian-inline-form-section-description';
        sectionDescriptionEl.textContent = section.description;
        sectionHeaderEl.appendChild(sectionDescriptionEl);
      }
    }

    const gridEl = options.document.createElement('div');
    const columns = section.columns ?? 1;
    gridEl.className = `claudian-inline-form-grid columns-${columns}`;
    sectionEl.appendChild(gridEl);

    for (const field of section.fields) {
      gridEl.appendChild(createFieldEl(options.document, field));
    }
  }

  const actionsEl = options.document.createElement('div');
  actionsEl.className = 'claudian-inline-form-actions';
  formEl.appendChild(actionsEl);

  const cancelButton = options.document.createElement('button');
  cancelButton.className = 'claudian-inline-form-action secondary';
  cancelButton.type = 'button';
  cancelButton.textContent = options.layout.cancelLabel ?? 'Cancel';
  cancelButton.addEventListener('click', () => options.onCancel());
  actionsEl.appendChild(cancelButton);

  const submitButton = options.document.createElement('button');
  submitButton.className = 'claudian-inline-form-action primary';
  submitButton.type = 'submit';
  submitButton.textContent = options.layout.submitLabel ?? 'Continue';
  actionsEl.appendChild(submitButton);

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

function createFieldEl(document: Document, field: InlineEditFormField): HTMLElement {
  const wrapperEl = document.createElement('div');
  wrapperEl.className = 'claudian-inline-form-field';
  wrapperEl.dataset.fieldType = field.type;
  wrapperEl.dataset.fieldId = field.id;
  if (field.span) {
    wrapperEl.classList.add(`span-${field.span}`);
  }

  if (field.type === 'checkbox') {
    return createCheckboxFieldEl(document, wrapperEl, field);
  }

  const labelEl = document.createElement('label');
  labelEl.className = 'claudian-inline-form-label';
  labelEl.setAttribute('for', field.id);
  labelEl.textContent = field.label;
  wrapperEl.appendChild(labelEl);

  if (field.description) {
    const descriptionEl = document.createElement('div');
    descriptionEl.className = 'claudian-inline-form-field-description';
    descriptionEl.textContent = field.description;
    wrapperEl.appendChild(descriptionEl);
  }

  const controlEl = createControlEl(document, field);
  controlEl.id = field.id;
  controlEl.setAttribute('name', field.id);
  if ('placeholder' in field && field.placeholder) {
    controlEl.setAttribute('placeholder', field.placeholder);
  }
  if (field.required) {
    controlEl.required = true;
  }
  wrapperEl.appendChild(controlEl);

  if (field.helperText) {
    const helperEl = document.createElement('div');
    helperEl.className = 'claudian-inline-form-helper';
    helperEl.textContent = field.helperText;
    wrapperEl.appendChild(helperEl);
  }

  return wrapperEl;
}

function createCheckboxFieldEl(
  document: Document,
  wrapperEl: HTMLElement,
  field: InlineEditCheckboxField,
): HTMLElement {
  wrapperEl.classList.add('is-checkbox');
  const checkboxLabelEl = document.createElement('label');
  checkboxLabelEl.className = 'claudian-inline-form-checkbox-label';
  checkboxLabelEl.setAttribute('for', field.id);
  wrapperEl.appendChild(checkboxLabelEl);

  const inputEl = document.createElement('input');
  inputEl.type = 'checkbox';
  inputEl.id = field.id;
  inputEl.name = field.id;
  inputEl.checked = field.defaultChecked === true;
  checkboxLabelEl.appendChild(inputEl);

  const textWrapEl = document.createElement('span');
  textWrapEl.className = 'claudian-inline-form-checkbox-copy';
  checkboxLabelEl.appendChild(textWrapEl);

  const labelEl = document.createElement('span');
  labelEl.className = 'claudian-inline-form-label';
  labelEl.textContent = field.label;
  textWrapEl.appendChild(labelEl);

  if (field.description) {
    const descriptionEl = document.createElement('span');
    descriptionEl.className = 'claudian-inline-form-field-description';
    descriptionEl.textContent = field.description;
    textWrapEl.appendChild(descriptionEl);
  }

  if (field.helperText) {
    const helperEl = document.createElement('div');
    helperEl.className = 'claudian-inline-form-helper';
    helperEl.textContent = field.helperText;
    wrapperEl.appendChild(helperEl);
  }

  return wrapperEl;
}

function createControlEl(
  document: Document,
  field: Exclude<InlineEditFormField, InlineEditCheckboxField>,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (field.type === 'textarea') {
    const textareaEl = document.createElement('textarea');
    textareaEl.className = 'claudian-inline-form-control is-textarea';
    textareaEl.rows = field.rows ?? 4;
    textareaEl.value = field.defaultValue ?? '';
    return textareaEl;
  }

  if (field.type === 'select') {
    return createSelectEl(document, field);
  }

  const inputEl = document.createElement('input');
  inputEl.className = 'claudian-inline-form-control';
  inputEl.type = 'text';
  inputEl.value = field.defaultValue ?? '';
  return inputEl;
}

function createSelectEl(document: Document, field: InlineEditSelectField): HTMLSelectElement {
  const selectEl = document.createElement('select');
  selectEl.className = 'claudian-inline-form-control';

  if (!field.required) {
    const emptyOptionEl = document.createElement('option');
    emptyOptionEl.value = '';
    emptyOptionEl.textContent = 'Select an option';
    selectEl.appendChild(emptyOptionEl);
  }

  for (const option of field.options) {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    if (option.description) {
      optionEl.title = option.description;
    }
    if (field.defaultValue === option.value) {
      optionEl.selected = true;
    }
    selectEl.appendChild(optionEl);
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
      const selector = `[name="${field.id}"]`;
      const controlEl = fieldsetEl.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
      if (!controlEl) continue;
      values[field.id] = field.type === 'checkbox'
        ? (controlEl as HTMLInputElement).checked
        : controlEl.value;
    }
  }

  return values;
}
