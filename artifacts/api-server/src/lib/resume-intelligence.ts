import { logger } from "./logger";

export interface CandidateProfile {
  name: string;
  email?: string;
  phone?: string;
  title: string;
  location?: string;
  yearsExperience: number;
  skills: string[];
  summary?: string;
  strongestPoints: string[];
}

const SKILL_KEYWORDS = [
  "Python", "Go", "Golang", "TypeScript", "JavaScript", "Java", "Rust", "Ruby", "C++", "C#", "PHP", "Scala", "Kotlin", "Swift",
  "AWS", "GCP", "Azure", "Google Cloud",
  "Docker", "Kubernetes", "Terraform", "Ansible", "Helm",
  "FastAPI", "Django", "Flask", "Node.js", "Express", "NestJS", "React", "Next.js", "Vue", "Angular",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "SQLite",
  "CI/CD", "GitHub Actions", "Jenkins", "GitLab CI", "CircleCI", "ArgoCD",
  "Linux", "Bash", "Shell", "Unix",
  "Selenium", "Playwright", "Cypress", "Pytest",
  "Microservices", "REST", "GraphQL", "gRPC", "API REST", "APIs REST",
  "Open Source", "Git", "GitHub", "GitLab",
  "Machine Learning", "ML", "AI", "TensorFlow", "PyTorch", "Pandas", "NumPy",
  "Kafka", "RabbitMQ", "SQS", "Pub/Sub",
  "Automação", "Automation",
  "Observability", "Prometheus", "Grafana", "Datadog", "OpenTelemetry",
  "DevOps", "SRE", "Platform Engineering",
];

function extractName(text: string): string {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.length < 4 || line.length > 60) continue;
    if (/^\d/.test(line)) continue;
    if (/@/.test(line)) continue;
    if (/http/i.test(line)) continue;
    if (/curriculum|resume|cv\b/i.test(line)) continue;
    if (/[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+ [A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(line)) {
      return line.replace(/[^a-zA-ZÀ-ÿ\s]/g, "").trim();
    }
  }
  return lines[0]?.replace(/[^a-zA-ZÀ-ÿ\s]/g, "").trim() ?? "Candidato";
}

function extractEmail(text: string): string | undefined {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?55[\s\-]?)?(\(?\d{2}\)?[\s\-]?)(\d{4,5}[\s\-]?\d{4})/);
  return m?.[0]?.trim();
}

function extractTitle(text: string, skills: string[]): string {
  const titlePatterns = [
    /(?:cargo|posição|título|position|role|vaga):\s*(.+)/i,
    /(Senior|Pleno|Junior|Lead|Staff|Principal)?\s*(Software|Backend|Frontend|Full.?Stack|DevOps|SRE|Platform|Cloud|Data|ML|AI|Automation)\s*(Engineer|Developer|Architect|Analyst|Specialist|Engenheiro|Desenvolvedor)/i,
  ];
  for (const p of titlePatterns) {
    const m = text.match(p);
    if (m) return m[0].trim().slice(0, 60);
  }
  if (skills.includes("DevOps") || skills.includes("SRE")) return "DevOps/SRE Engineer";
  if (skills.some(s => ["Go", "Python", "Java", "Rust"].includes(s))) return "Backend Engineer";
  if (skills.some(s => ["React", "Vue", "Angular", "Next.js"].includes(s))) return "Frontend Engineer";
  if (skills.includes("Kubernetes") || skills.includes("Terraform")) return "Platform Engineer";
  return "Software Engineer";
}

function extractLocation(text: string): string | undefined {
  const locationPatterns = [
    /(?:localização|cidade|location|city|endereço|address):\s*(.+)/i,
    /(São Paulo|Rio de Janeiro|Belo Horizonte|Campinas|Curitiba|Porto Alegre|Salvador|Brasília|Fortaleza|Recife|Manaus|Goiânia|Barcelona|Lisboa|Porto|Berlin|Amsterdam|Madrid|London)[,\s]*(SP|RJ|MG|PR|RS|BA|DF|CE|PE|AM|GO)?\s*,?\s*(Brasil|Brazil|Portugal|Spain|Germany|Netherlands)?/i,
  ];
  for (const p of locationPatterns) {
    const m = text.match(p);
    if (m) return m[0].trim().slice(0, 60);
  }
  return undefined;
}

