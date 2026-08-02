import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ResearchResult } from './types';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#1a1a2e' },
  header: { marginBottom: 24, borderBottom: '2 solid #4f6ef7', paddingBottom: 12 },
  companyName: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtle: { fontSize: 9, color: '#666' },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    color: '#3c56e0',
    textTransform: 'uppercase'
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 110, fontWeight: 700 },
  value: { flex: 1 },
  bullet: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { width: 12 },
  bulletText: { flex: 1 },
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1 solid #ccc', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #eee' },
  colName: { width: '40%', fontWeight: 700 },
  colWebsite: { width: '60%' },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, fontSize: 8, color: '#999', textAlign: 'center' }
});

function ReportDocument({ result }: { result: ResearchResult }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{result.companyName}</Text>
          <Text style={styles.subtle}>
            AI Company Research Report — Generated {new Date().toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Website</Text>
            <Text style={styles.value}>{result.website || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{result.phone || 'Not available'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{result.address || 'Not available'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products / Services</Text>
          {result.productsServices.length === 0 && <Text>No products/services identified.</Text>}
          {result.productsServices.map((item, i) => (
            <View style={styles.bullet} key={i}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Generated Pain Points</Text>
          {result.painPoints.length === 0 && <Text>No pain points identified.</Text>}
          {result.painPoints.map((item, i) => (
            <View style={styles.bullet} key={i}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competitor Analysis</Text>
          {result.competitors.length === 0 && <Text>No competitors identified.</Text>}
          {result.competitors.length > 0 && (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.colName}>Competitor</Text>
                <Text style={styles.colWebsite}>Website</Text>
              </View>
              {result.competitors.map((c, i) => (
                <View style={styles.tableRow} key={i}>
                  <Text style={styles.colName}>{c.name}</Text>
                  <Text style={styles.colWebsite}>{c.website}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.footer} fixed>
          AI Company Research Assistant — Automatically generated report
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReportPdf(result: ResearchResult): Promise<Buffer> {
  return renderToBuffer(<ReportDocument result={result} />);
}
