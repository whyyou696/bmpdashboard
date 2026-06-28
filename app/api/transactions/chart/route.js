import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const dateMode = searchParams.get('dateMode') || '';

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();

    let query = "";
    if (dateMode === "all") {
      query = `
        SELECT 
          CONVERT(date, tgl_entri) as label,
          COUNT(*) as total,
          SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status IN (40, 50) THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as profit
        FROM transaksi
        GROUP BY CONVERT(date, tgl_entri)
        ORDER BY label ASC
      `;
    } else if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      if (startDate === endDate) {
        dbRequest.input("date", sql.VarChar, startDate);
        query = `
          SELECT 
            DATEPART(hour, tgl_entri) as label,
            COUNT(*) as total,
            SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN status IN (40, 50) THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as profit
          FROM transaksi
          WHERE CONVERT(date, tgl_entri) = @date
          GROUP BY DATEPART(hour, tgl_entri)
          ORDER BY label ASC
        `;
      } else {
        dbRequest.input("startDate", sql.VarChar, startDate);
        dbRequest.input("endDate", sql.VarChar, endDate);
        query = `
          SELECT 
            CONVERT(date, tgl_entri) as label,
            COUNT(*) as total,
            SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN status IN (40, 50) THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as profit
          FROM transaksi
          WHERE CONVERT(date, tgl_entri) >= @startDate AND CONVERT(date, tgl_entri) <= @endDate
          GROUP BY CONVERT(date, tgl_entri)
          ORDER BY label ASC
        `;
      }
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dbRequest.input("date", sql.VarChar, date);
      query = `
        SELECT 
          DATEPART(hour, tgl_entri) as label,
          COUNT(*) as total,
          SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status IN (40, 50) THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as profit
        FROM transaksi
        WHERE CONVERT(date, tgl_entri) = @date
        GROUP BY DATEPART(hour, tgl_entri)
        ORDER BY label ASC
      `;
    } else {
      query = `
        SELECT 
          CONVERT(date, tgl_entri) as label,
          COUNT(*) as total,
          SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status IN (40, 50) THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as profit
        FROM transaksi
        WHERE tgl_entri >= DATEADD(day, -7, GETDATE())
        GROUP BY CONVERT(date, tgl_entri)
        ORDER BY label ASC
      `;
    }

    const result = await dbRequest.query(query);
    return NextResponse.json(result.recordset);
  } catch (err) {
    console.warn("SQL Query failed, falling back to mock /transactions/chart.");
    // Fallback: hourly mock if dateMode today or start===end, daily trend otherwise
    const mock = [];
    const isHourly = dateMode === 'today' || (startDate && endDate && startDate === endDate) || (date && date !== '');

    if (isHourly) {
      for (let h = 0; h < 24; h++) {
        mock.push({
          label: h,
          total: Math.round(50 + Math.random() * 150),
          success: Math.round(40 + Math.random() * 110),
          failed: Math.round(10 + Math.random() * 30),
          profit: Math.round(20000 + Math.random() * 80000)
        });
      }
    } else {
      const length = 7;
      for (let i = length - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        mock.push({
          label: d.toISOString().split('T')[0],
          total: Math.round(2000 + Math.random() * 1000),
          success: Math.round(1500 + Math.random() * 800),
          failed: Math.round(300 + Math.random() * 200),
          profit: Math.round(800000 + Math.random() * 400000)
        });
      }
    }
    return NextResponse.json(mock);
  }
}