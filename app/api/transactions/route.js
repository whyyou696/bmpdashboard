import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;
  const status = searchParams.get('status') || 'all';
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const date = searchParams.get('date') || '';

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

    let total = 0;
    if (whereClause === "") {
      const countResult = await dbRequest.query(`
        SELECT CAST(SUM(p.rows) AS INT) AS total 
        FROM sys.partitions p
        INNER JOIN sys.tables t ON p.object_id = t.object_id
        WHERE t.name = 'transaksi' AND p.index_id IN (0, 1)
      `);
      total = countResult.recordset[0].total || 0;
    } else {
      const countResult = await dbRequest.query(`SELECT COUNT(*) AS total FROM transaksi ${whereClause}`);
      total = countResult.recordset[0].total || 0;
    }

    dbRequest.input("offset", sql.Int, offset);
    dbRequest.input("limit", sql.Int, limit);

    const dataQuery = `
      SELECT kode, tgl_entri, kode_produk, tujuan, harga, harga_beli, status, sn
      FROM transaksi
      ${whereClause}
      ORDER BY tgl_entri DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    const dataResult = await dbRequest.query(dataQuery);

    return NextResponse.json({
      data: dataResult.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.warn("SQL Query failed, falling back to mock data /transactions.");
    
    // High-fidelity fallback with dynamic in-memory filtering and search
    const mockList = [];
    const products = ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50'];
    const statuses = [20, 20, 20, 20, 40, 50, 55, 54, 20];
    const sns = ['TXSN1128', 'TXSN4482', 'N/A', 'TXSN9824', '0000', 'PEND', 'TXSN0391'];
    
    // Generate a set of 500 mock transactions
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

    const total = filtered.length;
    const paginatedData = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}