import type { MissionDossier, MissionRecord, MissionTimelineEntry, NoteRecord } from '../types/mission';
import { analyzeNoteContext, buildRelatedNoteLinks } from './missionEngine';

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function section(title: string, items: string[]): { title: string; items: string[] } {
  return { title, items: uniq(items) };
}

function timelineLabel(note: NoteRecord): string {
  const parts = [note.type, note.themeLabel || 'Général'];
  if (note.nextStep.trim()) {
    parts.push(note.nextStep);
  } else if (note.hypothesis.trim()) {
    parts.push(note.hypothesis);
  }
  return parts.join(' · ');
}

function buildTimeline(notes: NoteRecord[]): MissionTimelineEntry[] {
  return [...notes]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((note) => ({
      noteId: note.id,
      createdAt: note.createdAt,
      label: timelineLabel(note),
      detail: note.summary || note.observation || note.hypothesis || 'Aucun détail',
      score: note.qualityScore,
      inScope: note.inScope,
    }));
}

export function buildMissionDossier(mission: MissionRecord, notes: NoteRecord[]): MissionDossier {
  const noteContexts = notes.map((note) => ({ note, analysis: analyzeNoteContext([mission.name, mission.scopeText, mission.missionUrl, note.url, note.endpoint, note.hypothesis, note.observation, note.impact, note.nextStep].join('\n')) }));
  const linkedNotes = buildRelatedNoteLinks(notes, {
    themeKey: noteContexts[0]?.analysis.theme.key ?? 'general',
    entities: noteContexts.flatMap((entry) => entry.analysis.entities),
    missionId: mission.id,
  });

  const themes = uniq([
    ...mission.themeTags,
    ...noteContexts.map((entry) => entry.analysis.theme.label),
  ]);

  const entities = noteContexts.flatMap((entry) => entry.analysis.entities);
  const summary = mission.dossierSummary || `Dossier ${mission.name} avec ${notes.length} note(s)`;
  const timeline = buildTimeline(notes);

  const sections = [
    section('Contexte', [
      `Mission: ${mission.name}`,
      `Plateforme: ${mission.platform}`,
      `URL: ${mission.missionUrl}`,
      `Phase: ${mission.phase}`,
    ]),
    section('Themes', themes),
    section('Notes clés', noteContexts.map((entry) => entry.analysis.summary)),
    section('Entités détectées', entities.map((entity) => `${entity.type}: ${entity.value}`)),
    section('Preuves', notes.map((note) => note.proofPath).filter(Boolean)),
    section('Prochaines actions', notes.map((note) => note.nextStep).filter(Boolean)),
    section('Journal de campagne', timeline.map((entry) => `${entry.createdAt} — ${entry.label} — score ${entry.score}${entry.inScope === false ? ' — hors scope' : ''}`)),
  ];

  const markdown = [
    `# ${mission.name}`,
    '',
    `## Résumé`,
    summary,
    '',
    ...sections.flatMap((currentSection) => [
      `## ${currentSection.title}`,
      ...(currentSection.items.length > 0 ? currentSection.items.map((item) => `- ${item}`) : ['- Aucun élément détecté']),
      '',
    ]),
    `## Liens`,
    ...(linkedNotes.length > 0
      ? linkedNotes.map((link) => `- ${link.noteId}: ${link.reason} (${Math.round(link.confidence * 100)}%)`)
      : ['- Aucun lien fort détecté']),
  ].join('\n');

  return {
    missionId: mission.id,
    missionName: mission.name,
    summary,
    themes,
    entities,
    linkedNotes,
    timeline,
    sections,
    markdown,
  };
}
