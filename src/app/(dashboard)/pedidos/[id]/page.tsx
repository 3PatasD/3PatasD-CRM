"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, FileDown, Truck, X } from "lucide-react";
import { formatDate, formatEuro, toDecimal } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LineaPedido { id: string; descripcion: string; cantidad: number; cantidadServida: number; precioUnitario: number; iva: number; subtotal: number; }
interface Albaran { id: string; numero: string; estado: string; fechaEmision: string; }
interface Pedido {
  id: string; numero: string; estado: string; fechaEmision: string; fechaEntrega: string | null;
  subtotal: number; totalIva: number; descuentoGlobal: number; descuentoPromo: number; total: number;
  notasCliente: string | null; notasInternas: string | null; direccionEntrega: string | null;
  cliente: { id: string; nombre: string; cifNif: string | null; direccion: string | null; ciudad: string | null };
  usuario: { nombre: string }; presupuesto: { id: string; numero: string } | null;
  lineas: LineaPedido[]; albaranes: Albaran[];
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700", EN_PROCESO: "bg-blue-100 text-blue-700",
  PREPARADO: "bg-purple-100 text-purple-700", ENTREGADO: "bg-green-100 text-green-700", CANCELADO: "bg-red-100 text-red-700",
};
const ALB_COLORS: Record<string, string> = { PENDIENTE: "bg-yellow-100 text-yellow-700", ENTREGADO: "bg-green-100 text-green-700", DEVUELTO: "bg-red-100 text-red-700" };

export default function PedidoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showAlbaranForm, setShowAlbaranForm] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pedidos/${id}`);
      const d = await res.json();
      if (!res.ok) { router.push("/pedidos"); return; }
      setData(d);
      const init: Record<string, number> = {};
      d.lineas.forEach((l: LineaPedido) => { init[l.id] = toDecimal(l.cantidad) - toDecimal(l.cantidadServida); });
      setCantidades(init);
    } finally { setLoading(false); }
  }

  async function cambiarEstado(estado: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `Estado: ${estado}` });
      fetchData();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  }

  async function crearAlbaran() {
    setActing(true);
    try {
      const lineas = data!.lineas
        .filter((l) => (cantidades[l.id] ?? 0) > 0)
        .map((l) => ({ lineaPedidoId: l.id, cantidad: cantidades[l.id] }));
      if (!lineas.length) { toast({ title: "Error", description: "Selecciona al menos una línea con cantidad > 0", variant: "destructive" }); return; }
      const res = await fetch(`/api/pedidos/${id}/albaranear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lineas }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast({ title: "Albarán creado", description: d.numero });
      setShowAlbaranForm(false);
      fetchData();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const canAlbaranar = data.estado !== "CANCELADO" && data.estado !== "ENTREGADO";
  const hayPendiente = data.lineas.some((l) => toDecimal(l.cantidadServida) < toDecimal(l.cantidad));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/pedidos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{data.numero}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[data.estado] ?? ""}`}>{data.estado}</span>
            </div>
            <p className="text-muted-foreground text-sm">{data.cliente.nombre} · {formatDate(data.fechaEmision)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/pedidos/${id}/pdf`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-1" />PDF</Button></a>
          {canAlbaranar && hayPendiente && <Button size="sm" onClick={() => setShowAlbaranForm(true)} disabled={acting}><Truck className="h-4 w-4 mr-1" />Crear albarán</Button>}
          {data.estado === "PENDIENTE" && <Button size="sm" variant="outline" onClick={() => cambiarEstado("CANCELADO")} disabled={acting}><X className="h-4 w-4 mr-1" />Cancelar</Button>}
        </div>
      </div>

      {data.presupuesto && <div className="text-sm text-muted-foreground">Generado desde: <Link href={`/presupuestos/${data.presupuesto.id}`} className="text-primary hover:underline font-mono">{data.presupuesto.numero}</Link></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-medium">{data.cliente.nombre}</div>
            {data.cliente.cifNif && <div className="text-muted-foreground">{data.cliente.cifNif}</div>}
            {data.cliente.ciudad && <div className="text-muted-foreground">{data.cliente.direccion}, {data.cliente.ciudad}</div>}
            {data.direccionEntrega && <div className="mt-2 pt-2 border-t"><span className="text-xs text-muted-foreground">Entrega: </span>{data.direccionEntrega}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Información</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Creado por</span><span>{data.usuario.nombre}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha emisión</span><span>{formatDate(data.fechaEmision)}</span></div>
            {data.fechaEntrega && <div className="flex justify-between"><span className="text-muted-foreground">Entrega prevista</span><span>{formatDate(data.fechaEntrega)}</span></div>}
          </CardContent>
        </Card>
      </div>

      {/* Albarán form */}
      {showAlbaranForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Crear albarán</CardTitle>
            <button onClick={() => setShowAlbaranForm(false)}><X className="h-4 w-4" /></button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Indica la cantidad a servir por cada línea:</p>
            {data.lineas.map((l) => {
              const pendiente = toDecimal(l.cantidad) - toDecimal(l.cantidadServida);
              if (pendiente <= 0) return null;
              return (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm">{l.descripcion}</div>
                  <div className="text-xs text-muted-foreground w-24 text-right">Pendiente: {pendiente}</div>
                  <div className="w-24">
                    <Label className="sr-only">Cantidad</Label>
                    <Input type="number" step="0.001" min="0" max={pendiente} value={cantidades[l.id] ?? 0} onChange={(e) => setCantidades((p) => ({ ...p, [l.id]: parseFloat(e.target.value) || 0 }))} className="h-8" />
                  </div>
                </div>
              );
            })}
            <Button onClick={crearAlbaran} disabled={acting} className="mt-2">
              {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}Confirmar albarán
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Líneas del pedido</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-muted/30 border-y">
              <tr>
                <th className="text-left px-4 py-2">Descripción</th>
                <th className="text-right px-4 py-2">Cant.</th>
                <th className="text-right px-4 py-2">Servida</th>
                <th className="text-right px-4 py-2">P.Unit.</th>
                <th className="text-right px-4 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.lineas.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.descripcion}</td>
                  <td className="px-4 py-2 text-right">{toDecimal(l.cantidad)}</td>
                  <td className="px-4 py-2 text-right">{toDecimal(l.cantidadServida)}</td>
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
          {Number(data.descuentoPromo) > 0 && <div className="flex justify-between text-orange-600"><span>Descuento</span><span>-{formatEuro(data.descuentoPromo)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatEuro(data.totalIva)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatEuro(data.total)}</span></div>
        </div>
      </div>

      {data.albaranes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Albaranes ({data.albaranes.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-y"><tr>
                <th className="text-left px-4 py-2">Número</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Fecha</th>
              </tr></thead>
              <tbody className="divide-y">
                {data.albaranes.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => window.location.href = `/albaranes/${a.id}`}>
                    <td className="px-4 py-2 font-mono text-xs">{a.numero}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${ALB_COLORS[a.estado] ?? ""}`}>{a.estado}</span></td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(a.fechaEmision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
