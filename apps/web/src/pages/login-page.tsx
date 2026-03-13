import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  FileText,
  Lock,
  Mail,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  Decorative SVG pattern – evokes medical cross-grid / data matrix  */
/* ------------------------------------------------------------------ */
function GridPattern() {
  return (
    <svg
      className="absolute inset-0 size-full opacity-[0.07]"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="login-grid"
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          {/* horizontal + vertical thin lines */}
          <path
            d="M 48 0 L 0 0 0 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          {/* small cross at every intersection */}
          <path
            d="M 24 20 V 28 M 20 24 H 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#login-grid)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating stat preview – teases the dashboard capabilities         */
/* ------------------------------------------------------------------ */
function StatPreview({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"
      style={{ animation: `loginSlideUp 0.6s ease-out ${delay} both` }}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <Icon className="size-4 text-white/90" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-white/60">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature pill                                                      */
/* ------------------------------------------------------------------ */
function FeaturePill({
  icon: Icon,
  text,
  delay,
}: {
  icon: React.ElementType;
  text: string;
  delay: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm"
      style={{ animation: `loginFadeIn 0.5s ease-out ${delay} both` }}
    >
      <Icon className="size-3" />
      {text}
    </span>
  );
}

/* ================================================================== */
/*  Login Page                                                        */
/* ================================================================== */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await login(form);
      const nextPath =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? "/";
      navigate(nextPath, { replace: true });
      toast.success("Login realizado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel entrar.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {/* Keyframe animations – injected once */}
      <style>{`
        @keyframes loginSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes loginPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
          50%      { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }
      `}</style>

      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div
          className="grid w-full max-w-[64rem] gap-0 overflow-hidden rounded-3xl shadow-2xl shadow-primary/15 lg:grid-cols-[1.3fr_1fr]"
          style={{ animation: "loginFadeIn 0.4s ease-out both" }}
        >
          {/* -------------------------------------------------------- */}
          {/*  Left hero panel                                         */}
          {/* -------------------------------------------------------- */}
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-[hsl(201,60%,22%)] p-10 lg:flex lg:flex-col lg:justify-between">
            {/* Background pattern */}
            <GridPattern />

            {/* Decorative blurred orbs */}
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-white/5 blur-3xl" />

            {/* Top: branding */}
            <div className="relative z-10">
              <div
                className="flex items-center gap-3"
                style={{ animation: "loginSlideUp 0.5s ease-out 0.1s both" }}
              >
                <div
                  className="flex size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm"
                  style={{ animation: "loginPulse 3s ease-in-out infinite" }}
                >
                  <Activity className="size-6 text-white" />
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-white/50">
                    Plataforma Analítica
                  </p>
                  <h1 className="text-2xl font-bold text-white">CID Feegow</h1>
                </div>
              </div>

              {/* Feature pills */}
              <div className="mt-8 flex flex-wrap gap-2">
                <FeaturePill icon={Users} text="Beneficiários" delay="0.3s" />
                <FeaturePill icon={BarChart3} text="Diagnósticos CID" delay="0.4s" />
                <FeaturePill icon={Building2} text="Análise por Empresa" delay="0.5s" />
                <FeaturePill icon={FileText} text="Relatórios PDF" delay="0.6s" />
              </div>
            </div>

            {/* Center: tagline */}
            <div
              className="relative z-10 my-8"
              style={{ animation: "loginSlideUp 0.6s ease-out 0.3s both" }}
            >
              <p className="max-w-sm text-lg font-medium leading-relaxed text-white/90">
                Visão completa da sua carteira de beneficiários.
                Concentração, composição titular × dependente e diagnósticos —
                tudo em um só lugar.
              </p>
            </div>

            {/* Bottom: stat previews */}
            <div className="relative z-10 grid grid-cols-2 gap-3">
              <StatPreview
                icon={Users}
                label="Beneficiários ativos"
                value="Monitoramento contínuo"
                delay="0.5s"
              />
              <StatPreview
                icon={BarChart3}
                label="Códigos CID"
                value="Análise detalhada"
                delay="0.6s"
              />
              <StatPreview
                icon={Building2}
                label="Empresas"
                value="Visão por carteira"
                delay="0.7s"
              />
              <StatPreview
                icon={Shield}
                label="Acesso seguro"
                value="JWT + controle de roles"
                delay="0.8s"
              />
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  Right: login form                                       */}
          {/* -------------------------------------------------------- */}
          <Card
            className="flex flex-col justify-center border-none bg-card shadow-none lg:rounded-l-none"
            style={{ animation: "loginSlideUp 0.5s ease-out 0.15s both" }}
          >
            {/* Mobile-only compact branding */}
            <div className="flex items-center gap-2.5 px-8 pt-8 lg:hidden">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Activity className="size-4" />
              </div>
              <span className="text-lg font-bold text-foreground">
                CID Feegow
              </span>
            </div>

            <CardHeader className="px-8 pb-2 pt-8 lg:pt-6">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-sm">
                Informe suas credenciais para acessar o painel analítico.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <span className="text-muted-foreground">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      className="h-11 pl-10 text-sm"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="voce@empresa.com"
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium">
                  <span className="text-muted-foreground">Senha</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      className="h-11 pl-10 text-sm"
                      type="password"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                <Button
                  className="group mt-1 h-11 gap-2 text-sm font-semibold"
                  size="lg"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? (
                    "Entrando..."
                  ) : (
                    <>
                      Acessar painel
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Subtle footer */}
              <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50">
                <Shield className="size-3" />
                <span>Ambiente protegido — acesso restrito</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
