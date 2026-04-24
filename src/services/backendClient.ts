export interface BackendHealth {
  ok: boolean;
  service: string;
  timestamp: string;
}

export interface BackendChecklistItem {
  title: string;
  status: 'done' | 'pending' | 'blocked';
}

export interface BackendMeta {
  app: string;
  mode: string;
  features: string[];
}

export interface BackendOauthConfig {
  apiBaseUrl: string;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  redirectUri: string;
  hasClientId: boolean;
  hasClientSecret?: boolean;
  hasRequestValue: boolean;
  authPreviewUrl: string | null;
  missing: string[];
  state?: string | null;
  status?: string;
  lastResult?: unknown | null;
  sessions?: number;
}

export interface BackendState {
  baseUrl: string;
  health: BackendHealth | null;
  meta: BackendMeta | null;
  checklist: BackendChecklistItem[];
  oauth: BackendOauthConfig | null;
  error: string | null;
}

export interface PrivateVaultState {
  missions: unknown[];
  notes: unknown[];
  updatedAt: string;
}

export interface PrivateVaultLocation {
  directory: string;
  filePath: string;
  exists: boolean;
}

const DEFAULT_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8787';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Backend request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function loadBackendState(): Promise<BackendState> {
  try {
    const [health, meta, checklistResponse] = await Promise.all([
      getJson<BackendHealth>('/health'),
      getJson<BackendMeta>('/api/meta'),
      getJson<{ items: BackendChecklistItem[] }>('/api/yeswehack/checklist'),
    ]);
    const [oauthConfig, oauthResult] = await Promise.all([
      getJson<BackendOauthConfig>('/api/yeswehack/config'),
      getJson<{ lastResult?: unknown | null; sessions?: number }>('/api/yeswehack/oauth/result'),
    ]);

    const oauth = {
      ...oauthConfig,
      ...oauthResult,
    };

    return {
      baseUrl: DEFAULT_BASE_URL,
      health,
      meta,
      checklist: checklistResponse.items,
      oauth,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de joindre le backend';
    return {
      baseUrl: DEFAULT_BASE_URL,
      health: null,
      meta: null,
      checklist: [],
      oauth: null,
      error: message,
    };
  }
}

export async function loadPrivateVaultLocation(): Promise<PrivateVaultLocation | null> {
  try {
    return await getJson<PrivateVaultLocation>('/api/private-vault/location');
  } catch {
    return null;
  }
}

export async function loadPrivateVaultState(): Promise<PrivateVaultState | null> {
  try {
    return await getJson<PrivateVaultState>('/api/private-vault/state');
  } catch {
    return null;
  }
}

export async function savePrivateVaultState(state: PrivateVaultState): Promise<boolean> {
  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/api/private-vault/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
    return response.ok;
  } catch {
    return false;
  }
}
