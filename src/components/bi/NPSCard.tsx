import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChartCard from "./ChartCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function NPSCard() {
  const [avg, setAvg] = useState(0);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<{ nota: string; qtd: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("satisfaction_surveys")
        .select("nota")
        .not("nota", "is", null);
      const rows = (data || []) as { nota: number }[];
      const t = rows.length;
      const sum = rows.reduce((a, r) => a + (r.nota || 0), 0);
      setTotal(t);
      setAvg(t ? sum / t : 0);
      const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      rows.forEach((r) => { buckets[r.nota] = (buckets[r.nota] || 0) + 1; });
      setCounts([1, 2, 3, 4, 5].map((n) => ({ nota: `${n}★`, qtd: buckets[n] })));
    })();
  }, []);

  return (
    <ChartCard title="Satisfação (NPS)" icon={Star}>
      <div className="flex items-baseline gap-4 mb-3">
        <div>
          <p className="text-3xl font-bold">{avg.toFixed(1)}<span className="text-base text-muted-foreground"> / 5</span></p>
          <p className="text-xs text-muted-foreground">{total} resposta{total === 1 ? "" : "s"}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={counts}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(170 15% 88%)" />
          <XAxis dataKey="nota" tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
          <Tooltip />
          <Bar dataKey="qtd" name="Respostas" fill="hsl(45 90% 55%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}