import { CloudClient } from 'chromadb';
import { EnrichedProfile } from './types';

let client: CloudClient | null = null;

export async function getChromaClient(): Promise<CloudClient> {
  if (!client) {
    client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY!,
      tenant: process.env.CHROMA_TENANT!,
      database: process.env.CHROMA_DATABASE!
    });
  }
  return client;
}

export async function cacheProfilesBatch(profiles: EnrichedProfile[]): Promise<void> {
  if (profiles.length === 0) return;

  try {
    const client = await getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: "enriched-profiles",
    });

    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Process in batches of 100
    for (let i = 0; i < profiles.length; i += 100) {
      const batch = profiles.slice(i, i + 100);
      
      await collection.upsert({
        ids: batch.map(p => p.api_id),
        documents: batch.map(p => JSON.stringify(p)), 
        metadatas: batch.map(() => ({
          updated_at: currentTimestamp
        })),
      });
    }
  } catch (error) {
    console.error('Error caching profiles batch:', error);
  }
}

export async function getCachedProfilesBatch(apiIds: string[]): Promise<Record<string, EnrichedProfile>> {
  if (apiIds.length === 0) return {};

  try {
    const client = await getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: "enriched-profiles",
    });

    const cachedProfiles: Record<string, EnrichedProfile> = {};

    // Deduplicate IDs
    const uniqueIds = [...new Set(apiIds)];

    // Process in batches of 100
    for (let i = 0; i < uniqueIds.length; i += 100) {
      const batchIds = uniqueIds.slice(i, i + 100);
      const results = await collection.get({
        ids: batchIds,
      });

      if (results.ids && results.documents) {
        for (let j = 0; j < results.ids.length; j++) {
          const id = results.ids[j];
          const document = results.documents[j];
          
          if (typeof document === 'string') {
            try {
              cachedProfiles[id] = JSON.parse(document) as EnrichedProfile;
            } catch (e) {
              console.error(`Error parsing cached profile for ${id}:`, e);
            }
          }
        }
      }
    }

    return cachedProfiles;
  } catch (error) {
    console.error('Error getting cached profiles batch:', error);
    return {};
  }
}

