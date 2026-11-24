import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algorithm, salt, encoded, extra] = hash.split('$');
  if (
    algorithm !== 'scrypt' ||
    !salt ||
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !encoded ||
    !/^[a-f0-9]{128}$/i.test(encoded) ||
    extra !== undefined
  )
    return false;
  const expected = Buffer.from(encoded, 'hex');
  return timingSafeEqual(await derive(password, salt), expected);
}
