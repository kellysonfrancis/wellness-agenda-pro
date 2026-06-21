import { useRef } from "react";
import { X } from "lucide-react";

export type BodyMark = { x: number; y: number; lado: "frente" | "costas"; nota: string };

interface Props {
  marks: BodyMark[];
  onChange: (marks: BodyMark[]) => void;
  readOnly?: boolean;
}

function Silhouette({ lado, marks, onAdd, onRemove, readOnly }: {
  lado: "frente" | "costas";
  marks: BodyMark[];
  onAdd: (x: number, y: number) => void;
  onRemove: (i: number) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const svg = ref.current!;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAdd(x, y);
  };

  return (
    <div className="flex-1 flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-1">{lado === "frente" ? "Frente" : "Costas"}</p>
      <svg
        ref={ref}
        viewBox="0 0 100 200"
        onClick={handleClick}
        className={`w-full max-w-[160px] border border-border rounded-lg bg-muted/30 ${readOnly ? "" : "cursor-crosshair"}`}
      >
        {/* Head */}
        <circle cx="50" cy="18" r="10" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
        {/* Torso */}
        <path d="M35 30 Q50 28 65 30 L70 70 Q70 95 65 110 L35 110 Q30 95 30 70 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
        {/* Arms */}
        <path d="M35 32 L20 50 L18 95 L26 96 L30 55 L36 40 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
        <path d="M65 32 L80 50 L82 95 L74 96 L70 55 L64 40 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
        {/* Legs */}
        <path d="M37 110 L33 180 L42 180 L46 110 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
        <path d="M63 110 L67 180 L58 180 L54 110 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />

        {marks.map((m, i) => {
          const globalIdx = i;
          return (
            <g key={globalIdx}>
              <circle cx={m.x} cy={m.y} r="2.2" fill="hsl(0 80% 55%)" stroke="white" strokeWidth="0.5">
                <title>{m.nota}</title>
              </circle>
              {!readOnly && (
                <circle
                  cx={m.x} cy={m.y} r="4" fill="transparent"
                  className="cursor-pointer"
                  onClick={(ev) => { ev.stopPropagation(); onRemove(globalIdx); }}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function BodyMap({ marks, onChange, readOnly }: Props) {
  const addFor = (lado: "frente" | "costas") => (x: number, y: number) => {
    const nota = window.prompt("Nota para essa marcação (ex.: dor, hematoma, ponto de tratamento):", "");
    if (nota === null) return;
    onChange([...marks, { x, y, lado, nota }]);
  };
  const removeAt = (i: number) => onChange(marks.filter((_, idx) => idx !== i));

  const frente = marks.map((m, i) => ({ ...m, i })).filter((m) => m.lado === "frente");
  const costas = marks.map((m, i) => ({ ...m, i })).filter((m) => m.lado === "costas");

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <Silhouette
          lado="frente"
          marks={frente}
          onAdd={addFor("frente")}
          onRemove={(localIdx) => removeAt(frente[localIdx].i)}
          readOnly={readOnly}
        />
        <Silhouette
          lado="costas"
          marks={costas}
          onAdd={addFor("costas")}
          onRemove={(localIdx) => removeAt(costas[localIdx].i)}
          readOnly={readOnly}
        />
      </div>
      {marks.length > 0 && (
        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
          {marks.map((m, i) => (
            <li key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/40">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="font-medium capitalize">{m.lado}</span>
              <span className="text-muted-foreground flex-1 truncate">{m.nota || "—"}</span>
              {!readOnly && (
                <button onClick={() => removeAt(i)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <p className="text-xs text-muted-foreground">Clique na silhueta para adicionar uma marcação.</p>
      )}
    </div>
  );
}