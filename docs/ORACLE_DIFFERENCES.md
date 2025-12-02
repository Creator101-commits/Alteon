#  Oracle vs PostgreSQL Migration Notes

## **Key Differences to Watch For:**

### **SQL Syntax Differences:**
- **Boolean Values**: PostgreSQL uses `true/false`, Oracle uses `1/0` (NUMBER)
- **String Concatenation**: PostgreSQL uses `||`, Oracle uses `||` (same) 
- **Quotes**: PostgreSQL uses double quotes for identifiers, Oracle prefers uppercase
- **LIMIT**: PostgreSQL uses `LIMIT`, Oracle uses `ROWNUM` or `FETCH FIRST`
- **Auto-increment**: PostgreSQL uses `SERIAL`, Oracle uses `IDENTITY` or sequences

### **Data Type Mappings:**
```sql
PostgreSQL          → Oracle
-----------------------------------------
VARCHAR(n)          → VARCHAR2(n)
TEXT                → CLOB
BOOLEAN             → NUMBER(1) 
TIMESTAMP           → TIMESTAMP
UUID                → VARCHAR2(36)
JSON/JSONB          → CLOB (store as JSON string)
```

### **Schema Differences:**
- Oracle table/column names are UPPERCASE by default
- Oracle requires explicit NULL handling
- Oracle has stricter type checking
- Oracle uses different constraint syntax

### **Connection Differences:**
```javascript
// PostgreSQL (old)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Oracle (new)
const oracledb = require('oracledb');
oracledb.initOracleClient({ configDir: './server' });
const connection = await oracledb.getConnection({
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING
});
```

### **Query Parameter Binding:**
```javascript
// PostgreSQL (old)
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Oracle (new)  
const result = await connection.execute('SELECT * FROM users WHERE id = :id', { id: userId });
```

### **Result Set Handling:**
```javascript
// PostgreSQL (old)
const users = result.rows;

// Oracle (new)
const users = result.rows; // Same! 
```

## ** Important Gotchas:**

1. **Oracle Free Tier Limits:**
   - 2 Always Free Autonomous Databases
   - 1 OCPU and 20 GB storage each
   - More than enough for development!

2. **Connection Pooling:**
   - Oracle strongly recommends connection pooling
   - Our implementation includes proper pool management

3. **Transaction Handling:**
   - Oracle defaults to manual commit
   - We set `autoCommit: true` in our queries

4. **Date/Time Handling:**
   - Oracle has different date formats
   - Use ISO strings or Date objects for compatibility

5. **Case Sensitivity:**
   - Oracle column names are case-insensitive by default
   - Use lowercase in your application for consistency

6. **Error Codes:**
   - Oracle uses ORA-##### error codes
   - Different from PostgreSQL error codes

## ** Migration Benefits:**

1. **Cloud-Native**: Oracle Autonomous Database is fully managed
2. **Free Tier**: Generous free tier for development
3. **Performance**: Automatic tuning and optimization
4. **Security**: Built-in encryption and security features
5. **Scalability**: Easy to scale up when needed
6. **Reliability**: 99.995% availability SLA

## ** Performance Tips:**

1. **Use Bind Variables**: Always use parameterized queries (we do this )
2. **Connection Pooling**: Use connection pools (implemented )
3. **Batch Operations**: Use `executeMany()` for bulk inserts
4. **Indexes**: Oracle automatically creates indexes for primary keys
5. **Query Optimization**: Oracle's optimizer is very advanced

## ** Useful Oracle Resources:**

- [Oracle Database Free Tier](https://www.oracle.com/cloud/free/)
- [Oracle node-oracledb Documentation](https://oracle.github.io/node-oracledb/)
- [Oracle SQL Language Reference](https://docs.oracle.com/en/database/oracle/oracle-database/21/sqlrf/)
- [Oracle Cloud SQL Worksheet](https://docs.oracle.com/en/cloud/paas/autonomous-database/adbsa/sql-worksheet.html)