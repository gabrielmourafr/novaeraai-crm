"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NovaeraLogo } from "@/components/layout/novaera-logo";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login";
      toast.error(message === "Invalid login credentials" ? "Email ou senha incorretos" : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#070D19" }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[58%] p-14 relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-60" />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(11,135,195,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(12,168,245,0.08) 0%, transparent 70%)" }} />

        {/* Corner lines decoration */}
        <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none"
          style={{ borderRight: "1px solid rgba(11,135,195,0.2)", borderBottom: "1px solid rgba(11,135,195,0.2)", borderBottomRightRadius: "80px" }} />
        <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
          style={{ borderLeft: "1px solid rgba(11,135,195,0.2)", borderTop: "1px solid rgba(11,135,195,0.2)", borderTopLeftRadius: "80px" }} />

        {/* Logo */}
        <div className="relative z-10">
          <NovaeraLogo collapsed={false} />
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider"
            style={{ background: "rgba(11,135,195,0.1)", border: "1px solid rgba(11,135,195,0.25)", color: "#0B87C3" }}>
            <Zap size={11} />
            HUB DE INOVAÇÃO EM INTELIGÊNCIA ARTIFICIAL
          </div>

          <h1 className="font-display font-bold text-4xl leading-tight" style={{ color: "#E2EBF8" }}>
            Construindo a Nova Era<br />
            da{" "}
            <span className="text-gradient">Inteligência</span>{" "}
            Empresarial
          </h1>

          <p style={{ color: "#7BA3C6", fontSize: "1.05rem", lineHeight: 1.7 }}>
            Gerencie leads, propostas, projetos e finanças<br />em um único hub inteligente.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex gap-10">
          {[
            { value: "3", label: "Frentes de negócio" },
            { value: "10", label: "Módulos integrados" },
            { value: "∞", label: "Possibilidades" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <p className="font-display font-bold text-3xl text-gradient">{stat.value}</p>
              <p className="text-sm" style={{ color: "#7BA3C6" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div
        className="flex-1 flex items-center justify-center p-8 relative"
        style={{ background: "rgba(4,9,18,0.6)", borderLeft: "1px solid rgba(11,135,195,0.1)" }}
      >
        {/* Subtle bg pattern */}
        <div className="absolute inset-0 bg-dot opacity-30 pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-4">
            <NovaeraLogo collapsed={false} />
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="font-display font-bold text-2xl" style={{ color: "#E2EBF8" }}>
              Bem-vindo de volta
            </h2>
            <p style={{ color: "#7BA3C6", fontSize: "0.9rem" }}>
              Entre com suas credenciais de acesso
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "#7BA3C6" }}>
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#3D5A78" }} />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  {...register("email")}
                  className="w-full pl-9 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: "rgba(11,135,195,0.05)",
                    border: `1px solid ${errors.email ? "#FF4D6D" : "rgba(11,135,195,0.18)"}`,
                    color: "#E2EBF8",
                  }}
                  onFocus={e => { if (!errors.email) e.target.style.borderColor = "rgba(11,135,195,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(11,135,195,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = errors.email ? "#FF4D6D" : "rgba(11,135,195,0.18)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              {errors.email && <p className="text-xs" style={{ color: "#FF4D6D" }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "#7BA3C6" }}>
                Senha
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#3D5A78" }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full pl-9 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: "rgba(11,135,195,0.05)",
                    border: `1px solid ${errors.password ? "#FF4D6D" : "rgba(11,135,195,0.18)"}`,
                    color: "#E2EBF8",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(11,135,195,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(11,135,195,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = errors.password ? "#FF4D6D" : "rgba(11,135,195,0.18)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              {errors.password && <p className="text-xs" style={{ color: "#FF4D6D" }}>{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading ? "rgba(11,135,195,0.5)" : "linear-gradient(135deg, #0B87C3, #0CA8F5)",
                color: "#fff",
                boxShadow: loading ? "none" : "0 0 20px rgba(11,135,195,0.35)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = "0 0 30px rgba(11,135,195,0.55)"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(11,135,195,0.35)"; }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar no CRM"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs" style={{ color: "#3D5A78" }}>
            Nova Era AI © {new Date().getFullYear()} — Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
