import { motion } from "framer-motion";
import { useGetDashboardSummary, useGetRecentActivity, useGetAgentStatus, useStartAgent, useStopAgent, getGetDashboardSummaryQueryKey, getGetAgentStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Send, Users, Trophy, Play, Pause, Zap, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } }
};

const typeLabels: Record<string, string> = {
  job_found: "Vaga encontrada",
  applied: "Candidatura enviada",
  interview: "Entrevista agendada",
  offer: "Oferta recebida",
  rejected: "Não aprovado",
};
const typeColors: Record<string, string> = {
  job_found: "bg-blue-100 text-blue-700",
  applied: "bg-indigo-100 text-indigo-700",
  interview: "bg-violet-100 text-violet-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function Inicio() {
  const qc = useQueryClient();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: agentStatus } = useGetAgentStatus();
  const startAgent = useStartAgent();
  const stopAgent = useStopAgent();

  const handleToggleAgent = () => {
    if (agentStatus?.running) {
      stopAgent.mutate({}, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      });
    } else {
      startAgent.mutate({}, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      });
    }
  };

  const stats = [
    { label: "Vagas encontradas", value: summary?.jobs_found_today ?? 0, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Com email direto", value: (summary as any)?.jobs_with_email ?? 0, icon: Send, color: "text-green-600", bg: "bg-green-50" },
    { label: "Candidaturas", value: summary?.applications_total ?? 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Entrevistas", value: summary?.interviews ?? 0, icon: Trophy, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Início</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumo de hoje</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
            agentStatus?.running
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          )}>
            {agentStatus?.running ? (
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <CircleDot className="w-3.5 h-3.5 text-green-500" />
              </motion.div>
            ) : (
              <CircleDot className="w-3.5 h-3.5 text-gray-400" />
            )}
            {agentStatus?.running ? "Agente ativo" : "Agente pausado"}
          </div>
          <Button
            onClick={handleToggleAgent}
            disabled={startAgent.isPending || stopAgent.isPending}
            variant={agentStatus?.running ? "outline" : "default"}
            className="rounded-full gap-2"
          >
            {agentStatus?.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {agentStatus?.running ? "Pausar agente" : "Iniciar agente"}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              whileHover={{ translateY: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                <Icon className={cn("w-5 h-5", s.color)} />
              </div>
              {loadingSummary ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
              )}
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Activity Feed */}
      <motion.div variants={item} className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Atividade recente</h2>
        </div>
        {loadingActivity ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma atividade ainda</p>
          </div>
        ) : (
          <motion.div className="space-y-2" variants={container} initial="hidden" animate="show">
            {activity.map((a) => (
              <motion.div
                key={a.id}
                variants={item}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", typeColors[a.type] ?? "bg-gray-100 text-gray-600")}>
                    {typeLabels[a.type] ?? a.type}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {a.match_score != null && (
                    <span className="text-xs font-semibold text-indigo-600">{a.match_score}%</span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(a.timestamp)}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
