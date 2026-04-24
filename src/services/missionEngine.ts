import type {
  ComplianceMode,
  DetectedEntity,
  DetectedTheme,
  MissionPhase,
  MissionRecord,
  NoteRecord,
  RelatedNoteLink,
  ScopeAssetType,
  ScopeMatchResult,
  ScopeParseResult,
  ScopePattern,
  SmartQuestion,
  Platform,
} from '../types/mission';

export function nowIso(): string {
  return new Date().toISOString();
}

const THEME_RULES: Array<DetectedTheme> = [
  { key: 'web', label: 'Web / HTTP', confidence: 0, keywords: ['xss', 'csrf', 'ssrf', 'endpoint', 'cookie', 'session', 'header', 'parameter', 'http'] },
  { key: 'api', label: 'API / Intégration', confidence: 0, keywords: ['api', 'graphql', 'rest', 'oauth', 'token', 'client secret', 'client_id', 'endpoint', 'json'] },
  { key: 'access', label: 'Accès / Compte', confidence: 0, keywords: ['login', 'auth', 'authentication', 'account', 'session', 'role', 'privilege', 'permission', 'credential'] },
  { key: 'scope', label: 'Scope / Programme', confidence: 0, keywords: ['scope', 'program', 'programme', 'asset', 'target', 'business unit', 'out of scope'] },
  { key: 'investigation', label: 'Recherche / Investigation', confidence: 0, keywords: ['investigation', 'timeline', 'correlat', 'evidence', 'link', 'relation', 'hypothesis', 'note'] },
  { key: 'asm', label: 'Attack Surface / ASM', confidence: 0, keywords: ['asset', 'finding', 'cve', 'scan', 'vulnerability', 'attack surface', 'egr', 'scanner'] },
  { key: 'report', label: 'Report / Rédaction', confidence: 0, keywords: ['report', 'draft', 'template', 'write-up', 'reproduction', 'impact', 'severity'] },
  { key: 'cloud', label: 'Cloud / Infra', confidence: 0, keywords: ['aws', 'gcp', 'azure', 'kubernetes', 'docker', 's3', 'bucket', 'cloud', 'infra'] },
  { key: 'osint', label: 'OSINT / Attribution', confidence: 0, keywords: ['osint', 'domain', 'whois', 'email', 'profile', 'social', 'metadata', 'attribution'] },
];

const TECHNOLOGY_HINTS = ['react', 'vue', 'next.js', 'nuxt', 'graphql', 'jwt', 'oauth', 'saml', 'firebase', 'wordpress', 'drupal', 'shopify', 'laravel', 'django', 'spring', 'angular'];

function normalizeEntity(value: string): string {
  return value.trim().toLowerCase();
}

function scoreTheme(rawText: string, theme: DetectedTheme): DetectedTheme {
  const text = rawText.toLowerCase();
  let score = 0;
  for (const keyword of theme.keywords) {
    if (text.includes(keyword)) score += 1;
  }
  return { ...theme, confidence: score };
}

export function detectThemes(rawText: string): DetectedTheme[] {
  return THEME_RULES
    .map((theme) => scoreTheme(rawText, theme))
    .filter((theme) => theme.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
}

export function detectPrimaryTheme(rawText: string): DetectedTheme {
  const themes = detectThemes(rawText);
  if (themes.length > 0) {
    const [primary] = themes;
    return primary;
  }
  return { key: 'general', label: 'Général', confidence: 0, keywords: [] };
}

export function extractEntities(rawText: string): DetectedEntity[] {
  const text = rawText.trim();
  if (!text) return [];

  const entities = new Map<string, DetectedEntity>();

  const addEntity = (type: DetectedEntity['type'], value: string, confidence: number) => {
    const normalized = normalizeEntity(value);
    if (!normalized) return;
    const id = `${type}:${normalized}`;
    const existing = entities.get(id);
    if (!existing || existing.confidence < confidence) {
      entities.set(id, { id, type, value, normalized, confidence });
    }
  };

  for (const match of text.matchAll(/https?:\/\/[^\s)\]]+/gi)) {
    addEntity('url', match[0].replace(/[.,;]+$/g, ''), 1);
  }

  for (const match of text.matchAll(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi)) {
    addEntity('domain', match[0], 0.9);
  }

  for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    addEntity('ip', match[0], 0.95);
  }

  for (const match of text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    addEntity('email', match[0], 0.92);
  }

  const lowered = text.toLowerCase();
  for (const technology of TECHNOLOGY_HINTS) {
    if (lowered.includes(technology)) {
      addEntity('technology', technology, 0.75);
    }
  }

  const keywordCandidates = ['scope', 'program', 'finding', 'report', 'credential', 'token', 'subdomain', 'payload', 'header'];
  for (const keyword of keywordCandidates) {
    if (lowered.includes(keyword)) {
      addEntity('keyword', keyword, 0.5);
    }
  }

  return [...entities.values()].sort((a, b) => b.confidence - a.confidence || a.type.localeCompare(b.type));
}

