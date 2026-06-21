import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Users, DollarSign, Sparkles,
  Package, Settings, CalendarPlus, CalendarCheck, ShoppingBag,
  LogOut, Menu, X, BarChart3, Receipt, UserCog, Tags, Stethoscope, HandCoins, ShoppingCart, AlertTriangle, Activity, UserX, TrendingUp, ClipboardList, ListOrdered,
  MessageSquare, ChevronDown, FolderOpen, FileText, Sun, Moon, Boxes
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: AppRole[];
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  roles: AppRole[];
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const navEntries: NavEntry[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "recepcao", "profissional", "cliente"] },
  { label: "Agenda", path: "/agenda", icon: Calendar, roles: ["admin", "recepcao", "profissional"] },
  { label: "Prontuário", path: "/prontuario", icon: ClipboardList, roles: ["admin", "profissional"] },
  { label: "Lista de Espera", path: "/lista-espera", icon: ListOrdered, roles: ["admin", "recepcao"] },
  { label: "Venda Rápida", path: "/venda-rapida", icon: ShoppingCart, roles: ["admin", "recepcao", "profissional"] },
  {
    label: "Cadastro", icon: FolderOpen, roles: ["admin", "recepcao"],
    children: [
      { label: "Clientes", path: "/clientes", icon: Users, roles: ["admin", "recepcao"] },
      { label: "Profissionais", path: "/profissionais", icon: Stethoscope, roles: ["admin"] },
      { label: "Usuários", path: "/usuarios", icon: UserCog, roles: ["admin"] },
      { label: "Serviços", path: "/servicos", icon: Sparkles, roles: ["admin"] },
      { label: "Categorias", path: "/categorias", icon: Tags, roles: ["admin"] },
      { label: "Pacotes", path: "/pacotes", icon: Package, roles: ["admin"] },
      { label: "Comissões", path: "/comissoes", icon: HandCoins, roles: ["admin"] },
      { label: "Estoque", path: "/estoque", icon: Boxes, roles: ["admin", "recepcao"] },
    ],
  },
  {
    label: "Relatórios", icon: FileText, roles: ["admin"],
    children: [
      { label: "BI / Análises", path: "/bi", icon: BarChart3, roles: ["admin"] },
      { label: "Taxa de Ocupação", path: "/taxa-ocupacao", icon: Activity, roles: ["admin"] },
      { label: "Churn", path: "/churn", icon: UserX, roles: ["admin"] },
      { label: "Produtividade", path: "/produtividade", icon: BarChart3, roles: ["admin"] },
    ],
  },
  {
    label: "Financeiro", icon: DollarSign, roles: ["admin", "recepcao"],
    children: [
      { label: "Financeiro", path: "/financeiro", icon: DollarSign, roles: ["admin", "recepcao"] },
      { label: "Despesas", path: "/despesas", icon: Receipt, roles: ["admin"] },
      { label: "Inadimplência", path: "/inadimplencia", icon: AlertTriangle, roles: ["admin"] },
      { label: "Projeção Receita", path: "/projecao-receita", icon: TrendingUp, roles: ["admin"] },
    ],
  },
  {
    label: "Configurações", icon: Settings, roles: ["admin"],
    children: [
      { label: "Configurações", path: "/configuracoes", icon: Settings, roles: ["admin"] },
      { label: "WhatsApp Log", path: "/whatsapp-historico", icon: MessageSquare, roles: ["admin"] },
    ],
  },
  // cliente
  { label: "Agendar", path: "/agendar", icon: CalendarPlus, roles: ["cliente"] },
  { label: "Meus Agendamentos", path: "/meus-agendamentos", icon: CalendarCheck, roles: ["cliente"] },
  { label: "Meus Pacotes", path: "/meus-pacotes", icon: ShoppingBag, roles: ["cliente"] },
  { label: "Minha Evolução", path: "/minha-evolucao", icon: ClipboardList, roles: ["cliente"] },
  { label: "Assistente IA", path: "/assistente", icon: Sparkles, roles: ["cliente"] },
];

