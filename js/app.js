/**
 * app.js – Keiten Experience Engine
 *
 * Main orchestrator. Loaded last, after all other scripts.
 *
 * Responsibilities:
 * - Load episode JSON via KeeJsonLoader
 * - Initialize scene navigation
 * - Coordinate KeeRenderer, KeeHookEngine, KeeTrack
 * - Show debug info and errors
 * - Never crash; always show a human-readable message on failure
 */

(async function KeeApp() {
  'use strict';

  const EPISODE_URL = 'episodes/episode-01.json';

  // ── DOM refs ────────────────────────────────────────────
  const stage          = document.getElementById('kee-stage');
  const arcLabel       = document.getElementById('kee-arc-label');
  const sceneIndicator = document.getElementById('kee-scene-indicator');
  const btnPrev        = document.getElementById('kee-btn-prev');
  const btnNext        = document.getElementById('kee-btn-next');
  const debugEl        = document.getElementById('kee-debug');
  const errorEl        = document.getElementById('kee-error');

  // ── State ────────────────────────────────────────────────
  let episode          = null;
  let currentArrayIdx  = 0;   // Position in episode.scenes[] (0-based)

  // ── Load episode ────────────────────────────────────────
  try {
    episode = await KeeJsonLoader.load(EPISODE_URL);
  } catch (loadError) {
    showError(loadError.message);
    return;
  }

  // ── Validate minimum structure ──────────────────────────
  if (!episode || !Array.isArray(episode.scenes) || episode.scenes.length === 0) {
    showError(
      `Die geladene Datei „${EPISODE_URL}" enthält keine Szenen.\n` +
      `Erwartet: ein episodes[]-Array mit mindestens einer Szene.`
    );
    return;
  }
  if (!Array.isArray(episode.dialogue)) {
    showError(`Die geladene Datei enthält kein dialogue[]-Array.`);
    return;
  }

  // ── Debug info ──────────────────────────────────────────
  const totalScenes = episode.scenes.length;
  const totalBlocks = episode.dialogue.length;
  debugEl.textContent =
    `Episode geladen: ${episode.episode_id} · Szenen: ${totalScenes} · Blöcke: ${totalBlocks}`;

  // ── Header ──────────────────────────────────────────────
  if (arcLabel) {
    arcLabel.textContent = (episode.arc_id || episode.episode_id || '').toUpperCase();
  }

  // ── Navigation event listeners ──────────────────────────
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

  // ── Initial render ──────────────────────────────────────
  navigateTo(0);

  // ════════════════════════════════════════════════════════
  // Core functions
  // ════════════════════════════════════════════════════════

  /**
   * Navigate to a scene by its array index.
   * Checks for scene_start hooks before rendering.
   */
  function navigateTo(arrayIdx) {
    currentArrayIdx = arrayIdx;

    const scene = episode.scenes[arrayIdx];
    if (!scene) return;

    // Update navigation controls
    updateNav(arrayIdx);

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Check for scene_start hooks first, render after
    KeeHookEngine.checkSceneStartHooks(episode, scene.index, () => {
      KeeRenderer.renderScene(episode, arrayIdx, stage);

      KeeTrack('scene_transition', {
        scene_index: scene.index,
        scene_name:  scene.name || ''
      });
    });
  }

  /**
   * Handle episode completion: show end screen, optional end hooks.
   */
  function handleEpisodeEnd() {
    KeeHookEngine.checkEpisodeEndHooks(episode, () => {
      showCompletionScreen();
      KeeTrack('episode_completed', { episode_id: episode.episode_id });
    });
  }

  /**
   * Update navigation button states and scene indicator.
   */
  function updateNav(arrayIdx) {
    const isFirst = arrayIdx === 0;
    const isLast  = arrayIdx === totalScenes - 1;
    const scene   = episode.scenes[arrayIdx];

    btnPrev.disabled = isFirst;
    btnNext.textContent = isLast ? 'Episode abschließen →' : 'Weiter →';

    if (sceneIndicator) {
      sceneIndicator.textContent =
        `Szene ${arrayIdx + 1} von ${totalScenes}` +
        (scene && scene.name ? ` · ${scene.name}` : '');
    }
  }

  /**
   * Show the episode-end completion card.
   */
  function showCompletionScreen() {
    stage.innerHTML = '';
    stage.classList.remove('kee-stage--coda');

    const card = document.createElement('div');
    card.className = 'kee-completion';

    const title = document.createElement('h2');
    title.textContent = 'Episode abgeschlossen.';

    const body = document.createElement('p');
    body.textContent = 'Du hast Episode 01 vollständig erlebt.';

    card.appendChild(title);
    card.appendChild(body);
    stage.appendChild(card);

    btnNext.disabled = true;
    btnPrev.disabled = false;
    if (sceneIndicator) sceneIndicator.textContent = 'Episode abgeschlossen';
  }

  /**
   * Show a human-readable error message and hide the navigation.
   */
  function showError(message) {
    if (errorEl) {
      // Replace \n with <br> for readable multi-line errors
      errorEl.innerHTML = message.replace(/\n/g, '<br>');
      errorEl.classList.remove('hidden');
    }
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
    if (debugEl) debugEl.textContent = 'Fehler beim Laden';
    console.error('[KeeApp]', message);
  }

}());