function summaryFromThemeAndEntities(theme: DetectedTheme, entities: DetectedEntity[]): string {
  const entitySummary = entities.slice(0, 3).map((entity) => entity.value).join(' · ');
  if (theme.key === 'general') {
    return entitySummary ? `Note générale autour de ${entitySummary}` : 'Note générale sans thème dominant détecté';
  }
  return entitySummary ? `Thème ${theme.label} autour de ${entitySummary}` : `Thème principal détecté : ${theme.label}`;
}

export function buildRelatedNoteLinks(notes: NoteRecord[], current: { themeKey: string; entities: DetectedEntity[]; missionId?: string }): RelatedNoteLink[] {
  const related = new Map<string, RelatedNoteLink>();
  const currentEntitySet = new Set(current.entities.map((entity) => entity.normalized));

  for (const note of notes) {
    if (current.missionId && note.missionId !== current.missionId) continue;

    let confidence = 0;
    const reasons: string[] = [];

    if (note.themeKey && note.themeKey === current.themeKey && current.themeKey !== 'general') {
      confidence += 0.6;
      reasons.push(`Même thème: ${note.themeLabel || note.themeKey}`);
    }

    const noteEntitySet = new Set((note.entities ?? []).map((entity) => entity.normalized));
    for (const entity of noteEntitySet) {
      if (currentEntitySet.has(entity)) {
        confidence += 0.35;
        reasons.push(`Entité partagée: ${entity}`);
        break;
      }
    }

    if (confidence <= 0) continue;

    related.set(note.id, {
      noteId: note.id,
      reason: reasons.join(' · ') || 'Lien contextuel détecté',
      confidence: Math.min(1, confidence),
    });
  }

  return [...related.values()].sort((a, b) => b.confidence - a.confidence);
}

export interface NoteAnalysis {
  theme: DetectedTheme;
  entities: DetectedEntity[];
  summary: string;
}

export function analyzeNoteContext(rawText: string): NoteAnalysis {
  const entities = extractEntities(rawText);
  const theme = detectPrimaryTheme(rawText);
  return {
    theme,
    entities,
    summary: summaryFromThemeAndEntities(theme, entities),
  };
}

export function detectPlatformFromUrl(url: string): Platform {
  const value = url.toLowerCase();
  if (value.includes('yeswehack')) return 'YesWeHack';
  if (value.includes('hackerone')) return 'HackerOne';
  if (value.includes('bugcrowd')) return 'Bugcrowd';
  return 'Autre';
}

export function inferMissionName(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const segment = parsed.pathname.split('/').filter(Boolean).at(-1) ?? parsed.hostname.split('.')[0];
    return segment ? segment.replace(/[^a-zA-Z0-9_-]+/g, '_') : 'mission';
  } catch {
    return 'mission';
  }
}

export function inferPolicyHints(rawText: string): string[] {
  const text = rawText.toLowerCase();
  const hints: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/brute\s*force|no\s+brute|force\s+interdit/i, 'Brute force interdit'],
    [/no\s+automation|automated\s+probes|exploit\s+manually|automation\s+not\s+allowed/i, 'Automatisation limitée/interdite'],
    [/out\s*[- ]?of\s*[- ]?scope|hors\s+p[ée]rim[ée]tre/i, 'Out-of-scope mentionné'],
    [/proof\s+of\s+concept|\bpoc\b/i, 'PoC exigée'],
    [/confidential|non-disclosure|nda/i, 'Confidentialité renforcée'],
    [/social\s+engineering/i, 'Social engineering sensible'],
  ];

  for (const [regex, label] of rules) {
    if (regex.test(text)) {
      hints.push(label);
    }
  }

  return hints;
}

