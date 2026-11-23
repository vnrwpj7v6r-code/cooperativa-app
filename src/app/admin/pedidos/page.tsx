"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  order_items: OrderItem[];
};

const STATUS_INFO: Record<string, { label: string; bg: string; color: string; message: string }> = {
  recibido: {
    label: "📥 Recibido",
    bg: "#E0F2FE",
    color: "#0369A1",
    message: "Tu pedido fue recibido por la cooperativa.",
  },
  en_preparacion: {
    label: "👨‍🍳 En preparación",
    bg: "#FEF3C7",
    color: "#B45309",
    message: "¡Ya están preparando tus alimentos!",
  },
  listo: {
    label: "🎉 ¡Listo para recoger!",
    bg: "#DCFCE7",
    color: "#15803D",
    message: "¡Tu pedido está listo! Pasa a recogerlo con tu código.",
  },
  entregado: {
    label: "✅ Entregado",
    bg: "#F3F4F6",
    color: "#374151",
    message: "Pedido entregado. ¡Buen provecho!",
  },
  cancelado: {
    label: "❌ Cancelado",
    bg: "#FEE2E2",
    color: "#B91C1C",
    message: "Este pedido fue cancelado.",
  },
};

export default function MisPedidos() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  function reproducirSonido() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.log("Sonido en espera de interacción");
    }
  }

  function activarAlertas() {
    reproducirSonido();
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          alert("✅ Avisos activados. Te notificaremos cuando tu pedido cambie de estado.");
        }
      });
    }
  }

  async function loadMyOrders(userId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, status, payment_method, total_amount, pickup_code, created_at, is_paid,
        order_items ( id, quantity, unit_price, product:products ( name ) )
      `)
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando mis pedidos:", error);
    }
    setOrders((data as unknown as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let channel: any;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;
      await loadMyOrders(userId);

      channel = supabase
        .channel(`mis-pedidos-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `student_id=eq.${userId}`,
          },
          (payload) => {
            const nuevoEstado = payload.new?.status as string;
            const codigo = payload.new?.pickup_code as string;
            const info = STATUS_INFO[nuevoEstado];

            reproducirSonido();
            const textoAlerta = `🔔 Pedido #${codigo}: ${info ? info.label : nuevoEstado}`;
            setNotificacion(textoAlerta);

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("🍎 Actualización de tu pedido", {
                body: `Tu pedido #${codigo} ahora está: ${info ? info.label : nuevoEstado}`,
              });
            }

            loadMyOrders(userId);
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router]);

  if (loading) {
    return <p style={{ padding: "2rem", color: "#111111" }}>Cargando tus pedidos...</p>;
  }

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "1.5rem", color: "#111111" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {notificacion && (
          <div style={{ background: "#F59E0B", color: "#111111", padding: "1rem 1.2rem", borderRadius: "10px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
            <span>{notificacion}</span>
            <button
              onClick={() => setNotificacion(null)}
              style={{ background: "#111111", color: "#FFFFFF", border: "none", padding: "0.35rem 0.75rem", borderRadius: "6px", cursor: "pointer" }}
            >
              OK
            </button>
          </div>
        )}

        <div style={{ background: "#2E7D32", color: "#FFFFFF", padding: "1.2rem 1.5rem", borderRadius: "10px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🧾 Mis pedidos</h1>
          <button
            onClick={activarAlertas}
            style={{ background: "rgba(255,255,255,0.2)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.6)", padding: "0.4rem 0.8rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
          >
            🔔 Activar avisos con sonido
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{ background: "#FFFFFF", padding: "1.5rem", borderRadius: "10px", border: "1px solid #D1D5DB" }}>
            <p style={{ margin: 0, color: "#111111" }}>
              Aún no has realizado pedidos.{" "}
              <Link href="/catalogo" style={{ color: "#2E7D32", fontWeight: 700 }}>
                Ver catálogo
              </Link>
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {orders.map((order) => {
              const info = STATUS_INFO[order.status] ?? {
                label: order.status,
                bg: "#F3F4F6",
                color: "#111111",
                message: "",
              };

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #81C784",
                    borderRadius: "12px",
                    padding: "1.2rem",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", borderBottom: "1px solid #E5E7EB", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <span style={{ fontSize: "0.85rem", color: "#4B5563", display: "block" }}>Código de entrega</span>
                      <strong style={{ fontSize: "1.4rem", color: "#2E7D32" }}>#{order.pickup_code}</strong>
                    </div>

                    <span
                      style={{
                        background: info.bg,
                        color: info.color,
                        padding: "0.45rem 0.9rem",
                        borderRadius: "999px",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                      }}
                    >
                      {info.label}
                    </span>
                  </div>

                  {info.message && (
                    <p style={{ margin: "0 0 0.8rem 0", color: "#1F2937", fontWeight: 600, fontSize: "0.95rem" }}>
                      {info.message}
                    </p>
                  )}

                  <ul style={{ margin: "0 0 1rem 0", paddingLeft: "1.2rem", color: "#111111" }}>
                    {order.order_items.map((item) => (
                      <li key={item.id} style={{ marginBottom: "0.25rem" }}>
                        <strong>{item.quantity}x</strong> {item.product?.name ?? "Producto"}
                      </li>
                    ))}
                  </ul>

                  <div style={{ background: "#F9FAFB", padding: "0.8rem", borderRadius: "8px", border: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ color: "#111111", fontSize: "1rem" }}>
                      Total: <strong style={{ color: "#2E7D32" }}>${order.total_amount.toFixed(2)}</strong> ({order.payment_method})
                    </span>
                    <span
                      style={{
                        background: order.is_paid ? "#DCFCE7" : "#FEF3C7",
                        color: order.is_paid ? "#15803D" : "#B45309",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "6px",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                      }}
                    >
                      {order.is_paid ? "✅ Pagado" : "⏳ Pendiente de pago"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}