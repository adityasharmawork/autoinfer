import axios from 'axios';
import { inferSchema } from '../utils/inferSchema';

export async function parseApiResponse(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    return inferSchema(response.data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch API response: ${error.message}`);
    } else {
      throw new Error(`Failed to fetch API response: ${String(error)}`);
    }
  }
}