export function buildSmartQuestions(mission: MissionRecord, note: NoteRecord): SmartQuestion[] {
  const noteContext = analyzeNoteContext([
    mission.name,
    mission.scopeText,
    mission.missionUrl,
    note.url,
    note.endpoint,
    note.hypothesis,
    note.observation,
    note.impact,
    note.nextStep,
  ].join('\n'));

  const questions: SmartQuestion[] = [
    {
      id: 'url',
      prompt: noteContext.theme.key === 'api' ? 'Quelle URL / base d’API exacte as-tu testée ?' : 'Quelle URL exacte as-tu testée ?',
      field: 'url',
      kind: 'text',
      required: true,
      help: 'Garde l’URL la plus précise possible.',
    },
    {
      id: 'endpoint',
      prompt: noteContext.theme.key === 'api' ? 'Quel endpoint, quelle méthode et quel paramètre sont concernés ?' : 'Quel endpoint / paramètre est concerné ?',
      field: 'endpoint',
      kind: 'text',
      help: 'Ex: /api/profile?id=123',
    },
    {
      id: 'hypothesis',
      prompt: noteContext.theme.key === 'access' ? 'Quel accès, rôle ou privilège voulais-tu vérifier ?' : 'Quelle hypothèse voulais-tu vérifier ?',
      field: 'hypothesis',
      kind: 'textarea',
      required: true,
      help: 'Phrase courte et claire.',
    },
    {
      id: 'observation',
      prompt: noteContext.theme.key === 'investigation' ? 'Qu’as-tu observé dans la chaîne de liens / la timeline ?' : 'Qu’as-tu observé concrètement ?',
      field: 'observation',
      kind: 'textarea',
      required: true,
    },
    {
      id: 'impact',
      prompt: noteContext.theme.key === 'report' ? 'Quel impact est déjà assez clair pour être rédigé dans le rapport ?' : 'Quel impact réel as-tu pu démontrer ?',
      field: 'impact',
      kind: 'textarea',
      required: true,
    },
    {
      id: 'proofPath',
      prompt: 'Quel fichier de preuve as-tu lié ?',
      field: 'proofPath',
      kind: 'text',
      help: 'Capture, export, ou log local.',
    },
    {
      id: 'nextStep',
      prompt: noteContext.entities.length > 0 ? 'Quelle est la prochaine étape sur ces entités / liens détectés ?' : 'Quelle est la prochaine étape ?',
      field: 'nextStep',
      kind: 'text',
      required: true,
    },
  ];

  if (noteContext.theme.key === 'scope') {
    questions.unshift({
      id: 'theme-scope',
      prompt: 'Quel programme, périmètre ou actif rattaches-tu à cette note ?',
      field: 'hypothesis',
      kind: 'textarea',
      required: true,
      help: 'Relie la note au contexte du dossier.',
    });
  }

  if (noteContext.theme.key === 'web' || noteContext.theme.key === 'api') {
    questions.unshift({
      id: 'theme-web-api',
      prompt: 'Quelle surface technique précise veux-tu documenter ?',
      field: 'endpoint',
      kind: 'text',
      required: true,
      help: 'Route, sous-domaine, méthode ou composant si utile.',
    });
  }

  if (noteContext.theme.key === 'access') {
    questions.unshift({
      id: 'theme-access',
      prompt: 'Quel type d’accès ou de compte est en jeu ?',
      field: 'observation',
      kind: 'textarea',
      required: true,
      help: 'Compte, rôle, permission ou session.',
    });
  }

  if (noteContext.entities.some((entity) => entity.type === 'email' || entity.type === 'ip' || entity.type === 'domain')) {
    questions.push({
      id: 'theme-entities',
      prompt: 'Ces entités sont-elles déjà reliées à un autre dossier ou à une autre note ?',
      field: 'nextStep',
      kind: 'text',
      help: 'Permet de relier le contexte plutôt que de le perdre.',
    });
  }

  if (mission.policyHints.some((hint) => /automation/i.test(hint))) {
    questions.splice(1, 0, {
      id: 'inScope',
      prompt: 'La cible testée était-elle bien dans le scope ?',
      field: 'inScope',
      kind: 'select',
      required: true,
      options: [
        { label: 'Oui', value: true },
        { label: 'Non', value: false },
        { label: 'À confirmer', value: false },
      ],
      help: 'Important si la policy contient une contrainte forte.',
    });
  } else {
    questions.push({
      id: 'inScope',
      prompt: 'La cible était-elle dans le scope ?',
      field: 'inScope',
      kind: 'select',
      options: [
        { label: 'Oui', value: true },
        { label: 'Non', value: false },
        { label: 'Je ne sais pas', value: false },
      ],
      help: 'Toujours vérifier avant de notifier une note de finding.',
    });
  }

  if (note.type === 'FINDING' || note.type === 'REPORT') {
    questions.unshift({
      id: 'check-impact',
      prompt: 'As-tu une preuve du comportement actuel et de l’impact potentiel ?',
      field: 'impact',
      kind: 'textarea',
      help: 'Ajoute ce qui est démontré vs ce qui est seulement supposé.',
      required: true,
    });
  }

  if (mission.policyHints.some((hint) => /poc/i.test(hint))) {
    questions.push({
      id: 'proof-poc',
      prompt: 'La PoC est-elle rejouable en session propre ?',
      field: 'proofPath',
      kind: 'text',
      help: 'Indique le support de preuve si oui.',
    });
  }

  return questions;
}

