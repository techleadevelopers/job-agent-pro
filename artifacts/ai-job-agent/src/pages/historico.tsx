import { motion } from "framer-motion";
import { useGetRecentActivity } from "@workspace/api-client-react";
import { Clock, Briefcase, Send, Users, Trophy, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  job_found:  { label: "Vaga encontrada",     icon: Briefcase, color: "text-blue-600",   bg: "bg-blue-50" },
  applied:    { label: "Candidatura enviada",  icon: Send,      color: "text-indigo-600", bg: "bg-indigo-50" },
  interview:  { label: "Entrevista",           icon: Users,     color: "text-violet-600", bg: "bg-violet-50" },
  offer:      { label: "Oferta recebida",      icon: Trophy,    color: "text-green-600",  bg: "bg-green-50" },
  rejected:   { label: "Não aprovado",         icon: X,         color: "text-red-500",    bg: "bg-red-50" },
};

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function matchColor(score: number) {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-500";
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 28 } } };

export default function Historico() {
  const { data: activity, isLoading } = useGetRecentActivity();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Histórico</h1>
        <p className="text-sm text-gray-500 mt-0.5">Toda a atividade do agente</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : !activity || activity.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma atividade ainda</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {activity.map((a, idx) => {
            const config = typeConfig[a.type] ?? { label: a.type, icon: Clock, color: "text-gray-600", bg: "bg-gray-50" };
            const Icon = config.icon;
            return (
              <motion.div
                key={a.id}
                variants={item}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors",
                  idx !== activity.length - 1 && "border-b border-gray-50"
                )}
              >
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", config.bg)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-400">{a.company}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", config.bg, config.color)}>
                    {config.label}
                  </span>
                  {a.match_score != null && (
                    <span className={cn("text-xs font-bold", matchColor(a.match_score))}>{a.match_score}%</span>
                  )}
                  <span className="text-xs text-gray-400 w-36 text-right">{formatDateTime(a.timestamp)}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
