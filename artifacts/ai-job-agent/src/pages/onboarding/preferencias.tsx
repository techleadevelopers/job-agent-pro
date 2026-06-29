import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useSavePreferences } from "@workspace/api-client-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const rolesList = [
  "Software Engineer", "Backend", "Automation", 
  "Platform", "DevOps", "Frontend", "Full Stack"
];

export default function Preferencias() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const savePreferences = useSavePreferences();
  
  const [workType, setWorkType] = useState<"remote" | "hybrid" | "onsite" | "any">("remote");
  const [city, setCity] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [salary, setSalary] = useState([15000]);

  const toggleRole = (role: string) => {
    setRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleContinue = () => {
    savePreferences.mutate(
      { 
        data: { 
          work_type: workType,
          city: city || null,
          roles: roles.length > 0 ? roles : ["Software Engineer"],
          min_salary: salary[0]
        } 
      },
      {
        onSuccess: () => {
          setLocation("/onboarding/analisando");
        },
        onError: () => {
          toast({
            title: "Erro ao salvar",
            description: "Houve um problema ao salvar as preferências.",
            variant: "destructive"
          });
          // Proceed anyway for demo
          setLocation("/onboarding/analisando");
        }
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Qual tipo de vaga você procura?</h1>
        <p className="text-gray-500">Configure suas preferências para a IA encontrar as melhores oportunidades.</p>
      </div>

      <div className="space-y-8 bg-white/50 backdrop-blur-md rounded-3xl p-8 border border-gray-100 shadow-sm">
        
        {/* Work Type */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Modelo de trabalho</Label>
          <RadioGroup 
            value={workType} 
            onValueChange={(val: any) => setWorkType(val)}
            className="flex gap-4"
          >
            {[
              { id: "remote", label: "Remoto" },
              { id: "hybrid", label: "Híbrido" },
              { id: "onsite", label: "Presencial" }
            ].map(type => (
              <div key={type.id} className="flex items-center space-x-2">
                <RadioGroupItem value={type.id} id={type.id} />
                <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* City */}
        <div className="space-y-3">
          <Label htmlFor="city" className="text-base font-semibold">Cidade</Label>
          <Input 
            id="city" 
            placeholder="Ex: Campinas, São Paulo..." 
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl"
          />
        </div>

        {/* Roles */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Cargos de interesse</Label>
          <div className="flex flex-wrap gap-2">
            {rolesList.map(role => {
              const isSelected = roles.includes(role);
              return (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                    isSelected 
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Salary */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Pretensão salarial (mínima)</Label>
            <span className="text-lg font-bold text-primary">
              R$ {salary[0].toLocaleString('pt-BR')}
            </span>
          </div>
          <Slider 
            value={salary} 
            onValueChange={setSalary} 
            max={30000} 
            step={1000}
            className="py-4"
          />
        </div>

      </div>

      <div className="mt-10 flex justify-end">
        <Button 
          size="lg" 
          className="rounded-full px-8 text-base shadow-lg hover:shadow-xl transition-all"
          onClick={handleContinue}
          disabled={savePreferences.isPending}
        >
          {savePreferences.isPending ? "Salvando..." : "Continuar →"}
        </Button>
      </div>
    </motion.div>
  );
}
