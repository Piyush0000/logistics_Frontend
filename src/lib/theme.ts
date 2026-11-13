/** Light / dark theme choice, stored per browser. The inline ThemeScript applies it before first paint. */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'evoc-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

const CHANGE_EVENT = 'evoc-theme-change';

/** For useSyncExternalStore: notifies when the choice changes in this tab or another. */
export function subscribeThemePreference(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

let stopFollowingSystem: (() => void) | null = null;

/** Saves the choice, sets data-theme on <html>, and follows the OS setting while on "system". */
export function applyThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  document.documentElement.dataset.theme = resolve(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));

  stopFollowingSystem?.();
  stopFollowingSystem = null;
  if (preference === 'system') {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      document.documentElement.dataset.theme = media.matches ? 'dark' : 'light';
    };
    media.addEventListener('change', onChange);
    stopFollowingSystem = () => media.removeEventListener('change', onChange);
  }
}

/** The pre-paint script, as a string. Kept tiny and dependency-free. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p!=='light'&&p!=='dark'){p=matchMedia('${DARK_QUERY}').matches?'dark':'light'}document.documentElement.dataset.theme=p}catch(e){document.documentElement.dataset.theme='light'}})()`;
