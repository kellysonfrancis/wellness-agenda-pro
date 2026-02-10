import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { DollarSign, Plus, Check, Pencil, TrendingUp, Users, Receipt, Filter, X, FileDown, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--primary) / 0.6)", "hsl(var(--primary) / 0.3)"];

export default function Comissoes() {
  const { isRole } = useAuth();
  const isAdmin = isRole("admin");
  const qc = useQueryClient();
  const [showNewSale, setShowNewSale] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateValue, setRateValue] = useState("");

  // Filter state
  const [filterSellerId, setFilterSellerId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pago" | "pendente">("all");

  // Form state for new sale
  const [sellerId, setSellerId] = useState("");
  const [sellerType, setSellerType] = useState<"profissional" | "recepcao">("profissional");
  const [clientId, setClientId] = useState("");
  const [categoria, setCategoria] = useState("pilates");
  const [valorVenda, setValorVenda] = useState("");

  // Queries
  const { data: rates = [] } = useQuery({
    queryKey: ["commission-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_rates").select("*").order("categoria");
      return data ?? [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-list"],
    queryFn: async () => {
      const { data } = await supabase.from("professionals").select("id, nome_exibicao").eq("ativo", true).order("nome_exibicao");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-recepcao"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, nome").order("nome");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // Mutations
  const updateRate = useMutation({
    mutationFn: async ({ id, percentual }: { id: string; percentual: number }) => {
      const { error } = await supabase.from("commission_rates").update({ percentual }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-rates"] });
      setEditingRate(null);
      toast({ title: "Taxa atualizada" });
    },
  });

  const createSale = useMutation({
    mutationFn: async () => {
      const rate = rates.find((r) => r.categoria === categoria);
      const perc = rate ? Number(rate.percentual) : 0;
      const valor = Number(valorVenda);
      const comissao = (valor * perc) / 100;

      const { error } = await supabase.from("sales").insert({
        seller_id: sellerId,
        seller_type: sellerType,
        client_id: clientId,
        categoria,
        valor_venda: valor,
        percentual_comissao: perc,
        valor_comissao: comissao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      setShowNewSale(false);
      setSellerId(""); setClientId(""); setValorVenda("");
      toast({ title: "Venda registrada com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao registrar venda", description: e.message, variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").update({ pago: true, pago_em: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Comissão marcada como paga" });
    },
  });

  // Computed
  const sellerOptions = sellerType === "profissional"
    ? professionals.map((p) => ({ id: p.id, name: p.nome_exibicao }))
    : profiles.map((p) => ({ id: p.user_id, name: p.nome }));

  const getSellerName = (id: string) => {
    const prof = professionals.find((p) => p.id === id);
    if (prof) return prof.nome_exibicao;
    const profile = profiles.find((p) => p.user_id === id);
    return profile?.nome || id.slice(0, 8);
  };

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.nome || id.slice(0, 8);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (filterSellerId && s.seller_id !== filterSellerId) return false;
      if (filterStatus === "pago" && !s.pago) return false;
      if (filterStatus === "pendente" && s.pago) return false;
      if (filterDateFrom) {
        const saleDate = new Date(s.created_at).toISOString().slice(0, 10);
        if (saleDate < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const saleDate = new Date(s.created_at).toISOString().slice(0, 10);
        if (saleDate > filterDateTo) return false;
      }
      return true;
    });
  }, [sales, filterSellerId, filterDateFrom, filterDateTo, filterStatus]);

  const hasFilters = filterSellerId || filterDateFrom || filterDateTo || filterStatus !== "all";
  const clearFilters = () => { setFilterSellerId(""); setFilterDateFrom(""); setFilterDateTo(""); setFilterStatus("all"); };

  const totalPending = filteredSales.filter((s) => !s.pago).reduce((sum, s) => sum + Number(s.valor_comissao), 0);
  const totalPaid = filteredSales.filter((s) => s.pago).reduce((sum, s) => sum + Number(s.valor_comissao), 0);
  const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.valor_venda), 0);

  // All possible sellers for filter
  const allSellers = useMemo(() => {
    const map = new Map<string, string>();
    professionals.forEach((p) => map.set(p.id, p.nome_exibicao));
    profiles.forEach((p) => { if (!map.has(p.user_id)) map.set(p.user_id, p.nome); });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [professionals, profiles]);

  // Monthly chart data from filtered sales
  const monthlyData = useMemo(() => {
    const map = new Map<string, { vendas: number; comissoes: number; pagas: number }>();
    filteredSales.forEach((s) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = map.get(key) || { vendas: 0, comissoes: 0, pagas: 0 };
      cur.vendas += Number(s.valor_venda);
      cur.comissoes += Number(s.valor_comissao);
      if (s.pago) cur.pagas += Number(s.valor_comissao);
      map.set(key, cur);
    });
    return Array.from(map, ([mes, v]) => ({
      mes: new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      Vendas: v.vendas,
      Comissões: v.comissoes,
      Pagas: v.pagas,
    })).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filteredSales]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach((s) => {
      const label = catLabel[s.categoria] || s.categoria;
      map.set(label, (map.get(label) || 0) + Number(s.valor_comissao));
    });
    return Array.from(map, ([name, value]) => ({ name, value })).filter((d) => d.value > 0);
  }, [filteredSales]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const buildRows = () =>
    filteredSales.map((s) => ({
      data: new Date(s.created_at).toLocaleDateString("pt-BR"),
      vendedor: getSellerName(s.seller_id),
      tipo: s.seller_type === "profissional" ? "Profissional" : "Recepção",
      cliente: getClientName(s.client_id),
      categoria: catLabel[s.categoria] || s.categoria,
      valorVenda: Number(s.valor_venda),
      comissao: Number(s.valor_comissao),
      percentual: Number(s.percentual_comissao),
      status: s.pago ? "Pago" : "Pendente",
    }));

  const handleExportExcel = () => {
    const rows = buildRows();
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Data: r.data, Vendedor: r.vendedor, Tipo: r.tipo, Cliente: r.cliente,
      Categoria: r.categoria, "Valor Venda": r.valorVenda, "Comissão": r.comissao,
      "%": r.percentual, Status: r.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comissões");
    XLSX.writeFile(wb, `Comissoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Excel exportado!" });
  };

  const handleExportPDF = () => {
    const rows = buildRows();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Relatório de Comissões", 14, 15);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} • ${rows.length} registros • Total: R$ ${fmt(totalSales)} • Comissões: R$ ${fmt(totalPending + totalPaid)}`, 14, 21);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 26,
      head: [["Data", "Vendedor", "Tipo", "Cliente", "Categoria", "Valor Venda", "Comissão", "%", "Status"]],
      body: rows.map((r) => [r.data, r.vendedor, r.tipo, r.cliente, r.categoria, `R$ ${fmt(r.valorVenda)}`, `R$ ${fmt(r.comissao)}`, `${r.percentual}%`, r.status]),
      theme: "grid",
      headStyles: { fillColor: [30, 100, 80] },
      styles: { fontSize: 8 },
    });
    doc.save(`Comissoes_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: "PDF exportado!" });
  };

  return (
    <GlobalLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" /> Comissões
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vendas e comissões dos colaboradores</p>
        </div>
        {isAdmin && (
          <Dialog open={showNewSale} onOpenChange={setShowNewSale}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1.5" /> Registrar Venda</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Venda</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Tipo do Vendedor</label>
                  <Select value={sellerType} onValueChange={(v) => { setSellerType(v as any); setSellerId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="recepcao">Recepção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Vendedor</label>
                  <Select value={sellerId} onValueChange={setSellerId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {sellerOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Cliente</label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Categoria</label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pilates">Pilates</SelectItem>
                      <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                      <SelectItem value="estetica">Estética</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Valor da Venda (R$)</label>
                  <Input type="number" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" />
                  {valorVenda && rates.find((r) => r.categoria === categoria) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Comissão: {rates.find((r) => r.categoria === categoria)!.percentual}% = R$ {((Number(valorVenda) * Number(rates.find((r) => r.categoria === categoria)!.percentual)) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <Button className="w-full" disabled={!sellerId || !clientId || !valorVenda} onClick={() => createSale.mutate()}>
                  Registrar Venda
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Total em Vendas</p>
            <p className="text-2xl font-bold mt-0.5">R$ {totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600"><Receipt className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Comissões Pendentes</p>
            <p className="text-2xl font-bold mt-0.5">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-success/10 text-success"><Check className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Comissões Pagas</p>
            <p className="text-2xl font-bold mt-0.5">R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Charts side by side */}
      {(monthlyData.length > 0 || categoryData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {monthlyData.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" /> Comissões por Mês
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, undefined]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Legend />
                  <Bar dataKey="Vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Comissões" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pagas" fill="hsl(var(--success, 142 71% 45%))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryData.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <DollarSign className="h-4 w-4 text-primary" /> Comissões por Categoria
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Comissão"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          <div className="ml-auto flex items-center gap-2">
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3 w-3" /> Limpar
              </button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExportPDF}>
              <FileDown className="h-3 w-3 mr-1" /> PDF
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vendedor</label>
            <Select value={filterSellerId || "all"} onValueChange={(v) => setFilterSellerId(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {allSellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">De</label>
            <Input type="date" className="h-9" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Até</label>
            <Input type="date" className="h-9" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Commission Rates - admin only */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border shadow-sm mb-6">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Taxas de Comissão por Categoria
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rates.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{catLabel[r.categoria] || r.categoria}</p>
                    {editingRate === r.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          className="w-20 h-8"
                          value={rateValue}
                          onChange={(e) => setRateValue(e.target.value)}
                        />
                        <span className="text-sm">%</span>
                        <Button size="sm" variant="ghost" onClick={() => updateRate.mutate({ id: r.id, percentual: Number(rateValue) })}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-primary mt-1">{r.percentual}%</p>
                    )}
                  </div>
                  {editingRate !== r.id && (
                    <Button size="sm" variant="ghost" onClick={() => { setEditingRate(r.id); setRateValue(String(r.percentual)); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Vendas Registradas
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor Venda</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {hasFilters ? "Nenhuma venda encontrada com os filtros aplicados" : "Nenhuma venda registrada ainda"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{getSellerName(s.seller_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{s.seller_type === "profissional" ? "Profissional" : "Recepção"}</Badge>
                  </TableCell>
                  <TableCell>{getClientName(s.client_id)}</TableCell>
                  <TableCell>{catLabel[s.categoria] || s.categoria}</TableCell>
                  <TableCell className="text-right">R$ {Number(s.valor_venda).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {Number(s.valor_comissao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    <span className="text-xs text-muted-foreground ml-1">({s.percentual_comissao}%)</span>
                  </TableCell>
                  <TableCell>
                    {s.pago ? (
                      <Badge className="bg-success/10 text-success border-success/20">Pago</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!s.pago && isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => markPaid.mutate(s.id)} title="Marcar como pago">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </GlobalLayout>
  );
}
