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

/* ── Sidebar theme helpers (read from localStorage, applied by ThemeCustomizer) ── */
const SIDEBAR_THEME_CLASSES = ["sidebar-theme-teal", "sidebar-theme-blue", "sidebar-theme-purple", "sidebar-theme-neutral"];

function applyHslTheme(el: HTMLElement, h: number, s: number, l: number) {
  const bgL = Math.min(l, 18);
  const vars: Record<string, string> = {
    "--sidebar": `${h} ${Math.round(s * 0.5)}% ${bgL}%`,
    "--sidebar-background": `${h} ${Math.round(s * 0.5)}% ${bgL}%`,
    "--sidebar-foreground": "0 0% 92%",
    "--sidebar-primary": `${h} ${s}% ${Math.max(l, 50)}%`,
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": `${h} ${Math.round(s * 0.4)}% 22%`,
    "--sidebar-accent-foreground": "0 0% 98%",
    "--sidebar-border": `${h} ${Math.round(s * 0.3)}% 20%`,
    "--sidebar-ring": `${h} ${s}% ${Math.max(l, 50)}%`,
  };
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

function clearInlineVars(el: HTMLElement) {
  ["--sidebar","--sidebar-background","--sidebar-foreground","--sidebar-primary","--sidebar-primary-foreground","--sidebar-accent","--sidebar-accent-foreground","--sidebar-border","--sidebar-ring"]
    .forEach((k) => el.style.removeProperty(k));
}

export default function AppSidebar() {
  const { profile, roles, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  // Read persisted sidebar settings
  const sidebarTheme = localStorage.getItem("sidebar-theme") || "default";
  const sidebarOpacity = Number(localStorage.getItem("sidebar-opacity") ?? 70);
  const glassMode = localStorage.getItem("sidebar-glass") === "true";
  const blurLevel = localStorage.getItem("sidebar-blur") || "forte";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Apply sidebar theme from persisted settings
  useEffect(() => {
    const el = document.querySelector("[data-sidebar-root]") as HTMLElement | null;
    if (!el) return;
    SIDEBAR_THEME_CLASSES.forEach((c) => el.classList.remove(c));
    clearInlineVars(el);
    if (sidebarTheme === "custom") {
      try {
        const hsl = JSON.parse(localStorage.getItem("sidebar-custom-hsl") || '{"h":333,"s":30,"l":14}');
        applyHslTheme(el, hsl.h, hsl.s, hsl.l);
      } catch {}
    } else if (sidebarTheme !== "default") {
      el.classList.add(`sidebar-theme-${sidebarTheme}`);
    }
  }, [sidebarTheme]);

  // Apply palette overrides from localStorage
  useEffect(() => {
    const tokens = ["primary","secondary","accent","background","card","muted","destructive","success","warning","info"];
    const vars = ["--primary","--secondary","--accent","--background","--card","--muted","--destructive","--success","--warning","--info"];
    tokens.forEach((key, i) => {
      const saved = localStorage.getItem(`palette-${key}`);
      if (saved) {
        try {
          const { h, s, l } = JSON.parse(saved);
          document.documentElement.style.setProperty(vars[i], `${h} ${s}% ${l}%`);
        } catch {}
      }
    });
  }, []);

  if (!profile) return null;

  const filtered = navItems.filter((i) => i.roles.some((r) => roles.includes(r)));

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-sidebar-accent/40 text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground bg-transparent"
    }`;

  const blurClass = blurLevel === "leve" ? "backdrop-blur-md" : blurLevel === "medio" ? "backdrop-blur-xl" : "backdrop-blur-2xl";

  const sidebar = (
    <div
      data-sidebar-root
      className={`flex flex-col h-full w-64 p-4 ${glassMode ? `${blurClass} border-r border-white/10` : "border-r border-sidebar-border/20"}`}
      style={{ backgroundColor: `hsl(var(--sidebar) / ${sidebarOpacity / 100})` }}
    >
      <div className="mb-6 px-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/20">
          <Stethoscope className="h-5 w-5 text-sidebar-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-sidebar-foreground leading-tight">Clínica</h2>
          <p className="text-xs text-sidebar-foreground/60">Gestão Integrada</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
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
