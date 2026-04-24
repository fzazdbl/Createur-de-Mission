import { describe, expect, it } from 'vitest';
import {
  analyzeNoteContext,
  buildMissionDraft,
  buildRelatedNoteLinks,
  buildSmartQuestions,
  computeQualityScore,
  inferPolicyHints,
  matchScopeUrl,
  parseScopeDocument,
} from '../src/services/missionEngine';

describe('missionEngine', () => {
  it('detects YesWeHack and infers name', () => {
    const draft = buildMissionDraft('https://yeswehack.com/programs/dojo');
    expect(draft.platform).toBe('YesWeHack');
    expect(draft.name.length).toBeGreaterThan(0);
    expect(draft.themeTags).toBeDefined();
  });

  it('scores a complete note higher than an empty one', () => {
    const emptyScore = computeQualityScore({
      id: '1',
      missionId: 'm',
      createdAt: new Date().toISOString(),
      type: 'TEST',
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
    });

    const fullScore = computeQualityScore({
      id: '2',
      missionId: 'm',
      createdAt: new Date().toISOString(),
      type: 'FINDING',
      url: 'https://example.com',
      endpoint: '/api',
      hypothesis: 'Hypothesis',
      observation: 'Observation',
      impact: 'Impact',
      proofPath: 'C:/proof.png',
      nextStep: 'Next',
      inScope: true,
      qualityScore: 0,
      complianceChecks: [],
      themeKey: 'api',
      themeLabel: 'API / Intégration',
      entities: [],
      relatedNotes: [],
      summary: '',
    });

    expect(fullScore).toBeGreaterThan(emptyScore);
  });

  it('infers policy hints from text', () => {
    const hints = inferPolicyHints('No brute force. Automation not allowed. PoC required.');
    expect(hints).toContain('Brute force interdit');
    expect(hints).toContain('Automatisation limitée/interdite');
    expect(hints).toContain('PoC exigée');
  });

  it('builds smart questions for a mission', () => {
    const mission = {
      id: 'm1',
      name: 'dojo',
      platform: 'YesWeHack' as const,
      missionUrl: 'https://yeswehack.com/programs/dojo',
      scopeUrl: 'https://dojo-yeswehack.com',
      phase: 'RECON' as const,
      complianceMode: 'warn' as const,
      status: 'En cours',
      gainEstimated: 0,
      currency: 'EUR',
      policyHints: ['Automatisation limitée/interdite', 'PoC exigée'],
      themeTags: ['API / Intégration'],
      dossierSummary: 'Mission orientée API / Intégration',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };

    const note = {
      id: 'n1',
      missionId: 'm1',
      createdAt: new Date().toISOString(),
      type: 'TEST' as const,
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
      themeKey: 'api',
      themeLabel: 'API / Intégration',
      entities: [],
      relatedNotes: [],
      summary: '',
    };

    const questions = buildSmartQuestions(mission, note);
    expect(questions.length).toBeGreaterThan(3);
    expect(questions.some((question) => question.field === 'inScope')).toBe(true);
  });

  it('detects themes and entities from free text', () => {
    const analysis = analyzeNoteContext('API call to https://api.example.com with token and support@example.com');
    expect(analysis.theme.key).toBe('api');
    expect(analysis.entities.some((entity) => entity.type === 'url')).toBe(true);
    expect(analysis.entities.some((entity) => entity.type === 'email')).toBe(true);
  });

  it('links related notes by shared entities or theme', () => {
    const links = buildRelatedNoteLinks(
      [
        {
          id: 'n1',
          missionId: 'm1',
          createdAt: new Date().toISOString(),
          type: 'TEST',
          url: 'https://api.example.com',
          endpoint: '/api',
          hypothesis: '',
          observation: '',
          impact: '',
          proofPath: '',
          nextStep: '',
          inScope: null,
          qualityScore: 0,
          complianceChecks: [],
          themeKey: 'api',
          themeLabel: 'API / Intégration',
          entities: [],
          relatedNotes: [],
          summary: '',
        },
      ],
      {
        themeKey: 'api',
        entities: [{ id: 'url:https://api.example.com', type: 'url', value: 'https://api.example.com', normalized: 'https://api.example.com', confidence: 1 }],
        missionId: 'm1',
      },
    );

    expect(links.length).toBe(1);
    expect(links[0].noteId).toBe('n1');
  });

  it('parses and matches complex scope patterns', () => {
    const parsed = parseScopeDocument(`
- www.doctolib.{fr|de|it}
- *.doctolib.{fr|de|it|com|net}
- status.doctolib.com (out of scope)
`);

    expect(parsed.patterns.length).toBeGreaterThan(1);

    const positive = matchScopeUrl('https://www.doctolib.fr', parsed.patterns);
    expect(positive.matched).toBe(true);

    const negative = matchScopeUrl('https://status.doctolib.com', parsed.patterns);
    expect(negative.matched).toBe(false);
  });
});
