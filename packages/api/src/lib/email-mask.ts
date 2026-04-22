/** Redact email for safe logging (no full address in stdout). */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '[redacted]';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}