function extractYearsExperience(text: string): number {
  const patterns = [
    /(\d+)\+?\s*anos?\s*de\s*experi[êe]ncia/i,
    /(\d+)\+?\s*years?\s*of\s*experience/i,
    /experi[êe]ncia[^.]*?(\d+)\+?\s*anos?/i,
    /since\s+(\d{4})/i,
    /desde\s+(\d{4})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseInt(m[1], 10);
      if (p.source.includes("\\d{4}")) {
        const year = new Date().getFullYear();
        return Math.min(year - val, 30);
      }
      if (val >= 1 && val <= 40) return val;
    }
  }
  const yearMatches = text.match(/20\d{2}/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(Number).sort();
    const span = new Date().getFullYear() - years[0];
    if (span >= 1 && span <= 30) return Math.min(span, 20);
  }
  return 5;
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter(s => lower.includes(s.toLowerCase()));
}

function buildSummary(name: string, title: string, skills: string[], years: number, location?: string): string {
  const topSkills = skills.slice(0, 4).join(", ");
  const loc = location ? ` baseado em ${location}` : "";
  return `${title}${loc} com ${years} anos de experiência. Especialista em ${topSkills} e outras tecnologias modernas.`;
}

function buildStrongestPoints(skills: string[], years: number, title: string): string[] {
  const points: string[] = [];
  if (years >= 8) points.push(`${years} anos de experiência em engenharia de software`);
  else if (years >= 4) points.push(`${years} anos de experiência sólida`);

  const cloud = skills.filter(s => ["AWS", "GCP", "Azure", "Google Cloud"].includes(s));
  if (cloud.length > 0) points.push(`Experiência em cloud: ${cloud.join(", ")}`);

  const infra = skills.filter(s => ["Kubernetes", "Docker", "Terraform", "Helm"].includes(s));
  if (infra.length > 0) points.push(`Infraestrutura moderna: ${infra.join(", ")}`);

  const langs = skills.filter(s => ["Python", "Go", "Java", "Rust", "TypeScript"].includes(s));
  if (langs.length > 0) points.push(`Linguagens: ${langs.join(", ")}`);

  if (skills.includes("CI/CD") || skills.includes("GitHub Actions")) points.push("Automação de pipelines CI/CD");
  if (skills.includes("Microservices") || skills.includes("gRPC")) points.push("Arquitetura de microsserviços");

  return points.slice(0, 4);
}

export function extractCandidateProfile(rawText: string): CandidateProfile {
  logger.info("ResumeIntelligence: extracting candidate profile from text");

  const skills = extractSkills(rawText);
  const name = extractName(rawText);
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const location = extractLocation(rawText);
  const yearsExperience = extractYearsExperience(rawText);
  const title = extractTitle(rawText, skills);
  const summary = buildSummary(name, title, skills, yearsExperience, location);
  const strongestPoints = buildStrongestPoints(skills, yearsExperience, title);

  const profile: CandidateProfile = {
    name,
    email,
    phone,
    title,
    location,
    yearsExperience,
    skills: skills.length > 0 ? skills : ["Python", "Go", "AWS"],
    summary,
    strongestPoints,
  };

  logger.info({ name: profile.name, skills: profile.skills.length, title: profile.title }, "ResumeIntelligence: profile extracted");
  return profile;
}

export function selectRelevantSkills(candidateSkills: string[], jobDescription: string, count = 3): string[] {
  const lower = jobDescription.toLowerCase();
  const relevant = candidateSkills.filter(s => lower.includes(s.toLowerCase()));
  if (relevant.length >= count) return relevant.slice(0, count);
  return [...relevant, ...candidateSkills.filter(s => !relevant.includes(s))].slice(0, count);
}
