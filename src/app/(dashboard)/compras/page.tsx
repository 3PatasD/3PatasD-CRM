"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";

interface Compra { id: string; numero: string; estado: string; total: number; fechaEmision: string; proveedor: { nombre: string }; }
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700", RECIBIDA_PARCIAL: "bg-blue-100 text-blue-700",
  RECIBIDA: "bg-green-100 text-green-700", CANCELADA: "bg-red-100 text-red-700",
};
const ESTADOS = ["", "PENDIENTE", "RECIBIDA_PARCIAL", "RECIBIDA", "CANCELADA"];

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/compras?search=${encodeURIComponent(search)}&estado=${estado}`)
        .then((r) => r.json()).then(setCompras).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, estado]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Compras</h1><p className="text-muted-foreground text-sm mt-1">Pedidos a proveedores y recepción de mercancía</p></div>
        <Link href="/compras/nuevo"><Button><Plus className="h-4 w-4 mr-2" />Nueva compra</Button></Link>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={estado} onChange={(e) => setEstado(e.target.value)}>
          {ESTADOS.map((e) => <option key={e} value={e}>{e || "Todos los estados"}</option>)}
        </select>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b"><tr>
            <th className="text-left px-4 py-3 font-medium">Número</th>
            <th className="text-left px-4 py-3 font-medium">Proveedor</th>
            <th className="text-left px-4 py-3 font-medium">Estado</th>
            <th className="text-right px-4 py-3 font-medium">Total</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            : compras.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No hay compras</td></tr>
            : compras.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/compras/${c.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{c.numero}</td>
                <td className="px-4 py-3">{c.proveedor.nombre}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[c.estado] ?? ""}`}>{c.estado}</span></td>
                <td className="px-4 py-3 text-right font-medium">{formatEuro(c.total)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(c.fechaEmision)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
