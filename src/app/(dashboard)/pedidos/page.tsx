"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";

interface Pedido { id: string; numero: string; estado: string; total: number; fechaEmision: string; fechaEntrega: string | null; cliente: { nombre: string }; }

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700", EN_PROCESO: "bg-blue-100 text-blue-700",
  PREPARADO: "bg-purple-100 text-purple-700", ENTREGADO: "bg-green-100 text-green-700", CANCELADO: "bg-red-100 text-red-700",
};
const ESTADOS = ["", "PENDIENTE", "EN_PROCESO", "PREPARADO", "ENTREGADO", "CANCELADO"];

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/pedidos?search=${encodeURIComponent(search)}&estado=${estado}`)
        .then((r) => r.json()).then(setPedidos).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, estado]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Pedidos</h1><p className="text-muted-foreground text-sm mt-1">Control de pedidos y su estado de preparación</p></div>
        <Link href="/pedidos/nuevo"><Button><Plus className="h-4 w-4 mr-2" />Nuevo pedido</Button></Link>
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
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            : pedidos.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No hay pedidos</td></tr>
            : pedidos.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/pedidos/${p.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{p.numero}</td>
                <td className="px-4 py-3">{p.cliente.nombre}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado] ?? ""}`}>{p.estado}</span></td>
                <td className="px-4 py-3 text-right font-medium">{formatEuro(p.total)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{p.fechaEntrega ? formatDate(p.fechaEntrega) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
