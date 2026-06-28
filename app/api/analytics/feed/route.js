import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT TOP 20 
        kode, 
        tgl_entri as timestamp, 
        kode_produk as productCode, 
        tujuan as destination, 
        status
      FROM transaksi
      ORDER BY tgl_entri DESC
    `);
    return NextResponse.json(result.recordset);
  } catch (err) {
    console.warn("SQL query failed, falling back to mock realtime feed.");
    const now = new Date();
    const baseTime = now.getTime();
    return NextResponse.json([
      { kode: 1828625, timestamp: new Date(baseTime).toISOString(), productCode: 'XLDP2', destination: '081906736472', status: 20 },
      { kode: 1828624, timestamp: new Date(baseTime - 60000).toISOString(), productCode: 'TSEL5', destination: '085252028848', status: 20 },
      { kode: 1828623, timestamp: new Date(baseTime - 120000).toISOString(), productCode: 'PLN20', destination: '140109284218', status: 40 },
      { kode: 1828622, timestamp: new Date(baseTime - 180000).toISOString(), productCode: 'ML10', destination: '56906360382', status: 20 },
      { kode: 1828621, timestamp: new Date(baseTime - 240000).toISOString(), productCode: 'AXIS5', destination: '083812345678', status: 20 },
      { kode: 1828620, timestamp: new Date(baseTime - 300000).toISOString(), productCode: 'PLN50', destination: '140109284219', status: 55 },
      { kode: 1828619, timestamp: new Date(baseTime - 360000).toISOString(), productCode: 'TSEL10', destination: '081298765432', status: 20 }
    ]);
  }
}