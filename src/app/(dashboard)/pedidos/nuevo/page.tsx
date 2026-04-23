"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DocumentoForm, type DocumentoFormData } from "@/components/documentos/DocumentoForm";
import { useToast } from "@/hooks/use-toast";

function NuevoPedidoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const defaultClienteId = searchParams.get("clienteId") ?? undefined;

  async function handleSubmit(data: DocumentoFormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: "Pedido creado", description: result.numero });
      router.push(`/pedidos/${result.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pedidos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nuevo pedido</h1>
      </div>
      <DocumentoForm tipo="pedido" defaultClienteId={defaultClienteId} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}

export default function NuevoPedidoPage() {
  return <Suspense><NuevoPedidoContent /></Suspense>;
}
