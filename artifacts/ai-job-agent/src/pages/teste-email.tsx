import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, CheckCircle2, XCircle, AlertTriangle, Send, RefreshCw,
  FileText, Paperclip, Clock, Terminal, Wifi, WifiOff, ShieldCheck,
  Eye, ChevronDown, ChevronRight, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SmtpStatus {
  smtp: { configured: boolean; host: string | null; user: string | null; from: string | null; port: number; missing: string[] };
  test_mode: boolean;
  test_email: string | null;
  resume: { found: boolean; name: string | null; has_pdf: boolean; filename: string | null };
  profile: { found: boolean; name: string | null; title: string | null };
  email_preview: { subject: string; bodySnippet: string } | null;
  test_gate: { passed: boolean; successful_tests: number; required: number; message: string };
  last_test: { id: number; to: string; subject: string; status: string; message_id: string | null; sent_at: string | null; error: string | null } | null;
  recent_logs: { id: number; event: string; detail: string | null; job_id: number | null; logged_at: string | null }[];
}

interface TestResult {
  success: boolean;
  messageId?: string;
  to?: string;
  subject?: string;
  has_pdf?: boolean;
  error?: string;
  smtp_hint?: string | null;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
      ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
    )}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function Dot({ ok }: { ok: boolean }) {
  return <span className={cn("w-2 h-2 rounded-full flex-shrink-0", ok ? "bg-green-500" : "bg-red-400")} />;
}

