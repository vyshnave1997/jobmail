import React, { useState, useEffect } from 'react';
import { Mail, Clock, Send, CheckCircle, XCircle, Loader2, Play, Pause, Calendar, RefreshCw } from 'lucide-react';

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
  const [cronEnabled, setCronEnabled] = useState(false);
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

  // Send emails manually
  const sendEmailsNow = async () => {
    setLoading(true);
    setStatusMessage('Sending emails...');
    setSendResults([]);
    
    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
      });
      const data: SendResponse = await response.json();
      
      if (data.success) {
        setSendResults(data.results);
        setStatusMessage(`✓ ${data.sent} emails sent successfully, ${data.failed} failed`);
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

  // Check if current time is within sending window and is a scheduled time
  const shouldSendEmail = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Only send at specific times: 8 AM, 12 PM, 2 PM, 6 PM
    const scheduledHours = [8, 12, 14, 18];
    
    // Check if it's within 1 minute of scheduled time
    return scheduledHours.includes(hour) && minute < 1;
  };

  // Auto-send emails based on cron schedule
  useEffect(() => {
    if (!cronEnabled) return;

    const interval = setInterval(() => {
      if (shouldSendEmail()) {
        sendEmailsNow();
      }
      setNextScheduledTime(getNextScheduledTime());
    }, 60000); // Check every minute

    setNextScheduledTime(getNextScheduledTime());

    return () => clearInterval(interval);
  }, [cronEnabled]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Automated Email Sender
              </h2>
              <p className="text-sm text-gray-600">
                Schedule: 8 AM, 12 PM, 2 PM, 6 PM daily
              </p>
            </div>
          </div>

          <button
            onClick={() => setCronEnabled(!cronEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              cronEnabled
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {cronEnabled ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Automation
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Automation
              </>
            )}
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Companies with Email</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalWithEmail}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Emails Sent</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.sentEmails}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Pending</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingEmails}</p>
            </div>
          </div>
        )}

        {/* Cron Status */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-gray-900">Automation Status</span>
              </div>
              <div className="space-y-1 text-sm">
                {cronEnabled ? (
                  <>
                    <p className="text-green-600 font-medium">● Active - Monitoring schedule</p>
                    {nextScheduledTime && (
                      <p className="text-gray-600">Next scheduled: {nextScheduledTime}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">○ Inactive - Click "Start Automation" to enable</p>
                )}
                {lastSendTime && (
                  <p className="text-gray-600">Last sent: {lastSendTime}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={sendEmailsNow}
                disabled={loading || stats?.pendingEmails === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`p-4 rounded-lg mb-6 ${
            statusMessage.startsWith('✓') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{statusMessage}</p>
          </div>
        )}

        {/* Send Results */}
        {sendResults.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h3 className="font-bold text-gray-900 mb-4">Recent Send Results</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sendResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded ${
                    result.status === 'sent'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'sent' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{result.company}</p>
                      <p className="text-sm text-gray-600">{result.email}</p>
                      {result.error && (
                        <p className="text-xs text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
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
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> When automation is enabled, emails will be sent automatically at 8 AM, 12 PM, 2 PM, and 6 PM daily. 
            You can also send emails manually at any time using the "Send Now" button.
          </p>
        </div>
      </div>
    </div>
  );
}