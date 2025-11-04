// app/api/cron/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Document } from 'mongodb';

// Define Company interface
interface Company extends Document {
  _id: any;
  companyMail: string;
  lastSentAt?: string;
  mailSent?: string;
}

if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
  throw new Error('MongoDB environment variables not set');
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

// Calculate next scheduled time (8 AM, 12 PM, 2 PM, 6 PM UTC)
const getNextScheduledTime = () => {
  const now = new Date();
  const schedules = [8, 12, 14, 18]; // 8 AM, 12 PM, 2 PM, 6 PM UTC
  
  for (const hour of schedules) {
    const scheduledTime = new Date();
    scheduledTime.setUTCHours(hour, 0, 0, 0);
    
    if (scheduledTime > now) {
      return scheduledTime.toISOString();
    }
  }
  
  // If no time today, schedule for 8 AM tomorrow
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(8, 0, 0, 0);
  return tomorrow.toISOString();
};

export async function GET(request: NextRequest) {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection<Company>(COLLECTION_NAME);

    // Get total companies with email
    const totalWithEmail = await collection.countDocuments({
      companyMail: { 
        $exists: true, 
        $ne: '' as any,
        $nin: ['', null] as any 
      }
    } as any);

    // Get last cron execution from cron_logs
    const lastExecution = await db.collection('cron_logs')
      .findOne({}, { sort: { executedAt: -1 } });

    // Get today's statistics (emails sent today)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const todaySent = await collection.countDocuments({
      lastSentAt: { $gte: startOfDay.toISOString() },
      mailSent: 'Sent'
    } as any);

    // Get pending emails count
    const pendingEmails = await collection.countDocuments({
      companyMail: { 
        $exists: true, 
        $ne: '' as any,
        $nin: ['', null] as any 
      },
      mailSent: { $ne: 'Sent' }
    } as any);

    return NextResponse.json({
      success: true,
      cronActive: true, // Vercel cron is always active once deployed
      nextScheduledTime: getNextScheduledTime(),
      lastExecution: lastExecution ? {
        executedAt: lastExecution.executedAt,
        sent: lastExecution.sent || 0,
        failed: lastExecution.failed || 0
      } : null,
      stats: {
        totalWithEmail,
        todaySent,
        pendingEmails,
        schedules: ['8:00 AM UTC', '12:00 PM UTC', '2:00 PM UTC', '6:00 PM UTC']
      }
    });
  } catch (error) {
    console.error('Error fetching cron status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch cron status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}