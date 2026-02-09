import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/types/clinic";
import { Shield, Headset, Stethoscope, User } from "lucide-react";

const roles: { role: UserRole; label: string; desc: string; icon: React.ElementType }[] = [
  { role: "admin", label: "Administrador", desc: "Acesso total ao sistema", icon: Shield },
  { role: "recepcao", label: "Recepção", desc: "Agenda, clientes e financeiro", icon: Headset },
  { role: "profissional", label: "Profissional", desc: "Agenda e atendimentos", icon: Stethoscope },
  { role: "cliente", label: "Cliente", desc: "Portal de agendamentos", icon: User },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Clínica</h1>
          <p className="text-sm text-muted-foreground">Gestão Integrada — Pilates · Fisioterapia · Estética</p>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <p className="text-sm text-muted-foreground mb-4 text-center">Selecione um perfil para entrar (demo)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.map(({ role, label, desc, icon: Icon }) => (
              <button
                key={role}
                onClick={() => handleLogin(role)}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary hover:bg-secondary transition-colors text-left group"
              >
                <div className="p-2 rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
