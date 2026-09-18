"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";

// TEMPORAL: mismo ID de tu organización que usamos en el panel de admin.
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
      email,
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

    // 2. Crear su perfil (el trigger valida que el correo sea del dominio correcto)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      organization_id: ORGANIZATION_ID,
      campus_id: CAMPUS_ID,
      full_name: fullName,
      role: "student",
    });

    if (profileError) {
      setError("Cuenta creada, pero hubo un error con tu perfil: " + profileError.message);
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
          🍎 Crear cuenta — Cooperativa
        </h1>

        {error && <p style={{ color: "#b00020", fontSize: "0.85rem" }}>{error}</p>}

        <input
          type="text"
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ padding: "0.6rem", borderRadius: "6px", border: "none" }}
        />
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
          minLength={6}
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
          {loading ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>
    </main>
  );
}