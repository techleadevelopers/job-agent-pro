import { motion } from "framer-motion";
import { useGetAgentStatus, useStartAgent, useStopAgent, getGetAgentStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Play, Pause, Zap, Clock, Send, Search, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatDate(ts?: string | null) {
  if (!ts) return "Nunca";
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Agente() {
  const qc = useQueryClient();
  const { data: status, isLoading } = useGetAgentStatus();
  const startAgent = useStartAgent();
  const stopAgent = useStopAgent();

  const handleToggle = (checked: boolean) => {
    if (checked) {
      startAgent.mutate({}, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() }) });
    } else {
      stopAgent.mutate({}, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() }) });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agente IA</h1>
        <p className="text-sm text-gray-500 mt-0.5">Controle o agente que busca e aplica automaticamente</p>
      </div>

      {/* Main Control */}
      <motion.div
        whileHover={{ boxShadow: "0 8px 32px rgba(99,102,241,0.12)" }}
        className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-8 shadow-sm"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              status?.running ? "bg-indigo-100" : "bg-gray-100"
            )}>
              <Bot className={cn("w-8 h-8", status?.running ? "text-indigo-600" : "text-gray-400")} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-xl font-bold text-gray-900">Agente IA</h2>
                {status?.running && (
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <CircleDot className="w-4 h-4 text-green-500" />
                  </motion.div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {status?.running ? "Buscando e candidatando automaticamente" : "Aguardando para iniciar"}
              </p>
            </div>
          </div>
          <Switch
            checked={status?.running ?? false}
            onCheckedChange={handleToggle}
            disabled={startAgent.isPending || stopAgent.isPending}
            className="scale-125"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => handleToggle(!status?.running)}
            disabled={startAgent.isPending || stopAgent.isPending}
            variant={status?.running ? "outline" : "default"}
            className="rounded-full gap-2 px-6"
          >
            {status?.running
              ? <><Pause className="w-4 h-4" /> Parar agente</>
              : <><Play className="w-4 h-4" /> Iniciar agente</>
            }
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Search, label: "Vagas verificadas hoje", value: status?.jobs_scanned_today ?? 0, color: "text-blue-600 bg-blue-50" },
          { icon: Send, label: "Candidaturas hoje", value: status?.applications_today ?? 0, color: "text-indigo-600 bg-indigo-50" },
          { icon: Clock, label: "Última execução", value: null, text: formatDate(status?.last_run_at), color: "text-gray-600 bg-gray-50" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              whileHover={{ translateY: -2 }}
              className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm"
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", stat.color.split(" ")[1])}>
                <Icon className={cn("w-4 h-4", stat.color.split(" ")[0])} />
              </div>
              {stat.value !== null ? (
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              ) : (
                <p className="text-sm font-semibold text-gray-700">{stat.text}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Settings */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Como funciona</h3>
        </div>
        <ul className="space-y-3 text-sm text-gray-600">
          {[
            "O agente busca vagas nas principais plataformas (LinkedIn, Indeed, etc.)",
            "Cada vaga é analisada e comparada com seu currículo",
            "Vagas com mais de 80% de match são candidaturadas automaticamente",
            "Uma carta de apresentação personalizada é gerada para cada candidatura",
            "Você pode acompanhar tudo na aba Candidaturas",
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
