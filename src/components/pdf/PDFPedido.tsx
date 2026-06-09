import { Document, Page, styles, PDFHeader, PDFClienteBlock, PDFLineasTable, PDFTotales, PDFFooter, toDecimal, formatDatePDF } from "./PDFBase";

export function PDFPedido({ pedido, empresa }: { pedido: Record<string, unknown>; empresa: Record<string, unknown> | null }) {
  const p = pedido as { numero: string; estado: string; fechaEmision: string; fechaEntrega?: string; cliente: Record<string, unknown>; lineas: Record<string, unknown>[]; subtotal: number; descuentoGlobal?: number; descuentoPromo?: number; totalIva: number; total: number; notasCliente?: string };
  const e = empresa as { nombre: string; cif: string; direccion: string; ciudad: string; codigoPostal: string; pais: string; telefono?: string; email?: string; logoUrl?: string; datosBancarios?: string } | null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader empresa={e} titulo="PEDIDO" numero={p.numero} fecha={formatDatePDF(p.fechaEmision)} />
        <PDFClienteBlock cliente={p.cliente as { nombre: string; cifNif?: string; email?: string; direccion?: string; ciudad?: string; codigoPostal?: string }} />

        <PDFLineasTable lineas={(p.lineas as Record<string, unknown>[]).map((l) => ({
          descripcion: l.descripcion as string,
          cantidad: toDecimal(l.cantidad as number),
          precioUnitario: toDecimal(l.precioUnitario as number),
          descuento: toDecimal(l.descuento as number),
          iva: toDecimal(l.iva as number),
          subtotal: toDecimal(l.subtotal as number),
        }))} />

        <PDFTotales subtotal={toDecimal(p.subtotal)} descuentoGlobal={toDecimal(p.descuentoGlobal ?? 0)} descuentoPromo={toDecimal(p.descuentoPromo ?? 0)} totalIva={toDecimal(p.totalIva)} total={toDecimal(p.total)} />
        <PDFFooter empresa={e} />
      </Page>
    </Document>
  );
}
