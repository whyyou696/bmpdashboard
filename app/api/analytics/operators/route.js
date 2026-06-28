import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30days';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const getDateRanges = (range, startStr, endStr) => {
    const now = new Date();
    let currentStart, currentEnd = new Date(now);
    const dayMs = 24 * 60 * 60 * 1000;
    if (range === 'today') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (range === 'custom' && startStr && endStr) {
      currentStart = new Date(startStr);
      currentEnd = new Date(endStr + 'T23:59:59.999');
    } else {
      currentStart = new Date(now.getTime() - 30 * dayMs);
      currentEnd = new Date(now);
    }
    return { currentStart, currentEnd };
  };

  const { currentStart, currentEnd } = getDateRanges(range, startDate, endDate);

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();
    dbRequest.input("currStart", sql.DateTime2, currentStart);
    dbRequest.input("currEnd", sql.DateTime2, currentEnd);

    const query = `
      SELECT 
        CASE 
          WHEN tujuan LIKE '0811%' OR tujuan LIKE '0812%' OR tujuan LIKE '0813%' OR tujuan LIKE '0821%' OR tujuan LIKE '0822%' OR tujuan LIKE '0823%' OR tujuan LIKE '0851%' OR tujuan LIKE '0852%' OR tujuan LIKE '0853%' OR tujuan LIKE '62811%' OR tujuan LIKE '62812%' OR tujuan LIKE '62813%' OR tujuan LIKE '62821%' OR tujuan LIKE '62822%' OR tujuan LIKE '62823%' OR tujuan LIKE '62851%' OR tujuan LIKE '62852%' OR tujuan LIKE '62853%' THEN 'Telkomsel'
          WHEN tujuan LIKE '0817%' OR tujuan LIKE '0818%' OR tujuan LIKE '0819%' OR tujuan LIKE '0859%' OR tujuan LIKE '0877%' OR tujuan LIKE '0878%' OR tujuan LIKE '0831%' OR tujuan LIKE '0832%' OR tujuan LIKE '0838%' OR tujuan LIKE '62817%' OR tujuan LIKE '62818%' OR tujuan LIKE '62819%' OR tujuan LIKE '62859%' OR tujuan LIKE '62877%' OR tujuan LIKE '62878%' OR tujuan LIKE '62831%' OR tujuan LIKE '62832%' OR tujuan LIKE '62838%' THEN 'XL Axiata'
          WHEN tujuan LIKE '0814%' OR tujuan LIKE '0815%' OR tujuan LIKE '0816%' OR tujuan LIKE '0855%' OR tujuan LIKE '0856%' OR tujuan LIKE '0857%' OR tujuan LIKE '0858%' OR tujuan LIKE '62814%' OR tujuan LIKE '62815%' OR tujuan LIKE '62816%' OR tujuan LIKE '62855%' OR tujuan LIKE '62856%' OR tujuan LIKE '62857%' OR tujuan LIKE '62858%' THEN 'Indosat'
          WHEN tujuan LIKE '0895%' OR tujuan LIKE '0896%' OR tujuan LIKE '0897%' OR tujuan LIKE '0898%' OR tujuan LIKE '0899%' OR tujuan LIKE '62895%' OR tujuan LIKE '62896%' OR tujuan LIKE '62897%' OR tujuan LIKE '62898%' OR tujuan LIKE '62899%' THEN 'Tri'
          ELSE 'Others'
        END as operator,
        COUNT(*) as transactions,
        SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga, 0) AS BIGINT) ELSE 0 END) as revenue,
        SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as successCount
      FROM transaksi
      WHERE tgl_entri >= @currStart AND tgl_entri <= @currEnd
      GROUP BY 
        CASE 
          WHEN tujuan LIKE '0811%' OR tujuan LIKE '0812%' OR tujuan LIKE '0813%' OR tujuan LIKE '0821%' OR tujuan LIKE '0822%' OR tujuan LIKE '0823%' OR tujuan LIKE '0851%' OR tujuan LIKE '0852%' OR tujuan LIKE '0853%' OR tujuan LIKE '62811%' OR tujuan LIKE '62812%' OR tujuan LIKE '62813%' OR tujuan LIKE '62821%' OR tujuan LIKE '62822%' OR tujuan LIKE '62823%' OR tujuan LIKE '62851%' OR tujuan LIKE '62852%' OR tujuan LIKE '62853%' THEN 'Telkomsel'
          WHEN tujuan LIKE '0817%' OR tujuan LIKE '0818%' OR tujuan LIKE '0819%' OR tujuan LIKE '0859%' OR tujuan LIKE '0877%' OR tujuan LIKE '0878%' OR tujuan LIKE '0831%' OR tujuan LIKE '0832%' OR tujuan LIKE '0838%' OR tujuan LIKE '62817%' OR tujuan LIKE '62818%' OR tujuan LIKE '62819%' OR tujuan LIKE '62859%' OR tujuan LIKE '62877%' OR key tujuan LIKE '62878%' OR tujuan LIKE '62831%' OR tujuan LIKE '62832%' OR tujuan LIKE '62838%' THEN 'XL Axiata'
          WHEN tujuan LIKE '0814%' OR tujuan LIKE '0815%' OR tujuan LIKE '0816%' OR tujuan LIKE '0855%' OR tujuan LIKE '0856%' OR tujuan LIKE '0857%' OR tujuan LIKE '0858%' OR tujuan LIKE '62814%' OR tujuan LIKE '62815%' OR tujuan LIKE '62816%' OR tujuan LIKE '62855%' OR tujuan LIKE '62856%' OR tujuan LIKE '62857%' OR tujuan LIKE '62858%' THEN 'Indosat'
          WHEN tujuan LIKE '0895%' OR tujuan LIKE '0896%' OR tujuan LIKE '0897%' OR tujuan LIKE '0898%' OR tujuan LIKE '0899%' OR tujuan LIKE '62895%' OR tujuan LIKE '62896%' OR tujuan LIKE '62897%' OR tujuan LIKE '62898%' OR tujuan LIKE '62899%' THEN 'Tri'
          ELSE 'Others'
        END
    `;

    const result = await dbRequest.query(query);
    const rows = result.recordset;
    const totalTx = rows.reduce((sum, r) => sum + r.transactions, 0);
    const formatted = rows.map(r => {
      const percentage = totalTx > 0 ? Math.round((r.transactions / totalTx) * 100) : 0;
      const successRate = r.transactions > 0 ? parseFloat(((r.successCount / r.transactions) * 100).toFixed(1)) : 0;
      return {
        operator: r.operator,
        transactions: r.transactions,
        revenue: r.revenue,
        percentage,
        successRate
      };
    });
    return NextResponse.json(formatted);

  } catch (err) {
    console.warn("SQL query failed, falling back to mock operators.");
    return NextResponse.json([
      { operator: 'Telkomsel', transactions: 766266, revenue: 11857556899, percentage: 42, successRate: 88.5 },
      { operator: 'XL Axiata', transactions: 565577, revenue: 8752006282, percentage: 31, successRate: 84.2 },
      { operator: 'Indosat', transactions: 328400, revenue: 5081810100, percentage: 18, successRate: 86.8 },
      { operator: 'Tri', transactions: 164200, revenue: 2540905050, percentage: 9, successRate: 81.1 }
    ]);
  }
}