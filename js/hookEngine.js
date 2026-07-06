/**
 * hookEngine.js – Keiten Experience Engine
 *
 * Handles scene_start hooks as overlay cards.
 * Episode-end hooks are structurally prepared but not yet fully implemented.
 *
 * What it does now:
 * - Checks episode.hooks[] for trigger: "scene_start" matching the current scene
 * - Shows an overlay card with the hook prompt and options (or skip)
 * - Calls onComplete() after the learner responds or skips
 * - Tracks hook_displayed, hook_responded, hook_skipped
 *
 * What it does NOT do yet:
 * - Spaced hook system
 * - Evaluating or scoring responses
 * - Chaining multiple hooks
 */

const KeeHookEngine = {

  /**
   * Check for scene_start hooks and show them before the scene renders.
   * @param {object}   episode     Full episode JSON
   * @param {number}   sceneIndex  scene.index (not array position)
   * @param {Function} onComplete  Called when all hooks are done or skipped
   */
  checkSceneStartHooks(episode, sceneIndex, onComplete) {
    const hooks = (episode.hooks || []).filter(
      h => h.trigger === 'scene_start' && h.trigger_scene === sceneIndex
    );

    if (hooks.length === 0) {
      onComplete();
      return;
    }

    // Show hooks sequentially (queue)
    this._runQueue(hooks.slice(), onComplete);
  },

  /**
   * Optionally check for episode_end hooks.
   * Called by app.js when the last scene's "Weiter" is clicked.
   * @param {object}   episode
   * @param {Function} onComplete
   */
  checkEpisodeEndHooks(episode, onComplete) {
    const hooks = (episode.hooks || []).filter(
      h => h.trigger === 'episode_end'
    );

    if (hooks.length === 0) {
      onComplete();
      return;
    }

    this._runQueue(hooks.slice(), onComplete);
  },

  // ── Private ───────────────────────────────────────────────

  _runQueue(queue, onComplete) {
    if (queue.length === 0) {
      onComplete();
      return;
    }
    const hook = queue.shift();
    this._showHook(hook, () => this._runQueue(queue, onComplete));
  },

  _showHook(hook, onDone) {
    const overlay = document.getElementById('kee-hook-overlay');
    if (!overlay) { onDone(); return; }

    overlay.innerHTML = '';
    overlay.classList.remove('hidden');

    const card = document.createElement('div');
    card.className = 'hook-card';

    // Handle bar
    const handle = document.createElement('div');
    handle.className = 'hook-handle';
    card.appendChild(handle);

    // Type label
    const typeLabel = document.createElement('div');
    typeLabel.className = 'hook-type-label';
    typeLabel.textContent = (hook.type || '').replace(/_/g, ' ');
    card.appendChild(typeLabel);

    // Prompt
    const prompt = document.createElement('div');
    prompt.className = 'hook-prompt';
    prompt.textContent = hook.prompt_de || '';
    card.appendChild(prompt);

    // Options (Multiple Choice)
    if (hook.options && hook.options.length > 0) {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'hook-options';

      hook.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'hook-option';
        btn.textContent = `${opt.key.toUpperCase()}) ${opt.text}`;

        btn.addEventListener('click', () => {
          // Mark selected
          optionsDiv.querySelectorAll('.hook-option').forEach(b =>
            b.classList.remove('selected')
          );
          btn.classList.add('selected');

          KeeTrack('hook_responded', {
            hook_id:         hook.id,
            hook_type:       hook.type,
            response_option: opt.key
          });

          // Brief visual pause, then close
          setTimeout(() => {
            overlay.classList.add('hidden');
            onDone();
          }, 340);
        });

        optionsDiv.appendChild(btn);
      });
      card.appendChild(optionsDiv);
    }

    // Free-text input for ROLE_ECHO hooks
    if (hook.type === 'ROLE_ECHO' && !hook.options) {
      const ta = document.createElement('textarea');
      ta.className = 'hook-textarea';
      ta.placeholder = 'Deine Antwort auf Niederländisch…';
      ta.style.cssText = 'width:100%;min-height:80px;border:2px solid var(--k-border);border-radius:8px;padding:10px;font-size:15px;font-family:inherit;resize:vertical;margin-top:4px;';
      card.appendChild(ta);

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Weiter →';
      submitBtn.style.cssText = 'margin-top:10px;width:100%;min-height:48px;background:var(--k-blue);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;';
      submitBtn.addEventListener('click', () => {
        KeeTrack('hook_responded', {
          hook_id:       hook.id,
          hook_type:     hook.type,
          response_text: ta.value.trim()
        });
        overlay.classList.add('hidden');
        onDone();
      });
      card.appendChild(submitBtn);
    }

    // Actions row: skip
    const actions = document.createElement('div');
    actions.className = 'hook-actions';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'hook-skip-btn';
    skipBtn.textContent = 'Überspringen';
    skipBtn.addEventListener('click', () => {
      KeeTrack('hook_skipped', {
        hook_id:   hook.id,
        hook_type: hook.type
      });
      overlay.classList.add('hidden');
      onDone();
    });

    actions.appendChild(skipBtn);
    card.appendChild(actions);

    overlay.appendChild(card);

    // Track display
    KeeTrack('hook_displayed', {
      hook_id:   hook.id,
      hook_type: hook.type
    });
  }

};
