import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { databaseConfig } from '../src/main/database/config';
import { createDatabase } from '../src/main/database/mysql';
import { initializeSchema } from '../src/main/database/setup';
import { insertDemoData } from '../src/main/database/demo';
import { hashPassword } from '../src/main/auth/passwords';

config({ quiet: true });

function requiredPassword(variable: string): string {
  const value = process.env[variable] || '';
  if (
    value.length < 12 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/\d/.test(value) ||
    !/[^a-zA-Z0-9]/.test(value)
  ) {
    throw new Error(
      `${variable} deve ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo. Defina no ambiente local, sem versionar a senha.`,
    );
  }
  return value;
}

function demoGoal(variable: string, fallback: number): number {
  const value = Number(process.env[variable] ?? fallback);
  if (!Number.isInteger(value) || value < 0 || value > 10000)
    throw new Error(`${variable} deve ser um inteiro entre 0 e 10000.`);
  return value;
}

async function main(): Promise<void> {
  const timeZone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone }).format();
  } catch {
    throw new Error('APP_TIMEZONE inválido. Informe um fuso reconhecido, como America/Sao_Paulo.');
  }
  process.env.TZ = timeZone;
  const command = process.argv[2];
  if (!['setup', 'seed', 'demo-sql'].includes(command))
    throw new Error('Use npm run db:setup, npm run db:seed ou npm run db:demo:sql.');
  const settings = databaseConfig();
  if (command === 'demo-sql') {
    const connection = await mysql.createConnection({ ...settings, multipleStatements: true });
    try {
      const [owners] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM p2_users WHERE role = ? LIMIT 1',
        ['admin'],
      );
      if (!owners.length)
        throw new Error('Execute npm run db:setup antes de importar a demonstração.');
      const sql = await readFile(resolve('database/demonstracao.sql'), 'utf8');
      await connection.query(sql);
      console.log('Demonstração SQL importada. Instrutores: sql.demo.ana e sql.demo.bruno.');
    } finally {
      await connection.end();
    }
    return;
  }
  if (command === 'setup') await initializeSchema(settings, resolve('database/schema.sql'));
  const db = createDatabase();
  try {
    if (command === 'setup') {
      const state = await db.read();
      if (state.users.some((user) => user.role === 'admin')) {
        console.log(
          'Esquema conferido. Administrador existente preservado; a senha não foi alterada.',
        );
        return;
      }
      const login = (process.env.ADMIN_LOGIN || 'admin').trim();
      if (!/^[a-zA-Z0-9._-]{3,100}$/.test(login))
        throw new Error(
          'ADMIN_LOGIN deve ter de 3 a 100 letras, números, pontos, sublinhados ou hífens.',
        );
      const passwordHash = await hashPassword(requiredPassword('ADMIN_PASSWORD'));
      await db.transaction((current) => {
        if (!current.users.some((user) => user.role === 'admin'))
          current.users.push({
            id: randomUUID(),
            name: 'Administrador',
            login,
            passwordHash,
            role: 'admin',
            active: true,
            instructorId: null,
          });
      });
      console.log(
        'Esquema preparado e administrador criado. A senha permanece somente no ambiente local.',
      );
    } else {
      const passwordHash = await hashPassword(requiredPassword('DEMO_PASSWORD'));
      const inserted = await insertDemoData(
        db,
        passwordHash,
        demoGoal('DEMO_THEORY_GOAL', 3),
        demoGoal('DEMO_PRACTICE_GOAL', 5),
      );
      console.log(
        inserted
          ? 'Demonstração fictícia adicionada. Contas: demo.ana e demo.bruno; use DEMO_PASSWORD. Metas e limites são exemplos editáveis, sem valor legal ou mecânico.'
          : 'Demonstração já existente; os registros e as senhas foram preservados.',
      );
    }
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  // Não imprimir objetos do driver: podem conter SQL, parâmetros ou configuração.
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code)
    console.error(
      `Falha de banco (${code}). Confira o serviço MySQL, as permissões e a configuração local.`,
    );
  else console.error(error instanceof Error ? error.message : 'Não foi possível preparar o banco.');
  process.exitCode = 1;
});
