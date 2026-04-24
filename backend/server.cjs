const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { URL } = require('node:url');
const { randomUUID } = require('node:crypto');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const equalsIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(process.cwd(), '.env'));

const PORT = Number(process.env.BACKEND_PORT || 8787);
const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const PRIVATE_VAULT_DIR = process.env.PRIVATE_VAULT_DIR || path.join(os.homedir(), 'Desktop', 'Createur-de-Mission-Private');
const PRIVATE_VAULT_FILE = path.join(PRIVATE_VAULT_DIR, 'vault.json');
const YWH_API_BASE_URL = process.env.YWH_API_BASE_URL || 'https://apps.yeswehack.com';
const YWH_AUTHORIZATION_URL = process.env.YWH_AUTHORIZATION_URL || '';
const YWH_TOKEN_URL = process.env.YWH_TOKEN_URL || '';
const YWH_CLIENT_ID = process.env.YWH_CLIENT_ID || '';
const YWH_CLIENT_SECRET = process.env.YWH_CLIENT_SECRET || '';
const YWH_REDIRECT_URI = process.env.YWH_REDIRECT_URI || 'http://localhost:5173/auth/yeswehack/callback';
const YWH_REQUEST_VALUE = process.env.YWH_REQUEST_VALUE || '';

const oauthSessions = new Map();
let lastOauthResult = null;
let privateVaultState = {
  missions: [],
  notes: [],
  updatedAt: new Date().toISOString(),
};

function ensurePrivateVaultDirectory() {
  fs.mkdirSync(PRIVATE_VAULT_DIR, { recursive: true });
}

function readPrivateVaultState() {
  ensurePrivateVaultDirectory();
  if (!fs.existsSync(PRIVATE_VAULT_FILE)) {
    return privateVaultState;
  }
  try {
    const raw = fs.readFileSync(PRIVATE_VAULT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      missions: Array.isArray(parsed.missions) ? parsed.missions : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return privateVaultState;
  }
}

function writePrivateVaultState(nextState) {
  ensurePrivateVaultDirectory();
  privateVaultState = {
    missions: Array.isArray(nextState.missions) ? nextState.missions : [],
    notes: Array.isArray(nextState.notes) ? nextState.notes : [],
    updatedAt: nextState.updatedAt || new Date().toISOString(),
  };
  fs.writeFileSync(PRIVATE_VAULT_FILE, `${JSON.stringify(privateVaultState, null, 2)}\n`, 'utf8');
  return privateVaultState;
}

privateVaultState = readPrivateVaultState();

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
  });
}

