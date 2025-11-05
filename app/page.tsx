'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Clock, ExternalLink, Building2, Loader2, AlertCircle, Star, CheckCircle, Mail, Phone, Globe, RefreshCw, ChevronDown, ChevronUp, Zap, Calendar, Send, RotateCcw } from 'lucide-react';

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

interface DatabaseJob {
  jobId: string;
  companyName: string;
  companyDetail: string;
  companyMail: string;
  companyContact: string;
  companyWebsite: string;
  companyLocation: string;
  mailSent: string;
  interview: string;
  visitedOffice: string;
  serialNo: number;
}

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

interface ResetResponse {
  success: boolean;
  message: string;
  resetCount: number;
}

const SEARCH_QUERIES = [
  'Frontend Developer',
  'Software Developer',
  'HTML Developer',
  'React Developer',
  'Next.js Developer'
];

export default function UAEJobFinder() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [savingJobs, setSavingJobs] = useState<Set<string>>(new Set());
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [jobsWithEmails, setJobsWithEmails] = useState<DatabaseJob[]>([]);
  const [loadingEmails, setLoadingEmails] = useState<boolean>(false);
  const [nextScheduledRun, setNextScheduledRun] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [isEmailSectionOpen, setIsEmailSectionOpen] = useState<boolean>(true);
  
  // Email sender states
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastSendTime, setLastSendTime] = useState<string | null>(null);
  const [nextScheduledEmail, setNextScheduledEmail] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<EmailResult[]>([]);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const searchJobs = async (query: string): Promise<Job[]> => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${query} in UAE`,
          page: 1
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || 'Failed to fetch jobs');
      }

      return data.data || [];
    } catch (err: any) {
      console.error(`Error fetching ${query}:`, err);
      return [];
    }
  };

  const checkIfJobExists = async (jobId: string, companyName: string, jobTitle: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/save-job?jobId=${encodeURIComponent(jobId)}&companyName=${encodeURIComponent(companyName)}&jobTitle=${encodeURIComponent(jobTitle)}`);
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking job existence:', error);
      return false;
    }
  };

  const saveJobToMongoDB = async (job: Job): Promise<boolean> => {
    try {
      const response = await fetch('/api/save-job', {
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
  };

  const fetchJobsWithEmails = async (): Promise<void> => {
    setLoadingEmails(true);
    try {
      const response = await fetch('/api/save-job');
      const data = await response.json();
      
      if (data.success && data.data) {
        const jobsWithEmail = data.data.filter((job: DatabaseJob) => 
          job.companyMail && job.companyMail.trim() !== ''
        );
        setJobsWithEmails(jobsWithEmail);
      }
    } catch (error) {
      console.error('Error fetching jobs with emails:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  const fetchEmailStats = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/send-emails?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setEmailStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
    }
  };

  const sendEmailsNow = async () => {
    setSendingEmails(true);
    setEmailStatusMessage('Sending emails to ALL companies...');
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
        setEmailStatusMessage(`✓ ${data.sent} emails sent successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`);
        setLastSendTime(new Date().toLocaleString());
        setTimeout(async () => {
          await fetchEmailStats();
        }, 1000);
      } else {
        setEmailStatusMessage(`✗ Failed: ${data.message}`);
      }
    } catch (error) {
      setEmailStatusMessage('✗ Error sending emails');
      console.error('Error:', error);
    } finally {
      setSendingEmails(false);
    }
  };

  const resetSentEmails = async () => {
    setResetting(true);
    setEmailStatusMessage('Resetting all sent emails...');
    
    try {
      const response = await fetch('/api/reset-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ResetResponse = await response.json();
      
      if (data.success) {
        setEmailStatusMessage(`✓ ${data.message}`);
        setSendResults([]);
        
        // Immediately update stats optimistically
        if (emailStats) {
          setEmailStats({
            totalWithEmail: emailStats.totalWithEmail,
            sentEmails: 0,
            pendingEmails: emailStats.totalWithEmail
          });
        }
        
        // Then fetch actual stats to confirm
        await fetchEmailStats();
      } else {
        setEmailStatusMessage(`✗ Failed to reset: ${data.message}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setEmailStatusMessage('✗ Error resetting emails: ' + errorMsg);
      console.error('Error:', error);
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  const getNextScheduledEmailTime = () => {
    const now = new Date();
    const schedules = [8, 12, 14, 18]; // 8 AM, 12 PM, 2 PM, 6 PM
    
    for (const hour of schedules) {
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, 0, 0, 0);
      
      if (scheduledTime > now) {
        return scheduledTime.toLocaleString();
      }
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toLocaleString();
  };

  const autoSaveJobs = async (jobsList: Job[]): Promise<void> => {
    setAutoSaveStatus('Checking for duplicates...');
    let savedCount = 0;
    let skippedCount = 0;
    const newSavedJobs = new Set(savedJobs);

    for (const job of jobsList) {
      setSavingJobs(prev => new Set(prev).add(job.job_id));
      
      const exists = await checkIfJobExists(job.job_id, job.employer_name, job.job_title);
      
      if (!exists) {
        const success = await saveJobToMongoDB(job);
        if (success) {
          savedCount++;
          newSavedJobs.add(job.job_id);
        }
      } else {
        skippedCount++;
        newSavedJobs.add(job.job_id);
      }
      
      setSavingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.job_id);
        return newSet;
      });
    }

    setSavedJobs(newSavedJobs);
    
    if (savedCount > 0 || skippedCount > 0) {
      setAutoSaveStatus(`✓ ${savedCount} new jobs saved, ${skippedCount} already in database`);
    }
    
    setTimeout(() => setAutoSaveStatus(''), 5000);
  };

  const searchAllJobs = async (isScheduled: boolean = false) => {
    setLoading(true);
    setError(null);
    const allJobs: Job[] = [];
    const seenJobIds = new Set<string>();

    if (isScheduled) {
      console.log('🤖 Scheduled job refresh started at', new Date().toLocaleTimeString());
    }

    for (let i = 0; i < SEARCH_QUERIES.length; i++) {
      setLoadingProgress(`Loading ${SEARCH_QUERIES[i]} (${i + 1}/${SEARCH_QUERIES.length})...`);
      const results = await searchJobs(SEARCH_QUERIES[i]);
      
      results.forEach(job => {
        if (!seenJobIds.has(job.job_id)) {
          seenJobIds.add(job.job_id);
          allJobs.push(job);
        }
      });
    }

    if (allJobs.length > 0) {
      setJobs(allJobs);
      setLoadingProgress('Saving jobs to database...');
      await autoSaveJobs(allJobs);
      setLastRefresh(new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
    } else {
      setError('No jobs found. Please check your API configuration and try again.');
    }

    setLoading(false);
    setLoadingProgress('');
    
    await fetchJobsWithEmails();

    if (isScheduled) {
      console.log('✅ Scheduled job refresh completed');
    }
  };

  const getNextScheduledTime = (): string => {
    const now = new Date();
    const scheduledHours = [8, 10, 12];
    
    for (const hour of scheduledHours) {
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hour, 0, 0, 0);
      
      if (scheduledTime > now) {
        return scheduledTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      }
    }
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return `Tomorrow at ${tomorrow.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })}`;
  };

  const checkAndRunScheduledJob = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if ((currentHour === 8 || currentHour === 10 || currentHour === 12) && currentMinute === 0) {
      console.log(`🕐 Scheduled job running at ${currentHour}:00`);
      searchAllJobs(true);
    }
    
    setNextScheduledRun(getNextScheduledTime());
  };

  const manualRefresh = () => {
    searchAllJobs(false);
  };

  useEffect(() => {
    searchAllJobs(false);
    setNextScheduledRun(getNextScheduledTime());
    setNextScheduledEmail(getNextScheduledEmailTime());
    fetchEmailStats();
    
    const jobInterval = setInterval(() => {
      checkAndRunScheduledJob();
    }, 60000);

    const emailInterval = setInterval(() => {
      setNextScheduledEmail(getNextScheduledEmailTime());
    }, 60000);

    const statsInterval = setInterval(() => {
      fetchEmailStats();
    }, 30000);
    
    return () => {
      clearInterval(jobInterval);
      clearInterval(emailInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const formatSalary = (job: Job): string => {
    if (job.job_min_salary && job.job_max_salary) {
      const currency = job.job_salary_currency || 'AED';
      return `${currency} ${Number(job.job_min_salary).toLocaleString()} - ${Number(job.job_max_salary).toLocaleString()}`;
    } else if (job.job_min_salary) {
      const currency = job.job_salary_currency || 'AED';
      return `${currency} ${Number(job.job_min_salary).toLocaleString()}+`;
    }
    return 'Salary not specified';
  };

  const getTimeSince = (timestamp?: number): string => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  VIKI THE JOB HUNTER
                </h1>
                <p className="text-xs text-gray-500">Auto-save • All Developer Roles</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>UAE</span>
              </div>
              {nextScheduledRun && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Clock className="w-3 h-3" />
                  <span>Next: {nextScheduledRun}</span>
                </div>
              )}
              {lastRefresh && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <RefreshCw className="w-3 h-3" />
                  <span>Last: {lastRefresh}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {autoSaveStatus && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-green-800">{autoSaveStatus}</p>
          </div>
        )}

        {!loadingEmails && jobsWithEmails.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => setIsEmailSectionOpen(!isEmailSectionOpen)}
                className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-emerald-50/50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-emerald-600 p-1.5 sm:p-2 rounded-lg">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900">
                      Automated Email Sender
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {jobsWithEmails.length} companies with email
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEmailSectionOpen ? (
                    <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  )}
                </div>
              </button>

              {isEmailSectionOpen && (
                <div className="p-4 sm:p-6 pt-0 border-t border-emerald-200">
                  {/* Embedded Email Sender */}
                  <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-gray-900">Email Automation</span>
                      <div className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-green-100 border border-green-400 rounded text-xs font-semibold text-green-700">
                        <Zap className="w-3 h-3" />
                        Active
                      </div>
                    </div>

                    {emailStats && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-blue-50 rounded p-2 text-center">
                          <div className="text-xs text-gray-600 mb-1">Total</div>
                          <div className="text-lg font-bold text-blue-600">{emailStats.totalWithEmail}</div>
                        </div>
                        <div className="bg-green-50 rounded p-2 text-center">
                          <div className="text-xs text-gray-600 mb-1">Sent</div>
                          <div className="text-lg font-bold text-green-600">{emailStats.sentEmails}</div>
                        </div>
                        <div className="bg-orange-50 rounded p-2 text-center">
                          <div className="text-xs text-gray-600 mb-1">Pending</div>
                          <div className="text-lg font-bold text-orange-600">{emailStats.pendingEmails}</div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Cron: 8 AM, 12 PM, 2 PM, 6 PM (GST)</span>
                      </div>
                      {nextScheduledEmail && (
                        <p className="pl-4">Next run: {nextScheduledEmail}</p>
                      )}
                      {lastSendTime && (
                        <p className="pl-4">Last sent: {lastSendTime}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={fetchEmailStats}
                          disabled={sendingEmails || resetting}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-medium rounded transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${sendingEmails ? 'animate-spin' : ''}`} />
                          Refresh Stats
                        </button>
                        <button
                          onClick={sendEmailsNow}
                          disabled={sendingEmails || resetting}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-medium rounded transition-colors"
                        >
                          {sendingEmails ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              Send All
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => setShowResetConfirm(true)}
                        disabled={sendingEmails || resetting || (emailStats?.sentEmails || 0) === 0}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-xs font-medium rounded transition-colors"
                      >
                        {resetting ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            Reset All Sent Emails
                          </>
                        )}
                      </button>
                    </div>

                    {emailStatusMessage && (
                      <div className={`mt-3 p-2 rounded text-xs ${
                        emailStatusMessage.startsWith('✓') 
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : 'bg-red-50 border border-red-200 text-red-800'
                      }`}>
                        {emailStatusMessage}
                      </div>
                    )}

                    {sendResults.length > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
                        {sendResults.slice(0, 5).map((result, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded text-xs ${
                              result.status === 'sent'
                                ? 'bg-green-50 text-green-800'
                                : 'bg-red-50 text-red-800'
                            }`}
                          >
                            <div className="font-medium">{result.company}</div>
                            <div className="text-xs opacity-75">{result.email}</div>
                          </div>
                        ))}
                        {sendResults.length > 5 && (
                          <div className="text-xs text-gray-500 text-center pt-1">
                            +{sendResults.length - 5} more results
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reset Confirmation Modal */}
                  {showResetConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full shadow-xl">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Reset All Sent Emails?</h3>
                            <p className="text-sm text-gray-600">
                              This will mark all {emailStats?.sentEmails || 0} sent emails as "Not Sent". 
                              They will be included in the next email batch.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setShowResetConfirm(false)}
                            disabled={resetting}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 text-sm font-medium rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={resetSentEmails}
                            disabled={resetting}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            {resetting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Resetting...
                              </>
                            ) : (
                              'Yes, Reset All'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Jobs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-96 overflow-y-auto">
                    {jobsWithEmails.map((job) => (
                      <div
                        key={job.serialNo}
                        className="bg-white rounded-lg p-3 sm:p-4 border border-emerald-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-1 truncate">
                              {job.companyName}
                            </h3>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {job.companyDetail}
                            </p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                            #{job.serialNo}
                          </span>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                          {job.companyMail && (
                            <a
                              href={`mailto:${job.companyMail}`}
                              className="flex items-center gap-2 text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 group"
                            >
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate group-hover:underline">{job.companyMail}</span>
                            </a>
                          )}
                          
                          {job.companyContact && (
                            <a
                              href={`tel:${job.companyContact}`}
                              className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700"
                            >
                              <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{job.companyContact}</span>
                            </a>
                          )}
                          
                          {job.companyWebsite && (
                            <a
                              href={job.companyWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs sm:text-sm text-purple-600 hover:text-purple-700"
                            >
                              <Globe className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">Website</span>
                            </a>
                          )}

                          {job.companyLocation && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{job.companyLocation}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 sm:gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${
                            job.mailSent === 'Sent' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            Mail: {job.mailSent}
                          </span>
                          <span className={`px-2 py-1 rounded ${
                            job.interview === 'Scheduled' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            Interview: {job.interview}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm sm:text-base text-gray-700">
                  Found <span className="font-bold text-blue-600 text-lg sm:text-xl">{jobs.length}</span> developer jobs in UAE
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Auto-refreshes at 8:00 AM, 10:00 AM & 12:00 PM
                </p>
              </div>
              <button
                onClick={manualRefresh}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm transition-colors"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Now</span>
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col justify-center items-center py-12 sm:py-20">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-sm sm:text-base text-gray-600 font-medium mb-2">Loading all developer jobs...</p>
            {loadingProgress && (
              <p className="text-xs sm:text-sm text-gray-500">{loadingProgress}</p>
            )}
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1 text-sm sm:text-base text-red-800">Error Loading Jobs</p>
                <p className="text-xs sm:text-sm text-red-700 mb-3">{error}</p>
                <button
                  onClick={() => searchAllJobs(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {jobs.map((job) => (
              <div
                key={job.job_id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-4 sm:p-6 border border-gray-100 relative"
              >
                {savedJobs.has(job.job_id) && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <div className="bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span className="hidden sm:inline">Saved</span>
                    </div>
                  </div>
                )}
                
                {savingJobs.has(job.job_id) && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <div className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4 pr-16 sm:pr-20">
                  {job.employer_logo ? (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img 
                        src={job.employer_logo} 
                        alt={job.employer_name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = '<div class="w-5 h-5 sm:w-6 sm:h-6 text-gray-400"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                      {job.job_title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-gray-700 font-medium truncate">
                        {job.employer_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  {job.job_employment_type && (
                    <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {job.job_employment_type}
                    </span>
                  )}
                  {job.job_is_remote && (
                    <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Remote
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">
                      {job.job_city && job.job_country 
                        ? `${job.job_city}, ${job.job_country}` 
                        : job.job_country || 'UAE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{formatSalary(job)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>Posted {getTimeSince(job.job_posted_at_timestamp)}</span>
                  </div>
                  {job.job_publisher && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">via {job.job_publisher}</span>
                    </div>
                  )}
                </div>

                {job.job_description && (
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3">
                    {job.job_description}
                  </p>
                )}

                <button
                  onClick={() => window.open(job.job_apply_link, '_blank')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 sm:py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  View Job Details
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8 sm:mt-12 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs sm:text-sm text-gray-600">
          <p>UAE Developer Jobs • Auto-refreshes 8AM, 10AM, 12PM • Powered by JSearch API</p>
        </div>
      </footer>
    </div>
  );
}
