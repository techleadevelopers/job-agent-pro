import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useGetResume } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  "Lendo currículo...",
  "Identificando competências...",
  "Calculando match com vagas...",
  "Buscando oportunidades compatíveis...",
  "Preparando cartas de apresentação...",
];

export default function Analisando() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [jobsFound, setJobsFound] = useState<number | null>(null);
  const { data: resume } = useGetResume();

  useEffect(() => {
    let cancelled = false;

    async function runAnalysis() {
      // Animate progress while running real job search
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 1.2;
          return next >= 95 ? 95 : next; // hold at 95 until search completes
        });
        setStepIndex(prev => Math.min(prev + 1, STEPS.length - 1));
      }, 200);

      // Show skills from resume as they come in
      if (resume?.skills?.length) {
        setSkills(resume.skills.slice(0, 8));
      }

      try {
        // Call the real job search endpoint
        const response = await fetch("/api/jobs/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (!cancelled) {
          setJobsFound(data.jobs_found ?? 0);
        }
      } catch {
        // proceed anyway
      }

      clearInterval(progressInterval);

      if (!cancelled) {
        setProgress(100);
        setStepIndex(STEPS.length - 1);

        // Brief pause to show 100%, then navigate
        setTimeout(() => {
          if (!cancelled) setLocation("/onboarding/vagas");
        }, 1200);
      }
    }

    runAnalysis();

    return () => { cancelled = true; };
  }, [setLocation, resume]);

  // Pick up skills once resume loads
  useEffect(() => {
    if (resume?.skills?.length) {
      setSkills(resume.skills.slice(0, 8));
    }
  }, [resume]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full px-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-6">
            <motion.div
              className="w-16 h-16 bg-primary rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analisando currículo...</h1>
          <p className="text-sm text-gray-500 h-5 transition-all">
            {STEPS[Math.min(stepIndex, STEPS.length - 1)]}
          </p>
        </motion.div>

        <Progress value={progress} className="h-2 mb-6 bg-primary/10" />

        {jobsFound !== null && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-primary font-semibold text-lg mb-4"
          >
            {jobsFound} vagas compatíveis encontradas!
          </motion.p>
        )}

        <div className="h-28">
          {skills.length > 0 && (
            <motion.div
              className="flex flex-wrap justify-center gap-2"
              variants={{ show: { transition: { staggerChildren: 0.1 } } }}
              initial="hidden"
              animate="show"
            >
              {skills.map((skill, i) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, scale: 0.8, y: 10 },
                    show: { opacity: 1, scale: 1, y: 0 },
                  }}
                  className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm font-medium"
                >
                  {skill}
                </motion.span>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
