import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ShoppingCart, Check, UserPlus } from "lucide-react";
import QuickClientModal from "@/components/venda/QuickClientModal";

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };

export default function VendaRapida() {
  const { user, profile, roles, isRole } = useAuth();
  const qc = useQueryClient();

  // Determine current user's seller info
  const isAdmin = isRole("admin");

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-list"],
    queryFn: async () => {
      const { data } = await supabase.from("professionals").select("id, nome_exibicao, user_id").eq("ativo", true).order("nome_exibicao");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: profilesList = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome");
      return data ?? [];
    },
    staleTime: 300_000,
    enabled: isAdmin,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, nome").order("nome");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ["commission-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_rates").select("*");
      return data ?? [];
    },
  });

  const { data: mySales = [] } = useQuery({
    queryKey: ["my-sales", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  // Auto-detect seller
  const myProfessional = professionals.find((p) => p.user_id === user?.id);
  const defaultSellerId = myProfessional?.id || user?.id || "";
  const defaultSellerType: "profissional" | "recepcao" = myProfessional ? "profissional" : "recepcao";

  const [sellerId, setSellerId] = useState("");
  const [sellerType, setSellerType] = useState<"profissional" | "recepcao">(defaultSellerType);
  const [clientId, setClientId] = useState("");
  const [categoria, setCategoria] = useState("pilates");
  const [valorVenda, setValorVenda] = useState("");
  const [showQuickClient, setShowQuickClient] = useState(false);

  // Set default seller on load
  useEffect(() => {
    if (defaultSellerId && !sellerId) {
      setSellerId(defaultSellerId);
      setSellerType(defaultSellerType);
    }
  }, [defaultSellerId, defaultSellerType, sellerId]);

  const currentRate = rates.find((r) => r.categoria === categoria);
  const perc = currentRate ? Number(currentRate.percentual) : 0;
  const comissaoPreview = valorVenda ? (Number(valorVenda) * perc) / 100 : 0;

  const createSale = useMutation({
    mutationFn: async () => {
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
      qc.invalidateQueries({ queryKey: ["my-sales"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      setClientId("");
      setValorVenda("");
      toast({ title: "✅ Venda registrada!", description: `Comissão: R$ ${comissaoPreview.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` });
    },
    onError: (e: any) => toast({ title: "Erro ao registrar", description: e.message, variant: "destructive" }),
  });

  const getSellerName = (id: string) => {
    const prof = professionals.find((p) => p.id === id);
    if (prof) return prof.nome_exibicao;
    const pr = profilesList.find((p) => p.user_id === id);
    if (pr) return pr.nome;
    if (id === user?.id) return profile?.nome || "Eu";
    return id.slice(0, 8);
  };

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.nome || id.slice(0, 8);

  // Seller options for admin
  const allSellers = useMemo(() => {
    const list: { id: string; name: string; type: "profissional" | "recepcao" }[] = [];
    professionals.forEach((p) => list.push({ id: p.id, name: p.nome_exibicao, type: "profissional" }));
    profilesList.forEach((p) => {
      if (!professionals.some((pr) => pr.user_id === p.user_id)) {
        list.push({ id: p.user_id, name: p.nome, type: "recepcao" });
      }
    });
    return list;
  }, [professionals, profilesList]);

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" /> Venda Rápida
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Registre vendas de pacotes e planos</p>
      </div>

      {/* Quick sale form */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Seller */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Vendedor</label>
            {isAdmin ? (
              <Select value={sellerId} onValueChange={(v) => {
                setSellerId(v);
                const found = allSellers.find((s) => s.id === v);
                if (found) setSellerType(found.type);
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {allSellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} <span className="text-muted-foreground text-xs ml-1">({s.type === "profissional" ? "Prof." : "Recep."})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={profile?.nome || ""} disabled className="bg-muted" />
            )}
          </div>

          {/* Client */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Cliente</label>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setShowQuickClient(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Novo
              </Button>
            </div>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Categoria</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pilates">Pilates</SelectItem>
                <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                <SelectItem value="estetica">Estética</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Valor da Venda (R$)</label>
            <Input
              type="number"
              value={valorVenda}
              onChange={(e) => setValorVenda(e.target.value)}
              placeholder="0,00"
            />
          </div>

          {/* Commission preview */}
          <div className="flex flex-col justify-end">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Comissão ({perc}%)</p>
              <p className="text-xl font-bold text-primary">
                R$ {comissaoPreview.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <Button
              className="w-full h-[52px] text-base"
              disabled={!sellerId || !clientId || !valorVenda || Number(valorVenda) <= 0}
              onClick={() => createSale.mutate()}
            >
              <ShoppingCart className="h-5 w-5 mr-2" /> Registrar Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Recent sales */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold">Últimas Vendas</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mySales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma venda registrada ainda
                </TableCell>
              </TableRow>
            ) : (
              mySales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{getSellerName(s.seller_id)}</TableCell>
                  <TableCell>{getClientName(s.client_id)}</TableCell>
                  <TableCell>{catLabel[s.categoria] || s.categoria}</TableCell>
                  <TableCell className="text-right">R$ {Number(s.valor_venda).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    R$ {Number(s.valor_comissao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    <span className="text-xs text-muted-foreground ml-1">({s.percentual_comissao}%)</span>
                  </TableCell>
                  <TableCell>
                    {s.pago ? (
                      <Badge className="bg-success/10 text-success border-success/20"><Check className="h-3 w-3 mr-1" />Pago</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Pendente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <QuickClientModal open={showQuickClient} onOpenChange={setShowQuickClient} onCreated={(id) => setClientId(id)} />
    </GlobalLayout>
  );
}
