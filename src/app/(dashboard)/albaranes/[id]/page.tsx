"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, FileDown, CheckCircle, RotateCcw } from "lucide-react";
import { formatDate, formatEuro, toDecimal } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LineaAlbaran { id: string; descripcion: string; cantidad: number; precioUnitario: number; iva: number; subtotal: number; }
interface Albaran {
  id: string; numero: string; estado: string; fechaEmision: string; fechaEntrega: string | null;
  notasCliente: string | null; notasInternas: string | null;
  pedido: { id: string; numero: string; cliente: { nombre: string; cifNif: string | null } };
  factura: { id: string; numero: string } | null;
  lineas: LineaAlbaran[];
}

const ESTADO_COLORS: Record<string, string> = { PENDIENTE: "bg-yellow-100 text-yellow-700", ENTREGADO: "bg-green-100 text-green-700", DEVUELTO: "bg-red-100 text-red-700" };

export default function AlbaranDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Albaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/albaranes/${id}`);
      const d = await res.json();
      if (!res.ok) { router.push("/albaranes"); return; }
      setData(d);
    } finally { setLoading(false); }
  }

  async function cambiarEstado(estado: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/albaranes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `Estado: ${estado}` });
      fetchData();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  }

  async function crearFactura() {
    setActing(true);
    try {
      const res = await fetch(`/api/albaranes/${id}/facturar`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast({ title: "Factura creada", description: d.numero });
      router.push(`/facturas/${d.id}`);
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const total = data.lineas.reduce((acc, l) => acc + toDecimal(l.subtotal), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/albaranes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{data.numero}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[data.estado] ?? ""}`}>{data.estado}</span>
            </div>
            <p className="text-muted-foreground text-sm">{data.pedido.cliente.nombre} · {formatDate(data.fechaEmision)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/albaranes/${id}/pdf`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-1" />PDF</Button></a>
          {data.estado === "PENDIENTE" && (
            <Button size="sm" onClick={() => cambiarEstado("ENTREGADO")} disabled={acting}>
              <CheckCircle className="h-4 w-4 mr-1" />Marcar entregado
            </Button>
          )}
          {data.estado === "ENTREGADO" && !data.factura && (
            <Button size="sm" onClick={crearFactura} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Crear factura
            </Button>
          )}
          {data.estado === "ENTREGADO" && (
            <Button size="sm" variant="outline" onClick={() => cambiarEstado("DEVUELTO")} disabled={acting}>
              <RotateCcw className="h-4 w-4 mr-1" />Marcar devuelto
            </Button>
          )}
          {data.factura && (
            <Link href={`/facturas/${data.factura.id}`}><Button size="sm" variant="secondary">Ver factura {data.factura.numero}</Button></Link>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Pedido: <Link href={`/pedidos/${data.pedido.id}`} className="text-primary hover:underline font-mono">{data.pedido.numero}</Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Líneas del albarán</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-muted/30 border-y"><tr>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-right px-4 py-2">Cantidad</th>
              <th className="text-right px-4 py-2">P.Unit.</th>
              <th className="text-right px-4 py-2">IVA%</th>
              <th className="text-right px-4 py-2">Subtotal</th>
            </tr></thead>
            <tbody className="divide-y">
              {data.lineas.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.descripcion}</td>
                  <td className="px-4 py-2 text-right">{toDecimal(l.cantidad)}</td>
                  <td className="px-4 py-2 text-right">{formatEuro(l.precioUnitario)}</td>
                  <td className="px-4 py-2 text-right">{toDecimal(l.iva)}%</td>
                  <td className="px-4 py-2 text-right font-medium">{formatEuro(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <div className="w-60 space-y-1.5 text-sm border rounded-lg p-3 bg-muted/20">
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatEuro(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
