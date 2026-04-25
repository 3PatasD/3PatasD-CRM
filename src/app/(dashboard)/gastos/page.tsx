"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingDown, Clock, RefreshCw, Search } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";

interface Gasto {
  id: string; tipo: string; concepto: string; categoria: string | null;
  proveedorNombre: string | null; proveedor: { nombre: string } | null;
  importe: number; iva: number; importeTotal: number;
  fecha: string; fechaVencimiento: string | null; estado: string;
  esRecurrente: boolean; periodicidad: string | null;
}

const TIPO_LABELS: Record<string, string> = {
  SUSCRIPCION: "Suscripción", COMPRA_PUNTUAL: "Compra", FACTURA_PROVEEDOR: "Factura proveedor",
};
const TIPO_COLORS: Record<string, string> = {
  SUSCRIPCION: "bg-purple-100 text-purple-700",
  COMPRA_PUNTUAL: "bg-blue-100 text-blue-700",
  FACTURA_PROVEEDOR: "bg-orange-100 text-orange-700",
};
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  PAGADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-700",
};
const CAT_LABELS: Record<string, string> = {
  SOFTWARE: "Software", HARDWARE: "Hardware", SERVICIOS: "Servicios",
  ALQUILER: "Alquiler", SUMINISTROS: "Suministros", MARKETING: "Marketing",
  FORMACION: "Formación", TRANSPORTE: "Transporte", IMPUESTOS: "Impuestos", OTROS: "Otros",
};

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");

  useEffect(() => { fetchGastos(); }, [search, tipo, estado]);

  async function fetchGastos() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tipo) params.set("tipo", tipo);
    if (estado) params.set("estado", estado);
    const res = await fetch(`/api/gastos?${params}`);
    if (res.ok) setGastos(await res.json());
    setLoading(false);
  }

  // KPIs
  const mesActual = new Date();
  const gastosMes = gastos.filter((g) => {
    const f = new Date(g.fecha);
    return f.getMonth() === mesActual.getMonth() && f.getFullYear() === mesActual.getFullYear();
  });
  const totalMes = gastosMes.reduce((acc, g) => acc + Number(g.importeTotal), 0);
  const pendientes = gastos.filter((g) => g.estado === "PENDIENTE");
  const totalPendiente = pendientes.reduce((acc, g) => acc + Number(g.importeTotal), 0);
  const suscripciones = gastos.filter((g) => g.tipo === "SUSCRIPCION" && g.estado !== "CANCELADO");

  const proveedorName = (g: Gasto) => g.proveedor?.nombre ?? g.proveedorNombre ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gastos</h1>
          <p className="text-muted-foreground text-sm mt-1">Suscripciones, compras y facturas de proveedores</p>
        </div>
        <Link href="/gastos/nuevo"><Button><Plus className="h-4 w-4 mr-2" />Nuevo gasto</Button></Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingDown className="h-4 w-4" />Gasto este mes
          </div>
          <div className="text-2xl font-bold">{formatEuro(totalMes)}</div>
          <div className="text-xs text-muted-foreground mt-1">{gastosMes.length} registros</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="h-4 w-4" />Pendientes de pago
          </div>
          <div className="text-2xl font-bold text-orange-600">{formatEuro(totalPendiente)}</div>
          <div className="text-xs text-muted-foreground mt-1">{pendientes.length} facturas</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <RefreshCw className="h-4 w-4" />Suscripciones activas
          </div>
          <div className="text-2xl font-bold">{suscripciones.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatEuro(suscripciones.reduce((acc, g) => acc + Number(g.importeTotal), 0))} /período
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar concepto, proveedor..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="SUSCRIPCION">Suscripción</option>
          <option value="COMPRA_PUNTUAL">Compra puntual</option>
          <option value="FACTURA_PROVEEDOR">Factura proveedor</option>
        </select>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PAGADO">Pagado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Concepto</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Tipo</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Proveedor</th>
              <th className="text-left px-4 py-3 font-medium">Fecha</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            ) : gastos.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay gastos registrados</td></tr>
            ) : gastos.map((g) => (
              <tr key={g.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => window.location.href = `/gastos/${g.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{g.concepto}</div>
                  {g.esRecurrente && <div className="text-xs text-purple-600">{g.periodicidad?.toLowerCase()}</div>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[g.tipo] ?? ""}`}>{TIPO_LABELS[g.tipo] ?? g.tipo}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{g.categoria ? CAT_LABELS[g.categoria] ?? g.categoria : "—"}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{proveedorName(g)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(g.fecha)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatEuro(g.importeTotal)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[g.estado] ?? ""}`}>{g.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
