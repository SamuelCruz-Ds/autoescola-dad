import { randomUUID } from 'node:crypto';
import type { AppState, Lesson, User } from '../../shared/types';
import { audit } from './audit';
import {
  choice,
  dateTime,
  findById,
  nullableId,
  object,
  optionalId,
  overlaps,
  requireCondition,
  text,
  timestamp,
  localDateTime,
} from './validation';

export function accessibleLesson(state: AppState, user: User, value: unknown): Lesson {
  const lesson = findById(state.lessons, value, 'Aula');
  requireCondition(
    user.role === 'admin' || lesson.instructorId === user.instructorId,
    'Você só pode acessar suas próprias aulas.',
    'FORBIDDEN',
  );
  return lesson;
}

export class ScheduleService {
  removeLesson(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const lesson = findById(state.lessons, data.id, 'Aula');
    const reason = text(data.justification, 'a justificativa da exclusão', 2000);
    requireCondition(
      !state.reports.some((item) => item.lessonId === lesson.id) &&
        !state.movements.some((item) => item.lessonId === lesson.id),
      'Exclua primeiro o relatório vinculado e regularize a quilometragem antes de excluir esta aula.',
      'HAS_DEPENDENCIES',
    );
    state.lessons = state.lessons.filter((item) => item.id !== lesson.id);
    audit(state, user, now, 'lesson', lesson.id, 'deleted', lesson, null, reason);
  }

  saveLesson(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const existingId = optionalId(data.id);
    const previous = existingId ? findById(state.lessons, existingId, 'Aula') : undefined;
    requireCondition(
      !previous || previous.status === 'scheduled',
      'Somente aulas agendadas podem ser remarcadas. Preserve o histórico de aulas já realizadas, faltas ou cancelamentos.',
    );
    requireCondition(
      !previous || !state.reports.some((item) => item.lessonId === previous.id),
      'Uma aula com relatório enviado não pode ser remarcada.',
    );
    const student = findById(state.students, data.studentId, 'Aluno');
    const instructor = findById(state.instructors, data.instructorId, 'Instrutor');
    requireCondition(
      student.active,
      'O aluno está inativo. Novos agendamentos não são permitidos.',
    );
    requireCondition(instructor.active, 'O instrutor está inativo. Escolha outro instrutor.');
    const type = choice(data.type, ['theory', 'practice'] as const, 'um tipo de aula');
    const start = dateTime(data.start, 'o início da aula');
    const end = dateTime(data.end, 'o término da aula');
    requireCondition(
      timestamp(end) > timestamp(start),
      'O término da aula deve ser posterior ao início.',
    );
    const startDate = new Date(start);
    requireCondition(
      start.slice(0, 10) === end.slice(0, 10),
      'Informe início e término no mesmo dia, dentro da disponibilidade do instrutor.',
    );
    requireCondition(
      instructor.availability.some(
        (item) =>
          item.weekday === startDate.getDay() &&
          item.start <= start.slice(11, 16) &&
          item.end >= end.slice(11, 16),
      ),
      'O instrutor não está disponível neste dia e intervalo.',
      'AVAILABILITY_CONFLICT',
    );
    const category = text(data.category, 'a categoria da aula', 30).toUpperCase();
    requireCondition(
      category === student.category.toUpperCase(),
      'A categoria da aula deve corresponder à categoria do aluno.',
    );
    const vehicleId = nullableId(data.vehicleId);
    requireCondition(type !== 'practice' || vehicleId, 'Escolha um veículo para a aula prática.');
    if (vehicleId) {
      const vehicle = findById(state.vehicles, vehicleId, 'Veículo');
      requireCondition(
        vehicle.status === 'available',
        'O veículo está em manutenção ou inativo. Escolha um veículo disponível.',
        'AVAILABILITY_CONFLICT',
      );
      requireCondition(
        vehicle.category.toUpperCase() === category,
        'O veículo é incompatível com a categoria da aula.',
      );
    }
    for (const lesson of state.lessons) {
      if (
        lesson.id === previous?.id ||
        lesson.status === 'cancelled' ||
        !overlaps(start, end, lesson.start, lesson.end)
      )
        continue;
      const conflict =
        lesson.instructorId === instructor.id
          ? 'o instrutor'
          : lesson.studentId === student.id
            ? 'o aluno'
            : vehicleId !== null && lesson.vehicleId === vehicleId
              ? 'o veículo'
              : null;
      requireCondition(
        !conflict,
        `Conflito de horário com ${conflict}: já existe uma aula de ${lesson.start.replace('T', ' ')} até ${lesson.end.slice(11, 16)}.`,
        'SCHEDULE_CONFLICT',
      );
      // The actual vehicle in a submitted report can differ from the originally scheduled one.
      const actual = state.reports.find((item) => item.lessonId === lesson.id);
      requireCondition(
        !vehicleId || actual?.vehicleId !== vehicleId,
        'Conflito de horário com o veículo efetivamente utilizado em outra aula.',
        'SCHEDULE_CONFLICT',
      );
    }
    const next: Lesson = {
      id: previous?.id ?? randomUUID(),
      studentId: student.id,
      instructorId: instructor.id,
      vehicleId,
      type,
      category,
      start,
      end,
      status: 'scheduled',
      notes: text(data.notes, 'as observações', 5000, true),
      cancelledAt: null,
      cancellationReason: null,
    };
    const justification = previous
      ? text(data.justification, 'a justificativa da alteração', 2000)
      : '';
    audit(
      state,
      user,
      now,
      'lesson',
      next.id,
      previous ? 'rescheduled' : 'created',
      previous,
      next,
      justification,
    );
    if (previous) Object.assign(previous, next);
    else state.lessons.push(next);
  }

  cancelLesson(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const lesson = findById(state.lessons, data.id, 'Aula');
    const reason = text(data.reason, 'o motivo do cancelamento', 2000);
    if (lesson.status === 'cancelled') return;
    requireCondition(
      lesson.status === 'scheduled' && !state.reports.some((item) => item.lessonId === lesson.id),
      'Uma aula realizada ou com relatório não pode ser cancelada. Use a correção justificada do relatório para corrigir sua ocorrência.',
    );
    const before = { ...lesson };
    lesson.status = 'cancelled';
    lesson.cancelledAt = localDateTime(now);
    lesson.cancellationReason = reason;
    audit(state, user, now, 'lesson', lesson.id, 'cancelled', before, lesson, reason);
  }

  saveOutcome(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const lesson = accessibleLesson(state, user, data.id);
    requireCondition(
      lesson.status !== 'cancelled',
      'Uma aula cancelada não pode ser registrada como realizada ou falta.',
    );
    requireCondition(
      timestamp(lesson.end) <= now.getTime(),
      'Aguarde o término previsto da aula para registrar sua ocorrência.',
    );
    const outcome = choice(data.outcome, ['completed', 'absent'] as const, 'um resultado');
    const report = state.reports.find((item) => item.lessonId === lesson.id);
    requireCondition(
      !report || report.outcome === outcome,
      'O resultado possui relatório enviado. O dono deve fazer uma correção justificada do relatório.',
    );
    if (lesson.status === outcome) return;
    const before = { ...lesson };
    lesson.status = outcome;
    audit(state, user, now, 'lesson', lesson.id, 'outcome_recorded', before, lesson);
  }
}
