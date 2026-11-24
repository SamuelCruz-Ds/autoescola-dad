import { randomUUID } from 'node:crypto';
import type { AppState, Exam, User } from '../../shared/types';
import { audit } from './audit';
import {
  choice,
  dateTime,
  findById,
  localDateTime,
  object,
  optionalId,
  requireCondition,
  text,
} from './validation';

export class ExamService {
  save(state: AppState, user: User, input: unknown, now: Date): void {
    const data = object(input);
    const id = optionalId(data.id);
    const previous = id ? findById(state.exams, id, 'Exame') : undefined;
    const student = findById(state.students, data.studentId, 'Aluno');
    const startsAt = dateTime(data.startsAt, 'a data do exame');
    const result = choice(
      data.result,
      ['scheduled', 'passed', 'failed', 'absent', 'cancelled'] as const,
      'o resultado',
    );
    const type = choice(data.type, ['theory', 'practice'] as const, 'o tipo de exame');
    requireCondition(
      student.active || (previous?.studentId === student.id && result !== 'scheduled'),
      'Selecione um aluno ativo para agendar.',
    );
    requireCondition(
      result === 'scheduled' || result === 'cancelled' || startsAt <= localDateTime(now),
      'O resultado pode ser registrado a partir do horário do exame.',
    );
    requireCondition(
      !state.exams.some(
        (item) =>
          item.id !== id &&
          item.studentId === student.id &&
          item.type === type &&
          item.startsAt === startsAt &&
          item.result !== 'cancelled',
      ) || result === 'cancelled',
      'Este aluno já tem um exame deste tipo nessa data e horário.',
    );
    const exam: Exam = {
      id: id ?? randomUUID(),
      studentId: student.id,
      type,
      startsAt,
      result,
      notes: text(data.notes, 'as observações', 3000, true),
    };
    audit(
      state,
      user,
      now,
      'exam',
      exam.id,
      previous ? 'updated' : 'created',
      previous ?? null,
      exam,
    );
    if (previous) Object.assign(previous, exam);
    else state.exams.push(exam);
  }

  remove(state: AppState, user: User, input: unknown, now: Date): void {
    const { id } = object(input);
    const exam = findById(state.exams, id, 'Exame');
    state.exams = state.exams.filter((item) => item.id !== exam.id);
    audit(state, user, now, 'exam', exam.id, 'deleted', exam, null);
  }
}
