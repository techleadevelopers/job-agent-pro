import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSavePreferences, useGetResume } from "@workspace/api-client-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Wifi, Building2, Users } from "lucide-react";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const workModes = [
  { id: "remote",  label: "Remoto",     icon: Wifi },
  { id: "hybrid",  label: "Híbrido",    icon: Users },
  { id: "onsite",  label: "Presencial", icon: Building2 },
];

export default function Preferencias() {
  const [, setLocation] = useLocation();
  const savePreferences = useSavePreferences();
  const { data: resume } = useGetResume();

  const [selectedModes, setSelectedModes] = useState<string[]>(["remote"]);
  const [city, setCity] = useState("");

  const toggleMode = (id: string) => {
    setSelectedModes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev
        : [...prev, id]
    );
  };

  const handleContinue = () => {
    const workType =
      selectedModes.length === 3 || selectedModes.length === 0
        ? "any"
        : (selectedModes[0] as "remote" | "hybrid" | "onsite" | "any");

    const rolesFromResume = resume?.skills?.length
      ? resume.skills.slice(0, 6)
      : ["Software Engineer"];

    savePreferences.mutate(
      {
        data: {
          work_type: workType,
          city: city.trim() || null,
          roles: rolesFromResume,
          min_salary: null,
        },
      },
      {
        onSuccess: () => setLocation("/onboarding/analisando"),
        onError: () => setLocation("/onboarding/analisando"),
      }
    );
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-xl mx-auto pt-24 px-6"
    >
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Onde você quer trabalhar?
        </h1>
        <p className="text-gray-500">
          A IA vai analisar seu currículo e candidatar você automaticamente às vagas compatíveis.
        </p>
      </div>

      <div className="space-y-8 bg-white/50 backdrop-blur-md rounded-3xl p-8 border border-gray-100 shadow-sm">

        {/* Work Model — multi-select */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Modelo de trabalho</Label>
          <p className="text-sm text-gray-400 -mt-2">Selecione um ou mais</p>
          <div className="grid grid-cols-3 gap-3">
            {workModes.map(({ id, label, icon: Icon }) => {
              const active = selectedModes.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleMode(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "border-primary bg-primary/5 text-primary shadow-md shadow-primary/10"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active ? "text-primary" : "text-gray-400")} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* City */}
        <div className="space-y-3">
          <Label htmlFor="city" className="text-base font-semibold">
            Cidade <span className="text-gray-400 font-normal">(opcional)</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="city"
              placeholder="Ex: São Paulo, Campinas, Remoto..."
              value={city}
              onChange={e => setCity(e.target.value)}
              className="rounded-xl pl-10"
            />
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-700 flex gap-3">
          <span className="text-xl leading-none">🤖</span>
          <span>
            O agente vai ler seu currículo, identificar suas competências e enviar candidaturas automaticamente para todas as vagas compatíveis. Você só precisa acompanhar os retornos.
          </span>
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <Button
          size="lg"
          className="rounded-full px-8 text-base shadow-lg hover:shadow-xl transition-all"
          onClick={handleContinue}
          disabled={savePreferences.isPending}
        >
          {savePreferences.isPending ? "Salvando..." : "Deixar a IA trabalhar →"}
        </Button>
      </div>
    </motion.div>
  );
}
