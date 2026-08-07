import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const reseller = searchParams.get('reseller') || '';
  const product = searchParams.get('product') || '';
  const status = searchParams.get('status') || '';
  const dateMode = searchParams.get('dateMode') || 'today';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();
    let conditions = ["t.kode_reseller LIKE 'BEST%'"]; // Best Multipayment dataset only

    if (search) {
      conditions.push("(t.tujuan LIKE @search OR CAST(t.kode AS VARCHAR) LIKE @search OR t.kode_produk LIKE @search OR t.sn LIKE @search OR r.nama LIKE @search OR t.kode_reseller LIKE @search OR t.pengirim LIKE @search)");
      dbRequest.input("search", sql.VarChar, `%${search}%`);
    }

    if (reseller) {
      conditions.push("(t.kode_reseller = @reseller OR r.nama LIKE @reseller)");
      dbRequest.input("reseller", sql.VarChar, reseller.includes('%') ? reseller : `%${reseller}%`);
    }

    if (product) {
      conditions.push("t.kode_produk = @product");
      dbRequest.input("product", sql.VarChar, product);
    }

    // Date Filtering: today default, all, custom range
    if (dateMode !== 'all') {
      if (dateMode === 'custom' && startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        conditions.push("CONVERT(date, t.tgl_entri) >= @startDate AND CONVERT(date, t.tgl_entri) <= @endDate");
        dbRequest.input("startDate", sql.VarChar, startDate);
        dbRequest.input("endDate", sql.VarChar, endDate);
      } else if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        conditions.push("CONVERT(date, t.tgl_entri) = @startDate");
        dbRequest.input("startDate", sql.VarChar, startDate);
      } else {
        conditions.push("CONVERT(date, t.tgl_entri) = CONVERT(date, GETDATE())");
      }
    }

    if (status) {
      if (status === 'Success') conditions.push("t.status = 20");
      else if (status === 'Duplicate Transaction') conditions.push("t.status IN (52, 54)");
      else if (status === 'Failed') conditions.push("t.status IN (40, 50, 55)");
      else if (status === 'Processing') conditions.push("t.status IN (0, 1, 2)");
      else if (status === 'Pending') conditions.push("t.status NOT IN (20, 40, 50, 52, 54, 55, 0, 1, 2)");
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const query = `
      SELECT
        COUNT(1) as totalRequestsToday,
        SUM(CASE WHEN t.status = 20 THEN 1 ELSE 0 END) as successfulTxs,
        SUM(CASE WHEN t.status IN (52, 54) THEN 1 ELSE 0 END) as duplicateTxs,
        SUM(CASE WHEN t.status IN (40, 50, 55) THEN 1 ELSE 0 END) as failedTxs,
        SUM(CASE WHEN t.status IN (0, 1, 2, 3) OR t.status NOT IN (20, 40, 50, 52, 54, 55) THEN 1 ELSE 0 END) as pendingTxs
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${whereClause}
    `;

    const result = await dbRequest.query(query);
    const stats = result.recordset[0] || {};

    return NextResponse.json({
      totalRequestsToday: stats.totalRequestsToday || 0,
      successfulTxs: stats.successfulTxs || 0,
      duplicateTxs: stats.duplicateTxs || 0,
      failedTxs: stats.failedTxs || 0,
      pendingTxs: stats.pendingTxs || 0
    });
  } catch (err) {
    console.warn("SQL Query failed, returning real mock statistics:", err.message);
    
    return NextResponse.json({
      totalRequestsToday: 0,
      successfulTxs: 0,
      duplicateTxs: 0,
      failedTxs: 0,
      pendingTxs: 0
    });
  }
}