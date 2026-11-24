import { randomUUID } from 'node:crypto';
import type { AppState, Availability, User } from '../../shared/types';
import { hashPassword } from '../auth/passwords';
import { audit } from './audit';
import { recalculateMileage } from './mileage';
import { safeUser } from './workspace';
import {
  boolean,
  choice,
  findById,
  id,
  nullableId,
  number,
  object,
  optionalId,
  requireCondition,
  text,
} from './validation';

function availability(value: unknown): Availability[] {
  requireCondition(
    Array.isArray(value) && value.length <= 100,
    'Informe a disponibilidade do instrutor.',
  );
  const result = value.map((item) => {
    const data = object(item);
    const weekday = number(data.weekday, 'O dia da semana', true);
    requireCondition(weekday <= 6, 'O dia da semana deve estar entre domingo (0) e sábado (6).');
    const start = text(data.start, 'o início da disponibilidade', 5);
    const end = text(data.end, 'o término da disponibilidade', 5);
    requireCondition(
      /^([01]\d|2[0-3]):[0-5]\d$/.test(start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(end),
      'Informe horários de disponibilidade válidos.',
    );
    requireCondition(start < end, 'O término da disponibilidade deve ser posterior ao início.');
    return { weekday, start, end };
  });
  for (let i = 0; i < result.length; i++) {
    requireCondition(
      !result
        .slice(i + 1)
        .some(
          (item) =>
            item.weekday === result[i].weekday &&
            item.start < result[i].end &&
            item.end > result[i].start,
        ),
      'Há intervalos sobrepostos na disponibilidade do instrutor.',
    );
  }
  return result;
}

function studentDetails(studentId: string, value: unknown) {
  const data = object(value);
  const email = text(data.email, 'o e-mail', 254, true);
  requireCondition(
    !email || /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email),
    'Informe um e-mail válido.',
  );
  if (data.address === null) return { id: studentId, email, address: null };
  const address = object(data.address);
  const cep = text(address.cep, 'o CEP', 9).replace('-', '');
  requireCondition(/^\d{8}$/.test(cep), 'Informe um CEP válido com 8 dígitos.');
  const state = text(address.state, 'a UF', 2).toUpperCase();
  requireCondition(/^[A-Z]{2}$/.test(state), 'Informe a sigla da UF com duas letras.');
  return {
    id: studentId,
    email,
    address: {
      cep,
      street: text(address.street, 'o logradouro', 180, true),
      district: text(address.district, 'o bairro', 100, true),
      city: text(address.city, 'a cidade', 100),
      state,
    },
  };
}

export class CatalogService {
  removeStudentDetails(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const details = findById(state.studentDetails, data.id, 'Contato complementar');
    const reason = text(data.justification, 'a justificativa da exclusão', 2000);
    state.studentDetails = state.studentDetails.filter((item) => item.id !== details.id);
    audit(state, user, now, 'studentDetails', details.id, 'deleted', details, null, reason);
  }

  removeStudentGoal(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const goal = findById(state.goals, data.id, 'Meta de aulas');
    const reason = text(data.justification, 'a justificativa da exclusão', 2000);
    state.goals = state.goals.filter((item) => item.id !== goal.id);
    audit(state, user, now, 'student', goal.studentId, 'goal_deleted', goal, null, reason);
  }

  saveInstructor(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const existingId = optionalId(data.id);
    const previous = existingId ? findById(state.instructors, existingId, 'Instrutor') : undefined;
    const next = {
      id: previous?.id ?? randomUUID(),
      name: text(data.name, 'o nome', 150),
      contact: text(data.contact, 'o contato', 150),
      active: boolean(data.active),
      availability: availability(data.availability),
    };
    audit(
      state,
      user,
      now,
      'instructor',
      next.id,
      previous ? 'updated' : 'created',
      previous,
      next,
    );
    if (previous) Object.assign(previous, next);
    else state.instructors.push(next);
    for (const linkedUser of state.users.filter((item) => item.instructorId === next.id))
      linkedUser.name = next.name;
  }

