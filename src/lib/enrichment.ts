import Exa from "exa-js";
import PDLJS from 'peopledatalabs';
import OpenAI from "openai";
import { convert } from 'html-to-text';
import { EnrichedProfile, Guest } from './types';

// Initialize API clients
const exa = new Exa(process.env.EXASEARCH_API_KEY!);
const pdlClient = new PDLJS({ apiKey: process.env.PDL_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function enrichProfileBatch(guests: Guest[]): Promise<EnrichedProfile[]> {
  const allEnrichedProfiles: EnrichedProfile[] = [];

  // Process in batches of 50 for efficiency
  const batchSize = 50;
  for (let i = 0; i < guests.length; i += batchSize) {
    const batch = guests.slice(i, i + batchSize);
    const batchProfiles = await enrichUsingExa(batch);

    for (let j = 0; j < batchProfiles.length; j++) {
      const profile = batchProfiles[j];
      if (!profile.bio && !profile.job_title) {
        //const pdlData = await getPDLProfile(batch[j]);
        //if (pdlData) {
        //  batchProfiles[j] = { ...profile, ...pdlData };
        //}
      }
    }

    for (let j = 0; j < batchProfiles.length; j++) {
      const profile = batchProfiles[j];
      // Get company website from email if not found
      if (!profile.company_website && profile.email) {
        profile.company_website = inferWebsiteFromEmail(profile.email);
      }
    }

    const companySummariesPromises = batchProfiles.map(async (profile) => await getCompanySummaryOfGuest(profile));
    const companySummaries = await Promise.all(companySummariesPromises);

    for (let j = 0; j < batchProfiles.length; j++) {
      const profile = batchProfiles[j];
      profile.company_summary = companySummaries[j];
    }

    allEnrichedProfiles.push(...batchProfiles);
  }

  return allEnrichedProfiles;
}

async function enrichUsingExa(guests: Guest[]): Promise<EnrichedProfile[]> {
  try {
    const linkedinUrls = guests.map(g => g.linkedin_url).filter((v) => !!v) as string[];
    const result = await exa.getContents(linkedinUrls, { text: true });
    const resultMap = new Map(result.results.map(r => [r.id, r.text]));

    const profiles: EnrichedProfile[] = [];

    for (const guest of guests) {
      const text = guest.linkedin_url ? resultMap.get(guest.linkedin_url) : undefined;
      if (!text) {
        // Create base profile from guest data
        profiles.push({
          api_id: guest.api_id,
          name: guest.name,
          email: guest.email,
          linkedin_url: guest.linkedin_url,
        });
      } else {
        const enrichedData = extractProfileFromExaText(text, guest.linkedin_url!);
        // Merge guest data with enriched data
        profiles.push({
          api_id: guest.api_id,
          name: guest.name,
          email: guest.email,
          ...enrichedData,
        });
      }
    }

    return profiles;
  } catch (error) {
    console.error('Error fetching LinkedIn profiles:', error);
    // Return fallback profiles for all guests instead of empty array
    return guests.map(guest => ({
      api_id: guest.api_id,
      name: guest.name,
      email: guest.email,
      linkedin_url: guest.linkedin_url,
    }));
  }
}

function extractProfileFromExaText(text: string, linkedinUrl: string): Partial<EnrichedProfile> {
  const profile: Partial<EnrichedProfile> = {
    linkedin_url: linkedinUrl,
  };

  // Extract position (bio)
  const positionMatch = text.match(/Position:\s*([^\n]+)/);
  if (positionMatch) {
    profile.bio = positionMatch[1].trim();
  }

  // Extract location
  const locationMatch = text.match(/Location:\s*([^\n]+)/);
  if (locationMatch) {
    profile.location = locationMatch[1].trim();
  }

  // Extract current job info
  const employerMatch = text.match(/employer:\s*([^\n]+)/);
  if (employerMatch) {
    profile.company = employerMatch[1].trim();
  }

  const jobTypeMatch = text.match(/type:\s*([^\n]+)/);
  if (jobTypeMatch) {
    profile.job_title = jobTypeMatch[1].trim();
  }

  // Extract education
  const educationMatch = text.match(/Institution:\s*([^\n]+)/);
  if (educationMatch) {
    profile.education = educationMatch[1].trim();
  }

  return profile;
}

async function getPDLProfile(guest: Guest): Promise<Partial<EnrichedProfile> | null> {
  try {
    const params = {
      first_name: guest.first_name,
      last_name: guest.last_name,
      name: guest.name,
      email: guest.email,
      ...(guest.linkedin_url && { profile: guest.linkedin_url })
    };

    const response = await pdlClient.person.enrichment(params);
    const record = response.data;

    if (!record) return null;

    const profile: Partial<EnrichedProfile> = {};

    // Job information
    if (record.job_title) {
      profile.job_title = record.job_title;
    } else if (record.experience && record.experience[0]?.title?.name) {
      profile.job_title = record.experience[0].title.name;
    }

    if (record.job_company_name) {
      profile.company = record.job_company_name;
    } else if (record.experience && record.experience[0]?.company?.name) {
      profile.company = record.experience[0].company.name;
    }

    // Location
    if (record.location_name && typeof record.location_name === 'string') {
      profile.location = record.location_name;
    } else if (record.experience && record.experience[0]?.company?.location?.name) {
      profile.location = record.experience[0].company.location.name;
    }

    // Company website
    if (record.job_company_website) {
      profile.company_website = record.job_company_website;
    } else if (record.experience && record.experience[0]?.company?.website) {
      profile.company_website = record.experience[0].company.website;
    }

    // Social URLs
    if (record.twitter_url) {
      profile.twitter_url = record.twitter_url;
    }

    if (record.job_company_twitter_url) {
      profile.job_company_twitter_url = record.job_company_twitter_url;
    } else if (record.experience && record.experience[0]?.company?.twitter_url) {
      profile.job_company_twitter_url = record.experience[0].company.twitter_url;
    }

    // Education
    if (record.education && record.education[0]) {
      const edu = record.education[0];
      profile.education = `${edu.school?.name || ''} ${edu.degrees?.[0] || ''}`.trim();
    }

    return profile;
  } catch (error) {
    console.error('Error fetching PDL profile:', error);
    return null;
  }
}

function inferWebsiteFromEmail(email: string): string | undefined {
  const domain = email.split('@')[1];
  if (!domain) return undefined;

  // Skip generic email providers and other non-company domains
  const genericDomains = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'live.com',
    'icloud.com',
    'aol.com',
    'protonmail.com',
    'mail.com',
    'zoho.com',
    'yandex.com',
    'me.com',
    'mac.com',
    'msn.com',
    'fastmail.com',
    'proton.me',
    'tutanota.com',
    'hey.com',
    'pm.me',
    'duck.com',
    'qq.com',
    '163.com',
    '126.com',
    'sina.com',
    'sohu.com',
    '139.com',
    '189.com',
    'proton.me',
    'tutanota.com',
    'hey.com',
    'pm.me',
    'duck.com',
    'qq.com',
    '163.com',
  ];
  if (genericDomains.includes(domain.toLowerCase())) {
    return undefined;
  }

  return `https://${domain}`;
}

async function getCompanySummaryOfGuest(guest: { company_website?: string }): Promise<string | undefined> {
  if (guest.company_website) {
    return await getCompanySummary(guest.company_website);
  }
  return undefined;
}

async function getCompanySummary(website: string): Promise<string | undefined> {
  try {
    // Try to fetch homepage and about page
    const urls = [website, `${website}/about`];
    const fetchPromises = urls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LumaEnricher/1.0)' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const html = await response.text();
          return convert(html, { wordwrap: false }).slice(0, 2000); // Limit content
        }
      } catch (e) {
        return null;
      }
    });

    const contents = await Promise.all(fetchPromises);
    const validContent = contents.filter(Boolean).join('\n\n').slice(0, 4000);

    if (!validContent) return undefined;

    // Use OpenAI to create summary
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a 20-word summary of this company based on their website content:\n\n${validContent}`
      }],
      max_tokens: 50,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content?.trim();
  } catch (error) {
    console.error('Error generating company summary:', error);
    return undefined;
  }
}

