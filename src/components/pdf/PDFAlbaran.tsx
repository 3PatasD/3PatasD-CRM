import { Document, Page, Text, View, styles, PDFHeader, PDFClienteBlock, PDFFooter, toDecimal, formatEuroPDF, formatDatePDF } from "./PDFBase";

export function PDFAlbaran({ albaran, empresa }: { albaran: Record<string, unknown>; empresa: Record<string, unknown> | null }) {
  const a = albaran as { numero: string; estado: string; fechaEmision: string; pedido: { cliente: Record<string, unknown>; numero: string }; lineas: Record<string, unknown>[] };
  const e = empresa as { nombre: string; cif: string; direccion: string; ciudad: string; codigoPostal: string; pais: string; telefono?: string; email?: string; logoUrl?: string; datosBancarios?: string } | null;
  const lineas = a.lineas as Record<string, unknown>[];
  const total = lineas.reduce((acc, l) => acc + toDecimal(l.subtotal as number), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader empresa={e} titulo="ALBARÁN DE ENTREGA" numero={a.numero} fecha={formatDatePDF(a.fechaEmision)} />
        <PDFClienteBlock cliente={a.pedido.cliente as { nombre: string; cifNif?: string; email?: string; direccion?: string; ciudad?: string; codigoPostal?: string }} />

        <View style={[styles.section, { marginBottom: 6 }]}>
          <Text style={{ fontSize: 8, color: "#666" }}>Pedido: {a.pedido.numero}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.flex1]}>Descripción</Text>
            <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>Cantidad</Text>
            <Text style={[styles.tableHeaderCell, { width: 80, textAlign: "right" }]}>P.Unit.</Text>
            <Text style={[styles.tableHeaderCell, { width: 40, textAlign: "right" }]}>IVA%</Text>
            <Text style={[styles.tableHeaderCell, { width: 80, textAlign: "right" }]}>Subtotal</Text>
          </View>
          {lineas.map((l, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
              <Text style={[styles.tableCell, styles.flex1]}>{l.descripcion as string}</Text>
              <Text style={[styles.tableCell, { width: 70, textAlign: "right" }]}>{toDecimal(l.cantidad as number)}</Text>
              <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>{formatEuroPDF(l.precioUnitario as number)}</Text>
              <Text style={[styles.tableCell, { width: 40, textAlign: "right" }]}>{toDecimal(l.iva as number)}%</Text>
              <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>{formatEuroPDF(l.subtotal as number)}</Text>
            </View>
          ))}
        </View>

        <View style={{ alignItems: "flex-end", marginTop: 6 }}>
          <View style={{ flexDirection: "row", width: 160, borderTopWidth: 1, borderTopColor: "#222", paddingTop: 4 }}>
            <Text style={{ flex: 1, fontSize: 11, fontFamily: "Helvetica-Bold" }}>TOTAL</Text>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{formatEuroPDF(total)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 40, flexDirection: "row", gap: 40 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, color: "#888", marginBottom: 24 }}>Firma recepción:</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: "#ccc" }} />
            <Text style={{ fontSize: 7, color: "#aaa", marginTop: 4 }}>Nombre y DNI</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, color: "#888", marginBottom: 24 }}>Fecha de entrega:</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: "#ccc" }} />
          </View>
        </View>

        <PDFFooter empresa={e} />
      </Page>
    </Document>
  );
}
