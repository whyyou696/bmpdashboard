const sql = require("mssql");
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

app.get("/transactions", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || "all";
        const search = req.query.search || "";
        const date = req.query.date || "";

        const pool = await sql.connect(config);
        const request = pool.request();

        let conditions = [];

        if (status !== "all") {
            const statusInt = parseInt(status);
            if (!isNaN(statusInt)) {
                conditions.push("status = @status");
                request.input("status", sql.Int, statusInt);
            }
        }

        if (search) {
            conditions.push("(tujuan LIKE @search OR kode LIKE @search OR kode_produk LIKE @search OR sn LIKE @search)");
            request.input("search", sql.VarChar, `%${search}%`);
        }

        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            conditions.push("CONVERT(date, tgl_entri) = @date");
            request.input("date", sql.VarChar, date);
        }

        const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

        // Get total count matching filters (using optimized sys.partitions for unfiltered counts to avoid timeouts)
        let total = 0;
        if (whereClause === "") {
            const countResult = await request.query(`
                SELECT CAST(SUM(p.rows) AS INT) AS total 
                FROM sys.partitions p
                INNER JOIN sys.tables t ON p.object_id = t.object_id
                WHERE t.name = 'transaksi' AND p.index_id IN (0, 1)
            `);
            total = countResult.recordset[0].total || 0;
        } else {
            const countResult = await request.query(`SELECT COUNT(*) AS total FROM transaksi ${whereClause}`);
            total = countResult.recordset[0].total || 0;
        }

        // Add pagination params and run data query
        request.input("offset", sql.Int, offset);
        request.input("limit", sql.Int, limit);

        const dataQuery = `
            SELECT *
            FROM transaksi
            ${whereClause}
            ORDER BY tgl_entri DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;
        const dataResult = await request.query(dataQuery);

        res.json({
            data: dataResult.recordset,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("API Error /transactions:", err);
        res.status(500).json(err);
    }
});

app.get("/transactions/success", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";
        const date = req.query.date || "";

        const pool = await sql.connect(config);
        const request = pool.request();

        let conditions = ["status = 20"];

        if (search) {
            conditions.push("(tujuan LIKE @search OR kode LIKE @search OR kode_produk LIKE @search OR sn LIKE @search)");
            request.input("search", sql.VarChar, `%${search}%`);
        }

        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            conditions.push("CONVERT(date, tgl_entri) = @date");
            request.input("date", sql.VarChar, date);
        }

        const whereClause = "WHERE " + conditions.join(" AND ");

        const countResult = await request.query(`SELECT COUNT(*) AS total FROM transaksi ${whereClause}`);
        const total = countResult.recordset[0].total;

        request.input("offset", sql.Int, offset);
        request.input("limit", sql.Int, limit);

        const result = await request.query(`
            SELECT *
            FROM transaksi
            ${whereClause}
            ORDER BY tgl_entri DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);

        res.json({
            data: result.recordset,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("API Error /transactions/success:", err);
        res.status(500).json(err);
    }
});

app.get("/transactions/stats", async (req, res) => {
    try {
        const date = req.query.date || "";
        const pool = await sql.connect(config);
        const request = pool.request();

        let whereClause = "";
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            whereClause = "WHERE CONVERT(date, tgl_entri) = @date";
            request.input("date", sql.VarChar, date);
        }

        const result = await request.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as successCount,
                SUM(CASE WHEN status = 40 THEN 1 ELSE 0 END) as failedCount,
                SUM(CASE WHEN status NOT IN (20, 40) THEN 1 ELSE 0 END) as pendingCount,
                SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga, 0) AS BIGINT) ELSE 0 END) as totalRetail,
                SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga_beli, 0) AS BIGINT) ELSE 0 END) as totalCost,
                SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as totalProfit
            FROM transaksi
            ${whereClause}
        `);
        const stats = result.recordset[0];
        const successRate = stats.total > 0 ? ((stats.successCount / stats.total) * 100).toFixed(1) : 0;

        res.json({
            total: stats.total || 0,
            successCount: stats.successCount || 0,
            failedCount: stats.failedCount || 0,
            pendingCount: stats.pendingCount || 0,
            successRate: parseFloat(successRate),
            totalRetail: stats.totalRetail || 0,
            totalCost: stats.totalCost || 0,
            totalProfit: stats.totalProfit || 0
        });
    } catch (err) {
        console.error("API Error /transactions/stats:", err);
        res.status(500).json(err);
    }
});

app.get("/transactions/chart", async (req, res) => {
    try {
        const date = req.query.date || "";
        const pool = await sql.connect(config);
        const request = pool.request();

        let query = "";
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            request.input("date", sql.VarChar, date);
            query = `
                SELECT 
                    DATEPART(hour, tgl_entri) as label,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 40 THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as profit
                FROM transaksi
                WHERE CONVERT(date, tgl_entri) = @date
                GROUP BY DATEPART(hour, tgl_entri)
                ORDER BY label ASC
            `;
        } else {
            query = `
                SELECT 
                    CONVERT(date, tgl_entri) as label,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 20 THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 40 THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 20 THEN CAST(ISNULL(harga - harga_beli, 0) AS BIGINT) ELSE 0 END) as profit
                FROM transaksi
                WHERE tgl_entri >= DATEADD(day, -7, GETDATE())
                GROUP BY CONVERT(date, tgl_entri)
                ORDER BY label ASC
            `;
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("API Error /transactions/chart:", err);
        res.status(500).json(err);
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(3000, () => {
    console.log("API Dijalankan, Silahkan Buka http://localhost:3000/dashboard");
});