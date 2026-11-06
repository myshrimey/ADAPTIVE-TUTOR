// v102: "Install the app" button. Pure rules only (no browser objects here, so they can be tested).
// Sahayak installs as a web app (PWA) from the browser. It is NOT in the Play Store or App Store, and the wording says so.
export type InstallPlatform = 'ios' | 'android' | 'desktop';
export type InstallMode = 'installed' | 'prompt' | 'steps';

export function detectPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  const u = String(ua || '');
  if (/iPhone|iPod|iPad/i.test(u)) return 'ios';
  if (/Macintosh/i.test(u) && maxTouchPoints > 1) return 'ios'; // iPad that reports itself as a Mac
  if (/Android/i.test(u)) return 'android';
  return 'desktop';
}
export const isIosSafari = (ua: string) => /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(ua);

export function installMode(o: { standalone: boolean; hasPrompt: boolean }): InstallMode {
  if (o.standalone) return 'installed'; // already running as an installed app: show nothing
  return o.hasPrompt ? 'prompt' : 'steps';
}

export interface InstallAdvice { button: string; title: string; steps: string[]; note: string }
export function installAdvice(platform: InstallPlatform, mode: InstallMode, safariOnIos = true): InstallAdvice {
  const note = 'This puts Sahayak on your device like an app. It is the same website, so you always get the latest version. It is not in the Play Store or App Store.';
  if (platform === 'ios') {
    return {
      button: 'Get the app', title: 'Add Sahayak to your Home Screen',
      steps: safariOnIos
        ? ['Tap the Share button (the square with an arrow) at the bottom or top of Safari.', 'Scroll down and tap "Add to Home Screen".', 'Tap "Add". Sahayak now opens from your Home Screen.']
        : ['Open this same page in Safari (the blue compass icon).', 'Tap the Share button (the square with an arrow).', 'Tap "Add to Home Screen", then "Add".'],
      note,
    };
  }
  if (platform === 'android') {
    return {
      button: 'Get the app', title: 'Install Sahayak on your phone',
      steps: mode === 'prompt' ? ['Tap "Install" below.', 'Confirm. Sahayak appears with your other apps.']
        : ['Tap the menu (three dots) at the top right of your browser.', 'Tap "Install app" or "Add to Home screen".', 'Confirm. Sahayak appears with your other apps.'],
      note,
    };
  }
  return {
    button: 'Get the app', title: 'Install Sahayak on this computer',
    steps: mode === 'prompt' ? ['Click "Install" below.', 'Confirm. Sahayak opens in its own window and can be pinned to your taskbar.']
      : ['In Chrome or Edge, click the install icon at the right end of the address bar (or Menu, then "Install Sahayak").', 'In Safari, choose File, then "Add to Dock".', 'Firefox on a computer cannot install apps; use Chrome or Edge, or keep using the website.'],
    note,
  };
}

/** Test-taking screens get a small round button so a child is not distracted mid-question. Everywhere else it is large. */
export const COMPACT_ROUTES: readonly string[] = ['/diagnostic', '/baseline', '/mock/', '/stretch', '/challenge', '/battle', '/review'];
export function isCompactRoute(path: string): boolean {
  const p = String(path || '');
  return COMPACT_ROUTES.some((r) => (r.endsWith('/') ? p.startsWith(r) : p === r || p.startsWith(r + '/')));
}
