import { selectRelevantSkills } from "./resume-intelligence";
import type { CandidateProfileData } from "../services/profile.service";

type CandidateProfile = CandidateProfileData;

export interface JobEmailInput {
  title: string;
  company: string;
  recruiterEmail: string;
  description?: string;
  location?: string;
  matchScore?: number;
}

export interface GeneratedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export function generateApplicationEmail(
  profile: CandidateProfile,
  job: JobEmailInput
): GeneratedEmail {
  const relevantSkills = selectRelevantSkills(profile.skills, job.description ?? job.title, 3);
  const skillsStr = relevantSkills.join(", ");
  const mainStack = relevantSkills.slice(0, 2).join(" e ");

  const subject = `Candidatura — ${job.title} | ${mainStack} e Automação`;

  const textBody = `Olá equipe ${job.company},

Me chamo ${profile.name} e gostaria de me candidatar à vaga de ${job.title}.

Tenho ${profile.yearsExperience} anos de experiência com ${skillsStr}, competências diretamente alinhadas com os requisitos da vaga.

${profile.summary ?? `Ao longo da minha carreira desenvolvi sistemas robustos e escaláveis, com foco em qualidade e automação.`}

Segue meu currículo em anexo.

Obrigado,
${profile.name}${profile.phone ? "\n" + profile.phone : ""}${profile.email ? "\n" + profile.email : ""}`;

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #f8f9fa; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 40px 28px; }
    .header-name { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 4px; }
    .header-role { font-size: 14px; color: rgba(255,255,255,0.82); margin: 0; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #374151; margin-bottom: 20px; }
    .content { font-size: 15px; line-height: 1.75; color: #374151; white-space: pre-line; }
    .skills-box { background: #f5f3ff; border: 1px solid #e0d9ff; border-radius: 12px; padding: 16px 20px; margin: 24px 0; }
    .skills-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6d28d9; margin-bottom: 10px; }
    .skill-tag { display: inline-block; background: #ede9fe; color: #5b21b6; border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin: 3px; }
    .signature { border-top: 1px solid #f0f0f5; margin-top: 28px; padding-top: 20px; }
    .signature-name { font-size: 16px; font-weight: 700; color: #1a1a2e; }
    .signature-contact { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .footer { background: #f8f9fa; padding: 16px 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f0f0f5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-name">${escapeHtml(profile.name)}</div>
      <div class="header-role">${escapeHtml(profile.title)} · Candidatura para ${escapeHtml(job.title)} na ${escapeHtml(job.company)}</div>
    </div>
    <div class="body">
      <div class="greeting">Olá equipe ${escapeHtml(job.company)},</div>
      <div class="content">Me chamo <strong>${escapeHtml(profile.name)}</strong> e gostaria de me candidatar à vaga de <strong>${escapeHtml(job.title)}</strong>.

Tenho <strong>${profile.yearsExperience} anos de experiência</strong> e minhas competências se alinham diretamente com os requisitos da vaga:</div>

      <div class="skills-box">
        <div class="skills-label">Principais competências relevantes</div>
        ${relevantSkills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("")}
      </div>

      <div class="content">${escapeHtml(profile.summary ?? "Ao longo da minha carreira desenvolvi sistemas robustos e escaláveis, com foco em qualidade e automação.")}

Segue meu currículo em anexo para sua análise.</div>

      <div class="signature">
        <div class="signature-name">${escapeHtml(profile.name)}</div>
        <div class="signature-contact">${[profile.phone, profile.email].filter(Boolean).join(" · ")}</div>
      </div>
    </div>
    <div class="footer">
      Enviado via AI Job Agent · Para remover esta candidatura, responda com "remover"
    </div>
  </div>
</body>
</html>`;

  return { subject, htmlBody, textBody };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
