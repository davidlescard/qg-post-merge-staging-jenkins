import { STATUSES, type Status } from './db.js';

export type FieldErrors = Record<string, string>;

export interface NewRun {
  name: string;
  branch: string;
  status: Status;
  notes: string;
}

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

export function validateNewRun(body: unknown): { value?: NewRun; errors?: FieldErrors } {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) errors.name = 'Name is required';
  else if (name.length < 3) errors.name = 'Name must be at least 3 characters';
  else if (name.length > 80) errors.name = 'Name must be at most 80 characters';

  const branch = typeof input.branch === 'string' ? input.branch.trim() : '';
  if (!branch) errors.branch = 'Branch is required';
  else if (branch.length > 80) errors.branch = 'Branch must be at most 80 characters';

  const status = input.status ?? 'queued';
  if (!isStatus(status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}`;

  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notes.length > 500) errors.notes = 'Notes must be at most 500 characters';

  if (Object.keys(errors).length > 0) return { errors };
  return { value: { name, branch, status: status as Status, notes } };
}
