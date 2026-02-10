import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/contexts/AuthContext";
import { UserCog, Plus, Loader2, Shield, Headset, Stethoscope, User, Trash2 } from "lucide-react";

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
  const [adding, setAdding] = useState(false);

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

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" /> Usuários & Permissões
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie os papéis de cada usuário do sistema</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum usuário cadastrado ainda.</p>
          <p className="text-muted-foreground text-xs mt-1">Novos usuários aparecerão aqui ao se registrarem.</p>
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
