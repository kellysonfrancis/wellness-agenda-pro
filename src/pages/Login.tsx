import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Loader2, Chrome } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

function translateAuthError(msg: string): string {
  if (msg.includes("Password should contain")) return "A senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial.";
  if (msg.includes("Password is known to be weak")) return "Essa senha é muito fraca e fácil de adivinhar. Escolha uma senha mais segura.";
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (msg.includes("Signup requires a valid password")) return "A senha informada não é válida.";
  if (msg.includes("Unable to validate email")) return "Endereço de e-mail inválido.";
  return msg;
}

function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(digits[i]) * (t + 1 - i);
    const rest = (sum * 10) % 11;
    if ((rest === 10 ? 0 : rest) !== Number(digits[t])) return false;
  }
  return true;
}

function cpfMask(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function phoneMask(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function Login() {
  const { user, login, signup, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);

  // Redirect authenticated users away from login
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [tipoConta, setTipoConta] = useState<"cliente" | "funcionario">("cliente");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao entrar com Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (isSignup) {
      if (!validarCPF(cpf)) {
        setError("CPF inválido. Verifique os dígitos.");
        setSubmitting(false);
        return;
      }
      if (whatsapp.replace(/\D/g, "").length < 10) {
        setError("WhatsApp deve ter pelo menos 10 dígitos");
        setSubmitting(false);
        return;
      }

      const { error: err } = await signup(email, password, nome, {
        cpf: cpf.replace(/\D/g, ""),
        whatsapp: whatsapp.replace(/\D/g, ""),
        data_nascimento: dataNascimento || undefined as any,
        endereco: endereco || undefined as any,
        role: tipoConta === "cliente" ? "cliente" : "funcionario_pendente",
      });
      if (err) {
        // Translate common Supabase auth errors to Portuguese
        const translated = translateAuthError(err);
        setError(translated);
      } else {
        setSuccess(
          tipoConta === "funcionario"
            ? "Conta criada! Aguarde a validação de um administrador para acessar o sistema. Verifique seu e-mail para confirmar o cadastro."
            : "Conta criada! Verifique seu e-mail para confirmar o cadastro."
        );
        setIsSignup(false);
      }
    } else {
      const { error: err } = await login(email, password);
      if (err) {
        setError(translateAuthError(err));
      } else {
        // Check if user has any roles assigned
        const { data: roles } = await supabase.rpc("get_my_roles");
        if (!roles || roles.length === 0) {
          // No roles = pending approval
          await supabase.auth.signOut();
          setError("Sua conta está pendente de aprovação por um administrador. Aguarde a validação.");
        } else {
          navigate("/dashboard");
        }
      }
    }
    setSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

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
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Tipo de conta *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tipoConta" value="cliente" checked={tipoConta === "cliente"}
                        onChange={() => setTipoConta("cliente")} className="accent-primary" />
                      <span className="text-sm">Cliente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tipoConta" value="funcionario" checked={tipoConta === "funcionario"}
                        onChange={() => setTipoConta("funcionario")} className="accent-primary" />
                      <span className="text-sm">Funcionário</span>
                    </label>
                  </div>
                  {tipoConta === "funcionario" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠ Contas de funcionário precisam ser validadas por um administrador.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="nome">Nome completo *</label>
                  <input id="nome" type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                    className={inputClass} placeholder="Seu nome completo" maxLength={100} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="cpf">CPF *</label>
                  <input id="cpf" type="text" required value={cpf} onChange={(e) => setCpf(cpfMask(e.target.value))}
                    className={inputClass} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="whatsapp">WhatsApp *</label>
                  <input id="whatsapp" type="text" required value={whatsapp} onChange={(e) => setWhatsapp(phoneMask(e.target.value))}
                    className={inputClass} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="data_nascimento">Data de Nascimento</label>
                  <input id="data_nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)}
                    className={inputClass} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="endereco">Endereço</label>
                  <input id="endereco" type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)}
                    className={inputClass} placeholder="Rua, número, bairro, cidade" maxLength={255} />
                </div>
              </>
            )}
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="email">E-mail *</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputClass} placeholder="seu@email.com" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="password">Senha *</label>
              <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputClass} placeholder="Mínimo 6 caracteres" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {isSignup ? "Criar Conta" : "Entrar"}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || submitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Entrar com Google
          </button>

          <p className="text-sm text-muted-foreground text-center mt-4">
            {isSignup ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button onClick={() => { setIsSignup(!isSignup); setError(null); setSuccess(null); }}
              className="text-primary font-medium hover:underline">
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
