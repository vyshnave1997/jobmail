// app/api/reset-emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Validate environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

if (!process.env.DB_NAME) {
  throw new Error('DB_NAME environment variable is not set');
}

const MONGODB_URI: string = process.env.MONGODB_URI;
const DB_NAME: string = process.env.DB_NAME;
const COLLECTION_NAME: string = process.env.MONGODB_COLLECTION || 'companies';

// Cache MongoDB client for serverless optimization
let cachedClient: MongoClient | null = null;

async function connectToDatabase(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }
  
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    cachedClient = client;
    console.log('✓ Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    throw error;
  }
}

// POST: Reset all sent emails to "Not Sent"
export async function POST(request: NextRequest) {
  console.log('🔄 Reset emails request received');
  
  try {
    // Connect to database
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Find all companies with mailSent = "Sent"
    const sentCompanies = await collection.countDocuments({
      mailSent: 'Sent'
    });

    console.log(`📊 Found ${sentCompanies} sent emails to reset`);

    if (sentCompanies === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sent emails to reset',
        resetCount: 0
      });
    }

    // Reset all sent emails
    const result = await collection.updateMany(
      { mailSent: 'Sent' },
      {
        $set: {
          mailSent: 'Not Sent',
          updatedAt: new Date().toISOString()
        },
        $unset: {
          mailSentAt: ""
        }
      }
    );

    console.log(`✅ Successfully reset ${result.modifiedCount} emails`);

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${result.modifiedCount} emails`,
      resetCount: result.modifiedCount
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error('❌ Error resetting emails:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to reset emails',
        error: error instanceof Error ? error.message : 'Unknown error',
        resetCount: 0
      },
      { status: 500 }
    );
  }
}

// GET: Check how many emails are marked as sent
export async function GET(request: NextRequest) {
  console.log('📊 Get sent count request received');
  
  try {
    // Connect to database
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Count sent emails
    const sentCount = await collection.countDocuments({
      mailSent: 'Sent'
    });

    // Count not sent emails
    const notSentCount = await collection.countDocuments({
      $or: [
        { mailSent: 'Not Sent' },
        { mailSent: { $exists: false } }
      ]
    });

    // Count total emails (with valid email addresses)
    const totalCount = await collection.countDocuments({
      email: { 
        $exists: true, 
        $nin: [null, ''] 
      }
    });

    console.log(`📊 Stats - Total: ${totalCount}, Sent: ${sentCount}, Not Sent: ${notSentCount}`);

    return NextResponse.json({
      success: true,
      sentCount,
      notSentCount,
      totalCount
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sent count:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch sent count',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS: Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}