// app/api/send-emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';

// Validate environment variables
if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
  throw new Error('MongoDB environment variables not set');
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  throw new Error('Please define EMAIL_USER and EMAIL_PASSWORD in .env.local');
}

if (!process.env.APPLICANT_NAME) {
  throw new Error('Please define APPLICANT_NAME in .env.local');
}

const MONGODB_URI: string = process.env.MONGODB_URI;
const DB_NAME: string = process.env.DB_NAME;
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'companies';
const APPLICANT_NAME: string = process.env.APPLICANT_NAME;

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

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use app-specific password for Gmail
    },
  });
};

// Generate personalized cover letter
const generateCoverLetter = (companyName: string, jobTitle: string, applicantName: string) => {
  return `Dear Hiring Manager at ${companyName},

I hope this message finds you well.

I am writing to express my keen interest in the ${jobTitle} position at ${companyName}. With 4+ years of experience in developing modern, responsive, and high-performing web applications, I am confident that my technical expertise and creative mindset would make me a valuable addition to your team.

TECHNICAL EXPERTISE
• Frontend Technologies: HTML5, CSS3, JavaScript, TypeScript, React.js (v18), Next.js, D3.js, Three.js
• State Management: Redux, Context API, Zustand, MobX
• Styling Frameworks & UI Libraries: SCSS, Tailwind CSS, Bootstrap, Material UI, Chakra UI, Ant Design
• Development & Collaboration Tools: Git, Visual Studio Code, Figma, Trello, Jira, Webpack, Babel
• Testing Frameworks: Jest, React Testing Library

CORE STRENGTHS
• Responsive Design & Performance Optimization
• React Hooks & Reusable Components
• Cross-Functional Collaboration & Agile Delivery
• Code Quality, CI/CD & Project Management

KEY HIGHLIGHTS
• Built and optimized scalable React-based applications with a focus on performance and UX
• Developed interactive data visualizations using D3.js and 3D components with Three.js
• Integrated RESTful APIs and implemented reusable UI components
• Collaborated with UI/UX designers and backend teams for seamless cross-functional delivery
• Conducted code reviews and implemented CI/CD pipelines for continuous improvement

PROFESSIONAL DETAILS
• Total Experience: 4+ Years
• Experience in ReactJS: 3 Years
• Experience in NextJS: 2 Years
• Experience in TypeScript: 2 Years
• Notice Period: Immediate Joiner
• Current Location: Dubai, UAE
• Visa Status: Visit Visa
• Passport Validity: 2028

I am particularly drawn to ${companyName} because of your innovative approach to technology and commitment to excellence in the industry. I am excited about the opportunity to contribute my skills to your projects and grow alongside your talented team.

I have attached my comprehensive resume for your review. I would be delighted to discuss how my background and expertise align with ${companyName}'s goals. Please let me know a convenient time for a conversation.

Thank you for your time and consideration.

Best regards,
${applicantName}
Software Developer

Contact Information:
📧 Email: mail.vyshnave97@gmail.com
📱 Mobile: +971582421633
💼 LinkedIn: linkedin.com/in/vyshnave
💻 GitHub: github.com/vyshnave1997`;
};

