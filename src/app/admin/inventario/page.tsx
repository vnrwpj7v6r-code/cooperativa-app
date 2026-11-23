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
    // Ya corregido con los nombres de tu base de datos
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
      alert("¡Stock actualizado correctamente!");
    }
  }

  if (cargando) {
    return <p style={{ padding: "2rem", textAlign: "center" }}>Cargando inventario...</p>;
  }

  return (
    <main style={{ padding: "2rem", background: "#FAFAFA", minHeight: "100vh" }}>
      <h1 style={{ color: "#2E7D32", marginBottom: "2rem" }}>📦 Control de Inventario</h1>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "800px" }}>
        {productos.map((prod) => (
          <div 
            key={prod.id} 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              background: "white", 
              padding: "1rem", 
              borderRadius: "8px", 
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)" 
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#333" }}>{prod.name}</h3>
              <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>Stock actual: {prod.stock_current}</p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <label style={{ fontSize: "0.9rem", color: "#666" }}>Nuevo stock:</label>
              <input 
                type="number" 
                defaultValue={prod.stock_current}
                onChange={(e) => {
                  const valor = parseInt(e.target.value) || 0;
                  setProductos(productos.map(p => p.id === prod.id ? { ...p, stock_current: valor } : p));
                }}
                style={{ 
                  width: "70px", 
                  padding: "0.5rem", 
                  borderRadius: "6px", 
                  border: "1px solid #ccc",
                  textAlign: "center"
                }}
              />
              <button 
                onClick={() => handleActualizarStock(prod.id, prod.stock_current)}
                style={{ 
                  background: "#2E7D32", 
                  color: "white", 
                  border: "none", 
                  padding: "0.6rem 1rem", 
                  borderRadius: "6px", 
                  fontWeight: "bold",
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