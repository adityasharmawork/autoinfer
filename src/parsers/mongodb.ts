// // parsers/mongodb.ts
// import { MongoClient, Document } from 'mongodb';
// import { inferSchema, SchemaType } from '../utils/inferSchema'; // Adjust path as necessary

// const MAX_SAMPLE_SIZE = 100; // Number of documents to sample for inference

// export async function parseMongoDbCollection(
//   connectionString: string,
//   dbName: string,
//   collectionName: string
// ): Promise<SchemaType> {
//   let client: MongoClient | undefined;
//   try {
//     client = new MongoClient(connectionString);
//     await client.connect();
//     const db = client.db(dbName);
//     const collection = db.collection(collectionName);

//     // Fetch a sample of documents. Fetching all could be too much.
//     // .limit() is important here.
//     const sampleDocs = await collection.find().limit(MAX_SAMPLE_SIZE).toArray();

//     if (sampleDocs.length === 0) {
//       // Return a schema for an empty array or a generic object schema
//       // depending on what's more appropriate for an empty collection.
//       // For now, let's assume it implies an array of some (unknown) type or an empty object.
//       // Or, more accurately, an object type with no known properties yet.
//       console.warn(`MongoDB collection '${collectionName}' is empty or no documents matched the sample. Returning a generic object schema.`);
//       return { type: 'object', properties: {}, required: [] };
//     }

//     // MongoDB _id is an ObjectId, which we might want to represent as a string.
//     // We can preprocess docs or let inferSchema handle it (it will likely become object).
//     // For simplicity, let inferSchema handle it. Users can use customFields or override.
//     const processedDocs = sampleDocs.map(doc => {
//         const { _id, ...rest } = doc;
//         return {
//             _id: _id?.toString(), // Convert ObjectId to string for simpler schema, or handle as object
//             ...rest
//         };
//     });


//     return inferSchema(processedDocs); // Infer schema from the array of documents

//   } catch (error: any) {
//     throw new Error(`Failed to parse MongoDB collection '${collectionName}': ${error.message}`);
//   } finally {
//     if (client) {
//       await client.close();
//     }
//   }
// }








// parsers/mongodb.ts
import { MongoClient, Document, ObjectId as MongoObjectId } from 'mongodb'; // Import ObjectId
import { inferSchema, SchemaType } from '../utils/inferSchema';

const MAX_SAMPLE_SIZE = 100;

// Helper function to recursively convert ObjectIds to strings
function convertObjectIdsToStrings(data: any): any {
  if (data instanceof MongoObjectId) {
    return data.toString();
  }
  if (Array.isArray(data)) {
    return data.map(convertObjectIdsToStrings);
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date)) { // Avoid processing Date objects
    const res: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        res[key] = convertObjectIdsToStrings(data[key]);
      }
    }
    return res;
  }
  return data;
}

export async function parseMongoDbCollection(
  connectionString: string,
  dbName: string,
  collectionName: string
): Promise<SchemaType> {
  let client: MongoClient | undefined;
  try {
    client = new MongoClient(connectionString);
    await client.connect();
    const db = client.db(dbName);

    // --- Start: Fix for Issue 3 (Non-existent collection) ---
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      throw new Error(`Collection '${collectionName}' not found in database '${dbName}'. Check if both Collection Name and DataBase name are correct.`);
    }
    // --- End: Fix for Issue 3 ---

    const collection = db.collection(collectionName);
    const sampleDocs = await collection.find().limit(MAX_SAMPLE_SIZE).toArray();

    if (sampleDocs.length === 0) {
      console.warn(`MongoDB collection '${collectionName}' is empty. Returning a generic empty object schema.`);
      return { type: 'object', properties: {}, required: [] };
    }

    // --- Start: Fix for Issue 2 (Consistent ObjectId to string conversion) ---
    const processedDocs = sampleDocs.map(doc => convertObjectIdsToStrings(doc));
    // --- End: Fix for Issue 2 ---

    return inferSchema(processedDocs);

  } catch (error: any) {
    // Preserve specific error from collection check, otherwise create a general one
    if (error.message.startsWith("Collection '") && error.message.includes("' not found in database '")) {
        throw error;
    }
    throw new Error(`Failed to parse MongoDB collection '${collectionName}': ${error.message}`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}