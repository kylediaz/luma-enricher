# Design

This is a NextJS website tool that lets users upload a CSV of guests for a Luma event, get information about the guest
using their information, and displays the results.

## Website Design

When the user loads the page, there should be a simple area where users can drag/drop or click to select a CSV.

After uploading the CSV, it will send the CSV to the backend to process. The backend will stream enriched guest profiles
to the frontend.

The website is split into two halves. The left half has a phone-shaped "tinder" UI that shows a single profile. The user
can press "approve" or "deny", or swipe in order to mark a guest as accepted or denied. The right half shows a table view
of all guests. The list is filtered so accepted users are at the top, and denied users are at the bottom and grayed out.

The UI has a very clean aesthetic, with `rounded-xs` corners and no shadows.

The preferred frontend stack is tailwind-css and motion.

## Luma CSV

These are the columns of the Luma guest list CSV

```csv
api_id,name,first_name,last_name,email,phone_number,created_at,approval_status,custom_source,checked_in_at,qr_code_url,amount,amount_tax,amount_discount,currency,coupon_code,eth_address,solana_address,survey_response_rating,survey_response_feedback,ticket_type_id,ticket_name
gst-Qlwi4e4mqdtWDvN,Full Name,First,Last,email@gmail.com,,2025-08-08T00:16:45.813Z,declined,,,https://lu.ma/check-in/evt-NKXctR3fMVfX24o?pk=g-2U61lr65dtD1YXI,,,,,,,,,,,
```

This CSV can be very large, with thousands of rows.

The guest schema should look like this:

```typescript
{
    api_id: string,
    name: string,
    first_name: string,
    last_name: string,
    email: string,
    linkedin_url: string?
}
```

There may be additional columns that are the answers to a form they may have filled in
when registering for the event. On the website, the user should be able to optionally specify the name of a "linkedin"
column. The linkedin field should be null for all guests if there is no linkedin column in the csv, or if
the user did not fill out this field in the form (left blank).

If the linkedin value is not a url (for example, just `kylediaz`), turn it into a full linkedin url.
If it's a bad value (for example, "N/A", "no", "", "none", "null"), make it null.

## Enrichment Algorithm

The APIs used for enrichment are easily batched. Please use the batch APIs rather than processing them
one at a time for maximal efficiency.

### 1. Get Person Profile

Check to see if their enriched person profile already exists by searching in the Chroma collection "enriched-profiles".
The ids in the Chroma collection are "api_id". If it's not cached, then proceed with enrichment.

If `linkedin` is provided, use Exa in order to get the contents of the linkedin profile page. Extract information from the text response.

If `linkedin` is not provided or you could not get the result from Exa, use the People Data Labs API to get their information.

This is what an enriched person profile should look like:

```typescript
{
    api_id: string,
    name: string,
    email: string,
    bio: string?, // "Position" in Exa, none for PDL
    location: string?, // "Location in Exa", "location_name" OR experience[0]?.location?.name in PDL
    linkedin_url: string?,
    twitter_url: string?, // "twitter_url" in PDL

    job_title: string?, // "job_title" OR experience[0]?.title?.name
    company: string?, // "job_company_name" OR experience[0]?.company?.name

    company_website: string?, // "job_company_website" OR experience[0]?.website in PDL OR get it from their email
    job_company_twitter_url: string? // job_company_twitter_url OR experience[0]?.twitter_url in PDL
    education: string?,
}
```

If you can't get their company_website from PDL, assume it from their email domain.
Do not sure their email domain if it's generic (gmail, outlook, live, etc)

Upsert the results (in batches) to the Chroma collection so it can be reused later. The ID is api_id and the document should be
the full JSON. The metadata is "updated_at": current UNIX timestamp as a number.

### 2. Get Company Website

Using "company_website" from the person profile, get the contents of the website at "/" and "/about".
Use OpenAI to create a 20-word summary of the company using the contents of their website.

## Exa.ai

Sample code:

```typescript
import Exa from "exa-js";

const exa = new Exa(process.env.EXASEARCH_API_KEY);

const result = await exa.getContents(
  ["https://linkedin.com/in/kylediaz","https://linkedin.com/in/notreal-joasijd"],
  {
    text: true
  }
);
```

