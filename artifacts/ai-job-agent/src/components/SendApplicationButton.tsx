import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle2, XCircle, Loader2, Paperclip, Mail, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  step: string;
  status: "ok" | "error" | "pending";
  detail?: string;
}

interface SendApplicationButtonProps {
  jobId: number;
  matchScore: number;
  jobTitle: string;
  company: string;
  hrEmail?: string;
  onSuccess?: () => void;
}

const STEP_ICONS: Record<string, typeof Send> = {
  "Preparando email": FileText,
  "Verificando perfil": FileText,
  "Verificando match": Zap,
  "Verificando email": Mail,
  "Verificando duplicata": CheckCircle2,
  "rate limit": Zap,
  "Gerando email": Mail,
  "Anexando currículo": Paperclip,
  "Enviando": Send,
  "Enviado": CheckCircle2,
  "Falhou": XCircle,
};

function getIcon(stepName: string) {
  for (const [key, Icon] of Object.entries(STEP_ICONS)) {
    if (stepName.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return CheckCircle2;
}

export default function SendApplicationButton({
  jobId,
  matchScore,
  jobTitle,
  company,
  hrEmail,
  onSuccess,
}: SendApplicationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showLog, setShowLog] = useState(false);
  const [testMode, setTestModeState] = useState(false);

  const canSend = matchScore >= 85 && !!hrEmail;

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    setErrorMsg("");
    setShowLog(true);
    setSteps([{ step: "Preparando email", status: "pending" }]);

    try {
      const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const response = await fetch(`${baseUrl}/api/email/apply/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.steps) {
        setSteps(data.steps);
      }

      if (!response.ok) {
        setResult("error");
        setErrorMsg(data.error ?? "Erro ao enviar");
      } else {
        setResult("success");
        setTestModeState(data.testMode ?? false);
        onSuccess?.();
      }
    } catch (err: any) {
      setResult("error");
      setErrorMsg(err?.message ?? "Erro de conexão");
      setSteps(prev => [...prev, { step: "Falhou", status: "error", detail: err?.message }]);
    } finally {
      setLoading(false);
    }
  };

  const tooltipMsg = !hrEmail
    ? "Email do recrutador não disponível para esta vaga"
    : matchScore < 85
    ? `Match ${matchScore}% abaixo do mínimo (85%) para envio real`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="relative group">
        <Button
          onClick={handleSend}
          disabled={loading || !canSend}
          className={cn(
            "rounded-full flex items-center gap-2 font-semibold transition-all",
            canSend
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl"
              : "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {loading ? "Enviando candidatura..." : "Enviar candidatura real"}
        </Button>
        {tooltipMsg && (
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
            <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 max-w-xs shadow-lg">
              {tooltipMsg}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-950 rounded-2xl p-4 space-y-1.5 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Log de envio</p>
                {testMode && (
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    MODO TESTE
                  </span>
                )}
              </div>

              {steps.map((s, i) => {
                const Icon = getIcon(s.step);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2.5"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {s.status === "pending" ? (
                        <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      ) : s.status === "ok" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={cn(
                        "text-xs font-medium",
                        s.status === "ok" ? "text-gray-200" : s.status === "error" ? "text-red-400" : "text-gray-400"
                      )}>
                        {s.step}
                      </span>
                      {s.detail && (
                        <span className="text-xs text-gray-500 ml-1.5 truncate block">
                          {s.detail}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="flex items-center gap-2 pt-1"
                >
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-xs text-indigo-400">Processando...</span>
                </motion.div>
              )}

              {result === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-400">
                    {testMode
                      ? "Email de teste enviado com sucesso!"
                      : `Candidatura enviada para ${company}!`}
                  </span>
                </motion.div>
              )}

              {result === "error" && errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-red-400">Falhou: {errorMsg}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
