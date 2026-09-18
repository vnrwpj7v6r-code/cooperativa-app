"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/catalogo");
  }

  return (
    <main style={{ background: "#FAFAFA", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#A5D6A7",
          padding: "2rem",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h1 style={{ margin: 0, color: "#2E7D32", fontSize: "1.3rem" }}>
          🍎 Iniciar sesión
        </h1>

        {error && <p style={{ color: "#b00020", fontSize: "0.85rem" }}>{error}</p>}

        <input
          type="email"
          placeholder="Correo institucional"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "0.6rem", borderRadius: "6px", border: "none" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "0.6rem", borderRadius: "6px", border: "none" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#2E7D32",
            color: "white",
            border: "none",
            padding: "0.7rem",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <a href="/registro" style={{ textAlign: "center", fontSize: "0.85rem", color: "#2E7D32" }}>
          ¿No tienes cuenta? Regístrate
        </a>
      </form>
    </main>
  );
}