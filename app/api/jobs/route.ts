import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, num_pages = 1 } = body;

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=${num_pages}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from JSearch API');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