  saveStudent(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const existingId = optionalId(data.id);
    const previous = existingId ? findById(state.students, existingId, 'Aluno') : undefined;
    const instructor = findById(state.instructors, data.instructorId, 'Instrutor responsável');
    const active = boolean(data.active);
    if (active && (!previous || previous.instructorId !== instructor.id))
      requireCondition(instructor.active, 'Escolha um instrutor responsável ativo.');
    const next = {
      id: previous?.id ?? randomUUID(),
      name: text(data.name, 'o nome', 150),
      contact: text(data.contact, 'o contato', 150),
      category: text(data.category, 'a categoria', 30).toUpperCase(),
      active,
      instructorId: instructor.id,
      notes: text(data.notes, 'as observações', 5000, true),
    };
    const requirements = {
      theory: number(data.theoryRequired, 'A meta de aulas teóricas', true),
      practice: number(data.practiceRequired, 'A meta de aulas práticas', true),
    };
    const detailsPrevious = state.studentDetails.find((item) => item.id === next.id);
    const details =
      data.details === undefined ? detailsPrevious : studentDetails(next.id, data.details);
    const before = structuredClone({
      details: detailsPrevious ?? null,
      student: previous ?? null,
      goals: state.goals.filter((item) => item.studentId === next.id),
    });
    if (previous) Object.assign(previous, next);
    else state.students.push(next);
    for (const type of ['theory', 'practice'] as const) {
      const goal = state.goals.find((item) => item.studentId === next.id && item.type === type);
      if (goal) goal.required = requirements[type];
      else
        state.goals.push({
          id: randomUUID(),
          studentId: next.id,
          type,
          required: requirements[type],
        });
    }
    if (details && detailsPrevious) Object.assign(detailsPrevious, details);
    else if (details) state.studentDetails.push(details);
    audit(state, user, now, 'student', next.id, previous ? 'updated' : 'created', before, {
      student: next,
      details: details ?? null,
      goals: state.goals.filter((item) => item.studentId === next.id),
    });
  }

  saveVehicle(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const existingId = optionalId(data.id);
    const previous = existingId ? findById(state.vehicles, existingId, 'Veículo') : undefined;
    const plate = text(data.plate, 'a placa', 20).toUpperCase().replace(/[\s-]/g, '');
    requireCondition(
      !state.vehicles.some(
        (item) =>
          item.id !== previous?.id && item.plate.toUpperCase().replace(/[\s-]/g, '') === plate,
      ),
      'Já existe um veículo com esta placa.',
      'DUPLICATE',
    );
    const initialOdometer = number(data.initialOdometer, 'A quilometragem inicial');
    const hasMovements = previous && state.movements.some((item) => item.vehicleId === previous.id);
    if (previous && hasMovements) {
      requireCondition(
        previous.initialOdometer === initialOdometer,
        'O hodômetro inicial já possui histórico. Regularize a quilometragem com movimento justificado ou correção do relatório.',
      );
    }
    const next = {
      id: previous?.id ?? randomUUID(),
      model: text(data.model, 'o modelo', 150),
      plate,
      category: text(data.category, 'a categoria', 30).toUpperCase(),
      initialOdometer,
      currentOdometer: hasMovements ? previous!.currentOdometer : initialOdometer,
      status: choice(
        data.status,
        ['available', 'maintenance', 'inactive'] as const,
        'uma situação',
      ),
    };
    audit(state, user, now, 'vehicle', next.id, previous ? 'updated' : 'created', previous, next);
    if (previous) Object.assign(previous, next);
    else state.vehicles.push(next);
    recalculateMileage(state, next.id, user, now);
  }

  async saveAccess(state: AppState, user: User, payload: unknown, now: Date): Promise<void> {
    const data = object(payload);
    const existingId = optionalId(data.id);
    const previous = existingId ? findById(state.users, existingId, 'Acesso') : undefined;
    const role = choice(
      data.role ?? previous?.role ?? 'instructor',
      ['admin', 'instructor'] as const,
      'o perfil',
    );
    requireCondition(
      !previous || previous.role === role,
      'O perfil de uma conta existente não pode ser transferido. Crie outro acesso para preservar a autoria.',
    );
    const instructorId = nullableId(data.instructorId);
    requireCondition(
      role !== 'admin' || instructorId === null,
      'Uma conta de dono não deve ter vínculo de instrutor.',
    );
    const instructor =
      role === 'instructor' ? findById(state.instructors, instructorId, 'Instrutor') : undefined;
    requireCondition(
      !previous || previous.instructorId === instructorId,
      'O vínculo de uma conta existente não pode ser transferido. Crie outro acesso para o outro instrutor.',
    );
    const login = text(data.login, 'o usuário de acesso', 80).toLowerCase();
    requireCondition(
      /^[a-z0-9._-]{3,80}$/.test(login),
      'O usuário deve ter de 3 a 80 letras, números, pontos, sublinhados ou hífens.',
    );
    requireCondition(
      !state.users.some((item) => item.id !== previous?.id && item.login.toLowerCase() === login),
      'Este usuário de acesso já está cadastrado.',
      'DUPLICATE',
    );
    requireCondition(
      !instructor ||
        !state.users.some(
          (item) => item.id !== previous?.id && item.instructorId === instructor.id,
        ),
      'Este instrutor já possui uma conta de acesso. Edite a conta existente.',
      'DUPLICATE',
    );
    const active = boolean(data.active);
    requireCondition(
      !active || !instructor || instructor.active,
      'Ative o cadastro do instrutor antes de liberar seu acesso.',
    );
    requireCondition(
      previous?.id !== user.id || active,
      'Você não pode desativar o próprio acesso.',
    );
    requireCondition(
      !previous ||
        previous.role !== 'admin' ||
        active ||
        state.users.some((item) => item.id !== previous.id && item.role === 'admin' && item.active),
      'Mantenha pelo menos um dono ativo.',
    );
    let passwordHash = previous?.passwordHash;
    if (data.password !== undefined && data.password !== '') {
      requireCondition(
        typeof data.password === 'string' &&
          data.password.length >= 12 &&
          data.password.length <= 256 &&
          /[a-z]/.test(data.password) &&
          /[A-Z]/.test(data.password) &&
          /\d/.test(data.password) &&
          /[^a-zA-Z0-9]/.test(data.password),
        'A senha deve ter de 12 a 256 caracteres, com maiúscula, minúscula, número e símbolo.',
      );
      passwordHash = await hashPassword(data.password);
    }
    requireCondition(passwordHash, 'Informe uma senha para o novo acesso.');
    const next: User = {
      id: previous?.id ?? randomUUID(),
      name: instructor?.name ?? text(data.name, 'o nome do dono', 150),
      login,
      passwordHash,
      role,
      active,
      instructorId,
    };
    audit(
      state,
      user,
      now,
      'access',
      next.id,
      previous ? (data.password ? 'updated_password_reset' : 'updated') : 'created',
      previous ? safeUser(previous) : null,
      safeUser(next),
    );
    if (previous) Object.assign(previous, next);
    else state.users.push(next);
  }

