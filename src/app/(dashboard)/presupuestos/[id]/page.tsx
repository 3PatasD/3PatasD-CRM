"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, FileDown, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Linea { id: string; descripcion: string; cantidad: number; precioUnitario: number; descuento: number; iva: number; subtotal: number; }
interface Presupuesto {
  id: string; numero: string; estado: string; fechaEmision: string; fechaValidez: string | null;
  subtotal: number; totalIva: number; descuentoGlobal: number; descuentoPromo: number; total: number;
  notasCliente: string | null; notasInternas: string | null;
  cliente: { id: string; nombre: string; cifNif: string | null; email: string | null; direccion: string | null; ciudad: string | null };
  usuario: { nombre: string };
  lineas: Linea[];
  pedido: { id: string; numero: string } | null;
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700", ENVIADO: "bg-blue-100 text-blue-700",
  ACEPTADO: "bg-green-100 text-green-700", RECHAZADO: "bg-red-100 text-red-700", CADUCADO: "bg-orange-100 text-orange-700",
};

export default function PresupuestoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Presupuesto | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/presupuestos/${id}`);
      const d = await res.json();
      if (!res.ok) { router.push("/presupuestos"); return; }
      setData(d);
    } finally { setLoading(false); }
  }

  async function cambiarEstado(estado: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/presupuestos/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `Estado actualizado: ${estado}` });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setActing(false); }
  }

  async function convertirAPedido() {
    setActing(true);
    try {
      const res = await fetch(`/api/presupuestos/${id}/convertir`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast({ title: "Pedido creado", description: d.numero });
      router.push(`/pedidos/${d.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/presupuestos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{data.numero}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[data.estado] ?? ""}`}>{data.estado}</span>
            </div>
            <p className="text-muted-foreground text-sm">{data.cliente.nombre} · {formatDate(data.fechaEmision)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/presupuestos/${id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          </a>
          {data.estado === "BORRADOR" && <Button size="sm" onClick={() => cambiarEstado("ENVIADO")} disabled={acting}><RefreshCw className="h-4 w-4 mr-1" />Marcar enviado</Button>}
          {data.estado === "ENVIADO" && (
            <>
              <Button size="sm" variant="outline" onClick={() => cambiarEstado("ACEPTADO")} disabled={acting}><CheckCircle className="h-4 w-4 mr-1" />Aceptar</Button>
              <Button size="sm" variant="outline" onClick={() => cambiarEstado("RECHAZADO")} disabled={acting}><XCircle className="h-4 w-4 mr-1" />Rechazar</Button>
            </>
          )}
          {data.estado === "ACEPTADO" && !data.pedido && (
            <Button size="sm" onClick={convertirAPedido} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Convertir a pedido
            </Button>
          )}
          {data.pedido && (
            <Link href={`/pedidos/${data.pedido.id}`}><Button size="sm" variant="secondary">Ver pedido {data.pedido.numero}</Button></Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-medium">{data.cliente.nombre}</div>
            {data.cliente.cifNif && <div className="text-muted-foreground">{data.cliente.cifNif}</div>}
            {data.cliente.email && <div>{data.cliente.email}</div>}
            {data.cliente.ciudad && <div className="text-muted-foreground">{data.cliente.direccion}, {data.cliente.ciudad}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Información</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Emitido por</span><span>{data.usuario.nombre}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha emisión</span><span>{formatDate(data.fechaEmision)}</span></div>
            {data.fechaValidez && <div className="flex justify-between"><span className="text-muted-foreground">Válido hasta</span><span>{formatDate(data.fechaValidez)}</span></div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Líneas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/30 border-y">
              <tr>
                <th className="text-left px-4 py-2">Descripción</th>
                <th className="text-right px-4 py-2">Cant.</th>
                <th className="text-right px-4 py-2">P.Unit.</th>
                <th className="text-right px-4 py-2">Dto%</th>
                <th className="text-right px-4 py-2">IVA%</th>
                <th className="text-right px-4 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.lineas.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.descripcion}</td>
                  <td className="px-4 py-2 text-right">{Number(l.cantidad)}</td>
                  <td className="px-4 py-2 text-right">{formatEuro(l.precioUnitario)}</td>
                  <td className="px-4 py-2 text-right">{Number(l.descuento)}%</td>
                  <td className="px-4 py-2 text-right">{Number(l.iva)}%</td>
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
          {Number(data.descuentoGlobal) > 0 && <div className="flex justify-between text-orange-600"><span>Descuento {Number(data.descuentoGlobal)}%</span><span>-{formatEuro(data.subtotal * Number(data.descuentoGlobal) / 100)}</span></div>}
          {Number(data.descuentoPromo) > 0 && <div className="flex justify-between text-orange-600"><span>Código promo</span><span>-{formatEuro(data.descuentoPromo)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatEuro(data.totalIva)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatEuro(data.total)}</span></div>
        </div>
      </div>

      {(data.notasCliente || data.notasInternas) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.notasCliente && <Card><CardHeader><CardTitle className="text-base">Notas para el cliente</CardTitle></CardHeader><CardContent><p className="text-sm">{data.notasCliente}</p></CardContent></Card>}
          {data.notasInternas && <Card><CardHeader><CardTitle className="text-base">Notas internas</CardTitle></CardHeader><CardContent><p className="text-sm">{data.notasInternas}</p></CardContent></Card>}
        </div>
      )}
    </div>
  );
}
