import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getDbConnection();
    const resellers = await pool.request().query("SELECT kode, nama FROM reseller WHERE aktif = 1 ORDER BY nama");
    const products = await pool.request().query("SELECT DISTINCT kode_produk FROM transaksi WHERE kode_produk IS NOT NULL AND kode_produk != '' ORDER BY kode_produk");
    const terminals = await pool.request().query("SELECT DISTINCT kode_terminal FROM inbox WHERE kode_terminal IS NOT NULL ORDER BY kode_terminal");
    const serviceCenters = await pool.request().query("SELECT DISTINCT service_center FROM inbox WHERE service_center IS NOT NULL AND service_center != '' ORDER BY service_center");
    
    return NextResponse.json({
      resellers: resellers.recordset,
      products: products.recordset.map(r => r.kode_produk),
      terminals: terminals.recordset.map(r => r.kode_terminal),
      serviceCenters: serviceCenters.recordset.map(r => r.service_center)
    });
  } catch (err) {
    console.warn("SQL Query failed, returning mock filters metadata.");
    return NextResponse.json({
      resellers: [
        { kode: 'R001', nama: 'Indo Cell' },
        { kode: 'R002', nama: 'Best Multipayment' },
        { kode: 'R003', nama: 'Metro Pulsa' }
      ],
      products: ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50'],
      terminals: [1, 2, 3],
      serviceCenters: ['SMS CENTER 1', 'TELEGRAM CENTER', 'WA CENTER']
    });
  }
}