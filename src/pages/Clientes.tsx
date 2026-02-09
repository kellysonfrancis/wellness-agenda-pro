import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockClients, mockAppointments, mockEntitlements, mockPayments, getPlanName } from "@/data/mockData";
import { Users, Search, Plus, Phone, Mail } from "lucide-react";
import { useState } from "react";

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = mockClients.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search)
  );

  const selected = selectedId ? mockClients.find((c) => c.id === selectedId) : null;
  const clientAppts = selected ? mockAppointments.filter((a) => a.clientId === selected.id) : [];
  const clientEntitlements = selected ? mockEntitlements.filter((e) => e.clientId === selected.id) : [];
  const clientPayments = selected ? mockPayments.filter((p) => p.clientId === selected.id) : [];

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{mockClients.length} clientes cadastrados</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          aria-label="Buscar clientes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground text-center">Nenhum cliente encontrado.</p>
            ) : filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-4 hover:bg-muted/40 transition-colors ${selectedId === c.id ? "bg-accent/60" : ""}`}
              >
                <p className="text-sm font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{c.telefone}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center text-muted-foreground text-sm">
              Selecione um cliente para ver detalhes.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <h2 className="text-lg font-semibold mb-2">{selected.nome}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.telefone}</span>
                  {selected.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selected.email}</span>}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">Vender Pacote</button>
                  <button className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-accent">Agendar</button>
                </div>
              </div>

              {/* Tabs content */}
              <div className="bg-card rounded-xl border border-border shadow-sm">
                <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Atendimentos ({clientAppts.length})</h3></div>
                <div className="divide-y divide-border">
                  {clientAppts.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum atendimento.</p> :
                    clientAppts.slice(0, 5).map(a => (
                      <div key={a.id} className="p-3 text-sm flex justify-between">
                        <span>{new Date(a.inicioEm).toLocaleDateString("pt-BR")} — {a.status}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border shadow-sm">
                <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Pacotes ({clientEntitlements.length})</h3></div>
                <div className="divide-y divide-border">
                  {clientEntitlements.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum pacote.</p> :
                    clientEntitlements.map(e => (
                      <div key={e.id} className="p-3 text-sm flex justify-between">
                        <span>{getPlanName(e.productPlanId)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === "ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{e.status}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border shadow-sm">
                <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Pagamentos ({clientPayments.length})</h3></div>
                <div className="divide-y divide-border">
                  {clientPayments.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum pagamento.</p> :
                    clientPayments.map(p => (
                      <div key={p.id} className="p-3 text-sm flex justify-between">
                        <span>R$ {p.valorTotal.toLocaleString("pt-BR")} — {p.metodo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "pago" ? "bg-success/10 text-success" : p.status === "pendente" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
