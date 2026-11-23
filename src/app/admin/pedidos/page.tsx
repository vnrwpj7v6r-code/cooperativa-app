"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";

type OrderItem = {
  id: string;
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

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  recibido: { next: "en_preparacion", label: "Empezar preparación", color: "#CDDC39" },
  en_preparacion: { next: "listo", label: "Marcar como listo", color: "#A5D6A7" },
  listo: { next: "entregado", label: "Marcar entregado", color: "#2E7D32" },
};

export default function AdminPedidos() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalIngresos, setTotalIngresos] = useState(0);

  async function loadOrders() {
    // 1. Cargar los pedidos activos en pantalla
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, status, payment_method, total_amount, pickup_code, created_at, is_paid,
        profiles ( * ),
        order_items ( id, quantity, unit_price, product:products ( name ) )
      `)
      .neq("status", "entregado")
      .neq("status", "cancelado")
      .order("created_at", { ascending: true });

    if (error) console.error("Error cargando pedidos:", error);
    setOrders((data as unknown as Order[]) ?? []);

    // 2. Cargar el total histórico de dinero de TODOS los pedidos pagados
    const { data: incomeData } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("is_paid", true)
      .neq("status", "cancelado");

    if (incomeData) {
      const sum = incomeData.reduce((acc, curr) => acc + curr.total_amount, 0);
      setTotalIngresos(sum);
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
      .channel("orders-admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function advanceStatus(orderId: string, nextStatus: string, isPaid: boolean) {
    if (nextStatus === "entregado" && !isPaid) {
      alert("⚠️ ¡No puedes entregar este pedido!\n\nPrimero debes hacer clic en '💰 REGISTRAR COBRO' para confirmar el pago.");
      return;
    }

    await supabase
      .from("orders")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  }

  async function togglePayment(orderId: string, currentPaidStatus: boolean) {
    await supabase
      .from("orders")
      .update({ is_paid: !currentPaidStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  }

  if (checking) {
    return <p style={{ padding: "2rem", color: "#333" }}>Verificando acceso...</p>;
  }

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ background: "#2E7D32", color: "white", padding: "1rem 1.5rem", borderRadius: "8px", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: 0 }}>Pedidos en curso ({orders.length})</h1>
        <div style={{ background: "rgba(255,255,255,0.2)", padding: "0.5rem 1rem", borderRadius: "8px", textAlign: "right" }}>
          <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Ingresos totales cobrados</span>
          <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: "bold" }}>${totalIngresos.toFixed(2)}</p>
        </div>
      </div>

      {orders.length === 0 && <p style={{ color: "#333", fontSize: "1.1rem" }}>No hay pedidos pendientes ahora mismo.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {orders.map((order) => {
          const flow = STATUS_FLOW[order.status];
          const minutesAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
          const profileData = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
          const clientName = profileData?.full_name || profileData?.name || profileData?.nombre || "Cliente sin nombre";

          return (
            <div key={order.id} style={{ background: "#FFFFFF", border: "2px solid #81C784", borderRadius: "10px", padding: "1.2rem", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              
              {/* Encabezado de tarjeta */}
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

              {/* Lista de productos */}
              <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem", flex: 1, color: "#222", fontWeight: 500 }}>
                {order.order_items.map((item) => (
                  <li key={item.id} style={{ marginBottom: "0.3rem" }}>
                    <strong>{item.quantity}x</strong> {item.product?.name ?? "Producto"}
                  </li>
                ))}
              </ul>

              {/* Sección de pago */}
              <div style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px", margin: "1rem 0 0.5rem 0", border: "1px solid #E5E7EB" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <p style={{ margin: 0, color: "#111", fontSize: "1.1rem" }}>
                    Total: <strong style={{ fontSize: "1.2rem", color: "#2E7D32" }}>${order.total_amount.toFixed(2)}</strong>
                  </p>
                  <span style={{ fontSize: "0.85rem", color: "#4B5563", background: "#E5E7EB", padding: "0.3rem 0.6rem", borderRadius: "6px", fontWeight: "bold" }}>
                    {order.payment_method}
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
                    transition: "all 0.2s"
                  }}
                >
                  {order.is_paid ? "✅ PAGO RECIBIDO" : "💰 REGISTRAR COBRO"}
                </button>
              </div>

              {/* Botón de acción principal */}
              {flow && (
                <button
                  onClick={() => advanceStatus(order.id, flow.next, order.is_paid)}
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
            </div>
          );
        })}
      </div>
    </main>
  );
}