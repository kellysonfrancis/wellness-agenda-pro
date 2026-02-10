import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PeriodFilter = "all" | "month" | "quarter" | "year";
export type CategoryFilter = "all" | "pilates" | "fisioterapia" | "estetica";

interface BIFiltersProps {
  period: PeriodFilter;
  category: CategoryFilter;
  professionalId: string;
  onPeriodChange: (v: PeriodFilter) => void;
  onCategoryChange: (v: CategoryFilter) => void;
  onProfessionalChange: (v: string) => void;
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "Todo o período" },
  { value: "month", label: "Último mês" },
  { value: "quarter", label: "Último trimestre" },
  { value: "year", label: "Último ano" },
];

const categoryOptions: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Todas as categorias" },
  { value: "pilates", label: "Pilates" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "estetica", label: "Estética" },
];

export default function BIFilters({ period, category, professionalId, onPeriodChange, onCategoryChange, onProfessionalChange }: BIFiltersProps) {
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-list"],
    queryFn: async () => {
      const { data } = await supabase.from("professionals").select("id, nome_exibicao").eq("ativo", true).order("nome_exibicao");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={(v) => onCategoryChange(v as CategoryFilter)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={professionalId} onValueChange={onProfessionalChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Profissional" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os profissionais</SelectItem>
          {professionals.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.nome_exibicao}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
