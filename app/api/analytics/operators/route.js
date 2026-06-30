import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30days';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const status = searchParams.get('status') || '';
  const product = searchParams.get('product') || '';
  const search = searchParams.get('search') || '';

  const getLocalDateString = (isoStr) => {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getOperator = (tujuan) => {
    if (!tujuan) return 'Others';
    if (/^(0811|0812|0813|0821|0822|0823|0851|0852|0853|62811|62812|62813|62821|62822|62823|62851|62852|62853)/.test(tujuan)) return 'Telkomsel';
    if (/^(0817|0818|0819|0859|0877|0878|0831|0832|0838|62817|62818|62819|62859|62877|62878|62831|62832|62838)/.test(tujuan)) return 'XL Axiata';
    if (/^(0814|0815|0816|0855|0856|0857|0858|62814|62815|62816|62855|62856|62857|62858)/.test(tujuan)) return 'Indosat';
    if (/^(0895|0896|0897|0898|0899|62895|62896|62897|62898|62899)/.test(tujuan)) return 'Tri';
    return 'Others';
  };

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

    let extraConditions = ["tgl_entri >= @currStart AND tgl_entri <= @currEnd"];
    if (status && status !== 'all') {
      if (status === 'sukses') {
        extraConditions.push("status = 20");
      } else if (status === 'gagal') {
        extraConditions.push("status IN (40, 50, 52, 54, 55)");
      } else if (status === 'proses') {
        extraConditions.push("status IN (0, 1, 2)");
      } else if (!isNaN(parseInt(status))) {
        extraConditions.push("status = @status");
        dbRequest.input("status", sql.Int, parseInt(status));
      }
    }
    if (product && product !== 'all') {
      extraConditions.push("kode_produk = @product");
      dbRequest.input("product", sql.VarChar, product);
    }
    if (search) {
      extraConditions.push("(tujuan LIKE @search OR kode_produk LIKE @search OR sn LIKE @search OR CAST(kode AS VARCHAR) LIKE @search)");
      dbRequest.input("search", sql.VarChar, `%${search}%`);
    }
    const whereClause = "WHERE " + extraConditions.join(" AND ");

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
      ${whereClause}
      GROUP BY 
        CASE 
          WHEN tujuan LIKE '0811%' OR tujuan LIKE '0812%' OR tujuan LIKE '0813%' OR tujuan LIKE '0821%' OR tujuan LIKE '0822%' OR tujuan LIKE '0823%' OR tujuan LIKE '0851%' OR tujuan LIKE '0852%' OR tujuan LIKE '0853%' OR tujuan LIKE '62811%' OR tujuan LIKE '62812%' OR tujuan LIKE '62813%' OR tujuan LIKE '62821%' OR tujuan LIKE '62822%' OR tujuan LIKE '62823%' OR tujuan LIKE '62851%' OR tujuan LIKE '62852%' OR tujuan LIKE '62853%' THEN 'Telkomsel'
          WHEN tujuan LIKE '0817%' OR tujuan LIKE '0818%' OR tujuan LIKE '0819%' OR tujuan LIKE '0859%' OR tujuan LIKE '0877%' OR tujuan LIKE '0878%' OR tujuan LIKE '0831%' OR tujuan LIKE '0832%' OR tujuan LIKE '0838%' OR tujuan LIKE '62817%' OR tujuan LIKE '62818%' OR tujuan LIKE '62819%' OR tujuan LIKE '62859%' OR tujuan LIKE '62877%' OR tujuan LIKE '62878%' OR tujuan LIKE '62831%' OR tujuan LIKE '62832%' OR tujuan LIKE '62838%' THEN 'XL Axiata'
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
    
    const mockList = [];
    const productsList = ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50', 'DANA10', 'OVO10', 'GOPAY10'];
    const statuses = [20, 20, 20, 40, 50, 55, 20, 0, 2];
    const prefixes = ['0812', '0818', '0815', '0896'];
    
    const todayMs = Date.now();
    for (let i = 0; i < 500; i++) {
      const idx = i + 1;
      const statusVal = statuses[i % statuses.length];
      const price = statusVal === 20 ? 15000 + (i % 5) * 5000 : (statusVal === 0 || statusVal === 2 ? 15000 : 0);
      const cost = statusVal === 20 ? price - 500 - (i % 3) * 150 : (statusVal === 0 || statusVal === 2 ? 14500 : 0);
      const laba = statusVal === 20 ? price - cost : 0;
      const dateVal = new Date(todayMs - (i * 300000));
      const pref = prefixes[i % prefixes.length];
      const tujuan = pref + String(10000000 + (i * 17) % 8999999).slice(0, 8);
      
      mockList.push({
        TrxID: 1828625 - idx,
        tgl_entri: dateVal.toISOString(),
        status: statusVal,
        kode_produk: productsList[i % productsList.length],
        tujuan: tujuan,
        sn: statusVal === 20 ? 'TXSN' + String(1000000 + (i * 31) % 899999) : 'N/A',
        harga: price,
        harga_beli: cost,
        laba: laba
      });
    }

    let filtered = [...mockList];

    // Status filter
    if (status && status !== 'all') {
      if (status === 'sukses') {
        filtered = filtered.filter(t => t.status === 20);
      } else if (status === 'gagal') {
        filtered = filtered.filter(t => [40, 50, 52, 54, 55].includes(t.status));
      } else if (status === 'proses') {
        filtered = filtered.filter(t => [0, 1, 2].includes(t.status));
      } else if (!isNaN(parseInt(status))) {
        filtered = filtered.filter(t => t.status === parseInt(status));
      }
    }

    // Product filter
    if (product && product !== 'all') {
      filtered = filtered.filter(t => t.kode_produk === product);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        String(t.TrxID).includes(q) ||
        (t.tujuan && t.tujuan.includes(q)) ||
        (t.kode_produk && t.kode_produk.toLowerCase().includes(q)) ||
        (t.sn && t.sn.toLowerCase().includes(q))
      );
    }

    // Filter by date range
    const currList = filtered.filter(t => new Date(t.tgl_entri) >= currentStart && new Date(t.tgl_entri) <= currentEnd);

    // Grouping
    const grouped = {};
    currList.forEach(t => {
      const op = getOperator(t.tujuan);
      if (!grouped[op]) {
        grouped[op] = { operator: op, transactions: 0, revenue: 0, successCount: 0 };
      }
      grouped[op].transactions += 1;
      if (t.status === 20) {
        grouped[op].revenue += t.harga;
        grouped[op].successCount += 1;
      }
    });

    const totalTx = currList.length;
    const formatted = Object.values(grouped).map(r => {
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

    formatted.sort((a, b) => b.transactions - a.transactions);
    return NextResponse.json(formatted);
  }
}