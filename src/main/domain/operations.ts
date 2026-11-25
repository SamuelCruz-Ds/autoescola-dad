import { randomUUID } from 'node:crypto';
import type { AppState, MaintenancePlan, Movement, User } from '../../shared/types';
import { audit } from './audit';
import { recalculateMileage } from './mileage';
import {
  boolean,
  choice,
  dateOnly,
  dateTime,
  findById,
  localDateTime,
  number,
  object,
  optionalId,
  requireCondition,
  text,
  timestamp,
} from './validation';

export class FleetService {
  removeMaintenance(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const plan = findById(state.maintenancePlans, data.id, 'Programação de manutenção');
    const reason = text(data.justification, 'a justificativa da exclusão', 2000);
    requireCondition(
      !state.maintenanceRecords.some((item) => item.planId === plan.id),
      'Esta programação possui serviços realizados. Exclua esses registros com justificativa ou arquive a programação para preservar o histórico.',
      'HAS_DEPENDENCIES',
    );
    state.maintenancePlans = state.maintenancePlans.filter((item) => item.id !== plan.id);
    audit(state, user, now, 'maintenancePlan', plan.id, 'deleted', plan, null, reason);
  }

  saveMaintenanceRecord(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const record = findById(state.maintenanceRecords, data.id, 'Manutenção realizada');
    const reason = text(data.justification, 'a justificativa da correção', 2000);
    const vehicle = findById(state.vehicles, record.vehicleId, 'Veículo');
    const date = dateOnly(data.date, 'a data do serviço');
    const odometer = number(data.odometer, 'O hodômetro do serviço');
    requireCondition(
      date <= localDateTime(now).slice(0, 10),
      'O serviço não pode ter data futura.',
    );
    requireCondition(
      odometer >= vehicle.initialOdometer && odometer <= vehicle.currentOdometer,
      'O hodômetro do serviço deve estar dentro do histórico validado do veículo.',
    );
    const before = { ...record };
    Object.assign(record, {
      service: text(data.service, 'o serviço', 200),
      date,
      odometer,
      notes: text(data.notes, 'as observações', 5000, true),
    });
    // Autoria original e vínculo com o plano são preservados. A correção não reprograma o próximo serviço.
    audit(state, user, now, 'maintenanceRecord', record.id, 'corrected', before, record, reason);
  }

  removeMaintenanceRecord(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const record = findById(state.maintenanceRecords, data.id, 'Manutenção realizada');
    const reason = text(data.justification, 'a justificativa da exclusão', 2000);
    state.maintenanceRecords = state.maintenanceRecords.filter((item) => item.id !== record.id);
    // A próxima programação é independente e não é alterada silenciosamente pela exclusão.
    audit(state, user, now, 'maintenanceRecord', record.id, 'deleted', record, null, reason);
  }

  saveMovement(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const existingId = optionalId(data.id);
    const previous = existingId ? findById(state.movements, existingId, 'Movimento') : undefined;
    requireCondition(
      !previous || previous.lessonId === null,
      'Para corrigir um movimento de aula, faça uma correção justificada do relatório.',
    );
    const vehicle = findById(state.vehicles, data.vehicleId, 'Veículo');
    const at = dateTime(data.at, 'a data e horário do movimento');
    requireCondition(
      timestamp(at) <= now.getTime(),
      'Um movimento realizado não pode ter data futura.',
    );
    const odometerStart = number(data.odometerStart, 'O hodômetro inicial');
    const odometerEnd = number(data.odometerEnd, 'O hodômetro final');
    requireCondition(
      odometerEnd >= odometerStart,
      'O hodômetro final não pode ser menor que o inicial.',
    );
    const justification = text(data.justification, 'a justificativa do movimento', 2000);
    const origin =
      data.origin === undefined
        ? 'external'
        : choice(data.origin, ['external', 'adjustment'] as const, 'uma origem');
    const next: Movement = {
      id: previous?.id ?? randomUUID(),
      vehicleId: vehicle.id,
      lessonId: null,
      origin,
      at,
      odometerStart,
      odometerEnd,
      justification,
      authorId: user.id,
    };
    const same = (item: Movement) =>
      item.vehicleId === next.vehicleId &&
      item.lessonId === null &&
      item.origin === next.origin &&
      item.at === next.at &&
      item.odometerStart === next.odometerStart &&
      item.odometerEnd === next.odometerEnd &&
      item.justification === next.justification;
    if (
      state.movements.some((item) => item.id !== previous?.id && same(item)) ||
      (previous && same(previous))
    )
      return;
    const before = previous ? { ...previous } : null;
    const previousVehicleId = previous?.vehicleId;
    if (previous) Object.assign(previous, next);
    else state.movements.push(next);
    for (const vehicleId of new Set([
      vehicle.id,
      ...(previousVehicleId ? [previousVehicleId] : []),
    ]))
      recalculateMileage(state, vehicleId, user, now);
    audit(
      state,
      user,
      now,
      'movement',
      next.id,
      previous ? 'corrected' : 'created',
      before,
      next,
      justification,
    );
  }

