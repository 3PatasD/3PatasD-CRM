"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface Categoria { id: string; nombre: string }

export default function NuevoProductoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = useState({
    sku: "", nombre: "", descripcion: "", categoriaId: "",
    precioCosto: "", precioVenta: "", iva: "21",
    stockActual: "0", stockMinimo: "0", unidad: "ud",
  });

  useEffect(() => {
    fetch("/api/categorias").then((r) => r.json()).then(setCategorias);
  }, []);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          precioCosto: parseFloat(form.precioCosto),
          precioVenta: parseFloat(form.precioVenta),
          iva: parseFloat(form.iva),
          stockActual: parseFloat(form.stockActual),
          stockMinimo: parseFloat(form.stockMinimo),
          categoriaId: form.categoriaId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Producto creado" });
      router.push(`/productos/${data.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/productos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nuevo producto</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} required placeholder="MAT-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.categoriaId}
                onChange={(e) => set("categoriaId", e.target.value)}
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Descripción</Label>
              <textarea
                className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.descripcion}
                onChange={(e) => set("descripcion", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Precios y IVA</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Precio costo (€) *</Label>
              <Input type="number" step="0.01" min="0" value={form.precioCosto} onChange={(e) => set("precioCosto", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Precio venta (€) *</Label>
              <Input type="number" step="0.01" min="0" value={form.precioVenta} onChange={(e) => set("precioVenta", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>IVA (%)</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.iva}
                onChange={(e) => set("iva", e.target.value)}
              >
                {["0","4","10","21"].map((v) => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Stock</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Stock actual</Label>
              <Input type="number" step="0.001" min="0" value={form.stockActual} onChange={(e) => set("stockActual", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stock mínimo</Label>
              <Input type="number" step="0.001" min="0" value={form.stockMinimo} onChange={(e) => set("stockMinimo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Input value={form.unidad} onChange={(e) => set("unidad", e.target.value)} placeholder="ud, kg, m..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/productos"><Button variant="outline" type="button">Cancelar</Button></Link>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Guardar producto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
