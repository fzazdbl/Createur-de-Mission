import { computeQualityScore } from './missionEngine';
import type {
  EvidenceEntry,
  EvidenceIndex,
  MissionRecord,
  NoteRecord,
  PreparationKit,
  QualityBreakdown,
  ReportDraft,
  ReportSection,
  RiskSeverity,
  RiskSignal,
} from '../types/mission';

const RISK_RULES: Array<{ key: string; label: string; severity: RiskSeverity; terms: string[]; detail: string }> = [
  {
    key: 'credential',
    label: 'Credentials / session',
    severity: 'high',
    terms: ['token', 'jwt', 'oauth', 'cookie', 'session', 'secret', 'credential'],
    detail: 'La note touche des secrets, des sessions ou de l’authentification.',
  },
  {
    key: 'access-control',
    label: 'Access control / IDOR',
    severity: 'high',
    terms: ['idor', 'authorization', 'permission', 'role', 'privilege', 'account takeover', 'takeover'],
    detail: 'Le comportement semble concerner des contrôles d’accès ou des privilèges.',
  },
  {
    key: 'injection',
    label: 'Injection / payload',
    severity: 'high',
    terms: ['xss', 'ssrf', 'sql', 'rce', 'command injection', 'payload', 'template injection'],
    detail: 'La surface correspond à une classe de vulnérabilités critique.',
  },
  {
    key: 'payment',
    label: 'Paiement / facturation',
    severity: 'medium',
    terms: ['payment', 'billing', 'checkout', 'invoice', 'refund', 'credit card'],
    detail: 'Le flux touche une zone sensible à fort impact business.',
  },
  {
    key: 'upload',
    label: 'Upload / fichier',
    severity: 'medium',
    terms: ['upload', 'file', 'attachment', 'avatar', 'document', 'pdf'],
    detail: 'Les fichiers peuvent cacher un contournement de validation ou d’accès.',
  },
  {
    key: 'export',
    label: 'Export / fuite',
    severity: 'medium',
    terms: ['export', 'csv', 'download', 'report', 'data leak', 'exfiltration'],
    detail: 'Un export peut amplifier un défaut d’accès ou de divulgation.',
  },
  {
    key: 'admin',
    label: 'Admin / backoffice',
    severity: 'medium',
    terms: ['admin', 'backoffice', 'panel', 'internal', 'staff', 'moderator'],
    detail: 'La cible semble être une interface sensible ou interne.',
  },
  {
    key: 'pii',
    label: 'Données personnelles',
    severity: 'medium',
    terms: ['email', 'phone', 'address', 'personal data', 'pii', 'gdpr'],
    detail: 'La note évoque des données personnelles ou leur exposition.',
  },
  {
    key: 'surface-web',
    label: 'Surface web / HTTP',
    severity: 'low',
    terms: ['endpoint', 'header', 'cookie', 'parameter', 'request', 'response'],
    detail: 'La note est très liée à la surface applicative web.',
  },
];

const QUALITY_WEIGHTS = [
  { label: 'Précision', value: 25, detail: 'URL, endpoint et contexte sont renseignés.' },
  { label: 'Preuve', value: 20, detail: 'Une preuve exploitable est attachée.' },
  { label: 'Impact', value: 25, detail: 'L’impact est décrit de façon concrète.' },
  { label: 'Reproductibilité', value: 20, detail: 'Les étapes et le next step sont clairs.' },
  { label: 'Clarté', value: 10, detail: 'La note est lisible et structurée.' },
] as const;

function toLowerText(values: Array<string | undefined>): string {
  return values.filter(Boolean).join('\n').toLowerCase();
}

function countFilled(values: Array<string | null | undefined>): number {
  return values.filter((value) => Boolean(value && value.trim().length > 0)).length;
}

function severityRank(severity: RiskSeverity): number {
  switch (severity) {
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
    default:
      return 1;
  }
}

