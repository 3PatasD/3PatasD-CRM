"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";

interface Factura { id: string; numero: string; estado: string; total: number; fechaEmision: string; cliente: { nombre: string }; }
const ESTADO_COLORS: Record<string, string> = {
  EMITIDA: "bg-blue-100 text-blue-700", PAGADA: "bg-green-100 text-green-700",
  VENCIDA: "bg-red-100 text-red-700", ANULADA: "bg-gray-100 text-gray-700",
};
const ESTADOS = ["", "EMITIDA", "PAGADA", "VENCIDA", "ANULADA"];

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/facturas?search=${encodeURIComponent(search)}&estado=${estado}`)
        .then((r) => r.json()).then(setFacturas).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, estado]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Facturas</h1><p className="text-muted-foreground text-sm mt-1">Gestión de facturación y cobros</p></div>
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
            <th className="text-left px-4 py-3 font-medium">Cliente</th>
            <th className="text-left px-4 py-3 font-medium">Estado</th>
            <th className="text-right px-4 py-3 font-medium">Total</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            : facturas.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No hay facturas</td></tr>
            : facturas.map((f) => (
              <tr key={f.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/facturas/${f.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{f.numero}</td>
                <td className="px-4 py-3">{f.cliente.nombre}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[f.estado] ?? ""}`}>{f.estado}</span></td>
                <td className="px-4 py-3 text-right font-medium">{formatEuro(f.total)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(f.fechaEmision)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
