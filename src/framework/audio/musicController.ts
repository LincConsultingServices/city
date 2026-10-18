// When the background music plays.
//
// Three conditions, all of them the player's: sound is on, music is on, and the
// tab is in view. Music in a background tab is music nobody chose to hear, so
// it fades out when the tab is hidden and back in when it returns.
//
// Browsers will not start audio before the player has interacted with the page,
// so a player who left sound on last time hears nothing until their first click
// or keypress — at which point the music fades in. That is the browser's rule
// and also the polite one.
import { audio } from "./audioManager";
import { createMusic, type Music } from "./music";

let music: Music | null = null;

// Development only: a hot-replaced copy of this module would leave its music
// running, unreachable by the new one. Stop it on the way out.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    music?.stop();
    music = null;
  });
}

/** True when everything says the music should be playing. */
export function shouldPlay(s: { enabled: boolean; music: boolean }, visible: boolean): boolean {
  return s.enabled && s.music && visible;
}

/**
 * Start following the settings. Returns a detach that stops the music and
 * removes every listener — the city screen calls it on unmount.
 */
export function attachMusic(): () => void {
  music ??= createMusic(() => audio.bgmOutput());
  const m = music;

  const sync = () => {
    const want = shouldPlay(audio.getSettings(), document.visibilityState === "visible");
    if (want && !m.isPlaying()) m.start();
    else if (!want && m.isPlaying()) m.stop();
  };

  const unsubscribe = audio.subscribeSettings(sync);
  document.addEventListener("visibilitychange", sync);

  // The first gesture unlocks audio: wake the context (a no-op once running),
  // then try again. Music already "playing" into a suspended context starts
  // sounding the moment it resumes.
  const unlock = () => {
    if (audio.getSettings().enabled) audio.bgmOutput();
    sync();
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  sync();

  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    m.stop();
  };
}
