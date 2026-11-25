import { randomUUID } from 'node:crypto';
import type { AppState, LessonReport, Movement, User } from '../../shared/types';
import { audit } from './audit';
import { recalculateMileage } from './mileage';
import { accessibleLesson } from './schedule';
import {
  choice,
  findById,
  localDateTime,
  nullableId,
  number,
  object,
  overlaps,
  requireCondition,
  text,
  timestamp,
} from './validation';

function sameReport(a: LessonReport, b: LessonReport): boolean {
  return (
    a.lessonId === b.lessonId &&
    a.outcome === b.outcome &&
    a.notes === b.notes &&
    a.vehicleId === b.vehicleId &&
    a.odometerStart === b.odometerStart &&
    a.odometerEnd === b.odometerEnd
  );
}

export class LessonReportService {
  removeReport(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const report = findById(state.reports, data.id, 'Relatório');
    const reason = text(data.justification, 'a justificativa da exclusão', 2000);
    const lesson = accessibleLesson(state, user, report.lessonId);
    const movements = state.movements.filter((item) => item.lessonId === lesson.id);
    const before = structuredClone({ report, lesson, movements });
    state.reports = state.reports.filter((item) => item.id !== report.id);
    state.movements = state.movements.filter((item) => item.lessonId !== lesson.id);
    // A ocorrência informada da aula continua válida; sua documentação volta a ficar pendente.
    for (const vehicleId of new Set(movements.map((item) => item.vehicleId))) {
      recalculateMileage(state, vehicleId, user, now);
      const vehicle = findById(state.vehicles, vehicleId, 'Veículo');
      requireCondition(
        !state.maintenanceRecords.some(
          (item) => item.vehicleId === vehicleId && item.odometer > vehicle.currentOdometer,
        ),
        'A exclusão deixaria uma manutenção acima do hodômetro atual. Regularize esse registro antes de excluir o relatório.',
        'MILEAGE_CONFLICT',
      );
    }
    audit(
      state,
      user,
      now,
      'report',
      report.id,
      'deleted',
      before,
      { lesson, report: null },
      reason,
    );
    audit(
      state,
      user,
      now,
      'lesson',
      lesson.id,
      'report_deleted',
      before,
      { lesson, report: null },
      reason,
    );
  }

  saveReport(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const lesson = accessibleLesson(state, user, data.lessonId);
    requireCondition(
      lesson.status !== 'cancelled',
      'Aula cancelada não exige relatório e não pode gerar quilometragem.',
    );
    requireCondition(
      timestamp(lesson.end) <= now.getTime(),
      'Aguarde o término previsto da aula para enviar o relatório.',
    );
    const previous = state.reports.find((item) => item.lessonId === lesson.id);
    requireCondition(
      previous || user.role === 'instructor',
      'O relatório inicial deve ser preenchido pelo instrutor responsável. O dono pode consultar e corrigir relatórios enviados.',
      'FORBIDDEN',
    );
    const outcome = choice(data.outcome, ['completed', 'absent'] as const, 'um resultado');
    const notes = text(data.notes, 'as observações da aula', 5000);
    const vehicleId = nullableId(data.vehicleId);
    requireCondition(
      outcome !== 'absent' || vehicleId === null,
      'Registre a falta sem uso de veículo. Se houve deslocamento real, o dono deve registrá-lo separadamente com justificativa.',
    );
    requireCondition(
      outcome !== 'completed' || lesson.type !== 'practice' || vehicleId !== null,
      'Informe o veículo efetivamente utilizado na aula prática.',
    );
    const odometerStart =
      vehicleId === null ? null : number(data.odometerStart, 'O hodômetro inicial');
    const odometerEnd = vehicleId === null ? null : number(data.odometerEnd, 'O hodômetro final');
    if (vehicleId === null)
      requireCondition(
        data.odometerStart === null && data.odometerEnd === null,
        'Uma aula sem uso de veículo não deve informar hodômetros.',
      );
    if (vehicleId) {
      const vehicle = findById(state.vehicles, vehicleId, 'Veículo utilizado');
      requireCondition(
        vehicle.category.toUpperCase() === lesson.category.toUpperCase(),
        'O veículo utilizado é incompatível com a categoria da aula.',
      );
      requireCondition(
        odometerEnd! >= odometerStart!,
        'O hodômetro final não pode ser menor que o inicial.',
      );
      for (const other of state.lessons) {
        if (
          other.id === lesson.id ||
          other.status === 'cancelled' ||
          !overlaps(lesson.start, lesson.end, other.start, other.end)
        )
          continue;
        const otherReport = state.reports.find((item) => item.lessonId === other.id);
        const usedVehicle = otherReport ? otherReport.vehicleId : other.vehicleId;
        requireCondition(
          usedVehicle !== vehicleId,
          'O veículo informado está vinculado a outra aula no mesmo horário.',
          'SCHEDULE_CONFLICT',
        );
      }
    }
    const next: LessonReport = {
      id: previous?.id ?? randomUUID(),
      lessonId: lesson.id,
      outcome,
      notes,
      vehicleId,
      odometerStart,
      odometerEnd,
      authorId: previous?.authorId ?? user.id,
      submittedAt: previous?.submittedAt ?? localDateTime(now),
      updatedAt: previous ? localDateTime(now) : null,
    };
    // Repeated delivery of the same report is successful without any new movement or correction.
    if (previous && sameReport(previous, next)) return;
    requireCondition(
      !previous || user.role === 'admin',
      'Relatório já enviado. Somente o dono pode corrigi-lo, com justificativa.',
      'FORBIDDEN',
    );
    const justification = previous
      ? text(data.justification, 'a justificativa da correção', 2000)
      : '';
    const before = structuredClone({
      report: previous ?? null,
      lesson,
      movements: state.movements.filter((item) => item.lessonId === lesson.id),
    });
    const oldMovements = state.movements.filter((item) => item.lessonId === lesson.id);
    state.movements = state.movements.filter((item) => item.lessonId !== lesson.id);
    if (vehicleId !== null) {
      const movement: Movement = {
        id: oldMovements[0]?.id ?? randomUUID(),
        vehicleId,
        lessonId: lesson.id,
        origin: 'lesson',
        at: lesson.end,
        odometerStart: odometerStart!,
        odometerEnd: odometerEnd!,
        justification: previous ? justification : 'Quilometragem informada no relatório da aula.',
        authorId: user.id,
      };
      state.movements.push(movement);
    }
    if (previous) Object.assign(previous, next);
    else state.reports.push(next);
    lesson.status = outcome;
    const vehicleIds = new Set([
      ...oldMovements.map((item) => item.vehicleId),
      ...(vehicleId ? [vehicleId] : []),
    ]);
    for (const affectedId of vehicleIds) recalculateMileage(state, affectedId, user, now);
    audit(
      state,
      user,
      now,
      'report',
      next.id,
      previous ? 'corrected' : 'submitted',
      before,
      {
        report: next,
        lesson,
        movements: state.movements.filter((item) => item.lessonId === lesson.id),
      },
      justification,
    );
  }
}
