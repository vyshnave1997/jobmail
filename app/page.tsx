'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Clock, ExternalLink, Building2, Loader2, AlertCircle, Star, CheckCircle, Mail, Phone, Globe } from 'lucide-react';
import AutomatedEmailSender from '@/components/emailSender';

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

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      return data.data || [];
    } catch (err) {
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
        // Filter jobs that have company email
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

  const searchAllJobs = async () => {
    setLoading(true);
    setError(null);
    const allJobs: Job[] = [];
    const seenJobIds = new Set<string>();

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
    } else {
      setError('No jobs found. Please try again later.');
    }

    setLoading(false);
    setLoadingProgress('');
    
    // Fetch jobs with emails after saving
    await fetchJobsWithEmails();
  };

  useEffect(() => {
    searchAllJobs();
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  UAE Developer Jobs
                </h1>
                <p className="text-xs text-gray-500">Auto-save to MongoDB • All Developer Roles</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>United Arab Emirates</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {autoSaveStatus && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">{autoSaveStatus}</p>
          </div>
        )}

        {/* Jobs with Company Email Section */}
        {!loadingEmails && jobsWithEmails.length > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-600 p-2 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Companies with Email Contacts
                  </h2>
                  <p className="text-sm text-gray-600">
                    {jobsWithEmails.length} companies have contact information available
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {jobsWithEmails.map((job) => (
                  <div
                    key={job.serialNo}
                    className="bg-white rounded-lg p-4 border border-emerald-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-sm mb-1">
                          {job.companyName}
                        </h3>
                        <p className="text-xs text-gray-600 mb-2">
                          {job.companyDetail}
                        </p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">
                        #{job.serialNo}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {job.companyMail && (
                        <a
                          href={`mailto:${job.companyMail}`}
                          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 group"
                        >
                          <Mail className="w-4 h-4" />
                          <span className="truncate group-hover:underline">{job.companyMail}</span>
                        </a>
                      )}
                      
                      {job.companyContact && (
                        <a
                          href={`tel:${job.companyContact}`}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{job.companyContact}</span>
                        </a>
                      )}
                      
                      {job.companyWebsite && (
                        <a
                          href={job.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                        >
                          <Globe className="w-4 h-4" />
                          <span className="truncate">Website</span>
                        </a>
                      )}

                      {job.companyLocation && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{job.companyLocation}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 text-xs">
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
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-gray-700">
              Found <span className="font-bold text-blue-600 text-xl">{jobs.length}</span> developer jobs in UAE
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Categories: Frontend Developer, Software Developer, HTML Developer, React Developer, Next.js Developer
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium mb-2">Loading all developer jobs...</p>
            {loadingProgress && (
              <p className="text-sm text-gray-500">{loadingProgress}</p>
            )}
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-red-800">
              <p className="font-semibold mb-1">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {jobs.map((job) => (
              <div
                key={job.job_id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100 relative"
              >
                {savedJobs.has(job.job_id) && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Saved
                    </div>
                  </div>
                )}
                
                {savingJobs.has(job.job_id) && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </div>
                  </div>
                )}

                <div className="flex gap-4 mb-4">
                  {job.employer_logo ? (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img 
                        src={job.employer_logo} 
                        alt={job.employer_name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = '<div class="w-6 h-6 text-gray-400"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                      {job.job_title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <p className="text-gray-700 font-medium truncate">
                        {job.employer_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {job.job_employment_type && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {job.job_employment_type}
                    </span>
                  )}
                  {job.job_is_remote && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Remote
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {job.job_city && job.job_country 
                        ? `${job.job_city}, ${job.job_country}` 
                        : job.job_country || 'UAE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 flex-shrink-0" />
                    <span>{formatSalary(job)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>Posted {getTimeSince(job.job_posted_at_timestamp)}</span>
                  </div>
                  {job.job_publisher && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 flex-shrink-0" />
                      <span>via {job.job_publisher}</span>
                    </div>
                  )}
                </div>

                {job.job_description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {job.job_description}
                  </p>
                )}

                <button
                  onClick={() => window.open(job.job_apply_link, '_blank')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  View Job Details
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <AutomatedEmailSender />

      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>UAE Developer Jobs • Auto-saves to MongoDB • Powered by JSearch RapidAPI</p>
        </div>
      </footer>
    </div>
  );
}