/* ── Sidebar theme helpers (read from localStorage, applied by ThemeCustomizer) ── */
const SIDEBAR_THEME_CLASSES = ["sidebar-theme-teal", "sidebar-theme-blue", "sidebar-theme-purple", "sidebar-theme-neutral"];

function applyHslTheme(el: HTMLElement, h: number, s: number, l: number) {
  const bgL = Math.min(l, 18);
  const vars: Record<string, string> = {
    "--sidebar": `${h} ${s}% ${bgL}%`,
    "--sidebar-background": `${h} ${s}% ${bgL}%`,
    "--sidebar-foreground": "0 0% 92%",
    "--sidebar-primary": `${h} ${Math.min(s + 20, 100)}% ${Math.max(l, 50)}%`,
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": `${h} ${Math.round(s * 0.8)}% 22%`,
    "--sidebar-accent-foreground": "0 0% 98%",
    "--sidebar-border": `${h} ${Math.round(s * 0.6)}% 20%`,
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
  const { badges, changedPaths } = useSidebarBadges();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  // Sync with external theme changes (e.g. from ThemeCustomizer)
  useEffect(() => {
    const handler = () => setIsDark(document.documentElement.classList.contains("dark"));
    window.addEventListener("theme-changed", handler);
    return () => window.removeEventListener("theme-changed", handler);
  }, []);
  

  // Read persisted sidebar settings
  const sidebarTheme = localStorage.getItem("sidebar-theme") || "default";
  const sidebarOpacity = Number(localStorage.getItem("sidebar-opacity") ?? 100);
  const glassMode = localStorage.getItem("sidebar-glass") === "true";
  const blurLevel = localStorage.getItem("sidebar-blur") || "forte";


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

  // Apply palette overrides from localStorage (mode-aware)
  useEffect(() => {
    const presetId = localStorage.getItem("palette-preset");
    const isDark = document.documentElement.classList.contains("dark");
    
    if (presetId) {
      const savedLight = localStorage.getItem("palette-custom-light");
      const savedDark = localStorage.getItem("palette-custom-dark");
      if (savedLight && savedDark) {
        const values = isDark ? JSON.parse(savedDark) : JSON.parse(savedLight);
        const tokens = ["primary","secondary","accent","background","card","muted","destructive","success","warning","info"];
        const vars = ["--primary","--secondary","--accent","--background","--card","--muted","--destructive","--success","--warning","--info"];
        tokens.forEach((key, i) => {
          const val = values[key];
          if (val) {
            document.documentElement.style.setProperty(vars[i], `${val.h} ${val.s}% ${val.l}%`);
          }
        });
        return;
      }
    }
    
    // Fallback: individual saved values
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

  const hasRole = (entry: NavEntry) => entry.roles.some((r) => roles.includes(r));

  const Badge = ({ count, path }: { count?: number; path?: string }) =>
    count ? (
      <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground transition-transform ${
        path && changedPaths.has(path) ? "animate-[pulse_0.6s_ease-in-out_3]" : ""
      }`}>
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const groupBadgeCount = (group: NavGroup): number =>
    group.children.reduce((sum, c) => sum + (badges[c.path] || 0), 0);

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-sidebar-accent/40 text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground bg-transparent"
    }`;

  const blurClass = blurLevel === "leve" ? "backdrop-blur-md" : blurLevel === "medio" ? "backdrop-blur-xl" : "backdrop-blur-2xl";

  const SidebarGroup = ({ group }: { group: NavGroup }) => {
    const location = useLocation();
    const filteredChildren = group.children.filter(hasRole);
    if (filteredChildren.length === 0) return null;
    const isChildActive = filteredChildren.some((c) => location.pathname === c.path);
    const [expanded, setExpanded] = useState(isChildActive);

    useEffect(() => {
      if (isChildActive) setExpanded(true);
    }, [isChildActive]);

    const groupCount = groupBadgeCount(group);

    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
            isChildActive
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
          }`}
        >
          <group.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          {!expanded && groupCount > 0 && <Badge count={groupCount} />}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border/30 pl-2">
            {filteredChildren.map((item) => (
              <RouterNavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) => linkClass(isActive)}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[13px]">{item.label}</span>
                <Badge count={badges[item.path]} path={item.path} />
              </RouterNavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

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
        {navEntries.filter(hasRole).map((entry) =>
          isGroup(entry) ? (
            <SidebarGroup key={entry.label} group={entry} />
          ) : (
            <RouterNavLink
              key={entry.path}
              to={entry.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) => linkClass(isActive)}
            >
              <entry.icon className="h-4 w-4 shrink-0" />
              <span>{entry.label}</span>
              <Badge count={badges[entry.path]} path={entry.path} />
            </RouterNavLink>
          )
        )}
      </nav>

      <div className="border-t border-sidebar-border pt-4 mt-4">
        <div className="px-3 mb-2">
          <p className="text-sm font-medium text-sidebar-foreground">{profile.nome || profile.email}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{roles.join(", ") || "sem papel"}</p>
        </div>
        <button
          onClick={() => {
            const next = !isDark;
            document.documentElement.classList.toggle("dark", next);
            localStorage.setItem("theme", next ? "dark" : "light");
            setIsDark(next);
            window.dispatchEvent(new Event("theme-changed"));

            const presetId = localStorage.getItem("palette-preset");
            if (presetId) {
              const savedLight = localStorage.getItem("palette-custom-light");
              const savedDark = localStorage.getItem("palette-custom-dark");
              if (savedLight && savedDark) {
                const values = next ? JSON.parse(savedDark) : JSON.parse(savedLight);
                const tokens = ["primary","secondary","accent","background","card","muted","destructive","success","warning","info"];
                const vars = ["--primary","--secondary","--accent","--background","--card","--muted","--destructive","--success","--warning","--info"];
                const fgVars: Record<string, string> = {
                  primary: "--primary-foreground", secondary: "--secondary-foreground",
                  accent: "--accent-foreground", background: "--foreground",
                  card: "--card-foreground", muted: "--muted-foreground",
                  destructive: "--destructive-foreground", success: "--success-foreground",
                  warning: "--warning-foreground", info: "--info-foreground",
                };
                tokens.forEach((key, i) => {
                  const val = values[key];
                  if (val) {
                    document.documentElement.style.setProperty(vars[i], `${val.h} ${val.s}% ${val.l}%`);
                    // Set foreground
                    const fgVar = fgVars[key];
                    if (fgVar) {
                      let fg;
                      if (key === "primary") {
                        fg = val.l > 50 ? { h: val.h, s: Math.round(val.s * 0.8), l: 17 } : { h: val.h, s: 73, l: 97 };
                      } else {
                        fg = val.l > 50 ? { h: val.h, s: Math.round(val.s * 0.5), l: 10 } : { h: 0, s: 0, l: 98 };
                      }
                      document.documentElement.style.setProperty(fgVar, `${fg.h} ${fg.s}% ${fg.l}%`);
                    }
                  }
                });
                // Border/input/ring
                const muted = values.muted;
                if (muted) {
                  document.documentElement.style.setProperty("--border", `${muted.h} ${muted.s}% ${muted.l}%`);
                  document.documentElement.style.setProperty("--input", `${muted.h} ${muted.s}% ${muted.l}%`);
                }
                const primary = values.primary;
                if (primary) {
                  document.documentElement.style.setProperty("--ring", `${primary.h} ${primary.s}% ${primary.l}%`);
                }
                return;
              }
            }
            // No preset — clear inline overrides so CSS defaults kick in
            ["--primary","--secondary","--accent","--background","--card","--muted","--destructive","--success","--warning","--info",
             "--primary-foreground","--secondary-foreground","--accent-foreground","--foreground",
             "--card-foreground","--muted-foreground","--destructive-foreground","--success-foreground",
             "--warning-foreground","--info-foreground","--border","--input","--ring"
            ].forEach(v => document.documentElement.style.removeProperty(v));
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-colors w-full"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? "Modo Claro" : "Modo Escuro"}
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
