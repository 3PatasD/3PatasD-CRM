"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";

interface Presupuesto {
  id: string; numero: string; estado: string; total: number;
  fechaEmision: string; cliente: { nombre: string };
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ENVIADO: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ACEPTADO: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  RECHAZADO: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  CADUCADO: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

const ESTADOS = ["", "BORRADOR", "ENVIADO", "ACEPTADO", "RECHAZADO", "CADUCADO"];

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/presupuestos?search=${encodeURIComponent(search)}&estado=${estado}`)
        .then((r) => r.json()).then(setPresupuestos).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, estado]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona los presupuestos enviados a clientes</p>
        </div>
        <Link href="/presupuestos/nuevo"><Button><Plus className="h-4 w-4 mr-2" />Nuevo presupuesto</Button></Link>
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
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Número</th>
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            ) : presupuestos.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No hay presupuestos</td></tr>
            ) : presupuestos.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/presupuestos/${p.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{p.numero}</td>
                <td className="px-4 py-3">{p.cliente.nombre}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado] ?? ""}`}>{p.estado}</span></td>
                <td className="px-4 py-3 text-right font-medium">{formatEuro(p.total)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(p.fechaEmision)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