// Generate HTML version of cover letter
const generateHTMLCoverLetter = (companyName: string, jobTitle: string, applicantName: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 750px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2563eb;
          font-size: 26px;
          margin: 0 0 10px 0;
        }
        .header p {
          color: #666;
          margin: 0;
          font-size: 16px;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
          color: #333;
        }
        .content {
          font-size: 15px;
          margin-bottom: 18px;
          line-height: 1.7;
        }
        .section-title {
          color: #2563eb;
          font-size: 16px;
          font-weight: 700;
          margin: 25px 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .highlights {
          background-color: #f0f7ff;
          padding: 20px 25px;
          border-left: 4px solid #2563eb;
          margin: 15px 0;
          border-radius: 4px;
        }
        .highlights ul {
          margin: 5px 0;
          padding-left: 20px;
        }
        .highlights li {
          margin: 8px 0;
          color: #1e40af;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          background-color: #fafafa;
        }
        .details-table td {
          padding: 10px 15px;
          border: 1px solid #e5e7eb;
        }
        .details-table td:first-child {
          font-weight: 600;
          color: #555;
          width: 40%;
          background-color: #f0f7ff;
        }
        .closing {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        .signature {
          font-weight: 700;
          color: #2563eb;
          font-size: 18px;
          margin-bottom: 5px;
        }
        .job-title {
          color: #666;
          font-size: 14px;
          margin-bottom: 15px;
        }
        .contact-info {
          background-color: #f0f7ff;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
        }
        .contact-info div {
          margin: 6px 0;
          font-size: 14px;
          color: #333;
        }
        .contact-info a {
          color: #2563eb;
          text-decoration: none;
        }
        .contact-info a:hover {
          text-decoration: underline;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application for ${jobTitle}</h1>
          <p>${companyName}</p>
        </div>
        
        <div class="greeting">
          Dear Hiring Manager at <strong>${companyName}</strong>,
        </div>
        
        <div class="content">
          <p>I hope this message finds you well.</p>
          <p>
            I am writing to express my keen interest in the <strong>${jobTitle}</strong> position at ${companyName}. 
            With <strong>4+ years of experience</strong> in developing modern, responsive, and high-performing web applications, 
            I am confident that my technical expertise and creative mindset would make me a valuable addition to your team.
          </p>
        </div>
        
        <div class="section-title">💻 Technical Expertise</div>
        <div class="highlights">
          <ul>
            <li><strong>Frontend Technologies:</strong> HTML5, CSS3, JavaScript, TypeScript, React.js (v18), Next.js, D3.js, Three.js</li>
            <li><strong>State Management:</strong> Redux, Context API, Zustand, MobX</li>
            <li><strong>Styling Frameworks & UI Libraries:</strong> SCSS, Tailwind CSS, Bootstrap, Material UI, Chakra UI, Ant Design</li>
            <li><strong>Development & Collaboration Tools:</strong> Git, Visual Studio Code, Figma, Trello, Jira, Webpack, Babel</li>
            <li><strong>Testing Frameworks:</strong> Jest, React Testing Library</li>
          </ul>
        </div>

        <div class="section-title">🎯 Core Strengths</div>
        <div class="highlights">
          <ul>
            <li>Responsive Design & Performance Optimization</li>
            <li>React Hooks & Reusable Components</li>
            <li>Cross-Functional Collaboration & Agile Delivery</li>
            <li>Code Quality, CI/CD & Project Management</li>
          </ul>
        </div>

        <div class="section-title">⭐ Key Highlights</div>
        <div class="highlights">
          <ul>
            <li>Built and optimized scalable React-based applications with a focus on performance and UX</li>
            <li>Developed interactive data visualizations using D3.js and 3D components with Three.js</li>
            <li>Integrated RESTful APIs and implemented reusable UI components</li>
            <li>Collaborated with UI/UX designers and backend teams for seamless cross-functional delivery</li>
            <li>Conducted code reviews and implemented CI/CD pipelines for continuous improvement</li>
          </ul>
        </div>

        <div class="section-title">📋 Professional Details</div>
        <table class="details-table">
          <tr>
            <td>Total Experience</td>
            <td>4+ Years</td>
          </tr>
          <tr>
            <td>Experience in ReactJS</td>
            <td>3 Years</td>
          </tr>
          <tr>
            <td>Experience in NextJS</td>
            <td>2 Years</td>
          </tr>
          <tr>
            <td>Experience in TypeScript</td>
            <td>2 Years</td>
          </tr>
          <tr>
            <td>Notice Period</td>
            <td>Immediate Joiner</td>
          </tr>
          <tr>
            <td>Current Location</td>
            <td>Dubai, UAE</td>
          </tr>
          <tr>
            <td>Visa Status</td>
            <td>Visit Visa</td>
          </tr>
          <tr>
            <td>Passport Validity</td>
            <td>2028</td>
          </tr>
        </table>
        
        <div class="content">
          <p>
            I am particularly drawn to ${companyName} because of your innovative approach to technology and 
            commitment to excellence in the industry. I am excited about the opportunity to contribute my skills 
            to your projects and grow alongside your talented team.
          </p>
          
          <p>
            I have attached my comprehensive resume for your review. I would be delighted to discuss how my 
            background and expertise align with ${companyName}'s goals. Please let me know a convenient time 
            for a conversation.
          </p>
          
          <p>Thank you for your time and consideration.</p>
        </div>
        
        <div class="closing">
          <div class="signature">Best regards,<br>${applicantName}</div>
          <div class="job-title">Software Developer</div>
          
          <div class="contact-info">
            <div><strong>📧 Email:</strong> <a href="mailto:mail.vyshnave97@gmail.com">mail.vyshnave97@gmail.com</a></div>
            <div><strong>📱 Mobile:</strong> <a href="tel:+971582421633">+971 58 242 1633</a></div>
            <div><strong>💼 LinkedIn:</strong> <a href="https://linkedin.com/in/vyshnave" target="_blank">linkedin.com/in/vyshnave</a></div>
            <div><strong>💻 GitHub:</strong> <a href="https://github.com/vyshnave1997" target="_blank">github.com/vyshnave1997</a></div>
          </div>
        </div>
        
        <div class="footer">
          Resume attached • Available for immediate joining • Based in Dubai, UAE
        </div>
      </div>
    </body>
    </html>
  `;
};

// POST: Send emails to companies
export async function POST(request: NextRequest) {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Get companies that have email and haven't been sent mail yet
    const companies = await collection
      .find({
        companyMail: { $exists: true, $ne: null, $nin: ['', null] },
        mailSent: { $ne: 'Sent' }
      })
      .sort({ serialNo: 1 })
      .toArray();

    if (companies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No companies to email',
        sent: 0,
        failed: 0,
        results: []
      });
    }

    const transporter = createTransporter();
    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    for (const company of companies) {
      try {
        // Add delay between emails to avoid rate limiting (2 seconds)
        if (sentCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const coverLetterText = generateCoverLetter(
          company.companyName,
          company.companyDetail,
          APPLICANT_NAME
        );

        const coverLetterHTML = generateHTMLCoverLetter(
          company.companyName,
          company.companyDetail,
          APPLICANT_NAME
        );

        const mailOptions = {
          from: {
            name: `${APPLICANT_NAME} - Software Developer`,
            address: process.env.EMAIL_USER!
          },
          to: company.companyMail,
          subject: `Application for ${company.companyDetail} - ${APPLICANT_NAME} | 4+ Years React/Next.js Experience`,
          text: coverLetterText,
          html: coverLetterHTML,
          attachments: [
            {
              filename: `${APPLICANT_NAME.replace(/\s+/g, '_')}_Resume.pdf`,
              path: 'Vyshnave_K_Resume.pdf'
            }
          ]
        };

        await transporter.sendMail(mailOptions);

        // Update database to mark email as sent
        await collection.updateOne(
          { _id: company._id },
          {
            $set: {
              mailSent: 'Sent',
              mailSentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        );

        sentCount++;
        results.push({
          company: company.companyName,
          email: company.companyMail,
          status: 'sent'
        });

        console.log(`✓ Email sent to ${company.companyName} (${company.companyMail})`);
      } catch (error) {
        failedCount++;
        results.push({
          company: company.companyName,
          email: company.companyMail,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Failed to send email to ${company.companyMail}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Emails sent: ${sentCount}, Failed: ${failedCount}`,
      sent: sentCount,
      failed: failedCount,
      results
    });
  } catch (error) {
    console.error('Error in email sending:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send emails',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET: Check email sending status
export async function GET(request: NextRequest) {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const totalWithEmail = await collection.countDocuments({
      companyMail: { $exists: true, $ne: null, $nin: ['', null] }
    });

    const sentEmails = await collection.countDocuments({
      companyMail: { $exists: true, $ne: null, $nin: ['', null] },
      mailSent: 'Sent'
    });

    const pendingEmails = await collection.countDocuments({
      companyMail: { $exists: true, $ne: null, $nin: ['', null] },
      mailSent: { $ne: 'Sent' }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalWithEmail,
        sentEmails,
        pendingEmails
      }
    });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}