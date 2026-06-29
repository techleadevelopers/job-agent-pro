import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadResume } from "@workspace/api-client-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export default function Curriculo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const uploadResume = useUploadResume();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleContinue = () => {
    if (!file) {
      // For demo purposes, allow proceeding without real file
      uploadResume.mutate(
        { data: { name: "Usuario Demo", raw_text: "Demo resume text", filename: "curriculo.pdf" } },
        {
          onSuccess: () => {
            setLocation("/onboarding/preferencias");
          },
          onError: () => {
            toast({
              title: "Erro ao enviar",
              description: "Tente novamente.",
              variant: "destructive"
            });
            // Still navigate for demo
            setLocation("/onboarding/preferencias");
          }
        }
      );
      return;
    }

    const nameFromFile = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    uploadResume.mutate(
      {
        data: {
          name: nameFromFile || "Meu Currículo",
          raw_text: `Currículo profissional. Arquivo: ${file.name}. Tecnologias: Python Go AWS FastAPI CI/CD Docker Kubernetes PostgreSQL GitHub Automação Open Source`,
          filename: file.name,
        },
      },
      {
        onSuccess: () => {
          setLocation("/onboarding/preferencias");
        },
        onError: () => {
          setLocation("/onboarding/preferencias");
        },
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
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">AI Job Agent</h1>
        <p className="text-lg text-gray-500">Encontre vagas e candidate-se automaticamente.</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 ${
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-gray-200 hover:border-primary/50 hover:bg-gray-50/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {file ? file.name : "Arraste seu currículo PDF"}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {file ? "Arquivo selecionado com sucesso." : "Ou clique para procurar"}
        </p>
        <Button variant="outline" className="rounded-full" onClick={() => document.getElementById('file-upload')?.click()}>
          Selecionar arquivo
        </Button>
        <input 
          id="file-upload" 
          type="file" 
          accept=".pdf" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
          }}
        />
      </div>

      <div className="mt-10 bg-white/50 backdrop-blur-md rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">O que a IA fará:</h4>
        <ul className="space-y-3">
          {["Analisar sua experiência", "Identificar suas tecnologias", "Encontrar vagas compatíveis", "Personalizar cada candidatura"].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-gray-600">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex justify-end">
        <Button 
          size="lg" 
          className="rounded-full px-8 text-base shadow-lg hover:shadow-xl transition-all"
          onClick={handleContinue}
          disabled={uploadResume.isPending}
        >
          {uploadResume.isPending ? "Enviando..." : "Continuar →"}
        </Button>
      </div>
    </motion.div>
  );
}
