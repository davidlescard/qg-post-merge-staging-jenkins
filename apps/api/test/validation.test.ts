import { expect } from 'chai';
import { validateNewRun } from '../src/validation.js';

describe('validateNewRun', () => {
  it('accepts a valid run and defaults status to queued', () => {
    const { value, errors } = validateNewRun({ name: ' Smoke Suite ', branch: 'main' });
    expect(errors).to.equal(undefined);
    expect(value).to.deep.equal({ name: 'Smoke Suite', branch: 'main', status: 'queued', notes: '' });
  });

  it('requires name and branch', () => {
    const { errors } = validateNewRun({});
    expect(errors).to.deep.equal({ name: 'Name is required', branch: 'Branch is required' });
  });

  it('rejects names that are too short', () => {
    expect(validateNewRun({ name: 'ab', branch: 'main' }).errors?.name).to.match(/at least 3/);
  });

  it('rejects an unknown status', () => {
    expect(validateNewRun({ name: 'Valid', branch: 'main', status: 'bogus' }).errors?.status).to.match(/one of/);
  });

  it('handles non-object bodies', () => {
    expect(validateNewRun(null).errors).to.have.keys('name', 'branch');
  });
});