export function detectRiskSignals(rawText: string): RiskSignal[] {
  const text = rawText.toLowerCase();
  const signals: RiskSignal[] = [];

  for (const rule of RISK_RULES) {
    const matchedTerms = rule.terms.filter((term) => text.includes(term));
    if (matchedTerms.length === 0) continue;
    signals.push({
      key: rule.key,
      label: rule.label,
      severity: rule.severity,
      detail: `${rule.detail} Mots détectés: ${matchedTerms.slice(0, 3).join(' · ')}`,
    });
  }

  return signals.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.label.localeCompare(b.label));
}

export function buildQualityBreakdown(note: NoteRecord): QualityBreakdown {
  const score = computeQualityScore(note);
  const items = QUALITY_WEIGHTS.map((weight) => {
    const hasEvidence = weight.label === 'Preuve' ? Boolean(note.proofPath.trim()) : true;
    const hasPrecision = weight.label === 'Précision' ? countFilled([note.url, note.endpoint]) >= 1 : true;
    const hasImpact = weight.label === 'Impact' ? countFilled([note.impact]) > 0 : true;
    const hasRepro = weight.label === 'Reproductibilité' ? countFilled([note.nextStep, note.observation]) >= 1 : true;
    const hasClarity = weight.label === 'Clarté' ? countFilled([note.hypothesis, note.observation]) >= 1 : true;
    const satisfied = hasEvidence && hasPrecision && hasImpact && hasRepro && hasClarity;
    return {
      label: weight.label,
      value: satisfied ? weight.value : Math.round(weight.value * 0.35),
      max: weight.value,
      detail: weight.detail,
    };
  });

  const summary = score >= 80
    ? 'Note très exploitable'
    : score >= 60
      ? 'Note exploitable mais à compléter'
      : 'Note trop légère pour un report propre';

  return { score, summary, items };
}

function buildNextSteps(note: NoteRecord, signals: RiskSignal[]): string[] {
  const steps = new Set<string>();
  if (!note.proofPath.trim()) steps.add('Ajouter une preuve exploitable et horodatée.');
  if (!note.nextStep.trim()) steps.add('Décrire la prochaine action concrète.');
  if (!note.impact.trim()) steps.add('Formuler un impact démontré, pas seulement supposé.');
  if (signals.some((signal) => signal.severity === 'high')) {
    steps.add('Rejouer la preuve dans une session propre et isolée.');
  }
  if (note.themeKey === 'api' || note.endpoint.includes('/api')) {
    steps.add('Noter la méthode, les paramètres et la réponse attendue.');
  }
  if (note.inScope === null) {
    steps.add('Confirmer le statut scope avant de pousser plus loin.');
  }
  return [...steps];
}

