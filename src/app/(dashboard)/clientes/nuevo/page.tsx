"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function NuevoClientePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "", cifNif: "", email: "", telefono: "", movil: "",
    direccion: "", ciudad: "", codigoPostal: "", pais: "España", notas: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Cliente creado", description: `${form.nombre} ha sido añadido.` });
      router.push(`/clientes/${data.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al crear cliente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/clientes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo cliente</h1>
          <p className="text-muted-foreground text-sm">Añade un nuevo cliente a tu cartera</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos principales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nombre">Nombre / Razón social *</Label>
              <Input id="nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cifNif">CIF / NIF</Label>
              <Input id="cifNif" value={form.cifNif} onChange={(e) => set("cifNif", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movil">Móvil</Label>
              <Input id="movil" value={form.movil} onChange={(e) => set("movil", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dirección</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="codigoPostal">Código postal</Label>
              <Input id="codigoPostal" value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pais">País</Label>
              <Input id="pais" value={form.pais} onChange={(e) => set("pais", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notas internas</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Notas sobre el cliente..."
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/clientes"><Button variant="outline" type="button">Cancelar</Button></Link>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Guardar cliente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
