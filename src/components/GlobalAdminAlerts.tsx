"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/supabase/client";

export default function GlobalAdminAlerts() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [alertaNuevoPedido, setAlertaNuevoPedido] = useState<{
    code: string;
    total: number;
  } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  function obtenerAudioContext() {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  function reproducirAlertaSonora() {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("coop_audio_enabled") !== "true") return;

    try {
      const ctx = obtenerAudioContext();
      if (!ctx) return;

      [0, 0.35].forEach((delay) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now); // Mi5
        osc.frequency.setValueAtTime(880, now + 0.14); // La5
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.32);
      });
    } catch (e) {
      console.log("Audio en espera de interacción:", e);
    }
  }

  // Verificar si el usuario actual es administrador u operador (y reaccionar al iniciar/cerrar sesión)
  useEffect(() => {
    let mounted = true;

    async function verifyRole(userId?: string) {
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }

      if (!userId) {
        if (mounted) {
          setIsAdmin(false);
          knownOrderIdsRef.current = null;
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (mounted) {
        const authorized = profile?.role === "admin" || profile?.role === "operator";
        setIsAdmin(authorized);
      }
    }

    verifyRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      verifyRole(session?.user?.id);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Mantener desbloqueado el audio en cualquier pantalla si el admin ya activó las alertas
  useEffect(() => {
    if (!isAdmin) return;

    const unlockIfEnabled = () => {
      if (localStorage.getItem("coop_audio_enabled") === "true") {
        obtenerAudioContext();
      }
    };

    const handleManualActivateAndTest = () => {
      localStorage.setItem("coop_audio_enabled", "true");
      obtenerAudioContext();
      reproducirAlertaSonora();
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    };

    window.addEventListener("pointerdown", unlockIfEnabled);
    window.addEventListener("coop-audio-activate", handleManualActivateAndTest);

    return () => {
      window.removeEventListener("pointerdown", unlockIfEnabled);
      window.removeEventListener("coop-audio-activate", handleManualActivateAndTest);
    };
  }, [isAdmin]);

  // Parpadeo en la pestaña del navegador cuando llega un pedido nuevo
  useEffect(() => {
    if (!alertaNuevoPedido) {
      document.title = "Cooperativa Escolar";
      return;
    }

    let toggle = false;
    const titleInterval = setInterval(() => {
      document.title = toggle
        ? `🔔 ¡PEDIDO #${alertaNuevoPedido.code}!`
        : "🍎 Cooperativa Escolar";
      toggle = !toggle;
    }, 850);

    return () => {
      clearInterval(titleInterval);
      document.title = "Cooperativa Escolar";
    };
  }, [alertaNuevoPedido]);

  // Escucha global de nuevos pedidos en tiempo real + respaldo cada 5 segundos
  useEffect(() => {
    if (!isAdmin) return;

    async function checkNewOrders() {
      const { data: activeData } = await supabase
        .from("orders")
        .select("id, pickup_code, total_amount")
        .neq("status", "entregado")
        .neq("status", "cancelado");

      if (!activeData) return;

      if (knownOrderIdsRef.current === null) {
        knownOrderIdsRef.current = new Set(activeData.map((o) => o.id));
        return;
      }

      const nuevos = activeData.filter((o) => !knownOrderIdsRef.current!.has(o.id));
      if (nuevos.length > 0) {
        nuevos.forEach((n) => knownOrderIdsRef.current!.add(n.id));
        const ultimo = nuevos[nuevos.length - 1];

        reproducirAlertaSonora();
        setAlertaNuevoPedido({
          code: ultimo.pickup_code,
          total: ultimo.total_amount,
        });

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("🍎 Nuevo pedido en Cooperativa", {
            body: `Pedido #${ultimo.pickup_code} por $${ultimo.total_amount.toFixed(2)}`,
          });
        }
      }
    }

    checkNewOrders();

    const channel = supabase
      .channel("global-admin-orders-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        setTimeout(() => checkNewOrders(), 500);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, () => {
        setTimeout(() => checkNewOrders(), 300);
      })
      .subscribe();

    const interval = setInterval(() => {
      checkNewOrders();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAdmin]);

  if (!isAdmin || !alertaNuevoPedido) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "#F59E0B",
        color: "#111111",
        padding: "0.85rem 1.25rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.75rem",
        fontWeight: 800,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        borderBottom: "2px solid #B45309",
      }}
    >
      <span style={{ fontSize: "1rem" }}>
        🔔 ¡Nuevo pedido recibido #{alertaNuevoPedido.code} (${alertaNuevoPedido.total.toFixed(2)})!
      </span>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {pathname !== "/admin/pedidos" && (
          <Link
            href="/admin/pedidos"
            onClick={() => setAlertaNuevoPedido(null)}
            style={{
              background: "#2E7D32",
              color: "#FFFFFF",
              textDecoration: "none",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.88rem",
              fontWeight: 800,
            }}
          >
            Ver en Pedidos →
          </Link>
        )}

        <button
          onClick={() => setAlertaNuevoPedido(null)}
          style={{
            background: "#111111",
            color: "#FFFFFF",
            border: "none",
            padding: "0.45rem 0.85rem",
            borderRadius: "6px",
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}