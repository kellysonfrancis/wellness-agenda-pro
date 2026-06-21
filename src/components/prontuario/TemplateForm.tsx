import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  opcoes?: string[];
};

interface Props {
  campos: TemplateField[];
  values: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}

export default function TemplateForm({ campos, values, onChange }: Props) {
  const set = (k: string, v: any) => onChange({ ...values, [k]: v });

  return (
    <div className="space-y-3">
      {campos.map((c) => (
        <div key={c.key}>
          <Label className="text-xs">{c.label}</Label>
          {c.type === "textarea" && (
            <Textarea
              value={values[c.key] ?? ""}
              onChange={(e) => set(c.key, e.target.value)}
              rows={3}
              className="mt-1"
            />
          )}
          {c.type === "text" && (
            <Input
              value={values[c.key] ?? ""}
              onChange={(e) => set(c.key, e.target.value)}
              className="mt-1"
            />
          )}
          {c.type === "number" && (
            <Input
              type="number"
              value={values[c.key] ?? ""}
              onChange={(e) => set(c.key, e.target.value)}
              className="mt-1"
            />
          )}
          {c.type === "select" && (
            <Select value={values[c.key] ?? ""} onValueChange={(v) => set(c.key, v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(c.opcoes || []).map((op) => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  );
}