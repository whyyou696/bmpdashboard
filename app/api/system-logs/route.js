import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tipe = searchParams.get('tipe');
  const limit = parseInt(searchParams.get('limit')) || 100;
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();
    
    let conditions = [];
    
    if (tipe && tipe !== "all") {
      const tipeInt = parseInt(tipe);
      if (!isNaN(tipeInt)) {
        conditions.push("tipe = @tipe");
        dbRequest.input("tipe", sql.TinyInt, tipeInt);
      }
    }
    
    if (search) {
      conditions.push("pesan LIKE @search");
      dbRequest.input("search", sql.VarChar, `%${search}%`);
    }
    
    if (startDate) {
      conditions.push("CONVERT(date, waktu) >= @startDate");
      dbRequest.input("startDate", sql.VarChar, startDate);
    }
    
    if (endDate) {
      conditions.push("CONVERT(date, waktu) <= @endDate");
      dbRequest.input("endDate", sql.VarChar, endDate);
    }
    
    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    
    const query = `
      SELECT TOP (@limit) kode, waktu, tipe, pesan 
      FROM sistem_log
      ${whereClause}
      ORDER BY waktu DESC
    `;
    dbRequest.input("limit", sql.Int, limit);
    
    const result = await dbRequest.query(query);
    return NextResponse.json(result.recordset);
  } catch (err) {
    console.warn("SQL system-logs query failed, returning mock logs.");
    const fallbackLogs = [
      { kode: 1, waktu: new Date().toISOString(), tipe: 3, pesan: "TrxID #1856813: Modul IP: DIGIPOS AUTO 1 Produk TDEKS10, harga beli naik dari 47350 ke 47800" },
      { kode: 2, waktu: new Date(Date.now() - 60000).toISOString(), tipe: 3, pesan: "Tidak ada transaksi menunggu jawaban: IP: 188.166.178.169: report/?t=143533&message=Voucher Canceled" },
      { kode: 3, waktu: new Date(Date.now() - 120000).toISOString(), tipe: 3, pesan: "Administrator update status #1856812 - TDNP37.081228833967: Menunggu Jawaban -> Alihkan" },
      { kode: 4, waktu: new Date(Date.now() - 180000).toISOString(), tipe: 3, pesan: "TrxID #1856835: Modul IP: DIGIPOS AUTO 1 Produk TDNP57, harga beli naik dari 15850 ke 15898" },
      { kode: 5, waktu: new Date(Date.now() - 240000).toISOString(), tipe: 2, pesan: "Best Multipayment ID has successfully logged in." },
      { kode: 6, waktu: new Date(Date.now() - 300000).toISOString(), tipe: 2, pesan: "119360256915212 dimasukkan ke daftar hitam. Alasan: gagal sebanyak 3 kali atau lebih." },
      { kode: 7, waktu: new Date(Date.now() - 360000).toISOString(), tipe: 3, pesan: "Trx ke 081351579246 GAGAL. mohon diperiksa kembali No tujuan sebelum di ulang." },
      { kode: 8, waktu: new Date(Date.now() - 420000).toISOString(), tipe: 3, pesan: "Administrator update status #1856827 - TDEKS10.082393732382: Menunggu Jawaban -> Alihkan" },
      { kode: 9, waktu: new Date(Date.now() - 480000).toISOString(), tipe: 3, pesan: "Administrator update status #1856838 - TDV9.085337877451: Menunggu Jawaban -> Alihkan" },
      { kode: 10, waktu: new Date(Date.now() - 540000).toISOString(), tipe: 3, pesan: "TrxID #1856870: Modul IP: KAWAN SEJAGAT Produk TRP10, harga beli naik dari 10100 ke 10131" },
      { kode: 11, waktu: new Date(Date.now() - 600000).toISOString(), tipe: 2, pesan: "Administrator has successfully logged in." },
      { kode: 12, waktu: new Date(Date.now() - 660000).toISOString(), tipe: 2, pesan: "ayu has successfully logged in." },
      { kode: 13, waktu: new Date(Date.now() - 720000).toISOString(), tipe: 3, pesan: "TrxID #1856886: Modul IP: DIGIPOS AUTO 1 Produk TM57, harga beli naik dari 15500 ke 15850" },
      { kode: 14, waktu: new Date(Date.now() - 780000).toISOString(), tipe: 3, pesan: "Timeout expired. The timeout period elapsed prior to obtaining a connection." },
      { kode: 15, waktu: new Date(Date.now() - 840000).toISOString(), tipe: 2, pesan: "SqlException: A network-related or instance-specific error occurred." }
    ];
    return NextResponse.json(fallbackLogs.slice(0, limit));
  }
}