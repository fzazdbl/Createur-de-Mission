import { loadPrivateVaultState, savePrivateVaultState, type PrivateVaultState } from './backendClient';

let snapshot: PrivateVaultState = {
  missions: [],
  notes: [],
  updatedAt: new Date().toISOString(),
};

export function setPrivateVaultSnapshot(next: Partial<PrivateVaultState>): void {
  snapshot = {
    ...snapshot,
    ...next,
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
}

export function getPrivateVaultSnapshot(): PrivateVaultState {
  return snapshot;
}

export async function flushPrivateVaultSnapshot(): Promise<boolean> {
  snapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };
  return savePrivateVaultState(snapshot);
}

export async function bootstrapPrivateVaultSnapshot(): Promise<PrivateVaultState | null> {
  const remote = await loadPrivateVaultState();
  if (!remote) return null;
  snapshot = {
    missions: remote.missions ?? [],
    notes: remote.notes ?? [],
    updatedAt: remote.updatedAt || new Date().toISOString(),
  };
  return snapshot;
}