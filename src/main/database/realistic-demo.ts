import type { AppState, Database } from '../../shared/types';
import { createRealisticFixtures, REALISTIC_DEMO_MARKER_ID } from './realistic-fixtures';

export { REALISTIC_DEMO_LOGINS, REALISTIC_DEMO_MARKER_ID } from './realistic-fixtures';

export function hasRealisticDemoData(state: Pick<AppState, 'audit'>): boolean {
  return state.audit.some(
    (entry) =>
      entry.id === REALISTIC_DEMO_MARKER_ID &&
      entry.entity === 'demo_dataset' &&
      entry.action === 'realistic_seeded_v1',
  );
}

const normalized = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR');

function validateCollisions(existing: AppState, additions: AppState): void {
  const existingIds = new Set(
    Object.values(existing)
      .flat()
      .map((entity) => entity.id),
  );
  const addedIds = new Set<string>();
  for (const entity of Object.values(additions).flat()) {
    if (existingIds.has(entity.id) || addedIds.has(entity.id)) {
      throw new Error(
        'Há colisão de identificadores da demonstração. Nenhum registro foi adicionado; preserve os dados existentes e confira a carga.',
      );
    }
    addedIds.add(entity.id);
  }
  const logins = new Set(existing.users.map((user) => normalized(user.login)));
  if (additions.users.some((user) => logins.has(normalized(user.login)))) {
    throw new Error(
      'Um login reservado à demonstração realista já está em uso. Nenhum registro foi adicionado.',
    );
  }
  const normalizePlate = (plate: string): string => normalized(plate).replace(/[^a-z0-9]/g, '');
  const plates = new Set(existing.vehicles.map((vehicle) => normalizePlate(vehicle.plate)));
  if (additions.vehicles.some((vehicle) => plates.has(normalizePlate(vehicle.plate)))) {
    throw new Error(
      'Uma placa reservada à demonstração realista já está em uso. Nenhum registro foi adicionado.',
    );
  }
}

export async function insertRealisticDemoData(
  db: Database,
  passwordHash: string,
  theoryGoal = 8,
  practiceGoal = 16,
  now: Date = new Date(),
): Promise<boolean> {
  return db.transaction((state) => {
    // O marcador pertence à mesma transação da carga. Reexecuções preservam tudo,
    // inclusive senhas alteradas, datas originais e cadastros editados pelo usuário.
    if (hasRealisticDemoData(state)) return false;
    if (!Number.isFinite(now.getTime()))
      throw new Error('Data de referência da demonstração inválida.');
    if (
      ![theoryGoal, practiceGoal].every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 10000,
      )
    ) {
      throw new Error('As metas fictícias devem ser inteiros entre 0 e 10000.');
    }
    if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i.test(passwordHash)) {
      throw new Error(
        'Forneça o hash scrypt da senha de demonstração, nunca a senha em texto aberto.',
      );
    }
    const admin = state.users.find((user) => user.role === 'admin' && user.active);
    if (!admin)
      throw new Error(
        'É necessário um administrador ativo antes de inserir a demonstração realista.',
      );
    const additions = createRealisticFixtures(admin, passwordHash, theoryGoal, practiceGoal, now);
    validateCollisions(state, additions);
    state.instructors.push(...additions.instructors);
    state.users.push(...additions.users);
    state.students.push(...additions.students);
    state.goals.push(...additions.goals);
    state.vehicles.push(...additions.vehicles);
    state.lessons.push(...additions.lessons);
    state.reports.push(...additions.reports);
    state.movements.push(...additions.movements);
    state.maintenancePlans.push(...additions.maintenancePlans);
    state.maintenanceRecords.push(...additions.maintenanceRecords);
    state.audit.push(...additions.audit);
    return true;
  });
}
