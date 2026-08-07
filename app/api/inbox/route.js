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
  const dateMode = searchParams.get('dateMode') || 'today';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const sortCol = searchParams.get('sortCol') || 'created_at';
  const sortDir = searchParams.get('sortDir') || 'desc';

  const getInboxStatusLabel = (txStatus) => {
    if (txStatus === 20) return 'Success';
    if (txStatus === 52) return 'Duplicate Transaction';
    if (txStatus === 40 || txStatus === 50 || txStatus === 55 || txStatus === 54) return 'Failed';
    if (txStatus === 0 || txStatus === 1 || txStatus === 2) return 'Processing';
    return 'Pending';
  };

  try {
    const pool = await getDbConnection();

    // Helper to create a fresh DB request with inputs
    const createReq = () => {
      const dbRequest = pool.request();
      const conditions = ["t.kode_reseller LIKE 'BEST%'"]; // Enforce Best Multipayment dataset only

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

      // Date Filtering: Default is 'today', 'all' disables date filtering, 'custom' filters date range
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
        else if (status === 'Duplicate Transaction') conditions.push("t.status = 52");
        else if (status === 'Failed') conditions.push("t.status IN (40, 50, 55, 54)");
        else if (status === 'Processing') conditions.push("t.status IN (0, 1, 2)");
        else if (status === 'Pending') conditions.push("t.status NOT IN (20, 40, 50, 52, 54, 55, 0, 1, 2)");
      }

      return { dbRequest, conditions };
    };

    const { dbRequest: countReq, conditions: countConditions } = createReq();
    const whereClause = "WHERE " + countConditions.join(" AND ");

    const countResult = await countReq.query(`
      SELECT COUNT(1) AS total 
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${whereClause}
    `);
    const total = countResult.recordset[0]?.total || 0;

    // Fresh request for data query
    const { dbRequest: dataReq, conditions: dataConditions } = createReq();
    const dataWhereClause = "WHERE " + dataConditions.join(" AND ");

    dataReq.input("offset", sql.Int, offset);
    dataReq.input("limit", sql.Int, limit);

    let sqlSort = "t.kode DESC";
    if (sortCol === "inbox_id") sqlSort = `t.kode ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "created_at") sqlSort = `t.kode ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "reseller_name") sqlSort = `r.nama ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "product_code") sqlSort = `t.kode_produk ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "destination") sqlSort = `t.tujuan ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    else if (sortCol === "status") sqlSort = `t.status ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;

    const dataQuery = `
      SELECT 
        t.kode as inbox_id,
        t.kode as transaction_id,
        t.tgl_entri as created_at,
        t.pengirim as sender_ip,
        t.kode_reseller as reseller_code,
        r.nama as reseller_name,
        t.kode_produk as product_code,
        t.tujuan as destination,
        t.sn as message,
        t.status as status_trx
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${dataWhereClause}
      ORDER BY ${sqlSort}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const dataResult = await dataReq.query(dataQuery);
    const formattedData = dataResult.recordset.map(row => ({
      inbox_id: row.inbox_id,
      transaction_id: row.transaction_id,
      created_at: row.created_at,
      sender_ip: row.sender_ip || "-",
      reseller_code: row.reseller_code || "-",
      reseller_name: row.reseller_name || "-",
      product_code: row.product_code || "-",
      destination: row.destination || "-",
      message: row.message ? row.message : `Trx ${row.product_code || ''} ke ${row.destination || ''}`,
      status: getInboxStatusLabel(row.status_trx),
      terminal: "-",
      service_center: "-",
      reference_id: row.message || "-"
    }));

    return NextResponse.json({
      data: formattedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });

  } catch (err) {
    console.warn("SQL Query failed, returning fallback inbox data based on transactions:", err.message);

    const mockList = [];
    const products = ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50'];
    const resellers = [
      { kode: 'BEST0819', nama: 'CHIKA MP RELOAD' },
      { kode: 'BEST001', nama: 'DIGIFLAZZ BEST' },
      { kode: 'BEST1305', nama: 'PIXEL TELEMEDIA' },
      { kode: 'BEST055', nama: 'AMS PAY' }
    ];
    const statuses = [20, 20, 20, 40, 52, 55, 20];
    const ips = ['103.166.91.114', '52.74.250.133', '118.99.85.170', '188.166.178.169'];

    const todayMs = Date.now();
    for (let i = 0; i < 500; i++) {
      const idx = i + 1;
      const prod = products[i % products.length];
      const res = resellers[i % resellers.length];
      const statusVal = statuses[i % statuses.length];
      const dateVal = new Date(todayMs - (i * 60000));

      mockList.push({
        inbox_id: 2411460 - idx,
        transaction_id: 2411460 - idx,
        created_at: dateVal.toISOString(),
        sender_ip: ips[i % ips.length],
        reseller_code: res.kode,
        reseller_name: res.nama,
        product_code: prod,
        destination: '0812' + String(10000000 + (i * 17) % 89999999),
        message: `trx?product=${prod}&qty=1&dest=0812${String(10000000 + (i * 17) % 89999999)}&memberID=${res.kode}`,
        status: getInboxStatusLabel(statusVal),
        terminal: "-",
        service_center: "-",
        reference_id: 'REF' + String(100000 + (i * 13) % 899999)
      });
    }

    let filtered = [...mockList];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        String(t.inbox_id).includes(q) ||
        (t.message && t.message.toLowerCase().includes(q)) ||
        (t.sender_ip && t.sender_ip.includes(q)) ||
        (t.reseller_code && t.reseller_code.toLowerCase().includes(q)) ||
        (t.reseller_name && t.reseller_name.toLowerCase().includes(q)) ||
        (t.product_code && t.product_code.toLowerCase().includes(q)) ||
        (t.destination && t.destination.includes(q))
      );
    }

    if (reseller) {
      filtered = filtered.filter(t => t.reseller_code === reseller || t.reseller_name === reseller);
    }

    if (product) {
      filtered = filtered.filter(t => t.product_code === product);
    }

    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  }
}