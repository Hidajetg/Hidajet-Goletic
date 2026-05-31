"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function MaterialPage() {
  const [naziv, setNaziv] = useState("");
  const [jedinica, setJedinica] = useState("");
  const [materijali, setMaterijali] = useState<any[]>([]);

  async function ucitajMaterijale() {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert("LOAD: " + error.message);
      return;
    }

    setMaterijali(data || []);
  }

  async function sacuvajMaterijal() {
    if (!naziv.trim()) {
      alert("Unesi naziv materijala");
      return;
    }

    const { error } = await supabase.from("materials").insert([
      {
        naziv: naziv.trim(),
        jedinica: jedinica.trim(),
      },
    ]);

    if (error) {
      alert("INSERT: " + error.message);
      return;
    }

    setNaziv("");
    setJedinica("");
    await ucitajMaterijale();
  }

  useEffect(() => {
    ucitajMaterijale();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-5xl font-bold mb-2">Materijal</h1>
      <p className="text-gray-400 mb-10">Pregled i unos materijala</p>

      <div className="bg-zinc-900 rounded-3xl p-8 mb-10">
        <h2 className="text-3xl font-bold mb-6">+ Novi materijal</h2>

        <input
          type="text"
          placeholder="Naziv materijala"
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          className="w-full bg-zinc-800 p-4 rounded-xl mb-4"
        />

        <input
          type="text"
          placeholder="Jedinica npr. kom, m², m, kg, l"
          value={jedinica}
          onChange={(e) => setJedinica(e.target.value)}
          className="w-full bg-zinc-800 p-4 rounded-xl mb-6"
        />

        <button
          onClick={sacuvajMaterijal}
          className="bg-blue-600 px-6 py-3 rounded-xl font-bold"
        >
          Sačuvaj materijal
        </button>
      </div>

      <div className="bg-zinc-900 rounded-3xl p-8">
        <h2 className="text-3xl font-bold mb-6">Lista materijala</h2>

        {materijali.map((m) => (
          <div key={m.id} className="bg-zinc-800 rounded-xl p-4 mb-3">
            <div className="font-bold text-xl">{m.naziv}</div>
            <div className="text-gray-400">Jedinica: {m.jedinica}</div>
          </div>
        ))}
      </div>
    </main>
  );
}