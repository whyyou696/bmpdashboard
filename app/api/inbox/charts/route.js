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
    
    const createReq = () => {
      const dbRequest = pool.request();
      const conditions = ["t.kode_reseller LIKE 'BEST%'"]; // Best Multipayment dataset only

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

      // Date Filtering
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

      return { dbRequest, conditions };
    };

    const { dbRequest: hourlyReq, conditions: hourlyConds } = createReq();
    const hourlyWhere = "WHERE " + hourlyConds.join(" AND ");

    const hourlyQuery = `
      SELECT DATEPART(hour, t.tgl_entri) as hour, COUNT(1) as count
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${hourlyWhere}
      GROUP BY DATEPART(hour, t.tgl_entri)
      ORDER BY hour ASC
    `;
    const hourlyResult = await hourlyReq.query(hourlyQuery);

    const { dbRequest: statusReq, conditions: statusConds } = createReq();
    const statusWhere = "WHERE " + statusConds.join(" AND ");

    const statusQuery = `
      SELECT 
        SUM(CASE WHEN t.status = 20 THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN t.status IN (52, 54) THEN 1 ELSE 0 END) as duplicate,
        SUM(CASE WHEN t.status IN (40, 50, 55) THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN t.status IN (0, 1, 2, 3) OR t.status NOT IN (20, 40, 50, 52, 54, 55) THEN 1 ELSE 0 END) as pending
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${statusWhere}
    `;
    const statusResult = await statusReq.query(statusQuery);

    const { dbRequest: resReq, conditions: resConds } = createReq();
    const resWhere = "WHERE " + resConds.join(" AND ");

    const resellersQuery = `
      SELECT TOP 5 ISNULL(r.nama, t.kode_reseller) as name, COUNT(1) as count
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${resWhere}
      GROUP BY r.nama, t.kode_reseller
      ORDER BY count DESC
    `;
    const resellersResult = await resReq.query(resellersQuery);

    const { dbRequest: prodReq, conditions: prodConds } = createReq();
    const prodWhere = "WHERE " + prodConds.join(" AND ");

    const productsQuery = `
      SELECT TOP 5 t.kode_produk as product, COUNT(1) as count
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${prodWhere}
      GROUP BY t.kode_produk
      ORDER BY count DESC
    `;
    const productsResult = await prodReq.query(productsQuery);

    // Build full 24-hour array
    const hourlyMap = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;
    hourlyResult.recordset.forEach(r => {
      if (r.hour !== undefined && r.hour !== null) {
        hourlyMap[r.hour] = r.count;
      }
    });
    const fullHourly = Object.keys(hourlyMap).map(h => ({ hour: parseInt(h), count: hourlyMap[h] }));

    return NextResponse.json({
      hourlyRequests: fullHourly,
      statusDistribution: statusResult.recordset[0] || { success: 0, duplicate: 0, failed: 0, pending: 0 },
      topResellers: resellersResult.recordset || [],
      topProducts: productsResult.recordset || []
    });

  } catch (err) {
    console.warn("SQL Query failed, returning clean fallback for inbox charts:", err.message);

    const emptyHourly = [];
    for (let h = 0; h < 24; h++) emptyHourly.push({ hour: h, count: 0 });

    return NextResponse.json({
      hourlyRequests: emptyHourly,
      statusDistribution: { success: 0, duplicate: 0, failed: 0, pending: 0 },
      topResellers: [],
      topProducts: []
    });
  }
}