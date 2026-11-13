import { THEME_SCRIPT } from '@/lib/theme';

/** Sets data-theme on <html> before the page paints, so dark-mode users never see a white flash. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
