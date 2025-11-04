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
    <div className="min-h-screen bg-gray-50 py-2 sm:py-4 lg:py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg sm:rounded-xl p-3 sm:p-5 lg:p-6 shadow-lg">
          
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="bg-indigo-600 p-2 rounded-lg flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
                  Automated Email Sender
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Cron: 8 AM, 12 PM, 2 PM, 6 PM (GST)
                </p>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-green-100 border-2 border-green-400 rounded-lg">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
              <span className="text-xs sm:text-sm font-semibold text-green-700">Auto-Enabled</span>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-indigo-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600 leading-tight">Total</span>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.totalWithEmail}</p>
              </div>

              <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-green-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600 leading-tight">Sent</span>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{stats.sentEmails}</p>
              </div>

              <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-orange-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-gray-600 leading-tight">Pending</span>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">{stats.pendingEmails}</p>
              </div>
            </div>
          )}

          {/* Cron Status */}
          <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm sm:text-base font-semibold text-gray-900">Cron Status</span>
            </div>
            
            <div className="space-y-1.5 mb-3 sm:mb-4">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-green-600 font-medium leading-relaxed">
                  Active - Running on Vercel
                </p>
              </div>
              {nextScheduledTime && (
                <p className="text-xs sm:text-sm text-gray-600 pl-4">
                  Next: {nextScheduledTime}
                </p>
              )}
              {lastSendTime && (
                <p className="text-xs sm:text-sm text-gray-600 pl-4">
                  Last: {lastSendTime}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </button>
              
              <button
                onClick={sendEmailsNow}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Send All</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-yellow-900 mb-2">
                  ⚠️ No Filtering - Sends to ALL
                </p>
                <div className="space-y-1.5 text-xs sm:text-sm text-yellow-800">
                  <p><strong>Manual/Cron:</strong> Emails ALL companies (including sent)</p>
                  <p><strong>Rate Limit:</strong> 50 emails/run, 3s delay</p>
                  <p><strong>Warning:</strong> Duplicates will be sent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg mb-4 sm:mb-6 ${
              statusMessage.startsWith('✓') 
                ? 'bg-green-50 border-2 border-green-200 text-green-800'
                : 'bg-red-50 border-2 border-red-200 text-red-800'
            }`}>
              <p className="text-xs sm:text-sm font-medium break-words">{statusMessage}</p>
            </div>
          )}

          {/* Send Results */}
          {sendResults.length > 0 && (
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-indigo-100 mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3">
                Recent Results ({sendResults.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sendResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-2.5 sm:p-3 rounded-lg border ${
                      result.status === 'sent'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.status === 'sent' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 break-words">
                            {result.company}
                          </p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${
                            result.status === 'sent'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {result.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 break-all mt-0.5">{result.email}</p>
                        {result.error && (
                          <p className="text-xs text-red-600 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              <strong>How It Works:</strong> Both cron and manual send email ALL companies with valid addresses, 
              regardless of previous sends. Companies may receive duplicates. System updates "mailSent" tag after each send.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}