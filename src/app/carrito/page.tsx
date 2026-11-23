"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/supabase/client";

const ORGANIZATION_ID = "160f20fb-3203-478f-b5d4-a2b9e266c99f";
const CAMPUS_ID = "6a19b9ee-ecce-402b-ab52-3a92c69b941f";

export default function Carrito() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia">("efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  useEffect(() => {
    async function checkLogin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      }
    }
    checkLogin();
  }, [router]);

  async function handleConfirm() {
    setError("");
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const pickupCode = Math.random().toString(36).substring(2, 7).toUpperCase();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        organization_id: ORGANIZATION_ID,
        campus_id: CAMPUS_ID,
        student_id: session.user.id,
        status: "recibido",
        payment_method: paymentMethod,
        payment_status: "pendiente",
        total_amount: total,
        pickup_code: pickupCode,
      })
      .select()
      .single();

    if (orderError || !order) {
      setError("Error creando el pedido: " + (orderError?.message ?? "desconocido"));
      setLoading(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      setError("Error guardando los productos del pedido: " + itemsError.message);
      setLoading(false);
      return;
    }

    setConfirmedCode(pickupCode);
    clearCart();
    setLoading(false);
  }

  if (confirmedCode) {
    return (
      <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "2rem", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <div style={{ background: "#FFFFFF", border: "2px solid #2E7D32", padding: "2rem", borderRadius: "12px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <h1 style={{ color: "#2E7D32", marginTop: 0 }}>✅ ¡Pedido recibido!</h1>
          <p style={{ color: "#374151", fontSize: "1rem", fontWeight: 600 }}>Tu código para recoger es:</p>
          <p style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "0.1em", color: "#111111", background: "#F3F4F6", padding: "0.6rem", borderRadius: "8px", margin: "0.8rem 0 1.5rem 0" }}>
            #{confirmedCode}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link
              href="/mis-pedidos"
              style={{ background: "#2E7D32", color: "#FFFFFF", textDecoration: "none", padding: "0.8rem 1.2rem", borderRadius: "8px", fontWeight: 700 }}
            >
              Ver estado de mi pedido
            </Link>
            <Link
              href="/catalogo"
              style={{ color: "#2E7D32", textDecoration: "none", fontWeight: 700, padding: "0.5rem" }}
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "1.5rem", color: "#111111" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <h1 style={{ color: "#2E7D32", marginBottom: "1.5rem" }}>🛒 Tu carrito</h1>

        {error && (
          <p style={{ background: "#FEE2E2", color: "#B91C1C", padding: "0.8rem", borderRadius: "8px", fontWeight: 600 }}>
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div style={{ background: "#FFFFFF", padding: "1.5rem", borderRadius: "10px", border: "1px solid #D1D5DB", color: "#111111" }}>
            <p style={{ margin: 0, fontSize: "1rem" }}>
              Tu carrito está vacío.{" "}
              <Link href="/catalogo" style={{ color: "#2E7D32", fontWeight: 700 }}>
                Ir al catálogo
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #81C784",
                    padding: "1rem",
                    borderRadius: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 0.25rem 0", fontWeight: 700, color: "#111111", fontSize: "1.05rem" }}>
                      {item.name}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "#374151", fontWeight: 600 }}>
                      ${item.price.toFixed(2)} c/u
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      style={{
                        width: "32px",
                        height: "32px",
                        background: "#E8F5E9",
                        color: "#111111",
                        border: "1px solid #2E7D32",
                        borderRadius: "6px",
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        cursor: "pointer",
                      }}
                    >
                      -
                    </button>
                    <span style={{ color: "#111111", fontWeight: 800, fontSize: "1.05rem", minWidth: "20px", textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: "32px",
                        height: "32px",
                        background: "#E8F5E9",
                        color: "#111111",
                        border: "1px solid #2E7D32",
                        borderRadius: "6px",
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      title="Eliminar"
                      style={{
                        marginLeft: "0.4rem",
                        color: "#DC2626",
                        background: "#FEE2E2",
                        border: "none",
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#FFFFFF", border: "2px solid #2E7D32", padding: "1rem 1.2rem", borderRadius: "10px", marginTop: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "#111111" }}>Total a pagar:</span>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#2E7D32" }}>${total.toFixed(2)}</span>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #D1D5DB", padding: "1.2rem", borderRadius: "10px", marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 0.9rem 0", color: "#111111", fontSize: "1.1rem" }}>Forma de pago</h3>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem", color: "#111111", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={paymentMethod === "efectivo"}
                  onChange={() => setPaymentMethod("efectivo")}
                  style={{ width: "18px", height: "18px", accentColor: "#2E7D32" }}
                />
                Efectivo (al recoger)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.2rem", color: "#111111", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={paymentMethod === "transferencia"}
                  onChange={() => setPaymentMethod("transferencia")}
                  style={{ width: "18px", height: "18px", accentColor: "#2E7D32" }}
                />
                Transferencia
              </label>

              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  background: "#2E7D32",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "0.9rem 1.5rem",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  cursor: "pointer",
                  width: "100%",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                {loading ? "Confirmando..." : "Confirmar pedido"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}