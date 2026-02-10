import { useState, useEffect } from "react";
import { Palette, Sparkles, Moon, Sun, RotateCcw } from "lucide-react";

/* ── Sidebar theme presets ── */
const SIDEBAR_THEMES = [
  { id: "default", label: "Rosa", color: "hsl(333 71% 50%)" },
  { id: "teal", label: "Teal", color: "hsl(172 60% 50%)" },
  { id: "blue", label: "Azul", color: "hsl(210 80% 60%)" },
  { id: "purple", label: "Roxo", color: "hsl(270 70% 65%)" },
  { id: "neutral", label: "Neutro", color: "hsl(0 0% 70%)" },
  { id: "custom", label: "Personalizado", color: "" },
] as const;

/* ── Global palette tokens ── */
interface PaletteToken {
  key: string;
  label: string;
  cssVar: string;
}

const PALETTE_TOKENS: PaletteToken[] = [
  { key: "primary", label: "Primária", cssVar: "--primary" },
  { key: "secondary", label: "Secundária", cssVar: "--secondary" },
  { key: "accent", label: "Destaque", cssVar: "--accent" },
  { key: "background", label: "Fundo", cssVar: "--background" },
  { key: "card", label: "Card", cssVar: "--card" },
  { key: "muted", label: "Suave", cssVar: "--muted" },
  { key: "destructive", label: "Destrutiva", cssVar: "--destructive" },
  { key: "success", label: "Sucesso", cssVar: "--success" },
  { key: "warning", label: "Alerta", cssVar: "--warning" },
  { key: "info", label: "Info", cssVar: "--info" },
];

function getComputedHsl(cssVar: string): { h: number; s: number; l: number } {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  const parts = raw.split(/[\s]+/);
  return { h: parseInt(parts[0]) || 0, s: parseInt(parts[1]) || 0, l: parseInt(parts[2]) || 0 };
}

/* ── Color conversion helpers ── */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100, l1 = l / 100;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l1 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* ── Sidebar helpers ── */
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

function clearCustomColor(el: HTMLElement) {
  ["--sidebar","--sidebar-background","--sidebar-foreground","--sidebar-primary","--sidebar-primary-foreground","--sidebar-accent","--sidebar-accent-foreground","--sidebar-border","--sidebar-ring"]
    .forEach((k) => el.style.removeProperty(k));
}

