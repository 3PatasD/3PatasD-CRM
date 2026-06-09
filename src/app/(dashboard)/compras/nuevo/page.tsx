"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatEuro } from "@/lib/utils";

interface Proveedor { id: string; nombre: string }
interface Producto { id: string; nombre: string; sku: string; precioCosto: number; iva: number; unidad: string }
interface Linea { productoId?: string; descripcion: string; cantidad: number; precioUnitario: number; iva: number; orden: number }

function NuevaCompraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedorId, setProveedorId] = useState(searchParams.get("proveedorId") ?? "");
  const [fechaEsperada, setFechaEsperada] = useState("");
  const [referenciaProveedor, setReferenciaProveedor] = useState("");
  const [notasInternas, setNotasInternas] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: "", cantidad: 1, precioUnitario: 0, iva: 21, orden: 1 }]);

  useEffect(() => {
    Promise.all([fetch("/api/proveedores").then((r) => r.json()), fetch("/api/productos").then((r) => r.json())])
      .then(([p, pr]) => { setProveedores(p); setProductos(pr); });
  }, []);

  function setLinea(idx: number, field: keyof Linea, value: string | number) {
    setLineas((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function onProductoSelect(idx: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    setLineas((prev) => prev.map((l, i) => i === idx ? { ...l, productoId, descripcion: p.nombre, precioUnitario: Number(p.precioCosto), iva: Number(p.iva) } : l));
  }

  const total = lineas.reduce((acc, l) => {
    const base = l.cantidad * l.precioUnitario;
    return acc + base + base * (l.iva / 100);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorId, fechaEsperada: fechaEsperada || undefined, referenciaProveedor: referenciaProveedor || undefined, notasInternas: notasInternas || undefined, lineas: lineas.map((l, i) => ({ ...l, orden: i + 1 })) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: "Compra creada", description: result.numero });
      router.push(`/compras/${result.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/compras"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nueva compra</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del pedido</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Proveedor *</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Fecha esperada</Label><Input type="date" value={fechaEsperada} onChange={(e) => setFechaEsperada(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Referencia proveedor</Label><Input value={referenciaProveedor} onChange={(e) => setReferenciaProveedor(e.target.value)} placeholder="Ref. del proveedor..." /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Líneas de compra</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setLineas((p) => [...p, { descripcion: "", cantidad: 1, precioUnitario: 0, iva: 21, orden: p.length + 1 }])}><Plus className="h-4 w-4 mr-1" />Añadir</Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 pr-3 w-44">Producto</th>
                <th className="text-left py-2 pr-3">Descripción</th>
                <th className="text-right py-2 pr-3 w-20">Cant.</th>
                <th className="text-right py-2 pr-3 w-24">P.Costo (€)</th>
                <th className="text-right py-2 pr-3 w-20">IVA%</th>
                <th className="text-right py-2 pr-3 w-24">Subtotal</th>
                <th className="w-8"></th>
              </tr></thead>
              <tbody className="divide-y">
                {lineas.map((l, idx) => {
                  const base = l.cantidad * l.precioUnitario;
                  const sub = base + base * (l.iva / 100);
                  return (
                    <tr key={idx}>
                      <td className="py-2 pr-3">
                        <select className="h-8 w-full rounded border border-input bg-transparent px-2 text-xs" value={l.productoId ?? ""} onChange={(e) => onProductoSelect(idx, e.target.value)}>
                          <option value="">Libre</option>
                          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3"><Input className="h-8 text-xs" value={l.descripcion} onChange={(e) => setLinea(idx, "descripcion", e.target.value)} required /></td>
                      <td className="py-2 pr-3"><Input className="h-8 text-xs text-right" type="number" step="0.001" min="0.001" value={l.cantidad} onChange={(e) => setLinea(idx, "cantidad", parseFloat(e.target.value) || 0)} /></td>
                      <td className="py-2 pr-3"><Input className="h-8 text-xs text-right" type="number" step="0.01" min="0" value={l.precioUnitario} onChange={(e) => setLinea(idx, "precioUnitario", parseFloat(e.target.value) || 0)} /></td>
                      <td className="py-2 pr-3">
                        <select className="h-8 w-full rounded border border-input bg-transparent px-1 text-xs" value={l.iva} onChange={(e) => setLinea(idx, "iva", parseFloat(e.target.value))}>
                          {[0,4,10,21].map((v) => <option key={v} value={v}>{v}%</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3 text-right text-xs font-medium">{formatEuro(sub)}</td>
                      <td className="py-2"><button type="button" onClick={() => setLineas((p) => p.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive" disabled={lineas.length === 1}><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end mt-3 text-sm font-bold">Total: {formatEuro(total)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notas internas</CardTitle></CardHeader>
          <CardContent>
            <textarea className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={notasInternas} onChange={(e) => setNotasInternas(e.target.value)} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/compras"><Button variant="outline" type="button">Cancelar</Button></Link>
          <Button type="submit" disabled={loading || !proveedorId}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Crear pedido de compra"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NuevaCompraPage() {
  return <Suspense><NuevaCompraContent /></Suspense>;
}
