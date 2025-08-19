// Guest data structure from CSV
export interface Guest {
  api_id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  created_at: string;
  approval_status: string;
  custom_source?: string;
  checked_in_at?: string;
  qr_code_url?: string;
  amount?: string;
  amount_tax?: string;
  amount_discount?: string;
  currency?: string;
  coupon_code?: string;
  eth_address?: string;
  solana_address?: string;
  survey_response_rating?: string;
  survey_response_feedback?: string;
  ticket_type_id?: string;
  ticket_name?: string;
  linkedin_url?: string;
  [key: string]: any; // For additional form fields
}

// Enriched person profile
export interface EnrichedProfile {
  api_id: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  linkedin_url?: string;
  twitter_url?: string;
  job_title?: string;
  company?: string;
  company_website?: string;
  job_company_twitter_url?: string;
  education?: string;
  company_summary?: string; // 20-word summary of company
}

// Combined guest with enriched data
export interface EnrichedGuest extends Guest {
  enriched?: EnrichedProfile;
  userDecision?: 'approved' | 'denied' | null;
}

// CSV upload configuration
export interface CsvConfig {
  linkedinColumnName?: string;
}