export function computeQualityScore(note: NoteRecord): number {
  const fields = [note.url, note.hypothesis, note.observation, note.impact, note.nextStep];
  const filled = fields.filter((field) => field.trim().length > 0).length;
  const base = Math.round((filled / fields.length) * 100);
  const scopeBonus = note.inScope === true ? 10 : note.inScope === false ? -10 : 0;
  return Math.max(0, Math.min(100, base + scopeBonus));
}

export function complianceChecksForMission(mission: MissionRecord, note: NoteRecord): string[] {
  const checks: string[] = [];
  const scopeMatch = matchScopeUrl(note.url || mission.missionUrl, mission.scopePatterns);
  if (mission.complianceMode === 'strict' && !scopeMatch.matched) {
    checks.push(`Scope hors périmètre en mode strict (${scopeMatch.reason})`);
  }
  if (!note.proofPath.trim()) {
    checks.push('Preuve manquante');
  }
  if (!note.nextStep.trim()) {
    checks.push('Next step manquant');
  }
  if (mission.policyHints.some((hint) => hint.toLowerCase().includes('automatisation')) && note.type === 'TEST') {
    checks.push('Automatisation potentiellement interdite');
  }
  if (mission.policyHints.some((hint) => hint.toLowerCase().includes('confidentialité')) && !note.proofPath.trim()) {
    checks.push('Preuve minimale recommandée sous policy de confidentialité');
  }
  return checks;
}

