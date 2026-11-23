"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";

const CAMPUS_ID = "6a19b9ee-ecce-402b-ab52-3a92c69b941f";
const ORGANIZATION_ID = "160f20fb-3203-478f-b5d4-a2b9e266c99f";

type Category = { id: string; name: string };

export default function AdminProductos() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

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

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setCategories(data ?? []);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase
      .from("categories")
      .insert({ name: newCategoryName.trim(), organization_id: ORGANIZATION_ID });

    if (error) {
      setMessage({ text: "Error creando categoría: " + error.message, isError: true });
    } else {
      setMessage({ text: "✅ Categoría creada correctamente.", isError: false });
      setNewCategoryName("");
      loadCategories();
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("products").insert({
      name: productName.trim(),
      price: parseFloat(price),
      stock_current: parseInt(stock, 10),
      category_id: categoryId,
      organization_id: ORGANIZATION_ID,
      campus_id: CAMPUS_ID,
    });

    if (error) {
      setMessage({ text: "Error creando producto: " + error.message, isError: true });
    } else {
      setMessage({ text: "✅ Producto agregado al catálogo.", isError: false });
      setProductName("");
      setPrice("");
      setStock("");
      setCategoryId("");
    }
  }

  if (checking) {
    return <p style={{ padding: "2rem", color: "#111111" }}>Verificando acceso...</p>;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "2px solid #9CA3AF",
    backgroundColor: "#FFFFFF",
    color: "#111111",
    fontSize: "1rem",
    fontWeight: 500,
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.35rem",
    color: "#111111",
    fontWeight: 700,
    fontSize: "0.95rem",
  };

  return (
    <main style={{ background: "#E8F5E9", minHeight: "100vh", padding: "1.5rem", color: "#111111" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ background: "#2E7D32", color: "#FFFFFF", padding: "1.2rem 1.5rem", borderRadius: "10px", marginBottom: "1.5rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🍎 Administración de Productos</h1>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "1.2rem",
              padding: "0.9rem 1.2rem",
              borderRadius: "8px",
              fontWeight: 700,
              background: message.isError ? "#FEE2E2" : "#DCFCE7",
              color: message.isError ? "#B91C1C" : "#15803D",
              border: `1px solid ${message.isError ? "#F87171" : "#4ADE80"}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* SECCIÓN: NUEVA CATEGORÍA */}
        <section
          style={{
            background: "#FFFFFF",
            border: "2px solid #81C784",
            padding: "1.5rem",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ margin: "0 0 1rem 0", color: "#2E7D32", fontSize: "1.25rem" }}>
            📂 Nueva categoría
          </h2>

          <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Ej. Bebidas, Snacks, Comida..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              style={{ ...inputStyle, flex: 1, minWidth: "200px" }}
            />
            <button
              type="submit"
              style={{
                background: "#2E7D32",
                color: "#FFFFFF",
                border: "none",
                padding: "0.75rem 1.4rem",
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              Agregar
            </button>
          </form>

          {categories.length > 0 && (
            <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid #E5E7EB" }}>
              <span style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 700, display: "block", marginBottom: "0.5rem" }}>
                Categorías existentes:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {categories.map((cat) => (
                  <span
                    key={cat.id}
                    style={{
                      background: "#E8F5E9",
                      color: "#1B5E20",
                      border: "1px solid #81C784",
                      padding: "0.25rem 0.65rem",
                      borderRadius: "999px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECCIÓN: NUEVO PRODUCTO */}
        <section
          style={{
            background: "#FFFFFF",
            border: "2px solid #81C784",
            padding: "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ margin: "0 0 1.2rem 0", color: "#2E7D32", fontSize: "1.25rem" }}>
            🥪 Nuevo producto
          </h2>

          <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Nombre del producto</label>
              <input
                type="text"
                placeholder="Ej. Sándwich de jamón"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <div>
                <label style={labelStyle}>Precio ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Stock inicial</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">Selecciona una categoría...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              style={{
                marginTop: "0.5rem",
                background: "#2E7D32",
                color: "#FFFFFF",
                border: "none",
                padding: "0.9rem 1.5rem",
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "1.05rem",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              Guardar producto
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}