import oracledb from 'oracledb';
import path from 'path';
import fs from 'fs';

// Determine if running in production (Docker/Railway) or local development
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Oracle Client with wallet location
// - Local development: Uses Oracle Instant Client from OCI_LIB_DIR
// - Production: Uses bundled wallet in server/oracle_wallet
let oracleClientAvailable = false;
let oracleClientInitialized = false;

function initializeOracleClient() {
  if (oracleClientInitialized) return oracleClientAvailable;
  oracleClientInitialized = true;
  
  try {
    // Determine wallet location
    // Production: use bundled wallet in server/oracle_wallet
    // Local dev: use TNS_ADMIN from .env (points to Instant Client wallet)
    const productionWalletPath = path.resolve(process.cwd(), 'server', 'oracle_wallet');
    const walletLocation = isProduction 
      ? productionWalletPath 
      : (process.env.TNS_ADMIN || productionWalletPath);
    
    // Determine library directory
    // Production: uses system Oracle Instant Client from Docker (ORACLE_HOME)
    // Local dev: uses OCI_LIB_DIR from .env
    const libDir = isProduction
      ? (process.env.ORACLE_HOME || '/opt/oracle/instantclient_19_23')
      : (process.env.OCI_LIB_DIR || process.env.DYLD_LIBRARY_PATH?.split(':')[0]);
    
    console.log(` Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(' Initializing Oracle Client with libDir:', libDir);
    console.log(' Wallet location (TNS_ADMIN):', walletLocation);
    
    // Check if wallet directory exists
    if (!fs.existsSync(walletLocation)) {
      console.warn(` Wallet directory not found: ${walletLocation}`);
    }
    
    // Initialize Oracle client
    // In production, libDir may not be needed if Oracle libs are in LD_LIBRARY_PATH
    const initConfig: any = {
      configDir: walletLocation
    };
    
    // Only set libDir for local development or if explicitly provided
    if (!isProduction && libDir) {
      initConfig.libDir = libDir;
    }
    
    oracledb.initOracleClient(initConfig);
    oracleClientAvailable = true;
    console.log(' Oracle Client initialized successfully');
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    // If already initialized, that's okay
    if (errorMessage.includes('already been called')) {
      oracleClientAvailable = true;
      console.log(' Oracle Client was already initialized');
      return oracleClientAvailable;
    }
    
    console.log(' Oracle Client initialization error:', errorMessage);
    
    if (!isProduction) {
      console.log(' Oracle Instant Client not installed. Database features will be limited.');
      console.log(' To install Oracle Instant Client:');
      console.log('   1. Download from: https://www.oracle.com/database/technologies/instant-client/macos-arm64-downloads.html');
      console.log('   2. Extract to a folder');
      console.log('   3. Set OCI_LIB_DIR in .env to the folder path');
    }
    oracleClientAvailable = false;
  }
  
  return oracleClientAvailable;
}

let pool: oracledb.Pool | null = null;

export async function initializeDatabase() {
  try {
    // Initialize Oracle client first (deferred to ensure .env is loaded)
    initializeOracleClient();
    
    if (!oracleClientAvailable) {
      throw new Error('Oracle Client is not available. Please install Oracle Instant Client to use database features.');
    }

    // Debug: Log environment variables (without sensitive data)
    console.log(' Oracle ENV check:', {
      ORACLE_USER: process.env.ORACLE_USER ? 'set' : 'not set',
      ORACLE_PASSWORD: process.env.ORACLE_PASSWORD ? 'set (hidden)' : 'not set',
      ORACLE_CONNECTION_STRING: process.env.ORACLE_CONNECTION_STRING ? 'set' : 'not set',
      TNS_ADMIN: process.env.TNS_ADMIN || 'not set'
    });

    if (!process.env.ORACLE_USER || !process.env.ORACLE_PASSWORD || !process.env.ORACLE_CONNECTION_STRING) {
      throw new Error('Oracle database environment variables are not set');
    }

    // Determine wallet location based on environment
    // Production: bundled wallet in server/oracle_wallet
    // Development: TNS_ADMIN from .env (Instant Client path)
    const productionWalletPath = path.resolve(process.cwd(), 'server', 'oracle_wallet');
    const walletLocation = isProduction
      ? productionWalletPath
      : (process.env.TNS_ADMIN || productionWalletPath);
    
    // Build config with current env values (after .env is loaded)
    const currentDbConfig = {
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
      walletLocation: walletLocation,
      walletPassword: process.env.ORACLE_WALLET_PASSWORD || '', // Empty for auto-login wallets in production
      poolMin: 3,              // Warm pool for common load (was 1)
      poolMax: 15,             // Allow burst capacity (was 10)
      poolIncrement: 2,        // Faster scaling (was 1)
      poolTimeout: 120,        // 2 min idle timeout - save resources (was 300)
      stmtCacheSize: 50,       // Cache more prepared statements (was 23)
      queueTimeout: 30000,     // 30s queue timeout for waiting connections
    };
    
    console.log(' Using wallet location:', walletLocation);

    console.log('Initializing Oracle connection pool...');
    pool = await oracledb.createPool(currentDbConfig);
    console.log(' Oracle database pool created successfully');
    return pool;
  } catch (error) {
    console.error(' Error creating Oracle database pool:', error);
    throw error;
  }
}

export async function getConnection() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return await pool.getConnection();
}

export async function closeDatabase() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Oracle database pool closed');
  }
}

// Helper function to execute queries
export async function executeQuery(sql: string, binds: any = {}, options: any = {}) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...options
    });
    
    // Handle LOB data if present
    if (result.rows) {
      for (const row of result.rows as any[]) {
        for (const [key, value] of Object.entries(row)) {
          if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Lob') {
            try {
              // Type assertion for LOB object
              const lobValue = value as any;
              if (lobValue.getData && typeof lobValue.getData === 'function') {
                row[key] = await lobValue.getData();
              }
            } catch (lobError) {
              console.error('Error reading LOB data:', lobError);
              row[key] = null; // Set to null if LOB reading fails
            }
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

// Helper function to execute queries with connection management
export async function executeQueryWithConnection<T>(
  callback: (connection: oracledb.Connection) => Promise<T>
): Promise<T> {
  let connection;
  try {
    connection = await getConnection();
    return await callback(connection);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

export { oracledb };