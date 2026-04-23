"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Albaran { id: string; numero: string; estado: string; fechaEmision: string; pedido: { numero: string; cliente: { nombre: string } }; }
const ESTADO_COLORS: Record<string, string> = { PENDIENTE: "bg-yellow-100 text-yellow-700", ENTREGADO: "bg-green-100 text-green-700", DEVUELTO: "bg-red-100 text-red-700" };

export default function AlbaranesPage() {
  const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => fetch(`/api/albaranes?search=${encodeURIComponent(search)}`)
      .then((r) => r.json()).then(setAlbaranes).finally(() => setLoading(false)), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Albaranes</h1><p className="text-muted-foreground text-sm mt-1">Notas de entrega y control de entregas</p></div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b"><tr>
            <th className="text-left px-4 py-3 font-medium">Número</th>
            <th className="text-left px-4 py-3 font-medium">Pedido</th>
            <th className="text-left px-4 py-3 font-medium">Cliente</th>
            <th className="text-left px-4 py-3 font-medium">Estado</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            : albaranes.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No hay albaranes</td></tr>
            : albaranes.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/albaranes/${a.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{a.numero}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.pedido.numero}</td>
                <td className="px-4 py-3">{a.pedido.cliente.nombre}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[a.estado] ?? ""}`}>{a.estado}</span></td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(a.fechaEmision)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
