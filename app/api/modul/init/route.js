import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getDbConnection();
    const modules = await pool.request().query("SELECT kode, label FROM modul WHERE deleted = 0 ORDER BY label");
    const resellers = await pool.request().query("SELECT kode, nama FROM reseller WHERE aktif = 1 ORDER BY nama");
    return NextResponse.json({
      modules: modules.recordset,
      resellers: resellers.recordset
    });
  } catch (err) {
    return NextResponse.json({
      modules: [
        { kode: 1, label: 'DIGIPOS AUTO 1' },
        { kode: 2, label: 'KAWAN SEJAGAT' },
        { kode: 3, label: 'METRO SUP' },
        { kode: 4, label: 'TSEL H2H' },
        { kode: 5, label: 'XL SUP' }
      ],
      resellers: [
        { kode: 'R001', nama: 'Indo Cell' },
        { kode: 'R002', nama: 'Best Multipayment' },
        { kode: 'R003', nama: 'Metro Pulsa' }
      ]
    });
  }
}