/* ── Component ── */
export default function ThemeCustomizer() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  // Sidebar states
  const [sidebarTheme, setSidebarTheme] = useState(() => localStorage.getItem("sidebar-theme") || "default");
  const [customHsl, setCustomHsl] = useState(() => {
    const saved = localStorage.getItem("sidebar-custom-hsl");
    return saved ? JSON.parse(saved) : { h: 333, s: 30, l: 14 };
  });
  const [sidebarOpacity, setSidebarOpacity] = useState(() => Number(localStorage.getItem("sidebar-opacity") ?? 70));
  const [glassMode, setGlassMode] = useState(() => localStorage.getItem("sidebar-glass") === "true");
  const [blurLevel, setBlurLevel] = useState<"leve" | "medio" | "forte">(() => (localStorage.getItem("sidebar-blur") as any) || "forte");

  // Palette state
  const [palette, setPalette] = useState<Record<string, { h: number; s: number; l: number }>>({});

  useEffect(() => {
    const initial: Record<string, { h: number; s: number; l: number }> = {};
    PALETTE_TOKENS.forEach((t) => {
      const saved = localStorage.getItem(`palette-${t.key}`);
      if (saved) {
        initial[t.key] = JSON.parse(saved);
      } else {
        initial[t.key] = getComputedHsl(t.cssVar);
      }
    });
    setPalette(initial);
  }, []);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Apply sidebar theme
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

  // Apply sidebar opacity & glass to sidebar element
  useEffect(() => {
    const el = document.querySelector("[data-sidebar-root]") as HTMLElement | null;
    if (!el) return;
    el.style.backgroundColor = `hsl(var(--sidebar) / ${sidebarOpacity / 100})`;
  }, [sidebarOpacity]);

  // Apply palette to :root
  useEffect(() => {
    Object.entries(palette).forEach(([key, val]) => {
      const token = PALETTE_TOKENS.find((t) => t.key === key);
      if (token) {
        document.documentElement.style.setProperty(token.cssVar, `${val.h} ${val.s}% ${val.l}%`);
      }
    });
  }, [palette]);

  const updatePalette = (key: string, field: "h" | "s" | "l", value: number) => {
    setPalette((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [field]: value } };
      localStorage.setItem(`palette-${key}`, JSON.stringify(next[key]));
      return next;
    });
  };

  const resetPalette = () => {
    PALETTE_TOKENS.forEach((t) => {
      localStorage.removeItem(`palette-${t.key}`);
      document.documentElement.style.removeProperty(t.cssVar);
    });
    const fresh: Record<string, { h: number; s: number; l: number }> = {};
    PALETTE_TOKENS.forEach((t) => { fresh[t.key] = getComputedHsl(t.cssVar); });
    setPalette(fresh);
  };

  const inputClass = "flex-1 h-1.5 accent-primary cursor-pointer";

  return (
    <div className="space-y-6">
      {/* Dark Mode */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Modo de Cor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Alterne entre tema claro e escuro</p>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Modo Claro" : "Modo Escuro"}
          </button>
        </div>
      </div>

      {/* Sidebar Theme */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" /> Tema da Barra Lateral
        </h3>

        {/* Color swatches */}
        <div className="flex items-center gap-3">
          {SIDEBAR_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSidebarTheme(t.id)}
              title={t.label}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                sidebarTheme === t.id ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border"
              } ${t.id === "custom" ? "bg-gradient-to-br from-red-400 via-green-400 to-blue-400" : ""}`}
              style={t.color ? { backgroundColor: t.color } : undefined}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">
            {SIDEBAR_THEMES.find((t) => t.id === sidebarTheme)?.label}
          </span>
        </div>

        {/* Custom color picker */}
        {sidebarTheme === "custom" && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Escolha a cor</span>
              <div className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: `hsl(${customHsl.h} ${customHsl.s}% ${customHsl.l}%)` }} />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={hslToHex(customHsl.h, customHsl.s, customHsl.l)}
                onChange={(e) => {
                  const next = hexToHsl(e.target.value);
                  setCustomHsl(next);
                  localStorage.setItem("sidebar-custom-hsl", JSON.stringify(next));
                }}
                className="h-10 w-16 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <span className="text-xs text-muted-foreground">
                Clique para escolher qualquer cor
              </span>
            </div>
          </div>
        )}

        {/* Opacity */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-20">Opacidade</span>
          <input
            type="range" min={20} max={100} value={sidebarOpacity}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSidebarOpacity(v);
              localStorage.setItem("sidebar-opacity", String(v));
            }}
            className={inputClass}
          />
          <span className="text-xs text-muted-foreground w-10 text-right">{sidebarOpacity}%</span>
        </div>

        {/* Glassmorphism */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Glassmorphism</span>
          </div>
          <button
            onClick={() => {
              const next = !glassMode;
              setGlassMode(next);
              localStorage.setItem("sidebar-glass", String(next));
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              glassMode ? "bg-primary" : "bg-input"
            }`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
              glassMode ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>

        {/* Blur level */}
        {glassMode && (
          <div className="flex items-center gap-2 pl-6">
            <span className="text-xs text-muted-foreground">Blur:</span>
            {(["leve", "medio", "forte"] as const).map((level) => (
              <button
                key={level}
                onClick={() => { setBlurLevel(level); localStorage.setItem("sidebar-blur", level); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  blurLevel === level
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                {level === "leve" ? "Leve" : level === "medio" ? "Médio" : "Forte"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global Palette */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Paleta de Cores
          </h3>
          <button onClick={resetPalette} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Ajuste as cores globais do sistema. As mudanças são aplicadas em tempo real.</p>

        <div className="grid gap-4">
          {PALETTE_TOKENS.map((token) => {
            const val = palette[token.key];
            if (!val) return null;
            return (
              <div key={token.key} className="bg-muted/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{token.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hslToHex(val.h, val.s, val.l)}
                      onChange={(e) => {
                        const hsl = hexToHsl(e.target.value);
                        updatePalette(token.key, "h", hsl.h);
                        updatePalette(token.key, "s", hsl.s);
                        updatePalette(token.key, "l", hsl.l);
                      }}
                      className="h-6 w-8 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">{val.h} {val.s}% {val.l}%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {([
                    { field: "h" as const, label: "H", max: 360 },
                    { field: "s" as const, label: "S", max: 100 },
                    { field: "l" as const, label: "L", max: 100 },
                  ]).map(({ field, label, max }) => (
                    <div key={field} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-3">{label}</span>
                      <input
                        type="range" min={0} max={max} value={val[field]}
                        onChange={(e) => updatePalette(token.key, field, Number(e.target.value))}
                        className={inputClass}
                      />
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{val[field]}{field === "h" ? "°" : "%"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
