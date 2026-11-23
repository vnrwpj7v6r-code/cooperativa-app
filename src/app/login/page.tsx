"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.user) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin" || profile?.role === "operator") {
      router.push("/admin/pedidos");
    } else {
      router.push("/catalogo");
    }
  }

  return (
    <main
      style={{
        background: "#E8F5E9",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1.5rem",
        color: "#111111",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: "2px solid #81C784",
          borderRadius: "12px",
          padding: "2rem",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            margin: "0 0 1.5rem 0",
            color: "#2E7D32",
            fontSize: "1.6rem",
            fontWeight: 800,
          }}
        >
          🍎 Iniciar sesión
        </h1>

        {error && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1px solid #F87171",
              color: "#B91C1C",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#111111",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              Correo
            </label>
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "2px solid #9CA3AF",
                backgroundColor: "#FFFFFF",
                color: "#111111",
                fontSize: "1rem",
                fontWeight: 500,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#111111",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "2px solid #9CA3AF",
                backgroundColor: "#FFFFFF",
                color: "#111111",
                fontSize: "1rem",
                fontWeight: 500,
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.4rem",
              background: "#2E7D32",
              color: "#FFFFFF",
              border: "none",
              padding: "0.85rem",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "1.05rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ margin: "1.3rem 0 0 0", textAlign: "center", fontSize: "0.95rem", color: "#374151" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" style={{ color: "#2E7D32", fontWeight: 800, textDecoration: "none" }}>
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}