import { describe, expect, it } from 'vitest';
import { buildMissionDossier } from '../src/services/dossierEngine';
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
    policyHints: [],
    themeTags: ['API / Intégration'],
    dossierSummary: 'Mission orientée API / Intégration',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
  };
}

function makeNote(id: string, url: string): NoteRecord {
  return {
    id,
    missionId: 'm1',
    createdAt: new Date().toISOString(),
    type: 'TEST',
    url,
    endpoint: '/api',
    hypothesis: 'Tester un lien',
    observation: 'Réponse observable',
    impact: 'Impact potentiel',
    proofPath: 'proof.png',
    nextStep: 'Confirmer',
    inScope: true,
    qualityScore: 80,
    complianceChecks: [],
    themeKey: 'api',
    themeLabel: 'API / Intégration',
    entities: [],
    relatedNotes: [],
    summary: 'Résumé de note',
  };
}

describe('dossierEngine', () => {
  it('builds a dossier summary and markdown', () => {
    const dossier = buildMissionDossier(makeMission(), [makeNote('n1', 'https://api.example.com')]);
    expect(dossier.summary.length).toBeGreaterThan(0);
    expect(dossier.sections.length).toBeGreaterThan(0);
    expect(dossier.markdown).toContain('# Mission API');
  });

  it('includes a chronological campaign timeline', () => {
    const noteA = makeNote('n1', 'https://api.example.com');
    noteA.createdAt = '2026-04-23T10:00:00.000Z';
    noteA.nextStep = 'Valider l’accès';
    const noteB = makeNote('n2', 'https://api.example.com/account');
    noteB.createdAt = '2026-04-23T11:00:00.000Z';
    noteB.inScope = false;

    const dossier = buildMissionDossier(makeMission(), [noteB, noteA]);
    expect(dossier.timeline).toHaveLength(2);
    expect(dossier.timeline[0].noteId).toBe('n1');
    expect(dossier.markdown).toContain('Journal de campagne');
  });
});
