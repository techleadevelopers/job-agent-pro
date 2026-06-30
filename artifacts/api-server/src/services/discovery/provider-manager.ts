import type { DiscoveredJob, JobProvider, ProviderQuery } from "./types";
import { CatalogProvider } from "./catalog.provider";
import { RemoteOKProvider } from "./remoteok.provider";
import { RemotiveProvider } from "./remotive.provider";
import { logger } from "../../lib/logger";

function deduplicateJobs(jobs: DiscoveredJob[]): DiscoveredJob[] {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = `${job.company.toLowerCase().trim()}|${job.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterLocationIfNeeded(jobs: DiscoveredJob[], preferredLocation?: string): DiscoveredJob[] {
  if (!preferredLocation) return jobs;
  const loc = preferredLocation.toLowerCase();

  const isSpain = loc.includes("espanha") || loc.includes("spain") || loc.includes("barcelona") || loc.includes("es");
  const isPortugal = loc.includes("portugal") || loc.includes("lisboa") || loc.includes("porto") || loc.includes("pt");
  const isEurope = loc.includes("europa") || loc.includes("europe") || loc.includes("eu");
  const isBrazil = loc.includes("brasil") || loc.includes("brazil") || loc.includes("br") || loc.includes("remoto");

  return jobs.filter(job => {
    if (isSpain) return ["ES", "GLOBAL"].includes(job.country);
    if (isPortugal) return ["PT", "GLOBAL"].includes(job.country);
    if (isEurope) return ["ES", "PT", "EU", "GLOBAL"].includes(job.country);
    if (isBrazil) return ["BR", "GLOBAL"].includes(job.country);
    return true;
  });
}

export class ProviderManager {
  private providers: JobProvider[];

  constructor() {
    this.providers = [
      new CatalogProvider(),
      new RemoteOKProvider(),
      new RemotiveProvider(),
    ];
  }

  async discoverJobs(query: ProviderQuery, preferredLocation?: string): Promise<DiscoveredJob[]> {
    logger.info({ providers: this.providers.map(p => p.name), query: { skills: query.skills.slice(0, 3) } }, "ProviderManager: starting discovery");

    const results = await Promise.allSettled(
      this.providers.map(provider =>
        provider.fetch(query).catch(err => {
          logger.warn({ provider: provider.name, err: err.message }, "Provider failed");
          return [] as DiscoveredJob[];
        })
      )
    );

    const allJobs: DiscoveredJob[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const providerName = this.providers[i].name;
      if (result.status === "fulfilled") {
        logger.info({ provider: providerName, count: result.value.length }, "Provider returned jobs");
        allJobs.push(...result.value);
      } else {
        logger.warn({ provider: providerName }, "Provider rejected");
      }
    }

    const filtered = filterLocationIfNeeded(allJobs, preferredLocation);
    const deduped = deduplicateJobs(filtered);

    // Sort: high contact priority first, then by source (catalog first as most reliable)
    deduped.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.contactPriority] ?? 2) - (priorityOrder[b.contactPriority] ?? 2);
    });

    logger.info({ total: deduped.length, filtered: allJobs.length - deduped.length }, "ProviderManager: discovery complete");
    return deduped;
  }
}
