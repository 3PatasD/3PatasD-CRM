import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const estadoConfig: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  // Presupuesto
  BORRADOR: { label: "Borrador", variant: "secondary" },
  ENVIADO: { label: "Enviado", variant: "info" },
  ACEPTADO: { label: "Aceptado", variant: "success" },
  RECHAZADO: { label: "Rechazado", variant: "destructive" },
  CADUCADO: { label: "Caducado", variant: "outline" },
  // Pedido
  PENDIENTE: { label: "Pendiente", variant: "warning" },
  EN_PROCESO: { label: "En proceso", variant: "info" },
  PREPARADO: { label: "Preparado", variant: "secondary" },
  ENTREGADO: { label: "Entregado", variant: "success" },
  CANCELADO: { label: "Cancelado", variant: "destructive" },
  // Albarán
  DEVUELTO: { label: "Devuelto", variant: "destructive" },
  // Factura
  EMITIDA: { label: "Emitida", variant: "info" },
  PAGADA: { label: "Pagada", variant: "success" },
  VENCIDA: { label: "Vencida", variant: "destructive" },
  ANULADA: { label: "Anulada", variant: "outline" },
  // Compra
  RECIBIDA_PARCIAL: { label: "Recibida parcial", variant: "warning" },
  RECIBIDA: { label: "Recibida", variant: "success" },
};

export function StatusBadge({ estado }: { estado: string }) {
  const config = estadoConfig[estado] ?? { label: estado, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
