import type { ApiResult, AppState, CommandName, Database, User, Workspace } from '../shared/types';
import { verifyPassword } from './auth/passwords';
import { CatalogService } from './domain/catalog';
import { FleetService } from './domain/operations';
import { LessonReportService } from './domain/reports';
import { accessibleLesson, ScheduleService } from './domain/schedule';
import {
  dateTime,
  DomainError,
  localDateTime,
  object,
  requireCondition,
  text,
} from './domain/validation';
import { activeUser, requireAdmin, workspace } from './domain/workspace';

import { audit } from './domain/audit';
import { ExamService } from './domain/exams';
import { Integrations } from './domain/integrations';

export const COMMANDS: readonly CommandName[] = [
  'postal.lookup',
  'holidays.list',
  'weather.current',
  'weather.preview',
  'weather.lesson',
  'reminder.send',
  'exam.save',
  'exam.remove',
  'catalog.remove',
  'movement.remove',
  'auth.login',
  'auth.logout',
  'workspace.get',
  'instructor.save',
  'student.save',
  'student.details.remove',
  'student.goal.remove',
  'vehicle.save',
  'lesson.save',
  'lesson.cancel',
  'lesson.remove',
  'lesson.outcome',
  'report.save',
  'report.remove',
  'movement.save',
  'maintenance.save',
  'maintenance.complete',
  'maintenance.remove',
  'maintenance.record.save',
  'maintenance.record.remove',
  'access.save',
  'access.remove',
];
interface Session {
  userId: string;
  passwordHash: string;
}

export class AppService {
  private readonly exams = new ExamService();
  private readonly catalog = new CatalogService();
  private readonly schedule = new ScheduleService();
  private readonly reports = new LessonReportService();
  private readonly fleet = new FleetService();
  private readonly sessions = new Map<number, Session>();
  constructor(
    private readonly db: Database,
    private readonly clock: () => Date = () => new Date(),
    private readonly integrations = new Integrations(),
  ) {}

  destroySession(sessionId: number): void {
    this.sessions.delete(sessionId);
  }

  async request(
    sessionId: number,
    command: CommandName,
    payload: unknown,
  ): Promise<ApiResult<unknown>> {
    try {
      requireCondition(COMMANDS.includes(command), 'Operação desconhecida.', 'INVALID_COMMAND');
      if (command === 'auth.logout') {
        this.destroySession(sessionId);
        return { ok: true, data: null };
      }
      if (command === 'auth.login') return { ok: true, data: await this.login(sessionId, payload) };
      if (command === 'workspace.get') {
        const state = await this.db.read();
        return { ok: true, data: workspace(state, this.authorize(sessionId, state)) };
      }
      if (
        command === 'postal.lookup' ||
        command === 'holidays.list' ||
        command === 'weather.current' ||
        command === 'weather.preview' ||
        command === 'weather.lesson' ||
        command === 'reminder.send'
      ) {
        return { ok: true, data: await this.externalRequest(sessionId, command, payload) };
      }
      const result = await this.db.transaction(async (state) => {
        const user = this.authorize(sessionId, state);
        const now = this.clock();
        if (command !== 'lesson.outcome' && command !== 'report.save') requireAdmin(user);
        switch (command) {
          case 'exam.save':
            this.exams.save(state, user, payload, now);
            break;
          case 'exam.remove':
            this.exams.remove(state, user, payload, now);
            break;
          case 'catalog.remove':
            this.catalog.removeCatalog(state, user, payload, now);
            break;
          case 'movement.remove':
            this.fleet.removeMovement(state, user, payload, now);
            break;
          case 'instructor.save':
            this.catalog.saveInstructor(state, user, payload, now);
            break;
          case 'student.save':
            this.catalog.saveStudent(state, user, payload, now);
            break;
          case 'student.details.remove':
            this.catalog.removeStudentDetails(state, user, payload, now);
            break;
          case 'student.goal.remove':
            this.catalog.removeStudentGoal(state, user, payload, now);
            break;
          case 'vehicle.save':
            this.catalog.saveVehicle(state, user, payload, now);
            break;
          case 'lesson.save':
            this.schedule.saveLesson(state, user, payload, now);
            break;
          case 'lesson.cancel':
            this.schedule.cancelLesson(state, user, payload, now);
            break;
          case 'lesson.remove':
            this.schedule.removeLesson(state, user, payload, now);
            break;
          case 'lesson.outcome':
            this.schedule.saveOutcome(state, user, payload, now);
            break;
          case 'report.save':
            this.reports.saveReport(state, user, payload, now);
            break;
          case 'report.remove':
            this.reports.removeReport(state, user, payload, now);
            break;
          case 'movement.save':
            this.fleet.saveMovement(state, user, payload, now);
            break;
          case 'maintenance.save':
            this.fleet.saveMaintenance(state, user, payload, now);
            break;
          case 'maintenance.complete':
            this.fleet.completeMaintenance(state, user, payload, now);
            break;
          case 'maintenance.remove':
            this.fleet.removeMaintenance(state, user, payload, now);
            break;
          case 'maintenance.record.save':
            this.fleet.saveMaintenanceRecord(state, user, payload, now);
            break;
          case 'maintenance.record.remove':
            this.fleet.removeMaintenanceRecord(state, user, payload, now);
            break;
          case 'access.save':
            await this.catalog.saveAccess(state, user, payload, now);
            break;
          case 'access.remove':
            this.catalog.removeAccess(state, user, payload, now);
            break;
          default:
            throw new DomainError('INVALID_COMMAND', 'Operação desconhecida.');
        }
        return { workspace: workspace(state, user), passwordHash: user.passwordHash };
      });
      // Uma troca da própria senha mantém esta sessão; outras sessões com o hash anterior expiram.
      const session = this.sessions.get(sessionId);
      if (session && session.userId === result.workspace.user.id)
        session.passwordHash = result.passwordHash;
      return { ok: true, data: result.workspace };
    } catch (error) {
      if (error instanceof DomainError) {
        if (error.code === 'UNAUTHENTICATED') this.destroySession(sessionId);
        return { ok: false, error: error.message, code: error.code };
      }
      return {
        ok: false,
        error:
          'Não foi possível confirmar a operação no banco de dados. Verifique a conexão com o MySQL e a configuração do sistema e tente novamente. Nenhum sucesso foi confirmado.',
        code: 'DATABASE_ERROR',
      };
    }
  }

