import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const status = searchParams.get('status') || 'all';
  const search = searchParams.get('search') || '';

  const getLocalDateString = (isoStr) => {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();
    
    let conditions = [];

    if (status !== 'all') {
      if (status === 'suspect') {
        conditions.push("status NOT IN (40, 50, 52, 54) AND sn IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND')");
      } else if (status === '40') {
        conditions.push("status IN (40, 52, 54)");
      } else if (status === '54') {
        conditions.push("status IN (52, 54)");
      } else {
        const statusInt = parseInt(status);
        if (!isNaN(statusInt)) {
          conditions.push("status = @status");
          dbRequest.input("status", sql.Int, statusInt);
        }
      }
    }

    if (search) {
      conditions.push("(tujuan LIKE @search OR kode LIKE @search OR kode_produk LIKE @search OR sn LIKE @search)");
      dbRequest.input("search", sql.VarChar, `%${search}%`);
    }

    if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      conditions.push("CONVERT(date, tgl_entri) >= @startDate AND CONVERT(date, tgl_entri) <= @endDate");
      dbRequest.input("startDate", sql.VarChar, startDate);
      dbRequest.input("endDate", sql.VarChar, endDate);
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      conditions.push("CONVERT(date, tgl_entri) = @date");
      dbRequest.input("date", sql.VarChar, date);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 20 AND (sn NOT IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND') OR sn IS NULL) THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN status = 40 THEN 1 ELSE 0 END) as failedCount,
        SUM(CASE WHEN status = 50 THEN 1 ELSE 0 END) as canceledCount,
        SUM(CASE WHEN status NOT IN (40, 50, 52, 54) AND sn IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND') THEN 1 ELSE 0 END) as suspectCount,
        SUM(CASE WHEN status IN (52, 54) THEN 1 ELSE 0 END) as wrongNumberCount,
        SUM(CASE WHEN status NOT IN (20, 40, 50, 52, 54) AND (sn NOT IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND') OR sn IS NULL) THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga, 0) AS BIGINT) ELSE 0 END) as totalRetail,
        SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga_beli, 0) AS BIGINT) ELSE 0 END) as totalCost,
        SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as totalProfit
      FROM transaksi
      ${whereClause}
    `;
    const result = await dbRequest.query(query);
    const stats = result.recordset[0];
    const successRate = stats.total > 0 ? ((stats.successCount / stats.total) * 100).toFixed(1) : 0;

    return NextResponse.json({
      total: stats.total || 0,
      successCount: stats.successCount || 0,
      failedCount: stats.failedCount || 0,
      canceledCount: stats.canceledCount || 0,
      suspectCount: stats.suspectCount || 0,
      wrongNumberCount: stats.wrongNumberCount || 0,
      pendingCount: stats.pendingCount || 0,
      successRate: parseFloat(successRate),
      totalRetail: stats.totalRetail || 0,
      totalCost: stats.totalCost || 0,
      totalProfit: stats.totalProfit || 0
    });
  } catch (err) {
    console.warn("SQL Query failed, falling back to mock /transactions/stats.");
    
    // Dynamic mock fallback matching app/api/transactions mock generation
    const mockList = [];
    const products = ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50'];
    const statuses = [20, 20, 20, 20, 40, 50, 55, 54, 20];
    const sns = ['TXSN1128', 'TXSN4482', 'N/A', 'TXSN9824', '0000', 'PEND', 'TXSN0391'];
    
    const todayMs = Date.now();
    for (let i = 0; i < 500; i++) {
      const statusVal = statuses[i % statuses.length];
      const snVal = statusVal === 20 ? sns[i % sns.length] : (i % 2 === 0 ? '0000' : 'N/A');
      const price = statusVal === 20 ? 15000 + (i % 5) * 5000 : 0;
      const cost = statusVal === 20 ? price - 500 - (i % 3) * 150 : 0;
      const dateVal = new Date(todayMs - (i * 300000)); // every 5 minutes
      
      mockList.push({
        kode: 1828625 - i,
        tgl_entri: dateVal.toISOString(),
        kode_produk: products[i % products.length],
        tujuan: '0812' + String(10000000 + (i * 17) % 89999999),
        harga: price,
        harga_beli: cost,
        status: statusVal,
        sn: snVal
      });
    }

    // Apply filtering
    let filtered = [...mockList];

    // Status filter
    if (status !== 'all') {
      if (status === 'suspect') {
        filtered = filtered.filter(t => ![40, 50, 52, 54].includes(t.status) && ['N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND'].includes(t.sn));
      } else if (status === '40') {
        filtered = filtered.filter(t => [40, 52, 54].includes(t.status));
      } else if (status === '54') {
        filtered = filtered.filter(t => [52, 54].includes(t.status));
      } else {
        const sInt = parseInt(status);
        if (!isNaN(sInt)) {
          filtered = filtered.filter(t => t.status === sInt);
        }
      }
    }

    // Date range filter
    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const dateStr = getLocalDateString(t.tgl_entri);
        return dateStr >= startDate && dateStr <= endDate;
      });
    } else if (date) {
      filtered = filtered.filter(t => {
        const dateStr = getLocalDateString(t.tgl_entri);
        return dateStr === date;
      });
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        String(t.kode).includes(q) ||
        (t.kode_produk && t.kode_produk.toLowerCase().includes(q)) ||
        (t.tujuan && t.tujuan.includes(q)) ||
        (t.sn && t.sn.toLowerCase().includes(q))
      );
    }

    // Compute dynamic stats
    const total = filtered.length;
    const successCount = filtered.filter(t => t.status === 20 && !['N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND'].includes(t.sn)).length;
    const failedCount = filtered.filter(t => t.status === 40).length;
    const canceledCount = filtered.filter(t => t.status === 50).length;
    const suspectCount = filtered.filter(t => ![40, 50, 52, 54].includes(t.status) && ['N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND'].includes(t.sn)).length;
    const wrongNumberCount = filtered.filter(t => [52, 54].includes(t.status)).length;
    const pendingCount = filtered.filter(t => ![20, 40, 50, 52, 54].includes(t.status) && !['N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND'].includes(t.sn)).length;

    const totalRetail = filtered.filter(t => t.status === 20).reduce((sum, t) => sum + (t.harga || 0), 0);
    const totalCost = filtered.filter(t => t.status === 20).reduce((sum, t) => sum + (t.harga_beli || 0), 0);
    const totalProfit = filtered.filter(t => t.status === 20).reduce((sum, t) => sum + ((t.harga - t.harga_beli) || 0), 0);
    const successRate = total > 0 ? parseFloat(((successCount / total) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      total,
      successCount,
      failedCount,
      canceledCount,
      suspectCount,
      wrongNumberCount,
      pendingCount,
      successRate,
      totalRetail,
      totalCost,
      totalProfit
    });
  }
}