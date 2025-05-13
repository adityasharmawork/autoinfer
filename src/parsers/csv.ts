import * as fs from 'fs';
import csvParser from 'csv-parser';
import { inferSchema } from '../utils/inferSchema'; 
import { SchemaType } from '../utils/inferSchema'; 

function convertCsvValues(data: Record<string, string>): Record<string, any> {
  const converted: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value !== null && value.trim() !== '' && !isNaN(Number(value))) {
        converted[key] = Number(value);
      } else if (value && value.toLowerCase() === 'true') {
        converted[key] = true;
      } else if (value && value.toLowerCase() === 'false') {
        converted[key] = false;
      } else {
        converted[key] = value;
      }
    }
  }
  return converted;
}

export function parseCsvFile(filePath: string): Promise<SchemaType> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    const stream = fs.createReadStream(filePath);

    stream.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return reject(new Error(`Failed to open CSV file: File not found at ${filePath}`));
      }
      return reject(new Error(`Failed to read CSV file: ${error.message}`));
    });

    stream
      .pipe(csvParser())
      .on('data', (data: Record<string, string>) => {
        results.push(convertCsvValues(data));
      })
      .on('end', () => {
        if (results.length === 0) {
          return reject(new Error('CSV file is empty or contains only headers. Cannot infer schema.'));
        }
        try {
          const schema = inferSchema(results);
          resolve(schema);
        } catch (inferenceError: any) {
          reject(new Error(`Error inferring schema from CSV data: ${inferenceError.message}`));
        }
      })
      .on('error', (error: Error) => {
        reject(new Error(`Failed to parse CSV content: ${error.message}`));
      });
  });
}