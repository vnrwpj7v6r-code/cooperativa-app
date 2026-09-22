"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";

type Order = {
  id: string;
  status: string;
  pickup_code: string;
  total_amount: number;
  created_at: string;
};

const STATUS_STEPS = ["recibido", "en_preparacion", "listo", "entregado"];
const STATUS_LABELS: Record<string, string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  listo: "Listo para recoger",
  entregado: "Entregado",
};

export default function MisPedidos() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const previousStatuses = useRef<Record<string, string>>({});

  async function loadOrders(userId: string) {
    const { data } = await supabase
      .from("orders")
      .select("id, status, pickup_code, total_amount, created_at")
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    const newOrders = data ?? [];

    // Si el estado de algún pedido cambió desde la última vez, y ya se
    // había cargado antes, mostramos una notificación del navegador.
    newOrders.forEach((order) => {
      const prev = previousStatuses.current[order.id];
      if (prev && prev !== order.status && Notification.permission === "granted") {
        new Notification("Cooperativa Escolar", {
          body: `Tu pedido #${order.pickup_code} ahora está: ${STATUS_LABELS[order.status]}`,
        });
      }
      previousStatuses.current[order.id] = order.status;
    });

    setOrders(newOrders);
  }

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      await loadOrders(session.user.id);

      const channel = supabase
        .channel("my-orders-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `student_id=eq.${session.user.id}` },
          () => loadOrders(session.user.id)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    init();
  }, [router]);

  return (
    <main style={{ background: "#FAFAFA", minHeight: "100vh", padding: "2rem" }}>
      <h1 style={{ color: "#2E7D32" }}>Mis pedidos</h1>

      {orders.length === 0 && <p>Aún no has hecho ningún pedido.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "500px" }}>
        {orders.map((order) => {
          const currentIndex = STATUS_STEPS.indexOf(order.status);
          return (
            <div key={order.id} style={{ background: "#A5D6A7", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>#{order.pickup_code}</span>
                <span>${order.total_amount.toFixed(2)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} style={{ textAlign: "center", flex: 1 }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        margin: "0 auto",
                        background: i <= currentIndex ? "#2E7D32" : "#e0e0e0",
                      }}
                    />
                    <p style={{ fontSize: "0.7rem", margin: "0.3rem 0 0" }}>{STATUS_LABELS[step]}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}