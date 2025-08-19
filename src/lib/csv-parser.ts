import Papa from 'papaparse';
import { Guest, CsvConfig } from './types';

export function parseCSV(csvContent: string, config: CsvConfig = {}): Promise<Guest[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const guests: Guest[] = results.data.map((row: any) => {
            // Extract linkedin URL from specified column or default fields
            let linkedin_url: string | undefined;
            
            if (config.linkedinColumnName && row[config.linkedinColumnName]) {
              linkedin_url = normalizeLinkedInUrl(row[config.linkedinColumnName]);
            }

            return {
              api_id: row.api_id || '',
              name: row.name || '',
              first_name: row.first_name || '',
              last_name: row.last_name || '',
              email: row.email || '',
              phone_number: row.phone_number,
              created_at: row.created_at || '',
              approval_status: row.approval_status || '',
              custom_source: row.custom_source,
              checked_in_at: row.checked_in_at,
              qr_code_url: row.qr_code_url,
              amount: row.amount,
              amount_tax: row.amount_tax,
              amount_discount: row.amount_discount,
              currency: row.currency,
              coupon_code: row.coupon_code,
              eth_address: row.eth_address,
              solana_address: row.solana_address,
              survey_response_rating: row.survey_response_rating,
              survey_response_feedback: row.survey_response_feedback,
              ticket_type_id: row.ticket_type_id,
              ticket_name: row.ticket_name,
              linkedin_url,
              ...row // Include any additional fields
            };
          });

          resolve(guests);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

function normalizeLinkedInUrl(value: string): string | undefined {
  if (!value) return undefined;
  
  const trimmed = value.trim().toLowerCase();
  
  // Check for bad values
  const badValues = ['n/a', 'no', '', 'none', 'null', 'undefined'];
  if (badValues.includes(trimmed)) {
    return undefined;
  }
  
  // If it's already a full URL, return it
  if (trimmed.startsWith('http')) {
    return value.trim();
  }
  
  // If it's just a username, convert to full URL
  if (trimmed && !trimmed.includes('/')) {
    return `https://linkedin.com/in/${trimmed}`;
  }
  
  // If it looks like a linkedin path, add the domain
  if (trimmed.startsWith('/in/') || trimmed.startsWith('in/')) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `https://linkedin.com${path}`;
  }
  
  return value.trim();
}

export function getCSVColumns(csvContent: string): string[] {
  const lines = csvContent.split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return headers;
}

