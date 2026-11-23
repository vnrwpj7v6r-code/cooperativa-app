"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSessionAndRole(userId?: string) {
      let uid = userId;
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id;
      }

      if (!uid) {
        if (mounted) {
          setIsLoggedIn(false);
          setRole(null);
        }
        return;
      }

      if (mounted) {
        setIsLoggedIn(true);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (mounted) {
        setRole(profile?.role ?? null);
      }
    }

    loadSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSessionAndRole(session?.user?.id);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setRole(null);
    window.location.href = "/login";
  }

  const isOperator = role === "operator" || role === "admin";

  function linkStyle(href: string): React.CSSProperties {
    const active = pathname === href;
    return {
      color: "#FFFFFF",
      textDecoration: "none",
      fontWeight: active ? 800 : 600,
      background: active ? "rgba(255, 255, 255, 0.2)" : "transparent",
      padding: "0.35rem 0.7rem",
      borderRadius: "6px",
      fontSize: "0.95rem",
    };
  }

  return (
    <nav
      style={{
        background: "#2E7D32",
        color: "#FFFFFF",
        padding: "0.75rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        flexWrap: "wrap",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          background: "transparent",
          border: "none",
          color: "#FFFFFF",
          cursor: "pointer",
          fontSize: "1.15rem",
          fontWeight: 800,
          padding: "0.2rem 0.4rem",
        }}
        title="Regresar"
      >
        ←
      </button>

      <Link href="/catalogo" style={linkStyle("/catalogo")}>
        🍎 Catálogo
      </Link>

      {isLoggedIn && !isOperator && (
        <Link href="/mis-pedidos" style={linkStyle("/mis-pedidos")}>
          Mis pedidos
        </Link>
      )}

      {isOperator && (
        <>
          <Link href="/admin/productos" style={linkStyle("/admin/productos")}>
            Productos
          </Link>
          <Link href="/admin/pedidos" style={linkStyle("/admin/pedidos")}>
            Pedidos
          </Link>
          <Link href="/admin/inventario" style={linkStyle("/admin/inventario")}>
            Inventario
          </Link>
          <Link href="/admin/usuarios" style={linkStyle("/admin/usuarios")}>
            Usuarios
          </Link>
        </>
      )}

      <div style={{ flex: 1 }} />

      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid #FFFFFF",
            color: "#FFFFFF",
            padding: "0.35rem 0.85rem",
            borderRadius: "6px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      ) : (
        <Link
          href="/login"
          style={{
            color: "#FFFFFF",
            textDecoration: "none",
            fontWeight: 700,
            border: "1px solid #FFFFFF",
            padding: "0.35rem 0.85rem",
            borderRadius: "6px",
          }}
        >
          Iniciar sesión
        </Link>
      )}
    </nav>
  );
}