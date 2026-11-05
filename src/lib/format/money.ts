/** Formats integer paise as rupees, for example 123456789 as ₹12,34,567.89. */
export function formatPaise(paise: number, { decimals = 2 }: { decimals?: number } = {}): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(paise / 100);
}
