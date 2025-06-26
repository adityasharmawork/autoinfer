export interface SchemaType {
  type: string;
  properties?: Record<string, SchemaType>;
  items?: SchemaType;
  format?: string;
  required?: string[];
  enum?: SchemaType[]; 
}


export function inferSchema(data: any): SchemaType {
  if (data === null || data === undefined) {
    return { type: 'null' };
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', items: { type: 'any' } as SchemaType }; 
    }
    const itemSchemas = data.map(item => inferSchema(item));
    return { type: 'array', items: mergeSchemas(itemSchemas) };
  }
  
  // Handle objects
  if (typeof data === 'object' && data !== null) { 
    const properties: Record<string, SchemaType> = {};
    const required: string[] = []; 
    
    for (const [key, value] of Object.entries(data)) {
      properties[key] = inferSchema(value);
      if (value !== undefined) { 
        required.push(key);
      }
    }
    
    return { type: 'object', properties, required: required.length > 0 ? required : undefined };
  }
  
  // Handle primitives
  return inferPrimitiveSchema(data);
}


function inferPrimitiveSchema(value: any): SchemaType {
  const type = typeof value;
  
  // Handle special string formats
  if (type === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
      return { type: 'string', format: 'date-time' };
    }
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
      return { type: 'string', format: 'email' };
    }
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
      return { type: 'string', format: 'uuid' };
    }
    return { type: 'string' };
  }
  
  // Handle numeric types more precisely
  if (type === 'number') {
    if (Number.isInteger(value)) {
      return { type: 'integer' };
    }
    return { type: 'number' };
  }

  if (type === 'boolean') {
      return { type: 'boolean' };
  }
  
  
  return { type };
}


function mergeSchemas(schemas: SchemaType[]): SchemaType {
  if (schemas.length === 0) {
    return { type: 'any' } as SchemaType; 
  }
  
  if (schemas.length === 1) {
    return schemas[0];
  }
  

  const firstSchemaType = JSON.stringify(schemas[0]); // Simple comparison
  const allEffectivelySame = schemas.every(schema => JSON.stringify(schema) === firstSchemaType);

  if (allEffectivelySame) {
      return schemas[0];
  }


  const uniqueSchemaStrings = new Set<string>();
  const uniqueSchemas: SchemaType[] = [];

  schemas.forEach(s => {
      const sString = JSON.stringify(s); 
      if (!uniqueSchemaStrings.has(sString)) {
          uniqueSchemaStrings.add(sString);
          uniqueSchemas.push(s);
      }
  });
  
  if (uniqueSchemas.length === 1) {
      return uniqueSchemas[0];
  }

  return { type: 'union', enum: uniqueSchemas };
}