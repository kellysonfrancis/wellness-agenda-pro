import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Users, DollarSign, Sparkles,
  Package, Settings, CalendarPlus, CalendarCheck, ShoppingBag,
  LogOut, Menu, X, BarChart3, Receipt, UserCog, Tags, Stethoscope, HandCoins, ShoppingCart, AlertTriangle, Activity, UserX, TrendingUp, ClipboardList, ListOrdered,
  Moon, Sun, MessageSquare
} from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "recepcao", "profissional", "cliente"] },
  { label: "Agenda", path: "/agenda", icon: Calendar, roles: ["admin", "recepcao", "profissional"] },
  { label: "Prontuário", path: "/prontuario", icon: ClipboardList, roles: ["admin", "profissional"] },
  { label: "Lista de Espera", path: "/lista-espera", icon: ListOrdered, roles: ["admin", "recepcao"] },
  { label: "Venda Rápida", path: "/venda-rapida", icon: ShoppingCart, roles: ["admin", "recepcao", "profissional"] },
  { label: "Clientes", path: "/clientes", icon: Users, roles: ["admin", "recepcao"] },
  { label: "Financeiro", path: "/financeiro", icon: DollarSign, roles: ["admin", "recepcao"] },
  { label: "Despesas", path: "/despesas", icon: Receipt, roles: ["admin"] },
  { label: "Serviços", path: "/servicos", icon: Sparkles, roles: ["admin"] },
  { label: "Categorias", path: "/categorias", icon: Tags, roles: ["admin"] },
  { label: "Profissionais", path: "/profissionais", icon: Stethoscope, roles: ["admin"] },
  { label: "Pacotes", path: "/pacotes", icon: Package, roles: ["admin"] },
  { label: "BI / Análises", path: "/bi", icon: BarChart3, roles: ["admin"] },
  { label: "Comissões", path: "/comissoes", icon: HandCoins, roles: ["admin"] },
  { label: "Inadimplência", path: "/inadimplencia", icon: AlertTriangle, roles: ["admin"] },
  { label: "Taxa de Ocupação", path: "/taxa-ocupacao", icon: Activity, roles: ["admin"] },
  { label: "Churn", path: "/churn", icon: UserX, roles: ["admin"] },
  { label: "Projeção Receita", path: "/projecao-receita", icon: TrendingUp, roles: ["admin"] },
  { label: "Produtividade", path: "/produtividade", icon: BarChart3, roles: ["admin"] },
  { label: "Usuários", path: "/usuarios", icon: UserCog, roles: ["admin"] },
  { label: "WhatsApp Log", path: "/whatsapp-historico", icon: MessageSquare, roles: ["admin"] },
  { label: "Configurações", path: "/configuracoes", icon: Settings, roles: ["admin"] },
  // cliente
  { label: "Agendar", path: "/agendar", icon: CalendarPlus, roles: ["cliente"] },
  { label: "Meus Agendamentos", path: "/meus-agendamentos", icon: CalendarCheck, roles: ["cliente"] },
  { label: "Meus Pacotes", path: "/meus-pacotes", icon: ShoppingBag, roles: ["cliente"] },
];

export default function AppSidebar() {
  const { profile, roles, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (!profile) return null;

  const filtered = navItems.filter((i) => i.roles.some((r) => roles.includes(r)));

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-sidebar-accent/40 text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground bg-transparent"
    }`;

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar w-64 p-4">
      <div className="mb-6 px-3">
        <h2 className="text-lg font-bold text-sidebar-primary">Clínica</h2>
        <p className="text-xs text-sidebar-foreground/60 mt-0.5">Gestão Integrada</p>
      </div>

      <nav className="flex-1 space-y-1">
        {filtered.map((item) => (
          <RouterNavLink
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            className={({ isActive }) => linkClass(isActive)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </RouterNavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border pt-4 mt-4">
        <div className="px-3 mb-3">
          <p className="text-sm font-medium text-sidebar-foreground">{profile.nome || profile.email}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{roles.join(", ") || "sem papel"}</p>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors w-full"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? "Modo Claro" : "Modo Escuro"}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card shadow-md border border-border"
        aria-label="Menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full transition-transform md:translate-x-0 md:static md:block ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>
    </>
  );
}
