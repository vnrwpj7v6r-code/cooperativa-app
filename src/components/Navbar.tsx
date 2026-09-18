"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setRole(profile?.role ?? null);
      }
    }
    checkSession();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav
      style={{
        background: "#2E7D32",
        color: "white",
        padding: "0.75rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => router.back()}
        style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "1.1rem" }}
        title="Regresar"
      >
        ←
      </button>

      <Link href="/catalogo" style={{ color: "white", textDecoration: "none" }}>
        🍎 Catálogo
      </Link>

      {(role === "operator" || role === "admin") && (
        <Link href="/admin/productos" style={{ color: "white", textDecoration: "none" }}>
          Admin
        </Link>
      )}

      <div style={{ flex: 1 }} />

      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          style={{ background: "transparent", border: "1px solid white", color: "white", padding: "0.3rem 0.8rem", borderRadius: "6px", cursor: "pointer" }}
        >
          Cerrar sesión
        </button>
      ) : (
        <Link href="/login" style={{ color: "white", textDecoration: "none" }}>
          Iniciar sesión
        </Link>
      )}
    </nav>
  );
}