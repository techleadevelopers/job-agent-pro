import type { CandidateProfileData } from "./profile.service";

export interface MatchResult {
  score: number;
  matched: string[];
  missing: string[];
  reasons: string[];
  contactPriority: "high" | "medium" | "low";
}

const lower = (s: string) => s.toLowerCase().trim();

function skillOverlap(jobSkills: string[], candidateSkills: string[]): { matched: string[]; missing: string[] } {
  const candidateSet = new Set(candidateSkills.map(lower));
  const matched = jobSkills.filter(s => candidateSet.has(lower(s)));
  const missing = jobSkills.filter(s => !candidateSet.has(lower(s)));
  return { matched, missing };
}

export function computeMatchScore(
  jobSkills: string[],
  description: string,
  profile: CandidateProfileData,
  hrEmail?: string | null,
  jobUrl?: string | null,
): MatchResult {
  const { matched, missing } = skillOverlap(jobSkills, profile.skills);

  const reasons: string[] = [];

  // Base score: skill overlap (up to 70%)
  const skillRatio = jobSkills.length > 0 ? matched.length / jobSkills.length : 0.5;
  let score = Math.round(skillRatio * 70);

  // Seniority bonus (up to 15%)
  const descLower = description.toLowerCase();
  const years = profile.yearsExperience;
  if (descLower.includes("senior") || descLower.includes("pleno")) {
    if (years >= 5) { score += 10; reasons.push("Senioridade compatível"); }
    else if (years >= 3) { score += 5; }
  } else if (descLower.includes("junior") || descLower.includes("jr")) {
    if (years <= 3) { score += 10; reasons.push("Nível junior compatível"); }
    else { score += 5; }
  } else {
    if (years >= 4) { score += 8; reasons.push("Experiência sólida"); }
    else { score += 4; }
  }

  // Tech stack bonus (up to 10%)
  if (matched.length >= 4) { score += 10; reasons.push("Stack altamente compatível"); }
  else if (matched.length >= 2) { score += 5; reasons.push("Stack parcialmente compatível"); }

  // Has email = priority boost (up to 5%)
  if (hrEmail) { score += 5; reasons.push("Email de contato disponível"); }

  // Skills match reasons
  for (const s of matched.slice(0, 4)) reasons.push(`✔ ${s}`);
  for (const s of missing.slice(0, 2)) reasons.push(`✖ ${s}`);

  score = Math.min(99, Math.max(0, score));

  // Contact priority
  const contactPriority = hrEmail ? "high" : jobUrl ? "medium" : "low";

  return { score, matched, missing, reasons, contactPriority };
}
