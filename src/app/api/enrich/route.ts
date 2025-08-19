import { NextRequest } from 'next/server';
import { Guest, EnrichedProfile } from '@/lib/types';
import { enrichProfileBatch } from '@/lib/enrichment';
import { getCachedProfilesBatch, cacheProfilesBatch } from '@/lib/chroma';

export async function POST(request: NextRequest) {
  try {
    const { guests }: { guests: Guest[] } = await request.json();

    if (!guests || !Array.isArray(guests)) {
      return new Response('Invalid request body', { status: 400 });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Check for cached profiles first
          const apiIds = guests.map(g => g.api_id);
          const cachedProfiles = await getCachedProfilesBatch(apiIds);

          // Send cached profiles immediately
          for (const [apiId, profile] of Object.entries(cachedProfiles)) {
            const data = JSON.stringify(profile) + '\n';
            console.log('Sending cached profile:', apiId);
            controller.enqueue(encoder.encode(data));
          }

          // Process guests that need enrichment
          const guestsToEnrich = guests.filter(g => !cachedProfiles[g.api_id]);

          // Process guests in batches for efficiency
          const batchSize = 50;
          for (let i = 0; i < guestsToEnrich.length; i += batchSize) {
            const batch = guestsToEnrich.slice(i, i + batchSize);
            
            try {
              // Process the entire batch at once
              const enrichedProfiles = await enrichProfileBatch(batch);
              
              // Send each profile to client immediately
              for (const profile of enrichedProfiles) {
                const data = JSON.stringify(profile) + '\n';
                console.log('Sending profile:', profile.api_id);
                controller.enqueue(encoder.encode(data));
              }
              
              // Cache the entire batch at once for better performance
              try {
                void cacheProfilesBatch(enrichedProfiles);
              } catch (error) {
                console.error('Error caching batch:', error);
              }
              
            } catch (error) {
              console.error(`Error enriching batch:`, error);
              
              // Send minimal profiles for the entire batch if enrichment fails
              const fallbackProfiles: EnrichedProfile[] = batch.map(guest => ({
                api_id: guest.api_id,
                name: guest.name,
                email: guest.email,
              }));
              
              for (const profile of fallbackProfiles) {
                const data = JSON.stringify(profile) + '\n';
                console.log('Sending fallback profile:', profile.api_id);
                controller.enqueue(encoder.encode(data));
              }
            }

            
            // Small delay between batches to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          controller.close();
        } catch (error) {
          console.error('Error in enrichment stream:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error) {
    console.error('Error in enrichment API:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

