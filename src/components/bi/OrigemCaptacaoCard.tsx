import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChartCard from "./ChartCard";
import { PIE_COLORS } from "./useBIData";
import { PieChart as RPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const LABELS: Record<string, string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  google: "Google",
  fachada: "Fachada",
  outro: "Outro",
  nao_informado: "Não informado",
};

export default function OrigemCaptacaoCard() {
  const [rows, setRows] = useState<{ name: string; value: number; pct: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients").select("origem_captacao");
      const items = (data || []) as { origem_captacao: string | null }[];
      const counts: Record<string, number> = {};
      for (const c of items) {
        const k = c.origem_captacao || "nao_informado";
        counts[k] = (counts[k] || 0) + 1;
      }
      const tot = items.length;
      const arr = Object.entries(counts)
        .map(([k, v]) => ({ name: LABELS[k] || k, value: v, pct: tot ? (v / tot) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);
      setRows(arr);
      setTotal(tot);
    })();
  }, []);

  return (
    <ChartCard title="Origem de Captação" icon={Users}>
      <p className="text-xs text-muted-foreground mb-2">{total} cliente{total === 1 ? "" : "s"} no total</p>
      <ResponsiveContainer width="100%" height={220}>
        <RPie>
          <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {rows.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
          </Pie>
          <Tooltip formatter={(v: number, _n, p: any) => [`${v} (${p.payload.pct.toFixed(1)}%)`, p.payload.name]} />
          <Legend />
        </RPie>
      </ResponsiveContainer>
    </ChartCard>
  );
}