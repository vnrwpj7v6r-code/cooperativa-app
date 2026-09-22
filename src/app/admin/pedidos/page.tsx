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
    const { data } = await supabase
      .from("orders")
      .select(`
        id, status, payment_method, total_amount, pickup_code, created_at,
        order_items ( id, quantity, unit_price, product:products ( name ) )
      `)
      .neq("status", "entregado")
      .neq("status", "cancelado")
      .order("created_at", { ascending: true });

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
    await supabase.from("orders").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
  }

  if (checking) {
    return <p style={{ padding: "2rem" }}>Verificando acceso...</p>;
  }

  return (
    <main style={{ background: "#FAFAFA", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ background: "#2E7D32", color: "white", padding: "1rem 1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Pedidos en curso ({orders.length})</h1>
      </div>

      {orders.length === 0 && <p>No hay pedidos pendientes ahora mismo.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {orders.map((order) => {
          const flow = STATUS_FLOW[order.status];
          const minutesAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
          return (
            <div key={order.id} style={{ background: "#A5D6A7", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "1.2rem" }}>#{order.pickup_code}</span>
                <span style={{ fontSize: "0.8rem", color: "#333" }}>hace {minutesAgo} min</span>
              </div>

              <p style={{ margin: "0.3rem 0", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 700, color: "#2E7D32" }}>
                {order.status.replace("_", " ")}
              </p>

              <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
                {order.order_items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}x {item.product?.name ?? "Producto"}
                  </li>
                ))}
              </ul>

              <p style={{ margin: "0.3rem 0" }}>
                Total: <strong>${order.total_amount.toFixed(2)}</strong> — {order.payment_method}
              </p>

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