result:

```json
{
  "data": {
    "requestId": "8385123f14447dafb9f9da5c0f48c545",
    "results": [
      {
        "id": "https://linkedin.com/in/kylediaz",
        "title": "Kyle Diaz  - SWE Intern @ Datadog | Linkedin",
        "url": "https://linkedin.com/in/kylediaz",
        "publishedDate": "2025-01-28T00:00:00.000Z",
        "author": "Kyle Diaz",
        "text": "Kyle Diaz\nPosition: SWE Intern @ Datadog\nLocation: New York City Metropolitan Area, United States\nNumber of connections: 453 connections\nBio: None\nCurrent Job Info:\nemployer: Datadog\ntype: Software Engineer Intern\nsocial_url: https://www.linkedin.com/company/datadog/\nExperiences:\nSoftware Engineer Intern at Datadog from May 2024 to Present. Location: New York, NY, US.\nSoftware Engineer Intern at Datadog from May 2023 to Aug 2023. Location: New York, NY, US. Description: Developed an SQL query engine designed to retrieve and manipulate data from cloud storage\nSoftware Engineer Intern at Meta from May 2022 to Aug 2022. Location: Menlo Park, CA, US. Description: Product engineering for Facebook and Instagram apps.\nFBU Software Engineer Intern at Facebook from Jun 2021 to Aug 2021. Description: Designed and built an Android news app that uses machine learning to identify and connect related news articles throughout the internet\nScientific Computing Intern at Particle In Cell Consulting LLC from Nov 2020 to Jun 2021. Location: Westlake Village, CA, US. Description: Supported development of plasma and gas simulators used for spacecraft research and verification.\nEducation:\nInstitution: University of Colorado Boulder. Degree: ['Master of Science - MS', 'Computer Science'] Duration: None.\nInstitution: Half Hollow Hills High School East. Degree: ['High School Diploma'] Duration: None.\nWebsites:\n{'title': 'BLOG', 'url': 'kylediaz.com'}\nPublications:\n{'title': 'New Electric Propulsion Simulation Framework for the Arduino Microcontrollers', 'published': 'Dec 29, 2021 AIAA SCITECH 2022 Forum', 'summary': None, 'url': 'https://arc.aiaa.org/doi/pdf/10.2514/6.2022-1356'}"
      }
    ],
    "statuses": [
      {
        "id": "https://linkedin.com/in/notreal-joasijd",
        "status": "error",
        "error": {
          "httpStatusCode": 403,
          "tag": "SOURCE_NOT_AVAILABLE"
        }
      },
      {
        "id": "https://linkedin.com/in/kylediaz",
        "status": "success",
        "source": "cached"
      }
    ],
    "costDollars": {
      "total": 0.001,
      "contents": {
        "text": 0.001
      }
    },
    "searchTime": 20.504861999303102
  }
}
```

## People Data Labs

Sample code:

```typescript
import PDLJS from 'peopledatalabs';

import fs from 'fs';

// Create a client, specifying your API key
const PDLJSClient = new PDLJS({ apiKey: process.env.PDL_API_KEY });

// Create a parameters JSON object
const params = {
  first_name: "Kyle",
  last_name: "Diaz",
  name: "Kyle Diaz",
  email: "kyle@trychroma.com",
  profile: "https://linkedin.com/in/kylediaz"
}

// Pass the parameters object to the Person Enrichment API
PDLJSClient.person.enrichment(params).then((data) => {
    var record = data.data
    
    // Print selected fields
    console.log(
        record["work_email"],
        record["full_name"],
        record["job_title"],
        record["job_company_name"],
    )
        
    console.log("Successfully enriched profile with PDL data.")
}).catch((error) => {
    console.log("Enrichment unsuccessful. See error and try again.")
    console.log(error);
});
```

## OpenAI

```typescript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-5",
  input: "Write a short bedtime story about a unicorn.",
});

console.log(response.output_text);
```

## Chroma

```typescript
import { CloudClient } from "chromadb";

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE
});
```