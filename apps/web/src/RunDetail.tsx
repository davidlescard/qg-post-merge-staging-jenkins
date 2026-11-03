import { useEffect, useState } from 'react';
import { api, ApiError, STATUSES, type Run, type Status } from './api';

export function RunDetail({ id }: { id: number }) {
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRun(null);
    setError(null);
    api
      .getRun(id)
      .then((data) => !cancelled && setRun(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError && err.message === 'Run not found' ? 'Run not found.' : 'Unable to load this run.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function changeStatus(status: Status) {
    setUpdateError(null);
    try {
      setRun(await api.updateStatus(id, status));
    } catch {
      setUpdateError('Unable to update the status. Please try again.');
    }
  }

  return (
    <section aria-labelledby="detail-heading">
      <p>
        <a href="#/">Back to runs</a>
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!run && !error && <p role="status">Loading run...</p>}
      {run && (
        <>
          <h2 id="detail-heading">{run.name}</h2>
          <dl>
            <dt>Branch</dt>
            <dd>{run.branch}</dd>
            <dt>Status</dt>
            <dd>
              <span className={`badge ${run.status}`}>{run.status}</span>
            </dd>
            <dt>Duration (s)</dt>
            <dd>{run.durationSeconds}</dd>
            <dt>Created</dt>
            <dd>{run.createdAt}</dd>
            <dt>Notes</dt>
            <dd>{run.notes || 'None'}</dd>
          </dl>
          <label>
            Update status
            <select value={run.status} onChange={(e) => changeStatus(e.target.value as Status)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {updateError && (
            <p role="alert" className="error">
              {updateError}
            </p>
          )}
        </>
      )}
    </section>
  );
}
