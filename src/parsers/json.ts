import * as fs from 'fs';
import { inferSchema, SchemaType } from '../utils/inferSchema';


export function parseJsonFile(filePath: string): Promise<SchemaType> {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      resolve(inferSchema(data));
    } catch (error) {
      reject(new Error(`Failed to parse JSON file: ${(error as Error).message}`));
    }
  });
}


export function parseJsonString(jsonString: string): SchemaType {
  try {
    const data = JSON.parse(jsonString);
    return inferSchema(data);
  } catch (error) {
    throw new Error(`Failed to parse JSON string: ${(error as Error).message}`);
  }
}