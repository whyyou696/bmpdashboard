import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getDbConnection();
    
    // Fast queries with NOLOCK
    let products = [];
    try {
      const prodRes = await pool.request().query("SELECT kode as kode_produk FROM produk WITH (NOLOCK) WHERE aktif = 1 ORDER BY kode");
      products = prodRes.recordset.map(r => r.kode_produk);
    } catch {
      const prodRes = await pool.request().query("SELECT DISTINCT TOP 100 kode_produk FROM transaksi WITH (NOLOCK) WHERE kode_reseller LIKE 'BEST%' AND kode_produk IS NOT NULL ORDER BY kode_produk");
      products = prodRes.recordset.map(r => r.kode_produk);
    }

    const modulesRes = await pool.request().query("SELECT kode, label FROM modul WITH (NOLOCK) WHERE aktif = 1 ORDER BY label");
    const resellersRes = await pool.request().query("SELECT kode, nama FROM reseller WITH (NOLOCK) WHERE kode LIKE 'BEST%' AND aktif = 1 ORDER BY nama");

    return NextResponse.json({
      products,
      modules: modulesRes.recordset,
      resellers: resellersRes.recordset
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
        { kode: 'BEST001', nama: 'DIGIFLAZZ BEST' },
        { kode: 'BEST0819', nama: 'CHIKA MP RELOAD' },
        { kode: 'BEST1305', nama: 'PIXEL TELEMEDIA' }
      ]
    });
  }
}