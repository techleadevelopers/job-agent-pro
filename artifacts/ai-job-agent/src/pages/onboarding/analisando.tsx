import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useGetResume } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";

const skillsList = [
  "Python", "Go", "AWS", "GitHub", "FastAPI", "CI/CD", "Automação", "Open Source"
];

export default function Analisando() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);
  const [showSkills, setShowSkills] = useState(false);
  const { data: resume } = useGetResume();

  const skillsToDisplay = resume?.skills?.length ? resume.skills : skillsList;

  useEffect(() => {
    // Animate progress bar
    const duration = 3000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setShowSkills(true);
        
        // Wait a bit to show skills, then navigate
        setTimeout(() => {
          setLocation("/onboarding/vagas");
        }, 2500);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [setLocation]);

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
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analisando currículo...</h1>
          <p className="text-gray-500">Extraindo suas principais competências e experiências.</p>
        </motion.div>

        <Progress value={progress} className="h-2 mb-10 bg-primary/10" />

        <div className="h-32">
          {showSkills && (
            <motion.div 
              className="flex flex-wrap justify-center gap-2"
              variants={{
                show: { transition: { staggerChildren: 0.1 } }
              }}
              initial="hidden"
              animate="show"
            >
              {skillsToDisplay.map((skill, index) => (
                <motion.span
                  key={index}
                  variants={{
                    hidden: { opacity: 0, scale: 0.8, y: 10 },
                    show: { opacity: 1, scale: 1, y: 0 }
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
