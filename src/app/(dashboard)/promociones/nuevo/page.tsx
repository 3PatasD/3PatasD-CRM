"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NuevoCodigoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    codigo: "", descripcion: "", tipo: "PORCENTAJE", valor: "",
    fechaInicio: "", fechaFin: "", limiteUsos: "",
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: form.codigo.trim().toUpperCase(),
          descripcion: form.descripcion || null,
          tipo: form.tipo,
          valor: parseFloat(form.valor),
          fechaInicio: form.fechaInicio || null,
          fechaFin: form.fechaFin || null,
          limiteUsos: form.limiteUsos ? parseInt(form.limiteUsos) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Código creado", description: form.codigo });
      router.push("/promociones");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/promociones"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nuevo código promocional</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Configuración del código</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Código *</Label>
              <Input value={form.codigo} onChange={(e) => set("codigo", e.target.value.toUpperCase())} required placeholder="BIENVENIDO10" className="font-mono uppercase" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Descripción</Label>
              <Input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Descuento de bienvenida..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de descuento</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="PORCENTAJE">Porcentaje (%)</option>
                <option value="FIJO">Importe fijo (€)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor {form.tipo === "PORCENTAJE" ? "(%)" : "(€)"} *</Label>
              <Input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => set("valor", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Válido desde</Label>
              <Input type="date" value={form.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Válido hasta</Label>
              <Input type="date" value={form.fechaFin} onChange={(e) => set("fechaFin", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Límite de usos</Label>
              <Input type="number" min="1" value={form.limiteUsos} onChange={(e) => set("limiteUsos", e.target.value)} placeholder="Ilimitado" />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3">
          <Link href="/promociones"><Button variant="outline" type="button">Cancelar</Button></Link>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Crear código"}
          </Button>
        </div>
      </form>
    </div>
  );
}
