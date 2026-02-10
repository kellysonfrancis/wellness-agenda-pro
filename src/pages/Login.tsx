import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

export default function Login() {
  const { login, signup, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (isSignup) {
      const { error: err } = await signup(email, password, nome);
      if (err) {
        setError(err);
      } else {
        setSuccess("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        setIsSignup(false);
      }
    } else {
      const { error: err } = await login(email, password);
      if (err) {
        setError(err);
      } else {
        navigate("/dashboard");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Clínica</h1>
          <p className="text-sm text-muted-foreground">Gestão Integrada — Pilates · Fisioterapia · Estética</p>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold text-center mb-4">
            {isSignup ? "Criar Conta" : "Entrar"}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-success/10 text-success text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="nome">Nome</label>
                <input
                  id="nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Seu nome completo"
                />
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSignup ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isSignup ? "Criar Conta" : "Entrar"}
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-4">
            {isSignup ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button
              onClick={() => { setIsSignup(!isSignup); setError(null); setSuccess(null); }}
              className="text-primary font-medium hover:underline"
            >
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
