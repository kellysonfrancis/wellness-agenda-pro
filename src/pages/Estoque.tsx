import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Plus, ArrowDownUp, Trash2 } from "lucide-react";

interface Item { id: string; nome: string; unidade: string; quantidade: number; estoque_minimo: number; custo_unitario: number }
interface Service { id: string; nome: string }
interface Consumption { id: string; service_id: string; item_id: string; quantidade: number; services?: { nome: string }; inventory_items?: { nome: string; unidade: string } }
interface Movement { id: string; item_id: string; tipo: string; quantidade: number; motivo: string | null; created_at: string; inventory_items?: { nome: string } }

export default function Estoque() {
  const [items, setItems] = useState<Item[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [itemForm, setItemForm] = useState({ nome: "", unidade: "un", quantidade: 0, estoque_minimo: 0, custo_unitario: 0 });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [movForm, setMovForm] = useState({ item_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
  const [movOpen, setMovOpen] = useState(false);
  const [consForm, setConsForm] = useState({ service_id: "", item_id: "", quantidade: 1 });
  const [consOpen, setConsOpen] = useState(false);

  async function load() {
    const [i, s, c, m] = await Promise.all([
      supabase.from("inventory_items").select("*").order("nome"),
      supabase.from("services").select("id,nome").order("nome"),
      supabase.from("service_consumption").select("*, services(nome), inventory_items(nome, unidade)").order("created_at", { ascending: false }),
      supabase.from("inventory_movements").select("*, inventory_items(nome)").order("created_at", { ascending: false }).limit(200),
    ]);
    setItems((i.data as any) || []);
    setServices((s.data as any) || []);
    setConsumptions((c.data as any) || []);
    setMovements((m.data as any) || []);
  }

  useEffect(() => { load(); }, []);

  async function saveItem() {
    if (!itemForm.nome.trim()) return toast.error("Nome é obrigatório");
    const payload = { ...itemForm };
    const res = editingItem
      ? await supabase.from("inventory_items").update(payload).eq("id", editingItem)
      : await supabase.from("inventory_items").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Item salvo");
    setItemOpen(false); setEditingItem(null);
    setItemForm({ nome: "", unidade: "un", quantidade: 0, estoque_minimo: 0, custo_unitario: 0 });
    load();
  }

  function openEditItem(it: Item) {
    setEditingItem(it.id);
    setItemForm({ nome: it.nome, unidade: it.unidade, quantidade: Number(it.quantidade), estoque_minimo: Number(it.estoque_minimo), custo_unitario: Number(it.custo_unitario) });
    setItemOpen(true);
  }

  async function deleteItem(id: string) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  }

  async function saveMovement() {
    if (!movForm.item_id || !movForm.quantidade) return toast.error("Preencha item e quantidade");
    const { error } = await supabase.from("inventory_movements").insert(movForm);
    if (error) return toast.error(error.message);
    // adjust stock
    const item = items.find((i) => i.id === movForm.item_id);
    if (item) {
      const delta = movForm.tipo === "entrada" ? Number(movForm.quantidade)
        : movForm.tipo === "saida" ? -Number(movForm.quantidade)
        : Number(movForm.quantidade) - Number(item.quantidade);
      await supabase.from("inventory_items").update({ quantidade: Number(item.quantidade) + delta }).eq("id", item.id);
    }
    toast.success("Movimentação registrada");
    setMovOpen(false);
    setMovForm({ item_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
    load();
  }

  async function saveConsumption() {
    if (!consForm.service_id || !consForm.item_id) return toast.error("Selecione serviço e item");
    const { error } = await supabase.from("service_consumption").insert(consForm);
    if (error) return toast.error(error.message);
    toast.success("Consumo cadastrado");
    setConsOpen(false);
    setConsForm({ service_id: "", item_id: "", quantidade: 1 });
    load();
  }

  async function deleteConsumption(id: string) {
    const { error } = await supabase.from("service_consumption").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const lowStock = items.filter((i) => Number(i.quantidade) <= Number(i.estoque_minimo));

  return (
    <GlobalLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Estoque</h1>
        </div>

        {lowStock.length > 0 && (
          <Card className="p-4 border-destructive/50 bg-destructive/5">
            <div className="flex items-center gap-2 text-destructive font-medium mb-2">
              <AlertTriangle className="w-4 h-4" /> {lowStock.length} item(s) abaixo do estoque mínimo
            </div>
            <div className="text-sm space-y-1">
              {lowStock.map((i) => (
                <div key={i.id}>• {i.nome}: {Number(i.quantidade)} {i.unidade} (mín. {Number(i.estoque_minimo)})</div>
              ))}
            </div>
          </Card>
        )}

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="consumption">Consumo por serviço</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <div className="flex gap-2">
              <Dialog open={itemOpen} onOpenChange={(o) => { setItemOpen(o); if (!o) { setEditingItem(null); setItemForm({ nome:"",unidade:"un",quantidade:0,estoque_minimo:0,custo_unitario:0 }); } }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-1" /> Novo item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingItem ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nome</Label><Input value={itemForm.nome} onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Unidade</Label><Input value={itemForm.unidade} onChange={(e) => setItemForm({ ...itemForm, unidade: e.target.value })} /></div>
                      <div><Label>Quantidade</Label><Input type="number" value={itemForm.quantidade} onChange={(e) => setItemForm({ ...itemForm, quantidade: Number(e.target.value) })} /></div>
                      <div><Label>Estoque mínimo</Label><Input type="number" value={itemForm.estoque_minimo} onChange={(e) => setItemForm({ ...itemForm, estoque_minimo: Number(e.target.value) })} /></div>
                      <div><Label>Custo unitário</Label><Input type="number" step="0.01" value={itemForm.custo_unitario} onChange={(e) => setItemForm({ ...itemForm, custo_unitario: Number(e.target.value) })} /></div>
                    </div>
                    <Button onClick={saveItem} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={movOpen} onOpenChange={setMovOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><ArrowDownUp className="w-4 h-4 mr-1" /> Movimentação</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova movimentação</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Item</Label>
                      <Select value={movForm.item_id} onValueChange={(v) => setMovForm({ ...movForm, item_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tipo</Label>
                      <Select value={movForm.tipo} onValueChange={(v) => setMovForm({ ...movForm, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                          <SelectItem value="ajuste">Ajuste (define quantidade final)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Quantidade</Label><Input type="number" value={movForm.quantidade} onChange={(e) => setMovForm({ ...movForm, quantidade: Number(e.target.value) })} /></div>
                    <div><Label>Motivo</Label><Input value={movForm.motivo} onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })} /></div>
                    <Button onClick={saveMovement} className="w-full">Registrar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="divide-y">
              {items.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum item cadastrado.</div>}
              {items.map((i) => {
                const low = Number(i.quantidade) <= Number(i.estoque_minimo);
                return (
                  <div key={i.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {i.nome}
                        {low && <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> baixo</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Number(i.quantidade)} {i.unidade} • mín. {Number(i.estoque_minimo)} • R$ {Number(i.custo_unitario).toFixed(2)}/un
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openEditItem(i)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteItem(i.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                );
              })}
            </Card>
          </TabsContent>

          <TabsContent value="consumption" className="space-y-4">
            <Dialog open={consOpen} onOpenChange={setConsOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Novo consumo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Consumo por serviço</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Serviço</Label>
                    <Select value={consForm.service_id} onValueChange={(v) => setConsForm({ ...consForm, service_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Item</Label>
                    <Select value={consForm.item_id} onValueChange={(v) => setConsForm({ ...consForm, item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantidade consumida</Label><Input type="number" step="0.01" value={consForm.quantidade} onChange={(e) => setConsForm({ ...consForm, quantidade: Number(e.target.value) })} /></div>
                  <Button onClick={saveConsumption} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Card className="divide-y">
              {consumptions.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum consumo cadastrado.</div>}
              {consumptions.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.services?.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.inventory_items?.nome} — {Number(c.quantidade)} {c.inventory_items?.unidade}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteConsumption(c.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card className="divide-y">
              {movements.length === 0 && <div className="p-4 text-sm text-muted-foreground">Sem movimentações.</div>}
              {movements.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.inventory_items?.nome}</div>
                    <div className="text-xs text-muted-foreground">{m.motivo || "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${m.tipo === "saida" ? "text-destructive" : m.tipo === "entrada" ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {m.tipo === "saida" ? "−" : m.tipo === "entrada" ? "+" : "="} {Number(m.quantidade)}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </GlobalLayout>
  );
}