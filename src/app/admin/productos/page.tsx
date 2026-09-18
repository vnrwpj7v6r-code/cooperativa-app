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
  const [message, setMessage] = useState("");

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
    const { data } = await supabase.from("categories").select("id, name");
    setCategories(data ?? []);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("categories")
      .insert({ name: newCategoryName, organization_id: ORGANIZATION_ID });

    if (error) {
      setMessage("Error creando categoría: " + error.message);
    } else {
      setMessage("✅ Categoría creada");
      setNewCategoryName("");
      loadCategories();
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("products").insert({
      name: productName,
      price: parseFloat(price),
      stock_current: parseInt(stock),
      category_id: categoryId,
      organization_id: ORGANIZATION_ID,
      campus_id: CAMPUS_ID,
    });

    if (error) {
      setMessage("Error creando producto: " + error.message);
    } else {
      setMessage("✅ Producto creado");
      setProductName("");
      setPrice("");
      setStock("");
    }
  }

  if (checking) {
    return <p style={{ padding: "2rem" }}>Verificando acceso...</p>;
  }

  return (
    <main style={{ background: "#FAFAFA", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ background: "#2E7D32", color: "white", padding: "1rem 1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Panel de Administración — Cooperativa</h1>
      </div>

      {message && <p style={{ marginBottom: "1rem" }}>{message}</p>}

      <section style={{ background: "#A5D6A7", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem", maxWidth: "500px" }}>
        <h2>Nueva categoría</h2>
        <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Ej. Bebidas"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
            style={{ flex: 1, padding: "0.5rem", borderRadius: "4px", border: "none" }}
          />
          <button type="submit" style={{ background: "#2E7D32", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px" }}>
            Agregar
          </button>
        </form>
      </section>

      <section style={{ background: "#A5D6A7", padding: "1.5rem", borderRadius: "8px", maxWidth: "500px" }}>
        <h2>Nuevo producto</h2>
        <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            type="text"
            placeholder="Nombre del producto"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            style={{ padding: "0.5rem", borderRadius: "4px", border: "none" }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            style={{ padding: "0.5rem", borderRadius: "4px", border: "none" }}
          />
          <input
            type="number"
            placeholder="Stock inicial"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            style={{ padding: "0.5rem", borderRadius: "4px", border: "none" }}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            style={{ padding: "0.5rem", borderRadius: "4px", border: "none" }}
          >
            <option value="">Selecciona categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button type="submit" style={{ background: "#2E7D32", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px" }}>
            Guardar producto
          </button>
        </form>
      </section>
    </main>
  );
}