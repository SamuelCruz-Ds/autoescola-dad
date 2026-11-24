import { randomUUID } from 'node:crypto';
import type { AppState, User } from '../../shared/types';
import { localDateTime } from './validation';

export function audit(
  state: AppState,
  user: User,
  now: Date,
  entity: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
  justification = '',
): void {
  state.audit.push({
    id: randomUUID(),
    entity,
    entityId,
    action,
    before: JSON.stringify(before ?? null),
    after: JSON.stringify(after ?? null),
    justification,
    authorId: user.id,
    at: localDateTime(now),
  });
}
