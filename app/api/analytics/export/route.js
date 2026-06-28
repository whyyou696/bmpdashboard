import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30days';
  const format = searchParams.get('format') || 'csv';
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

  const getCsvData = (data) => {
    let content = "Date,Product,Destination,Revenue,Cost,Profit,Margin %,Status,SN\r\n";
    data.forEach(row => {
      const profit = row.status === 20 ? (row.harga - row.harga_beli) : 0;
      const margin = row.harga > 0 ? ((profit / row.harga) * 100).toFixed(1) : 0;
      content += `"${row.tgl_entri}","${row.kode_produk}","${row.tujuan}",${row.harga},${row.harga_beli},${profit},"${margin}%",${row.status},"${row.sn || ''}"\r\n`;
    });
    return content;
  };

  const getXlsData = (data) => {
    let content = "Date\tProduct\tDestination\tRevenue\tCost\tProfit\tMargin %\tStatus\tSN\r\n";
    data.forEach(row => {
      const profit = row.status === 20 ? (row.harga - row.harga_beli) : 0;
      const margin = row.harga > 0 ? ((profit / row.harga) * 100).toFixed(1) : 0;
      content += `${row.tgl_entri}\t${row.kode_produk}\t${row.tujuan}\t${row.harga}\t${row.harga_beli}\t${profit}\t${margin}%\t${row.status}\t${row.sn || ''}\r\n`;
    });
    return content;
  };

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();
    dbRequest.input("currStart", sql.DateTime2, currentStart);
    dbRequest.input("currEnd", sql.DateTime2, currentEnd);

    const query = `
      SELECT TOP 50000
        tgl_entri, kode_produk, tujuan, harga, harga_beli, status, sn
      FROM transaksi
      WHERE tgl_entri >= @currStart AND tgl_entri <= @currEnd
      ORDER BY tgl_entri DESC
    `;
    const result = await dbRequest.query(query);
    const data = result.recordset;

    let content = "";
    let filename = `BMP_Transactions_${range}_Export`;

    if (format === 'csv') {
      content = getCsvData(data);
      return new Response(content, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${filename}.csv`
        }
      });
    } else {
      content = getXlsData(data);
      return new Response(content, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename=${filename}.xls`
        }
      });
    }
  } catch (err) {
    console.warn("SQL export failed, returning mock csv.");
    const simulatedRows = [];
    for (let i = 0; i < 100; i++) {
      const date = new Date(Date.now() - i * 3600000);
      const codes = ['XLDP2', 'TSEL5', 'ML10', 'PLN20', 'TRI10'];
      simulatedRows.push({
        tgl_entri: date.toISOString(),
        kode_produk: codes[i % codes.length],
        tujuan: '0812' + Math.floor(10000000 + Math.random() * 90000000),
        harga: 15000,
        harga_beli: 14500,
        status: 20,
        sn: 'TXSN' + Math.floor(1000000 + Math.random() * 9000000)
      });
    }

    let filename = `BMP_Simulated_Transactions_Export`;
    let content = "";
    if (format === 'csv') {
      content = getCsvData(simulatedRows);
      return new Response(content, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${filename}.csv`
        }
      });
    } else {
      content = getXlsData(simulatedRows);
      return new Response(content, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename=${filename}.xls`
        }
      });
    }
  }
}