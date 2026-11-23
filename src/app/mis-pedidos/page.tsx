"use client";

import { useEffect, useRef, useState } from "react";
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

type Notificacion = {
  id: string;
  texto: string;
  hora: string;
};

const STEPS = [
  { key: "recibido", label: "Recibido" },
  { key: "en_preparacion", label: "En preparación" },
  { key: "listo", label: "Listo para recoger" },
  { key: "entregado", label: "Entregado" },
];

const STATUS_LABELS: Record<string, string> = {
  recibido: "📥 Pedido recibido",
  en_preparacion: "👨‍🍳 En preparación",
  listo: "🎉 ¡Listo para recoger!",
  entregado: "✅ Entregado",
  cancelado: "❌ Cancelado",
};

export default function MisPedidos() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [audioActivo, setAudioActivo] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  function obtenerAudioContext() {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function reproducirSonido() {
    try {
      const ctx = obtenerAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880, now + 0.16); // A5
      osc.frequency.setValueAtTime(1046.5, now + 0.32); // C6
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.log("Audio pendiente de interacción:", e);
    }
  }

  function activarAlertas() {
    obtenerAudioContext();
    setAudioActivo(true);
    reproducirSonido();

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    setNotificaciones((prev) => [
      {
        id: Date.now().toString(),
        texto: "✅ Avisos con sonido activados. Te notificaremos cada cambio de estado.",
        hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...prev,
    ]);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let knownStatuses: Record<string, string> | null = null;

    const handleFirstClick = () => {
      obtenerAudioContext();
      setAudioActivo(true);
    };
    window.addEventListener("click", handleFirstClick, { once: true });

    async function syncOrders(userId: string) {
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
        setLoading(false);
        return;
      }

      const typed = (data as unknown as Order[]) ?? [];
      setOrders(typed);
      setLoading(false);

      if (knownStatuses === null) {
        knownStatuses = {};
        typed.forEach((o) => {
          knownStatuses![o.id] = o.status;
        });
      } else {
        typed.forEach((o) => {
          const prevStatus = knownStatuses![o.id];
          if (prevStatus && prevStatus !== o.status) {
            const etiqueta = STATUS_LABELS[o.status] ?? o.status;
            const mensaje = `Tu pedido #${o.pickup_code} cambió a: ${etiqueta}`;

            reproducirSonido();

            setNotificaciones((prev) => [
              {
                id: `${o.id}-${o.status}-${Date.now()}`,
                texto: mensaje,
                hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
              ...prev,
            ]);

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("🍎 Actualización de tu pedido", { body: mensaje });
            }
          }
          knownStatuses![o.id] = o.status;
        });
      }
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;
      await syncOrders(userId);

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
          () => {
            syncOrders(userId);
          }
        )
        .subscribe();

      interval = setInterval(() => {
        syncOrders(userId);
      }, 6000);
    }

    init();

    return () => {
      window.removeEventListener("click", handleFirstClick);
      if (channel) supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [router]);

  if (loading) {
    return <p style={{ padding: "2rem", color: "#111111" }}>Cargando tus pedidos...</p>;
  }

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "1.5rem", color: "#111111" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        
        {/* SECCIÓN DE NOTIFICACIONES */}
        <section
          style={{
            background: "#FFFFFF",
            border: "2px solid #2E7D32",
            borderRadius: "12px",
            padding: "1rem 1.2rem",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#2E7D32" }}>
              🔔 Notificaciones de tus pedidos
            </h2>
            <button
              onClick={activarAlertas}
              style={{
                background: audioActivo ? "#10B981" : "#F59E0B",
                color: audioActivo ? "#FFFFFF" : "#111111",
                border: "none",
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {audioActivo ? "✅ Sonido activo (Probar timbre)" : "🔊 Activar sonido de aviso"}
            </button>
          </div>

          {notificaciones.length === 0 ? (
            <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.9rem", color: "#4B5563" }}>
              Aquí aparecerán las alertas en vivo cuando preparen o tengan listo tu pedido.
            </p>
          ) : (
            <ul style={{ margin: "0.8rem 0 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {notificaciones.map((n) => (
                <li
                  key={n.id}
                  style={{
                    background: "#FEF3C7",
                    borderLeft: "4px solid #F59E0B",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#111111",
                  }}
                >
                  <span>{n.texto}</span>
                  <span style={{ fontSize: "0.8rem", color: "#4B5563", marginLeft: "0.5rem" }}>{n.hora}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <h1 style={{ color: "#2E7D32", marginBottom: "1rem", fontSize: "1.6rem" }}>🧾 Mis pedidos</h1>

        {orders.length === 0 ? (
          <div style={{ background: "#FFFFFF", padding: "1.5rem", borderRadius: "10px", border: "1px solid #D1D5DB" }}>
            <p style={{ margin: 0, color: "#111111" }}>
              Aún no has realizado pedidos.{" "}
              <Link href="/catalogo" style={{ color: "#2E7D32", fontWeight: 700 }}>
                Ir al catálogo
              </Link>
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {orders.map((order) => {
              const currentStepIndex = STEPS.findIndex((s) => s.key === order.status);

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #81C784",
                    borderRadius: "12px",
                    padding: "1.3rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "#4B5563", fontWeight: 600, display: "block" }}>
                        CÓDIGO DE RETIRO
                      </span>
                      <strong style={{ fontSize: "1.45rem", color: "#2E7D32", letterSpacing: "0.05em" }}>
                        #{order.pickup_code}
                      </strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "1.35rem", color: "#111111", display: "block" }}>
                        ${order.total_amount.toFixed(2)}
                      </strong>
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: "0.2rem",
                          background: order.is_paid ? "#DCFCE7" : "#FEF3C7",
                          color: order.is_paid ? "#15803D" : "#B45309",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                        }}
                      >
                        {order.is_paid ? "✅ Pagado" : "⏳ Pago pendiente"}
                      </span>
                    </div>
                  </div>

                  {order.status === "cancelado" ? (
                    <div style={{ background: "#FEE2E2", color: "#B91C1C", padding: "0.75rem", borderRadius: "8px", fontWeight: 800, textAlign: "center", marginBottom: "1rem" }}>
                      ❌ Pedido cancelado
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem", marginBottom: "1rem", background: "#F9FAFB", padding: "0.8rem 0.5rem", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
                      {STEPS.map((step, idx) => {
                        const completed = idx <= currentStepIndex;
                        return (
                          <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: completed ? "#2E7D32" : "#E5E7EB",
                                color: completed ? "#FFFFFF" : "#6B7280",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "0.85rem",
                                marginBottom: "0.35rem",
                              }}
                            >
                              {completed ? "✓" : idx + 1}
                            </div>
                            <span
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: completed ? 800 : 600,
                                color: completed ? "#111111" : "#6B7280",
                                lineHeight: 1.2,
                              }}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#111111", fontSize: "0.95rem" }}>
                    {order.order_items.map((item) => (
                      <li key={item.id} style={{ marginBottom: "0.25rem" }}>
                        <strong>{item.quantity}x</strong> {item.product?.name ?? "Producto"}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}