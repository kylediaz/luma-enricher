# Luma Guest Enricher

A NextJS web application for enriching Luma event guest profiles with professional information from LinkedIn, company data, and AI-powered summaries.

## Features

- 📁 **CSV Upload**: Drag & drop CSV files with guest information
- 📱 **Tinder-style UI**: Phone-shaped profile cards for approving/denying guests
- 📊 **Real-time Table**: Dynamic guest list sorted by approval status
- 🔍 **Multi-source Enrichment**: LinkedIn profiles via Exa.ai + People Data Labs API
- 🏢 **Company Intelligence**: Automated company website analysis and summaries
- 🗄️ **Smart Caching**: ChromaDB vector database prevents duplicate API calls
- ⚡ **Streaming Updates**: Real-time profile enrichment via Server-Sent Events
- 🎨 **Clean Design**: Modern UI with rounded corners and no shadows

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Exa API key (sign up at [exa.ai](https://exa.ai))
- People Data Labs API key (sign up at [peopledatalabs.com](https://peopledatalabs.com))
- OpenAI API key (sign up at [platform.openai.com](https://platform.openai.com))
- ChromaDB Cloud account (sign up at [trychroma.com](https://trychroma.com))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd luma-enricher
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.development file
EXASEARCH_API_KEY=your_exa_api_key_here
PDL_API_KEY=your_people_data_labs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# ChromaDB Cloud Configuration
CHROMA_API_KEY=your_chroma_api_key_here
CHROMA_TENANT=your_chroma_tenant_id
CHROMA_DATABASE=your_chroma_database_name
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

### CSV Format

Your CSV should include the standard Luma guest export columns:
- `api_id` - Unique guest identifier
- `name` - Guest full name
- `first_name` - Guest first name  
- `last_name` - Guest last name
- `email` - Guest email address
- `approval_status` - Current approval status
- Plus any custom form fields with LinkedIn profiles

### LinkedIn Column Configuration

When uploading a CSV, you can specify which column contains LinkedIn URLs if it's not in the standard format. The app will automatically:
- Convert usernames to full LinkedIn URLs
- Filter out invalid values like "N/A", "none", etc.
- Handle various LinkedIn URL formats

### App Workflow

1. **Upload CSV**: Drag and drop your Luma guest CSV file
2. **Configure**: Select the LinkedIn column if available
3. **Review Profiles**: Use the tinder-style interface to approve/deny guests
4. **Monitor Progress**: Watch real-time enrichment in the guest table
5. **Make Decisions**: Approved guests appear at the top, denied at the bottom

## Caching & Performance

The application uses ChromaDB for intelligent caching:

### **Smart Cache System**
- **Prevents duplicate API calls** - Same LinkedIn profiles are cached and reused
- **Vector similarity search** - Find profiles similar to search queries
- **Persistent storage** - Cache survives across sessions


### **API Endpoints**
```bash
# Search similar profiles
GET /api/profiles?q=software engineer&limit=5

# Delete a cached profile
DELETE /api/profiles?linkedin_url=https://linkedin.com/in/username
```

### **Cache Flow**
1. **Check Cache**: First checks ChromaDB for existing profile
2. **Use Cached Data**: If found, returns cached enriched data instantly
3. **Fetch Fresh Data**: If not cached, calls Exa API for new data
4. **Store in Cache**: Saves new profile data to ChromaDB for future use

### **Performance Optimizations**
- **Single Collection Initialization**: ChromaDB collection created once at startup, not per request
- **Promise-based Collection Management**: Reuses the same collection Promise across all operations
- **Efficient API Usage**: Eliminates redundant `getOrCreateCollection` API calls

### **Large Dataset Support**
The application handles large guest lists efficiently:
- **POST-based streaming** - No URL length limitations for large datasets
- **Real-time progress** - Server-Sent Events for live updates
- **Batch processing** - Processes guests in chunks to prevent timeouts
- **Graceful fallback** - Falls back to batch mode if streaming fails

### **Data Authenticity**
The enrichment system prioritizes data integrity:
- **Real data only** - Extracts information exclusively from actual LinkedIn profiles
- **Transparent status reporting** - Clear success/partial/failed status for each profile
- **Source tracking** - Shows exactly where each piece of data came from
- **No fake fallbacks** - Profiles without LinkedIn data or inaccessible profiles are marked as failed
- **Honest results** - Empty fields remain empty rather than being filled with placeholder data

### **AI Technical Rating**
For successfully enriched LinkedIn profiles, the system provides an AI-powered technical skill assessment:
- **1-5 Scale Rating**: From non-technical (1) to expert-level technical (5)
- **Intelligent Analysis**: Evaluates job titles, company types, skills, experience descriptions, and education
- **Detailed Reasoning**: Provides clear explanation for each rating with key technical indicators
- **OpenAI Integration**: Uses GPT-4o with structured output for consistent, reliable assessments
- **Export Ready**: Technical ratings and reasoning included in CSV exports

## Testing

The project includes comprehensive unit tests for the LinkedIn parser:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage
- **86.18%** overall statement coverage
- **80%** overall branch coverage  
- **39 test cases** covering LinkedIn parsing, ChromaDB integration, and edge cases
- **LinkedIn Parser**: 96.62% statement coverage
- **ChromaDB Service**: 71.42% statement coverage (mocked for unit testing)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