function normalizePatternValue(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/[“”"']/g, '')
    .toLowerCase();
}

function inferAssetType(raw: string): ScopeAssetType {
  const value = raw.toLowerCase();
  if (value.includes('apps.apple.com') || value.includes('itunes.apple.com')) return 'ios';
  if (value.includes('play.google.com') || value.includes('android')) return 'android';
  if (value.includes('/api') || value.includes('api.')) return 'api';
  if (value.includes('www.') || value.includes('*') || value.includes('{')) return 'web';
  return 'other';
}

function expandBraceGroups(pattern: string): string[] {
  const match = pattern.match(/\{([^{}]+)\}/);
  if (!match) return [pattern];
  const values = match[1].split('|');
  const prefix = pattern.slice(0, match.index);
  const suffix = pattern.slice((match.index ?? 0) + match[0].length);
  return values.flatMap((value) => expandBraceGroups(`${prefix}${value}${suffix}`));
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

export function parseScopeDocument(rawScope: string): ScopeParseResult {
  const lines = rawScope
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const patterns: ScopePattern[] = [];
  const notes: string[] = [];

  for (const line of lines) {
    if (/^[-•*]/.test(line)) {
      const item = line.replace(/^[-•*]\s*/, '').trim();
      if (!item) continue;

      const lower = item.toLowerCase();
      if (/out\s*of\s*scope|hors\s*p[ée]rim[ée]tre/.test(lower)) {
        const excludedTarget = item
          .replace(/\(?\s*out\s*of\s*scope\s*\)?/i, '')
          .replace(/\s*[-:]+\s*$/i, '')
          .trim();
        notes.push(`Out-of-scope détecté: ${item}`);
        if (excludedTarget) {
          patterns.push({
            raw: item,
            normalized: normalizePatternValue(excludedTarget),
            isExcluded: true,
            assetType: inferAssetType(excludedTarget),
          });
        }
        continue;
      }

      if (/note:|important:|special scenarios|see description/.test(lower)) {
        notes.push(item);
        continue;
      }

      for (const expanded of expandBraceGroups(item)) {
        patterns.push({
          raw: item,
          normalized: normalizePatternValue(expanded),
          isExcluded: false,
          assetType: inferAssetType(expanded),
        });
      }
      continue;
    }

    if (/\b(out\s*of\s*scope|scope|special scenarios|hunting requirements)\b/i.test(line)) {
      notes.push(line);
    }
  }

  return { patterns, notes };
}

export function matchScopeUrl(targetUrl: string, patterns: ScopePattern[]): ScopeMatchResult {
  const normalizedTarget = normalizePatternValue(targetUrl);
  if (!normalizedTarget) {
    return { matched: false, reason: 'URL cible vide' };
  }

  const host = (() => {
    try {
      const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      return parsed.hostname.toLowerCase();
    } catch {
      return normalizedTarget;
    }
  })();

  const exclusions = patterns.filter((pattern) => pattern.isExcluded);
  for (const pattern of exclusions) {
    const regex = wildcardToRegExp(pattern.normalized.replace(/^\*\./, ''));
    if (regex.test(host) || regex.test(normalizedTarget)) {
      return {
        matched: false,
        pattern,
        reason: `Correspond à une exclusion: ${pattern.raw}`,
      };
    }
  }

  const inclusions = patterns.filter((pattern) => !pattern.isExcluded);
  for (const pattern of inclusions) {
    const regex = wildcardToRegExp(pattern.normalized);
    if (regex.test(host) || regex.test(normalizedTarget)) {
      return {
        matched: true,
        pattern,
        reason: `Correspond au scope: ${pattern.raw}`,
      };
    }
  }

  return { matched: false, reason: 'Aucun pattern du scope ne correspond' };
}

export function buildMissionDraft(
  url: string,
  scopeText = '',
): Pick<MissionRecord, 'name' | 'platform' | 'missionUrl' | 'scopeUrl' | 'scopeText' | 'scopePatterns' | 'phase' | 'complianceMode' | 'status' | 'gainEstimated' | 'currency' | 'policyHints' | 'themeTags' | 'dossierSummary' | 'tags'> {
  const scopeParse = parseScopeDocument(scopeText || url);
  const themeTags = detectThemes(`${url}\n${scopeText}`).map((theme) => theme.label);
  return {
    name: inferMissionName(url),
    platform: detectPlatformFromUrl(url),
    missionUrl: url,
    scopeUrl: url,
    scopeText,
    scopePatterns: scopeParse.patterns,
    phase: 'RECON',
    complianceMode: 'warn',
    status: 'En cours',
    gainEstimated: 0,
    currency: 'EUR',
    policyHints: inferPolicyHints(`${url}\n${scopeText}`),
    themeTags,
    dossierSummary: themeTags.length > 0 ? `Mission orientée ${themeTags[0]}` : 'Mission sans thème dominant détecté',
    tags: scopeParse.notes,
  };
}

export function makeMissionId(): string {
  return `mission_${Date.now().toString(36)}`;
}

export function makeNoteId(): string {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function prepareNoteDraft(missionId: string, phase: MissionPhase = 'TEST'): NoteRecord {
  const note: NoteRecord = {
    id: makeNoteId(),
    missionId,
    createdAt: nowIso(),
    type: phase,
    url: '',
    endpoint: '',
    hypothesis: '',
    observation: '',
    impact: '',
    proofPath: '',
    nextStep: '',
    inScope: null,
    qualityScore: 0,
    complianceChecks: [],
    themeKey: 'general',
    themeLabel: 'Général',
    entities: [],
    relatedNotes: [],
    summary: '',
  };
  return note;
}
