import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { AppLayout } from "@/components/AppLayout";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useGetResume } from "@workspace/api-client-react";

// Onboarding pages
import Curriculo from "@/pages/onboarding/curriculo";
import Preferencias from "@/pages/onboarding/preferencias";
import Analisando from "@/pages/onboarding/analisando";
import VagasOnboarding from "@/pages/onboarding/vagas";

// Main app pages
import Inicio from "@/pages/inicio";
import Vagas from "@/pages/vagas";
import Candidaturas from "@/pages/candidaturas";
import Agente from "@/pages/agente";
import Historico from "@/pages/historico";
import Configuracoes from "@/pages/configuracoes";
import TesteEmail from "@/pages/teste-email";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteWrapper() {
  const [location, setLocation] = useLocation();
  const { data: resume, isLoading, error } = useGetResume();
  const isOnboarding = location.startsWith("/onboarding");

  useEffect(() => {
    if (isLoading) return;
    if (error && !isOnboarding) {
      setLocation("/onboarding/curriculo");
    } else if (resume && isOnboarding) {
      setLocation("/inicio");
    }
  }, [isLoading, error, resume, isOnboarding, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <Switch location={location} key={location}>
              <Route path="/onboarding/curriculo" component={Curriculo} />
              <Route path="/onboarding/preferencias" component={Preferencias} />
              <Route path="/onboarding/analisando" component={Analisando} />
              <Route path="/onboarding/vagas" component={VagasOnboarding} />
              <Route component={NotFound} />
            </Switch>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <AppLayout>
        <AnimatePresence mode="wait">
          <Switch location={location} key={location}>
            <Route path="/" component={() => <Redirect to="/inicio" />} />
            <Route path="/inicio" component={Inicio} />
            <Route path="/vagas" component={Vagas} />
            <Route path="/candidaturas" component={Candidaturas} />
            <Route path="/agente" component={Agente} />
            <Route path="/historico" component={Historico} />
            <Route path="/configuracoes" component={Configuracoes} />
            <Route path="/teste-email" component={TesteEmail} />
            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </AppLayout>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <RouteWrapper />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
