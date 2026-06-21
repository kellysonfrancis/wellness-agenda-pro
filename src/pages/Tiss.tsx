import { useEffect, useState, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ListChecks, FileSpreadsheet, Package, Loader2, Plus, Download, RefreshCw } from "lucide-react";

type Insurer = { id: string; nome: string; registro_ans: string | null; versao_tiss: string; codigo_prestador: string | null; ativo: boolean };
type Proc = { id: string; codigo: string; descricao: string; valor: number };
type Guide = { id: string; insurer_id: string; client_id: string; tipo: string; numero_guia: string | null; status: string; valor: number; created_at: string; insurer?: { nome: string } | null; client?: { nome: string } | null };
type Batch = { id: string; insurer_id: string; numero_lote: string; xml: string | null; status: string; total_guias: number; valor_total: number; created_at: string; insurer?: { nome: string } | null };

const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

export default function TissPage() {
  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-primary" /> TISS — Convênios</h1>
        <p className="text-sm text-muted-foreground mt-1">MVP de faturamento TISS. Valide o XML gerado no validador do convênio antes de enviar em produção.</p>
      </div>
      <Tabs defaultValue="convenios" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="convenios"><Building2 className="h-4 w-4 mr-1.5" />Convênios</TabsTrigger>
          <TabsTrigger value="procedimentos"><ListChecks className="h-4 w-4 mr-1.5" />Procedimentos</TabsTrigger>
          <TabsTrigger value="guias"><FileSpreadsheet className="h-4 w-4 mr-1.5" />Guias</TabsTrigger>
          <TabsTrigger value="lotes"><Package className="h-4 w-4 mr-1.5" />Lotes</TabsTrigger>
        </TabsList>
        <TabsContent value="convenios"><InsurersTab /></TabsContent>
        <TabsContent value="procedimentos"><ProceduresTab /></TabsContent>
        <TabsContent value="guias"><GuidesTab /></TabsContent>
        <TabsContent value="lotes"><BatchesTab /></TabsContent>
      </Tabs>
    </GlobalLayout>
  );
}

