import type { Exam, ExamResult, Student } from '../../shared/types';
import type { Context } from '../core/context';
import {
  action,
  badge,
  confirmAction,
  datetime,
  escape,
  field,
  formDialog,
  panel,
  table,
  td,
  textValue,
  today,
} from '../core/ui';

export const examTypes = { theory: 'Teórico', practice: 'Prático' } as const;
export const examResults: Record<ExamResult, string> = {
  scheduled: 'Agendado',
  passed: 'Aprovado',
  failed: 'Reprovado',
  absent: 'Faltou',
  cancelled: 'Cancelado',
};
export function studentExams(ctx: Context, student: Student): string {
  const exams = ctx.workspace.exams
    .filter((exam) => exam.studentId === student.id)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return panel(
    'Exames de habilitação',
    table(
      ['Tipo', 'Data e horário', 'Resultado', 'Ações'],
      exams.map((exam) =>
        td(
          examTypes[exam.type],
          escape(datetime(exam.startsAt)),
          badge(
            examResults[exam.result],
            exam.result === 'passed' ? 'success' : exam.result === 'failed' ? 'danger' : 'neutral',
          ),
          `<div class="row-actions">${action('Editar', `data-exam="${escape(exam.id)}"`)}${action('Excluir', `data-delete-exam="${escape(exam.id)}"`)}</div>`,
        ),
      ),
      'Exames do aluno',
    ),
    student.active ? action('Novo exame', 'data-new-exam') : '',
  );
}

export function bindStudentExams(
  root: HTMLElement,
  ctx: Context,
  student: Student,
  close: () => void,
): void {
  root.querySelector('[data-new-exam]')?.addEventListener('click', () => {
    close();
    editExam(ctx, student);
  });
  root.querySelectorAll<HTMLElement>('[data-exam]').forEach((button) =>
    button.addEventListener('click', () => {
      const exam = ctx.workspace.exams.find((item) => item.id === button.dataset.exam);
      if (!exam) return;
      close();
      editExam(ctx, student, exam);
    }),
  );
  root.querySelectorAll<HTMLElement>('[data-delete-exam]').forEach((button) =>
    button.addEventListener('click', () => {
      confirmAction('Excluir exame', 'Confirma a exclusão deste exame da ficha do aluno?', () =>
        ctx.save('exam.remove', { id: button.dataset.deleteExam! }),
      );
    }),
  );
}

function editExam(ctx: Context, student: Student, exam?: Exam): void {
  formDialog(
    exam ? 'Editar exame' : 'Agendar exame',
    [
      field({
        name: 'type',
        label: 'Tipo de exame',
        required: true,
        options: Object.entries(examTypes)
          .map(
            ([key, label]) =>
              `<option value="${key}" ${exam?.type === key ? 'selected' : ''}>${label}</option>`,
          )
          .join(''),
      }),
      field({
        name: 'startsAt',
        label: 'Data e horário',
        required: true,
        type: 'datetime-local',
        value: exam?.startsAt ?? `${today()}T09:00`,
      }),
      field({
        name: 'result',
        label: 'Resultado',
        options: Object.entries(examResults)
          .map(
            ([key, label]) =>
              `<option value="${key}" ${exam?.result === key ? 'selected' : ''}>${label}</option>`,
          )
          .join(''),
      }),
      field({
        name: 'notes',
        label: 'Observações',
        type: 'textarea',
        value: exam?.notes,
        wide: true,
      }),
    ].join(''),
    async (data) =>
      ctx.save('exam.save', {
        ...(exam ? { id: exam.id } : {}),
        studentId: student.id,
        type: textValue(data, 'type') as Exam['type'],
        startsAt: textValue(data, 'startsAt'),
        result: textValue(data, 'result') as ExamResult,
        notes: textValue(data, 'notes'),
      }),
  );
}
