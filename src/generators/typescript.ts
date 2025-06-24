// import { format } from 'prettier';
// import { SchemaType } from '../utils/inferSchema';

// export interface GenerateOptions {
//   inferOptional: boolean;
//   prettify: boolean;
//   interfaceName?: string;
// }

// export async function generateTypeScript(schema: SchemaType, options: GenerateOptions): Promise<string> {
//   const interfaceName = options.interfaceName || 'GeneratedInterface';
//   let output = `interface ${interfaceName} ${generateTypeScriptFromSchema(schema, options)}\n`;
  
//   if (options.prettify) {
//     try {
//       output = await format(output, { parser: 'typescript' });
//     } catch (error) {
//       console.warn('Failed to prettify output:', (error as Error).message);
//     }
//   }
  
//   return output;
// }


// function generateTypeScriptFromSchema(schema: SchemaType, options: GenerateOptions, depth = 0): string {
//   if (!schema) return 'any';
  
//   switch (schema.type) {
//     case 'null':
//       return 'null';
//     case 'string':
//       if (schema.format === 'date-time') return 'Date';
//       if (schema.format === 'email') return 'string'; 
//       if (schema.format === 'uuid') return 'string'; 
//       return 'string';
//     case 'number':
//       return 'number';
//     case 'integer':
//       return 'number'; 
//     case 'boolean':
//       return 'boolean';
//     case 'array':
//       const itemType = schema.items ? generateTypeScriptFromSchema(schema.items, options, depth + 1) : 'any';
//       return `${itemType}[]`;
//     case 'object':
//       if (!schema.properties) return 'Record<string, any>';
      
//       let output = '{\n';
//       const indent = '  '.repeat(depth + 1);
      
//       for (const [key, value] of Object.entries(schema.properties)) {
//         const isRequired = schema.required?.includes(key);
//         const optionalMarker = (!isRequired && options.inferOptional) ? '?' : '';
        
//         output += `${indent}${key}${optionalMarker}: ${generateTypeScriptFromSchema(value, options, depth + 1)};\n`;
//       }
      
//       output += '  '.repeat(depth) + '}';
//       return output;
//     case 'union':
//       if (schema.enum) {
//         return schema.enum.map((s: any) => generateTypeScriptFromSchema(s, options, depth)).join(' | ');
//       }
//       return 'any';
//     default:
//       return 'any';
//   }
// }















import { format } from 'prettier';
import { SchemaType } from '../utils/inferSchema';

export interface GenerateOptions {
  inferOptional: boolean;
  prettify: boolean;
  interfaceName?: string;
}

export async function generateTypeScript(
  schema: SchemaType,
  options: GenerateOptions
): Promise<string> {
  const interfaceName = options.interfaceName || 'GeneratedInterface';
  let output = `interface ${interfaceName} ${generateTypeScriptFromSchema(
    schema,
    options
  )}\n`;

  if (options.prettify) {
    try {
      output = await format(output, { parser: 'typescript' });
    } catch (error) {
      console.warn('Failed to prettify output:', (error as Error).message);
    }
  }

  return output;
}

function generateTypeScriptFromSchema(
  schema: SchemaType,
  options: GenerateOptions,
  depth = 0
): string {
  if (!schema) return 'any';

  switch (schema.type) {
    case 'null':
      return 'null';
    case 'string':
      if (schema.format === 'date-time') return 'Date';
      if (schema.format === 'email') return 'string';
      if (schema.format === 'uuid') return 'string';
      return 'string';
    case 'number':
      return 'number';
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array': {
      const itemType = schema.items
        ? generateTypeScriptFromSchema(schema.items, options, depth + 1)
        : 'any';
      return `${itemType}[]`;
    }
    case 'object': {
      if (!schema.properties) return 'Record<string, any>';

      let output = '{\n';
      const indent = '  '.repeat(depth + 1);

      for (const [key, value] of Object.entries(schema.properties)) {
        // schema.required comes from SQL's NOT NULL or from inference in other types
        const isActuallyRequired = schema.required?.includes(key) ?? false;

        // Determine optionality based on inferOptional flag:
        // - If inferOptional is true, a field is optional if it is NOT in schema.required.
        // - If inferOptional is false, all fields are treated as required.
        let isOptionalInOutput = false;
        if (options.inferOptional) {
          isOptionalInOutput = !isActuallyRequired;
        } else {
          isOptionalInOutput = false;
        }
        const optionalMarker = isOptionalInOutput ? '?' : '';

        output +=
          `${indent}${key}${optionalMarker}: ` +
          `${generateTypeScriptFromSchema(value, options, depth + 1)};\n`;
      }

      output += '  '.repeat(depth) + '}';
      return output;
    }
    case 'union': {
      if (schema.enum) {
        return schema.enum
          .map((s: any) => generateTypeScriptFromSchema(s, options, depth))
          .join(' | ');
      }
      return 'any';
    }
    default:
      return 'any';
  }
}
