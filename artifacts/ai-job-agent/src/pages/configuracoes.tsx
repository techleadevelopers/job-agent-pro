import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetResume, useGetPreferences, useSavePreferences,
  getGetPreferencesQueryKey, getGetResumeQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Sliders, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const workTypes = [
  { label: "Remoto", value: "remote" },
  { label: "Híbrido", value: "hybrid" },
  { label: "Presencial", value: "onsite" },
  { label: "Qualquer", value: "any" },
];

const availableRoles = ["Software Engineer", "Backend", "Frontend", "Full Stack", "Automation", "Platform", "DevOps", "Data Engineer"];

export default function Configuracoes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: resume, isLoading: loadingResume } = useGetResume();
  const { data: prefs, isLoading: loadingPrefs } = useGetPreferences();
  const savePreferences = useSavePreferences();

  const [workType, setWorkType] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [minSalary, setMinSalary] = useState<number | null>(null);

  const effectiveWorkType = workType ?? prefs?.work_type ?? "remote";
  const effectiveCity = city ?? prefs?.city ?? "";
  const effectiveRoles = roles ?? prefs?.roles ?? [];
  const effectiveMinSalary = minSalary ?? prefs?.min_salary ?? 10000;

  const toggleRole = (role: string) => {
    const current = effectiveRoles;
    if (current.includes(role)) {
      setRoles(current.filter(r => r !== role));
    } else {
      setRoles([...current, role]);
    }
  };

  const handleSave = () => {
    savePreferences.mutate({
      data: {
        work_type: effectiveWorkType as "remote" | "hybrid" | "onsite" | "any",
        city: effectiveCity || null,
        roles: effectiveRoles,
        min_salary: effectiveMinSalary,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPreferencesQueryKey() });
        toast({ title: "Preferências salvas", description: "Suas preferências foram atualizadas." });
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie seu currículo e preferências</p>
      </div>

      {/* Resume */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Currículo</h2>
        </div>
        {loadingResume ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : resume ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{resume.name}</p>
              {resume.email && <p className="text-xs text-gray-400">{resume.email}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Tecnologias identificadas</p>
              <div className="flex flex-wrap gap-2">
                {(resume.skills ?? []).map(s => (
                  <span key={s} className="text-xs font-medium px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full">
              Reimportar currículo
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhum currículo importado</p>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Preferências de vaga</h2>
        </div>
        {loadingPrefs ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Work type */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Modalidade</Label>
              <div className="flex gap-2">
                {workTypes.map(wt => (
                  <button
                    key={wt.value}
                    onClick={() => setWorkType(wt.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                      effectiveWorkType === wt.value
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Cidade</Label>
              <Input
                value={effectiveCity}
                onChange={e => setCity(e.target.value)}
                placeholder="Ex: Campinas"
                className="rounded-xl border-gray-200 bg-white/70 max-w-xs"
              />
            </div>

            {/* Roles */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Cargos desejados</Label>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map(r => (
                  <button
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5",
                      effectiveRoles.includes(r)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {effectiveRoles.includes(r) && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Min salary */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Salário mínimo — R$ {(effectiveMinSalary).toLocaleString("pt-BR")}
              </Label>
              <Slider
                value={[effectiveMinSalary]}
                min={5000}
                max={30000}
                step={500}
                onValueChange={([val]) => setMinSalary(val)}
                className="max-w-sm"
              />
            </div>

            <Button onClick={handleSave} disabled={savePreferences.isPending} className="rounded-full px-6">
              {savePreferences.isPending ? "Salvando..." : "Salvar preferências"}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
