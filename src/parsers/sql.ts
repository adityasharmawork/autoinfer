import { SchemaType } from '../utils/inferSchema'; 


interface ColumnInfo {
  column_name: string;
  data_type: string;
  column_type?: string;
  udt_name?: string; // PostgreSQL specific, often more useful (e.g., '_int4' for int array)
  is_nullable: 'YES' | 'NO';
  column_default?: string | null;
}

function mapSqlTypeToSchemaType(sqlType: string, udtName?: string, mySqlColumnType?: string): SchemaType {
  const type = (udtName || sqlType).toLowerCase();

  if(mySqlColumnType === 'tinyint(1)') {
    return { type: 'boolean' };
  }

  // PostgreSQL specific array check (udt_name often starts with '_')
  if (udtName?.startsWith('_')) {
    const elementType = udtName.substring(1); // e.g., _int4 -> int4
    // Recursively get the schema for the array's element type
    const itemSchema = mapSqlTypeToSchemaType(elementType, elementType);
    // Now correctly returns a SchemaType that includes 'items'
    return { type: 'array', items: itemSchema };
  }

  if (type.includes('char') || type.includes('text') || type.includes('clob')) {
    return { type: 'string' };
  }
  if (type.includes('int') || type.includes('serial') || type.includes('long')) {
    return { type: 'integer' };
  }
  if (type.includes('float') || type.includes('double') || type.includes('num') || type.includes('decimal') || type.includes('real')) {
    return { type: 'number' };
  }
  if (type.includes('bool')) {
    return { type: 'boolean' };
  }
  if (type.includes('date') || type.includes('time')) {
    return { type: 'string', format: 'date-time' };
  }
  if (type.includes('uuid')) {
    return { type: 'string', format: 'uuid' };
  }
  if (type.includes('json')) { 
    return { type: 'object', properties: {} }; // Represents a generic JSON object
  }
  if (type.includes('bytea') || type.includes('blob')) {
    return { type: 'string', format: 'binary' };
  }
  return { type: 'string' }; 
}


export async function parseSqlTable(
  dbType: 'mysql' | 'postgresql',
  connectionString: string,
  tableName: string,
  dbSchemaName?: string 
): Promise<SchemaType> {
  let client: any; 
  const properties: Record<string, SchemaType> = {};
  const required: string[] = [];

  try {
    let query: string;
    let queryParams: string[];
    let results: ColumnInfo[];

    if (dbType === 'postgresql') {
      const { Client } = await import('pg');
      client = new Client({ connectionString });
      await client.connect();
      query = `
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = $2;
      `;
      queryParams = [tableName, dbSchemaName || 'public'];
      const res = await client.query(query, queryParams);
      results = res.rows;
    } else if (dbType === 'mysql') {
      const mysql = await import('mysql2/promise');
      client = await mysql.createConnection(connectionString);
      const currentDbQuery = "SELECT DATABASE() as currentDb;";
      let currentDb = dbSchemaName;

      if (!currentDb && client.config.database) {
          currentDb = client.config.database;
      } else if (!currentDb) {
          const [dbRows]: any = await client.execute(currentDbQuery);
          if (dbRows.length > 0 && dbRows[0].currentDb) {
              currentDb = dbRows[0].currentDb;
          } else {
              throw new Error("MySQL database name could not be determined and was not provided for schema lookup.");
          }
      }

      query = `
        SELECT column_name, data_type, is_nullable, column_default, column_type 
        FROM information_schema.columns
        WHERE table_name = ? AND table_schema = ?;
      `;
      queryParams = [tableName, currentDb!];
      const [rowsFromExecute]: any = await client.execute(query, queryParams);
      results = rowsFromExecute;
    } else {
      const exhaustiveCheck: never = dbType;
      throw new Error(`Unsupported SQL database type: ${exhaustiveCheck}`);
    }


    if (results.length === 0) {
      const schemaForError = dbType === 'mysql' ? queryParams[1] : (dbSchemaName || 'public');
      throw new Error(`Table '${tableName}' not found or no columns defined in schema '${schemaForError}'.`);
    }

    for (const col of results) {
      const baseSchemaType = mapSqlTypeToSchemaType(col.data_type, col.udt_name, col.column_type);

      if (baseSchemaType.type === 'array') {
          properties[col.column_name] = {
              type: 'array',
              items: baseSchemaType.items || { type: 'any' } // Fallback for items if somehow undefined
          };
      } else { // Regular type or object (for JSON)
          properties[col.column_name] = {
              type: baseSchemaType.type,
              ...(baseSchemaType.format && { format: baseSchemaType.format }),
              ...(baseSchemaType.type === 'object' && { properties: baseSchemaType.properties || {} })
          };
      }

      if (col.is_nullable === 'NO') {
        required.push(col.column_name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  } catch (error: any) {
    let errorMessage = `Failed to parse SQL table '${tableName}' from ${dbType}: ${error.message}`;
    if (error.code) { 
        if (error.code === 'ECONNREFUSED') {
            errorMessage = `Connection refused for ${dbType}. Ensure database is running and connection string is correct.`;
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = `Hostname not found for ${dbType} connection. Check the host in connection string.`;
        } else if (dbType === 'postgresql' && (error.code === '3D000' || error.code === '42P01')) {
            errorMessage = `Database or table '${tableName}' (schema: ${dbSchemaName || 'public'}) not found in PostgreSQL. Check names and connection. Details: ${error.message}`;
        } else if (dbType === 'mysql' && (error.code === 'ER_BAD_DB_ERROR' || error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_DBACCESS_DENIED_ERROR')) {
            errorMessage = `Database access error or table '${tableName}' not found in MySQL. Check names, permissions, and connection. Details: ${error.message}`;
        }
    }
    throw new Error(errorMessage);
  } finally {
    if (client) {
      if (typeof client.end === 'function') {
        await client.end();
      } else if (typeof client.destroy === 'function') { // Some MySQL promise wrappers might use destroy
        client.destroy();
      }
    }
  }
}