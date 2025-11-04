import { NextRequest, NextResponse } from 'next/server';

const SEARCH_QUERIES = [
  'Frontend Developer',
  'Software Developer',
  'HTML Developer',
  'React Developer',
  'Next.js Developer'
];

interface Job {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string;
  job_city?: string;
  job_country: string;
  job_employment_type?: string;
  job_is_remote: boolean;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_posted_at_timestamp?: number;
  job_publisher?: string;
  job_description?: string;
  job_apply_link: string;
}

// Search jobs from RapidAPI
async function searchJobs(query: string): Promise<Job[]> {
  try {
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    };

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(`${query} in UAE`)}&page=1&num_pages=1`,
      options
    );

    if (!response.ok) {
      console.error(`Failed to fetch jobs for ${query}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching ${query}:`, error);
    return [];
  }
}

// Check if job exists in database
async function checkIfJobExists(jobId: string, companyName: string, jobTitle: string): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/save-job?jobId=${encodeURIComponent(jobId)}&companyName=${encodeURIComponent(companyName)}&jobTitle=${encodeURIComponent(jobTitle)}`
    );
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error checking job existence:', error);
    return false;
  }
}

// Save job to MongoDB
async function saveJobToMongoDB(job: Job): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/save-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: job.job_id,
        companyName: job.employer_name,
        companyDetail: job.job_title,
        companyWebsite: job.job_apply_link,
        companyContact: '',
        companyMail: '',
        companyLocation: job.job_city && job.job_country 
          ? `${job.job_city}, ${job.job_country}` 
          : job.job_country || 'UAE',
        mailSent: 'Not Sent',
        interview: 'No Idea',
        visitedOffice: 'No',
        isFavorite: false,
        id: Date.now().toString(),
        serialNo: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving job:', error);
    return false;
  }
}

// Main cron handler
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🤖 Cron job started at', new Date().toISOString());

  try {
    const allJobs: Job[] = [];
    const seenJobIds = new Set<string>();

    // Fetch jobs from all search queries
    for (const query of SEARCH_QUERIES) {
      console.log(`Fetching ${query}...`);
      const results = await searchJobs(query);
      
      results.forEach(job => {
        if (!seenJobIds.has(job.job_id)) {
          seenJobIds.add(job.job_id);
          allJobs.push(job);
        }
      });
    }

    console.log(`Found ${allJobs.length} unique jobs`);

    // Save jobs to database
    let savedCount = 0;
    let skippedCount = 0;

    for (const job of allJobs) {
      const exists = await checkIfJobExists(job.job_id, job.employer_name, job.job_title);
      
      if (!exists) {
        const success = await saveJobToMongoDB(job);
        if (success) {
          savedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ Cron job completed - Saved: ${savedCount}, Skipped: ${skippedCount}`);

    return NextResponse.json({
      success: true,
      message: 'Jobs refreshed successfully',
      stats: {
        total: allJobs.length,
        saved: savedCount,
        skipped: skippedCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh jobs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// For testing purposes - remove in production
export async function POST(request: NextRequest) {
  return GET(request);
}