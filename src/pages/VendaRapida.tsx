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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import { ShoppingCart, Check, UserPlus, ChevronsUpDown } from "lucide-react";
import QuickClientModal from "@/components/venda/QuickClientModal";
import { cn } from "@/lib/utils";

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

  const { data: plans = [] } = useQuery({
    queryKey: ["product-plans-active"],
    queryFn: async () => {
      const { data } = await supabase.from("product_plans").select("id, nome, categoria, preco, tipo").eq("ativo", true).order("categoria, nome");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id, nome, categoria, preco_base").eq("ativo", true).order("categoria, nome");
      return data ?? [];
    },
    staleTime: 300_000,
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
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [metodo, setMetodo] = useState<"pix" | "cartao" | "dinheiro" | "transferencia" | "outro">("pix");
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [sellerOpen, setSellerOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  // Set default seller on load
  useEffect(() => {
    if (defaultSellerId && !sellerId) {
      setSellerId(defaultSellerId);
      setSellerType(defaultSellerType);
    }
  }, [defaultSellerId, defaultSellerType, sellerId]);

  const filteredPlans = useMemo(() => plans.filter((p) => p.categoria === categoria), [plans, categoria]);

  const selectedPlanRecord = useMemo(() => {
    if (!selectedPlanId?.startsWith("plan_")) return null;
    const id = selectedPlanId.replace("plan_", "");
    return plans.find((p) => p.id === id) || null;
  }, [selectedPlanId, plans]);
  const isRecurringPlan = selectedPlanRecord?.tipo === "mensal_recorrente";

  const createSubscription = useMutation({
    mutationFn: async (billing_type: "PIX" | "CREDIT_CARD" | "BOLETO") => {
      if (!selectedPlanRecord || !clientId) throw new Error("Selecione cliente e plano");
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: { client_id: clientId, plan_id: selectedPlanRecord.id, billing_type },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Erro");
      return data as { subscription_id: string; payment_url: string | null };
    },
    onSuccess: (data) => {
      toast({ title: "✅ Assinatura criada!", description: data.payment_url ? "Abrindo link de pagamento…" : "Assinatura registrada." });
      if (data.payment_url) window.open(data.payment_url, "_blank");
    },
    onError: (e: any) => toast({ title: "Erro na assinatura", description: e.message, variant: "destructive" }),
  });
  const filteredServices = useMemo(() => services.filter((s) => s.categoria === categoria), [services, categoria]);

  // Unified items for selection
  type SaleItem = { id: string; nome: string; preco: number; type: "plano" | "servico" };
  const allItems = useMemo<SaleItem[]>(() => [
    ...filteredPlans.map((p) => ({ id: `plan_${p.id}`, nome: p.nome, preco: Number(p.preco), type: "plano" as const })),
    ...filteredServices.map((s) => ({ id: `svc_${s.id}`, nome: s.nome, preco: Number(s.preco_base), type: "servico" as const })),
  ], [filteredPlans, filteredServices]);

  const selectedItem = allItems.find((i) => i.id === selectedPlanId);
  const currentRate = rates.find((r) => r.categoria === categoria);
  const perc = currentRate ? Number(currentRate.percentual) : 0;
  const comissaoPreview = valorVenda ? (Number(valorVenda) * perc) / 100 : 0;

  const createSale = useMutation({
    mutationFn: async () => {
      const valor = Number(valorVenda);
      const comissao = (valor * perc) / 100;

      // 1. Create payment record (pending)
      const { data: paymentData, error: paymentError } = await supabase.from("payments").insert({
        client_id: clientId,
        valor_total: valor,
        valor_pago: 0,
        status: "pendente" as any,
        metodo: metodo as any,
      }).select("id").single();
      if (paymentError) throw paymentError;

      // 2. Create sale record linked to payment
      const { error } = await supabase.from("sales").insert({
        seller_id: sellerId,
        seller_type: sellerType,
        client_id: clientId,
        categoria,
        valor_venda: valor,
        percentual_comissao: perc,
        valor_comissao: comissao,
        payment_id: paymentData.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-sales"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
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
              <Popover open={sellerOpen} onOpenChange={setSellerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={sellerOpen} className="w-full justify-between font-normal">
                    {sellerId ? allSellers.find((s) => s.id === sellerId)?.name ?? "Selecione" : "Selecione"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar vendedor..." />
                    <CommandList>
                      <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
                      <CommandGroup>
                        {allSellers.map((s) => (
                          <CommandItem key={s.id} value={s.name} onSelect={() => { setSellerId(s.id); setSellerType(s.type); setSellerOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", sellerId === s.id ? "opacity-100" : "opacity-0")} />
                            {s.name} <span className="text-muted-foreground text-xs ml-1">({s.type === "profissional" ? "Prof." : "Recep."})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={clientOpen} className="w-full justify-between font-normal">
                  {clientId ? clients.find((c) => c.id === clientId)?.nome : "Selecione o cliente"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem key={c.id} value={c.nome} onSelect={() => { setClientId(c.id); setClientOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Categoria</label>
            <Select value={categoria} onValueChange={(v) => { setCategoria(v); setSelectedPlanId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pilates">Pilates</SelectItem>
                <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                <SelectItem value="estetica">Estética</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plan/Package/Service */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Plano / Serviço</label>
            <Popover open={planOpen} onOpenChange={setPlanOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={planOpen} className="w-full justify-between font-normal">
                  {selectedItem ? selectedItem.nome : "Selecione"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar plano ou serviço..." />
                  <CommandList>
                    <CommandEmpty>Nenhum item nesta categoria.</CommandEmpty>
                    {filteredPlans.length > 0 && (
                      <CommandGroup heading="📦 Planos / Pacotes">
                        {filteredPlans.map((p) => (
                          <CommandItem key={`plan_${p.id}`} value={`${p.nome} plano`} onSelect={() => { setSelectedPlanId(`plan_${p.id}`); setValorVenda(String(p.preco)); setPlanOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedPlanId === `plan_${p.id}` ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                            <span className="text-muted-foreground text-xs ml-auto">R$ {Number(p.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {filteredServices.length > 0 && (
                      <CommandGroup heading="⚡ Serviços">
                        {filteredServices.map((s) => (
                          <CommandItem key={`svc_${s.id}`} value={`${s.nome} servico`} onSelect={() => { setSelectedPlanId(`svc_${s.id}`); setValorVenda(String(s.preco_base)); setPlanOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedPlanId === `svc_${s.id}` ? "opacity-100" : "opacity-0")} />
                            {s.nome}
                            <span className="text-muted-foreground text-xs ml-auto">R$ {Number(s.preco_base).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

          {/* Payment method */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Método de Pagamento</label>
            <Select value={metodo} onValueChange={(v) => setMetodo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
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
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mySales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                  <TableCell>
                    {!s.pago && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={async () => {
                          const { error } = await supabase.from("sales").update({ pago: true, pago_em: new Date().toISOString() } as any).eq("id", s.id);
                          if (error) {
                            toast({ title: "Erro", description: error.message, variant: "destructive" });
                          } else {
                            toast({ title: "✅ Venda marcada como paga!" });
                            qc.invalidateQueries({ queryKey: ["my-sales"] });
                            qc.invalidateQueries({ queryKey: ["sales"] });
                          }
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" /> Dar Baixa
                      </Button>
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
