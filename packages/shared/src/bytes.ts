/** Human-readable byte formatting. Pure and display-only. */
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const unit = UNITS[exponent] ?? 'B';
  return `${value.toFixed(exponent === 0 ? 0 : fractionDigits)} ${unit}`;
}
