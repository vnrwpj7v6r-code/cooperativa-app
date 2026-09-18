import { supabase } from "@/supabase/client";

export default async function Home() {
  const { data, error } = await supabase.from("categories").select("*");

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Prueba de conexión con Supabase</h1>
      {error ? (
        <p style={{ color: "red" }}>Error: {error.message}</p>
      ) : (
        <p style={{ color: "green" }}>
          ✅ ¡Conectado! Categorías encontradas: {data?.length ?? 0}
        </p>
      )}
    </main>
  );
}