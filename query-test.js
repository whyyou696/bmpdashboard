const sql = require("mssql");
require("dotenv").config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        useUTC: false,
    },
};

async function main() {
    try {
        const pool = await sql.connect(config);
        
        const resStats = await pool.request().query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 20 AND (sn NOT IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND') OR sn IS NULL) THEN 1 ELSE 0 END) as successCount,
                SUM(CASE WHEN status = 40 THEN 1 ELSE 0 END) as failedCount,
                SUM(CASE WHEN status = 50 THEN 1 ELSE 0 END) as canceledCount,
                SUM(CASE WHEN status = 52 OR (status NOT IN (40, 50, 52, 53) AND sn IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND')) THEN 1 ELSE 0 END) as suspectCount,
                SUM(CASE WHEN status = 53 THEN 1 ELSE 0 END) as tujuanSalahCount,
                SUM(CASE WHEN status NOT IN (20, 40, 50, 52, 53) AND (sn NOT IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND') OR sn IS NULL) THEN 1 ELSE 0 END) as pendingCount
            FROM transaksi
        `);
        const stats = resStats.recordset[0];
        console.log("Lifetime counts:", stats);
        console.log("Sum of lifetime counts:", stats.successCount + stats.failedCount + stats.canceledCount + stats.suspectCount + stats.tujuanSalahCount + stats.pendingCount);

        const resDate = await pool.request().query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 20 AND (sn NOT IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND') OR sn IS NULL) THEN 1 ELSE 0 END) as successCount,
                SUM(CASE WHEN status = 40 THEN 1 ELSE 0 END) as failedCount,
                SUM(CASE WHEN status = 50 THEN 1 ELSE 0 END) as canceledCount,
                SUM(CASE WHEN status = 52 OR (status NOT IN (40, 50, 52, 53) AND sn IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND')) THEN 1 ELSE 0 END) as suspectCount,
                SUM(CASE WHEN status = 53 THEN 1 ELSE 0 END) as tujuanSalahCount,
                SUM(CASE WHEN status NOT IN (20, 40, 50, 52, 53) AND (sn NOT IN ('N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND') OR sn IS NULL) THEN 1 ELSE 0 END) as pendingCount
            FROM transaksi
            WHERE CONVERT(date, tgl_entri) = '2026-06-10'
        `);
        const dateStats = resDate.recordset[0];
        console.log("Date 2026-06-10 counts:", dateStats);
        console.log("Sum of date 2026-06-10 counts:", dateStats.successCount + dateStats.failedCount + dateStats.canceledCount + dateStats.suspectCount + dateStats.tujuanSalahCount + dateStats.pendingCount);

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
main();
