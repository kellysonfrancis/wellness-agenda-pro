import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, RefreshCw } from "lucide-react";

type Invoice = {
  id: string;
  provider: string;
  status: string;
  valor: number;
  pdf_url: string | null;
  xml_url: string | null;
  created_at: string;
  motivo_erro: string | null;
  client: { nome: string } | null;
};

export default function InvoicesList() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Invoice[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("id, provider, status, valor, pdf_url, xml_url, created_at, motivo_erro, client:clients(nome)")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Notas fiscais emitidas</h2>
        <button onClick={load} className="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border hover:bg-muted">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>
      {loading ? (
        <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma nota emitida ainda.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/40">
              <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Provedor</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Valor</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Data</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Arquivos</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {items.map(i => (
                <tr key={i.id} className="hover:bg-muted/30">
                  <td className="p-4">{i.client?.nome || "—"}</td>
                  <td className="p-4 capitalize">{i.provider}</td>
                  <td className="p-4">R$ {Number(i.valor).toLocaleString("pt-BR")}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      i.status === "autorizada" ? "bg-success/10 text-success" :
                      i.status === "erro" ? "bg-destructive/10 text-destructive" :
                      i.status === "cancelada" ? "bg-muted text-muted-foreground" :
                      "bg-warning/10 text-warning"
                    }`}>{i.status}</span>
                    {i.motivo_erro && <p className="text-[10px] text-destructive mt-1 max-w-xs truncate" title={i.motivo_erro}>{i.motivo_erro}</p>}
                  </td>
                  <td className="p-4">{new Date(i.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4 flex gap-2">
                    {i.pdf_url && <a href={i.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">PDF</a>}
                    {i.xml_url && <a href={i.xml_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">XML</a>}
                    {!i.pdf_url && !i.xml_url && <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}