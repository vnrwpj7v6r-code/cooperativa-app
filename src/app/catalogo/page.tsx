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

  return (
    <main style={{ background: "#FAFAFA", minHeight: "100vh" }}>
      <div style={{ background: "#2E7D32", color: "white", padding: "1.5rem 2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🍎 Cooperativa Escolar</h1>
        <p style={{ margin: "0.25rem 0 0", opacity: 0.9 }}>Catálogo del día</p>
      </div>

      <div style={{ padding: "1rem 2rem 0", textAlign: "right" }}>
       <Link href="/carrito" style={{ color: "#2E7D32", fontWeight: 700, textDecoration: "none" }}>
          🛒 Ver carrito ({items.reduce((sum, i) => sum + i.quantity, 0)})
        </Link>
      </div>

      <div
        style={{
          padding: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {errorMsg && (
          <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "red" }}>
            Error: {errorMsg}
          </p>
        )}

        {products.length === 0 && !errorMsg && (
          <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#666" }}>
            Aún no hay productos disponibles.
          </p>
        )}

        {products.map((product) => {
          const inStock = product.stock_current > 0;
          return (
            <div
              key={product.id}
              style={{
                background: "#A5D6A7",
                borderRadius: "12px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#2E7D32", fontWeight: 600 }}>
                {categoryName(product.category_id)}
              </span>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{product.name}</h3>
              {product.description && (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#333" }}>
                  {product.description}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  ${product.price.toFixed(2)}
                </span>
                <span
                  style={{
                    background: inStock ? "#CDDC39" : "#e0e0e0",
                    color: inStock ? "#2E7D32" : "#888",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.25rem 0.6rem",
                    borderRadius: "999px",
                  }}
                >
                  {inStock ? `En stock (${product.stock_current})` : "Agotado"}
                </span>
              </div>
              <button
                onClick={() => addItem({ id: product.id, name: product.name, price: product.price })}
                disabled={!inStock}
                style={{
                  background: inStock ? "#2E7D32" : "#ccc",
                  color: "white",
                  border: "none",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  cursor: inStock ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                {inStock ? "Agregar al carrito" : "No disponible"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}