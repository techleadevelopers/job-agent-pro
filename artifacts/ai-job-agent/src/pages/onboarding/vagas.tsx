import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useListJobs, useStartAgent } from "@workspace/api-client-react";
import { Building2, MapPin, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Vagas() {
  const [, setLocation] = useLocation();
  const { data: jobs, isLoading } = useListJobs({ status: "pending" });
  const startAgent = useStartAgent();
  
  const [count, setCount] = useState(0);
  const targetCount = 183;

  useEffect(() => {
    let start = 0;
    const end = targetCount;
    if (start === end) return;
    
    let totalMilSecDur = 1500;
    let incrementTime = (totalMilSecDur / end) * 2;
    
    let timer = setInterval(() => {
      start += 3;
      if (start > end) start = end;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, []);

  const handleStartAgent = () => {
    startAgent.mutate(undefined, {
      onSuccess: () => {
        setLocation("/inicio");
      },
      onError: () => {
        // Fallback demo routing
        setLocation("/inicio");
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-orange-600 bg-orange-50 border-orange-200";
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-3xl mx-auto pt-20 px-6 pb-24"
    >
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4 flex items-center justify-center gap-3">
          Encontramos <span className="text-primary tabular-nums">{count}</span> vagas.
        </h1>
        <p className="text-lg text-gray-500">Baseado no seu currículo e preferências, separamos as melhores para você.</p>
      </div>

      <div className="space-y-4 mb-12">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex justify-between items-center">
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          ))
        ) : (
          <motion.div 
            variants={{
              show: { transition: { staggerChildren: 0.1 } }
            }}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {jobs?.slice(0, 4).map((job) => (
              <motion.div 
                key={job.id}
                variants={cardVariants}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex justify-between items-center hover:-translate-y-0.5 group"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{job.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" />{job.company}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{job.location}</span>
                    {job.salary_text && <span className="font-medium text-gray-700">{job.salary_text}</span>}
                  </div>
                </div>
                
                <div className={cn(
                  "flex flex-col items-center justify-center w-16 h-16 rounded-full border-2",
                  getScoreColor(job.match_score)
                )}>
                  <span className="text-lg font-bold leading-none">{job.match_score}%</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider">Match</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="rounded-full px-10 py-6 text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all bg-primary hover:bg-primary/90"
          onClick={handleStartAgent}
          disabled={startAgent.isPending}
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {startAgent.isPending ? "Iniciando..." : "Iniciar agente →"}
        </Button>
      </div>
    </motion.div>
  );
}
