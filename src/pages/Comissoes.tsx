import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { DollarSign, Plus, Check, Pencil, TrendingUp, Users, Receipt } from "lucide-react";

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };

export default function Comissoes() {
  const { isRole } = useAuth();
  const isAdmin = isRole("admin");
  const qc = useQueryClient();
  const [showNewSale, setShowNewSale] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateValue, setRateValue] = useState("");

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

  const totalPending = sales.filter((s) => !s.pago).reduce((sum, s) => sum + Number(s.valor_comissao), 0);
  const totalPaid = sales.filter((s) => s.pago).reduce((sum, s) => sum + Number(s.valor_comissao), 0);
  const totalSales = sales.reduce((sum, s) => sum + Number(s.valor_venda), 0);

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
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhuma venda registrada ainda
                </TableCell>
              </TableRow>
            ) : (
              sales.map((s) => (
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