function formatTime(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const eventLabels: Record<string, string> = {
  test_sent: "Teste enviado",
  test_failed: "Teste falhou",
  sending: "Enviando",
  sent: "Enviado",
  failed: "Falhou",
};

const eventColors: Record<string, string> = {
  test_sent: "bg-green-100 text-green-700",
  test_failed: "bg-red-100 text-red-700",
  sending: "bg-blue-100 text-blue-700",
  sent: "bg-indigo-100 text-indigo-700",
  failed: "bg-red-100 text-red-700",
};

export default function TesteEmail() {
  const qc = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: status, isLoading, refetch } = useQuery<SmtpStatus>({
    queryKey: ["email-smtp-status"],
    queryFn: async () => {
      const r = await fetch("/api/email/smtp-status");
      if (!r.ok) throw new Error("Falha ao carregar status");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (!r.ok) return { ...data, success: false };
      return data as TestResult;
    },
    onSuccess: (data) => {
      setTestResult(data);
      setTimeout(() => refetch(), 800);
    },
  });

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-3xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Teste de Email</h1>
          <p className="text-sm text-gray-500 mt-0.5">Valide o SMTP antes de liberar o envio em lote</p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-full gap-1.5" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : !status ? (
        <div className="text-center py-16 text-gray-400">Erro ao carregar status</div>
      ) : (
        <>
          {/* Test Gate Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "rounded-2xl p-5 border-2 flex items-start gap-4",
              status.test_gate.passed
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            )}
          >
            {status.test_gate.passed
              ? <ShieldCheck className="w-7 h-7 text-green-600 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="w-7 h-7 text-amber-500 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className={cn("font-semibold text-sm", status.test_gate.passed ? "text-green-800" : "text-amber-800")}>
                {status.test_gate.passed ? "Envio em lote liberado" : "Aprovação pendente para envio em lote"}
              </p>
              <p className={cn("text-xs mt-1", status.test_gate.passed ? "text-green-600" : "text-amber-600")}>
                {status.test_gate.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 rounded-full bg-gray-200 flex-1 max-w-[180px]">
                  <div
                    className={cn("h-1.5 rounded-full transition-all", status.test_gate.passed ? "bg-green-500" : "bg-amber-400")}
                    style={{ width: `${Math.min(100, (status.test_gate.successful_tests / status.test_gate.required) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {status.test_gate.successful_tests}/{status.test_gate.required} teste(s)
                </span>
              </div>
            </div>
          </motion.div>

          {/* SMTP Status Card */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              {status.smtp.configured
                ? <Wifi className="w-4 h-4 text-green-600" />
                : <WifiOff className="w-4 h-4 text-red-500" />
              }
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Configuração SMTP</h2>
              <StatusBadge ok={status.smtp.configured} label={status.smtp.configured ? "Configurado" : "Incompleto"} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Host", value: status.smtp.host ?? "—", ok: !!status.smtp.host },
                { label: "Porta", value: String(status.smtp.port), ok: true },
                { label: "Usuário", value: status.smtp.user ?? "—", ok: !!status.smtp.user },
                { label: "Password", value: process.env.SMTP_PASS ? "••••••••" : "Não configurado", ok: !!status.smtp.from },
                { label: "Remetente", value: status.smtp.from ?? "—", ok: !!status.smtp.from },
                { label: "Modo", value: status.test_mode ? "🧪 TESTE" : "🚀 Produção", ok: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="text-gray-500 font-medium">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Dot ok={row.ok} />
                    <span className="text-gray-800 font-mono text-xs">{row.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {status.smtp.missing.length > 0 && (
              <div className="mt-3 bg-red-50 rounded-xl px-4 py-3 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Variáveis ausentes:</p>
                  <p className="text-xs text-red-600 font-mono mt-0.5">{status.smtp.missing.join(", ")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Candidato + Anexo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Candidato</h2>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <Dot ok={status.profile.found} />
                  <span className="text-gray-600">{status.profile.found ? status.profile.name ?? "Perfil OK" : "Nenhum perfil"}</span>
                </div>
                {status.profile.title && (
                  <p className="text-xs text-gray-400 pl-3.5">{status.profile.title}</p>
                )}
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Anexo PDF</h2>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Dot ok={status.resume.has_pdf} />
                <span className={cn(status.resume.has_pdf ? "text-green-700" : "text-amber-600")}>
                  {status.resume.has_pdf
                    ? `✓ ${status.resume.filename ?? "curriculo.pdf"}`
                    : "PDF não disponível no servidor"}
                </span>
              </div>
              {!status.resume.has_pdf && status.resume.found && (
                <p className="text-xs text-gray-400">O currículo foi importado via texto. Para anexar PDF, reimporte via upload de arquivo.</p>
              )}
            </div>
          </div>

          {/* Email Preview */}
          {status.email_preview && (
            <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setShowPreview(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Preview do Email</span>
                </div>
                {showPreview ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
                      <div className="bg-indigo-50 rounded-xl px-4 py-2.5 mt-3">
                        <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Assunto</p>
                        <p className="text-sm font-medium text-indigo-900">{status.email_preview.subject}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Corpo (trecho)</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{status.email_preview.bodySnippet}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Send Test Button */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Envio de Teste Real</h2>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl text-sm">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <span className="text-gray-500 font-medium">Destinatário: </span>
                <span className="text-gray-900 font-mono">{status.test_email ?? "TEST_EMAIL não configurado"}</span>
              </div>
              {status.test_mode && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">MODO TESTE</span>
              )}
            </div>

            <Button
              onClick={() => sendTest.mutate()}
              disabled={sendTest.isPending || !status.smtp.configured || !status.test_email}
              className="rounded-full gap-2 w-full"
              size="lg"
            >
              {sendTest.isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
                : <><Send className="w-4 h-4" /> Enviar teste real</>
              }
            </Button>

            {!status.smtp.configured && (
              <p className="text-xs text-red-500 text-center">
                Configure todos os parâmetros SMTP antes de enviar
              </p>
            )}
            {!status.test_email && status.smtp.configured && (
              <p className="text-xs text-amber-600 text-center">
                Configure a variável TEST_EMAIL para definir o destinatário do teste
              </p>
            )}

            {/* Test Result */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "rounded-xl p-4 border space-y-2",
                    testResult.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <XCircle className="w-5 h-5 text-red-500" />
                    }
                    <span className={cn("font-semibold text-sm", testResult.success ? "text-green-800" : "text-red-700")}>
                      {testResult.success ? "Email enviado com sucesso!" : "Falha no envio"}
                    </span>
                  </div>

                  {testResult.success && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">Destinatário:</span>
                        <span className="text-green-800 font-mono">{testResult.to}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">Assunto:</span>
                        <span className="text-green-800 truncate ml-4 max-w-[280px] text-right">{testResult.subject}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">Currículo PDF:</span>
                        <span className={testResult.has_pdf ? "text-green-800" : "text-amber-600"}>
                          {testResult.has_pdf ? "✓ Anexado" : "Não disponível"}
                        </span>
                      </div>
                      {testResult.messageId && (
                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-green-200">
                          <span className="text-green-700 font-medium">MessageID Brevo:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-800 font-mono text-[10px] truncate max-w-[220px]">{testResult.messageId}</span>
                            <button onClick={() => copyId(testResult.messageId!)} className="text-green-600 hover:text-green-800 transition-colors">
                              <Copy className="w-3 h-3" />
                            </button>
                            {copied && <span className="text-[10px] text-green-600">copiado!</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!testResult.success && (
                    <div className="space-y-1">
                      <p className="text-xs text-red-600">{testResult.error}</p>
                      {testResult.smtp_hint && (
                        <p className="text-xs text-red-500 font-medium">{testResult.smtp_hint}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Last Test Record */}
          {status.last_test && (
            <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Último Registro de Envio</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge ok={status.last_test.status === "sent"} label={status.last_test.status === "sent" ? "Enviado" : "Falhou"} />
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="text-gray-500">Para</span>
                  <span className="font-mono text-xs text-gray-800">{status.last_test.to}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="text-gray-500">Assunto</span>
                  <span className="text-xs text-gray-700 truncate ml-4 max-w-[300px] text-right">{status.last_test.subject}</span>
                </div>
                {status.last_test.message_id && (
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                    <span className="text-gray-500">MessageID Brevo</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-indigo-600 truncate max-w-[220px]">{status.last_test.message_id}</span>
                      <button onClick={() => copyId(status.last_test!.message_id!)} className="text-gray-400 hover:text-gray-600">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="text-gray-500">Enviado em</span>
                  <span className="text-xs text-gray-700">{formatTime(status.last_test.sent_at)}</span>
                </div>
                {status.last_test.error && (
                  <div className="px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-xs text-red-600">{status.last_test.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email Logs */}
          {status.recent_logs.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Logs Recentes</h2>
                <span className="ml-auto text-xs text-gray-400">{status.recent_logs.length} eventos</span>
              </div>
              <div className="space-y-1.5">
                {status.recent_logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50/80 transition-colors text-xs">
                    <span className={cn("px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5", eventColors[log.event] ?? "bg-gray-100 text-gray-600")}>
                      {eventLabels[log.event] ?? log.event}
                    </span>
                    <div className="flex-1 min-w-0">
                      {log.detail && <p className="text-gray-500 font-mono truncate">{log.detail}</p>}
                    </div>
                    <span className="text-gray-300 flex-shrink-0">{formatTime(log.logged_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
