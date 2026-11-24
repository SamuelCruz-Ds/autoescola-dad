export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function databaseConfig(): DatabaseConfig {
  const database = process.env.DB_NAME || 'autoescola';
  const port = Number(process.env.DB_PORT || 3306);
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(database))
    throw new Error('DB_NAME deve conter apenas letras, números e sublinhado (até 64 caracteres).');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT inválida.');
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port,
    user: process.env.DB_USER || 'autoescola',
    password: process.env.DB_PASSWORD || '',
    database,
  };
}
