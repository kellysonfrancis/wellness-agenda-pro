import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

export default function NfseButton({ paymentId, onIssued }: { paymentId: string; onIssued?: () => void }) {
  const [loading, setLoading] = useState(false);
  const issue = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("issue-nfse", { body: { payment_id: paymentId } });
    setLoading(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Falha ao emitir NFS-e"); return; }
    toast.success(data?.message || "NFS-e enviada para processamento");
    onIssued?.();
  };
  return (
    <button onClick={issue} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted inline-flex items-center gap-1.5 disabled:opacity-50">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
      NFS-e
    </button>
  );
}