"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/supabase/client";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
};

type Order = {
  id: string;
  status: string;
  payment_method: string;
  total_amount: number;
  pickup_code: string;
  created_at: string;
  is_paid: boolean;
  profiles: any;
  order_items: OrderItem[];
};

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
  recibido: { next: "en_preparacion", label: "Empezar preparación" },
  en_preparacion: { next: "listo", label: "Marcar como listo" },
  listo: { next: "entregado", label: "Marcar entregado" },
};

const PREV_STATUS_FLOW: Record<string, { prev: string; label: string }> = {
  en_preparacion: { prev: "recibido", label: "↩ Regresar a recibido" },
  listo: { prev: "en_preparacion", label: "↩ Regresar a preparación" },
};

export default function AdminPedidos() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [vista, setVista] = useState<"activos" | "historial">("activos");
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [ingresosEfectivo, setIngresosEfectivo] = useState(0);
  const [ingresosTransferencia, setIngresosTransferencia] = useState(0);
  const [audioActivo, setAudioActivo] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAudioActivo(localStorage.getItem("coop_audio_enabled") === "true");
    }
  }, []);

  function activarYProbarAlertas() {
    localStorage.setItem("coop_audio_enabled", "true");
    setAudioActivo(true);
    window.dispatchEvent(new Event("coop-audio-activate"));
  }

  async function loadOrders() {
    const { data: activeData, error } = await supabase
      .from("orders")
      .select(`
        id, status, payment_method, total_amount, pickup_code, created_at, is_paid,
        profiles ( * ),
        order_items ( id, product_id, quantity, unit_price, product:products ( name ) )
      `)
      .neq("status", "entregado")
      .neq("status", "cancelado")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando pedidos activos:", error);
    } else if (activeData) {
      setOrders(activeData as unknown as Order[]);
    }

    const { data: histData } = await supabase
      .from("orders")
      .select(`
        id, status, payment_method, total_amount, pickup_code, created_at, is_paid,
        profiles ( * ),
        order_items ( id, product_id, quantity, unit_price, product:products ( name ) )
      `)
      .in("status", ["entregado", "cancelado"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (histData) {
      setHistoryOrders(histData as unknown as Order[]);
    }

    const { data: incomeData } = await supabase
      .from("orders")
      .select("total_amount, payment_method")
      .eq("is_paid", true)
      .neq("status", "cancelado");

    if (incomeData) {
      let efectivo = 0;
      let transferencia = 0;

      for (const row of incomeData) {
        const metodo = (row.payment_method || "").toLowerCase();
        if (metodo.includes("transfer")) {
          transferencia += row.total_amount;
        } else {
          efectivo += row.total_amount;
        }
      }

      setIngresosEfectivo(efectivo);
      setIngresosTransferencia(transferencia);
    }
  }

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
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

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders-admin-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        setTimeout(() => loadOrders(), 500);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, () => {
        setTimeout(() => loadOrders(), 300);
      })
      .subscribe();

    const interval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function updateOrderStatus(order: Order, targetStatus: string) {
    if (targetStatus === "entregado" && !order.is_paid) {
      alert("⚠️ ¡No puedes entregar este pedido!\n\nPrimero debes hacer clic en '💰 REGISTRAR COBRO' para confirmar el pago.");
      return;
    }

    if (targetStatus === "entregado") {
      for (const item of order.order_items) {
        if (item.product_id) {
          const { data: prod } = await supabase
            .from("products")
            .select("stock_current")
            .eq("id", item.product_id)
            .single();

          if (prod) {
            const nuevoStock = Math.max(0, (prod.stock_current ?? 0) - item.quantity);
            await supabase
              .from("products")
              .update({ stock_current: nuevoStock })
              .eq("id", item.product_id);
          }
        }
      }
    }

    await supabase
      .from("orders")
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    loadOrders();
  }

  async function togglePayment(orderId: string, currentPaidStatus: boolean) {
    await supabase
      .from("orders")
      .update({ is_paid: !currentPaidStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    loadOrders();
  }

  if (checking) {
    return <p style={{ padding: "2rem", color: "#111" }}>Verificando acceso...</p>;
  }

  const totalIngresos = ingresosEfectivo + ingresosTransferencia;

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "1.5rem" }}>
      {/* Encabezado con desglose de ingresos y accesos rápidos */}
      <div style={{ background: "#2E7D32", color: "white", padding: "1.2rem 1.5rem", borderRadius: "10px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div>
          <h1 style={{ margin: "0 0 0.6rem 0", fontSize: "1.6rem" }}>Panel de Pedidos</h1>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={activarYProbarAlertas}
              style={{
                background: audioActivo ? "#10B981" : "#F59E0B",
                color: audioActivo ? "#FFFFFF" : "#111111",
                border: "none",
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {audioActivo ? "🔔 Alertas activas (Probar timbre)" : "🔇 Activar alertas con sonido"}
            </button>

            <Link
              href="/admin/usuarios"
              style={{
                display: "inline-block",
                background: "#FFFFFF",
                color: "#2E7D32",
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              👥 Usuarios / Bloqueos
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "0.6rem 1rem", borderRadius: "8px" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>💵 Efectivo</span>
            <strong style={{ fontSize: "1.35rem" }}>${ingresosEfectivo.toFixed(2)}</strong>
          </div>

          <div style={{ background: "rgba(255,255,255,0.15)", padding: "0.6rem 1rem", borderRadius: "8px" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>💳 Transferencia</span>
            <strong style={{ fontSize: "1.35rem" }}>${ingresosTransferencia.toFixed(2)}</strong>
          </div>

          <div style={{ background: "rgba(255,255,255,0.28)", padding: "0.6rem 1.1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.4)" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>💰 Total Cobrado</span>
            <strong style={{ fontSize: "1.45rem" }}>${totalIngresos.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Pestañas: En curso vs Historial */}
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setVista("activos")}
          style={{
            background: vista === "activos" ? "#2E7D32" : "#FFFFFF",
            color: vista === "activos" ? "#FFFFFF" : "#111111",
            border: "2px solid #2E7D32",
            padding: "0.65rem 1.2rem",
            borderRadius: "8px",
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          🔥 En curso ({orders.length})
        </button>

        <button
          onClick={() => setVista("historial")}
          style={{
            background: vista === "historial" ? "#2E7D32" : "#FFFFFF",
            color: vista === "historial" ? "#FFFFFF" : "#111111",
            border: "2px solid #2E7D32",
            padding: "0.65rem 1.2rem",
            borderRadius: "8px",
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          📜 Historial de pedidos ({historyOrders.length})
        </button>
      </div>

      {/* VISTA 1: PEDIDOS EN CURSO */}
      {vista === "activos" && (
        <>
          {orders.length === 0 && (
            <p style={{ color: "#111", fontSize: "1.05rem", background: "#FFFFFF", padding: "1.2rem", borderRadius: "8px", border: "1px solid #D1D5DB" }}>
              No hay pedidos pendientes ahora mismo.
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {orders.map((order) => {
              const flow = STATUS_FLOW[order.status];
              const prevFlow = PREV_STATUS_FLOW[order.status];
              const minutesAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
              const profileData = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
              const clientName = profileData?.full_name || profileData?.name || profileData?.nombre || "Cliente sin nombre";

              return (
                <div key={order.id} style={{ background: "#FFFFFF", border: "2px solid #81C784", borderRadius: "10px", padding: "1.2rem", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #eee", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "1.3rem", display: "block", color: "#2E7D32" }}>#{order.pickup_code}</span>
                      <span style={{ fontSize: "0.95rem", color: "#111", fontWeight: 700 }}>
                        👤 {clientName}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "#555", fontWeight: 600, background: "#f5f5f5", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                      hace {minutesAgo} min
                    </span>
                  </div>

                  <p style={{ margin: "0.5rem 0", fontSize: "0.9rem", textTransform: "uppercase", fontWeight: 800, color: "#1565C0" }}>
                    ESTADO: {order.status.replace("_", " ")}
                  </p>

                  <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem", flex: 1, color: "#222", fontWeight: 500 }}>
                    {order.order_items.map((item) => (
                      <li key={item.id} style={{ marginBottom: "0.3rem" }}>
                        <strong>{item.quantity}x</strong> {item.product?.name ?? "Producto"}
                      </li>
                    ))}
                  </ul>

                  <div style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px", margin: "1rem 0 0.5rem 0", border: "1px solid #E5E7EB" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <p style={{ margin: 0, color: "#111", fontSize: "1.1rem" }}>
                        Total: <strong style={{ fontSize: "1.2rem", color: "#2E7D32" }}>${order.total_amount.toFixed(2)}</strong>
                      </p>
                      <span style={{ fontSize: "0.85rem", color: "#111827", background: "#E5E7EB", padding: "0.3rem 0.6rem", borderRadius: "6px", fontWeight: "bold" }}>
                        {order.payment_method === "transferencia" ? "💳 Transferencia" : "💵 Efectivo"}
                      </span>
                    </div>

                    <button
                      onClick={() => togglePayment(order.id, order.is_paid)}
                      style={{
                        width: "100%",
                        background: order.is_paid ? "#10B981" : "#F59E0B",
                        color: order.is_paid ? "white" : "#111",
                        border: "none",
                        padding: "0.8rem",
                        borderRadius: "6px",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {order.is_paid ? "✅ PAGO RECIBIDO" : "💰 REGISTRAR COBRO"}
                    </button>
                  </div>

                  {flow && (
                    <button
                      onClick={() => updateOrderStatus(order, flow.next)}
                      style={{
                        width: "100%",
                        marginTop: "0.5rem",
                        background: "#2E7D32",
                        color: "white",
                        border: "none",
                        padding: "0.8rem",
                        borderRadius: "6px",
                        fontWeight: 800,
                        fontSize: "1rem",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                      }}
                    >
                      {flow.label}
                    </button>
                  )}

                  {prevFlow && (
                    <button
                      onClick={() => updateOrderStatus(order, prevFlow.prev)}
                      style={{
                        width: "100%",
                        marginTop: "0.45rem",
                        background: "#F3F4F6",
                        color: "#374151",
                        border: "1px solid #9CA3AF",
                        padding: "0.55rem",
                        borderRadius: "6px",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                      }}
                    >
                      {prevFlow.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* VISTA 2: HISTORIAL DE PEDIDOS */}
      {vista === "historial" && (
        <>
          {historyOrders.length === 0 ? (
            <p style={{ color: "#111", fontSize: "1.05rem", background: "#FFFFFF", padding: "1.2rem", borderRadius: "8px", border: "1px solid #D1D5DB" }}>
              Todavía no hay pedidos entregados o cancelados en el historial.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.2rem" }}>
              {historyOrders.map((order) => {
                const profileData = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                const clientName = profileData?.full_name || profileData?.name || profileData?.nombre || "Cliente sin nombre";
                const fecha = new Date(order.created_at).toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={order.id} style={{ background: "#FFFFFF", border: "1px solid #D1D5DB", borderRadius: "10px", padding: "1.1rem", display: "flex", flexDirection: "column", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #E5E7EB", paddingBottom: "0.6rem", marginBottom: "0.6rem" }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#111111", display: "block" }}>
                          #{order.pickup_code}
                        </span>
                        <span style={{ fontSize: "0.9rem", color: "#374151", fontWeight: 700 }}>
                          👤 {clientName}
                        </span>
                      </div>
                      <span
                        style={{
                          background: order.status === "entregado" ? "#DCFCE7" : "#FEE2E2",
                          color: order.status === "entregado" ? "#15803D" : "#B91C1C",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        {order.status}
                      </span>
                    </div>

                    <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.82rem", color: "#6B7280", fontWeight: 600 }}>
                      📅 {fecha}
                    </p>

                    <ul style={{ margin: "0 0 0.8rem 0", paddingLeft: "1.2rem", flex: 1, color: "#111111", fontSize: "0.95rem" }}>
                      {order.order_items.map((item) => (
                        <li key={item.id} style={{ marginBottom: "0.25rem" }}>
                          <strong>{item.quantity}x</strong> {item.product?.name ?? "Producto"}
                        </li>
                      ))}
                    </ul>

                    <div style={{ background: "#F9FAFB", padding: "0.75rem", borderRadius: "8px", border: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#2E7D32", display: "block" }}>
                          ${order.total_amount.toFixed(2)}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 700 }}>
                          {order.payment_method === "transferencia" ? "💳 Transferencia" : "💵 Efectivo"}
                        </span>
                      </div>
                      <span
                        style={{
                          background: order.is_paid ? "#DCFCE7" : "#FEF3C7",
                          color: order.is_paid ? "#15803D" : "#B45309",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                        }}
                      >
                        {order.is_paid ? "✅ Cobrado" : "⏳ Sin cobrar"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}