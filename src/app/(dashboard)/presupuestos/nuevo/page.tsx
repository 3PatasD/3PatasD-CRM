"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DocumentoForm, type DocumentoFormData } from "@/components/documentos/DocumentoForm";
import { useToast } from "@/hooks/use-toast";

function NuevoPresupuestoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const defaultClienteId = searchParams.get("clienteId") ?? undefined;

  async function handleSubmit(data: DocumentoFormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: "Presupuesto creado", description: result.numero });
      router.push(`/presupuestos/${result.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al crear presupuesto", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/presupuestos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nuevo presupuesto</h1>
      </div>
      <DocumentoForm tipo="presupuesto" defaultClienteId={defaultClienteId} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}

export default function NuevoPresupuestoPage() {
  return <Suspense><NuevoPresupuestoContent /></Suspense>;
}
