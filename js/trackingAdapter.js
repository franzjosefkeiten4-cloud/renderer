/**
 * trackingAdapter.js – Keiten Experience Engine
 *
 * Single entry-point for all tracking calls in the renderer.
 * If window.KeitenTracker is available (from a previously loaded tracker),
 * it routes to the correct method. Otherwise it logs to console.
 *
 * Never throws. The renderer must not crash if tracking is absent.
 */

/* global KeitenTracker */

function KeeTrack(eventType, payload) {
  payload = payload || {};

  try {
    if (typeof window.KeitenTracker !== 'undefined' && window.KeitenTracker) {

      switch (eventType) {

        case 'scene_transition':
          KeitenTracker.sceneTransition(
            payload.scene_index || 0,
            payload.scene_name  || '',
            payload.audio_position_ms || 0
          );
          break;

        case 'interlinear_revealed':
          KeitenTracker.interlinearRevealed(
            payload.layer      || 'de',
            payload.scene_index || 0
          );
          break;

        case 'hook_displayed':
          KeitenTracker.hookDisplayed(
            payload.hook_id   || '',
            payload.hook_type || ''
          );
          break;

        case 'hook_responded':
          KeitenTracker.hookResponded(
            payload.hook_id        || '',
            payload.hook_type      || '',
            payload.response_option || null,
            payload.response_text  || null
          );
          break;

        case 'hook_skipped':
          KeitenTracker.hookSkipped(
            payload.hook_id   || '',
            payload.hook_type || ''
          );
          break;

        case 'episode_completed':
          KeitenTracker.episodeCompleted(0, []);
          break;

        default:
          // Unknown event type – just log
          console.log('[KeeTrack]', eventType, payload);
      }

    } else {
      // No tracker available – log to console only
      console.log('[KeeTrack]', eventType, payload);
    }
  } catch (e) {
    // Tracking must never crash the renderer
    console.warn('[KeeTrack] Error in tracking call:', eventType, e.message);
  }
}
