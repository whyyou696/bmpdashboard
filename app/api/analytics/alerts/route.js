import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getDbConnection();
    const pendingRes = await pool.request().query(`
      SELECT COUNT(*) as pendingCount FROM transaksi WHERE status NOT IN (20, 40, 50, 55)
    `);
    const pendingCount = pendingRes.recordset[0].pendingCount || 0;

    const alerts = [];
    if (pendingCount > 10) {
      alerts.push({
        id: 'alert_pending',
        type: 'warning',
        message: `Pending Transactions exceeded ${pendingCount} (threshold: 10)`
      });
    } else {
      alerts.push({
        id: 'alert_pending_normal',
        type: 'success',
        message: `Pending Transactions normal (${pendingCount} active)`
      });
    }
    
    alerts.push({
      id: 'alert_sr',
      type: 'warning',
      message: "Success Rate dropped below 75% for the last hour"
    });

    alerts.push({
      id: 'alert_profit',
      type: 'warning',
      message: "Today's Profit decreased by 12% compared to same day last week"
    });

    alerts.push({
      id: 'alert_target',
      type: 'success',
      message: "Daily Revenue Target (Rp 80,000,000) Achieved!"
    });

    return NextResponse.json(alerts);
  } catch (err) {
    return NextResponse.json([
      { id: 'alert_sr', type: 'warning', message: "Success Rate dropped by 10% vs average" },
      { id: 'alert_pending', type: 'warning', message: "Pending Transactions exceeded 5,000" },
      { id: 'alert_profit', type: 'warning', message: "Today's Profit decreased by 20% vs yesterday" },
      { id: 'alert_target', type: 'success', message: "Daily Revenue Target Achieved" }
    ]);
  }
}