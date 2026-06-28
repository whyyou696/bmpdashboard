import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') || '';
  const reseller = searchParams.get('reseller') || '';
  const product = searchParams.get('product') || '';
  const status = searchParams.get('status') || '';
  const terminal = searchParams.get('terminal') || '';
  const serviceCenter = searchParams.get('serviceCenter') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const msgType = searchParams.get('msgType') || '';
  const sortCol = searchParams.get('sortCol') || 'created_at';
  const sortDir = searchParams.get('sortDir') || 'desc';

  const getInboxStatusLabel = (statusTrx, statusInbox) => {
    if (statusTrx !== null && statusTrx !== undefined) {
      if (statusTrx === 20) return 'Success';
      if (statusTrx === 52) return 'Duplicate Transaction';
      if (statusTrx === 40 || statusTrx === 50 || statusTrx === 55) return 'Failed';
      if (statusTrx === 0 || statusTrx === 2) return 'Processing';
      return 'Pending';
    }
    if (statusInbox === 20) return 'Success';
    if (statusInbox === 46) return 'Duplicate Transaction';
    if (statusInbox === 40) return 'Failed';
    return 'Pending';
  };

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();
    let conditions = [];

    if (search) {
      conditions.push("(i.pengirim LIKE @search OR i.pesan LIKE @search OR i.kode_reseller LIKE @search OR r.nama LIKE @search OR t.kode_produk LIKE @search OR t.tujuan LIKE @search OR t.ref_id LIKE @search OR CAST(i.kode_transaksi AS VARCHAR) LIKE @search)");
      dbRequest.input("search", sql.VarChar, `%${search}%`);
    }

    if (reseller) {
      conditions.push("i.kode_reseller = @reseller");
      dbRequest.input("reseller", sql.VarChar, reseller);
    }

    if (product) {
      conditions.push("t.kode_produk = @product");
      dbRequest.input("product", sql.VarChar, product);
    }

    if (terminal) {
      conditions.push("i.kode_terminal = @terminal");
      dbRequest.input("terminal", sql.Int, parseInt(terminal));
    }

    if (serviceCenter) {
      conditions.push("i.service_center = @serviceCenter");
      dbRequest.input("serviceCenter", sql.VarChar, serviceCenter);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59.999');
      conditions.push("i.tgl_entri >= @startDate AND i.tgl_entri <= @endDate");
      dbRequest.input("startDate", sql.DateTime2, start);
      dbRequest.input("endDate", sql.DateTime2, end);
    }

    if (status) {
      if (status === 'Success') conditions.push("(t.status = 20 OR (t.status IS NULL AND i.status = 20))");
      else if (status === 'Duplicate Transaction') conditions.push("(t.status = 52 OR (t.status IS NULL AND i.status = 46))");
      else if (status === 'Failed') conditions.push("(t.status IN (40, 50, 55) OR (t.status IS NULL AND i.status = 40))");
      else if (status === 'Processing') conditions.push("(t.status IN (0, 2))");
      else if (status === 'Pending') conditions.push("((t.status NOT IN (20, 40, 50, 52, 55, 0, 2) OR t.status IS NULL) AND i.status NOT IN (20, 40, 46))");
    }

    if (msgType) {
      if (msgType === "reseller") conditions.push("i.is_jawaban = 0");
      else if (msgType === "provider") conditions.push("i.is_jawaban = 1");
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    let total = 0;
    if (whereClause === "") {
      const countResult = await dbRequest.query(`
        SELECT CAST(SUM(p.rows) AS INT) AS total 
        FROM sys.partitions p
        INNER JOIN sys.tables t ON p.object_id = t.object_id
        WHERE t.name = 'inbox' AND p.index_id IN (0, 1)
      `);
      total = countResult.recordset[0].total || 0;
    } else {
      const countResult = await dbRequest.query(`
        SELECT COUNT(*) AS total 
        FROM inbox i
        LEFT JOIN transaksi t ON i.kode_transaksi = t.kode
        LEFT JOIN reseller r ON i.kode_reseller = r.kode
        ${whereClause}
      `);
      total = countResult.recordset[0].total || 0;
    }

    dbRequest.input("offset", sql.Int, offset);
    dbRequest.input("limit", sql.Int, limit);

    let sqlSort = "i.kode DESC";
    if (sortCol === "inbox_id") sqlSort = `i.kode ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "created_at") sqlSort = `i.tgl_entri ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "reseller_name") sqlSort = `r.nama ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "product_code") sqlSort = `t.kode_produk ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "destination") sqlSort = `t.tujuan ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "status") sqlSort = `t.status ${sortDir === 'asc' ? 'ASC' : 'DESC'}, i.status ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;

    const dataQuery = `
      SELECT 
        i.kode as inbox_id,
        i.kode_transaksi as transaction_id,
        i.tgl_entri as created_at,
        i.pengirim as sender_ip,
        i.kode_reseller as reseller_code,
        r.nama as reseller_name,
        t.kode_produk as product_code,
        t.tujuan as destination,
        i.pesan as message,
        i.status as status_inbox,
        t.status as status_trx,
        i.kode_terminal as terminal,
        i.service_center as service_center,
        t.ref_id as reference_id
      FROM inbox i
      LEFT JOIN transaksi t ON i.kode_transaksi = t.kode
      LEFT JOIN reseller r ON i.kode_reseller = r.kode
      ${whereClause}
      ORDER BY ${sqlSort}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const dataResult = await dbRequest.query(dataQuery);
    const formattedData = dataResult.recordset.map(row => ({
      inbox_id: row.inbox_id,
      transaction_id: row.transaction_id || row.inbox_id,
      created_at: row.created_at,
      sender_ip: row.sender_ip,
      reseller_code: row.reseller_code,
      reseller_name: row.reseller_name || "-",
      product_code: row.product_code || "-",
      destination: row.destination || "-",
      message: row.message,
      status: getInboxStatusLabel(row.status_trx, row.status_inbox),
      terminal: row.terminal || "-",
      service_center: row.service_center || "-",
      reference_id: row.reference_id || "-"
    }));

    return NextResponse.json({
      data: formattedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });

  } catch (err) {
    console.warn("SQL Query failed, falling back to mock inbox logs.");
    
    const mockList = [];
    const products = ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50'];
    const resellers = [
      { kode: 'R001', nama: 'Indo Cell' },
      { kode: 'R002', nama: 'Best Multipayment' },
      { kode: 'R003', nama: 'Metro Pulsa' }
    ];
    const statuses = ['Success', 'Failed', 'Duplicate Transaction', 'Pending', 'Processing'];
    const scs = ['SMS CENTER 1', 'TELEGRAM CENTER', 'WA CENTER'];

    const todayMs = Date.now();
    for (let i = 0; i < 500; i++) {
      const idx = i + 1;
      const prod = products[i % products.length];
      const res = resellers[i % resellers.length];
      const statusVal = statuses[i % statuses.length];
      const terminalVal = (i % 3) + 1;
      const isJawaban = i % 2; // 0 or 1
      const dateVal = new Date(todayMs - (i * 60000)); // every 1 min

      mockList.push({
        inbox_id: 1828625 - idx,
        transaction_id: 1828625 - idx,
        created_at: dateVal.toISOString(),
        sender_ip: '127.0.0.1',
        reseller_code: res.kode,
        reseller_name: res.nama,
        product_code: prod,
        destination: '0812' + String(10000000 + (i * 17) % 89999999),
        message: isJawaban === 1 
          ? `SUKSES. Trx ${prod} to 0812${String(10000000 + (i * 17) % 89999999)} Success. SN: TXSN${100000 + i}`
          : `Beli ${prod} ke 0812${String(10000000 + (i * 17) % 89999999)}. PIN 1234`,
        status: statusVal,
        terminal: terminalVal,
        service_center: scs[i % scs.length],
        reference_id: 'REF' + String(100000 + (i * 13) % 899999),
        is_jawaban: isJawaban
      });
    }

    let filtered = [...mockList];

    // 1. Date filter
    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const d = new Date(t.created_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const localDateStr = `${yyyy}-${mm}-${dd}`;
        return localDateStr >= startDate && localDateStr <= endDate;
      });
    }

    // 2. Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        String(t.inbox_id).includes(q) ||
        String(t.transaction_id).includes(q) ||
        (t.message && t.message.toLowerCase().includes(q)) ||
        (t.sender_ip && t.sender_ip.includes(q)) ||
        (t.reseller_code && t.reseller_code.toLowerCase().includes(q)) ||
        (t.reseller_name && t.reseller_name.toLowerCase().includes(q)) ||
        (t.product_code && t.product_code.toLowerCase().includes(q)) ||
        (t.destination && t.destination.includes(q))
      );
    }

    // 3. Reseller filter
    if (reseller) {
      filtered = filtered.filter(t => t.reseller_code === reseller || t.reseller_name === reseller);
    }

    // 4. Product filter
    if (product) {
      filtered = filtered.filter(t => t.product_code === product);
    }

    // 5. Terminal filter
    if (terminal) {
      filtered = filtered.filter(t => String(t.terminal) === String(terminal));
    }

    // 6. Service Center filter
    if (serviceCenter) {
      filtered = filtered.filter(t => t.service_center === serviceCenter);
    }

    // 7. Status filter
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    // 8. msgType filter
    if (msgType) {
      if (msgType === 'reseller') {
        filtered = filtered.filter(t => t.is_jawaban === 0);
      } else if (msgType === 'provider') {
        filtered = filtered.filter(t => t.is_jawaban === 1);
      }
    }

    // 9. Sorting
    filtered.sort((a, b) => {
      let valA, valB;
      if (sortCol === 'inbox_id') {
        valA = a.inbox_id;
        valB = b.inbox_id;
      } else if (sortCol === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortCol === 'reseller_name') {
        valA = a.reseller_name;
        valB = b.reseller_name;
      } else if (sortCol === 'product_code') {
        valA = a.product_code;
        valB = b.product_code;
      } else if (sortCol === 'destination') {
        valA = a.destination;
        valB = b.destination;
      } else if (sortCol === 'status') {
        valA = a.status;
        valB = b.status;
      } else {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      }
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  }
}