export type Platform = 'YesWeHack' | 'HackerOne' | 'Bugcrowd' | 'Autre';
export type MissionPhase = 'RECON' | 'TEST' | 'FINDING' | 'REPORT' | 'BLOCKER' | 'PAYMENT';
export type ComplianceMode = 'warn' | 'strict';
export type ScopeAssetType = 'web' | 'api' | 'ios' | 'android' | 'other';
export type DetectedEntityType = 'url' | 'domain' | 'ip' | 'email' | 'technology' | 'keyword';

export interface DetectedEntity {
  id: string;
  type: DetectedEntityType;
  value: string;
  normalized: string;
  confidence: number;
}

export interface DetectedTheme {
  key: string;
  label: string;
  confidence: number;
  keywords: string[];
}

export interface RelatedNoteLink {
  noteId: string;
  reason: string;
  confidence: number;
}

export interface DossierSection {
  title: string;
  items: string[];
}

export interface MissionDossier {
  missionId: string;
  missionName: string;
  summary: string;
  themes: string[];
  entities: DetectedEntity[];
  linkedNotes: RelatedNoteLink[];
  timeline: MissionTimelineEntry[];
  sections: DossierSection[];
  markdown: string;
}

export interface MissionTimelineEntry {
  noteId: string;
  createdAt: string;
  label: string;
  detail: string;
  score: number;
  inScope: boolean | null;
}

export type RiskSeverity = 'info' | 'low' | 'medium' | 'high';

export interface RiskSignal {
  key: string;
  label: string;
  severity: RiskSeverity;
  detail: string;
}

export interface QualityBreakdownItem {
  label: string;
  value: number;
  max: number;
  detail: string;
}

export interface QualityBreakdown {
  score: number;
  summary: string;
  items: QualityBreakdownItem[];
}

export interface ReportSection {
  title: string;
  bullets: string[];
}

export interface ReportDraft {
  title: string;
  shortSummary: string;
  severity: RiskSeverity;
  score: number;
  riskSignals: RiskSignal[];
  checklist: string[];
  nextSteps: string[];
  sections: ReportSection[];
  markdown: string;
}

export interface PreparationKit {
  title: string;
  objectives: string[];
  checklist: string[];
  notesToReview: string[];
  themes: string[];
}

export interface EvidenceEntry {
  noteId: string;
  missionId: string;
  title: string;
  proofPath: string;
  createdAt: string;
  score: number;
  summary: string;
}

export interface EvidenceIndex {
  title: string;
  missionId: string;
  totalProofs: number;
  entries: EvidenceEntry[];
}

export interface ScopePattern {
  raw: string;
  normalized: string;
  isExcluded: boolean;
  assetType: ScopeAssetType;
}

export interface ScopeMatchResult {
  matched: boolean;
  pattern?: ScopePattern;
  reason: string;
}

export interface MissionRecord {
  id: string;
  name: string;
  platform: Platform;
  missionUrl: string;
  scopeUrl: string;
  scopeText: string;
  scopePatterns: ScopePattern[];
  phase: MissionPhase;
  complianceMode: ComplianceMode;
  status: string;
  gainEstimated: number;
  currency: string;
  policyHints: string[];
  themeTags: string[];
  dossierSummary: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface NoteRecord {
  id: string;
  missionId: string;
  createdAt: string;
  type: MissionPhase;
  url: string;
  endpoint: string;
  hypothesis: string;
  observation: string;
  impact: string;
  proofPath: string;
  nextStep: string;
  inScope: boolean | null;
  qualityScore: number;
  complianceChecks: string[];
  themeKey: string;
  themeLabel: string;
  entities: DetectedEntity[];
  relatedNotes: RelatedNoteLink[];
  summary: string;
}

export interface SmartQuestion {
  id: string;
  prompt: string;
  field: keyof Pick<NoteRecord, 'url' | 'endpoint' | 'hypothesis' | 'observation' | 'impact' | 'proofPath' | 'nextStep'> | 'inScope';
  kind: 'text' | 'boolean' | 'textarea' | 'select';
  help?: string;
  options?: Array<{ label: string; value: string | boolean }>;
  required?: boolean;
}

export interface ScopeParseResult {
  patterns: ScopePattern[];
  notes: string[];
}
