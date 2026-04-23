import { Document, Page, Text, View, styles, PDFHeader, PDFClienteBlock, PDFFooter, toDecimal, formatEuroPDF, formatDatePDF } from "./PDFBase";

export function PDFFactura({ factura, empresa }: { factura: Record<string, unknown>; empresa: Record<string, unknown> | null }) {
  const f = factura as { numero: string; estado: string; fechaEmision: string; fechaVencimiento?: string; metodoPago?: string; cliente: Record<string, unknown>; albaranes: { lineas: Record<string, unknown>[] }[]; subtotal: number; totalIva: number; total: number; notasCliente?: string };
  const e = empresa as { nombre: string; cif: string; direccion: string; ciudad: string; codigoPostal: string; pais: string; telefono?: string; email?: string; logoUrl?: string; datosBancarios?: string } | null;
  const allLineas = f.albaranes.flatMap((a) => a.lineas);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader empresa={e} titulo="FACTURA" numero={f.numero} fecha={formatDatePDF(f.fechaEmision)} />
        <PDFClienteBlock cliente={f.cliente as { nombre: string; cifNif?: string; email?: string; direccion?: string; ciudad?: string; codigoPostal?: string }} />

        {(f.fechaVencimiento || f.metodoPago) && (
          <View style={[styles.section, { marginBottom: 6 }]}>
            {f.fechaVencimiento && <Text style={{ fontSize: 8, color: "#666" }}>Vencimiento: {formatDatePDF(f.fechaVencimiento)}</Text>}
            {f.metodoPago && <Text style={{ fontSize: 8, color: "#666" }}>Forma de pago: {f.metodoPago}</Text>}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.flex1]}>Descripción</Text>
            <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>Cantidad</Text>
            <Text style={[styles.tableHeaderCell, { width: 80, textAlign: "right" }]}>P.Unit.</Text>
            <Text style={[styles.tableHeaderCell, { width: 40, textAlign: "right" }]}>IVA%</Text>
            <Text style={[styles.tableHeaderCell, { width: 80, textAlign: "right" }]}>Subtotal</Text>
          </View>
          {allLineas.map((l, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
              <Text style={[styles.tableCell, styles.flex1]}>{l.descripcion as string}</Text>
              <Text style={[styles.tableCell, { width: 70, textAlign: "right" }]}>{toDecimal(l.cantidad as number)}</Text>
              <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>{formatEuroPDF(l.precioUnitario as number)}</Text>
              <Text style={[styles.tableCell, { width: 40, textAlign: "right" }]}>{toDecimal(l.iva as number)}%</Text>
              <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>{formatEuroPDF(l.subtotal as number)}</Text>
            </View>
          ))}
        </View>

        <View style={{ alignItems: "flex-end", marginTop: 8 }}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Base imponible</Text><Text style={styles.totalValue}>{formatEuroPDF(f.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA</Text><Text style={styles.totalValue}>{formatEuroPDF(f.totalIva)}</Text></View>
          <View style={styles.totalFinal}><Text style={styles.totalFinalLabel}>TOTAL</Text><Text style={styles.totalFinalValue}>{formatEuroPDF(f.total)}</Text></View>
        </View>

        {e?.datosBancarios && (
          <View style={[styles.section, { marginTop: 20, padding: 8, backgroundColor: "#f0f4ff", borderRadius: 4 }]}>
            <Text style={styles.sectionTitle}>Datos bancarios para el pago</Text>
            <Text style={{ fontSize: 8 }}>{e.datosBancarios}</Text>
          </View>
        )}

        <PDFFooter empresa={e} />
      </Page>
    </Document>
  );
}
