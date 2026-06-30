import type { JobProvider, ProviderQuery, DiscoveredJob } from "./types";
import { filterAndRankEmails, extractEmails } from "./email-extractor";
import { logger } from "../../lib/logger";

interface RemotiveJob {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  "software-dev": "Software Development",
  "devops-sysadmin": "DevOps",
  "data": "Data Engineering",
  "backend": "Backend",
};

function detectCountry(location?: string): string {
  if (!location) return "GLOBAL";
  const l = location.toLowerCase();
  if (l.includes("brazil") || l.includes("brasil")) return "BR";
  if (l.includes("portugal")) return "PT";
  if (l.includes("spain") || l.includes("espanha")) return "ES";
  if (l.includes("europe") || l.includes("europa")) return "EU";
  return "GLOBAL";
}

export class RemotiveProvider implements JobProvider {
  name = "remotive";

  async fetch(query: ProviderQuery): Promise<DiscoveredJob[]> {
    const category = "software-dev";
    const search = query.skills.slice(0, 2).join(" ").toLowerCase();
    const url = `https://remotive.com/api/remote-jobs?category=${category}&search=${encodeURIComponent(search)}&limit=20`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "AI-Job-Agent/1.0 (personal job search tool)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, "Remotive: non-200 response");
        return [];
      }

      const data = await res.json() as { jobs?: RemotiveJob[] };
      const jobs = data.jobs ?? [];

      return jobs.slice(0, 15).map(job => {
        const desc = (job.description ?? "").replace(/<[^>]*>/g, "");
        const emails = filterAndRankEmails(extractEmails(desc));
        const hrEmail = emails[0];
        const country = detectCountry(job.candidate_required_location);

        return {
          title: job.title ?? "Software Engineer",
          company: job.company_name ?? "Unknown Company",
          location: job.candidate_required_location ?? "Remoto • Global",
          country,
          workType: "remote" as const,
          description: desc.slice(0, 800),
          url: job.url,
          hrEmail,
          requiredSkills: job.tags ?? [],
          source: "remotive",
          contactPriority: (hrEmail ? "high" : job.url ? "medium" : "low") as "high" | "medium" | "low",
        };
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, "Remotive provider failed");
      return [];
    }
  }
}