function buildAuthUrl() {
  if (!YWH_AUTHORIZATION_URL || !YWH_CLIENT_ID) {
    return null;
  }

  const url = new URL(YWH_AUTHORIZATION_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', YWH_CLIENT_ID);
  url.searchParams.set('redirect_uri', YWH_REDIRECT_URI);
  return url.toString();
}

function buildAuthUrlWithState(state) {
  const base = buildAuthUrl();
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set('state', state);
  return url.toString();
}

function getConfigurationState() {
  const missing = [];
  if (!YWH_AUTHORIZATION_URL) missing.push('YWH_AUTHORIZATION_URL');
  if (!YWH_TOKEN_URL) missing.push('YWH_TOKEN_URL');
  if (!YWH_CLIENT_ID) missing.push('YWH_CLIENT_ID');
  if (!YWH_CLIENT_SECRET) missing.push('YWH_CLIENT_SECRET');
  if (!YWH_REQUEST_VALUE) missing.push('YWH_REQUEST_VALUE');
  return {
    apiBaseUrl: YWH_API_BASE_URL,
    authorizationUrl: YWH_AUTHORIZATION_URL || null,
    tokenUrl: YWH_TOKEN_URL || null,
    redirectUri: YWH_REDIRECT_URI,
    hasClientId: Boolean(YWH_CLIENT_ID),
    hasClientSecret: Boolean(YWH_CLIENT_SECRET),
    hasRequestValue: Boolean(YWH_REQUEST_VALUE),
    authPreviewUrl: buildAuthUrl(),
    missing,
  };
}

async function exchangeCodeForToken(code) {
  if (!YWH_TOKEN_URL || !YWH_CLIENT_ID || !YWH_CLIENT_SECRET) {
    return {
      status: 'missing-config',
      token: null,
      note: 'Impossible d’effectuer l’échange réel sans token URL, client ID et client secret.',
    };
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('client_id', YWH_CLIENT_ID);
  body.set('client_secret', YWH_CLIENT_SECRET);
  body.set('redirect_uri', YWH_REDIRECT_URI);

  const response = await fetch(YWH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  const raw = await response.text();
  let tokenPayload = null;
  try {
    tokenPayload = raw ? JSON.parse(raw) : null;
  } catch {
    tokenPayload = raw;
  }

  return {
    status: response.ok ? 'ok' : 'error',
    httpStatus: response.status,
    token: tokenPayload,
  };
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(html);
}

const routes = {
  '/health': () => ({ ok: true, service: 'createur-de-mission-backend', timestamp: new Date().toISOString() }),
  '/api/meta': () => ({
    app: 'Createur de Mission',
    mode: 'prep-backend',
    features: ['notes', 'dossiers', 'themes', 'entity-linking', 'yeswehack-prep', 'private-vault'],
  }),
  '/api/private-vault/location': () => ({
    directory: PRIVATE_VAULT_DIR,
    filePath: PRIVATE_VAULT_FILE,
    exists: fs.existsSync(PRIVATE_VAULT_FILE),
  }),
  '/api/private-vault/state': () => privateVaultState,
  '/api/yeswehack/config': () => ({
    baseUrl: YWH_API_BASE_URL,
    ...getConfigurationState(),
  }),
  '/api/yeswehack/checklist': () => ({
    items: [
      { title: 'Support activation request sent', status: 'done' },
      { title: 'API App creation pending', status: 'pending' },
      { title: 'OAuth flow wired', status: 'pending' },
      { title: 'Backend secret handling', status: 'blocked' },
    ],
  }),
  '/api/yeswehack/oauth/start': () => ({
    status: buildAuthUrl() ? 'ready' : 'missing-config',
    authorizationUrl: buildAuthUrl(),
    ...getConfigurationState(),
  }),
  '/api/yeswehack/oauth/result': () => ({
    lastResult: lastOauthResult,
    sessions: oauthSessions.size,
  }),
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Missing URL' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const handler = routes[requestUrl.pathname];

  if (req.method === 'GET' && requestUrl.pathname === '/auth/yeswehack/callback') {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');

    if (!code) {
      lastOauthResult = {
        status: 'error',
        error: 'Missing authorization code',
      };
      sendHtml(res, 400, '<!doctype html><html><body><h1>OAuth callback error</h1><p>Missing authorization code.</p></body></html>');
      return;
    }

    if (!state || !oauthSessions.has(state)) {
      lastOauthResult = {
        status: 'error',
        error: 'Invalid or expired state',
      };
      sendHtml(res, 400, '<!doctype html><html><body><h1>OAuth callback error</h1><p>Invalid or expired state.</p></body></html>');
      return;
    }

    oauthSessions.delete(state);
    exchangeCodeForToken(code)
      .then((result) => {
        lastOauthResult = {
          status: result.status,
          result,
          receivedAt: new Date().toISOString(),
        };
        if (result.status === 'ok') {
          sendHtml(res, 200, '<!doctype html><html><body><h1>OAuth success</h1><p>The code was exchanged from the backend.</p></body></html>');
        } else {
          sendHtml(res, 502, '<!doctype html><html><body><h1>OAuth exchange blocked</h1><p>Backend is missing configuration or the token endpoint rejected the request.</p></body></html>');
        }
      })
      .catch((error) => {
        lastOauthResult = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown OAuth exchange error',
        };
        sendHtml(res, 500, '<!doctype html><html><body><h1>OAuth exchange error</h1><p>Unexpected backend error.</p></body></html>');
      });
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/yeswehack/oauth/exchange') {
    parseJsonBody(req).then((body) => {
      const payload = body || {};
      sendJson(res, 200, {
        status: 'scaffold',
        receivedCode: payload.code ? true : false,
        configured: Boolean(YWH_TOKEN_URL && YWH_CLIENT_ID),
        tokenUrl: YWH_TOKEN_URL || null,
        note: 'Backend prêt pour l’échange réel une fois les identifiants YesWeHack disponibles.',
      });
    });
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/private-vault/state') {
    parseJsonBody(req).then((body) => {
      const payload = body || {};
      privateVaultState = writePrivateVaultState({
        missions: payload.missions,
        notes: payload.notes,
        updatedAt: new Date().toISOString(),
      });
      sendJson(res, 200, {
        ok: true,
        location: PRIVATE_VAULT_FILE,
        updatedAt: privateVaultState.updatedAt,
      });
    });
    return;
  }

  if (req.method === 'GET' && handler) {
    if (requestUrl.pathname === '/api/yeswehack/oauth/start') {
      const state = randomUUID();
      oauthSessions.set(state, { createdAt: new Date().toISOString() });
      const authorizationUrl = buildAuthUrlWithState(state);

      if (requestUrl.searchParams.get('redirect') === '1' && authorizationUrl) {
        res.writeHead(302, {
          Location: authorizationUrl,
          'Access-Control-Allow-Origin': '*',
        });
        res.end();
        return;
      }

      sendJson(res, 200, {
        status: authorizationUrl ? 'ready' : 'missing-config',
        state,
        authorizationUrl,
        ...getConfigurationState(),
      });
      return;
    }

    sendJson(res, 200, handler());
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/') {
    sendJson(res, 200, {
      name: 'Createur de Mission backend',
      status: 'running',
      endpoints: Object.keys(routes),
    });
    return;
  }

  sendJson(res, 404, {
    error: 'Not found',
    available: ['/', ...Object.keys(routes), '/api/yeswehack/oauth/exchange', '/auth/yeswehack/callback'],
  });
});

server.listen(PORT, HOST, () => {
  ensurePrivateVaultDirectory();
  console.log(`Backend ready at http://${HOST}:${PORT}`);
});
