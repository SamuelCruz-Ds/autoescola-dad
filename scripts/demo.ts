import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashPassword } from '../src/main/auth/passwords';
import { createDatabase } from '../src/main/database/mysql';
import {
  hasRealisticDemoData,
  insertRealisticDemoData,
  REALISTIC_DEMO_LOGINS,
} from '../src/main/database/realistic-demo';

config({ quiet: true });

interface LocalCredentials {
  purpose: string;
  createdAt: string;
  password: string;
  accounts: { login: string; name: string }[];
}

async function demonstrationPassword(): Promise<string> {
  if (process.env.DEMO_PASSWORD) {
    if (process.env.DEMO_PASSWORD.length < 12)
      throw new Error('DEMO_PASSWORD deve ter pelo menos 12 caracteres.');
    return process.env.DEMO_PASSWORD;
  }

  const path = resolve('.demo-credentials.local.json');
  try {
    const existing: LocalCredentials = JSON.parse(await readFile(path, 'utf8'));
    if (typeof existing.password !== 'string' || existing.password.length < 12)
      throw new Error(
        'O arquivo local de acessos está inválido. Defina DEMO_PASSWORD no ambiente.',
      );
    return existing.password;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }

  const credentials: LocalCredentials = {
    purpose: 'Acessos fictícios da demonstração. Arquivo privado: não enviar ao GitHub.',
    createdAt: new Date().toISOString(),
    password: `Demo!9${randomBytes(16).toString('base64url')}`,
    accounts: REALISTIC_DEMO_LOGINS.map(({ login, name }) => ({ login, name })),
  };
  // Salvar antes da transação evita criar contas cuja senha gerada se perderia em uma falha de escrita.
  await writeFile(path, JSON.stringify(credentials, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return credentials.password;
}

async function main(): Promise<void> {
  const timeZone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  new Intl.DateTimeFormat('pt-BR', { timeZone }).format();
  process.env.TZ = timeZone;
  const db = createDatabase();
  try {
    const state = await db.read();
    if (hasRealisticDemoData(state)) {
      console.log(
        'A demonstração realista já existe. Datas, senhas e alterações foram preservadas.',
      );
      return;
    }
    if (!state.users.some((user) => user.role === 'admin' && user.active))
      throw new Error(
        'Prepare o banco e o administrador com npm run db:setup antes da demonstração.',
      );

    const password = await demonstrationPassword();
    const inserted = await insertRealisticDemoData(db, await hashPassword(password));
    if (!inserted) {
      console.log(
        'A demonstração já foi criada por outra execução. Os acessos existentes foram preservados.',
      );
      return;
    }
    const saved = await db.read();
    console.log('Demonstração fictícia realista adicionada ao MySQL para os dois perfis.');
    console.log('Professores: ' + REALISTIC_DEMO_LOGINS.map((account) => account.login).join(', '));
    console.log(
      process.env.DEMO_PASSWORD
        ? 'Use a senha definida em DEMO_PASSWORD. O .env não foi alterado.'
        : 'A senha foi gerada e salva somente em .demo-credentials.local.json, ignorado pelo Git.',
    );
    console.log(
      JSON.stringify({
        alunos: saved.students.length,
        instrutores: saved.instructors.length,
        veiculos: saved.vehicles.length,
        aulas: saved.lessons.length,
        relatorios: saved.reports.length,
        movimentos: saved.movements.length,
      }),
    );
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  console.error(
    code
      ? `Não foi possível carregar a demonstração (${code}). Confira a conexão e as permissões do MySQL.`
      : error instanceof Error
        ? error.message
        : 'Não foi possível carregar a demonstração.',
  );
  process.exitCode = 1;
});
