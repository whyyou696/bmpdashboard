import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getDbConnection();
    const modules = await pool.request().query("SELECT kode, label FROM modul WITH (NOLOCK) WHERE deleted = 0 ORDER BY label");
    const resellers = await pool.request().query("SELECT kode, nama FROM reseller WITH (NOLOCK) WHERE kode LIKE 'BEST%' AND aktif = 1 ORDER BY nama");
    const products = await pool.request().query("SELECT DISTINCT TOP 50 kode_produk FROM transaksi WITH (NOLOCK) WHERE kode_reseller LIKE 'BEST%' AND kode_produk IS NOT NULL AND kode_produk != '' ORDER BY kode_produk");
    return NextResponse.json({
      modules: modules.recordset,
      resellers: resellers.recordset,
      products: products.recordset.map(p => ({ kode: p.kode_produk, nama: p.kode_produk }))
    });
  } catch (err) {
    return NextResponse.json({
      modules: [
        { kode: 1, label: 'DIGIFLAZZ 2' },
        { kode: 2, label: 'CEK MOBA 1' },
        { kode: 3, label: 'MIHARO' },
        { kode: 4, label: 'BOSTGAME 2' },
        { kode: 5, label: 'DIGIFI AZ7 2' },
        { kode: 6, label: 'KAWAN SEJAGAT' }
      ],
      resellers: [
        { kode: 'BEST001', nama: 'DIGIFLAZZ BEST' },
        { kode: 'BEST0819', nama: 'CHIKA MP RELOAD' },
        { kode: 'BEST073', nama: 'CBRS RELOAD' },
        { kode: 'BEST1305', nama: 'PIXEL TELEMEDIA' },
        { kode: 'BEST055', nama: 'AMS PAY' },
        { kode: 'BEST0607', nama: 'SPEED PERSADA' }
      ],
      products: [
        { kode: 'GFR140', nama: 'GFR140' },
        { kode: 'TMM35', nama: 'TMM35' },
        { kode: 'MGD18', nama: 'MGD18' },
        { kode: 'MLD112', nama: 'MLD112' },
        { kode: 'MLD10', nama: 'MLD10' },
        { kode: 'MLD36', nama: 'MLD36' },
        { kode: 'THAPF42', nama: 'THAPF42' },
        { kode: 'MLD28', nama: 'MLD28' },
        { kode: 'TMM77', nama: 'TMM77' },
        { kode: 'MLD19', nama: 'MLD19' },
        { kode: 'MLD12', nama: 'MLD12' }
      ]
    });
  }
}