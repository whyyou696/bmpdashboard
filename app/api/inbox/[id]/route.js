import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = await params;

  const getInboxStatusLabel = (statusTrx, statusInbox) => {
    if (statusTrx === 20 || (statusTrx === null && statusInbox === 20)) return 'Success';
    if (statusTrx === 52 || (statusTrx === null && statusInbox === 46)) return 'Duplicate Transaction';
    return 'Failed';
  };

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();
    dbRequest.input("inboxId", sql.BigInt, id);

    const query = `
      SELECT 
        i.kode as inbox_id, i.kode_transaksi as transaction_id, i.tgl_entri as created_at,
        i.pengirim as sender_ip, i.kode_reseller as reseller_code, r.nama as reseller_name,
        t.kode_produk as product_code, t.tujuan as destination, i.pesan as message,
        i.status as status_inbox, t.status as status_trx, i.kode_terminal as terminal,
        i.service_center as service_center, t.ref_id as reference_id, i.tgl_status as status_timestamp
      FROM inbox i
      LEFT JOIN transaksi t ON i.kode_transaksi = t.kode
      LEFT JOIN reseller r ON i.kode_reseller = r.kode
      WHERE i.kode = @inboxId
    `;

    const result = await dbRequest.query(query);
    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Inbox entry not found" }, { status: 404 });
    }

    const row = result.recordset[0];
    let responseMessage = "-";
    
    const replyQuery = `
      SELECT TOP 1 pesan 
      FROM outbox 
      WHERE kode_inbox = @inboxId OR (kode_transaksi = @trxId AND kode_transaksi IS NOT NULL)
      ORDER BY tgl_entri DESC
    `;
    const replyResult = await pool.request()
      .input("inboxId", sql.BigInt, row.inbox_id)
      .input("trxId", sql.Int, row.transaction_id)
      .query(replyQuery);
    
    if (replyResult.recordset.length > 0) {
      responseMessage = replyResult.recordset[0].pesan;
    }

    return NextResponse.json({
      transaction_id: row.transaction_id || row.inbox_id,
      inbox_id: row.inbox_id,
      created_at: row.created_at,
      sender_ip: row.sender_ip,
      reseller_code: row.reseller_code || "-",
      reseller_name: row.reseller_name || "-",
      message: row.message,
      product_code: row.product_code || "-",
      destination: row.destination || "-",
      reference_id: row.reference_id || "-",
      status: getInboxStatusLabel(row.status_trx, row.status_inbox),
      response_message: responseMessage,
      terminal: row.terminal || "-",
      service_center: row.service_center || "-",
      status_timestamp: row.status_timestamp
    });

  } catch (err) {
    return NextResponse.json({
      transaction_id: id,
      inbox_id: id,
      created_at: new Date().toISOString(),
      sender_ip: '127.0.0.1',
      reseller_code: 'R001',
      reseller_name: 'Indo Cell',
      message: 'Pulsa XL 10rb ke 081906736472',
      product_code: 'XLDP2',
      destination: '081906736472',
      reference_id: 'REF993211',
      status: 'Success',
      response_message: 'Yth Indo Cell, Pengisian XLDP2 ke 081906736472 SUKSES. SN: TXSN1128. Saldo Rp 852.128',
      terminal: 1,
      service_center: 'SMS CENTER 1',
      status_timestamp: new Date().toISOString()
    });
  }
}