function renderMarkdownSections(title: string, sections: ReportSection[], checklist: string[], nextSteps: string[], riskSignals: RiskSignal[], score: number): string {
  const lines: string[] = [`# ${title}`, '', `Score qualité: ${score}/100`, ''];

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    if (section.bullets.length === 0) {
      lines.push('- À compléter');
    } else {
      for (const bullet of section.bullets) {
        lines.push(`- ${bullet}`);
      }
    }
    lines.push('');
  }

  lines.push('## Checklist preuve');
  for (const item of checklist) lines.push(`- ${item}`);
  lines.push('');

  lines.push('## Next steps');
  for (const step of nextSteps) lines.push(`- ${step}`);
  lines.push('');

  if (riskSignals.length > 0) {
    lines.push('## Signaux de risque');
    for (const signal of riskSignals) {
      lines.push(`- [${signal.severity}] ${signal.label}: ${signal.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function buildReportDraft(mission: MissionRecord, note: NoteRecord): ReportDraft {
  const combinedText = toLowerText([
    mission.name,
    mission.missionUrl,
    mission.scopeUrl,
    mission.scopeText,
    note.url,
    note.endpoint,
    note.hypothesis,
    note.observation,
    note.impact,
    note.summary,
  ]);
  const riskSignals = detectRiskSignals(combinedText);
  const quality = buildQualityBreakdown(note);
  const nextSteps = buildNextSteps(note, riskSignals);
  const checklist = [
    note.url.trim() ? 'URL documentée' : 'URL à renseigner',
    note.endpoint.trim() ? 'Endpoint / paramètre documenté' : 'Endpoint / paramètre à renseigner',
    note.impact.trim() ? 'Impact décrit' : 'Impact à compléter',
    note.proofPath.trim() ? 'Preuve attachée' : 'Preuve à joindre',
    note.nextStep.trim() ? 'Next step clair' : 'Next step à préciser',
  ];

  const severity = riskSignals[0]?.severity ?? (note.type === 'REPORT' ? 'medium' : 'low');
  const title = `${mission.name} — ${note.themeLabel || 'Report'}`;
  const sections: ReportSection[] = [
    {
      title: 'Summary',
      bullets: [note.summary || 'Résumé à compléter', `Mission: ${mission.name}`, `Thème: ${note.themeLabel || 'Général'}`],
    },
    {
      title: 'Context',
      bullets: [
        `Scope: ${mission.scopeUrl || mission.missionUrl}`,
        note.url ? `URL testée: ${note.url}` : 'URL testée: à renseigner',
        note.endpoint ? `Endpoint: ${note.endpoint}` : 'Endpoint: à renseigner',
      ],
    },
    {
      title: 'Steps to reproduce',
      bullets: [
        note.hypothesis ? note.hypothesis : 'Hypothèse initiale à compléter',
        note.observation ? note.observation : 'Observation à compléter',
        note.nextStep ? note.nextStep : 'Next step à compléter',
      ],
    },
    {
      title: 'Impact',
      bullets: [note.impact || 'Impact à compléter', `Score qualité interne: ${quality.score}/100`],
    },
    {
      title: 'Remediation',
      bullets: [
        'Limiter l’accès aux ressources concernées.',
        'Vérifier les contrôles d’autorisation côté serveur.',
        'Documenter la correction et rejouer la preuve.',
      ],
    },
    {
      title: 'Evidence',
      bullets: [note.proofPath ? `Preuve: ${note.proofPath}` : 'Preuve non attachée', `Entités détectées: ${note.entities.map((entity) => entity.value).join(' · ') || 'aucune'}`],
    },
  ];

  const markdown = renderMarkdownSections(title, sections, checklist, nextSteps, riskSignals, quality.score);

  return {
    title,
    shortSummary: note.summary || quality.summary,
    severity,
    score: quality.score,
    riskSignals,
    checklist,
    nextSteps,
    sections,
    markdown,
  };
}

export function buildPreparationKit(mission: MissionRecord, notes: NoteRecord[]): PreparationKit {
  const recentNotes = [...notes].slice(-5);
  const themes = [...new Set([mission.themeTags, ...recentNotes.map((note) => note.themeLabel)].flat().filter(Boolean))];
  const objectives = [
    mission.dossierSummary,
    mission.policyHints.length > 0 ? `Policy: ${mission.policyHints.join(' · ')}` : 'Policy à relire',
    `Notes existantes: ${notes.length}`,
  ];
  const checklist = [
    'Relire le scope avant la session',
    'Identifier les zones à fort impact',
    'Préparer les preuves attendues',
    'Noter les hypothèses prioritaires',
  ];
  if (mission.scopePatterns.length > 0) {
    checklist.push(`Scope patterns prêts: ${mission.scopePatterns.length}`);
  }
  if (notes.some((note) => note.inScope === false)) {
    checklist.push('Au moins une note hors scope à revalider');
  }

  const notesToReview = recentNotes.map((note) => `${note.themeLabel || note.type} — ${note.summary || note.hypothesis || 'Note sans résumé'}`);

  return {
    title: `Kit de préparation — ${mission.name}`,
    objectives,
    checklist,
    notesToReview,
    themes,
  };
}

export function buildEvidenceIndex(mission: MissionRecord, notes: NoteRecord[]): EvidenceIndex {
  const entries: EvidenceEntry[] = notes
    .filter((note) => note.missionId === mission.id && Boolean(note.proofPath.trim()))
    .map((note) => ({
      noteId: note.id,
      missionId: note.missionId,
      title: note.themeLabel || note.type,
      proofPath: note.proofPath,
      createdAt: note.createdAt,
      score: note.qualityScore,
      summary: note.summary || note.observation || note.hypothesis || 'Note sans résumé',
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    title: `Index des preuves — ${mission.name}`,
    missionId: mission.id,
    totalProofs: entries.length,
    entries,
  };
}
