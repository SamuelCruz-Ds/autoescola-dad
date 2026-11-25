export const escape = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
export const number = (value: number): string =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const now = (): string => `${today()}T${new Date().toTimeString().slice(0, 5)}`;
export const date = (value: string): string => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '—';
};
export const time = (value: string): string => value.slice(11, 16);
export const datetime = (value: string): string => `${date(value)} ${time(value)}`;
export const dateInput = (value: string): string => value.replace(' ', 'T').slice(0, 16);
export const monthStart = (): string => `${today().slice(0, 7)}-01`;
export const monthEnd = (): string => {
  const d = new Date(`${today()}T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const shiftDate = (value: string, amount: number): string => {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const badge = (label: string, tone = 'neutral'): string =>
  `<span class="status status-${escape(tone)}">${escape(label)}</span>`;
export const empty = (text: string): string =>
  `<div class="empty-state"><span class="empty-mark" aria-hidden="true">—</span><p>${escape(text)}</p></div>`;
export const panel = (title: string, content: string, actions = ''): string =>
  `<section class="panel"><div class="panel-heading"><h2>${escape(title)}</h2>${actions}</div>${content}</section>`;
export const action = (label: string, attrs: string, primary = false): string =>
  `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-outline-secondary'} btn-sm" ${attrs}>${escape(label)}</button>`;
export const table = (headers: string[], rows: string[], label = 'Registros'): string =>
  rows.length
    ? `<div class="table-responsive"><table class="table app-table align-middle"><caption class="visually-hidden">${escape(label)}</caption><thead><tr>${headers.map((h) => `<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
    : empty('Nenhum registro encontrado para esta consulta.');
export const td = (...values: string[]): string =>
  `<tr>${values.map((v) => `<td>${v}</td>`).join('')}</tr>`;
export const options = (
  items: { id: string; name: string }[],
  selected = '',
  blank = 'Selecione',
): string =>
  `<option value="">${escape(blank)}</option>${items.map((i) => `<option value="${escape(i.id)}" ${i.id === selected ? 'selected' : ''}>${escape(i.name)}</option>`).join('')}`;
export interface Field {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  help?: string;
  options?: string;
  min?: string | number;
  max?: string | number;
  step?: string;
  wide?: boolean;
  readonly?: boolean;
}
let controlSequence = 0;
let dialogSequence = 0;
export function field(f: Field): string {
  const id = `field-${f.name}-${++controlSequence}`;
  const attrs = `id="${escape(id)}" name="${escape(f.name)}" ${f.required ? 'required' : ''} ${f.readonly ? 'readonly' : ''} ${f.min !== undefined ? `min="${escape(f.min)}"` : ''} ${f.max !== undefined ? `max="${escape(f.max)}"` : ''} ${f.step ? `step="${escape(f.step)}"` : ''} ${f.help ? `aria-describedby="${escape(id)}-help"` : ''}`;
  const control =
    f.options !== undefined
      ? `<select class="form-select" ${attrs}>${f.options}</select>`
      : f.type === 'textarea'
        ? `<textarea class="form-control" rows="3" ${attrs}>${escape(f.value)}</textarea>`
        : `<input class="form-control" type="${escape(f.type || 'text')}" value="${escape(f.value)}" ${attrs}>`;
  return `<div class="${f.wide ? 'col-12' : 'col-md-6'}"><label class="form-label" for="${escape(id)}">${escape(f.label)}${f.required ? ' <span aria-hidden="true">*</span><span class="visually-hidden"> obrigatório</span>' : ''}</label>${control}${f.help ? `<div class="form-text" id="${escape(id)}-help">${escape(f.help)}</div>` : ''}</div>`;
}
export interface DialogHandle {
  element: HTMLDialogElement;
  close(): void;
}
export function dialog(title: string, body: string, footer = ''): DialogHandle {
  const headingId = `dialog-heading-${++dialogSequence}`;
  const element = document.createElement('dialog');
  element.className = 'app-dialog';
  element.setAttribute('aria-labelledby', headingId);
  element.innerHTML = `<div class="dialog-heading"><h2 id="${headingId}">${escape(title)}</h2><button type="button" class="close-dialog" aria-label="Fechar janela">×</button></div><div class="dialog-body">${body}</div>${footer ? `<div class="dialog-footer">${footer}</div>` : ''}`;
  const previous = document.activeElement as HTMLElement | null;
  const close = (): void => element.close();
  element.querySelector('.close-dialog')!.addEventListener('click', close);
  element.addEventListener(
    'close',
    () => {
      element.remove();
      if (previous?.isConnected) previous.focus();
      else document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true });
    },
    { once: true },
  );
  document.body.append(element);
  element.showModal();
  return { element, close };
}
export function formDialog(
  title: string,
  fields: string,
  submit: (data: FormData, form: HTMLFormElement) => Promise<void>,
  submitLabel = 'Salvar',
  setup?: (form: HTMLFormElement) => void,
): DialogHandle {
  const modal = dialog(
    title,
    `<form><div class="row g-3">${fields}</div><div class="form-error alert alert-danger mt-3" role="alert" hidden></div><div class="dialog-form-actions"><button type="button" class="btn btn-outline-secondary" data-dismiss>Voltar</button><button type="submit" class="btn btn-primary">${escape(submitLabel)}</button></div></form>`,
  );
  const form = modal.element.querySelector<HTMLFormElement>('form')!;
  form.querySelector('[data-dismiss]')!.addEventListener('click', modal.close);
  setup?.(form);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const error = form.querySelector<HTMLElement>('.form-error')!;
    error.hidden = true;
    button.disabled = true;
    button.textContent = 'Salvando…';
    try {
      await submit(new FormData(form), form);
      modal.close();
    } catch (e) {
      error.textContent =
        e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.';
      error.hidden = false;
      error.tabIndex = -1;
      error.focus();
    } finally {
      button.disabled = false;
      button.textContent = submitLabel;
    }
  });
  return modal;
}
export function confirmAction(title: string, message: string, submit: () => Promise<void>): void {
  formDialog(
    title,
    `<div class="col-12"><p>${escape(message)}</p></div>`,
    async () => submit(),
    'Confirmar',
  );
}
export function confirmRemoval(
  title: string,
  message: string,
  submit: (reason: string) => Promise<void>,
): void {
  formDialog(
    title,
    `<div class="col-12"><p>${escape(message)}</p><p>A justificativa e o conteúdo anterior ficarão no histórico de auditoria.</p></div>` +
      field({
        name: 'justification',
        label: 'Justificativa da exclusão',
        type: 'textarea',
        required: true,
        wide: true,
      }) +
      '<div class="col-12"><label><input type="checkbox" name="confirmRemoval" required> Confirmo a exclusão deste registro.</label></div>',
    async (data) => {
      if (data.get('confirmRemoval') !== 'on')
        throw new Error('Confirme a exclusão antes de continuar.');
      await submit(textValue(data, 'justification'));
    },
    'Confirmar exclusão',
  );
}
export const textValue = (data: FormData, name: string): string =>
  String(data.get(name) ?? '').trim();
export const numericValue = (data: FormData, name: string): number => Number(textValue(data, name));
export function bindLessons(root: HTMLElement, show: (id: string) => void): void {
  root
    .querySelectorAll<HTMLElement>('[data-lesson]')
    .forEach((button) => button.addEventListener('click', () => show(button.dataset.lesson!)));
}
export function auditDetails(
  entries: {
    action: string;
    before: string;
    after: string;
    justification: string;
    at: string;
    authorId: string;
  }[],
  author: (id: string) => string,
): string {
  return entries.length
    ? `<div class="audit-list">${entries.map((e) => `<details><summary>${escape(datetime(e.at))} · ${escape(e.action)} · ${escape(author(e.authorId))}</summary><p>${escape(e.justification || 'Sem justificativa adicional.')}</p><div class="audit-values"><div><h4>Antes</h4><pre>${escape(pretty(e.before))}</pre></div><div><h4>Depois</h4><pre>${escape(pretty(e.after))}</pre></div></div></details>`).join('')}</div>`
    : empty('Nenhuma alteração registrada.');
}
function pretty(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
