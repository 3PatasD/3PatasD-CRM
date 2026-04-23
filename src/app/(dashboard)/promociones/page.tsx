"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";

interface Promo { id: string; codigo: string; descripcion: string | null; tipo: string; valor: number; fechaFin: string | null; limiteUsos: number | null; usosActuales: number; activo: boolean; }

export default function PromocionesPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/promociones").then((r) => r.json()).then(setPromos).finally(() => setLoading(false));
  }, []);

  async function toggleActivo(id: string, activo: boolean) {
    await fetch(`/api/promociones/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !activo }) });
    setPromos((p) => p.map((x) => x.id === id ? { ...x, activo: !activo } : x));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Códigos promocionales</h1><p className="text-muted-foreground text-sm mt-1">Crea y gestiona descuentos y promociones</p></div>
        <Link href="/promociones/nuevo"><Button><Plus className="h-4 w-4 mr-2" />Nuevo código</Button></Link>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b"><tr>
            <th className="text-left px-4 py-3 font-medium">Código</th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Descripción</th>
            <th className="text-left px-4 py-3 font-medium">Descuento</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Usos</th>
            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Caduca</th>
            <th className="text-left px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            : promos.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay códigos promocionales</td></tr>
            : promos.map((p) => (
              <tr key={p.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono font-bold">{p.codigo}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{p.descripcion ?? "—"}</td>
                <td className="px-4 py-3 font-medium">
                  {p.tipo === "PORCENTAJE" ? `${p.valor}%` : formatEuro(p.valor)}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {p.usosActuales}{p.limiteUsos !== null ? ` / ${p.limiteUsos}` : " / ∞"}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{p.fechaFin ? formatDate(p.fechaFin) : "Sin caducidad"}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(p.id, p.activo)} className="text-xs text-muted-foreground hover:text-foreground underline">
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
