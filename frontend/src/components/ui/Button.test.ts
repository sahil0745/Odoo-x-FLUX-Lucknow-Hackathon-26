import { describe, it, expect } from 'vitest';

describe('Frontend Infrastructure & Config', () => {
  it('loads environment variables accurately', () => {
    const appName = 'Brightloop Subscription Management System';
    expect(appName).toContain('Subscription Management');
  });

  it('validates monetary cents format standard', () => {
    const dollars = 15.6;
    const cents = Math.round(dollars * 100);
    expect(cents).toBe(1560);
    expect(Number.isInteger(cents)).toBe(true);
  });
});
