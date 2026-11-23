"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabase/client";

export default function InventarioAdmin() {
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error cargando productos:", error);
    } else if (data) {
      setProductos(data);
    }
    setCargando(false);
  }

  async function handleActualizarStock(id: string, nuevoStock: number) {
    const { error } = await supabase
      .from("products")
      .update({ stock_current: nuevoStock })
      .eq("id", id);

    if (error) {
      alert("Hubo un error al actualizar: " + error.message);
    } else {
      alert("✅ ¡Stock actualizado correctamente!");
    }
  }

  if (cargando) {
    return <p style={{ padding: "2rem", color: "#111" }}>Cargando inventario...</p>;
  }

  return (
    <main style={{ padding: "1.5rem", background: "#E8F5E9", minHeight: "100vh" }}>
      <h1 style={{ color: "#2E7D32", marginBottom: "1.5rem" }}>📦 Control de Inventario</h1>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "800px" }}>
        {productos.map((prod) => (
          <div 
            key={prod.id} 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              background: "#FFFFFF", 
              padding: "1.2rem", 
              borderRadius: "10px",
              border: "2px solid #81C784",
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)" 
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 0.3rem 0", color: "#111111", fontSize: "1.1rem" }}>{prod.name}</h3>
              <p style={{ margin: 0, color: "#374151", fontSize: "0.95rem", fontWeight: 600 }}>
                Stock actual: <span style={{ color: "#2E7D32" }}>{prod.stock_current}</span>
              </p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <label style={{ fontSize: "0.95rem", color: "#111111", fontWeight: 600 }}>Nuevo stock:</label>
              <input 
                type="number" 
                value={prod.stock_current}
                onChange={(e) => {
                  const valor = parseInt(e.target.value) || 0;
                  setProductos(productos.map(p => p.id === prod.id ? { ...p, stock_current: valor } : p));
                }}
                style={{ 
                  width: "80px", 
                  padding: "0.5rem", 
                  borderRadius: "6px", 
                  border: "2px solid #2E7D32",
                  backgroundColor: "#FFFFFF",
                  color: "#111111",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  textAlign: "center"
                }}
              />
              <button 
                onClick={() => handleActualizarStock(prod.id, prod.stock_current)}
                style={{ 
                  background: "#2E7D32", 
                  color: "#FFFFFF", 
                  border: "none", 
                  padding: "0.6rem 1.2rem", 
                  borderRadius: "6px", 
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  cursor: "pointer" 
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}