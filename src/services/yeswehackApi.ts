export interface YesWeHackEndpointGroup {
  title: string;
  description: string;
  endpoints: string[];
}

export interface YesWeHackChecklistItem {
  title: string;
  status: 'done' | 'pending' | 'blocked';
  detail: string;
}

export const YESWEHACK_BASE_URL = 'https://apps.yeswehack.com';

export const YESWEHACK_ENDPOINT_GROUPS: YesWeHackEndpointGroup[] = [
  {
    title: 'Identity & app setup',
    description: 'Credentials and OAuth bootstrap for the app itself.',
    endpoints: ['/user', '/user/apps', '/user/report-templates', '/report-templates'],
  },
  {
    title: 'Programs & scopes',
    description: 'Fetch programs, scopes and reference data for dossiers.',
    endpoints: ['/programs', '/programs/count', '/programs/filters-data', '/programs/{slugOrPid}'],
  },
  {
    title: 'Reports & collaboration',
    description: 'Pull report details, logs and transitions for richer dossiers.',
    endpoints: ['/reports/{id}', '/reports/{id}/logs', '/reports/{id}/transitions', '/reports/{id}/support-questions'],
  },
  {
    title: 'ASM / attack surface',
    description: 'Enrich notes with assets, findings and scan history.',
    endpoints: ['/asm/assets/{assetId}', '/asm/findings/{findingId}', '/business-units/{slug}/asm/assets', '/business-units/{slug}/asm/scan-history'],
  },
  {
    title: 'Metadata & templates',
    description: 'Suggestion settings and template metadata for report drafting.',
    endpoints: ['/business-units/{slug}/ai-features/metadata-suggestion-settings', '/programs/{slug}/report-templates'],
  },
];

export function buildYesWeHackPreparationChecklist(): YesWeHackChecklistItem[] {
  return [
    {
      title: 'Support activation request sent',
      status: 'done',
      detail: 'API Apps permission request was sent to support@yeswehack.com with the username.',
    },
    {
      title: 'API App creation pending',
      status: 'pending',
      detail: 'Create the app in My YesWeHack once permissions are enabled.',
    },
    {
      title: 'OAuth flow wired',
      status: 'pending',
      detail: 'Implement authorization code flow with redirect URI and token exchange.',
    },
    {
      title: 'Backend secret handling',
      status: 'blocked',
      detail: 'Client secret must stay server-side; the front-end should never store it.',
    },
    {
      title: 'Read-only sync first',
      status: 'pending',
      detail: 'Start by syncing programs, reports and ASM data before any write operation.',
    },
  ];
}

export function buildYesWeHackIntegrationSummary(): string {
  return [
    `Base URL: ${YESWEHACK_BASE_URL}`,
    'Flow: support activation -> API App -> OAuth authorization code -> token exchange',
    'Recommended initial scope: read-only program/report/ASM sync',
  ].join(' · ');
}
