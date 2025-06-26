import { SchemaType } from '../utils/inferSchema'; 

export interface GenerateOptions {
  inferOptional: boolean;
  prettify: boolean;
  interfaceName?: string; 
}

export function generateJsonSchema(schema: SchemaType, options: GenerateOptions): string {
  const output = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: options.interfaceName || 'GeneratedSchema',
    ...generateJsonSchemaFromSchema(schema, options) 
  };
  
  return options.prettify ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}

function generateJsonSchemaFromSchema(schemaNode: SchemaType, options: GenerateOptions): any {
  if (!schemaNode) return { type: 'null' }; 
  
  let jsonSchemaNode: any = {};

  switch (schemaNode.type) {
    case 'null':
      jsonSchemaNode.type = 'null';
      break;
    case 'string':
      jsonSchemaNode.type = 'string';
      if (schemaNode.format) jsonSchemaNode.format = schemaNode.format;
      break;
    case 'number':
      jsonSchemaNode.type = 'number';
      break;
    case 'integer':
      jsonSchemaNode.type = 'integer';
      break;
    case 'boolean':
      jsonSchemaNode.type = 'boolean';
      break;
    case 'array':
      jsonSchemaNode.type = 'array';
      if (schemaNode.items) {
        jsonSchemaNode.items = generateJsonSchemaFromSchema(schemaNode.items, options);
      } else {
        jsonSchemaNode.items = {}; 
      }
      break;
    case 'object':
      jsonSchemaNode.type = 'object';
      jsonSchemaNode.properties = {};
      if (schemaNode.properties) {
        for (const [key, value] of Object.entries(schemaNode.properties)) {
          jsonSchemaNode.properties[key] = generateJsonSchemaFromSchema(value, options);
        }
      }
      
      // if (options.inferOptional) {
      //   if (schemaNode.required && schemaNode.required.length > 0) {
      //     jsonSchemaNode.required = schemaNode.required;
      //   }
      // } else {
      //    if (schemaNode.properties) {
      //        jsonSchemaNode.required = Object.keys(schemaNode.properties);
      //    }

      // }

      if (options.inferOptional) { // This will be false for SQL if user doesn't override
        if (schemaNode.required && schemaNode.required.length > 0) {
          jsonSchemaNode.required = schemaNode.required;
        }
      } else { // This branch will be hit for SQL
         if (schemaNode.properties) {
             jsonSchemaNode.required = Object.keys(schemaNode.properties);
         }
      }


      if (jsonSchemaNode.required && jsonSchemaNode.required.length === 0) {
          delete jsonSchemaNode.required;
      }
      break;
    case 'union':
      if (schemaNode.enum && schemaNode.enum.length > 0) {
        const validEnumSchemas = schemaNode.enum.filter(s => s);
        jsonSchemaNode.anyOf = validEnumSchemas.map((s: SchemaType) => generateJsonSchemaFromSchema(s, options));
        if (jsonSchemaNode.anyOf.length === 0) delete jsonSchemaNode.anyOf; // clean up if empty
      } else {
        jsonSchemaNode.description = "Union type with no specific variants, effectively 'any'.";
      }
      break;
    default:
      jsonSchemaNode.description = `Represents type: ${schemaNode.type}`;
      break;
  }
  return jsonSchemaNode;
}