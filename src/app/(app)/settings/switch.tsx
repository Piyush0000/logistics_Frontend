/**
 * The visible track and knob of an on/off switch. Place it straight after an
 * `<input type="checkbox" role="switch" className="peer ...">` inside the same label: the input
 * stays the real control (role, name, label and behaviour), this span only draws it.
 * Off: a grey track with a border and a solid knob on the left, readable in light and dark.
 * On: a primary track with the knob on the right.
 */
export function SwitchTrack() {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-11 shrink-0 items-center rounded-full border border-on-surface/40 bg-secondary p-0.5 transition-colors duration-150 *:bg-on-surface/70 peer-checked:justify-end peer-checked:border-primary peer-checked:bg-primary peer-checked:*:bg-on-primary peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
    >
      <span className="size-4.5 rounded-full shadow-sm" />
    </span>
  );
}
