"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/supabase/client";

const ORGANIZATION_ID = "160f20fb-3203-478f-b5d4-a2b9e266c99f";
const CAMPUS_ID = "6a19b9ee-ecce-402b-ab52-3a92c69b941f";

export default function Registro() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Crear la cuenta en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("No se pudo crear la cuenta. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    // 2. Crear su perfil
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      organization_id: ORGANIZATION_ID,
      campus_id: CAMPUS_ID,
      full_name: fullName.trim(),
      role: "student",
    });

    if (profileError) {
      setError("Cuenta creada, pero hubo un error con tu perfil: " + profileError.message);
      setLoading(false);
      return;
    }

    router.push("/catalogo");
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.35rem",
    color: "#111111",
    fontWeight: 700,
    fontSize: "0.95rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "2px solid #9CA3AF",
    backgroundColor: "#FFFFFF",
    color: "#111111",
    fontSize: "1rem",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        background: "#E8F5E9",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        color: "#111111",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: "2px solid #81C784",
          padding: "2rem",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            margin: "0 0 1.5rem 0",
            color: "#2E7D32",
            fontSize: "1.45rem",
            fontWeight: 800,
          }}
        >
          🍎 Crear cuenta — Cooperativa
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Nombre completo</label>
            <input
              type="text"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Correo</label>
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
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
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p style={{ margin: "1.3rem 0 0 0", textAlign: "center", fontSize: "0.95rem", color: "#374151" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: "#2E7D32", fontWeight: 800, textDecoration: "none" }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}