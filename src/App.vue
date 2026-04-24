<template>
  <main ref="shellRef" class="shell" :class="{ dragging: isDragging }" @mousedown.capture="startDrag" @dragstart.prevent>
    <svg aria-hidden="true" class="liquid-glass-defs">
      <defs>
        <filter :id="liquidGlassFilterId" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feImage
            :href="liquidGlassDisplacementMap"
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="displacement_map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacement_map"
            :scale="liquidGlassScale"
            xChannelSelector="R"
            yChannelSelector="G"
            result="refracted"
          />
          <feImage
            :href="liquidGlassHighlightMap"
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="specular_highlight"
          />
          <feBlend in="refracted" in2="specular_highlight" mode="screen" />
        </filter>
      </defs>
    </svg>

    <!-- ── HEADER ─────────────────────────────────────────────────────── -->
    <header class="app-header">
      <div class="app-brand">
        <span class="brand-dot"></span>
        YesWeHack Mission Console
      </div>
      <div class="header-stats">
        <span class="stat-item"><strong>{{ missions.length }}</strong> missions</span>
        <span class="stat-item"><strong>{{ notes.length }}</strong> notes</span>
        <span class="backend-status">
          <span class="backend-dot" :class="backendState.health?.ok ? 'ok' : 'off'"></span>
          backend
        </span>
      </div>
    </header>

    <!-- ── NAVIGATION ────────────────────────────────────────────────── -->
    <nav class="nav-strip liquid-glass-target" :class="{ 'liquid-glass-active': liquidGlassEnabled }" :style="liquidGlassStyle">
      <a href="#create" class="nav-link">Mission Control</a>
      <a href="#notes-section" class="nav-link">Intelligence</a>
      <a href="#report" class="nav-link" v-if="selectedMission && reportPreview">Live Report</a>
      <a href="#yeswehack" class="nav-link">Security Cloud</a>
    </nav>

    <!-- ── HERO ──────────────────────────────────────────────────────── -->
    <section class="ywh-hero page-section">
      <p class="hero-kicker">Genesis v2.0 Protocol</p>
      <h1>Intelligence Augmentée pour Bug Bounty.</h1>
      <p class="section-description">
        Une interface fluide et mathématique pour piloter tes missions YesWeHack. Clarté absolue, sécurité locale.
      </p>
    </section>

    <!-- ── SECTION : CRÉER ────────────────────────────────────────────── -->
    <section id="create" class="page-section">
      <div class="section-header">
        <span class="section-label">Configuration cible</span>
        <span class="section-count">Setup</span>
      </div>
      <div class="two-col">

        <!-- Mission Form -->
        <div class="glass-card form-panel">
          <h2 class="panel-title">Blueprint mission</h2>
          <form class="form-stack" @submit.prevent="createMission">
            <div class="form-group">
              <label class="form-label">URL programme</label>
              <input class="form-input" v-model="missionUrl" placeholder="https://yeswehack.com/programs/dojo" />
            </div>
            <div class="form-group">
              <label class="form-label">Nom affiché</label>
              <input class="form-input" v-model="missionName" placeholder="e.g. Project Phoenix" />
            </div>
            <div class="form-group">
              <label class="form-label">Scope principal</label>
              <input class="form-input" v-model="scopeUrl" placeholder="https://target.tld" />
            </div>
            <div class="form-group">
              <label class="form-label">Patterns de scope / brut</label>
              <textarea class="form-input" v-model="scopeText" rows="4"
                placeholder="*.target.tld&#10;api.target.tld/v2/*"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Extrait policy (optionnel)</label>
              <textarea class="form-input" v-model="policyText" rows="3"
                placeholder="Paste key policy details here..."></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phase</label>
                <select class="form-input" v-model="phase">
                  <option>RECON</option>
                  <option>TEST</option>
                  <option>FINDING</option>
                  <option>REPORT</option>
                  <option>BLOCKER</option>
                  <option>PAYMENT</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Compliance</label>
                <select class="form-input" v-model="complianceMode">
                  <option value="warn">Standard</option>
                  <option value="strict">Strict Privacy</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn-primary">Initialiser mission</button>
          </form>
        </div>

        <!-- Note Assistant -->
        <div class="glass-card form-panel">
          <h2 class="panel-title">Intelligence report</h2>
          <form class="form-stack" @submit.prevent="createNote">
            <div class="form-group">
              <label class="form-label">Contexte mission actif</label>
              <select class="form-input" v-model="selectedMissionId">
                <option value="">Select mission...</option>
                <option v-for="mission in missions" :key="mission.id" :value="mission.id">{{ mission.name }}</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Type d’intelligence</label>
                <select class="form-input" v-model="noteType">
                  <option>RECON</option>
                  <option>TEST</option>
                  <option>FINDING</option>
                  <option>REPORT</option>
                  <option>BLOCKER</option>
                  <option>PAYMENT</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Validation scope</label>
                <select class="form-input" v-model="inScopeValue">
                  <option :value="null">Confirming...</option>
                  <option :value="true">In Scope</option>
                  <option :value="false">Out of Scope</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">URL / endpoint testé</label>
              <input class="form-input" v-model="noteUrl" placeholder="https://target.tld/path" />
              <span v-if="scopePreview" class="form-hint"
                :class="scopePreview.startsWith('OK') ? 'hint-ok' : 'hint-ko'">{{ scopePreview }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Vecteurs / paramètres</label>
              <input class="form-input" v-model="endpoint" placeholder="/api/v1/auth?id=admin" />
            </div>
            <div class="form-group">
              <label class="form-label">Hypothesis</label>
              <textarea class="form-input" v-model="hypothesis" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Observation</label>
              <textarea class="form-input" v-model="observation" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Analyse impact métier</label>
              <textarea class="form-input" v-model="impact" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Lien preuve (local)</label>
              <input class="form-input" v-model="proofPath" placeholder="C:\proofs\vuln-01.png" />
            </div>
            <div class="form-group">
              <label class="form-label">Objectif</label>
              <input class="form-input" v-model="nextStep" placeholder="Next operational step" />
            </div>
            <button type="submit" class="btn-primary">Ajouter intelligence</button>
          </form>

          <!-- Smart Panel contextuel -->
          <div v-if="selectedMission" class="smart-panel liquid-glass-target" :class="{ 'liquid-glass-active': liquidGlassEnabled }" :style="liquidGlassStyle">
            <div class="smart-panel-header">
              <span class="section-label">AI Insights</span>
              <span v-if="noteAnalysis" class="theme-tag">{{ noteAnalysis.theme.label }}</span>
            </div>
            <p v-if="noteAnalysis" class="smart-summary">{{ noteAnalysis.summary }}</p>
            <div v-if="noteAnalysis && noteAnalysis.entities.length > 0" class="entity-chips">
              <span v-for="entity in noteAnalysis.entities" :key="entity.id" class="entity-chip">{{ entity.value }}</span>
            </div>
            <div v-if="smartQuestions.length > 0" class="smart-questions">
              <div v-for="q in smartQuestions" :key="q.id" class="smart-question-item">
                <span class="sq-prefix">›</span>
                <div>
                  <p class="sq-prompt">{{ q.prompt }}</p>
                  <p v-if="q.help" class="sq-help">{{ q.help }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ── SECTION : DASHBOARD ────────────────────────────────────────── -->
    <section id="dashboard" class="page-section">
      <div class="section-header">
        <span class="section-label">Active Deployments</span>
        <span class="section-count">{{ missions.length }}</span>
      </div>
      <div v-if="missions.length === 0" class="empty-state">No missions deployed. Start by creating a blueprint above.</div>
      <div v-else class="cards-grid">
        <article v-for="mission in missions" :key="mission.id" class="glass-card mission-card"
          :data-phase="mission.phase">
          <div class="card-header">
            <div>
              <h3 class="card-title">{{ mission.name }}</h3>
              <p class="card-meta">{{ mission.platform }} · {{ mission.complianceMode }}</p>
            </div>
            <span class="status-badge" :class="'phase-' + mission.phase.toLowerCase()">{{ mission.phase }}</span>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="card-key">Endpoint</span>
              <span class="card-val mono-text">{{ mission.missionUrl || '—' }}</span>
            </div>
            <div class="card-row">
              <span class="card-key">Scope Root</span>
              <span class="card-val mono-text">{{ mission.scopeUrl || '—' }}</span>
            </div>
            <div class="card-row">
              <span class="card-key">Patterns</span>
              <span class="card-val">{{ mission.scopePatterns.length }}</span>
            </div>
            <div v-if="mission.policyHints.length" class="card-row">
              <span class="card-key">Policy</span>
              <span class="card-val">{{ mission.policyHints.join(' · ') }}</span>
            </div>
            <div class="card-row">
              <span class="card-key">Notes</span>
              <span class="card-val">{{ notesForMission(mission.id).length }}</span>
            </div>
            <div v-if="mission.gainEstimated" class="card-row">
              <span class="card-key">Gain estimé</span>
              <span class="card-val">{{ mission.gainEstimated }} {{ mission.currency }}</span>
            </div>
            <div v-if="mission.themeTags.length" class="theme-tags">
              <span v-for="tag in mission.themeTags" :key="tag" class="theme-tag">{{ tag }}</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="compliance-badge" :class="mission.complianceMode">{{ mission.complianceMode }}</span>
            <span class="card-status">{{ mission.status }}</span>
            <button class="btn-ghost" @click="selectedMissionId = mission.id">Select Context</button>
          </div>
        </article>
      </div>
    </section>

    <!-- ── SECTION : INTELLIGENCE (NOTES) ─────────────────────────── -->
    <section id="notes-section" class="page-section">
      <div class="section-header">
        <span class="section-label">Intelligence Library</span>
        <span class="section-count">{{ notes.length }}</span>
      </div>
      <div v-if="notes.length === 0" class="empty-state">No telemetry recorded yet.</div>
      <div v-else class="cards-grid">
        <article v-for="note in notes" :key="note.id" class="glass-card note-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">{{ note.type }}</h3>
              <p class="card-meta">{{ note.themeLabel }}</p>
            </div>
            <span class="quality-badge">{{ note.qualityScore }}<small>/100</small></span>
          </div>
          <div class="card-body">
            <div v-if="note.url" class="card-row">
              <span class="card-key">Endpoint</span>
              <span class="card-val mono-text">{{ note.url }}</span>
            </div>
            <div v-if="note.hypothesis" class="card-row">
              <span class="card-key">Hypothesis</span>
              <span class="card-val">{{ note.hypothesis }}</span>
            </div>
            <div v-if="note.observation" class="card-row">
              <span class="card-key">Observation</span>
              <span class="card-val">{{ note.observation }}</span>
            </div>
            <div v-if="note.impact" class="card-row">
              <span class="card-key">Impact</span>
              <span class="card-val">{{ note.impact }}</span>
            </div>
            <div v-if="note.nextStep" class="card-row">
              <span class="card-key">Next Step</span>
              <span class="card-val highlight-blue">{{ note.nextStep }}</span>
            </div>
            <p v-if="note.summary" class="note-summary">{{ note.summary }}</p>
            <div v-if="note.entities.length" class="entity-chips">
              <span v-for="entity in note.entities" :key="entity.id" class="entity-chip">{{ entity.value }}</span>
            </div>
          </div>
          <div v-if="note.complianceChecks.length" class="card-footer">
            <span class="compliance-warn" v-for="check in note.complianceChecks" :key="check">⚠ {{ check }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ── SECTION : CASE DOSSIER ──────────────────────────────────────────── -->
    <section id="dossier" class="page-section" v-if="selectedMission && dossierPreview">
      <div class="section-header">
        <span class="section-label">Case Dossier · {{ selectedMission.name }}</span>
      </div>
      <p class="section-description">{{ dossierPreview.summary }}</p>

      <div class="dossier-grid">
        <div v-for="section in dossierPreview.sections" :key="section.title" class="glass-card dossier-card">
          <h3 class="card-title">{{ section.title }}</h3>
          <ul v-if="section.items.length" class="dossier-list">
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>

      <div v-if="dossierPreview.timeline.length" class="glass-card timeline-card">
        <h3 class="card-title">Operation Timeline</h3>
        <ul class="timeline-list">
          <li v-for="entry in dossierPreview.timeline" :key="entry.noteId" class="timeline-entry">
            <span class="timeline-date mono-text">{{ entry.createdAt }}</span>
            <div class="timeline-content">
              <span class="timeline-label">{{ entry.label }}</span>
              <span class="quality-badge small">{{ entry.score }}</span>
              <span v-if="entry.inScope === false" class="out-of-scope">hors scope</span>
            </div>
          </li>
        </ul>
      </div>

      <details class="glass-card markdown-card">
        <summary class="markdown-summary">Markdown du dossier</summary>
        <pre class="markdown-pre">{{ dossierPreview.markdown }}</pre>
      </details>
    </section>

    <!-- ── SECTION : REPORT ───────────────────────────────────────────── -->
    <section id="report" class="page-section" v-if="selectedMission && reportPreview">
      <div class="section-header">
        <span class="section-label">Report prêt à envoyer</span>
        <span v-if="reportPreview.severity" class="severity-badge"
          :class="'sev-' + reportPreview.severity.toLowerCase()">{{ reportPreview.severity }}</span>
      </div>
      <p class="section-description">{{ reportPreview.shortSummary }}</p>

      <div class="report-meta glass-card">
        <div class="report-meta-row">
          <span class="card-key">Titre</span>
          <span class="card-val">{{ reportPreview.title }}</span>
        </div>
        <div class="report-meta-row">
          <span class="card-key">Score</span>
          <div class="score-bar-wrap">
            <div class="score-bar" :style="{ width: reportPreview.score + '%' }"></div>
            <span class="score-val">{{ reportPreview.score }}/100</span>
          </div>
        </div>
      </div>

      <div class="risk-signals">
        <div v-for="signal in reportPreview.riskSignals" :key="signal.key" class="risk-signal"
          :class="'risk-' + signal.severity">
          <div class="risk-header">
            <span class="risk-label">{{ signal.label }}</span>
            <span class="risk-sev">{{ signal.severity }}</span>
          </div>
          <p class="risk-detail">{{ signal.detail }}</p>
        </div>
      </div>

      <div class="dossier-grid">
        <div v-for="section in reportPreview.sections" :key="section.title" class="glass-card dossier-card">
          <h3 class="card-title">{{ section.title }}</h3>
          <ul class="dossier-list">
            <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
          </ul>
        </div>
      </div>

      <div class="two-col small-gap">
        <div class="glass-card dossier-card">
          <h3 class="card-title">Checklist preuve</h3>
          <ul class="dossier-list">
            <li v-for="item in reportPreview.checklist" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="glass-card dossier-card">
          <h3 class="card-title">Next steps</h3>
          <ul class="dossier-list">
            <li v-for="step in reportPreview.nextSteps" :key="step">{{ step }}</li>
          </ul>
        </div>
      </div>

      <div v-if="qualityBreakdown" class="glass-card quality-card">
        <h3 class="card-title">Qualité · <span class="quality-score">{{ qualityBreakdown.score }}/100</span></h3>
        <p class="card-meta">{{ qualityBreakdown.summary }}</p>
        <div class="quality-items">
          <div v-for="item in qualityBreakdown.items" :key="item.label" class="quality-item">
            <div class="quality-item-header">
              <span class="quality-item-label">{{ item.label }}</span>
              <span class="quality-item-score">{{ item.value }}/{{ item.max }}</span>
            </div>
            <div class="quality-bar-wrap">
              <div class="quality-bar" :style="{ width: (item.value / item.max * 100) + '%' }"></div>
            </div>
            <p class="quality-item-detail">{{ item.detail }}</p>
          </div>
        </div>
      </div>

      <details class="glass-card markdown-card">
        <summary class="markdown-summary">Markdown du report</summary>
        <pre class="markdown-pre">{{ reportPreview.markdown }}</pre>
      </details>
    </section>

    <!-- ── SECTION : KIT DE PRÉPARATION ──────────────────────────────── -->
    <section v-if="selectedMission && preparationKit" class="page-section">
      <div class="section-header">
        <span class="section-label">Kit de préparation terrain</span>
      </div>
      <p class="section-description">{{ preparationKit.title }}</p>
      <div class="dossier-grid">
        <div class="glass-card dossier-card">
          <h3 class="card-title">Objectifs</h3>
          <ul class="dossier-list">
            <li v-for="item in preparationKit.objectives" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="glass-card dossier-card">
          <h3 class="card-title">Checklist session</h3>
          <ul class="dossier-list">
            <li v-for="item in preparationKit.checklist" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="glass-card dossier-card">
          <h3 class="card-title">Notes à revoir</h3>
          <ul class="dossier-list">
            <li v-for="item in preparationKit.notesToReview" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>
      <div v-if="preparationKit.themes.length" class="theme-tags">
        <span v-for="tag in preparationKit.themes" :key="tag" class="theme-tag">{{ tag }}</span>
      </div>
    </section>

    <!-- ── SECTION : INDEX PREUVES ────────────────────────────────────── -->
    <section v-if="selectedMission && evidenceIndex && evidenceIndex.entries.length" class="page-section">
      <div class="section-header">
        <span class="section-label">Index des preuves</span>
        <span class="section-count">{{ evidenceIndex.totalProofs }}</span>
      </div>
      <div class="cards-grid">
        <div v-for="entry in evidenceIndex.entries" :key="entry.noteId" class="glass-card note-card">
          <div class="card-header">
            <h3 class="card-title">{{ entry.title }}</h3>
            <span class="quality-badge">{{ entry.score }}</span>
          </div>
          <div class="card-body">
            <p class="note-summary">{{ entry.summary }}</p>
            <div class="card-row">
              <span class="card-key">Preuve</span>
              <span class="card-val mono-text">{{ entry.proofPath }}</span>
            </div>
            <div class="card-row">
              <span class="card-key">Date</span>
              <span class="card-val mono-text">{{ entry.createdAt }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── SECTION : YESWEHACK ────────────────────────────────────────── -->
    <section id="yeswehack" class="page-section">
      <div class="section-header">
        <span class="section-label">Opérations YesWeHack</span>
        <span class="status-badge" :class="backendState.health?.ok ? 'phase-report' : 'phase-blocker'">
          {{ backendState.health?.ok ? 'Backend actif' : 'Hors ligne' }}
        </span>
      </div>
      <p class="section-description">{{ yeswehackSummary }}</p>

      <div class="two-col small-gap">
        <div class="glass-card info-card">
          <h3 class="card-title">État backend</h3>
          <div class="card-row">
            <span class="card-key">URL</span>
            <span class="card-val mono-text">{{ backendState.baseUrl }}</span>
          </div>
          <div v-if="backendState.error" class="card-row">
            <span class="card-key">Erreur</span>
            <span class="card-val danger-text">{{ backendState.error }}</span>
          </div>
          <div v-if="backendState.health" class="card-row">
            <span class="card-key">Service</span>
            <span class="card-val">{{ backendState.health.service }}</span>
          </div>
          <div v-if="backendState.meta" class="card-row">
            <span class="card-key">Mode</span>
            <span class="card-val">{{ backendState.meta.mode }}</span>
          </div>
          <div v-if="backendState.meta" class="card-row">
            <span class="card-key">Features</span>
            <span class="card-val">{{ backendState.meta.features.join(' · ') }}</span>
          </div>
        </div>

        <div v-if="privateVaultLocation" class="glass-card info-card">
          <h3 class="card-title">Coffre privé</h3>
          <div class="card-row">
            <span class="card-key">Dossier</span>
            <span class="card-val mono-text">{{ privateVaultLocation.directory }}</span>
          </div>
          <div class="card-row">
            <span class="card-key">Fichier</span>
            <span class="card-val mono-text">{{ privateVaultLocation.filePath }}</span>
          </div>
          <div class="card-row">
            <span class="card-key">Statut</span>
            <span class="card-val" :class="privateVaultLocation.exists ? 'ok-text' : 'warning-text'">
              {{ privateVaultLocation.exists ? 'Présent' : 'À initialiser' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="backendState.oauth" class="glass-card info-card" style="margin-top: 1rem;">
        <h3 class="card-title">OAuth YesWeHack</h3>
        <div class="card-row">
          <span class="card-key">Auth URL</span>
          <span class="card-val mono-text">{{ backendState.oauth.authorizationUrl || 'Non configuré' }}</span>
        </div>
        <div v-if="backendState.oauth.state" class="card-row">
          <span class="card-key">State</span>
          <span class="card-val mono-text">{{ backendState.oauth.state }}</span>
        </div>
        <div v-if="backendState.oauth.missing.length" class="card-row">
          <span class="card-key">Manquants</span>
          <span class="card-val danger-text">{{ backendState.oauth.missing.join(', ') }}</span>
        </div>
        <div v-if="backendState.oauth.lastResult" class="card-row">
          <span class="card-key">Dernier échange</span>
          <span class="card-val">{{ oauthResultLabel }}</span>
        </div>
        <div class="btn-row">
          <button type="button" class="btn-ghost" :disabled="!backendState.oauth.authPreviewUrl"
            @click="startOAuthFlow">Lancer OAuth</button>
          <button type="button" class="btn-ghost" :disabled="!backendState.oauth.authPreviewUrl"
            @click="openOAuthPreview">URL d'autorisation</button>
          <button type="button" class="btn-ghost" @click="reloadBackendState">Rafraîchir</button>
        </div>
        <details v-if="backendState.oauth.lastResult" class="mt-2">
          <summary class="markdown-summary">Retour OAuth JSON</summary>
          <pre class="markdown-pre">{{ oauthResultJson }}</pre>
        </details>
      </div>

      <details class="glass-card markdown-card compact-details">
        <summary class="markdown-summary">Endpoints et checklist avancée</summary>
        <div class="dossier-grid">
          <div v-for="group in yeswehackGroups" :key="group.title" class="glass-card dossier-card">
            <h3 class="card-title">{{ group.title }}</h3>
            <p v-if="group.description" class="card-meta" style="margin-bottom: 0.4rem;">{{ group.description }}</p>
            <ul class="dossier-list mono-list">
              <li v-for="ep in group.endpoints" :key="ep">{{ ep }}</li>
            </ul>
          </div>
        </div>

        <div class="checklist-grid">
          <div v-for="item in yeswehackChecklist" :key="item.title" class="checklist-item">
            <span class="checklist-status"
              :class="item.status === 'done' ? 'check-done' : item.status === 'pending' ? 'check-pending' : 'check-blocked'">
              {{ item.status === 'done' ? '✓' : item.status === 'pending' ? '○' : '✗' }}
            </span>
            <div>
              <p class="checklist-title">{{ item.title }}</p>
              <p class="checklist-detail">{{ item.detail }}</p>
            </div>
          </div>
          <div v-for="item in backendState.checklist" :key="item.title" class="checklist-item">
            <span class="checklist-status"
              :class="item.status === 'done' ? 'check-done' : item.status === 'pending' ? 'check-pending' : 'check-blocked'">
              {{ item.status === 'done' ? '✓' : item.status === 'pending' ? '○' : '✗' }}
            </span>
            <div>
              <p class="checklist-title">{{ item.title }}</p>
              <p class="checklist-detail">Backend</p>
            </div>
          </div>
        </div>
      </details>
    </section>

  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useMissionStore } from './stores/missions';
import { useNotesStore } from './stores/notes';
import { buildMissionDossier } from './services/dossierEngine';
import { loadBackendState, loadPrivateVaultLocation, type BackendState } from './services/backendClient';
import { bootstrapPrivateVaultSnapshot } from './services/privateVaultSync';
import {
  YESWEHACK_ENDPOINT_GROUPS,
  buildYesWeHackIntegrationSummary,
  buildYesWeHackPreparationChecklist,
} from './services/yeswehackApi';
import {
  analyzeNoteContext,
  buildMissionDraft,
  buildRelatedNoteLinks,
  buildSmartQuestions,
  complianceChecksForMission,
  computeQualityScore,
  inferPolicyHints,
  makeMissionId,
  matchScopeUrl,
  nowIso,
  parseScopeDocument,
  prepareNoteDraft,
} from './services/missionEngine';
import {
  buildEvidenceIndex,
  buildPreparationKit,
  buildQualityBreakdown,
  buildReportDraft,
} from './services/nicheEngine';
import { buildLiquidGlassAssets } from './services/liquidGlassEngine';
import type { MissionPhase, MissionRecord, NoteRecord } from './types/mission';

const { missions, addMission, replaceMissions } = useMissionStore();
const { notes, addNote, notesByMission, replaceNotes } = useNotesStore();

const missionUrl = ref('');
const missionName = ref('');
const scopeUrl = ref('');
const scopeText = ref('');
const policyText = ref('');
const phase = ref<MissionPhase>('RECON');
const complianceMode = ref<'warn' | 'strict'>('warn');

const selectedMissionId = ref('');
const noteType = ref<MissionPhase>('TEST');
const noteUrl = ref('');
const endpoint = ref('');
const hypothesis = ref('');
const observation = ref('');
const impact = ref('');
const proofPath = ref('');
const nextStep = ref('');
const inScopeValue = ref<boolean | null>(null);
const DRAG_SCROLL_SPEED = 6;
const isDragging = ref(false);
const dragState = {
  active: false,
  startY: 0,
  lastY: 0,
};
const shellRef = ref<HTMLElement | null>(null);
const backendState = ref<BackendState>({
  baseUrl: 'http://127.0.0.1:8787',
  health: null,
  meta: null,
  checklist: [],
  error: null,
});
const privateVaultLocation = ref<{ directory: string; filePath: string; exists: boolean } | null>(null);
const liquidGlassFilterId = 'mission-liquid-glass-filter';
const liquidGlassDisplacementMap = ref('');
const liquidGlassHighlightMap = ref('');
const liquidGlassScale = ref(0);
const liquidGlassEnabled = ref(false);
const liquidGlassStyle = computed(() => (
  liquidGlassEnabled.value
    ? {
      backdropFilter: `url(#${liquidGlassFilterId})`,
      WebkitBackdropFilter: `url(#${liquidGlassFilterId})`,
    }
    : {
      backdropFilter: 'blur(18px) saturate(150%)',
      WebkitBackdropFilter: 'blur(18px) saturate(150%)',
    }
));

const oauthResultLabel = computed(() => {
  const lastResult = backendState.value.oauth?.lastResult;
  if (!lastResult) return 'Aucun échange enregistré';
  if (typeof lastResult === 'string') return lastResult;
  if (typeof lastResult === 'object' && lastResult !== null) {
    const typedResult = lastResult as { status?: string; receivedAt?: string };
    const status = typedResult.status || 'unknown';
    return typedResult.receivedAt ? `${status} · ${typedResult.receivedAt}` : status;
  }
  return String(lastResult);
});

const oauthResultJson = computed(() => JSON.stringify(backendState.value.oauth?.lastResult ?? null, null, 2));

const selectedMission = computed(() => missions.value.find((mission) => mission.id === selectedMissionId.value) ?? null);
const dossierPreview = computed(() => {
  if (!selectedMission.value) return null;
  return buildMissionDossier(selectedMission.value, notesForMission(selectedMission.value.id));
});
const yeswehackGroups = YESWEHACK_ENDPOINT_GROUPS;
const yeswehackChecklist = buildYesWeHackPreparationChecklist();
const yeswehackSummary = buildYesWeHackIntegrationSummary();
const currentNoteDraft = computed(() => {
  if (!selectedMission.value) return null;
  const note = prepareNoteDraft(selectedMission.value.id, noteType.value);
  note.url = noteUrl.value.trim();
  note.endpoint = endpoint.value.trim();
  note.hypothesis = hypothesis.value.trim();
  note.observation = observation.value.trim();
  note.impact = impact.value.trim();
  note.proofPath = proofPath.value.trim();
  note.nextStep = nextStep.value.trim();
  note.inScope = inScopeValue.value;
  return note;
});

const noteAnalysis = computed(() => {
  if (!selectedMission.value || !currentNoteDraft.value) return null;
  return analyzeNoteContext(
    [
      selectedMission.value.name,
      selectedMission.value.scopeText,
      selectedMission.value.missionUrl,
      currentNoteDraft.value.url,
      currentNoteDraft.value.endpoint,
      currentNoteDraft.value.hypothesis,
      currentNoteDraft.value.observation,
      currentNoteDraft.value.impact,
      currentNoteDraft.value.nextStep,
    ].join('\n'),
  );
});

const selectedMissionQuestions = computed(() => {
  if (!selectedMission.value || !currentNoteDraft.value) return [];
  const draft = currentNoteDraft.value;
  return buildSmartQuestions(selectedMission.value, draft);
});

const scopePreview = computed(() => {
  if (!selectedMission.value || !noteUrl.value.trim()) return '';
  const result = matchScopeUrl(noteUrl.value.trim(), selectedMission.value.scopePatterns);
  return result.matched ? `OK — ${result.reason}` : `KO — ${result.reason}`;
});

const smartQuestions = computed(() => selectedMissionQuestions.value);

const preparationKit = computed(() => {
  if (!selectedMission.value) return null;
  return buildPreparationKit(selectedMission.value, notesForMission(selectedMission.value.id));
});

const evidenceIndex = computed(() => {
  if (!selectedMission.value) return null;
  return buildEvidenceIndex(selectedMission.value, notesForMission(selectedMission.value.id));
});

const reportPreview = computed(() => {
  if (!selectedMission.value || !currentNoteDraft.value) return null;
  return buildReportDraft(selectedMission.value, currentNoteDraft.value);
});

const qualityBreakdown = computed(() => {
  if (!currentNoteDraft.value) return null;
  return buildQualityBreakdown(currentNoteDraft.value);
});

async function reloadBackendState() {
  backendState.value = await loadBackendState();
}

function openOAuthPreview() {
  const url = backendState.value.oauth?.authPreviewUrl || backendState.value.oauth?.authorizationUrl;
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function startOAuthFlow() {
  const url = `${backendState.value.baseUrl}/api/yeswehack/oauth/start?redirect=1`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function createMission() {
  if (!missionUrl.value.trim()) {
    window.alert("Ajoute d'abord le lien de la mission.");
    return;
  }

  const draft = buildMissionDraft(missionUrl.value, scopeText.value);
  const extraHints = inferPolicyHints(policyText.value);
  const parsedScope = parseScopeDocument(scopeText.value);
  const now = nowIso();
  addMission({
    id: makeMissionId(),
    name: missionName.value.trim() || draft.name,
    platform: draft.platform,
    missionUrl: missionUrl.value.trim(),
    scopeUrl: scopeUrl.value.trim() || draft.scopeUrl,
    scopeText: scopeText.value.trim(),
    scopePatterns: parsedScope.patterns.length > 0 ? parsedScope.patterns : draft.scopePatterns,
    phase: phase.value,
    complianceMode: complianceMode.value,
    status: 'En cours',
    gainEstimated: 0,
    currency: 'EUR',
    policyHints: [...new Set([...draft.policyHints, ...extraHints])],
    themeTags: draft.themeTags,
    dossierSummary: draft.dossierSummary,
    createdAt: now,
    updatedAt: now,
    tags: [],
  });

  missionName.value = '';
  scopeUrl.value = '';
  scopeText.value = '';
  policyText.value = '';
}

function createNote() {
  if (!selectedMission.value) return;
  const note = prepareNoteDraft(selectedMissionId.value, noteType.value);
  note.url = noteUrl.value.trim();
  note.endpoint = endpoint.value.trim();
  note.hypothesis = hypothesis.value.trim();
  note.observation = observation.value.trim();
  note.impact = impact.value.trim();
  note.proofPath = proofPath.value.trim();
  note.nextStep = nextStep.value.trim();
  note.inScope = inScopeValue.value;
  const analysis = analyzeNoteContext(
    [
      selectedMission.value.name,
      selectedMission.value.scopeText,
      selectedMission.value.missionUrl,
      note.url,
      note.endpoint,
      note.hypothesis,
      note.observation,
      note.impact,
      note.nextStep,
    ].join('\n'),
  );
  note.themeKey = analysis.theme.key;
  note.themeLabel = analysis.theme.label;
  note.entities = analysis.entities;
  note.summary = analysis.summary;
  note.relatedNotes = buildRelatedNoteLinks(notes.value, {
    themeKey: note.themeKey,
    entities: note.entities,
    missionId: selectedMission.value.id,
  });
  note.complianceChecks = complianceChecksForMission(selectedMission.value, note);
  note.qualityScore = computeQualityScore(note);
  addNote(note);

  noteUrl.value = '';
  endpoint.value = '';
  hypothesis.value = '';
  observation.value = '';
  impact.value = '';
  proofPath.value = '';
  nextStep.value = '';
  inScopeValue.value = null;
}

function notesForMission(missionId: string) {
  return notesByMission(missionId).value;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, button, a, label'));
}

function preventDragSelection(event: Event) {
  if (dragState.active) {
    event.preventDefault();
  }
}

function startDrag(event: MouseEvent) {
  if (event.button !== 0 || event.buttons !== 1 || isInteractiveTarget(event.target)) return;
  if (!(event.target instanceof Node) || !shellRef.value?.contains(event.target)) return;

  dragState.active = true;
  dragState.startY = event.clientY;
  dragState.lastY = event.clientY;
  isDragging.value = true;
  document.body.classList.add('dragging');
  document.addEventListener('selectstart', preventDragSelection, true);
  window.addEventListener('mousemove', onDragMove, { passive: false });
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('blur', stopDrag);
  event.preventDefault();
}

function onDragMove(event: MouseEvent) {
  if (!dragState.active) return;

  const deltaSinceLast = event.clientY - dragState.lastY;

  if (deltaSinceLast !== 0) {
    event.preventDefault();
    const boostedDelta = deltaSinceLast * DRAG_SCROLL_SPEED;
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop += -boostedDelta;
    dragState.lastY = event.clientY;
  }
}

function stopDrag() {
  if (!dragState.active) return;
  dragState.active = false;
  dragState.startY = 0;
  dragState.lastY = 0;
  isDragging.value = false;
  document.body.classList.remove('dragging');
  document.removeEventListener('selectstart', preventDragSelection, true);
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('blur', stopDrag);
}

function updateLiquidGlassAssets() {
  if (typeof window === 'undefined') return;

  const ua = window.navigator.userAgent;
  const isChromium = /Chrome|Chromium|Edg|OPR/.test(ua) && !/Firefox/.test(ua);
  liquidGlassEnabled.value = isChromium;

  const width = Math.max(300, Math.min(560, Math.round(window.innerWidth * 0.34)));
  const height = 180;

  const assets = buildLiquidGlassAssets({
    width,
    height,
    n1: 1,
    n2: 1.65,
    bezelWidthPx: 30,
    surfaceHeightPx: 20,
    surfaceType: 'convex-squircle',
    specularIntensity: 0.72,
    specularExponent: 10,
  });

  liquidGlassDisplacementMap.value = assets.displacementMapDataUrl;
  liquidGlassHighlightMap.value = assets.highlightMapDataUrl;
  liquidGlassScale.value = assets.maximumDisplacement * 1.35;
}

onMounted(() => {
  updateLiquidGlassAssets();
  window.addEventListener('resize', updateLiquidGlassAssets);
  void Promise.all([loadBackendState(), bootstrapPrivateVaultSnapshot(), loadPrivateVaultLocation()]).then(([state, vault, location]) => {
    backendState.value = state;
    privateVaultLocation.value = location;
    if (vault) {
      replaceMissions((vault.missions as MissionRecord[]) || []);
      replaceNotes((vault.notes as NoteRecord[]) || []);
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateLiquidGlassAssets);
  stopDrag();
});
</script>
