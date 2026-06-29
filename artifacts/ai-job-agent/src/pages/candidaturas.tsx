import { useState } from "react";
import { motion } from "framer-motion";
import { useListApplications, useUpdateApplication, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 28 } } };

const statusTabs = [
  { label: "Todas", value: "all" },
  { label: "Aplicada", value: "applied" },
  { label: "Entrevista", value: "interview" },
  { label: "Oferta", value: "offer" },
  { label: "Rejeitada", value: "rejected" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  applied: { label: "Aplicada", color: "bg-indigo-100 text-indigo-700" },
  interview: { label: "Entrevista", color: "bg-violet-100 text-violet-700" },
  offer: { label: "Oferta", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejeitada", color: "bg-red-100 text-red-700" },
};

function workTypeLabel(wt: string) {
  if (wt === "remote") return "Remoto";
  if (wt === "hybrid") return "Híbrido";
  return "Presencial";
}

function formatSalary(s?: number | null) {
  if (!s) return null;
  return `R$ ${s.toLocaleString("pt-BR")}`;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function matchColor(score: number) {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-500";
}

export default function Candidaturas() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: applications, isLoading } = useListApplications(
    statusFilter !== "all" ? { status: statusFilter as "applied" | "interview" | "offer" | "rejected" } : undefined
  );
  const updateApplication = useUpdateApplication();

  const handleStatusChange = (id: number, status: string) => {
    updateApplication.mutate(
      { id, data: { status: status as "applied" | "interview" | "offer" | "rejected" } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListApplicationsQueryKey() }) }
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Candidaturas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{(applications ?? []).length} candidaturas no total</p>
      </div>

      {/* Status Tabs */}
      <div className="flex bg-gray-100/70 rounded-xl p-1 gap-0.5 w-fit">
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

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : !applications || applications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma candidatura ainda</p>
          <p className="text-xs mt-1">Vá até Vagas para começar</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {applications.map(app => (
            <motion.div
              key={app.id}
              variants={item}
              whileHover={{ translateY: -1, boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                {app.company[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{app.job_title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{app.company}</span>
                  <span>·</span>
                  <span>{workTypeLabel(app.work_type)}</span>
                  {formatSalary(app.salary) && <><span>·</span><span className="text-gray-600 font-medium">{formatSalary(app.salary)}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={cn("text-sm font-bold", matchColor(app.match_score))}>{app.match_score}%</span>
                <span className="text-xs text-gray-400">{formatDate(app.applied_at)}</span>
                <Select
                  defaultValue={app.status}
                  onValueChange={val => handleStatusChange(app.id, val)}
                >
                  <SelectTrigger className="w-[120px] h-8 rounded-full text-xs border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">Aplicada</SelectItem>
                    <SelectItem value="interview">Entrevista</SelectItem>
                    <SelectItem value="offer">Oferta</SelectItem>
                    <SelectItem value="rejected">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