  private lessonForecast(start: string, end: string) {
    const today = localDateTime(this.clock()).slice(0, 10);
    const last = new Date(this.clock());
    last.setDate(last.getDate() + 6);
    requireCondition(
      start.slice(0, 10) >= today && start.slice(0, 10) <= localDateTime(last).slice(0, 10),
      'Previsão disponível somente para os próximos 7 dias.',
      'FORECAST_RANGE',
    );
    return this.integrations.forecast(start, end);
  }

  private async externalRequest(
    sessionId: number,
    command:
      | 'postal.lookup'
      | 'holidays.list'
      | 'weather.current'
      | 'weather.preview'
      | 'weather.lesson'
      | 'reminder.send',
    payload: unknown,
  ): Promise<unknown> {
    const state = await this.db.read();
    const user = this.authorize(sessionId, state);
    if (command === 'weather.current') return this.integrations.currentWeather();
    const input = object(payload);
    if (command === 'weather.preview') {
      requireAdmin(user);
      const start = dateTime(input.start, 'o início');
      const end = dateTime(input.end, 'o término');
      requireCondition(
        end > start && end.slice(0, 10) === start.slice(0, 10),
        'Informe um intervalo válido no mesmo dia.',
      );
      return this.lessonForecast(start, end);
    }
    if (command === 'holidays.list') return this.integrations.nationalHolidays(Number(input.year));
    if (command === 'postal.lookup') {
      requireAdmin(user);
      return this.integrations.address(text(input.cep, 'o CEP', 9).replace('-', ''));
    }
    const lesson = accessibleLesson(state, user, input.id);
    if (command === 'weather.lesson') {
      requireCondition(
        lesson.type === 'practice' && lesson.status === 'scheduled',
        'A previsão é exibida para aulas práticas agendadas.',
      );
      return this.lessonForecast(lesson.start, lesson.end);
    }
    requireAdmin(user);
    const tomorrow = new Date(this.clock());
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = lesson.start.slice(0, 10);
    requireCondition(
      lesson.status === 'scheduled' && day === localDateTime(tomorrow).slice(0, 10),
      'O lembrete fica disponível na véspera de uma aula agendada.',
    );
    const email = state.studentDetails.find((item) => item.id === lesson.studentId)?.email;
    requireCondition(email, 'Informe o e-mail do aluno no cadastro antes de enviar o lembrete.');
    const action = `sent/${lesson.start}`;
    const previous = state.audit.find(
      (entry) =>
        entry.entity === 'lessonReminder' &&
        entry.entityId === lesson.id &&
        entry.action === action,
    );
    if (previous) return JSON.parse(previous.after);
    const date = `${day.split('-').reverse().join('/')} às ${lesson.start.slice(11)}`;
    const sent = await this.integrations.sendReminder(
      email,
      `lesson-${lesson.id}-${lesson.start}`,
      date,
      lesson.type === 'practice' ? 'prática' : 'teórica',
    );
    await this.db.transaction((current) => {
      if (
        !current.audit.some(
          (entry) =>
            entry.entity === 'lessonReminder' &&
            entry.entityId === lesson.id &&
            entry.action === action,
        )
      ) {
        audit(current, user, this.clock(), 'lessonReminder', lesson.id, action, null, sent);
      }
    });
    return sent;
  }

  private authorize(sessionId: number, state: AppState): User {
    const session = this.sessions.get(sessionId);
    const user = activeUser(state, session?.userId);
    requireCondition(
      user.passwordHash === session?.passwordHash,
      'Sua senha foi redefinida. Entre novamente.',
      'UNAUTHENTICATED',
    );
    return user;
  }

  private async login(sessionId: number, payload: unknown): Promise<Workspace> {
    this.destroySession(sessionId);
    const data = object(payload);
    const login = text(data.login, 'o usuário de acesso', 80).toLowerCase();
    requireCondition(
      typeof data.password === 'string' && data.password.length > 0 && data.password.length <= 256,
      'Informe a senha.',
    );
    const password = data.password;
    const result = await this.db.transaction(async (state) => {
      const user = state.users.find((item) => item.login.toLowerCase() === login);
      // A fixed valid-format dummy hash keeps unknown users on the same expensive derivation path.
      const valid = await verifyPassword(
        password,
        user?.passwordHash ?? `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`,
      );
      requireCondition(user && valid, 'Usuário ou senha inválidos.', 'INVALID_CREDENTIALS');
      requireCondition(
        user.active,
        'Este acesso está desativado. Procure o dono da autoescola.',
        'INACTIVE_ACCOUNT',
      );
      activeUser(state, user.id);
      return {
        userId: user.id,
        passwordHash: user.passwordHash,
        workspace: workspace(state, user),
      };
    });
    this.sessions.set(sessionId, { userId: result.userId, passwordHash: result.passwordHash });
    return result.workspace;
  }
}
