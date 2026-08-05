const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

// Load environment variables from the parent project's .env file
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database configuration (reused from parent project env)
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || '10.0.0.2',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    useUTC: false,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

let poolPromise = null;

async function getDbConnection() {
  if (!dbConfig.server || !dbConfig.user) {
    throw new Error('Database credentials are not configured in environment variables.');
  }

  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig)
      .then(pool => {
        console.log('Successfully connected to MS SQL Database.');
        return pool;
      })
      .catch(err => {
        poolPromise = null;
        console.error('Database connection failed:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

// Map string types to mssql type objects
const typeMap = {
  'varchar': sql.VarChar,
  'nvarchar': sql.NVarChar,
  'text': sql.Text,
  'int': sql.Int,
  'bigint': sql.BigInt,
  'smallint': sql.SmallInt,
  'tinyint': sql.TinyInt,
  'bit': sql.Bit,
  'float': sql.Float,
  'numeric': sql.Numeric,
  'decimal': sql.Decimal,
  'real': sql.Real,
  'date': sql.Date,
  'datetime': sql.DateTime,
  'datetime2': sql.DateTime2,
  'time': sql.Time,
  'uniqueidentifier': sql.UniqueIdentifier,
};

// Route to execute queries
app.post('/api/query', async (req, res) => {
  const { query, inputs } = req.body;
  const apiKey = req.headers['x-api-key'];

  // 1. Authenticate Request
  const expectedKey = process.env.DB_BRIDGE_KEY;
  if (!expectedKey) {
    return res.status(500).send('Server configuration error: DB_BRIDGE_KEY is not defined in .env');
  }

  if (apiKey !== expectedKey) {
    console.warn(`Unauthorized query attempt blocked from IP: ${req.ip}`);
    return res.status(401).send('Unauthorized: Invalid API Key');
  }

  if (!query) {
    return res.status(400).send('Bad Request: query string is required');
  }

  try {
    const pool = await getDbConnection();
    const dbRequest = pool.request();

    // 2. Bind inputs if any
    if (Array.isArray(inputs)) {
      for (const input of inputs) {
        let sqlType = typeMap[input.type.toLowerCase()];
        
        if (sqlType) {
          // Re-instantiate parameterized types
          if (input.length !== undefined) {
            sqlType = sqlType(input.length);
          } else if (input.precision !== undefined && input.scale !== undefined) {
            sqlType = sqlType(input.precision, input.scale);
          }
        }

        // Convert ISO date strings back to JS Date objects
        let val = input.value;
        if (['datetime', 'datetime2', 'date'].includes(input.type.toLowerCase()) && typeof val === 'string') {
          val = new Date(val);
        }

        dbRequest.input(input.name, sqlType, val);
      }
    }

    // 3. Execute query
    console.log(`Executing query: ${query.substring(0, 100).replace(/\s+/g, ' ')}...`);
    const result = await dbRequest.query(query);
    
    // Return recordset and basic metadata
    res.json({
      recordset: result.recordset,
      recordsets: result.recordsets,
      rowsAffected: result.rowsAffected,
      output: result.output,
    });
  } catch (err) {
    console.error('Query execution error:', err.message);
    res.status(500).send(`Database Error: ${err.message}`);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('Database Bridge is running.');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`Database API Bridge running on http://localhost:${PORT}`);
  console.log(`Connecting to database host: ${dbConfig.server}`);
  console.log(`==================================================`);
});