  removeAccess(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const account = findById(state.users, data.id, 'Acesso');
    const reason = text(data.justification, 'a justificativa da exclusão', 2000);
    requireCondition(account.id !== user.id, 'Você não pode excluir o próprio acesso.');
    requireCondition(
      account.role !== 'admin' ||
        !account.active ||
        state.users.some((item) => item.id !== account.id && item.role === 'admin' && item.active),
      'Mantenha pelo menos um dono ativo.',
    );
    requireCondition(
      !state.reports.some((item) => item.authorId === account.id) &&
        !state.movements.some((item) => item.authorId === account.id) &&
        !state.maintenanceRecords.some((item) => item.authorId === account.id) &&
        !state.audit.some((item) => item.authorId === account.id),
      'Este acesso possui autoria de registros. Desative-o para preservar o histórico.',
      'HAS_DEPENDENCIES',
    );
    state.users = state.users.filter((item) => item.id !== account.id);
    audit(state, user, now, 'access', account.id, 'deleted', safeUser(account), null, reason);
  }

  removeCatalog(state: AppState, user: User, payload: unknown, now: Date): void {
    const data = object(payload);
    const entity = choice(
      data.entity,
      ['student', 'instructor', 'vehicle'] as const,
      'o tipo de cadastro',
    );
    const target = id(data.id);
    if (entity === 'student') {
      const item = findById(state.students, target, 'Aluno');
      requireCondition(
        !state.lessons.some((l) => l.studentId === target) &&
          !state.exams.some((e) => e.studentId === target),
        'Este aluno tem histórico. Desative o cadastro para preservá-lo.',
      );
      const before = {
        student: item,
        details: state.studentDetails.find((row) => row.id === target) ?? null,
        goals: state.goals.filter((goal) => goal.studentId === target),
      };
      state.studentDetails = state.studentDetails.filter((row) => row.id !== target);
      state.goals = state.goals.filter((g) => g.studentId !== target);
      state.students = state.students.filter((row) => row.id !== target);
      audit(state, user, now, entity, target, 'deleted', before, null);
      return;
    }
    if (entity === 'instructor') {
      const item = findById(state.instructors, target, 'Instrutor');
      requireCondition(
        !state.lessons.some((l) => l.instructorId === target) &&
          !state.students.some((row) => row.instructorId === target) &&
          !state.users.some((row) => row.instructorId === target),
        'Este instrutor tem vínculos. Desative o cadastro para preservar o histórico.',
      );
      state.instructors = state.instructors.filter((row) => row.id !== target);
      audit(state, user, now, entity, target, 'deleted', item, null);
      return;
    }
    const item = findById(state.vehicles, target, 'Veículo');
    requireCondition(
      !state.lessons.some((l) => l.vehicleId === target) &&
        !state.reports.some((r) => r.vehicleId === target) &&
        !state.movements.some((m) => m.vehicleId === target) &&
        !state.maintenancePlans.some((p) => p.vehicleId === target),
      'Este veículo tem histórico. Desative o cadastro para preservá-lo.',
    );
    state.vehicles = state.vehicles.filter((row) => row.id !== target);
    audit(state, user, now, entity, target, 'deleted', item, null);
  }
}
