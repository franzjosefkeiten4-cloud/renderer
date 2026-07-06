/**
 * renderer.js – Keiten Experience Engine
 *
 * Implements the five KCL rendering rules:
 *   1. narrator_text   → de_text only, no interlinear
 *   2. inner_monologue → de_text only, distinct styling
 *   3. dialogue + has_reveal_button: true  → NL+WW+hidden DE + reveal button
 *   4. dialogue + has_reveal_button: false → NL only (or NL+WW), DE NEVER shown
 *   5. scene.interlinear_enabled: false    → no interlinear for dialogue in that scene
 *
 * Critical rule: has_reveal_button: false means de_text is NEVER added to the DOM.
 * Block D.4 (phone call) is a deliberate overwhelm moment – the learner must not
 * see the German translation under any circumstances.
 */

const KeeRenderer = {

  /**
   * Render all dialogue blocks for one scene into a container.
   * @param {object} episode        Full parsed episode JSON
   * @param {number} sceneArrayIdx  Position in episode.scenes[] array
   * @param {HTMLElement} container Target DOM element
   */
  renderScene(episode, sceneArrayIdx, container) {
    container.innerHTML = '';

    const scene = episode.scenes[sceneArrayIdx];
    if (!scene) {
      container.innerHTML = '<p style="color:#9C0006;padding:1rem">Szene nicht gefunden.</p>';
      return;
    }

    // Apply coda class for quiet scenes (interlinear_enabled: false, not first scene)
    container.classList.toggle('kee-stage--coda',
      !scene.interlinear_enabled && scene.index > 0
    );

    // Get all blocks for this scene, in order of appearance in the array
    const blocks = episode.dialogue.filter(d => d.scene_index === scene.index);

    if (blocks.length === 0) {
      container.innerHTML = '<p style="color:var(--k-muted);padding:1rem;font-style:italic">[Keine Blöcke in dieser Szene]</p>';
      return;
    }

    blocks.forEach(block => {
      const el = this._renderBlock(block, scene.interlinear_enabled);
      if (el) container.appendChild(el);
    });
  },

  // ── Private: dispatch to correct renderer ─────────────────

  _renderBlock(block, interlinearEnabled) {
    switch (block.type) {
      case 'narrator_text':
        return this._renderNarrator(block);
      case 'inner_monologue':
        return this._renderMonologue(block);
      case 'dialogue':
        return this._renderDialogue(block, interlinearEnabled);
      default:
        console.warn('[KeeRenderer] Unbekannter Block-Typ:', block.type, block);
        return null;
    }
  },

  // ── Rule 1: narrator_text ─────────────────────────────────

  _renderNarrator(block) {
    const div = document.createElement('div');
    div.className = 'kee-block kee-narrator';
    div.innerHTML = this._formatText(block.de_text || '');
    return div;
  },

  // ── Rule 2: inner_monologue ───────────────────────────────

  _renderMonologue(block) {
    const div = document.createElement('div');
    div.className = 'kee-block kee-monologue';
    div.innerHTML = this._formatText(block.de_text || '');
    return div;
  },

  // ── Rules 3, 4, 5: dialogue ──────────────────────────────

  _renderDialogue(block, interlinearEnabled) {
    // Defensive: warn during development if has_reveal_button is not explicitly set.
    // Undefined is treated as false (safe default – DE never shown), but authors
    // should always set it explicitly in KCL JSON.
    if (block.has_reveal_button === undefined) {
      console.warn('[KeeRenderer] has_reveal_button nicht gesetzt – behandle als false.',
        'speaker:', block.speaker, '| nl:', (block.nl_text || '').slice(0, 40));
    }

    const isPhoneCall = this._isPhoneCall(block);
    const isRestricted = block.has_reveal_button === false;

    const card = document.createElement('div');
    card.className = 'kee-block kee-dialogue';
    if (isPhoneCall) card.classList.add('kee-dialogue--phone');

    // Phone-call indicator badge
    if (isPhoneCall) {
      const badge = document.createElement('div');
      badge.className = 'kee-phone-badge';
      badge.textContent = '📞 Telefonat';
      card.appendChild(badge);
    }

    // Speaker header
    this._appendSpeaker(card, block);

    // Layers container
    const layers = document.createElement('div');
    layers.className = 'kee-layers';

    // ── Rule 5: interlinear_enabled: false ────────────────
    // Even if it's a dialogue block, skip NL/WW if scene disables interlinear.
    // (In current episode, only narrator/monologue blocks appear in these scenes,
    //  but we enforce the rule for robustness.)
    if (interlinearEnabled === false) {
      // Show only de_text if has_reveal_button:true, otherwise nothing extra
      if (block.has_reveal_button === true && block.de_text) {
        const deRow = document.createElement('div');
        deRow.className = 'kee-layer-row';
        const deText = document.createElement('div');
        deText.className = 'kee-de-text';
        deText.textContent = block.de_text;
        deRow.appendChild(deText);
        layers.appendChild(deRow);
      }
      card.appendChild(layers);
      return card;
    }

    // ── NL layer (always shown for dialogue) ──────────────
    if (block.nl_text) {
      const nlRow = document.createElement('div');
      nlRow.className = 'kee-layer-row';

      const nlLabel = document.createElement('div');
      nlLabel.className = 'kee-layer-label';
      nlLabel.textContent = 'NL';

      const nlText = document.createElement('div');
      nlText.className = 'kee-nl-text';
      nlText.textContent = block.nl_text;

      nlRow.appendChild(nlLabel);
      nlRow.appendChild(nlText);
      layers.appendChild(nlRow);
    }

    // ── WW layer ─────────────────────────────────────────
    // Rule 3: always show WW for has_reveal_button:true
    // Rule 4: show WW for has_reveal_button:false UNLESS it's a production note
    //         or a phone-call overwhelm moment
    const shouldShowWW = block.ww_text
      && !this._isProductionNote(block.ww_text)
      && !(isPhoneCall && isRestricted);

    if (shouldShowWW) {
      const wwRow = document.createElement('div');
      wwRow.className = 'kee-layer-row';

      const wwLabel = document.createElement('div');
      wwLabel.className = 'kee-layer-label';
      wwLabel.textContent = 'WW';

      const wwText = document.createElement('div');
      wwText.className = 'kee-ww-text';
      wwText.textContent = block.ww_text;

      wwRow.appendChild(wwLabel);
      wwRow.appendChild(wwText);
      layers.appendChild(wwRow);
    }

    // ── DE layer (Rules 3 & 4) ────────────────────────────
    if (block.has_reveal_button === true && block.de_text) {
      // Rule 3: DE hidden, revealed on button click
      const deWrap = document.createElement('div');
      deWrap.className = 'kee-de-wrap';

      const deRow = document.createElement('div');
      deRow.className = 'kee-layer-row';

      const deLabel = document.createElement('div');
      deLabel.className = 'kee-layer-label';
      deLabel.textContent = 'DE';

      const deText = document.createElement('div');
      deText.className = 'kee-de-text kee-de-hidden';
      deText.textContent = block.de_text;

      deRow.appendChild(deLabel);
      deRow.appendChild(deText);

      const revealBtn = document.createElement('button');
      revealBtn.className = 'kee-reveal-btn';
      revealBtn.textContent = 'DE aufdecken';
      revealBtn.setAttribute('aria-expanded', 'false');
      revealBtn.addEventListener('click', () => {
        deText.classList.remove('kee-de-hidden');
        deText.classList.add('kee-de-visible');
        revealBtn.textContent = '✓ DE aufgedeckt';
        revealBtn.classList.add('kee-done');
        revealBtn.setAttribute('aria-expanded', 'true');
        KeeTrack('interlinear_revealed', {
          layer: 'de',
          scene_index: block.scene_index,
          block_type: block.type
        });
      });

      deWrap.appendChild(deRow);
      deWrap.appendChild(revealBtn);
      layers.appendChild(deWrap);

    }
    // Rule 4: has_reveal_button === false
    // de_text is INTENTIONALLY NEVER added to the DOM.
    // This is not a bug – it is the design.
    // D.4 is a deliberate overwhelm moment.

    card.appendChild(layers);
    return card;
  },

  // ── Helpers ───────────────────────────────────────────────

  _appendSpeaker(card, block) {
    if (!block.speaker) return;

    const header = document.createElement('div');
    header.className = 'kee-speaker';

    const name = document.createElement('span');
    name.textContent = block.speaker;
    header.appendChild(name);

    if (block.speaker_note) {
      const note = document.createElement('span');
      note.className = 'kee-speaker-note';
      note.textContent = block.speaker_note;
      header.appendChild(note);
    }

    card.appendChild(header);
  },

  /**
   * Detect phone-call blocks by speaker_note.
   * D.4 and similar blocks have speaker_note containing "Telefon".
   */
  _isPhoneCall(block) {
    return !!(block.speaker_note &&
      block.speaker_note.toLowerCase().includes('telefon'));
  },

  /**
   * Detect production-reference WW texts that should not be shown to learners.
   * E.g. "[Eigenname – kein Interlinear]"
   */
  _isProductionNote(text) {
    if (!text) return true;
    return text.startsWith('[') || text.includes('Eigenname') || text.includes('Produktionsreferenz');
  },

  /**
   * Convert plain text with newlines to HTML paragraphs.
   * \n\n → paragraph break
   * \n   → line break
   */
  _formatText(text) {
    if (!text) return '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Split on double newlines to make paragraphs
    const paragraphs = escaped.split('\n\n');
    return paragraphs
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

};
