import type { JobProvider, ProviderQuery, DiscoveredJob } from "./types";
import { filterAndRankEmails, extractEmails } from "./email-extractor";
import { logger } from "../../lib/logger";

interface RemoteOKJob {
  id?: string;
  position?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  apply_url?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  email?: string;
}

const TECH_TAGS: Record<string, string> = {
  python: "Python", golang: "Go", go: "Go", typescript: "TypeScript",
  javascript: "JavaScript", java: "Java", rust: "Rust", ruby: "Ruby",
  aws: "AWS", gcp: "GCP", azure: "Azure", docker: "Docker",
  kubernetes: "Kubernetes", terraform: "Terraform", postgres: "PostgreSQL",
  redis: "Redis", react: "React", fastapi: "FastAPI", "ci/cd": "CI/CD",
  linux: "Linux", devops: "DevOps", backend: "REST", sre: "SRE",
  microservices: "Microservices", graphql: "GraphQL", grpc: "gRPC",
};

function mapTags(tags: string[]): string[] {
  return tags
    .map(t => TECH_TAGS[t.toLowerCase()] ?? t)
    .filter(t => t.length > 1);
}

function extractSalary(job: RemoteOKJob): number | undefined {
  if (job.salary_min && job.salary_max) {
    return Math.round((job.salary_min + job.salary_max) / 2);
  }
  return job.salary_min ?? job.salary_max;
}

export class RemoteOKProvider implements JobProvider {
  name = "remoteok";

  async fetch(query: ProviderQuery): Promise<DiscoveredJob[]> {
    const tag = query.skills[0]?.toLowerCase() ?? "python";
    const url = `https://remoteok.com/api?tags=${encodeURIComponent(tag)}&limit=20`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "AI-Job-Agent/1.0 (personal job search tool)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, "RemoteOK: non-200 response");
        return [];
      }

      const data = await res.json() as (RemoteOKJob | { legal: string })[];
      const jobs = data.filter((j): j is RemoteOKJob => typeof j === "object" && "position" in j);

      return jobs.slice(0, 15).map(job => {
        const tags = mapTags(job.tags ?? []);
        const salary = extractSalary(job);

        const emails = job.description ? filterAndRankEmails(extractEmails(job.description)) : [];
        const hrEmail = job.email ?? emails[0] ?? undefined;

        return {
          title: job.position ?? "Software Engineer",
          company: job.company ?? "Unknown Company",
          location: job.location ?? "Remoto • Global",
          country: "GLOBAL",
          workType: "remote" as const,
          salary,
          salaryText: salary ? `USD ${Math.round(salary / 12).toLocaleString()}/mês` : undefined,
          description: (job.description ?? "").replace(/<[^>]*>/g, "").slice(0, 800),
          url: job.url ?? job.apply_url,
          hrEmail,
          requiredSkills: tags,
          source: "remoteok",
          contactPriority: (hrEmail ? "high" : job.url ? "medium" : "low") as "high" | "medium" | "low",
        };
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, "RemoteOK provider failed");
      return [];
    }
  }
}
