import '@fontsource/noto-sans-bengali/bengali-400.css';
import '@fontsource/noto-sans-bengali/bengali-600.css';
import '@fontsource/noto-sans-bengali/bengali-700.css';
import '@fontsource/noto-sans-bengali/bengali-800.css';
import './style.css';
import { Game } from './game/Game';

/**
 * Boot: wait (briefly) for the bundled Bengali font so canvas signboards render
 * with proper shaping, then start. If fonts fail, system Bengali fonts are used.
 */
async function boot(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 48px "Noto Sans Bengali"', 'ঢাকা'),
        document.fonts.load('400 20px "Noto Sans Bengali"', 'ঢাকা'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  new Game(document.getElementById('game-canvas') as HTMLCanvasElement, document.getElementById('ui-root')!);
}

// It is a game: block browser double-tap / pinch zoom (iOS ignores user-scalable=no).
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd < 350) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

void boot();
