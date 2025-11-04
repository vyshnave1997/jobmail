import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Validate and get MongoDB configuration from environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in your .env.local file');
}

if (!process.env.DB_NAME) {
  throw new Error('Please define DB_NAME in your .env.local file');
}

const MONGODB_URI: string = process.env.MONGODB_URI;
const DB_NAME: string = process.env.DB_NAME;
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'companies';

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Connect to MongoDB
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Check if job already exists to prevent duplicates
    const existingJob = await collection.findOne({
      $or: [
        { jobId: body.jobId },
        {
          companyName: body.companyName,
          companyDetail: body.companyDetail
        }
      ]
    });

    if (existingJob) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Job already exists in database',
          duplicate: true
        },
        { status: 409 }
      );
    }

    // Get the highest serialNo to increment
    const lastDocument = await collection
      .find()
      .sort({ serialNo: -1 })
      .limit(1)
      .toArray();

    const newSerialNo = lastDocument.length > 0 ? (lastDocument[0].serialNo || 0) + 1 : 1;

    // Prepare document in your format
    const document = {
      jobId: body.jobId || '', // Store the job_id for duplicate checking
      companyName: body.companyName || '',
      companyDetail: body.companyDetail || '',
      companyWebsite: body.companyWebsite || '',
      companyContact: body.companyContact || '',
      companyMail: body.companyMail || '',
      companyLocation: body.companyLocation || '',
      mailSent: body.mailSent || 'Not Sent',
      interview: body.interview || 'No Idea',
      visitedOffice: body.visitedOffice || 'No',
      isFavorite: body.isFavorite || false,
      id: body.id || Date.now().toString(),
      serialNo: newSerialNo,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: body.updatedAt || new Date().toISOString()
    };

    // Insert document
    const result = await collection.insertOne(document);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Job saved successfully',
        id: result.insertedId,
        serialNo: newSerialNo,
        duplicate: false
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save job',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if job exists (for duplicate checking)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const companyName = searchParams.get('companyName');
    const jobTitle = searchParams.get('jobTitle');

    // If checking for existence
    if (jobId || (companyName && jobTitle)) {
      const client = await connectToDatabase();
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);

      const query: any = {};
      
      if (jobId) {
        query.jobId = jobId;
      } else if (companyName && jobTitle) {
        query.companyName = companyName;
        query.companyDetail = jobTitle;
      }

      const existingJob = await collection.findOne(query);

      return NextResponse.json(
        { 
          exists: !!existingJob,
          job: existingJob ? {
            companyName: existingJob.companyName,
            companyDetail: existingJob.companyDetail,
            serialNo: existingJob.serialNo
          } : null
        },
        { status: 200 }
      );
    }

    // Otherwise, return all jobs
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const jobs = await collection
      .find()
      .sort({ serialNo: -1 })
      .toArray();

    return NextResponse.json(
      { 
        success: true, 
        data: jobs,
        count: jobs.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching from MongoDB:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}