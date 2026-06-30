import { Link, useLocation } from "wouter";
import { Home, Briefcase, Send, Bot, Clock, Settings, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sidebarItems = [
  { icon: Home, label: "Início", path: "/inicio" },
  { icon: Briefcase, label: "Vagas", path: "/vagas" },
  { icon: Send, label: "Candidaturas", path: "/candidaturas" },
  { icon: Bot, label: "Agente IA", path: "/agente" },
  { icon: Clock, label: "Histórico", path: "/historico" },
  { icon: FlaskConical, label: "Teste de Email", path: "/teste-email", highlight: true },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-transparent">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200/50 bg-white/50 backdrop-blur-md relative z-20 flex flex-col p-4">
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">AI Job Agent</span>
        </div>
        
        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            const isHighlight = (item as any).highlight;

            return (
              <Link key={item.path} href={item.path}>
                <span className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative group cursor-pointer",
                  isActive ? "text-primary" : isHighlight ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50/60" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                )}>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={cn(
                    "w-5 h-5 relative z-10",
                    isActive ? "text-primary" : isHighlight ? "text-amber-500 group-hover:text-amber-600" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  <span className="relative z-10">{item.label}</span>
                  {isHighlight && !isActive && (
                    <span className="ml-auto relative z-10 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