  saveMaintenance(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const existingId = optionalId(data.id);
    const previous = existingId
      ? findById(state.maintenancePlans, existingId, 'Programação de manutenção')
      : undefined;
    const vehicle = findById(state.vehicles, data.vehicleId, 'Veículo');
    requireCondition(
      !previous ||
        previous.vehicleId === vehicle.id ||
        !state.maintenanceRecords.some((item) => item.planId === previous.id),
      'Esta programação possui histórico. Cadastre uma nova programação para outro veículo.',
    );
    const next: MaintenancePlan = {
      id: previous?.id ?? randomUUID(),
      vehicleId: vehicle.id,
      service: text(data.service, 'o serviço', 200),
      targetOdometer: number(data.targetOdometer, 'A quilometragem prevista'),
      warningKm: number(data.warningKm, 'A margem de aviso'),
      notes: text(data.notes, 'as observações', 5000, true),
      active: data.active === undefined ? (previous?.active ?? true) : boolean(data.active),
    };
    audit(
      state,
      user,
      now,
      'maintenancePlan',
      next.id,
      previous ? 'updated' : 'created',
      previous,
      next,
    );
    if (previous) Object.assign(previous, next);
    else state.maintenancePlans.push(next);
  }

  completeMaintenance(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const plan = findById(state.maintenancePlans, data.planId, 'Programação de manutenção');
    const vehicle = findById(state.vehicles, plan.vehicleId, 'Veículo');
    const date = dateOnly(data.date, 'a data da manutenção');
    requireCondition(
      date <= localDateTime(now).slice(0, 10),
      'A manutenção realizada não pode ter data futura.',
    );
    const odometer = number(data.odometer, 'O hodômetro da manutenção');
    requireCondition(
      odometer >= vehicle.initialOdometer && odometer <= vehicle.currentOdometer,
      'O hodômetro da manutenção deve estar no histórico validado do veículo. Registre os deslocamentos externos antes de concluir a manutenção.',
    );
    const notes = text(data.notes, 'as observações', 5000, true);
    const nextTarget =
      data.nextTarget === null ? null : number(data.nextTarget, 'A próxima quilometragem');
    const nextWarningKm =
      data.nextWarningKm === null
        ? plan.warningKm
        : number(data.nextWarningKm, 'A próxima margem de aviso');
    requireCondition(
      nextTarget === null || nextTarget > odometer,
      'A próxima manutenção deve ser prevista após o hodômetro da manutenção realizada.',
    );
    // A second delivery of the same completion must not create another service record.
    if (
      state.maintenanceRecords.some(
        (item) =>
          item.planId === plan.id &&
          item.date === date &&
          item.odometer === odometer &&
          item.notes === notes,
      )
    )
      return;
    requireCondition(
      plan.active,
      'Esta programação já foi concluída. Edite ou cadastre a próxima manutenção.',
    );
    const before = { ...plan };
    const record = {
      id: randomUUID(),
      vehicleId: vehicle.id,
      planId: plan.id,
      service: plan.service,
      date,
      odometer,
      notes,
      authorId: user.id,
    };
    state.maintenanceRecords.push(record);
    plan.active = nextTarget !== null;
    if (nextTarget !== null) {
      plan.targetOdometer = nextTarget;
      plan.warningKm = nextWarningKm;
    }
    audit(state, user, now, 'maintenancePlan', plan.id, 'completed', before, { plan, record });
    audit(state, user, now, 'maintenanceRecord', record.id, 'created', null, record);
  }

  removeMovement(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const movement = findById(state.movements, data.id, 'Movimentação');
    const reason = text(data.justification, 'a justificativa', 2000);
    requireCondition(
      movement.lessonId === null,
      'Corrija o relatório para alterar uma movimentação de aula.',
    );
    state.movements = state.movements.filter((item) => item.id !== movement.id);
    recalculateMileage(state, movement.vehicleId, user, now);
    const vehicle = findById(state.vehicles, movement.vehicleId, 'Veículo');
    requireCondition(
      !state.maintenanceRecords.some(
        (item) => item.vehicleId === vehicle.id && item.odometer > vehicle.currentOdometer,
      ),
      'A remoção deixaria uma revisão acima do hodômetro atual.',
    );
    audit(state, user, now, 'movement', movement.id, 'deleted', movement, null, reason);
  }
}
