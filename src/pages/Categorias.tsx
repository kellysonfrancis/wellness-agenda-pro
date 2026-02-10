import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tags, Plus, Loader2, X, Pencil, Trash2, Save } from "lucide-react";

interface Category {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
}

const emptyForm = { nome: "", slug: "", descricao: "", cor: "#6366f1" };

export default function Categorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("nome");
    if (data) setCategories(data as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const generateSlug = (nome: string) =>
    nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ nome: cat.nome, slug: cat.slug, descricao: cat.descricao || "", cor: cat.cor });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    const slug = form.slug.trim() || generateSlug(form.nome);
    const payload = {
      nome: form.nome.trim(),
      slug,
      descricao: form.descricao.trim() || null,
      cor: form.cor,
    };

    if (editingId) {
      const { error } = await supabase.from("categories").update(payload as any).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Categoria atualizada!" });
        setShowForm(false);
        fetchCategories();
      }
    } else {
      const { error } = await supabase.from("categories").insert(payload as any);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Categoria criada!" });
        setShowForm(false);
        setForm({ ...emptyForm });
        fetchCategories();
      }
    }
    setSaving(false);
  };

  const toggleAtivo = async (cat: Category) => {
    const { error } = await supabase.from("categories").update({ ativo: !cat.ativo } as any).eq("id", cat.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Categoria excluída!" });
      fetchCategories();
    }
  };

  return (
    <GlobalLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6 text-primary" /> Categorias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as categorias de serviços da clínica</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-card rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.cor }} />
                  <div>
                    <h3 className="text-sm font-semibold">{cat.nome}</h3>
                    <p className="text-xs text-muted-foreground">{cat.slug}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cat.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {cat.ativo ? "Ativa" : "Inativa"}
                </span>
              </div>
              {cat.descricao && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{cat.descricao}</p>}
              <div className="flex gap-2">
                <button onClick={() => openEdit(cat)} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-accent transition-colors">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button onClick={() => toggleAtivo(cat)} className="text-xs py-1.5 px-3 rounded-lg border border-input text-muted-foreground hover:bg-muted transition-colors">
                  {cat.ativo ? "Desativar" : "Ativar"}
                </button>
                <button onClick={() => handleDelete(cat.id)} className="text-xs py-1.5 px-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Categoria" : "Nova Categoria"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="cat-nome">Nome *</label>
                <input
                  id="cat-nome"
                  required
                  maxLength={50}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value, slug: editingId ? form.slug : generateSlug(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Ex: Pilates"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="cat-slug">Slug</label>
                <input
                  id="cat-slug"
                  maxLength={50}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="pilates"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="cat-desc">Descrição</label>
                <textarea
                  id="cat-desc"
                  rows={2}
                  maxLength={200}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                  placeholder="Descrição da categoria..."
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="cat-cor">Cor</label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    id="cat-cor"
                    type="color"
                    value={form.cor}
                    onChange={(e) => setForm({ ...form, cor: e.target.value })}
                    className="h-9 w-12 rounded-lg border border-input cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">{form.cor}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Salvar" : "Criar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
