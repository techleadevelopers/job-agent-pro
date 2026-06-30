import { useState } from "react";
import { motion } from "framer-motion";
import { useListJobs, useCreateApplication, useIgnoreJob, useGetJob, getListJobsQueryKey, getGetJobQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, X, ChevronRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import SendApplicationButton from "@/components/SendApplicationButton";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 28 } } };

const statusTabs = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Aplicadas", value: "applied" },
  { label: "Ignoradas", value: "ignored" },
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

function formatSalary(s?: number | null) {
  if (!s) return null;
  return `R$ ${s.toLocaleString("pt-BR")}`;
}

export default function Vagas() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: jobs, isLoading } = useListJobs(
    statusFilter !== "all" ? { status: statusFilter as "pending" | "applied" | "ignored" } : undefined
  );
  const { data: selectedJob } = useGetJob(selectedJobId ?? 0, {
    query: { enabled: !!selectedJobId, queryKey: getGetJobQueryKey(selectedJobId ?? 0) }
  });
  const createApplication = useCreateApplication();
  const ignoreJob = useIgnoreJob();

  const filtered = (jobs ?? []).filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())
  );

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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vagas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{filtered.length} vagas encontradas</p>
      </div>

      {/* Filters */}
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
                statusFilter === tab.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
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
          <p className="text-sm">Nenhuma vaga encontrada</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {filtered.map(job => (
            <motion.div
              key={job.id}
              variants={item}
              whileHover={{ translateY: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-lg">
                {job.company[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-900">{job.title}</p>
                  <span className="text-xs text-gray-400">·</span>
                  <p className="text-sm text-gray-500">{job.company}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{workTypeLabel(job.work_type)}</span>
                  {formatSalary(job.salary) && (
                    <span className="font-medium text-gray-600">{formatSalary(job.salary)}</span>
                  )}
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={cn("text-lg font-bold px-3 py-1 rounded-full border", matchColor(job.match_score))}>
                  {job.match_score}%
                </span>
                {job.status === "pending" && (
                  <>
                    <Button size="sm" className="rounded-full" onClick={() => handleApply(job.id)}>
                      Aplicar
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={e => handleViewDetails(job.id, e)}>
                      Ver detalhes <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                    <button
                      onClick={e => handleIgnore(job.id, e)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
                    >
                      Ignorar
                    </button>
                  </>
                )}
                {job.status === "applied" && (
                  <>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Aplicada</span>
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={e => handleViewDetails(job.id, e)}>
                      Ver detalhes
                    </Button>
                  </>
                )}
                {job.status === "ignored" && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">Ignorada</span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[520px] sm:w-[520px] overflow-y-auto">
          {!selectedJob ? (
            <div className="space-y-4 pt-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-6">
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

              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn("text-2xl font-bold px-3 py-1 rounded-full border", matchColor(selectedJob.match_score))}>
                  {selectedJob.match_score}%
                </span>
                <span className="text-sm text-gray-500 px-3 py-1.5 bg-gray-100 rounded-full">{workTypeLabel(selectedJob.work_type)}</span>
                {formatSalary(selectedJob.salary) && (
                  <span className="text-sm font-semibold text-gray-700 px-3 py-1.5 bg-green-50 rounded-full">{formatSalary(selectedJob.salary)}</span>
                )}
                <span className="text-sm text-gray-400 px-3 py-1.5 bg-gray-50 rounded-full flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{selectedJob.location}
                </span>
              </div>

              {/* HR Email badge */}
              {(selectedJob as any).hr_email && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium">Recrutador:</span>
                  <span className="text-indigo-600 font-mono">{(selectedJob as any).hr_email}</span>
                </div>
              )}

              {selectedJob.skills_match && selectedJob.skills_match.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pontos fortes</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills_match.map(s => (
                      <span key={s} className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.skills_missing && selectedJob.skills_missing.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pontos a desenvolver</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills_missing.map(s => (
                      <span key={s} className="text-xs font-medium px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.cover_letter && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Carta de apresentação gerada</p>
                  <div className="bg-gray-50/80 rounded-xl p-4 text-sm text-gray-600 leading-relaxed border border-gray-100">
                    {selectedJob.cover_letter}
                  </div>
                </div>
              )}

              {selectedJob.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Descrição</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedJob.description}</p>
                </div>
              )}

              {selectedJob.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  {/* Real email button */}
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
                      className="flex-1 rounded-full"
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
