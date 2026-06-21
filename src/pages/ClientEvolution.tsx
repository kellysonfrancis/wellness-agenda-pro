import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { ClipboardList, ShieldAlert } from "lucide-react";
import { format, parseISO } from "date-fns";

interface EvolutionPhoto {
  id: string;
  tipo: "antes" | "depois";
  signed_url: string | null;
  observacao: string | null;
  created_at: string;
}

export default function ClientEvolution() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<EvolutionPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ["my-client-evol", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id").eq("email", user?.email || "").maybeSingle();
      return data;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!client?.id) return;
    setLoading(true);
    supabase.functions
      .invoke("get-evolution-link", { body: { client_id: client.id } })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setPhotos((data?.photos || []) as EvolutionPhoto[]);
      })
      .finally(() => setLoading(false));
  }, [client?.id]);

  const antes = photos.filter((p) => p.tipo === "antes");
  const depois = photos.filter((p) => p.tipo === "depois");

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> Minha Evolução
        </h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5" /> Fotos disponíveis por link seguro temporário
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : err ? (
        <div className="bg-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">{err}</div>
      ) : !client ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">Nenhum cadastro de cliente encontrado.</div>
      ) : photos.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">Você ainda não tem fotos de evolução cadastradas.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Column title="ANTES" items={antes} />
          <Column title="DEPOIS" items={depois} />
        </div>
      )}
    </GlobalLayout>
  );
}

function Column({ title, items }: { title: string; items: EvolutionPhoto[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title} ({items.length})</h4>
      <div className="space-y-3">
        {items.length === 0 && <div className="text-xs text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">Sem fotos</div>}
        {items.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {p.signed_url ? (
              <img src={p.signed_url} alt={title} className="w-full h-72 object-cover" />
            ) : (
              <div className="w-full h-72 bg-muted" />
            )}
            <div className="p-3 text-xs">
              <p className="font-medium">{format(parseISO(p.created_at), "dd/MM/yyyy HH:mm")}</p>
              {p.observacao && <p className="text-muted-foreground mt-0.5">{p.observacao}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}