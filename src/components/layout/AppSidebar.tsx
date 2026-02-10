import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Users, DollarSign, Sparkles,
  Package, Settings, CalendarPlus, CalendarCheck, ShoppingBag,
  LogOut, Menu, X, BarChart3, Receipt, UserCog, Tags, Stethoscope, HandCoins, ShoppingCart, AlertTriangle, Activity, UserX, TrendingUp, ClipboardList, ListOrdered,
  Moon, Sun, MessageSquare, Palette
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const SIDEBAR_THEMES = [
  { id: "default", label: "Rosa", color: "hsl(333 71% 50%)", bg: "hsl(333 30% 14%)" },
  { id: "teal", label: "Teal", color: "hsl(172 60% 50%)", bg: "hsl(172 40% 12%)" },
  { id: "blue", label: "Azul", color: "hsl(210 80% 60%)", bg: "hsl(220 30% 12%)" },
  { id: "purple", label: "Roxo", color: "hsl(270 70% 65%)", bg: "hsl(270 25% 12%)" },
  { id: "neutral", label: "Neutro", color: "hsl(0 0% 70%)", bg: "hsl(0 0% 10%)" },
  { id: "custom", label: "Personalizado", color: "" , bg: "" },
] as const;

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

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

function clearCustomColor(el: HTMLElement) {
  ["--sidebar","--sidebar-background","--sidebar-foreground","--sidebar-primary","--sidebar-primary-foreground","--sidebar-accent","--sidebar-accent-foreground","--sidebar-border","--sidebar-ring"]
    .forEach((k) => el.style.removeProperty(k));
}

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

  const [sidebarTheme, setSidebarTheme] = useState(() => localStorage.getItem("sidebar-theme") || "default");
  const [customHsl, setCustomHsl] = useState(() => {
    const saved = localStorage.getItem("sidebar-custom-hsl");
    return saved ? JSON.parse(saved) : { h: 333, s: 30, l: 14 };
  });
  const [sidebarOpacity, setSidebarOpacity] = useState(() => Number(localStorage.getItem("sidebar-opacity") ?? 70));
  const [glassMode, setGlassMode] = useState(() => localStorage.getItem("sidebar-glass") === "true");
  const [blurLevel, setBlurLevel] = useState<"leve" | "medio" | "forte">(() => (localStorage.getItem("sidebar-blur") as any) || "forte");
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const el = document.querySelector("[data-sidebar-root]") as HTMLElement | null;
    if (!el) return;
    SIDEBAR_THEMES.forEach((t) => el.classList.remove(`sidebar-theme-${t.id}`));
    clearCustomColor(el);
    if (sidebarTheme === "custom") {
      applyHslTheme(el, customHsl.h, customHsl.s, customHsl.l);
    } else if (sidebarTheme !== "default") {
      el.classList.add(`sidebar-theme-${sidebarTheme}`);
    }
    localStorage.setItem("sidebar-theme", sidebarTheme);
  }, [sidebarTheme, customHsl]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!profile) return null;

  const filtered = navItems.filter((i) => i.roles.some((r) => roles.includes(r)));

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-sidebar-accent/40 text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground bg-transparent"
    }`;

  const sidebar = (
    <div data-sidebar-root className={`flex flex-col h-full w-64 p-4 ${glassMode ? `${blurLevel === "leve" ? "backdrop-blur-md" : blurLevel === "medio" ? "backdrop-blur-xl" : "backdrop-blur-2xl"} border-r border-white/10` : "border-r border-sidebar-border/20"}`} style={{ backgroundColor: `hsl(var(--sidebar) / ${sidebarOpacity / 100})` }}>
      <div className="mb-6 px-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/20">
          <Stethoscope className="h-5 w-5 text-sidebar-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-sidebar-foreground leading-tight">Clínica</h2>
          <p className="text-xs text-sidebar-foreground/60">Gestão Integrada</p>
        </div>
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
        <div className="relative flex items-center gap-2 px-3 py-2" ref={pickerRef}>
          <Palette className="h-4 w-4 text-sidebar-foreground/70 shrink-0" />
          {SIDEBAR_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === "custom") {
                  setShowPicker((v) => !v);
                  setSidebarTheme("custom");
                } else {
                  setSidebarTheme(t.id);
                  setShowPicker(false);
                }
              }}
              title={t.label}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                sidebarTheme === t.id ? "border-sidebar-foreground scale-110" : "border-transparent"
              } ${t.id === "custom" ? "bg-gradient-to-br from-red-400 via-green-400 to-blue-400" : ""}`}
              style={t.color ? { backgroundColor: t.color } : undefined}
            />
          ))}
          {showPicker && (
            <div className="absolute bottom-full left-3 mb-2 p-3 rounded-lg bg-sidebar-accent border border-sidebar-border shadow-lg z-50 w-52 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wide">HSL</span>
                <div className="h-5 w-5 rounded-full border border-sidebar-border" style={{ backgroundColor: `hsl(${customHsl.h} ${customHsl.s}% ${customHsl.l}%)` }} />
              </div>
              {([
                { key: "h", label: "H", min: 0, max: 360 },
                { key: "s", label: "S", min: 0, max: 100 },
                { key: "l", label: "L", min: 0, max: 100 },
              ] as const).map(({ key, label, min, max }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-sidebar-foreground/70 w-3">{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={customHsl[key]}
                    onChange={(e) => {
                      const next = { ...customHsl, [key]: Number(e.target.value) };
                      setCustomHsl(next);
                      localStorage.setItem("sidebar-custom-hsl", JSON.stringify(next));
                    }}
                    className="flex-1 h-1.5 accent-sidebar-primary cursor-pointer"
                  />
                  <span className="text-xs text-sidebar-foreground/60 w-7 text-right">{customHsl[key]}{key !== "h" ? "%" : "°"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-xs text-sidebar-foreground/60 whitespace-nowrap">Opacidade</span>
          <input
            type="range"
            min={20}
            max={100}
            value={sidebarOpacity}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSidebarOpacity(v);
              localStorage.setItem("sidebar-opacity", String(v));
            }}
            className="flex-1 h-1.5 accent-sidebar-primary cursor-pointer"
          />
          <span className="text-xs text-sidebar-foreground/60 w-7 text-right">{sidebarOpacity}%</span>
        </div>
        <button
          onClick={() => {
            const next = !glassMode;
            setGlassMode(next);
            localStorage.setItem("sidebar-glass", String(next));
          }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
            glassMode
              ? "bg-sidebar-primary/20 text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Glassmorphism
        </button>
        {glassMode && (
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <span className="text-xs text-sidebar-foreground/60 mr-1">Blur</span>
            {(["leve", "medio", "forte"] as const).map((level) => (
              <button
                key={level}
                onClick={() => {
                  setBlurLevel(level);
                  localStorage.setItem("sidebar-blur", level);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  blurLevel === level
                    ? "bg-sidebar-primary/20 text-sidebar-primary"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                }`}
              >
                {level === "leve" ? "Leve" : level === "medio" ? "Médio" : "Forte"}
              </button>
            ))}
          </div>
        )}
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
