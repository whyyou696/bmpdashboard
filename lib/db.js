import sql from 'mssql';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    useUTC: false,
  },
  connectionTimeout: 10000,
  requestTimeout: 15000,
};

// --- API BRIDGE CLIENT FOR VERCEL ---
class BridgeRequest {
  constructor() {
    this.inputs = [];
  }

  input(name, type, value) {
    let typeName = 'VarChar';
    if (type && type.type && type.type.declaration) {
      typeName = type.type.declaration;
    } else if (type && type.declaration) {
      typeName = type.declaration;
    } else if (typeof type === 'string') {
      typeName = type;
    }

    const inputObj = { name, type: typeName, value };

    // Pass parameterized parameters
    if (type && type.length !== undefined) inputObj.length = type.length;
    if (type && type.precision !== undefined) inputObj.precision = type.precision;
    if (type && type.scale !== undefined) inputObj.scale = type.scale;

    this.inputs.push(inputObj);
    return this;
  }

  async query(queryString) {
    const url = process.env.DB_BRIDGE_URL;
    const apiKey = process.env.DB_BRIDGE_KEY;

    if (!url) {
      throw new Error('DB_BRIDGE_URL is not configured in environment variables.');
    }

    const response = await fetch(`${url}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
      },
      body: JSON.stringify({
        query: queryString,
        inputs: this.inputs,
      }),
      // 25 second timeout (Vercel limit is 10s Hobby / 60s Pro)
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Database Bridge Error: ${errText}`);
    }

    return await response.json();
  }
}

class BridgePool {
  request() {
    return new BridgeRequest();
  }

  async query(queryString) {
    return new BridgeRequest().query(queryString);
  }
}
// ------------------------------------

let poolPromise = null;

export async function getDbConnection() {
  // If DB_BRIDGE_URL is configured, bypass local SQL and use the HTTP API bridge
  if (process.env.DB_BRIDGE_URL) {
    console.log('Using DB API Bridge client to fetch data from:', process.env.DB_BRIDGE_URL);
    return new BridgePool();
  }

  if (!process.env.DB_HOST || !process.env.DB_USER) {
    throw new Error('Database credentials are not configured in environment variables.');
  }

  if (!poolPromise) {
    poolPromise = sql.connect(config)
      .then(pool => {
        console.log('Successfully connected to MS SQL Database.');
        return pool;
      })
      .catch(err => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

export { sql };
