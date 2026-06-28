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
        console.time("query30");
        const pool = await sql.connect(config);
        const res = await pool.request().query(`
            SELECT 
                m.kode, 
                m.label, 
                m.tujuan, 
                m.aktif, 
                m.saldo,
                ISNULL(t_stats.total_trx, 0) as total_trx,
                ISNULL(t_stats.success_trx, 0) as success_trx
            FROM modul m
            LEFT JOIN (
                SELECT 
                    kode_modul, 
                    COUNT(*) as total_trx,
                    SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success_trx
                FROM transaksi
                WHERE tgl_entri >= DATEADD(day, -30, GETDATE())
                GROUP BY kode_modul
            ) t_stats ON m.kode = t_stats.kode_modul
            WHERE m.deleted = 0
            ORDER BY total_trx DESC
        `);
        console.timeEnd("query30");
        console.log("Results count:", res.recordset.length);
        console.log("Sample results:", res.recordset.slice(0, 5));
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
main();
