"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/supabase/client";

type UserProfile = {
  id: string;
  role?: string;
  full_name?: string;
  name?: string;
  nombre?: string;
  email?: string;
  is_blocked?: boolean;
  blocked_reason?: string | null;
};

type UnpaidSummary = {
  count: number;
  total: number;
};

export default function AdminUsuarios() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [unpaidMap, setUnpaidMap] = useState<Record<string, UnpaidSummary>>({});
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "bloqueados" | "activos">("todos");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      setCurrentUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile || (profile.role !== "operator" && profile.role !== "admin")) {
        router.push("/catalogo");
        return;
      }

      setChecking(false);
    }
    checkAccess();
  }, [router]);

  async function loadUsersAndDebts() {
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) {
      setMessage({ text: "Error cargando usuarios: " + error.message, isError: true });
      return;
    }

    setUsers((profilesData as UserProfile[]) ?? []);

    // Consultar pedidos no pagados y no cancelados para detectar adeudos
    const { data: unpaidOrders } = await supabase
      .from("orders")
      .select("student_id, total_amount")
      .eq("is_paid", false)
      .neq("status", "cancelado");

    const map: Record<string, UnpaidSummary> = {};
    if (unpaidOrders) {
      for (const ord of unpaidOrders) {
        if (!ord.student_id) continue;
        if (!map[ord.student_id]) {
          map[ord.student_id] = { count: 0, total: 0 };
        }
        map[ord.student_id].count += 1;
        map[ord.student_id].total += ord.total_amount || 0;
      }
    }
    setUnpaidMap(map);
  }

  useEffect(() => {
    if (!checking) {
      loadUsersAndDebts();
    }
  }, [checking]);

  function getDisplayName(u: UserProfile) {
    return u.full_name || u.name || u.nombre || u.email || "Usuario sin nombre";
  }

  async function handleToggleBlock(user: UserProfile) {
    const nombre = getDisplayName(user);
    const willBlock = !user.is_blocked;

    let reason: string | null = null;
    if (willBlock) {
      const input = window.prompt(
        `Motivo para bloquear a "${nombre}":`,
        "Adeudo pendiente en cooperativa"
      );
      if (input === null) return; // Cancelado por el admin
      reason = input.trim() || "Adeudo pendiente en cooperativa";
    } else {
      if (!confirm(`¿Desbloquear a "${nombre}" para que vuelva a hacer pedidos?`)) {
        return;
      }
    }

    setLoadingActionId(user.id);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        is_blocked: willBlock,
        blocked_reason: willBlock ? reason : null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ text: "Error actualizando usuario: " + error.message, isError: true });
    } else {
      setMessage({
        text: willBlock
          ? `🚫 "${nombre}" ha sido bloqueado.`
          : `✅ "${nombre}" ha sido desbloqueado.`,
        isError: false,
      });
      await loadUsersAndDebts();
    }

    setLoadingActionId(null);
  }

  if (checking) {
    return <p style={{ padding: "2rem", color: "#111111" }}>Verificando acceso...</p>;
  }

  const filteredUsers = users
    .filter((u) => {
      // Filtrar por pestaña
      if (filtro === "bloqueados" && !u.is_blocked) return false;
      if (filtro === "activos" && u.is_blocked) return false;

      // Filtrar por búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const name = getDisplayName(u).toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      // Mostrar primero los bloqueados y luego por nombre
      if (Boolean(a.is_blocked) !== Boolean(b.is_blocked)) {
        return a.is_blocked ? -1 : 1;
      }
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });

  const totalBloqueados = users.filter((u) => u.is_blocked).length;

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "1.5rem", color: "#111111" }}>
      <div style={{ maxWidth: "850px", margin: "0 auto" }}>
        {/* Encabezado */}
        <div
          style={{
            background: "#2E7D32",
            color: "#FFFFFF",
            padding: "1.2rem 1.5rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.8rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem" }}>👥 Control de Usuarios</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", opacity: 0.9 }}>
              Bloquea o desbloquea alumnos según su estado de pago
            </p>
          </div>
          <Link
            href="/admin/pedidos"
            style={{
              background: "#FFFFFF",
              color: "#2E7D32",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            ← Volver a Pedidos
          </Link>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "1.2rem",
              padding: "0.9rem 1.2rem",
              borderRadius: "8px",
              fontWeight: 700,
              background: message.isError ? "#FEE2E2" : "#DCFCE7",
              color: message.isError ? "#B91C1C" : "#15803D",
              border: `1px solid ${message.isError ? "#F87171" : "#4ADE80"}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Buscador y filtros */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid #81C784",
            padding: "1.1rem",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          <input
            type="text"
            placeholder="🔍 Buscar alumno por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "2px solid #9CA3AF",
              background: "#FFFFFF",
              color: "#111111",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setFiltro("todos")}
              style={{
                background: filtro === "todos" ? "#2E7D32" : "#F3F4F6",
                color: filtro === "todos" ? "#FFFFFF" : "#111111",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Todos ({users.length})
            </button>

            <button
              onClick={() => setFiltro("bloqueados")}
              style={{
                background: filtro === "bloqueados" ? "#DC2626" : "#FEE2E2",
                color: filtro === "bloqueados" ? "#FFFFFF" : "#B91C1C",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🚫 Bloqueados ({totalBloqueados})
            </button>

            <button
              onClick={() => setFiltro("activos")}
              style={{
                background: filtro === "activos" ? "#15803D" : "#DCFCE7",
                color: filtro === "activos" ? "#FFFFFF" : "#15803D",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✅ Activos ({users.length - totalBloqueados})
            </button>
          </div>
        </div>

        {/* Lista de usuarios */}
        {filteredUsers.length === 0 ? (
          <p style={{ background: "#FFFFFF", padding: "1.2rem", borderRadius: "10px", color: "#374151" }}>
            No se encontraron usuarios con ese filtro.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {filteredUsers.map((user) => {
              const nombre = getDisplayName(user);
              const isAdmin = user.role === "admin" || user.role === "operator";
              const isSelf = user.id === currentUserId;
              const debt = unpaidMap[user.id];

              return (
                <div
                  key={user.id}
                  style={{
                    background: "#FFFFFF",
                    border: user.is_blocked ? "2px solid #EF4444" : "2px solid #81C784",
                    borderRadius: "12px",
                    padding: "1.1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "1.1rem", color: "#111111" }}>👤 {nombre}</strong>
                      {isAdmin && (
                        <span
                          style={{
                            background: "#DBEAFE",
                            color: "#1E40AF",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                          }}
                        >
                          Admin
                        </span>
                      )}
                      <span
                        style={{
                          background: user.is_blocked ? "#FEE2E2" : "#DCFCE7",
                          color: user.is_blocked ? "#B91C1C" : "#15803D",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                        }}
                      >
                        {user.is_blocked ? "🚫 Bloqueado" : "✅ Activo"}
                      </span>
                    </div>

                    {user.email && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.88rem", color: "#4B5563" }}>
                        {user.email}
                      </p>
                    )}

                    {debt && debt.count > 0 && (
                      <p
                        style={{
                          margin: "0.45rem 0 0",
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: "#B45309",
                          background: "#FEF3C7",
                          display: "inline-block",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                        }}
                      >
                        ⚠️ Tiene {debt.count} {debt.count === 1 ? "pedido sin pagar" : "pedidos sin pagar"} (${debt.total.toFixed(2)})
                      </p>
                    )}

                    {user.is_blocked && user.blocked_reason && (
                      <p style={{ margin: "0.45rem 0 0", fontSize: "0.85rem", color: "#B91C1C", fontWeight: 700 }}>
                        Motivo: {user.blocked_reason}
                      </p>
                    )}
                  </div>

                  {!isSelf && !isAdmin && (
                    <button
                      onClick={() => handleToggleBlock(user)}
                      disabled={loadingActionId === user.id}
                      style={{
                        background: user.is_blocked ? "#10B981" : "#DC2626",
                        color: "#FFFFFF",
                        border: "none",
                        padding: "0.65rem 1.1rem",
                        borderRadius: "8px",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
                      }}
                    >
                      {loadingActionId === user.id
                        ? "Procesando..."
                        : user.is_blocked
                        ? "🔓 Desbloquear usuario"
                        : "🚫 Bloquear usuario"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}