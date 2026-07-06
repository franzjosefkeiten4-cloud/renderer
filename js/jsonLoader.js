/**
 * jsonLoader.js – Keiten Experience Engine
 *
 * Loads an episode JSON file via fetch().
 * Provides three distinct error messages:
 *   1. Network error (no server running)
 *   2. File not found (HTTP 4xx)
 *   3. Invalid JSON (parse failure)
 */

const KeeJsonLoader = {

  /**
   * Load and parse an episode JSON file.
   * @param {string} url  Relative path, e.g. 'episodes/episode-01.json'
   * @returns {Promise<object>} Parsed episode data
   * @throws {Error} with a human-readable German message
   */
  async load(url) {

    // ── 1. Network / fetch error ───────────────────────────
    let response;
    try {
      response = await fetch(url);
    } catch (networkError) {
      throw new Error(
        `Netzwerkfehler: Die Datei „${url}" konnte nicht geladen werden.\n\n` +
        `Läuft ein lokaler Server? Starte ihn mit:\n` +
        `  python -m http.server 8000\n` +
        `und öffne dann http://localhost:8000 im Browser.\n\n` +
        `Technisch: ${networkError.message}`
      );
    }

    // ── 2. HTTP error (404, 403, …) ────────────────────────
    if (!response.ok) {
      throw new Error(
        `Datei nicht gefunden: „${url}" (HTTP ${response.status} ${response.statusText}).\n\n` +
        `Ist die Datei im richtigen Pfad? Erwartet: episodes/episode-01.json\n` +
        `Prüfe, ob die Datei existiert und der Server sie sieht.`
      );
    }

    // ── 3. Read response body ──────────────────────────────
    let text;
    try {
      text = await response.text();
    } catch (readError) {
      throw new Error(
        `Fehler beim Lesen der Datei „${url}": ${readError.message}`
      );
    }

    // ── 4. Parse JSON ──────────────────────────────────────
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error(
        `Ungültiges JSON in „${url}".\n\n` +
        `Die Datei wurde geladen, enthält aber kein gültiges JSON.\n` +
        `JSON-Parser-Fehler: ${parseError.message}`
      );
    }

    return data;
  }

};
