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

export default function NuevoProveedorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "", cifNif: "", email: "", telefono: "", contacto: "",
    direccion: "", ciudad: "", codigoPostal: "", pais: "España", notas: "",
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Proveedor creado" });
      router.push(`/proveedores/${data.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/proveedores"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nuevo proveedor</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del proveedor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nombre / Razón social *</Label>
              <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required />
            </div>
            {[["cifNif","CIF / NIF"],["email","Email"],["telefono","Teléfono"],["contacto","Persona de contacto"]].map(([f, label]) => (
              <div key={f} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type={f === "email" ? "email" : "text"} value={(form as Record<string,string>)[f]} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Dirección</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
            </div>
            {[["ciudad","Ciudad"],["codigoPostal","Código postal"],["pais","País"]].map(([f, label]) => (
              <div key={f} className="space-y-1.5">
                <Label>{label}</Label>
                <Input value={(form as Record<string,string>)[f]} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3">
          <Link href="/proveedores"><Button variant="outline" type="button">Cancelar</Button></Link>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Guardar proveedor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
