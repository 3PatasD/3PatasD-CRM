import { Document, Page, Text, View, styles, PDFHeader, PDFClienteBlock, PDFLineasTable, PDFTotales, PDFFooter, toDecimal, formatDatePDF } from "./PDFBase";

export function PDFPresupuesto({ presupuesto, empresa }: { presupuesto: Record<string, unknown>; empresa: Record<string, unknown> | null }) {
  const p = presupuesto as { numero: string; estado: string; fechaEmision: string; fechaValidez?: string; cliente: Record<string, unknown>; lineas: Record<string, unknown>[]; subtotal: number; descuentoGlobal?: number; descuentoPromo?: number; totalIva: number; total: number; notasCliente?: string };
  const e = empresa as { nombre: string; cif: string; direccion: string; ciudad: string; codigoPostal: string; pais: string; telefono?: string; email?: string; logoUrl?: string; datosBancarios?: string } | null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader empresa={e} titulo="PRESUPUESTO" numero={p.numero} fecha={formatDatePDF(p.fechaEmision)} />
        <PDFClienteBlock cliente={p.cliente as { nombre: string; cifNif?: string; email?: string; direccion?: string; ciudad?: string; codigoPostal?: string }} />

        {p.fechaValidez && (
          <View style={[styles.section, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 8, color: "#666" }}>Válido hasta: {formatDatePDF(p.fechaValidez)}</Text>
          </View>
        )}

        <PDFLineasTable lineas={(p.lineas as Record<string, unknown>[]).map((l) => ({
          descripcion: l.descripcion as string,
          cantidad: toDecimal(l.cantidad as number),
          precioUnitario: toDecimal(l.precioUnitario as number),
          descuento: toDecimal(l.descuento as number),
          iva: toDecimal(l.iva as number),
          subtotal: toDecimal(l.subtotal as number),
        }))} />

        <PDFTotales
          subtotal={toDecimal(p.subtotal)}
          descuentoGlobal={toDecimal(p.descuentoGlobal ?? 0)}
          descuentoPromo={toDecimal(p.descuentoPromo ?? 0)}
          totalIva={toDecimal(p.totalIva)}
          total={toDecimal(p.total)}
        />

        {p.notasCliente && (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Condiciones</Text>
            <Text style={styles.notes}>{p.notasCliente}</Text>
          </View>
        )}

        <PDFFooter empresa={e} />
      </Page>
    </Document>
  );
}
