const RECRUITMENT_PATTERNS = [
  /\b(rh|recrutamento|recruitment|careers?|jobs?|talent|hiring|people|hr|vagas?|selecao|selecção)\b/i,
];

const IGNORE_PATTERNS = [
  /\b(suporte|support|contato|contact|noreply|no-reply|financeiro|comercial|vendas|sales|marketing|admin|info|hello|ola)\b/i,
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

export function extractEmails(html: string): string[] {
  const raw = html.match(EMAIL_REGEX) ?? [];
  return [...new Set(raw)];
}

export function scoreEmail(email: string): number {
  const local = email.split("@")[0].toLowerCase();
  if (IGNORE_PATTERNS.some(p => p.test(local))) return -1;
  for (const p of RECRUITMENT_PATTERNS) {
    if (p.test(local)) return 10;
  }
  return 5;
}

export function filterAndRankEmails(emails: string[]): string[] {
  return emails
    .map(e => ({ email: e, score: scoreEmail(e) }))
    .filter(e => e.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(e => e.email);
}

export function extractBestEmail(html: string): string | undefined {
  const all = extractEmails(html);
  const ranked = filterAndRankEmails(all);
  return ranked[0];
}

export function isRecruitmentEmail(email: string): boolean {
  return scoreEmail(email) >= 5;
}
