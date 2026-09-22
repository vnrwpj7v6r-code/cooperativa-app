"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
      <main style={{ background: "#FAFAFA", minHeight: "100vh", padding: "2rem", display: "flex", justifyContent: "center" }}>
        <div style={{ background: "#A5D6A7", padding: "2rem", borderRadius: "12px", maxWidth: "400px", textAlign: "center" }}>
          <h1 style={{ color: "#2E7D32" }}>✅ ¡Pedido recibido!</h1>
          <p>Tu código para recoger es:</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "0.1em" }}>{confirmedCode}</p>
          <a href="/catalogo" style={{ color: "#2E7D32", fontWeight: 600 }}>Volver al catálogo</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "#FAFAFA", minHeight: "100vh", padding: "2rem" }}>
      <h1 style={{ color: "#2E7D32" }}>🛒 Tu carrito</h1>

      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      {items.length === 0 ? (
        <p>Tu carrito está vacío. <a href="/catalogo" style={{ color: "#2E7D32" }}>Ir al catálogo</a></p>
      ) : (
        <>
          <div style={{ maxWidth: "500px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#A5D6A7",
                  padding: "1rem",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>${item.price.toFixed(2)} c/u</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: "0.2rem 0.6rem" }}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: "0.2rem 0.6rem" }}>+</button>
                  <button onClick={() => removeItem(item.id)} style={{ marginLeft: "0.5rem", color: "#b00020", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "1rem" }}>Total: ${total.toFixed(2)}</p>

          <div style={{ maxWidth: "500px", marginTop: "1.5rem" }}>
            <h3>Forma de pago</h3>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <input
                type="radio"
                checked={paymentMethod === "efectivo"}
                onChange={() => setPaymentMethod("efectivo")}
              />{" "}
              Efectivo (al recoger)
            </label>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              <input
                type="radio"
                checked={paymentMethod === "transferencia"}
                onChange={() => setPaymentMethod("transferencia")}
              />{" "}
              Transferencia
            </label>

            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                background: "#2E7D32",
                color: "white",
                border: "none",
                padding: "0.8rem 1.5rem",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {loading ? "Confirmando..." : "Confirmar pedido"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}