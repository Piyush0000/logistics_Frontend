/** The only variables a buyer message may use. Anything else is refused on save. */
export const TEMPLATE_VARIABLES = [
  '{{buyer_name}}',
  '{{awb}}',
  '{{courier}}',
  '{{tracking_link}}',
  '{{store_name}}',
] as const;

/** One SMS part holds 160 characters. */
export const SMS_PART_LENGTH = 160;

const PLACEHOLDER = /\{\{([^{}]*)\}\}/g;
const KNOWN = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.slice(2, -2)));

/** Spaces inside the braces are allowed, so `{{ awb }}` is the same variable as `{{awb}}`. */
const nameOf = (raw: string) => raw.trim();

/**
 * Fills in the known variables in one pass, so a value that itself looks like a variable is never
 * filled again. Unknown variables are left as written. The result is plain text: show it as text, never as HTML.
 */
export function renderTemplate(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER, (whole, raw: string) => {
    const name = nameOf(raw);
    return KNOWN.has(name) && Object.hasOwn(values, name) ? values[name]! : whole;
  });
}

/** Each unknown variable once, as `{{name}}`, in the order it first appears. */
export function unknownVariables(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) {
    const name = nameOf(match[1] ?? '');
    const variable = `{{${name}}}`;
    if (!KNOWN.has(name) && !found.includes(variable)) found.push(variable);
  }
  return found;
}

/** How many SMS messages a text is sent as. */
export function smsParts(text: string): number {
  return Math.ceil(text.length / SMS_PART_LENGTH);
}
