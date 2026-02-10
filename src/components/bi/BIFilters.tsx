import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PeriodFilter = "all" | "month" | "quarter" | "year";
export type CategoryFilter = "all" | "pilates" | "fisioterapia" | "estetica";

interface BIFiltersProps {
  period: PeriodFilter;
  category: CategoryFilter;
  onPeriodChange: (v: PeriodFilter) => void;
  onCategoryChange: (v: CategoryFilter) => void;
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

export default function BIFilters({ period, category, onPeriodChange, onCategoryChange }: BIFiltersProps) {
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
    </div>
  );
}
