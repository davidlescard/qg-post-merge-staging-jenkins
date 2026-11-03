import { useState, type FormEvent } from 'react';
import { api, ApiError, type FieldErrors } from './api';

export function NewRunForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const run = await api.createRun({ name, branch, notes });
      setSuccess(`Created run "${run.name}"`);
      setName('');
      setBranch('');
      setNotes('');
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else setFormError('Unable to create the run. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="new-run-heading">
      <h2 id="new-run-heading">Create test run</h2>
      <form onSubmit={onSubmit} noValidate>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} />
        </label>
        {errors.name && (
          <p id="name-error" className="field-error">
            {errors.name}
          </p>
        )}
        <label>
          Branch
          <input value={branch} onChange={(e) => setBranch(e.target.value)} aria-invalid={!!errors.branch} aria-describedby={errors.branch ? 'branch-error' : undefined} />
        </label>
        {errors.branch && (
          <p id="branch-error" className="field-error">
            {errors.branch}
          </p>
        )}
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {errors.notes && <p className="field-error">{errors.notes}</p>}
        {formError && (
          <p role="alert" className="error">
            {formError}
          </p>
        )}
        {success && <p role="status">{success}</p>}
        <button type="submit" disabled={submitting}>
          Create run
        </button>
      </form>
    </section>
  );
}