function InsurersTab() {
  const [list, setList] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: "", registro_ans: "", versao_tiss: "4.01.00", codigo_prestador: "" });
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("health_insurers").select("*").order("nome");
    setList((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("health_insurers").insert(form as any);
    if (error) return toast.error(error.message);
    setForm({ nome: "", registro_ans: "", versao_tiss: "4.01.00", codigo_prestador: "" });
    toast.success("Convênio cadastrado"); load();
  };
  const toggle = async (i: Insurer) => {
    await supabase.from("health_insurers").update({ ativo: !i.ativo } as any).eq("id", i.id);
    load();
  };
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-3 md:col-span-1">
        <h3 className="font-semibold text-sm">Novo convênio</h3>
        <input className={input} placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <input className={input} placeholder="Registro ANS" value={form.registro_ans} onChange={(e) => setForm({ ...form, registro_ans: e.target.value })} />
        <input className={input} placeholder="Versão TISS (ex: 4.01.00)" value={form.versao_tiss} onChange={(e) => setForm({ ...form, versao_tiss: e.target.value })} />
        <input className={input} placeholder="Código do prestador" value={form.codigo_prestador} onChange={(e) => setForm({ ...form, codigo_prestador: e.target.value })} />
        <button onClick={save} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center justify-center gap-2"><Plus className="h-4 w-4" />Adicionar</button>
      </div>
      <div className="md:col-span-2 bg-card border border-border rounded-xl">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> :
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/40 text-left">
            <th className="p-3 font-medium text-muted-foreground">Nome</th>
            <th className="p-3 font-medium text-muted-foreground">ANS</th>
            <th className="p-3 font-medium text-muted-foreground">Versão</th>
            <th className="p-3 font-medium text-muted-foreground">Prestador</th>
            <th className="p-3 font-medium text-muted-foreground">Ativo</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum convênio</td></tr> :
            list.map(i => (
              <tr key={i.id} className="hover:bg-muted/30">
                <td className="p-3 font-medium">{i.nome}</td>
                <td className="p-3">{i.registro_ans || "—"}</td>
                <td className="p-3">{i.versao_tiss}</td>
                <td className="p-3">{i.codigo_prestador || "—"}</td>
                <td className="p-3"><input type="checkbox" checked={i.ativo} onChange={() => toggle(i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </div>
  );
}

function ProceduresTab() {
  const [list, setList] = useState<Proc[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ codigo: "", descricao: "", valor: 0 });
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("tiss_procedures").select("*").order("codigo");
    setList((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.codigo || !form.descricao) return toast.error("Código e descrição obrigatórios");
    const { error } = await supabase.from("tiss_procedures").insert({ codigo: form.codigo, descricao: form.descricao, valor: Number(form.valor) } as any);
    if (error) return toast.error(error.message);
    setForm({ codigo: "", descricao: "", valor: 0 }); toast.success("Procedimento cadastrado"); load();
  };
  const remove = async (id: string) => { await supabase.from("tiss_procedures").delete().eq("id", id); load(); };
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-3 md:col-span-1">
        <h3 className="font-semibold text-sm">Novo procedimento</h3>
        <input className={input} placeholder="Código (ex: 10101012)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        <input className={input} placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <input className={input} type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: +e.target.value })} />
        <button onClick={save} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center justify-center gap-2"><Plus className="h-4 w-4" />Adicionar</button>
      </div>
      <div className="md:col-span-2 bg-card border border-border rounded-xl">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> :
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/40 text-left">
            <th className="p-3 font-medium text-muted-foreground">Código</th>
            <th className="p-3 font-medium text-muted-foreground">Descrição</th>
            <th className="p-3 font-medium text-muted-foreground">Valor</th>
            <th className="p-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum procedimento</td></tr> :
            list.map(p => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="p-3 font-mono">{p.codigo}</td>
                <td className="p-3">{p.descricao}</td>
                <td className="p-3">R$ {Number(p.valor).toFixed(2)}</td>
                <td className="p-3 text-right"><button onClick={() => remove(p.id)} className="text-xs text-destructive hover:underline">Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </div>
  );
}

function GuidesTab() {
  const [list, setList] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [procedures, setProcedures] = useState<Proc[]>([]);
  const [clients, setClients] = useState<{id:string;nome:string}[]>([]);
  const [form, setForm] = useState<{ insurer_id: string; client_id: string; tipo: "consulta"|"sadt"; numero_guia: string; numero_carteira: string; data_atendimento: string; procedimento_id: string; quantidade: number; }>({ insurer_id: "", client_id: "", tipo: "consulta", numero_guia: "", numero_carteira: "", data_atendimento: new Date().toISOString().slice(0,10), procedimento_id: "", quantidade: 1 });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, i, p, c] = await Promise.all([
      supabase.from("tiss_guides").select("*, insurer:health_insurers(nome), client:clients(nome)").order("created_at", { ascending: false }).limit(200),
      supabase.from("health_insurers").select("*").eq("ativo", true),
      supabase.from("tiss_procedures").select("*").order("codigo"),
      supabase.from("clients").select("id, nome").order("nome").limit(500),
    ]);
    setList((g.data as any) || []); setInsurers((i.data as any) || []); setProcedures((p.data as any) || []); setClients((c.data as any) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.insurer_id || !form.client_id || !form.procedimento_id) return toast.error("Convênio, cliente e procedimento são obrigatórios");
    const proc = procedures.find(p => p.id === form.procedimento_id);
    if (!proc) return toast.error("Procedimento inválido");
    const valor = Number(proc.valor) * Number(form.quantidade || 1);
    const dados = {
      numero_carteira: form.numero_carteira,
      data_atendimento: form.data_atendimento,
      tipo_consulta: 1,
      procedimentos: [{ codigo: proc.codigo, descricao: proc.descricao, valor: proc.valor, quantidade: form.quantidade, tabela: "22" }],
    };
    const { error } = await supabase.from("tiss_guides").insert({
      insurer_id: form.insurer_id, client_id: form.client_id, tipo: form.tipo,
      numero_guia: form.numero_guia || null, dados, valor, status: "aberta",
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Guia criada");
    setForm({ ...form, numero_guia: "", numero_carteira: "", procedimento_id: "", quantidade: 1 });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("tiss_guides").update({ status } as any).eq("id", id);
    load();
  };

  const abertas = list.filter(g => g.status === "aberta");
  const selecionadasIds = Object.keys(selected).filter(k => selected[k]);
  const insurerFromSelection = (() => {
    const ids = new Set(abertas.filter(g => selected[g.id]).map(g => g.insurer_id));
    return ids.size === 1 ? Array.from(ids)[0] : null;
  })();

  const gerarLote = async () => {
    if (!insurerFromSelection) return toast.error("Selecione guias abertas de um mesmo convênio");
    if (selecionadasIds.length === 0) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-tiss-batch", { body: { insurer_id: insurerFromSelection, guide_ids: selecionadasIds } });
    setGenerating(false);
    if (error || data?.error) return toast.error(data?.error || error?.message || "Falha");
    toast.success(`Lote ${data.numero_lote} gerado com ${data.total_guias} guias`);
    setSelected({}); load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Convênio</label>
          <select className={input} value={form.insurer_id} onChange={(e) => setForm({ ...form, insurer_id: e.target.value })}>
            <option value="">Selecione…</option>
            {insurers.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Cliente</label>
          <select className={input} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">Selecione…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select className={input} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}>
            <option value="consulta">Consulta</option>
            <option value="sadt">SADT</option>
          </select>
        </div>
        <input className={input} placeholder="Nº da guia (opcional)" value={form.numero_guia} onChange={(e) => setForm({ ...form, numero_guia: e.target.value })} />
        <input className={input} placeholder="Carteira do beneficiário" value={form.numero_carteira} onChange={(e) => setForm({ ...form, numero_carteira: e.target.value })} />
        <input className={input} type="date" value={form.data_atendimento} onChange={(e) => setForm({ ...form, data_atendimento: e.target.value })} />
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Procedimento</label>
          <select className={input} value={form.procedimento_id} onChange={(e) => setForm({ ...form, procedimento_id: e.target.value })}>
            <option value="">Selecione…</option>
            {procedures.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao} (R$ {Number(p.valor).toFixed(2)})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Quantidade</label>
          <input className={input} type="number" min={1} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: +e.target.value })} />
        </div>
        <div className="md:col-span-3">
          <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2"><Plus className="h-4 w-4" />Criar guia</button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-sm">Guias</h2>
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button>
            <button onClick={gerarLote} disabled={generating || selecionadasIds.length === 0} className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
              {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Gerar lote ({selecionadasIds.length})
            </button>
          </div>
        </div>
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> :
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/40 text-left">
            <th className="p-3 w-8"></th>
            <th className="p-3 font-medium text-muted-foreground">Convênio</th>
            <th className="p-3 font-medium text-muted-foreground">Cliente</th>
            <th className="p-3 font-medium text-muted-foreground">Tipo</th>
            <th className="p-3 font-medium text-muted-foreground">Nº Guia</th>
            <th className="p-3 font-medium text-muted-foreground">Valor</th>
            <th className="p-3 font-medium text-muted-foreground">Status</th>
            <th className="p-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhuma guia</td></tr> :
            list.map(g => (
              <tr key={g.id} className="hover:bg-muted/30">
                <td className="p-3"><input type="checkbox" disabled={g.status !== "aberta"} checked={!!selected[g.id]} onChange={(e) => setSelected({ ...selected, [g.id]: e.target.checked })} /></td>
                <td className="p-3">{g.insurer?.nome || "—"}</td>
                <td className="p-3">{g.client?.nome || "—"}</td>
                <td className="p-3 capitalize">{g.tipo}</td>
                <td className="p-3 font-mono text-xs">{g.numero_guia || g.id.slice(0,8)}</td>
                <td className="p-3">R$ {Number(g.valor).toFixed(2)}</td>
                <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{g.status}</span></td>
                <td className="p-3 text-right">
                  {g.status !== "aberta" && (
                    <select className="text-xs border border-border rounded px-1 py-0.5 bg-background" value={g.status} onChange={(e) => updateStatus(g.id, e.target.value)}>
                      <option value="no_lote">no_lote</option>
                      <option value="enviada">enviada</option>
                      <option value="paga">paga</option>
                      <option value="glosada">glosada</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </div>
  );
}

function BatchesTab() {
  const [list, setList] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("tiss_batches").select("*, insurer:health_insurers(nome)").order("created_at", { ascending: false });
    setList((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const download = (b: Batch) => {
    if (!b.xml) return toast.error("XML vazio");
    const blob = new Blob([b.xml], { type: "application/xml;charset=iso-8859-1" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lote-tiss-${b.numero_lote}.xml`;
    a.click(); URL.revokeObjectURL(url);
  };
  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "enviado") patch.enviado_em = new Date().toISOString();
    await supabase.from("tiss_batches").update(patch).eq("id", id);
    load();
  };
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold text-sm">Lotes</h2>
        <button onClick={load} className="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button>
      </div>
      {loading ? <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> :
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border bg-muted/40 text-left">
          <th className="p-3 font-medium text-muted-foreground">Nº Lote</th>
          <th className="p-3 font-medium text-muted-foreground">Convênio</th>
          <th className="p-3 font-medium text-muted-foreground">Guias</th>
          <th className="p-3 font-medium text-muted-foreground">Valor</th>
          <th className="p-3 font-medium text-muted-foreground">Status</th>
          <th className="p-3 font-medium text-muted-foreground">Criado</th>
          <th className="p-3"></th>
        </tr></thead>
        <tbody className="divide-y divide-border">
          {list.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum lote</td></tr> :
          list.map(b => (
            <tr key={b.id} className="hover:bg-muted/30">
              <td className="p-3 font-mono">{b.numero_lote}</td>
              <td className="p-3">{b.insurer?.nome || "—"}</td>
              <td className="p-3">{b.total_guias}</td>
              <td className="p-3">R$ {Number(b.valor_total).toFixed(2)}</td>
              <td className="p-3">
                <select className="text-xs border border-border rounded px-1 py-0.5 bg-background" value={b.status} onChange={(e) => setStatus(b.id, e.target.value)}>
                  <option value="gerado">gerado</option>
                  <option value="enviado">enviado</option>
                  <option value="retornado">retornado</option>
                  <option value="cancelado">cancelado</option>
                </select>
              </td>
              <td className="p-3">{new Date(b.created_at).toLocaleDateString("pt-BR")}</td>
              <td className="p-3 text-right">
                <button onClick={() => download(b)} className="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border hover:bg-muted"><Download className="h-3.5 w-3.5" />XML</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>}
    </div>
  );
}