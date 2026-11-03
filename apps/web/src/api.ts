export const STATUSES = ['queued', 'running', 'passed', 'failed'] as const;
export type Status = (typeof STATUSES)[number];

export interface Run {
  id: number;
  name: string;
  branch: string;
  status: Status;
  durationSeconds: number;
  notes: string;
  createdAt: string;
}

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    message: string,
    public fieldErrors?: FieldErrors,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { 'content-type': 'application/json' } });
  } catch {
    throw new ApiError('Network error');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { errors?: FieldErrors; error?: string };
    throw new ApiError(body.error ?? `Request failed (${res.status})`, body.errors);
  }
  return (await res.json()) as T;
}

export const api = {
  listRuns(search: string, status: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return request<Run[]>(`/api/runs?${params}`);
  },
  getRun: (id: number) => request<Run>(`/api/runs/${id}`),
  createRun: (input: { name: string; branch: string; notes: string }) =>
    request<Run>('/api/runs', { method: 'POST', body: JSON.stringify(input) }),
  updateStatus: (id: number, status: Status) =>
    request<Run>(`/api/runs/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
