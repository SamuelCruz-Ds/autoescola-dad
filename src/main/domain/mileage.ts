import type { AppState, User } from '../../shared/types';
import { audit } from './audit';
import { findById, requireCondition, timestamp } from './validation';

export interface MileageGap {
  vehicleId: string;
  previousMovementId: string | null;
  nextMovementId: string;
  expected: number;
  informed: number;
}

/** Validates measured readings. Gaps stay explicit; they never create invented distance. */
export function recalculateMileage(
  state: AppState,
  vehicleId: string,
  user: User,
  now: Date,
): MileageGap[] {
  const vehicle = findById(state.vehicles, vehicleId, 'Veículo');
  const movements = state.movements
    .filter((item) => item.vehicleId === vehicleId)
    .sort(
      (a, b) =>
        timestamp(a.at) - timestamp(b.at) ||
        a.odometerStart - b.odometerStart ||
        a.id.localeCompare(b.id),
    );
  let previousEnd = vehicle.initialOdometer;
  let previousId: string | null = null;
  const gaps: MileageGap[] = [];
  for (const movement of movements) {
    requireCondition(
      Number.isFinite(movement.odometerStart) &&
        Number.isFinite(movement.odometerEnd) &&
        movement.odometerStart >= 0 &&
        movement.odometerEnd >= movement.odometerStart,
      'Hodômetro final deve ser maior ou igual ao inicial.',
    );
    requireCondition(
      movement.odometerStart >= previousEnd,
      `Divergência de hodômetro em ${vehicle.plate}: a leitura inicial ${movement.odometerStart} km é menor que a leitura anterior ${previousEnd} km. Confira a sequência cronológica e regularize com justificativa.`,
      'MILEAGE_CONFLICT',
    );
    if (movement.odometerStart > previousEnd) {
      const gap: MileageGap = {
        vehicleId,
        previousMovementId: previousId,
        nextMovementId: movement.id,
        expected: previousEnd,
        informed: movement.odometerStart,
      };
      gaps.push(gap);
      const serialized = JSON.stringify(gap);
      if (
        !state.audit.some(
          (item) =>
            item.action === 'mileage_gap_detected' &&
            item.entityId === vehicleId &&
            item.after === serialized,
        )
      ) {
        audit(
          state,
          user,
          now,
          'vehicle',
          vehicleId,
          'mileage_gap_detected',
          null,
          gap,
          'Lacuna de hodômetro: regularizar com movimento justificado ou relatório pendente. Nenhuma distância foi criada para a lacuna.',
        );
      }
    }
    previousEnd = movement.odometerEnd;
    previousId = movement.id;
  }
  vehicle.currentOdometer = previousEnd;
  requireCondition(
    !state.maintenanceRecords.some(
      (item) =>
        item.vehicleId === vehicleId &&
        (item.odometer < vehicle.initialOdometer || item.odometer > vehicle.currentOdometer),
    ),
    'A alteração deixaria uma manutenção fora do histórico de hodômetro. Corrija esse registro antes de alterar a quilometragem.',
    'MILEAGE_CONFLICT',
  );
  return gaps;
}
