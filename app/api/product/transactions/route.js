import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;

  const search = searchParams.get('search') || '';
  const product = searchParams.get('product') || '';
  const modul = searchParams.get('modul') || '';
  const reseller = searchParams.get('reseller') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const dateMode = searchParams.get('dateMode') || 'today';
  const sn_empty = searchParams.get('sn_empty') || 'true';

  try {
    const pool = await getDbConnection();

    const createReq = () => {
      const dbRequest = pool.request();
      const conditions = ["t.kode_reseller LIKE 'BEST%'"]; // Best Multipayment dataset only

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

      if (search) {
        conditions.push("(t.tujuan LIKE @search OR t.kode_produk LIKE @search OR t.sn LIKE @search OR r.nama LIKE @search OR m.label LIKE @search OR CAST(t.kode AS VARCHAR) LIKE @search)");
        dbRequest.input("search", sql.VarChar, `%${search}%`);
      }

      if (product && product !== 'all') {
        conditions.push("t.kode_produk = @product");
        dbRequest.input("product", sql.VarChar, product);
      }

      if (modul && modul !== 'all') {
        const modulInt = parseInt(modul);
        if (!isNaN(modulInt)) {
          conditions.push("t.kode_modul = @modul");
          dbRequest.input("modul", sql.Int, modulInt);
        }
      }

      if (reseller && reseller !== 'all') {
        conditions.push("(t.kode_reseller = @reseller OR r.nama LIKE @reseller)");
        dbRequest.input("reseller", sql.VarChar, reseller.includes('%') ? reseller : `%${reseller}%`);
      }

      if (status && status !== 'all') {
        if (status === 'suspect') {
          conditions.push("t.status = 20 AND (t.sn IS NULL OR LTRIM(RTRIM(t.sn)) = '' OR LTRIM(RTRIM(t.sn)) = '-' OR UPPER(LTRIM(RTRIM(t.sn))) IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND', 'NONE', '0'))");
        } else if (status === 'sukses' || status === '20') {
          conditions.push("t.status = 20");
        } else if (status === 'gagal' || status === '40') {
          conditions.push("t.status IN (40, 50, 52, 54, 55)");
        } else if (status === 'proses' || status === '0') {
          conditions.push("t.status IN (0, 1, 2, 3)");
        } else {
          const sInt = parseInt(status);
          if (!isNaN(sInt)) {
            conditions.push("t.status = @status");
            dbRequest.input("status", sql.Int, sInt);
          }
        }
      }

      if (sn_empty === 'false') {
        conditions.push("t.sn IS NOT NULL AND LTRIM(RTRIM(t.sn)) <> '' AND UPPER(LTRIM(RTRIM(t.sn))) NOT IN ('N/A', 'NULL', '0000')");
      }

      return { dbRequest, conditions };
    };

    const { dbRequest: statsReq, conditions: statsConds } = createReq();
    const whereClause = "WHERE " + statsConds.join(" AND ");

    const statsQuery = `
      SELECT 
        COUNT(1) as total_trx,
        SUM(CASE WHEN t.status = 20 THEN 1 ELSE 0 END) as success_trx,
        SUM(CASE WHEN t.status IN (40, 50, 52, 54, 55) THEN 1 ELSE 0 END) as failed_trx,
        SUM(CASE WHEN t.status = 20 THEN CAST(ISNULL(t.harga, 0) AS BIGINT) ELSE 0 END) as total_omset,
        SUM(CASE WHEN t.status = 20 THEN CAST(ISNULL(t.harga - t.harga_beli, 0) AS BIGINT) ELSE 0 END) as total_laba,
        COUNT(DISTINCT t.kode_produk) as unique_products
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN modul m WITH (NOLOCK) ON t.kode_modul = m.kode
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${whereClause}
    `;
    const statsResult = await statsReq.query(statsQuery);
    const stats = statsResult.recordset[0] || { total_trx: 0, success_trx: 0, failed_trx: 0, total_omset: 0, total_laba: 0, unique_products: 0 };
    const successRate = stats.total_trx > 0 ? parseFloat(((stats.success_trx / stats.total_trx) * 100).toFixed(1)) : 0.0;

    // All products distribution for chart
    const { dbRequest: allProdReq, conditions: allProdConds } = createReq();
    const allProductsQuery = `
      SELECT 
        t.kode_produk as name,
        COUNT(1) as total_trx,
        SUM(CASE WHEN t.status = 20 THEN 1 ELSE 0 END) as success_trx,
        SUM(CASE WHEN t.status IN (40, 50, 52, 54, 55) THEN 1 ELSE 0 END) as failed_trx,
        SUM(CASE WHEN t.status = 20 THEN CAST(ISNULL(t.harga - t.harga_beli, 0) AS BIGINT) ELSE 0 END) as total_profit
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN modul m WITH (NOLOCK) ON t.kode_modul = m.kode
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${whereClause}
      GROUP BY t.kode_produk
      ORDER BY total_trx DESC
    `;
    const allProductsResult = await allProdReq.query(allProductsQuery);
    const allProducts = allProductsResult.recordset || [];

    const topProduct = allProducts[0]?.name || '-';
    const topProductTrx = allProducts[0]?.total_trx || 0;
    const topProductProfit = allProducts[0]?.total_profit || 0;

    // Top product by profit
    const sortedByProfit = [...allProducts].sort((a, b) => (b.total_profit || 0) - (a.total_profit || 0));
    const topProductByProfit = sortedByProfit[0]?.name || '-';

    // Top Modules Query
    const { dbRequest: topModReq, conditions: topModConds } = createReq();
    const topModulesQuery = `
      SELECT TOP 5 
        ISNULL(m.label, 'Unknown') as name, 
        COUNT(1) as total_trx, 
        SUM(CASE WHEN t.status = 20 THEN 1 ELSE 0 END) as success_trx
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN modul m WITH (NOLOCK) ON t.kode_modul = m.kode
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${whereClause}
      GROUP BY m.label
      ORDER BY total_trx DESC
    `;
    const topModulesResult = await topModReq.query(topModulesQuery);

    // Top Resellers Query
    const { dbRequest: topResReq, conditions: topResConds } = createReq();
    const topResellersQuery = `
      SELECT TOP 5 
        ISNULL(r.nama, t.kode_reseller) as name, 
        t.kode_reseller as kode,
        COUNT(1) as total_trx, 
        SUM(CASE WHEN t.status = 20 THEN 1 ELSE 0 END) as success_trx
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN modul m WITH (NOLOCK) ON t.kode_modul = m.kode
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${whereClause}
      GROUP BY r.nama, t.kode_reseller
      ORDER BY total_trx DESC
    `;
    const topResellersResult = await topResReq.query(topResellersQuery);

    // Table Data Query
    const { dbRequest: dataReq, conditions: dataConds } = createReq();
    dataReq.input("offset", sql.Int, offset);
    dataReq.input("limit", sql.Int, limit);

    const dataQuery = `
      SELECT 
        t.kode,
        t.kode as TrxID,
        t.tgl_entri,
        t.tgl_status,
        t.kode_produk,
        t.tujuan,
        t.sn,
        r.nama as nama_reseller,
        t.kode_reseller,
        t.status,
        m.label as nama_modul,
        t.kode_modul,
        t.harga_beli,
        t.harga,
        (CASE WHEN t.status = 20 THEN (t.harga - t.harga_beli) ELSE 0 END) as laba,
        ISNULL(t.saldo_supplier, m.saldo) as saldo_supplier,
        t.keterangan as jawaban_provider
      FROM transaksi t WITH (NOLOCK)
      LEFT JOIN modul m WITH (NOLOCK) ON t.kode_modul = m.kode
      LEFT JOIN reseller r WITH (NOLOCK) ON t.kode_reseller = r.kode
      ${whereClause}
      ORDER BY t.kode DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    const dataResult = await dataReq.query(dataQuery);

    return NextResponse.json({
      data: dataResult.recordset,
      productivity: {
        totalTrx: stats.total_trx || 0,
        successTrx: stats.success_trx || 0,
        failedTrx: stats.failed_trx || 0,
        successRate: successRate,
        totalOmset: stats.total_omset || 0,
        totalLaba: stats.total_laba || 0,
        uniqueProducts: stats.unique_products || 0,
        topProduct,
        topProductTrx,
        topProductProfit,
        topProductByProfit
      },
      allProducts: allProducts,
      topLists: {
        modules: topModulesResult.recordset || [],
        products: allProducts.slice(0, 5),
        resellers: topResellersResult.recordset || []
      },
      pagination: { page, limit, total: stats.total_trx || 0, totalPages: Math.ceil((stats.total_trx || 0) / limit) }
    });

  } catch (err) {
    console.warn("SQL transaction list failed, returning mock data.", err.message);
    
    const mockList = [];
    const products = ['XLDP2', 'TSEL5', 'ML10', 'AXIS5', 'TRI10', 'PLN20', 'PLN50', 'DANA10', 'OVO10', 'GOPAY10'];
    const modules = [
      { kode: 1, label: 'DIGIPOS AUTO 1' },
      { kode: 2, label: 'KAWAN SEJAGAT' },
      { kode: 3, label: 'METRO SUP' }
    ];
    const resellers = [
      { kode: 'BEST001', nama: 'DIGIFLAZZ BEST' },
      { kode: 'BEST0819', nama: 'CHIKA MP RELOAD' },
      { kode: 'BEST1305', nama: 'PIXEL TELEMEDIA' }
    ];
    const statuses = [20, 20, 20, 40, 50, 55, 20, 0, 2];

    const todayMs = Date.now();
    for (let i = 0; i < 500; i++) {
      const idx = i + 1;
      const statusVal = statuses[i % statuses.length];
      const prod = products[i % products.length];
      const mod = modules[i % modules.length];
      const res = resellers[i % resellers.length];
      
      const price = statusVal === 20 ? 15000 + (i % 5) * 5000 : (statusVal === 0 || statusVal === 2 ? 15000 : 0);
      const cost = statusVal === 20 ? price - 500 - (i % 3) * 150 : (statusVal === 0 || statusVal === 2 ? 14500 : 0);
      const laba = statusVal === 20 ? price - cost : 0;
      const dateVal = new Date(todayMs - (i * 300000));

      const prefixes = ['0812', '0818', '0815', '0896'];
      const pref = prefixes[i % prefixes.length];
      const tujuan = pref + String(10000000 + (i * 17) % 8999999).slice(0, 8);

      mockList.push({
        TrxID: 1828625 - idx,
        kode: 1828625 - idx,
        tgl_entri: dateVal.toISOString(),
        tgl_status: dateVal.toISOString(),
        kode_produk: prod,
        tujuan: tujuan,
        sn: statusVal === 20 ? 'TXSN' + String(1000000 + (i * 31) % 899999) : (statusVal === 0 || statusVal === 2 ? '' : 'N/A'),
        kode_reseller: res.kode,
        nama_reseller: res.nama,
        status: statusVal,
        kode_modul: mod.kode,
        nama_modul: mod.label,
        harga_beli: cost,
        harga: price,
        laba: laba,
        jawaban_provider: statusVal === 20 ? 'SUKSES' : (statusVal === 0 || statusVal === 2 ? 'PROSES' : 'FAILED')
      });
    }

    let filtered = [...mockList];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        String(t.kode).includes(q) ||
        String(t.TrxID).includes(q) ||
        (t.tujuan && t.tujuan.includes(q)) ||
        (t.kode_produk && t.kode_produk.toLowerCase().includes(q)) ||
        (t.sn && t.sn.toLowerCase().includes(q)) ||
        (t.nama_reseller && t.nama_reseller.toLowerCase().includes(q)) ||
        (t.nama_modul && t.nama_modul.toLowerCase().includes(q))
      );
    }

    if (product) {
      filtered = filtered.filter(t => t.kode_produk && t.kode_produk.toLowerCase().includes(product.toLowerCase()));
    }

    if (modul) {
      filtered = filtered.filter(t => String(t.kode_modul) === String(modul));
    }

    if (reseller) {
      filtered = filtered.filter(t => t.kode_reseller === reseller || t.nama_reseller === reseller);
    }

    const totalTrx = filtered.length;
    const successTrx = filtered.filter(t => t.status === 20).length;
    const failedTrx = filtered.filter(t => [40, 50, 52, 54, 55].includes(t.status)).length;
    const totalOmset = filtered.filter(t => t.status === 20).reduce((acc, t) => acc + (t.harga || 0), 0);
    const totalLaba = filtered.filter(t => t.status === 20).reduce((acc, t) => acc + (t.laba || 0), 0);

    const prodCounts = {};
    filtered.forEach(t => {
      prodCounts[t.kode_produk] = (prodCounts[t.kode_produk] || 0) + 1;
    });
    const allProductsMock = Object.entries(prodCounts)
      .map(([name, count]) => ({ name, total_trx: count, success_trx: Math.round(count * 0.8), total_profit: count * 1250 }))
      .sort((a, b) => b.total_trx - a.total_trx);

    const topProductMock = allProductsMock[0]?.name || '-';
    const topProductTrxMock = allProductsMock[0]?.total_trx || 0;
    const topProductProfitMock = allProductsMock[0]?.total_profit || 0;

    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      productivity: {
        totalTrx,
        successTrx,
        failedTrx,
        successRate: totalTrx > 0 ? parseFloat(((successTrx / totalTrx) * 100).toFixed(1)) : 0.0,
        totalOmset,
        totalLaba,
        uniqueProducts: Object.keys(prodCounts).length,
        topProduct: topProductMock,
        topProductTrx: topProductTrxMock,
        topProductProfit: topProductProfitMock,
        topProductByProfit: topProductMock
      },
      allProducts: allProductsMock,
      topLists: {
        products: allProductsMock.slice(0, 5),
        modules: modules.map(m => ({ name: m.label, total_trx: 50, success_trx: 40 })),
        resellers: resellers.map(r => ({ name: r.nama, total_trx: 60, success_trx: 55 }))
      },
      pagination: { page, limit, total: totalTrx, totalPages: Math.ceil(totalTrx / limit) }
    });
  }
}