import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getDbConnection();
    const products = await pool.request().query("SELECT DISTINCT kode_produk FROM transaksi WHERE kode_produk IS NOT NULL AND kode_produk != '' ORDER BY kode_produk");
    const modules = await pool.request().query("SELECT kode, label FROM modul WHERE deleted = 0 ORDER BY label");
    const resellers = await pool.request().query("SELECT kode, nama FROM reseller WHERE aktif = 1 ORDER BY nama");
    return NextResponse.json({
      products: products.recordset.map(r => r.kode_produk),
      modules: modules.recordset,
      resellers: resellers.recordset
    });
  } catch (err) {
    return NextResponse.json({
      products: ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50', 'DANA10', 'OVO10', 'GOPAY10'],
      modules: [
        { kode: 1, label: 'DIGIPOS AUTO 1' },
        { kode: 2, label: 'KAWAN SEJAGAT' },
        { kode: 3, label: 'METRO SUP' }
      ],
      resellers: [
        { kode: 'R001', nama: 'Indo Cell' },
        { kode: 'R002', nama: 'Best Multipayment' },
        { kode: 'R003', nama: 'Metro Pulsa' }
      ]
    });
  }
}