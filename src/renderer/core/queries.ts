import type { Lesson, LessonType, MaintenancePlan, Workspace } from '../../shared/types';
import { badge, date, escape, number, now, td, time } from './ui';
export const typeLabel = (type: LessonType): string => (type === 'theory' ? 'Teórica' : 'Prática');
export const statusLabel = (status: Lesson['status']): string =>
  ({ scheduled: 'Agendada', completed: 'Realizada', absent: 'Falta', cancelled: 'Cancelada' })[
    status
  ];
export const studentName = (w: Workspace, id: string): string =>
  w.students.find((s) => s.id === id)?.name || 'Aluno indisponível';
export const instructorName = (w: Workspace, id: string): string =>
  w.instructors.find((i) => i.id === id)?.name || 'Instrutor indisponível';
export const vehicleName = (w: Workspace, id: string | null): string =>
  id ? w.vehicles.find((v) => v.id === id)?.plate || 'Veículo indisponível' : 'Sem veículo';
export const authorName = (w: Workspace, id: string): string =>
  w.users.find((u) => u.id === id)?.name || (w.user.id === id ? w.user.name : 'Autoria preservada');
export const pending = (w: Workspace, l: Lesson): boolean =>
  l.status !== 'cancelled' &&
  !w.reports.some((r) => r.lessonId === l.id) &&
  (l.end <= now() || l.status === 'completed' || l.status === 'absent');
export const reportLabel = (w: Workspace, l: Lesson): string =>
  l.status === 'cancelled'
    ? 'Não aplicável'
    : w.reports.some((r) => r.lessonId === l.id)
      ? 'Preenchido'
      : pending(w, l)
        ? 'Pendente'
        : 'Aguardando aula';
export const reportBadge = (w: Workspace, l: Lesson): string =>
  badge(
    reportLabel(w, l),
    pending(w, l) ? 'warning' : w.reports.some((r) => r.lessonId === l.id) ? 'success' : 'neutral',
  );
export const statusBadge = (l: Lesson): string =>
  badge(
    statusLabel(l.status),
    { scheduled: 'info', completed: 'success', absent: 'warning', cancelled: 'danger' }[l.status],
  );
export const sortedLessons = (lessons: Lesson[]): Lesson[] =>
  [...lessons].sort((a, b) => a.start.localeCompare(b.start));
export function lessonRows(w: Workspace, lessons: Lesson[]): string[] {
  return sortedLessons(lessons).map((l) =>
    td(
      `<strong>${escape(date(l.start))}</strong><span class="cell-sub">${escape(time(l.start))}–${escape(time(l.end))}</span>`,
      `<strong>${escape(studentName(w, l.studentId))}</strong><span class="cell-sub">${escape(typeLabel(l.type))} · ${escape(l.category)}</span>`,
      escape(instructorName(w, l.instructorId)),
      escape(vehicleName(w, l.vehicleId)),
      `${statusBadge(l)}<span class="cell-sub">${reportBadge(w, l)}</span>`,
      `<button class="btn btn-sm btn-outline-secondary" type="button" data-lesson="${escape(l.id)}">Ver aula</button>`,
    ),
  );
}
export const lessonHeaders = [
  'Data e horário',
  'Aluno / tipo',
  'Instrutor',
  'Veículo',
  'Situação / relatório',
  'Ações',
];
export function progress(
  w: Workspace,
  studentId: string,
  type: LessonType,
): { required: number; completed: number; remaining: number } {
  const aggregate = w.studentProgress.find((p) => p.studentId === studentId && p.type === type);
  return aggregate || { required: 0, completed: 0, remaining: 0 };
}
export function progressCards(w: Workspace, studentId: string): string {
  return `<div class="progress-grid">${(['theory', 'practice'] as const)
    .map((type) => {
      const p = progress(w, studentId, type);
      return `<div class="progress-card"><h3>${typeLabel(type)}</h3><div class="progress" role="progressbar" aria-label="${typeLabel(type)}: ${p.completed} realizadas de ${p.required} necessárias" aria-valuenow="${Math.min(p.required, p.completed)}" aria-valuemin="0" aria-valuemax="${Math.max(1, p.required)}"><div class="progress-bar" style="width:${p.required ? Math.min(100, (p.completed / p.required) * 100) : 0}%"></div></div><p><strong>${p.completed}</strong> realizadas · ${p.required} necessárias · <strong>${p.remaining}</strong> restantes</p></div>`;
    })
    .join('')}</div>`;
}
export function maintenanceState(
  w: Workspace,
  plan: MaintenancePlan,
): { label: string; tone: string; remaining: number } {
  const current = w.vehicles.find((v) => v.id === plan.vehicleId)?.currentOdometer || 0;
  const remaining = plan.targetOdometer - current;
  return remaining < 0
    ? { label: 'Ultrapassada', tone: 'danger', remaining }
    : remaining === 0
      ? { label: 'Atingida', tone: 'danger', remaining }
      : remaining <= plan.warningKm
        ? { label: 'Próxima', tone: 'warning', remaining }
        : { label: 'Em dia', tone: 'success', remaining };
}
export function maintenanceRows(w: Workspace, plans: MaintenancePlan[]): string[] {
  return plans.map((p) => {
    const state = maintenanceState(w, p);
    return td(
      escape(vehicleName(w, p.vehicleId)),
      escape(p.service),
      `${number(p.targetOdometer)} km`,
      `${number(p.warningKm)} km`,
      `${badge(state.label, state.tone)}<span class="cell-sub">${state.remaining >= 0 ? `${number(state.remaining)} km até o limite` : `${number(-state.remaining)} km além do limite`}</span>`,
      `<button type="button" class="btn btn-sm btn-outline-secondary" data-plan="${escape(p.id)}">Detalhes</button>`,
    );
  });
}
export interface Filters {
  from: string;
  to: string;
  student: string;
  instructor: string;
  vehicle: string;
  type: string;
}
export const matches = (l: Lesson, f: Filters): boolean =>
  (!f.from || l.start.slice(0, 10) >= f.from) &&
  (!f.to || l.start.slice(0, 10) <= f.to) &&
  (!f.student || l.studentId === f.student) &&
  (!f.instructor || l.instructorId === f.instructor) &&
  (!f.vehicle || l.vehicleId === f.vehicle) &&
  (!f.type || l.type === f.type);
