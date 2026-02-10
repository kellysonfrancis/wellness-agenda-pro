import GlobalLayout from "@/components/layout/GlobalLayout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Search, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "enviado", label: "Enviado" },
  { value: "confirmado_cliente", label: "Confirmado" },
  { value: "cancelado_cliente", label: "Cancelado" },
  { value: "erro", label: "Erro" },
];

const TIPO_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "lembrete", label: "Lembrete" },
  { value: "confirmacao", label: "Confirmação" },
  { value: "recibo", label: "Recibo" },
];

function statusBadge(status: string) {
  switch (status) {
    case "enviado":
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Enviado</Badge>;
    case "confirmado_cliente":
      return <Badge className="gap-1 bg-success text-success-foreground"><CheckCircle className="h-3 w-3" />Confirmado</Badge>;
    case "cancelado_cliente":
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelado</Badge>;
    case "erro":
      return <Badge variant="outline" className="gap-1 text-destructive border-destructive"><AlertTriangle className="h-3 w-3" />Erro</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function tipoLabel(tipo: string) {
  switch (tipo) {
    case "lembrete": return "Lembrete";
    case "confirmacao": return "Confirmação";
    case "recibo": return "Recibo";
    default: return tipo;
  }
}

export default function WhatsAppHistorico() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["whatsapp-log", filterStatus, filterTipo, filterDate],
    queryFn: async () => {
      let q = supabase
        .from("whatsapp_log")
        .select("*, appointments(client_id, clients(nome))")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      if (filterTipo !== "all") q = q.eq("tipo", filterTipo);
      if (filterDate) {
        q = q.gte("created_at", `${filterDate}T00:00:00`).lte("created_at", `${filterDate}T23:59:59`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const filtered = search
    ? logs.filter((l: any) =>
        l.destinatario?.includes(search) ||
        (l.appointments?.clients?.nome ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const stats = {
    total: logs.length,
    enviado: logs.filter((l: any) => l.status === "enviado").length,
    confirmado: logs.filter((l: any) => l.status === "confirmado_cliente").length,
    erro: logs.filter((l: any) => l.status === "erro").length,
  };

  return (
    <GlobalLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Histórico WhatsApp</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-warning">{stats.enviado}</p><p className="text-xs text-muted-foreground">Aguardando</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-success">{stats.confirmado}</p><p className="text-xs text-muted-foreground">Confirmados</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{stats.erro}</p><p className="text-xs text-muted-foreground">Erros</p></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por telefone ou nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-[170px]" />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Nenhuma mensagem encontrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoLabel(log.tipo)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.destinatario}</TableCell>
                      <TableCell className="text-sm">{log.appointments?.clients?.nome ?? "—"}</TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={log.erro ?? ""}>
                        {log.erro ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </GlobalLayout>
  );
}
