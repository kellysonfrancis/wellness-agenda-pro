import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/contexts/AuthContext";
import { UserCog, Plus, Loader2, Shield, Headset, Stethoscope, User, X } from "lucide-react";

interface UserWithRoles {
  user_id: string;
  nome: string;
  email: string | null;
  roles: AppRole[];
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: allRoles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const mapped: UserWithRoles[] = profiles.map((p: any) => ({
        user_id: p.user_id,
        nome: p.nome,
        email: p.email,
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setCreating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

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
              <input
                id="new-nome"
                type="text"
                required
                maxLength={100}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="new-email">E-mail</label>
              <input
                id="new-email"
                type="email"
                required
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="new-password">Senha</label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                maxLength={72}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="new-role">Papel</label>
              <select
                id="new-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                {ROLE_OPTIONS.map(({ role, label }) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum usuário cadastrado ainda.</p>
          <p className="text-muted-foreground text-xs mt-1">Clique em "Novo Usuário" para cadastrar.</p>
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
                              has
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title={has ? `Remover ${role}` : `Adicionar ${role}`}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
