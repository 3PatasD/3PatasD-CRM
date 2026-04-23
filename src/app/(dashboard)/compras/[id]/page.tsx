"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, PackageCheck } from "lucide-react";
import { formatDate, formatEuro, toDecimal } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LineaCompra { id: string; descripcion: string; cantidad: number; cantidadRecibida: number; precioUnitario: number; iva: number; subtotal: number; producto: { nombre: string; sku: string } | null; }
interface Compra {
  id: string; numero: string; estado: string; fechaEmision: string; fechaEsperada: string | null;
  referenciaProveedor: string | null; notasInternas: string | null;
  subtotal: number; totalIva: number; total: number;
  proveedor: { id: string; nombre: string; cifNif: string | null };
  lineas: LineaCompra[];
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700", RECIBIDA_PARCIAL: "bg-blue-100 text-blue-700",
  RECIBIDA: "bg-green-100 text-green-700", CANCELADA: "bg-red-100 text-red-700",
};

export default function CompraDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showRecepcion, setShowRecepcion] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/compras/${id}`);
      const d = await res.json();
      if (!res.ok) { router.push("/compras"); return; }
      setData(d);
      const init: Record<string, number> = {};
      d.lineas.forEach((l: LineaCompra) => { init[l.id] = toDecimal(l.cantidad) - toDecimal(l.cantidadRecibida); });
      setCantidades(init);
    } finally { setLoading(false); }
  }

  async function procesarRecepcion() {
    setActing(true);
    try {
      const recepcion = data!.lineas
        .filter((l) => (cantidades[l.id] ?? 0) > 0)
        .map((l) => ({ lineaId: l.id, cantidadRecibida: cantidades[l.id] }));
      if (!recepcion.length) { toast({ title: "Error", description: "Indica al menos una cantidad recibida", variant: "destructive" }); return; }
      const res = await fetch(`/api/compras/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recepcion }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Recepción procesada", description: "El stock ha sido actualizado" });
      setShowRecepcion(false);
      fetchData();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const canReceive = data.estado === "PENDIENTE" || data.estado === "RECIBIDA_PARCIAL";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/compras"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{data.numero}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[data.estado] ?? ""}`}>{data.estado}</span>
            </div>
            <p className="text-muted-foreground text-sm">{data.proveedor.nombre} · {formatDate(data.fechaEmision)}</p>
          </div>
        </div>
        {canReceive && <Button size="sm" onClick={() => setShowRecepcion(true)}><PackageCheck className="h-4 w-4 mr-1" />Registrar recepción</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Proveedor</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-medium">{data.proveedor.nombre}</div>
            {data.proveedor.cifNif && <div className="text-muted-foreground">{data.proveedor.cifNif}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha emisión</span><span>{formatDate(data.fechaEmision)}</span></div>
            {data.fechaEsperada && <div className="flex justify-between"><span className="text-muted-foreground">Esperada</span><span>{formatDate(data.fechaEsperada)}</span></div>}
            {data.referenciaProveedor && <div className="flex justify-between"><span className="text-muted-foreground">Ref. proveedor</span><span>{data.referenciaProveedor}</span></div>}
          </CardContent>
        </Card>
      </div>

      {showRecepcion && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Registrar recepción de mercancía</CardTitle>
            <button onClick={() => setShowRecepcion(false)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Indica la cantidad recibida por línea. El stock se actualizará automáticamente.</p>
            {data.lineas.map((l) => {
              const pendiente = toDecimal(l.cantidad) - toDecimal(l.cantidadRecibida);
              if (pendiente <= 0) return null;
              return (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm">{l.descripcion}{l.producto && <span className="text-xs text-muted-foreground ml-2">({l.producto.sku})</span>}</div>
                  <div className="text-xs text-muted-foreground w-24 text-right">Pendiente: {pendiente}</div>
                  <div className="w-24">
                    <Label className="sr-only">Cantidad</Label>
                    <Input type="number" step="0.001" min="0" max={pendiente} value={cantidades[l.id] ?? 0} onChange={(e) => setCantidades((p) => ({ ...p, [l.id]: parseFloat(e.target.value) || 0 }))} className="h-8" />
                  </div>
                </div>
              );
            })}
            <Button onClick={procesarRecepcion} disabled={acting} className="mt-2">
              {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PackageCheck className="h-4 w-4 mr-1" />}Confirmar recepción
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Líneas de compra</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-muted/30 border-y"><tr>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-right px-4 py-2">Pedido</th>
              <th className="text-right px-4 py-2">Recibido</th>
              <th className="text-right px-4 py-2">P.Unit.</th>
              <th className="text-right px-4 py-2">Subtotal</th>
            </tr></thead>
            <tbody className="divide-y">
              {data.lineas.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.descripcion}</td>
                  <td className="px-4 py-2 text-right">{toDecimal(l.cantidad)}</td>
                  <td className={`px-4 py-2 text-right ${toDecimal(l.cantidadRecibida) >= toDecimal(l.cantidad) ? "text-green-600" : toDecimal(l.cantidadRecibida) > 0 ? "text-blue-600" : ""}`}>{toDecimal(l.cantidadRecibida)}</td>
                  <td className="px-4 py-2 text-right">{formatEuro(l.precioUnitario)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatEuro(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <div className="w-72 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatEuro(data.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatEuro(data.totalIva)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatEuro(data.total)}</span></div>
        </div>
      </div>
    </div>
  );
}
