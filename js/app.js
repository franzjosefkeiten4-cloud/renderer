/**
 * app.js – Keiten Experience Engine v0.2
 *
 * Changes from v0.1:
 * - Welcome screen shown first; episode starts on button click
 * - Debug panel hidden in production (visible only with ?debug=1)
 * - Progress bar updates with each scene
 * - arc_id and internal IDs never shown to learners
 * - Richer completion screen
 * - Estimated duration from episode JSON (estimated_duration_minutes)
 */

(async function KeeApp() {
  'use strict';

  const EPISODE_URL = 'episodes/episode-01.json';

  // ── Debug mode: only active when URL contains ?debug=1 ──────
  const IS_DEBUG = new URLSearchParams(window.location.search).get('debug') === '1';

  // ── DOM refs ─────────────────────────────────────────────────
  const welcomeEl     = document.getElementById('kee-welcome');
  const playerEl      = document.getElementById('kee-player');
  const btnStart      = document.getElementById('kee-btn-start');
  const stage         = document.getElementById('kee-stage');
  const progressFill  = document.getElementById('kee-progress-fill');
  const progressLabel = document.getElementById('kee-progress-label');
  const btnPrev       = document.getElementById('kee-btn-prev');
  const btnNext       = document.getElementById('kee-btn-next');
  const debugEl       = document.getElementById('kee-debug');
  const errorEl       = document.getElementById('kee-error');

  // ── State ─────────────────────────────────────────────────────
  let episode         = null;
  let currentArrayIdx = 0;

  // ── Load episode (happens immediately, before welcome is dismissed) ─
  let loadError = null;
  try {
    episode = await KeeJsonLoader.load(EPISODE_URL);
  } catch (e) {
    loadError = e;
  }

  // ── Debug panel (only when ?debug=1) ────────────────────────
  if (IS_DEBUG && debugEl) {
    debugEl.classList.remove('hidden');
    if (loadError) {
      debugEl.textContent = 'Fehler: ' + loadError.message.slice(0, 80);
    } else if (episode) {
      debugEl.textContent =
        `Episode geladen: ${episode.episode_id} · Szenen: ${episode.scenes.length} · Blöcke: ${episode.dialogue.length}`;
    }
  }

  // ── Handle load failure ──────────────────────────────────────
  if (loadError) {
    showError(loadError.message);
    return;
  }

  if (!episode || !Array.isArray(episode.scenes) || episode.scenes.length === 0) {
    showError('Die Episode konnte nicht geladen werden (keine Szenen gefunden).');
    return;
  }
  if (!Array.isArray(episode.dialogue)) {
    showError('Die Episode konnte nicht geladen werden (keine Dialoge gefunden).');
    return;
  }

  const totalScenes = episode.scenes.length;

  // ── Start button ─────────────────────────────────────────────
  btnStart.addEventListener('click', () => {
    welcomeEl.classList.add('hidden');
    playerEl.classList.remove('hidden');
    navigateTo(0);
    window.scrollTo(0, 0);
  });

  // ── Navigation listeners ─────────────────────────────────────
  btnPrev.addEventListener('click', () => {
    if (currentArrayIdx > 0) navigateTo(currentArrayIdx - 1);
  });

  btnNext.addEventListener('click', () => {
    if (currentArrayIdx < totalScenes - 1) {
      navigateTo(currentArrayIdx + 1);
    } else {
      handleEpisodeEnd();
    }
  });

  // ════════════════════════════════════════════════════════════
  // Core functions
  // ════════════════════════════════════════════════════════════

  function navigateTo(arrayIdx) {
    currentArrayIdx = arrayIdx;
    const scene = episode.scenes[arrayIdx];
    if (!scene) return;

    updateNav(arrayIdx);
    updateProgress(arrayIdx);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    KeeHookEngine.checkSceneStartHooks(episode, scene.index, () => {
      KeeRenderer.renderScene(episode, arrayIdx, stage);
      KeeTrack('scene_transition', {
        scene_index: scene.index,
        scene_name:  scene.name || ''
      });
    });
  }

  function handleEpisodeEnd() {
    KeeHookEngine.checkEpisodeEndHooks(episode, () => {
      showCompletionScreen();
      KeeTrack('episode_completed', { episode_id: episode.episode_id });
    });
  }

  function updateNav(arrayIdx) {
    const isLast = arrayIdx === totalScenes - 1;
    btnPrev.disabled = arrayIdx === 0;
    btnNext.textContent = isLast ? 'Episode abschließen →' : 'Weiter →';
  }

  function updateProgress(arrayIdx) {
    const pct = Math.round(((arrayIdx + 1) / totalScenes) * 100);
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressLabel) {
      const dur = episode.estimated_duration_minutes
        ? ` · ca. ${Math.round(episode.estimated_duration_minutes)} Min.`
        : '';
      progressLabel.textContent =
        `Episode 1 · Szene ${arrayIdx + 1} von ${totalScenes}${dur}`;
    }
  }

  function showCompletionScreen() {
    stage.innerHTML = '';
    stage.classList.remove('kee-stage--coda');

    // Progress to 100%
    if (progressFill) progressFill.style.width = '100%';
    if (progressLabel) progressLabel.textContent = 'Episode 1 · Abgeschlossen';

    const card = document.createElement('div');
    card.className = 'kee-completion';
    card.innerHTML = `
      <p class="completion-drive">Markus fährt die N325 zurück nach Kleve.<br>Nijmegen liegt hinter ihm.</p>
      <p class="completion-memory">Er denkt an den Kaffee. An die Zeichnungen.<br>An das Telefonat.</p>
      <p class="completion-open">An das zusje.</p>
      <div class="completion-rule"></div>
      <p class="completion-anchor">Woensdag.<br>Am Mittwoch kommen die Zeichnungen.</p>
      <p class="completion-next">Episode 2 folgt demnächst.</p>
    `;

    stage.appendChild(card);
    btnNext.disabled = true;
    btnPrev.disabled = false;
  }

  function showError(message) {
    if (errorEl) {
      errorEl.innerHTML = message.replace(/\n/g, '<br>');
      errorEl.classList.remove('hidden');
    }
    if (btnStart) btnStart.disabled = true;
    console.error('[KeeApp]', message);
  }

}());
