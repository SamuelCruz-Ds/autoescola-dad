import mysql, { type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { emptyState, type AppState, type Database } from '../../shared/types';
import { databaseConfig, type DatabaseConfig } from './config';

type Codec = 'text' | 'boolean' | 'number' | 'datetime' | 'json';
type Field = readonly [property: string, column: string, codec?: Codec];
interface Table {
  key: keyof AppState;
  name: string;
  fields: readonly Field[];
}
type Entity = { id: string } & Record<string, unknown>;

// A ordem respeita as chaves estrangeiras; exclusões usam a ordem inversa.
const tables: Table[] = [
  {
    key: 'instructors',
    name: 'p2_instructors',
    fields: [
      ['id', 'id'],
      ['name', 'name'],
      ['contact', 'contact'],
      ['active', 'active', 'boolean'],
      ['availability', 'availability', 'json'],
    ],
  },
  {
    key: 'users',
    name: 'p2_users',
    fields: [
      ['id', 'id'],
      ['name', 'name'],
      ['login', 'login'],
      ['passwordHash', 'password_hash'],
      ['role', 'role'],
      ['active', 'active', 'boolean'],
      ['instructorId', 'instructor_id'],
    ],
  },
  {
    key: 'students',
    name: 'p2_students',
    fields: [
      ['id', 'id'],
      ['name', 'name'],
      ['contact', 'contact'],
      ['category', 'category'],
      ['active', 'active', 'boolean'],
      ['instructorId', 'instructor_id'],
      ['notes', 'notes'],
    ],
  },
  {
    key: 'studentDetails',
    name: 'p2_student_details',
    fields: [
      ['id', 'id'],
      ['email', 'email'],
      ['address', 'postal_address', 'json'],
    ],
  },
  {
    key: 'exams',
    name: 'p2_exams',
    fields: [
      ['id', 'id'],
      ['studentId', 'student_id'],
      ['type', 'exam_type'],
      ['startsAt', 'starts_at', 'datetime'],
      ['result', 'result'],
      ['notes', 'notes'],
    ],
  },
  {
    key: 'goals',
    name: 'p2_student_goals',
    fields: [
      ['id', 'id'],
      ['studentId', 'student_id'],
      ['type', 'lesson_type'],
      ['required', 'required', 'number'],
    ],
  },
  {
    key: 'vehicles',
    name: 'p2_vehicles',
    fields: [
      ['id', 'id'],
      ['model', 'model'],
      ['plate', 'plate'],
      ['category', 'category'],
      ['initialOdometer', 'initial_odometer', 'number'],
      ['currentOdometer', 'current_odometer', 'number'],
      ['status', 'status'],
    ],
  },
  {
    key: 'lessons',
    name: 'p2_lessons',
    fields: [
      ['id', 'id'],
      ['studentId', 'student_id'],
      ['instructorId', 'instructor_id'],
      ['vehicleId', 'vehicle_id'],
      ['type', 'lesson_type'],
      ['category', 'category'],
      ['start', 'starts_at', 'datetime'],
      ['end', 'ends_at', 'datetime'],
      ['status', 'status'],
      ['notes', 'notes'],
      ['cancelledAt', 'cancelled_at', 'datetime'],
      ['cancellationReason', 'cancellation_reason'],
    ],
  },
  {
    key: 'reports',
    name: 'p2_lesson_reports',
    fields: [
      ['id', 'id'],
      ['lessonId', 'lesson_id'],
      ['outcome', 'outcome'],
      ['notes', 'notes'],
      ['vehicleId', 'vehicle_id'],
      ['odometerStart', 'odometer_start', 'number'],
      ['odometerEnd', 'odometer_end', 'number'],
      ['authorId', 'author_id'],
      ['submittedAt', 'submitted_at', 'datetime'],
      ['updatedAt', 'updated_at', 'datetime'],
    ],
  },
  {
    key: 'movements',
    name: 'p2_mileage_movements',
    fields: [
      ['id', 'id'],
      ['vehicleId', 'vehicle_id'],
      ['lessonId', 'lesson_id'],
      ['origin', 'origin'],
      ['at', 'occurred_at', 'datetime'],
      ['odometerStart', 'odometer_start', 'number'],
      ['odometerEnd', 'odometer_end', 'number'],
      ['justification', 'justification'],
      ['authorId', 'author_id'],
    ],
  },
  {
    key: 'maintenancePlans',
    name: 'p2_maintenance_plans',
    fields: [
      ['id', 'id'],
      ['vehicleId', 'vehicle_id'],
      ['service', 'service'],
      ['targetOdometer', 'target_odometer', 'number'],
      ['warningKm', 'warning_km', 'number'],
      ['notes', 'notes'],
      ['active', 'active', 'boolean'],
    ],
  },
  {
    key: 'maintenanceRecords',
    name: 'p2_maintenance_records',
    fields: [
      ['id', 'id'],
      ['vehicleId', 'vehicle_id'],
      ['planId', 'plan_id'],
      ['service', 'service'],
      ['date', 'performed_on'],
      ['odometer', 'odometer', 'number'],
      ['notes', 'notes'],
      ['authorId', 'author_id'],
    ],
  },
  {
    key: 'audit',
    name: 'p2_audit_entries',
    fields: [
      ['id', 'id'],
      ['entity', 'entity'],
      ['entityId', 'entity_id'],
      ['action', 'action'],
      ['before', 'before_value'],
      ['after', 'after_value'],
      ['justification', 'justification'],
      ['authorId', 'author_id'],
      ['at', 'occurred_at', 'datetime'],
    ],
  },
];

const entities = (state: AppState, key: keyof AppState): Entity[] =>
  state[key] as unknown as Entity[];

function encode(value: unknown, codec: Codec = 'text'): string | number | null {
  if (value === null) return null;
  if (value === undefined) throw new Error('Persistência recebeu campo indefinido.');
  if (codec === 'json') {
    const result = JSON.stringify(value);
    if (result === undefined) throw new Error('Persistência recebeu JSON inválido.');
    return result;
  }
  if (codec === 'boolean') {
    if (typeof value !== 'boolean') throw new Error('Persistência recebeu booleano inválido.');
    return value ? 1 : 0;
  }
  if (codec === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error('Persistência recebeu número inválido.');
    return value;
  }
  if (codec === 'datetime') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
      throw new Error('Data-hora deve estar no formato local AAAA-MM-DDTHH:mm.');
    return `${value.replace('T', ' ')}:00`;
  }
  if (typeof value !== 'string') throw new Error('Persistência recebeu texto inválido.');
  return value;
}

