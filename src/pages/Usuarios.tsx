import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/contexts/AuthContext";
import { UserCog, Plus, Loader2, Shield, Headset, Stethoscope, User, X, KeyRound, Eye, EyeOff, Pencil, Trash2, Save, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserWithRoles {
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  roles: AppRole[];
  ve_todas_vendas: boolean;
}

const ROLE_OPTIONS: { role: AppRole; label: string; icon: React.ElementType }[] = [
  { role: "admin", label: "Administrador", icon: Shield },
  { role: "recepcao", label: "Recepção", icon: Headset },
  { role: "profissional", label: "Profissional", icon: Stethoscope },
  { role: "cliente", label: "Cliente", icon: User },
];

export default function Usuarios() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", password: "", role: "cliente" as AppRole });
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Edit profile state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", email: "", telefone: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: allRoles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const mapped: UserWithRoles[] = profiles.map((p: any) => ({
        user_id: p.user_id,
        nome: p.nome,
        email: p.email,
        telefone: p.telefone,
        ve_todas_vendas: p.ve_todas_vendas ?? false,
        roles: (allRoles ?? [])
          .filter((r: any) => r.user_id === p.user_id)
          .map((r: any) => r.role as AppRole),
      }));
      setUsers(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleRole = async (userId: string, role: AppRole, hasRole: boolean) => {
    if (hasRole) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    fetchUsers();
  };

  const toggleVeTodasVendas = async (userId: string, current: boolean) => {
    await supabase.from("profiles").update({ ve_todas_vendas: !current } as any).eq("user_id", userId);
    fetchUsers();
  };

  const openEditProfile = (u: UserWithRoles) => {
    setEditingUserId(u.user_id);
    setEditForm({ nome: u.nome || "", email: u.email || "", telefone: u.telefone || "" });
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setEditSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: editForm.nome.trim(), email: editForm.email.trim() || null, telefone: editForm.telefone.trim() || null } as any)
      .eq("user_id", editingUserId);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      setEditingUserId(null);
      fetchUsers();
    }
    setEditSaving(false);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true);
    setDeleteError(null);

    // Check for dependencies: professionals linked, appointments, sales, payments
    const [profRes, salesRes] = await Promise.all([
      supabase.from("professionals").select("id").eq("user_id", userId).limit(1),
      supabase.from("sales").select("id").eq("seller_id", userId).limit(1),
    ]);

    const deps: string[] = [];
    if (profRes.data && profRes.data.length > 0) deps.push("profissional vinculado");
    if (salesRes.data && salesRes.data.length > 0) deps.push("vendas/comissões");

    if (deps.length > 0) {
      setDeleteError(`Não é possível excluir: possui ${deps.join(", ")}.`);
      setDeleting(false);
      return;
    }

    // Delete roles first, then profile
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) {
      setDeleteError(error.message);
    } else {
      toast({ title: "Usuário removido!" });
      setConfirmDeleteId(null);
      fetchUsers();
    }
    setDeleting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    setResetting(true);

    try {
      const res = await supabase.functions.invoke("reset-password", {
        body: { user_id: resetUserId, new_password: resetPassword },
      });

      if (res.error) {
        setResetError(res.error.message || "Erro ao resetar senha");
      } else if (res.data?.error) {
        setResetError(res.data.error);
      } else {
        setResetSuccess("Senha alterada com sucesso!");
        setResetPassword("");
        setTimeout(() => { setResetUserId(null); setResetSuccess(null); }, 2000);
      }
    } catch (err: any) {
      setResetError(err.message || "Erro inesperado");
    }
    setResetting(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setCreating(true);

    try {
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email.trim(),
          password: form.password,
          nome: form.nome.trim(),
          role: form.role,
        },
      });

      if (res.error) {
        setFormError(res.error.message || "Erro ao criar usuário");
      } else if (res.data?.error) {
        setFormError(res.data.error);
      } else {
        setFormSuccess(`Usuário ${form.nome} criado com sucesso!`);
        setForm({ nome: "", email: "", password: "", role: "cliente" });
        fetchUsers();
        setTimeout(() => {
          setShowForm(false);
          setFormSuccess(null);
        }, 2000);
      }
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado");
    }
    setCreating(false);
  };

  return (
    <GlobalLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> Usuários & Permissões
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os papéis de cada usuário do sistema</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(null); setFormSuccess(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Novo Usuário"}
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4">Criar Novo Usuário</h2>

          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
          {formSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-success/10 text-success text-sm">{formSuccess}</div>
          )}

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="new-nome">Nome</label>
              <input id="new-nome" type="text" required maxLength={100} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="new-email">E-mail</label>
              <input id="new-email" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="new-password">Senha</label>
              <input id="new-password" type="password" required minLength={6} maxLength={72} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="new-role">Papel</label>
              <select id="new-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                {ROLE_OPTIONS.map(({ role, label }) => <option key={role} value={role}>{label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : users.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum usuário cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
                  {ROLE_OPTIONS.map(({ role, label }) => (
                    <th key={role} className="text-center px-3 py-3 font-medium text-muted-foreground">{label}</th>
                  ))}
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Vê Tudo</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.nome || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                    {ROLE_OPTIONS.map(({ role, icon: Icon }) => {
                      const has = u.roles.includes(role);
                      return (
                        <td key={role} className="text-center px-3 py-3">
                          <button
                            onClick={() => toggleRole(u.user_id, role, has)}
                            className={`inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
                              has ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title={has ? `Remover ${role}` : `Adicionar ${role}`}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-3">
                      {(u.roles.includes("recepcao") || u.roles.includes("profissional")) && !u.roles.includes("admin") ? (
                        <button
                          onClick={() => toggleVeTodasVendas(u.user_id, u.ve_todas_vendas)}
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
                            u.ve_todas_vendas ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          title={u.ve_todas_vendas ? "Vê todas vendas/comissões" : "Vê apenas as próprias"}
                        >
                          {u.ve_todas_vendas ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditProfile(u)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                          title="Editar perfil"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setResetUserId(u.user_id); setResetPassword(""); setResetError(null); setResetSuccess(null); }}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                          title="Resetar senha"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        {confirmDeleteId === u.user_id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(u.user_id)}
                              disabled={deleting}
                              className="inline-flex items-center justify-center h-8 px-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                            >
                              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
                            </button>
                            <button onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }} className="text-xs text-muted-foreground hover:underline">×</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setConfirmDeleteId(u.user_id); setDeleteError(null); }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                            title="Excluir usuário"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {deleteError && confirmDeleteId === u.user_id && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {deleteError}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setEditingUserId(null)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Editar Perfil</h2>
              <button onClick={() => setEditingUserId(null)} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEditProfile} className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Nome</label>
                <input required value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">E-mail</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="(11) 99999-0000" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={editSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
                <button type="button" onClick={() => setEditingUserId(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setResetUserId(null)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold mb-1">Resetar Senha</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {users.find(u => u.user_id === resetUserId)?.nome || "Usuário"}
            </p>

            {resetError && <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{resetError}</div>}
            {resetSuccess && <div className="mb-3 p-3 rounded-lg bg-success/10 text-success text-sm">{resetSuccess}</div>}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="reset-pw">Nova senha</label>
                <input id="reset-pw" type="password" required minLength={6} maxLength={72} value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Mínimo 6 caracteres" autoFocus />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={resetting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Resetar
                </button>
                <button type="button" onClick={() => setResetUserId(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
