import { describe, expect, it } from 'vitest';
import { buildEvidenceIndex, buildPreparationKit, buildQualityBreakdown, buildReportDraft, detectRiskSignals } from '../src/services/nicheEngine';
import type { MissionRecord, NoteRecord } from '../src/types/mission';

function makeMission(): MissionRecord {
  return {
    id: 'm1',
    name: 'Mission API',
    platform: 'YesWeHack',
    missionUrl: 'https://yeswehack.com/programs/dojo',
    scopeUrl: 'https://yeswehack.com/programs/dojo',
    scopeText: '- *.example.com',
    scopePatterns: [],
    phase: 'RECON',
    complianceMode: 'warn',
    status: 'En cours',
    gainEstimated: 0,
    currency: 'EUR',
    policyHints: ['PoC exigée'],
    themeTags: ['API / Intégration'],
    dossierSummary: 'Mission orientée API / Intégration',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
  };
}

function makeNote(): NoteRecord {
  return {
    id: 'n1',
    missionId: 'm1',
    createdAt: new Date().toISOString(),
    type: 'FINDING',
    url: 'https://api.example.com/login',
    endpoint: '/api/login?token=abc',
    hypothesis: 'Tester un accès sensible',
    observation: 'Réponse avec cookie de session',
    impact: 'Exposition potentielle de session',
    proofPath: 'proof.png',
    nextStep: 'Rejouer sans cookie',
    inScope: true,
    qualityScore: 0,
    complianceChecks: [],
    themeKey: 'api',
    themeLabel: 'API / Intégration',
    entities: [{ id: 'url:https://api.example.com/login', type: 'url', value: 'https://api.example.com/login', normalized: 'https://api.example.com/login', confidence: 1 }],
    relatedNotes: [],
    summary: 'Résumé de note',
  };
}

describe('nicheEngine', () => {
  it('builds a report draft with risks and markdown', () => {
    const report = buildReportDraft(makeMission(), makeNote());
    expect(report.title).toContain('Mission API');
    expect(report.markdown).toContain('# Mission API');
    expect(report.riskSignals.length).toBeGreaterThan(0);
    expect(report.nextSteps.length).toBeGreaterThan(0);
  });

  it('builds a quality breakdown and preparation kit', () => {
    const quality = buildQualityBreakdown(makeNote());
    expect(quality.score).toBeGreaterThan(0);
    expect(quality.items.every((item) => item.max > 0)).toBe(true);

    const kit = buildPreparationKit(makeMission(), [makeNote()]);
    expect(kit.title).toContain('Mission API');
    expect(kit.checklist.length).toBeGreaterThan(0);
    expect(kit.notesToReview.length).toBeGreaterThan(0);
  });

  it('indexes evidence artifacts for the mission', () => {
    const evidenceIndex = buildEvidenceIndex(makeMission(), [makeNote()]);
    expect(evidenceIndex.totalProofs).toBe(1);
    expect(evidenceIndex.entries[0].proofPath).toBe('proof.png');
  });

  it('detects high-risk signals in sensitive text', () => {
    const signals = detectRiskSignals('OAuth token and admin panel with payment and file upload');
    expect(signals.some((signal) => signal.severity === 'high')).toBe(true);
    expect(signals.some((signal) => signal.key === 'credential')).toBe(true);
  });
});
