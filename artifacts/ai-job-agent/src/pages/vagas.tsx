import { useState } from "react";
import { motion } from "framer-motion";
import { useListJobs, useCreateApplication, useIgnoreJob, useGetJob, getListJobsQueryKey, getGetJobQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, X, ChevronRight, Mail, Globe, RefreshCw, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import SendApplicationButton from "@/components/SendApplicationButton";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 28 } } };

const statusTabs = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Aplicadas", value: "applied" },
  { label: "Ignoradas", value: "ignored" },
];

const locationTabs = [
  { label: "Todas", value: "all" },
  { label: "🇧🇷 Brasil", value: "BR" },
  { label: "🇪🇺 Europa", value: "EU" },
  { label: "🌐 Global", value: "GLOBAL" },
];

function matchColor(score: number) {
  if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-500 bg-red-50 border-red-200";
}

function workTypeLabel(wt: string) {
  if (wt === "remote") return "Remoto";
  if (wt === "hybrid") return "Híbrido";
  return "Presencial";
}

function sourceLabel(source: string) {
  if (source === "catalog") return "Catálogo";
  if (source === "remoteok") return "RemoteOK";
  if (source === "remotive") return "Remotive";
  return source;
}

function sourceColor(source: string) {
  if (source === "remoteok") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (source === "remotive") return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-gray-50 text-gray-600 border-gray-200";
}

function priorityIcon(priority?: string) {
  if (priority === "high") return <span title="Email direto disponível" className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  if (priority === "medium") return <span title="Formulário disponível" className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />;
  return <span title="Sem contato direto" className="w-2 h-2 rounded-full bg-gray-300 inline-block" />;
}

function countryFlag(country?: string) {
  const flags: Record<string, string> = { BR: "🇧🇷", ES: "🇪🇸", PT: "🇵🇹", EU: "🇪🇺", GLOBAL: "🌐" };
  return flags[country ?? "BR"] ?? "🌐";
}

