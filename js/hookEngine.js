/**
 * hookEngine.js – Keiten Experience Engine v1.0 Hook Pass
 *
 * Hooks are not quiz questions. They are thought pauses.
 * The reader should feel: "Interesting – I was wondering the same thing."
 * Never: "Now I'm being tested."
 *
 * Changes from v0.2:
 * - Multi-paragraph prompt support (intro text + question in one field)
 * - Option buttons have no letter prefix (A/B/C removed)
 * - Post-selection: options fade, confirmation text appears, then closes
 * - ROLE_ECHO: "Jan schaut dich an" framing, warm submit
 * - Narrative micro-frames instead of type labels
 */

const KeeHookEngine = {

  checkSceneStartHooks(episode, sceneIndex, onComplete) {
    const hooks = (episode.hooks || []).filter(
      h => h.trigger === 'scene_start' && h.trigger_scene === sceneIndex
    );
    if (hooks.length === 0) { onComplete(); return; }
    this._runQueue(hooks.slice(), onComplete);
  },

  checkEpisodeEndHooks(episode, onComplete) {
    const hooks = (episode.hooks || []).filter(h => h.trigger === 'episode_end');
    if (hooks.length === 0) { onComplete(); return; }
    this._runQueue(hooks.slice(), onComplete);
  },

  _runQueue(queue, onComplete) {
    if (queue.length === 0) { onComplete(); return; }
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

    // ── Drag handle ───────────────────────────────────────────
    const handle = document.createElement('div');
    handle.className = 'hook-handle';
    card.appendChild(handle);

    // ── Narrative micro-frame (replaces raw type labels) ──────
    // These feel like a gentle pause in the story, not a category.
    const typeFrames = {
      'PREDICTION':          'Eine Frage, bevor es weitergeht.',
      'CONTINUATION_CHOICE': 'Deine Vermutung?',
      'ROLE_ECHO':           'Jetzt du.',
      'ANTICIPATION':        'Ein Gedanke dazwischen.',
    };
    const frameText = typeFrames[hook.type] || '';
    if (frameText) {
      const typeLabel = document.createElement('div');
      typeLabel.className = 'hook-type-label';
      typeLabel.textContent = frameText;
      card.appendChild(typeLabel);
    }

    // ── Prompt – supports multiple paragraphs ─────────────────
    // Split on \n\n. All paragraphs except the last get a lighter
    // intro style; the last paragraph is the actual question.
    const prompt = document.createElement('div');
    prompt.className = 'hook-prompt';
    const paragraphs = (hook.prompt_de || '').split('\n\n').filter(p => p.trim());
    paragraphs.forEach((text, idx) => {
      const p = document.createElement('p');
      p.textContent = text;
      if (idx < paragraphs.length - 1) {
        p.className = 'hook-intro-text'; // lighter, smaller
      }
      prompt.appendChild(p);
    });
    card.appendChild(prompt);

    // ── Multiple-choice options – no letter prefix ────────────
    if (hook.options && hook.options.length > 0) {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'hook-options';

      hook.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'hook-option';
        btn.textContent = opt.text; // No "A)" prefix – just the thought

        btn.addEventListener('click', () => {
          // Lock all options, highlight selected
          const allBtns = optionsDiv.querySelectorAll('.hook-option');
          allBtns.forEach(b => {
            b.style.pointerEvents = 'none';
            b.classList.remove('selected');
          });
          btn.classList.add('selected');
          allBtns.forEach(b => {
            if (!b.classList.contains('selected')) b.style.opacity = '0.4';
          });

          // Track
          KeeTrack('hook_responded', {
            hook_id:         hook.id,
            hook_type:       hook.type,
            response_option: opt.key
          });

          // Show confirmation, then close
          this._showConfirmation(card, hook.type);
          setTimeout(() => {
            overlay.classList.add('hidden');
            onDone();
          }, 1600);
        });

        optionsDiv.appendChild(btn);
      });
      card.appendChild(optionsDiv);
    }

    // ── Free-text for ROLE_ECHO ───────────────────────────────
    if (hook.type === 'ROLE_ECHO' && !hook.options) {
      const ta = document.createElement('textarea');
      ta.className = 'hook-textarea';
      ta.placeholder = 'Auf Niederländisch, wenn du magst …';
      ta.style.cssText = (
        'width:100%;min-height:72px;border:2px solid var(--k-border);'
        + 'border-radius:8px;padding:10px;font-size:16px;font-family:inherit;'
        + 'resize:vertical;margin-top:4px;background:var(--k-cream);'
        + 'line-height:1.5;'
      );
      card.appendChild(ta);

      const submitBtn = document.createElement('button');
      submitBtn.className = 'hook-submit-btn';
      submitBtn.textContent = 'Weiter →';
      submitBtn.style.cssText = (
        'margin-top:10px;width:100%;min-height:48px;'
        + 'background:var(--k-dark);color:var(--k-cream);'
        + 'border:none;border-radius:10px;font-size:15px;'
        + 'font-weight:600;cursor:pointer;font-family:inherit;'
        + 'touch-action:manipulation;'
      );
      submitBtn.addEventListener('click', () => {
        KeeTrack('hook_responded', {
          hook_id:       hook.id,
          hook_type:     hook.type,
          response_text: ta.value.trim()
        });
        this._showConfirmation(card, hook.type);
        setTimeout(() => {
          overlay.classList.add('hidden');
          onDone();
        }, 1400);
      });
      card.appendChild(submitBtn);
      setTimeout(() => ta.focus(), 100);
    }

    // ── Skip ──────────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'hook-actions';
    const skipBtn = document.createElement('button');
    skipBtn.className = 'hook-skip-btn';
    skipBtn.textContent = 'Überspringen';
    skipBtn.addEventListener('click', () => {
      KeeTrack('hook_skipped', { hook_id: hook.id, hook_type: hook.type });
      overlay.classList.add('hidden');
      onDone();
    });
    actions.appendChild(skipBtn);
    card.appendChild(actions);

    overlay.appendChild(card);
    KeeTrack('hook_displayed', { hook_id: hook.id, hook_type: hook.type });
  },

  // ── Private: confirmation after selection ─────────────────────────────
  _showConfirmation(card, hookType) {
    // Brief, warm, never evaluative – just acknowledges and continues.
    const messages = {
      'PREDICTION':          'Mal sehen.',
      'CONTINUATION_CHOICE': 'Episode 2 wird mehr verraten.',
      'ROLE_ECHO':           'Gut.',
    };
    const msg = messages[hookType];
    if (!msg) return;

    const conf = document.createElement('p');
    conf.className = 'hook-confirmation';
    conf.textContent = msg;

    // Insert before the actions row
    const actionsEl = card.querySelector('.hook-actions');
    if (actionsEl) {
      card.insertBefore(conf, actionsEl);
      if (actionsEl) actionsEl.style.display = 'none'; // hide skip while confirming
    } else {
      card.appendChild(conf);
    }
  }

};
