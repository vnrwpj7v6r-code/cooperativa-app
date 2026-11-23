"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";

const CAMPUS_ID = "6a19b9ee-ecce-402b-ab52-3a92c69b941f";
const ORGANIZATION_ID = "160f20fb-3203-478f-b5d4-a2b9e266c99f";

const MENU_OFICIAL = [
  "Chilaquiles rojos",
  "Chilaquiles verdes",
  "Torta de Pierna",
  "Sandwich de Pavo",
  "Pay de Queso",
  "Coca cola",
  "Agua del día",
];

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  price: number;
  stock_current: number;
  category_id: string | null;
  image_url: string | null;
};

function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 450;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ProductRow({
  prod,
  onSaveDetails,
  onUpdateImage,
  onDelete,
}: {
  prod: Product;
  onSaveDetails: (id: string, newName: string, newPrice: number) => Promise<void>;
  onUpdateImage: (id: string, file: File) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
}) {
  const [editName, setEditName] = useState(prod.name);
  const [editPrice, setEditPrice] = useState(prod.price.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditName(prod.name);
    setEditPrice(prod.price.toString());
  }, [prod.name, prod.price]);

  const parsedPrice = parseFloat(editPrice);
  const hasChanges =
    editName.trim() !== prod.name ||
    (!isNaN(parsedPrice) && parsedPrice !== prod.price);

  async function handleSave() {
    if (!editName.trim()) {
      alert("El nombre del producto no puede estar vacío.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert("Ingresa un precio válido.");
      return;
    }
    setSaving(true);
    await onSaveDetails(prod.id, editName.trim(), parsedPrice);
    setSaving(false);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        padding: "1rem",
        borderRadius: "10px",
        border: hasChanges ? "2px solid #F59E0B" : "1px solid #D1D5DB",
        background: "#F9FAFB",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "240px" }}>
        {prod.image_url ? (
          <img
            src={prod.image_url}
            alt={prod.name}
            style={{
              width: "72px",
              height: "72px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "2px solid #81C784",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "8px",
              background: "#E5E7EB",
              color: "#6B7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              textAlign: "center",
              padding: "0.2rem",
              flexShrink: 0,
            }}
          >
            Sin foto
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", flex: 1 }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4B5563", display: "block", marginBottom: "0.15rem" }}>
              Nombre del producto:
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              style={{
                width: "100%",
                maxWidth: "260px",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid #9CA3AF",
                background: "#FFFFFF",
                color: "#111111",
                fontWeight: 700,
                fontSize: "0.98rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#374151" }}>Precio: $</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              style={{
                width: "90px",
                padding: "0.35rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid #9CA3AF",
                background: "#FFFFFF",
                color: "#111111",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: hasChanges ? "#F59E0B" : "#1565C0",
            color: hasChanges ? "#111111" : "#FFFFFF",
            border: "none",
            padding: "0.5rem 0.85rem",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {saving ? "Guardando..." : "💾 Guardar"}
        </button>

        <label
          style={{
            background: "#2E7D32",
            color: "#FFFFFF",
            padding: "0.5rem 0.85rem",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          📷 {prod.image_url ? "Cambiar foto" : "Subir foto"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpdateImage(prod.id, file);
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => onDelete(prod.id, prod.name)}
          style={{
            background: "#FEE2E2",
            color: "#B91C1C",
            border: "1px solid #FCA5A5",
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
}

export default function AdminProductos() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [procesandoMenu, setProcesandoMenu] = useState(false);
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

  async function loadData() {
    const { data: catData } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    setCategories(catData ?? []);

    const { data: prodData } = await supabase
      .from("products")
      .select("id, name, price, stock_current, category_id, image_url")
      .order("name");
    setProducts((prodData as Product[]) ?? []);
  }

  useEffect(() => {
    loadData();
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
      loadData();
    }
  }

  async function handleFileSelectNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await comprimirImagen(file);
      setImageUrl(compressed);
    } catch {
      setMessage({ text: "No se pudo procesar la imagen seleccionada.", isError: true });
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
      image_url: imageUrl.trim() || null,
    });

    if (error) {
      setMessage({ text: "Error creando producto: " + error.message, isError: true });
    } else {
      setMessage({ text: "✅ Producto agregado al catálogo.", isError: false });
      setProductName("");
      setPrice("");
      setStock("");
      setCategoryId("");
      setImageUrl("");
      loadData();
    }
  }

  async function handleSaveProductDetails(productId: string, newName: string, newPrice: number) {
    setMessage(null);
    const { error } = await supabase
      .from("products")
      .update({ name: newName, price: newPrice })
      .eq("id", productId);

    if (error) {
      setMessage({ text: "Error actualizando producto: " + error.message, isError: true });
    } else {
      setMessage({ text: `✅ "${newName}" actualizado correctamente.`, isError: false });
      await loadData();
    }
  }

  async function handleUpdateProductImage(productId: string, file: File) {
    try {
      const compressed = await comprimirImagen(file);
      const { error } = await supabase
        .from("products")
        .update({ image_url: compressed })
        .eq("id", productId);

      if (error) {
        setMessage({ text: "Error guardando imagen: " + error.message, isError: true });
      } else {
        setMessage({ text: "✅ Imagen actualizada.", isError: false });
        loadData();
      }
    } catch {
      setMessage({ text: "Error procesando la imagen.", isError: true });
    }
  }

  async function handleDeleteProduct(productId: string, prodName: string) {
    if (!confirm(`¿Seguro que deseas eliminar "${prodName}" del menú?`)) return;

    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      setMessage({
        text: `No se pudo borrar "${prodName}" porque tiene pedidos históricos asociados. Puedes poner su stock en 0 en Inventario.`,
        isError: true,
      });
    } else {
      setMessage({ text: `🗑️ "${prodName}" eliminado del menú.`, isError: false });
      loadData();
    }
  }

  async function handleSyncMenuOficial() {
    if (!confirm("Esto eliminará los productos que no estén en tu lista de 7 platillos/bebidas y agregará los que falten. ¿Continuar?")) {
      return;
    }

    setProcesandoMenu(true);
    setMessage(null);

    try {
      let defaultCatId = categories[0]?.id;
      if (!defaultCatId) {
        const { data: newCat } = await supabase
          .from("categories")
          .insert({ name: "Menú", organization_id: ORGANIZATION_ID })
          .select("id")
          .single();
        defaultCatId = newCat?.id;
      }

      const oficialesLower = MENU_OFICIAL.map((n) => n.toLowerCase().trim());

      for (const prod of products) {
        if (!oficialesLower.includes(prod.name.toLowerCase().trim())) {
          await supabase.from("products").delete().eq("id", prod.id);
        }
      }

      const actualesLower = products.map((p) => p.name.toLowerCase().trim());
      const faltantes = MENU_OFICIAL.filter(
        (nombre) => !actualesLower.includes(nombre.toLowerCase().trim())
      );

      if (faltantes.length > 0 && defaultCatId) {
        const nuevosRegistros = faltantes.map((nombre) => ({
          name: nombre,
          price: 0,
          stock_current: 20,
          category_id: defaultCatId,
          organization_id: ORGANIZATION_ID,
          campus_id: CAMPUS_ID,
          image_url: null,
        }));

        await supabase.from("products").insert(nuevosRegistros);
      }

      await loadData();
      setMessage({
        text: "✅ Menú sincronizado con los 7 productos oficiales. Ahora puedes asignarles su precio y foto abajo.",
        isError: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setMessage({ text: "Error sincronizando menú: " + msg, isError: true });
    } finally {
      setProcesandoMenu(false);
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
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <div style={{ background: "#2E7D32", color: "#FFFFFF", padding: "1.2rem 1.5rem", borderRadius: "10px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <h1 style={{ margin: 0, fontSize: "1.45rem" }}>🍎 Administración de Productos</h1>
          <button
            onClick={handleSyncMenuOficial}
            disabled={procesandoMenu}
            style={{
              background: "#F59E0B",
              color: "#111111",
              border: "none",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            {procesandoMenu ? "Sincronizando..." : "📋 Dejar solo los 7 productos del menú"}
          </button>
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

        {/* SECCIÓN: PRODUCTOS ACTUALES EN EL MENÚ (EDITAR NOMBRE, PRECIO Y FOTO) */}
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
            🍽️ Productos en tu menú ({products.length})
          </h2>

          {products.length === 0 ? (
            <p style={{ color: "#4B5563" }}>No hay productos registrados. Usa el botón naranja de arriba para cargar tus 7 productos.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {products.map((prod) => (
                <ProductRow
                  key={prod.id}
                  prod={prod}
                  onSaveDetails={handleSaveProductDetails}
                  onUpdateImage={handleUpdateProductImage}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
        </section>

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
          <h2 style={{ margin: "0 0 1rem 0", color: "#2E7D32", fontSize: "1.2rem" }}>
            📂 Nueva categoría
          </h2>

          <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Ej. Desayunos, Bebidas, Postres..."
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
        </section>

        {/* SECCIÓN: NUEVO PRODUCTO CON IMAGEN */}
        <section
          style={{
            background: "#FFFFFF",
            border: "2px solid #81C784",
            padding: "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ margin: "0 0 1.2rem 0", color: "#2E7D32", fontSize: "1.2rem" }}>
            🥪 Agregar producto manualmente
          </h2>

          <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Nombre del producto</label>
              <input
                type="text"
                placeholder="Ej. Chilaquiles rojos"
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

            <div>
              <label style={labelStyle}>Imagen de referencia (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelectNew}
                style={{ ...inputStyle, padding: "0.5rem" }}
              />
              {imageUrl && (
                <div style={{ marginTop: "0.6rem" }}>
                  <img
                    src={imageUrl}
                    alt="Vista previa"
                    style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "8px", border: "2px solid #2E7D32" }}
                  />
                </div>
              )}
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