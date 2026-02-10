import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (clientId: string) => void;
}

export default function QuickClientModal({ open, onOpenChange, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!nome.trim() || !telefone.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({ nome: nome.trim(), telefone: telefone.trim(), email: email.trim() || null })
      .select("id")
      .single();
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "✅ Cliente cadastrado!" });
    qc.invalidateQueries({ queryKey: ["clients-list"] });
    onCreated?.(data.id);
    setNome("");
    setTelefone("");
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <Label>Telefone *</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <Button className="w-full" disabled={!nome.trim() || !telefone.trim() || loading} onClick={handleSubmit}>
            {loading ? "Salvando..." : "Cadastrar Cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