function decode(value: unknown, codec: Codec = 'text'): unknown {
  if (value === null) return null;
  if (codec === 'json') return typeof value === 'string' ? JSON.parse(value) : value;
  if (codec === 'boolean') return Boolean(value);
  if (codec === 'number') return Number(value);
  if (codec === 'datetime') return String(value).replace(' ', 'T').slice(0, 16);
  return value;
}

async function loadState(connection: PoolConnection): Promise<AppState> {
  const state = emptyState();
  for (const table of tables) {
    const columns = table.fields.map(([, column]) => `\`${column}\``).join(', ');
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT ${columns} FROM \`${table.name}\` ORDER BY id`,
    );
    const target = entities(state, table.key);
    for (const row of rows) {
      const entity = Object.fromEntries(
        table.fields.map(([property, column, codec]) => [property, decode(row[column], codec)]),
      ) as Entity;
      target.push(entity);
    }
  }
  return state;
}

async function persistChanges(
  connection: PoolConnection,
  before: AppState,
  after: AppState,
): Promise<void> {
  for (const table of [...tables].reverse()) {
    const remaining = new Set(entities(after, table.key).map((entity) => entity.id));
    for (const entity of entities(before, table.key)) {
      if (!remaining.has(entity.id))
        await connection.execute(`DELETE FROM \`${table.name}\` WHERE id = ?`, [entity.id]);
    }
  }
  for (const table of tables) {
    const previous = new Map(entities(before, table.key).map((entity) => [entity.id, entity]));
    const ids = new Set<string>();
    for (const entity of entities(after, table.key)) {
      if (ids.has(entity.id)) throw new Error(`Identificador duplicado em ${table.name}.`);
      ids.add(entity.id);
      const old = previous.get(entity.id);
      const values = table.fields.map(([property, , codec]) => encode(entity[property], codec));
      if (!old) {
        const columns = table.fields.map(([, column]) => `\`${column}\``).join(', ');
        await connection.execute(
          `INSERT INTO \`${table.name}\` (${columns}) VALUES (${values.map(() => '?').join(', ')})`,
          values,
        );
      } else {
        const changed = table.fields.filter(
          ([property, , codec]) =>
            JSON.stringify(encode(old[property], codec)) !==
            JSON.stringify(encode(entity[property], codec)),
        );
        if (changed.length) {
          const assignments = changed.map(([, column]) => `\`${column}\` = ?`).join(', ');
          await connection.execute(`UPDATE \`${table.name}\` SET ${assignments} WHERE id = ?`, [
            ...changed.map(([property, , codec]) => encode(entity[property], codec)),
            entity.id,
          ]);
        }
      }
    }
  }
}

export function createDatabase(overrides: Partial<DatabaseConfig> = {}): Database {
  const pool = mysql.createPool({
    ...databaseConfig(),
    ...overrides,
    connectionLimit: 5,
    dateStrings: true,
    decimalNumbers: true,
    supportBigNumbers: true,
    multipleStatements: false,
    charset: 'utf8mb4',
    connectTimeout: 10000,
  });
  return {
    async read() {
      const connection = await pool.getConnection();
      try {
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
        const state = await loadState(connection);
        await connection.commit();
        return state;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async transaction<T>(work: (state: AppState) => T | Promise<T>): Promise<T> {
      const connection = await pool.getConnection();
      try {
        await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        await connection.beginTransaction();
        // Bloqueio no banco protege inclusive instâncias diferentes do aplicativo.
        const [lock] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM p2_app_lock WHERE id = 1 FOR UPDATE',
        );
        if (!lock.length) throw new Error('Banco não inicializado: execute npm run db:setup.');
        const state = await loadState(connection);
        const before = structuredClone(state);
        const result = await work(state);
        await persistChanges(connection, before, state);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
