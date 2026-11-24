export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function requireCondition(
  condition: unknown,
  message: string,
  code = 'VALIDATION',
): asserts condition {
  if (!condition) throw new DomainError(code, message);
}

export function object(value: unknown): Record<string, unknown> {
  requireCondition(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'Informe os dados da operação.',
  );
  return value as Record<string, unknown>;
}

export function text(value: unknown, label: string, max = 200, optional = false): string {
  requireCondition(typeof value === 'string', `Informe ${label}.`);
  const result = value.trim();
  requireCondition(optional || result.length > 0, `Informe ${label}.`);
  requireCondition(result.length <= max, `${label} deve ter no máximo ${max} caracteres.`);
  return result;
}

export function boolean(value: unknown, label = 'a situação'): boolean {
  requireCondition(typeof value === 'boolean', `Informe ${label}.`);
  return value;
}

export function number(value: unknown, label: string, integer = false): number {
  requireCondition(
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 999_999_999,
    `${label} deve ser um número válido e não negativo.`,
  );
  requireCondition(!integer || Number.isInteger(value), `${label} deve ser um número inteiro.`);
  requireCondition(
    integer || Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
    `${label} deve ter no máximo duas casas decimais.`,
  );
  return value;
}

export function choice<T extends string>(value: unknown, options: readonly T[], label: string): T {
  requireCondition(
    typeof value === 'string' && options.includes(value as T),
    `Informe ${label} válido.`,
  );
  return value as T;
}

export function id(value: unknown): string {
  return text(value, 'o identificador', 100);
}
export function optionalId(value: unknown): string | undefined {
  return value === undefined ? undefined : id(value);
}
export function nullableId(value: unknown): string | null {
  return value === null ? null : id(value);
}

export function localDateTime(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function dateTime(value: unknown, label: string): string {
  const raw = text(value, label, 40);
  requireCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw),
    `Informe ${label} com data e horário locais válidos, sem fuso ou segundos.`,
  );
  const parsed = new Date(raw);
  requireCondition(Number.isFinite(parsed.getTime()), `Informe ${label} válido.`);
  requireCondition(
    parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 9999,
    `Informe ${label} válido.`,
  );
  requireCondition(localDateTime(parsed) === raw, `Informe ${label} válido.`);
  return localDateTime(parsed);
}

export function dateOnly(value: unknown, label: string): string {
  const raw = text(value, label, 10);
  requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(raw), `Informe ${label} válida.`);
  dateTime(`${raw}T12:00`, label);
  return raw;
}

export function findById<T extends { id: string }>(rows: T[], value: unknown, label: string): T {
  const found = rows.find((row) => row.id === id(value));
  requireCondition(found, `${label} não encontrado.`, 'NOT_FOUND');
  return found;
}

export const timestamp = (value: string): number => new Date(value).getTime();
export const overlaps = (
  start: string,
  end: string,
  otherStart: string,
  otherEnd: string,
): boolean => timestamp(start) < timestamp(otherEnd) && timestamp(end) > timestamp(otherStart);
