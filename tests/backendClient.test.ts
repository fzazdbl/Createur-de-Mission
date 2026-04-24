import { describe, expect, it } from 'vitest';
import { loadBackendState } from '../src/services/backendClient';

describe('backendClient', () => {
  it('loads backend state or a handled offline state', async () => {
    const state = await loadBackendState();
    expect(state.baseUrl.length).toBeGreaterThan(0);
    expect(state.error || state.health || state.meta).toBeTruthy();
  });
});
