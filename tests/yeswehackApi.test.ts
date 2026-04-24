import { describe, expect, it } from 'vitest';
import { buildYesWeHackIntegrationSummary, buildYesWeHackPreparationChecklist, YESWEHACK_ENDPOINT_GROUPS } from '../src/services/yeswehackApi';

describe('yeswehackApi', () => {
  it('exposes a preparation checklist and endpoint groups', () => {
    expect(YESWEHACK_ENDPOINT_GROUPS.length).toBeGreaterThan(0);
    expect(buildYesWeHackPreparationChecklist().some((item) => item.status === 'blocked')).toBe(true);
  });

  it('summarizes the intended integration flow', () => {
    expect(buildYesWeHackIntegrationSummary()).toContain('support activation');
  });
});
