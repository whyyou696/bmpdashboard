import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') || '';
  const date = searchParams.get('date') || '';

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();

    let conditions = ["status = 20"];

    if (search) {
      conditions.push("(tujuan LIKE @search OR kode LIKE @search OR kode_produk LIKE @search OR sn LIKE @search)");
      dbRequest.input("search", sql.VarChar, `%${search}%`);
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      conditions.push("CONVERT(date, tgl_entri) = @date");
      dbRequest.input("date", sql.VarChar, date);
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const countResult = await dbRequest.query(`SELECT COUNT(*) AS total FROM transaksi ${whereClause}`);
    const total = countResult.recordset[0].total;

    dbRequest.input("offset", sql.Int, offset);
    dbRequest.input("limit", sql.Int, limit);

    const result = await dbRequest.query(`
      SELECT kode, tgl_entri, kode_produk, tujuan, harga, harga_beli, status, sn
      FROM transaksi
      ${whereClause}
      ORDER BY tgl_entri DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    return NextResponse.json({
      data: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.warn("SQL Query failed, falling back to mock /transactions/success.");
    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    });
  }
}