import React, { useState, useEffect } from 'react';
import { Mail, Clock, Send, CheckCircle, XCircle, Loader2, Calendar, RefreshCw, Zap, AlertCircle } from 'lucide-react';

interface EmailStats {
  totalWithEmail: number;
  sentEmails: number;
  pendingEmails: number;
}

interface EmailResult {
  company: string;
  email: string;
  status: 'sent' | 'failed';
  error?: string;
}

interface SendResponse {
  success: boolean;
  message: string;
  sent: number;
  failed: number;
  results: EmailResult[];
}

export default function AutomatedEmailSender() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSendTime, setLastSendTime] = useState<string | null>(null);
  const [nextScheduledTime, setNextScheduledTime] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<EmailResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Fetch email stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/send-emails');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Send emails manually (sends to ALL companies including already sent)
  const sendEmailsNow = async () => {
    setLoading(true);
    setStatusMessage('Sending emails to ALL companies...');
    setSendResults([]);
    
    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manual: true })
      });
      const data: SendResponse = await response.json();
      
      if (data.success) {
        setSendResults(data.results);
        setStatusMessage(`✓ ${data.sent} emails sent successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`);
        setLastSendTime(new Date().toLocaleString());
        await fetchStats();
      } else {
        setStatusMessage(`✗ Failed: ${data.message}`);
      }
    } catch (error) {
      setStatusMessage('✗ Error sending emails');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate next scheduled time (8 AM, 12 PM, 2 PM, 6 PM)
  const getNextScheduledTime = () => {
    const now = new Date();
    const schedules = [8, 12, 14, 18]; // 8 AM, 12 PM, 2 PM, 6 PM
    
    for (const hour of schedules) {
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, 0, 0, 0);
      
      if (scheduledTime > now) {
        return scheduledTime.toLocaleString();
      }
    }
    
    // If no time today, schedule for 8 AM tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toLocaleString();
  };

  // Update next scheduled time
  useEffect(() => {
    setNextScheduledTime(getNextScheduledTime());
    
    const interval = setInterval(() => {
      setNextScheduledTime(getNextScheduledTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const statsInterval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(statsInterval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 sm:p-3 rounded-lg">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Automated Email Sender
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Vercel Cron: 8 AM, 12 PM, 2 PM, 6 PM daily (GST/Dubai time)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-100 border-2 border-green-400 rounded-lg">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            <span className="text-xs sm:text-sm font-semibold text-green-700">Auto-Enabled</span>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-600">Total with Email</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalWithEmail}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-600">Emails Sent</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.sentEmails}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-600">Pending</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.pendingEmails}</p>
            </div>
          </div>
        )}

        {/* Cron Status */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-indigo-100">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="w-full lg:w-auto">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <span className="text-sm sm:text-base font-semibold text-gray-900">Vercel Cron Status</span>
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="text-green-600 font-medium">● Active - Running on Vercel infrastructure</p>
                {nextScheduledTime && (
                  <p className="text-gray-600">Next scheduled run: {nextScheduledTime}</p>
                )}
                {lastSendTime && (
                  <p className="text-gray-600">Last manual send: {lastSendTime}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={sendEmailsNow}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Now (All)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 sm:p-4 mb-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-yellow-900 mb-1">Important: No Filtering</p>
              <ul className="text-xs sm:text-sm text-yellow-800 space-y-1">
                <li><strong>Manual Send:</strong> Sends to ALL companies with email addresses, including those already sent</li>
                <li><strong>Cron Job:</strong> Sends to ALL companies with email addresses, including those already sent</li>
                <li><strong>Rate Limiting:</strong> Maximum 50 emails per run with 3-second delay between sends</li>
                <li><strong>⚠️ Warning:</strong> Companies will receive duplicate emails if sent multiple times</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`p-3 sm:p-4 rounded-lg mb-6 ${
            statusMessage.startsWith('✓') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-xs sm:text-sm font-medium break-words">{statusMessage}</p>
          </div>
        )}

        {/* Send Results */}
        {sendResults.length > 0 && (
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-indigo-100">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4">Recent Send Results</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sendResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 rounded gap-2 ${
                    result.status === 'sent'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {result.status === 'sent' ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{result.company}</p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{result.email}</p>
                      {result.error && (
                        <p className="text-xs text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${
                    result.status === 'sent'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {result.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-blue-800">
            <strong>How It Works:</strong> Both the cron job and manual send will email ALL companies with valid 
            email addresses, regardless of whether they've been sent before. This means companies may receive 
            multiple emails. The system updates the "mailSent" tag and timestamp after each send.
          </p>
        </div>
      </div>
    </div>
  );
}