export default function Vagas() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lastSearchMsg, setLastSearchMsg] = useState<string | null>(null);

  const { data: jobs, isLoading } = useListJobs(
    statusFilter !== "all" ? { status: statusFilter as "pending" | "applied" | "ignored" } : undefined
  );
  const { data: selectedJob } = useGetJob(selectedJobId ?? 0, {
    query: { enabled: !!selectedJobId, queryKey: getGetJobQueryKey(selectedJobId ?? 0) }
  });
  const createApplication = useCreateApplication();
  const ignoreJob = useIgnoreJob();

  const filtered = (jobs ?? []).filter(j => {
    const matchesSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchesLoc = locationFilter === "all" || (j as any).country === locationFilter ||
      (locationFilter === "EU" && ["ES", "PT", "EU"].includes((j as any).country ?? ""));
    return matchesSearch && matchesLoc;
  });

  const withEmail = filtered.filter(j => (j as any).hr_email).length;
  const sources = [...new Set((jobs ?? []).map(j => (j as any).source).filter(Boolean))];

  const handleSearch = async () => {
    setSearching(true);
    setLastSearchMsg(null);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationFilter !== "all" ? locationFilter : undefined }),
      });
      const data = await res.json();
      setLastSearchMsg(data.message ?? "Busca concluída");
      qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
    } catch {
      setLastSearchMsg("Erro ao buscar vagas");
    } finally {
      setSearching(false);
    }
  };

  const handleApply = (jobId: number) => {
    createApplication.mutate({ data: { job_id: jobId } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
        setSheetOpen(false);
      }
    });
  };

  const handleIgnore = (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    ignoreJob.mutate({ id: jobId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListJobsQueryKey() })
    });
  };

  const handleViewDetails = (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedJobId(jobId);
    setSheetOpen(true);
  };

  const handleEmailSuccess = () => {
    qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vagas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} vagas
            {withEmail > 0 && <> · <span className="text-green-600 font-medium">{withEmail} com email direto</span></>}
            {sources.length > 0 && <> · Fontes: {sources.map(sourceLabel).join(", ")}</>}
          </p>
        </div>
        <Button
          onClick={handleSearch}
          disabled={searching}
          className="rounded-full gap-2 flex-shrink-0"
        >
          <RefreshCw className={cn("w-4 h-4", searching && "animate-spin")} />
          {searching ? "Buscando..." : "Buscar Vagas"}
        </Button>
      </div>

      {lastSearchMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center gap-2"
        >
          <Globe className="w-4 h-4 flex-shrink-0" />
          {lastSearchMsg}
        </motion.div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar vaga ou empresa..."
              className="pl-9 rounded-xl border-gray-200 bg-white/70"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-gray-100/70 rounded-xl p-1 gap-0.5">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  statusFilter === tab.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex bg-gray-100/70 rounded-xl p-1 gap-0.5 w-fit">
          {locationTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setLocationFilter(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                locationFilter === tab.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-4">Nenhuma vaga encontrada</p>
          <Button onClick={handleSearch} disabled={searching} variant="outline" className="rounded-full gap-2">
            <RefreshCw className={cn("w-4 h-4", searching && "animate-spin")} />
            Buscar vagas agora
          </Button>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {filtered.map(job => {
            const j = job as typeof job & { hr_email?: string; contact_priority?: string; source?: string; country?: string; salary_text?: string };
            return (
              <motion.div
                key={j.id}
                variants={item}
                whileHover={{ translateY: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 group"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-lg">
                  {j.company[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 truncate">{j.title}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">·</span>
                    <p className="text-sm text-gray-500 truncate flex-shrink-0">{j.company}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{workTypeLabel(j.work_type)}</span>
                    <span className="flex items-center gap-1 text-gray-400"><MapPin className="w-3 h-3" />{countryFlag(j.country)} {j.location}</span>
                    {j.hr_email && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        {priorityIcon("high")} email direto
                      </span>
                    )}
                    {j.source && j.source !== "catalog" && (
                      <span className={cn("px-2 py-0.5 rounded-full border text-[11px] font-medium", sourceColor(j.source))}>
                        {sourceLabel(j.source)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-base font-bold px-2.5 py-1 rounded-full border", matchColor(j.match_score))}>
                    {j.match_score}%
                  </span>
                  {j.status === "pending" && (
                    <>
                      <Button size="sm" className="rounded-full" onClick={e => handleViewDetails(j.id, e)}>
                        Ver <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                      <button
                        onClick={e => handleIgnore(j.id, e)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors px-1"
                        title="Ignorar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {j.status === "applied" && (
                    <Button size="sm" variant="ghost" className="rounded-full text-indigo-600" onClick={e => handleViewDetails(j.id, e)}>
                      ✓ Ver
                    </Button>
                  )}
                  {j.status === "ignored" && (
                    <span className="text-xs font-medium text-gray-300">Ignorada</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[540px] sm:w-[540px] overflow-y-auto">
          {!selectedJob ? (
            <div className="space-y-4 pt-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-5">
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {selectedJob.company[0]}
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{selectedJob.title}</SheetTitle>
                    <p className="text-sm text-gray-500">{selectedJob.company}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-2xl font-bold px-3 py-1 rounded-full border", matchColor(selectedJob.match_score))}>
                  {selectedJob.match_score}%
                </span>
                <span className="text-sm text-gray-500 px-3 py-1.5 bg-gray-100 rounded-full">{workTypeLabel(selectedJob.work_type)}</span>
                {(selectedJob as any).salary_text && (
                  <span className="text-sm font-semibold text-gray-700 px-3 py-1.5 bg-green-50 rounded-full">{(selectedJob as any).salary_text}</span>
                )}
                <span className="text-sm text-gray-400 px-3 py-1.5 bg-gray-50 rounded-full flex items-center gap-1">
                  {countryFlag((selectedJob as any).country)} <MapPin className="w-3 h-3" />{selectedJob.location}
                </span>
                {(selectedJob as any).source && (
                  <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", sourceColor((selectedJob as any).source))}>
                    via {sourceLabel((selectedJob as any).source)}
                  </span>
                )}
              </div>

              {/* Contact info */}
              {(selectedJob as any).hr_email && (
                <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                  <Mail className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span className="font-semibold text-green-700">Email direto:</span>
                  <span className="text-green-800 font-mono">{(selectedJob as any).hr_email}</span>
                  <span className="ml-auto bg-green-200 text-green-800 rounded-full px-2 py-0.5 font-semibold">Prioridade Alta</span>
                </div>
              )}
              {!(selectedJob as any).hr_email && (selectedJob as any).url && (
                <div className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2.5">
                  <ExternalLink className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                  <span className="font-semibold text-yellow-700">Formulário:</span>
                  <a href={(selectedJob as any).url} target="_blank" rel="noopener noreferrer" className="text-yellow-800 underline truncate">{(selectedJob as any).url}</a>
                </div>
              )}
              {!(selectedJob as any).hr_email && !(selectedJob as any).url && (
                <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-gray-500">
                  <Mail className="w-3.5 h-3.5" /> Sem contato direto — candidatura manual necessária
                </div>
              )}

              {selectedJob.skills_match && selectedJob.skills_match.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Star className="w-3 h-3" /> Pontos fortes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.skills_match.map(s => (
                      <span key={s} className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full">✔ {s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.skills_missing && selectedJob.skills_missing.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">A desenvolver</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.skills_missing.map(s => (
                      <span key={s} className="text-xs font-medium px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full border border-orange-100">✖ {s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Descrição</p>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-6">{selectedJob.description}</p>
                </div>
              )}

              {selectedJob.cover_letter && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Carta gerada pela IA</p>
                  <div className="bg-gray-50/80 rounded-xl p-4 text-sm text-gray-600 leading-relaxed border border-gray-100 max-h-40 overflow-y-auto">
                    {selectedJob.cover_letter}
                  </div>
                </div>
              )}

              {selectedJob.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <SendApplicationButton
                    jobId={selectedJob.id}
                    matchScore={selectedJob.match_score}
                    jobTitle={selectedJob.title}
                    company={selectedJob.company}
                    hrEmail={(selectedJob as any).hr_email}
                    onSuccess={() => {
                      handleEmailSuccess();
                      setTimeout(() => setSheetOpen(false), 2000);
                    }}
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full text-sm"
                      onClick={() => handleApply(selectedJob.id)}
                      disabled={createApplication.isPending}
                    >
                      {createApplication.isPending ? "Marcando..." : "Só marcar como aplicada"}
                    </Button>
                    <Button variant="ghost" className="rounded-full" onClick={() => setSheetOpen(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedJob.status === "applied" && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-xl px-4 py-3">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Candidatura já enviada</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
