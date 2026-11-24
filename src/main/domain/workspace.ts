import type { AppState, SafeUser, StudentProgress, User, Workspace } from '../../shared/types';
import { DomainError } from './validation';

export function safeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export function activeUser(state: AppState, userId: string | undefined): User {
  const user = state.users.find((item) => item.id === userId);
  if (!user || !user.active)
    throw new DomainError(
      'UNAUTHENTICATED',
      'Sua sessão expirou ou o acesso foi desativado. Entre novamente.',
    );
  if (
    user.role === 'instructor' &&
    !state.instructors.some((item) => item.id === user.instructorId && item.active)
  ) {
    throw new DomainError(
      'UNAUTHENTICATED',
      'O cadastro de instrutor está inativo. Procure o dono da autoescola.',
    );
  }
  return user;
}

export function requireAdmin(user: User): void {
  if (user.role !== 'admin')
    throw new DomainError('FORBIDDEN', 'Somente o dono pode executar esta operação.');
}

export function workspace(state: AppState, user: User): Workspace {
  const reportVehicles = state.vehicles.map(({ id, model, plate, category }) => ({
    id,
    model,
    plate,
    category,
  }));
  const studentProgress: StudentProgress[] = state.students.flatMap((student) =>
    (['theory', 'practice'] as const).map((type) => {
      const required =
        state.goals.find((item) => item.studentId === student.id && item.type === type)?.required ??
        0;
      const completed = state.lessons.filter(
        (item) =>
          item.studentId === student.id && item.type === type && item.status === 'completed',
      ).length;
      return {
        studentId: student.id,
        type,
        required,
        completed,
        remaining: Math.max(0, required - completed),
      };
    }),
  );
  if (user.role === 'admin')
    return structuredClone({
      ...state,
      remindersConfigured: Boolean(
        process.env.RESEND_API_KEY?.trim() && process.env.REMINDER_FROM?.trim(),
      ),
      studentProgress,
      reportVehicles,
      user: safeUser(user),
      users: state.users.map(safeUser),
    });
  const lessons = state.lessons.filter((item) => item.instructorId === user.instructorId);
  const lessonIds = new Set(lessons.map((item) => item.id));
  const studentIds = new Set(lessons.map((item) => item.studentId));
  const reports = state.reports.filter((item) => lessonIds.has(item.lessonId));
  const vehicleIds = new Set([
    ...lessons.map((item) => item.vehicleId),
    ...reports.map((item) => item.vehicleId),
  ]);
  const students = state.students.filter(
    (item) => item.instructorId === user.instructorId || studentIds.has(item.id),
  );
  const visibleStudents = new Set(students.map((item) => item.id));
  return structuredClone({
    user: safeUser(user),
    users: [safeUser(user)],
    instructors: state.instructors.filter((item) => item.id === user.instructorId),
    students,
    studentDetails: [],
    exams: [],
    goals: state.goals.filter((item) => visibleStudents.has(item.studentId)),
    vehicles: state.vehicles.filter((item) => vehicleIds.has(item.id)),
    lessons,
    reports,
    movements: state.movements.filter(
      (item) => item.lessonId !== null && lessonIds.has(item.lessonId),
    ),
    maintenancePlans: [],
    maintenanceRecords: [],
    audit: [],
    reportVehicles,
    studentProgress: studentProgress.filter((item) => visibleStudents.has(item.studentId)),
  });
}
