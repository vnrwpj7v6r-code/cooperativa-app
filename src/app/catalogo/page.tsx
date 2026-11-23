"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";
import { useCart } from "@/context/CartContext";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_current: number;
  image_url: string | null;
  category_id: string;
};

type Category = { id: string; name: string };

export default function Catalogo() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const { addItem, items } = useCart();

  async function loadData() {
    const { data: prods, error } = await supabase
      .from("products")
      .select("id, name, description, price, stock_current, image_url, category_id")
      .eq("is_active", true)
      .order("name");

    const { data: cats } = await supabase.from("categories").select("id, name");

    setProducts(prods ?? []);
    setCategories(cats ?? []);
    setErrorMsg(error ? error.message : null);
  }

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? "";
  }

  function handleAddToCart(product: Product) {
    addItem({ id: product.id, name: product.name, price: product.price });
    setAddedId(product.id);
    setTimeout(() => {
      setAddedId((prev) => (prev === product.id ? null : prev));
    }, 900);
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", boxSizing: "border-box", overflowX: "hidden" }}>
      {/* Encabezado */}
      <div style={{ background: "#2E7D32", color: "#FFFFFF", padding: "1.4rem 1.5rem", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>🍎 Cooperativa Escolar</h1>
          <p style={{ margin: "0.25rem 0 0", opacity: 0.95, fontSize: "1rem" }}>Catálogo del día</p>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.2rem 1.5rem 2.5rem", boxSizing: "border-box" }}>
        {/* Barra superior con botón de carrito bien encuadrado */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.2rem" }}>
          <Link
            href="/carrito"
            style={{
              background: "#FFFFFF",
              color: "#2E7D32",
              border: "2px solid #2E7D32",
              padding: "0.6rem 1.1rem",
              borderRadius: "999px",
              fontWeight: 800,
              fontSize: "0.95rem",
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            🛒 Ver carrito ({totalItems})
          </Link>
        </div>

        {errorMsg && (
          <p style={{ background: "#FEE2E2", color: "#B91C1C", padding: "1rem", borderRadius: "8px", fontWeight: 700, textAlign: "center" }}>
            Error: {errorMsg}
          </p>
        )}

        {products.length === 0 && !errorMsg && (
          <p style={{ background: "#FFFFFF", color: "#374151", padding: "1.5rem", borderRadius: "10px", textAlign: "center", fontWeight: 600 }}>
            Aún no hay productos disponibles.
          </p>
        )}

        {/* Cuadrícula responsiva de productos */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))",
            gap: "1.25rem",
            width: "100%",
          }}
        >
          {products.map((product) => {
            const inStock = product.stock_current > 0;
            const isAdded = addedId === product.id;

            return (
              <div
                key={product.id}
                style={{
                  background: "#FFFFFF",
                  border: "2px solid #81C784",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  boxSizing: "border-box",
                }}
              >
                {/* Imagen de referencia */}
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "160px",
                      borderRadius: "8px",
                      background: "#F3F4F6",
                      color: "#6B7280",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                    }}
                  >
                    🍽️ Sin imagen
                  </div>
                )}

                {categoryName(product.category_id) && (
                  <span
                    style={{
                      alignSelf: "flex-start",
                      background: "#E8F5E9",
                      color: "#1B5E20",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                    }}
                  >
                    {categoryName(product.category_id)}
                  </span>
                )}

                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#111111", fontWeight: 800 }}>
                  {product.name}
                </h3>

                {product.description && (
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "#4B5563" }}>
                    {product.description}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.4rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#2E7D32" }}>
                    ${product.price.toFixed(2)}
                  </span>
                  <span
                    style={{
                      background: inStock ? "#DCFCE7" : "#FEE2E2",
                      color: inStock ? "#15803D" : "#B91C1C",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      padding: "0.25rem 0.6rem",
                      borderRadius: "999px",
                    }}
                  >
                    {inStock ? `En stock (${product.stock_current})` : "Agotado"}
                  </span>
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={!inStock}
                  style={{
                    marginTop: "0.35rem",
                    background: !inStock ? "#D1D5DB" : isAdded ? "#10B981" : "#2E7D32",
                    color: !inStock ? "#6B7280" : "#FFFFFF",
                    border: "none",
                    padding: "0.7rem",
                    borderRadius: "8px",
                    cursor: inStock ? "pointer" : "not-allowed",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    transition: "background 0.2s",
                  }}
                >
                  {!inStock ? "No disponible" : isAdded ? "✅ ¡Agregado!" : "Agregar al carrito"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}