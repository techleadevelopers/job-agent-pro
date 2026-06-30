import type { JobProvider, ProviderQuery, DiscoveredJob } from "./types";

interface CatalogEntry {
  title: string;
  company: string;
  location: string;
  country: string;
  workType: "remote" | "hybrid" | "onsite";
  salary?: number;
  salaryText?: string;
  hrEmail: string;
  requiredSkills: string[];
  description: string;
  url?: string;
}

const CATALOG: CatalogEntry[] = [
  // Brasil — Remoto
  { title: "Backend Engineer", company: "Nubank", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 28000, salaryText: "R$ 28.000/mês", hrEmail: "careers@nubank.com.br", requiredSkills: ["Python", "Go", "PostgreSQL", "Kubernetes", "Docker"], description: "Desenvolver serviços backend de alta escala para produtos financeiros.", url: "https://nubank.com.br/carreiras" },
  { title: "Platform Engineer", company: "iFood", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 25000, salaryText: "R$ 25.000/mês", hrEmail: "jobs@ifood.com.br", requiredSkills: ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD"], description: "Construir e evoluir a plataforma de engenharia do iFood.", url: "https://carreiras.ifood.com.br" },
  { title: "SRE", company: "PicPay", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 22000, salaryText: "R$ 22.000/mês", hrEmail: "recrutamento@picpay.com", requiredSkills: ["AWS", "Kubernetes", "Go", "Python", "Linux", "CI/CD"], description: "Garantir a confiabilidade dos sistemas do PicPay.", url: "https://picpay.com/site/sobre/carreiras" },
  { title: "Automation Engineer", company: "Mercado Livre", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 20000, salaryText: "R$ 20.000/mês", hrEmail: "selecao@mercadolivre.com", requiredSkills: ["Python", "Selenium", "Playwright", "CI/CD", "Docker"], description: "Automatizar testes e processos de desenvolvimento.", url: "https://jobs.mercadolivre.com.br" },
  { title: "Golang Engineer", company: "Wildlife Studios", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 22000, salaryText: "R$ 22.000/mês", hrEmail: "people@wildlifestudios.com", requiredSkills: ["Go", "Kubernetes", "AWS", "PostgreSQL", "Redis"], description: "Backend de jogos mobile com Go.", url: "https://wildlifestudios.com/careers" },
  { title: "Cloud Engineer", company: "Stone Co.", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 20000, salaryText: "R$ 20.000/mês", hrEmail: "vagas@stone.com.br", requiredSkills: ["AWS", "GCP", "Terraform", "Kubernetes", "Python", "Go"], description: "Infraestrutura cloud para produtos financeiros.", url: "https://www.stone.com.br/carreiras" },
  { title: "Python Engineer", company: "99 (DiDi)", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 18000, salaryText: "R$ 18.000/mês", hrEmail: "carreiras@99app.com", requiredSkills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"], description: "APIs Python de alta performance para a 99.", url: "https://99jobs.com" },
  { title: "DevOps Engineer", company: "Totvs", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 17000, salaryText: "R$ 17.000/mês", hrEmail: "rh@totvs.com.br", requiredSkills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Python"], description: "Automação de infraestrutura e DevOps na maior empresa de software do Brasil." },
  { title: "Backend Engineer", company: "Conta Simples", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 16000, salaryText: "R$ 16.000/mês", hrEmail: "talent@contasimples.com", requiredSkills: ["Go", "Python", "PostgreSQL", "Docker", "AWS"], description: "Backend para fintech focada em empresas." },
  { title: "Infrastructure Engineer", company: "Loft", location: "Remoto • Brasil", country: "BR", workType: "remote", salary: 19000, salaryText: "R$ 19.000/mês", hrEmail: "hiring@loft.com.br", requiredSkills: ["AWS", "Kubernetes", "Terraform", "Go", "Python"], description: "Infraestrutura para proptech líder no Brasil." },

  // Global — Remote
  { title: "DevOps Engineer", company: "Cloudflare", location: "Remoto • Global", country: "GLOBAL", workType: "remote", salary: 35000, salaryText: "USD 7.000/mês", hrEmail: "recruiting@cloudflare.com", requiredSkills: ["Go", "Rust", "Kubernetes", "Linux", "Terraform", "AWS"], description: "Infrastructure automation at massive scale.", url: "https://cloudflare.com/careers" },
  { title: "Senior Backend Engineer", company: "Stripe", location: "Remoto • Global", country: "GLOBAL", workType: "remote", salary: 42000, salaryText: "USD 8.500/mês", hrEmail: "jobs@stripe.com", requiredSkills: ["Go", "Ruby", "PostgreSQL", "AWS", "Microservices", "gRPC"], description: "Build payments infrastructure used by millions.", url: "https://stripe.com/jobs" },
  { title: "Infrastructure Engineer", company: "HashiCorp", location: "Remoto • Global", country: "GLOBAL", workType: "remote", salary: 38000, salaryText: "USD 7.500/mês", hrEmail: "careers@hashicorp.com", requiredSkills: ["Go", "Terraform", "Kubernetes", "AWS", "GCP", "Linux"], description: "Work on Terraform, Vault and open-source tools.", url: "https://hashicorp.com/jobs" },
  { title: "Open Source Engineer", company: "Grafana Labs", location: "Remoto • Global", country: "GLOBAL", workType: "remote", salary: 36000, salaryText: "USD 7.200/mês", hrEmail: "jobs@grafana.com", requiredSkills: ["Go", "Open Source", "Linux", "Kubernetes", "PostgreSQL"], description: "Contribute to Grafana, Loki, Tempo worldwide.", url: "https://grafana.com/about/careers" },
  { title: "Backend Engineer", company: "PlanetScale", location: "Remoto • Global", country: "GLOBAL", workType: "remote", salary: 39000, salaryText: "USD 7.800/mês", hrEmail: "hiring@planetscale.com", requiredSkills: ["Go", "MySQL", "Kubernetes", "Distributed Systems", "Linux"], description: "Build the world's most scalable MySQL platform." },
  { title: "Platform Engineer", company: "Fly.io", location: "Remoto • Global", country: "GLOBAL", workType: "remote", salary: 36000, salaryText: "USD 7.200/mês", hrEmail: "jobs@fly.io", requiredSkills: ["Go", "Rust", "Linux", "Docker", "Networking"], description: "Deploy apps close to users around the world." },
  { title: "SRE", company: "Tailscale", location: "Remoto • Global", country: "GLOBAL", workType: "remote", salary: 34000, salaryText: "USD 6.800/mês", hrEmail: "careers@tailscale.com", requiredSkills: ["Go", "Linux", "Networking", "Kubernetes", "AWS"], description: "Build and run the infrastructure for Tailscale's VPN product." },

  // Espanha
  { title: "Backend Engineer", company: "Glovo", location: "Barcelona, Espanha", country: "ES", workType: "hybrid", salary: 6500, salaryText: "€ 6.500/mês", hrEmail: "talent@glovoapp.com", requiredSkills: ["Python", "Go", "Kubernetes", "PostgreSQL", "AWS"], description: "Backend para a plataforma de delivery líder na Europa.", url: "https://glovoapp.com/careers" },
  { title: "Platform Engineer", company: "Typeform", location: "Barcelona, Espanha", country: "ES", workType: "hybrid", salary: 6000, salaryText: "€ 6.000/mês", hrEmail: "jobs@typeform.com", requiredSkills: ["Kubernetes", "AWS", "Terraform", "Docker", "Go"], description: "Plataforma de forms usada por milhões de empresas.", url: "https://typeform.com/careers" },
  { title: "DevOps Engineer", company: "Travelperk", location: "Barcelona, Espanha", country: "ES", workType: "hybrid", salary: 5800, salaryText: "€ 5.800/mês", hrEmail: "careers@travelperk.com", requiredSkills: ["AWS", "Kubernetes", "Python", "Terraform", "CI/CD"], description: "Infraestrutura para a principal plataforma B2B de viagens." },
  { title: "Software Engineer", company: "Factorial HR", location: "Barcelona, Espanha", country: "ES", workType: "hybrid", salary: 5500, salaryText: "€ 5.500/mês", hrEmail: "hello@factorialhr.com", requiredSkills: ["Ruby", "Python", "PostgreSQL", "Docker", "AWS"], description: "Software de RH usado em toda a Europa." },
  { title: "Backend Engineer", company: "Wallapop", location: "Barcelona, Espanha", country: "ES", workType: "hybrid", salary: 5500, salaryText: "€ 5.500/mês", hrEmail: "talent@wallapop.com", requiredSkills: ["Go", "Python", "Kubernetes", "PostgreSQL", "Redis"], description: "Marketplace líder na Espanha." },
  { title: "Infrastructure Engineer", company: "Flywire", location: "Barcelona, Espanha", country: "ES", workType: "remote", salary: 6000, salaryText: "€ 6.000/mês", hrEmail: "careers@flywire.com", requiredSkills: ["AWS", "Terraform", "Kubernetes", "Go", "Python"], description: "Pagamentos globais para education e healthcare." },

  // Portugal
  { title: "Backend Engineer", company: "Farfetch", location: "Porto, Portugal", country: "PT", workType: "hybrid", salary: 4500, salaryText: "€ 4.500/mês", hrEmail: "talent@farfetch.com", requiredSkills: ["Go", "Python", "Kubernetes", "PostgreSQL", "AWS"], description: "Plataforma de luxo global com escritório em Porto.", url: "https://farfetch.com/careers" },
  { title: "Platform Engineer", company: "Sword Health", location: "Lisboa, Portugal", country: "PT", workType: "hybrid", salary: 4800, salaryText: "€ 4.800/mês", hrEmail: "careers@swordhealth.com", requiredSkills: ["Kubernetes", "AWS", "Python", "Docker", "Terraform"], description: "Saúde digital com IA — unicórnio português." },
  { title: "DevOps Engineer", company: "Feedzai", location: "Lisboa, Portugal", country: "PT", workType: "hybrid", salary: 4500, salaryText: "€ 4.500/mês", hrEmail: "jobs@feedzai.com", requiredSkills: ["AWS", "Kubernetes", "CI/CD", "Docker", "Python"], description: "IA para detecção de fraude financeira." },
  { title: "Software Engineer", company: "Talkdesk", location: "Lisboa, Portugal", country: "PT", workType: "hybrid", salary: 4200, salaryText: "€ 4.200/mês", hrEmail: "recruiting@talkdesk.com", requiredSkills: ["Go", "Python", "PostgreSQL", "AWS", "Microservices"], description: "Plataforma de contact center cloud — unicórnio global." },
  { title: "Backend Engineer", company: "Unbabel", location: "Lisboa, Portugal", country: "PT", workType: "hybrid", salary: 4000, salaryText: "€ 4.000/mês", hrEmail: "jobs@unbabel.com", requiredSkills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"], description: "IA de tradução para empresas globais." },
  { title: "Infrastructure Engineer", company: "Outsystems", location: "Lisboa, Portugal", country: "PT", workType: "hybrid", salary: 4600, salaryText: "€ 4.600/mês", hrEmail: "talent@outsystems.com", requiredSkills: ["AWS", "Azure", "Kubernetes", "Docker", "CI/CD"], description: "Plataforma de low-code líder global." },

  // Europa
  { title: "Backend Engineer", company: "Spotify", location: "Estocolmo, Suécia / Remoto EU", country: "EU", workType: "remote", salary: 8000, salaryText: "€ 8.000/mês", hrEmail: "recruiting@spotify.com", requiredSkills: ["Python", "Go", "Kubernetes", "GCP", "PostgreSQL"], description: "Backend para o maior serviço de streaming de música.", url: "https://spotifyjobs.com" },
  { title: "Infrastructure Engineer", company: "Booking.com", location: "Amsterdã, Holanda", country: "EU", workType: "hybrid", salary: 7500, salaryText: "€ 7.500/mês", hrEmail: "careers@booking.com", requiredSkills: ["Go", "Python", "Kubernetes", "AWS", "Linux"], description: "Infraestrutura para o maior site de viagens do mundo." },
  { title: "Platform Engineer", company: "Zalando", location: "Berlim, Alemanha", country: "EU", workType: "hybrid", salary: 7000, salaryText: "€ 7.000/mês", hrEmail: "jobs@zalando.de", requiredSkills: ["AWS", "Kubernetes", "Go", "Python", "Terraform"], description: "Plataforma de e-commerce líder na Europa." },
  { title: "DevOps Engineer", company: "OLX Group", location: "Berlim, Alemanha / Remoto EU", country: "EU", workType: "remote", salary: 6500, salaryText: "€ 6.500/mês", hrEmail: "talent@olxgroup.com", requiredSkills: ["AWS", "Kubernetes", "Terraform", "CI/CD", "Go"], description: "Marketplaces digitais em 30+ países." },
  { title: "Backend Engineer", company: "Adyen", location: "Amsterdã, Holanda", country: "EU", workType: "hybrid", salary: 7800, salaryText: "€ 7.800/mês", hrEmail: "jobs@adyen.com", requiredSkills: ["Java", "Go", "PostgreSQL", "Kubernetes", "AWS"], description: "Plataforma de pagamentos global." },
  { title: "SRE", company: "Delivery Hero", location: "Berlim, Alemanha", country: "EU", workType: "hybrid", salary: 6800, salaryText: "€ 6.800/mês", hrEmail: "careers@deliveryhero.com", requiredSkills: ["Go", "Python", "Kubernetes", "AWS", "Terraform"], description: "SRE para o maior grupo de delivery do mundo." },
];

export class CatalogProvider implements JobProvider {
  name = "catalog";

  async fetch(_query: ProviderQuery): Promise<DiscoveredJob[]> {
    return CATALOG.map(entry => ({
      title: entry.title,
      company: entry.company,
      location: entry.location,
      country: entry.country,
      workType: entry.workType,
      salary: entry.salary,
      salaryText: entry.salaryText,
      description: entry.description,
      url: entry.url,
      hrEmail: entry.hrEmail,
      requiredSkills: entry.requiredSkills,
      source: "catalog",
      contactPriority: "high" as const,
    }));
  }
}
