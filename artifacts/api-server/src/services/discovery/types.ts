export interface DiscoveredJob {
  title: string;
  company: string;
  location: string;
  country: string;
  workType: "remote" | "hybrid" | "onsite";
  salary?: number;
  salaryText?: string;
  description: string;
  url?: string;
  hrEmail?: string;
  requiredSkills: string[];
  source: string;
  contactPriority: "high" | "medium" | "low";
}

export interface JobProvider {
  name: string;
  fetch(query: ProviderQuery): Promise<DiscoveredJob[]>;
}

export interface ProviderQuery {
  skills: string[];
  title: string;
  location?: string;
  yearsExperience: number;
  workType?: string;
}
