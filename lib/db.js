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

let poolPromise = null;

export async function getDbConnection() {
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
