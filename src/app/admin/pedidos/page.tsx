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
  profiles: { full_name: string } | null;
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

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, status, payment_method, total_amount, pickup_code, created_at, is_paid,
        profiles ( full_name ),
        order_items ( id, quantity, unit_price, product:products ( name ) )
      `)
      .neq("status", "entregado")
      .neq("status", "cancelado")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando pedidos:", error);
    }

    setOrders((data as unknown as Order[]) ?? []);
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

  async function advanceStatus(orderId: string, nextStatus: string) {
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
    return <p style={{ padding: "2rem" }}>Verificando acceso...</p>;
  }

  // Calcular ingresos solo de los pedidos marcados como pagados
  const totalIngresos = orders
    .filter((o) => o.is_paid)
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <main style={{ background: "#FAFAFA", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ background: "#2E7D32", color: "white", padding: "1rem 1.5rem", borderRadius: "8px", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Pedidos en curso ({orders.length})</h1>
        <div style={{ background: "rgba(255,255,255,0.2)", padding: "0.5rem 1rem", borderRadius: "8px" }}>
          <span style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>Ingresos cobrados</span>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>${totalIngresos.toFixed(2)}</p>
        </div>
      </div>

      {orders.length === 0 && <p>No hay pedidos pendientes ahora mismo.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {orders.map((order) => {
          const flow = STATUS_FLOW[order.status];
          const minutesAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
          
          return (
            <div key={order.id} style={{ background: "#A5D6A7", borderRadius: "10px", padding: "1rem", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: "1.2rem", display: "block" }}>#{order.pickup_code}</span>
                  <span style={{ fontSize: "0.9rem", color: "#1b5e20", fontWeight: 600 }}>
                    👤 {order.profiles?.full_name || "Cliente desconocido"}
                  </span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "#333" }}>hace {minutesAgo} min</span>
              </div>

              <p style={{ margin: "0.5rem 0", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 700, color: "#2E7D32" }}>
                {order.status.replace("_", " ")}
              </p>

              <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem", flex: 1 }}>
                {order.order_items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}x {item.product?.name ?? "Producto"}
                  </li>
                ))}
              </ul>

              <div style={{ background: "rgba(255,255,255,0.4)", padding: "0.8rem", borderRadius: "8px", margin: "0.5rem 0" }}>
                <p style={{ margin: "0 0 0.5rem 0" }}>
                  Total: <strong>${order.total_amount.toFixed(2)}</strong> — {order.payment_method}
                </p>
                
                <button
                  onClick={() => togglePayment(order.id, order.is_paid)}
                  style={{
                    width: "100%",
                    background: order.is_paid ? "#4CAF50" : "#f44336",
                    color: "white",
                    border: "none",
                    padding: "0.4rem",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.3s"
                  }}
                >
                  {order.is_paid ? "✅ Pagado" : "❌ No pagado"}
                </button>
              </div>

              {flow && (
                <button
                  onClick={() => advanceStatus(order.id, flow.next)}
                  style={{
                    width: "100%",
                    marginTop: "0.5rem",
                    background: "#2E7D32",
                    color: "white",
                    border: "none",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                    cursor: "pointer",
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