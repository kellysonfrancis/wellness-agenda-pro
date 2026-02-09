import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockAppointments, getClientName, getServiceName, getProfessionalName } from "@/data/mockData";
import { Calendar, Filter } from "lucide-react";
import { useState } from "react";
import type { AppointmentStatus, Categoria } from "@/types/clinic";

const statusColors: Record<AppointmentStatus, string> = {
  reservado: "bg-warning/10 text-warning",
  confirmado: "bg-success/10 text-success",
  em_atendimento: "bg-info/10 text-info",
  concluido: "bg-muted text-muted-foreground",
  faltou: "bg-destructive/10 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

export default function Agenda() {
  const [filterCat, setFilterCat] = useState<Categoria | "">("");
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "">("");

  const filtered = mockAppointments.filter((a) => {
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" /> Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">Visualize e gerencie agendamentos</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          + Novo Agendamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AppointmentStatus | "")}
          className="text-sm rounded-lg border border-input bg-card px-3 py-2 text-foreground"
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="reservado">Reservado</option>
          <option value="confirmado">Confirmado</option>
          <option value="em_atendimento">Em Atendimento</option>
          <option value="concluido">Concluído</option>
          <option value="faltou">Faltou</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left p-4 font-medium text-muted-foreground">Data/Hora</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Serviço</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Profissional</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Cobrança</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum agendamento encontrado.</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 whitespace-nowrap">
                  <p className="font-medium">{new Date(a.inicioEm).toLocaleDateString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.inicioEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {new Date(a.fimEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                </td>
                <td className="p-4">{getClientName(a.clientId)}</td>
                <td className="p-4 hidden sm:table-cell">{getServiceName(a.serviceId)}</td>
                <td className="p-4 hidden md:table-cell">{getProfessionalName(a.profissionalId)}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[a.status]}`}>{a.status}</span>
                </td>
                <td className="p-4 hidden lg:table-cell">
                  <span className={`text-xs ${a.entitlementId ? "text-primary" : "text-muted-foreground"}`}>
                    {a.entitlementId ? "Pacote" : "Avulso"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlobalLayout>
  );
}
