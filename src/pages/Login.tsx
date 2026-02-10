import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

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
  const { login, signup, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
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
        setError(err);
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
