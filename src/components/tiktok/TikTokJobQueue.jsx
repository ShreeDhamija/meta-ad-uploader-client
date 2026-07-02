import React, { useState } from 'react'
import { Ban, CircleX, AlertTriangle, ChevronDown, Loader, RotateCcw, Eye } from 'lucide-react'
import RocketIcon2 from '@/assets/icons/rocket.svg?react'
import CheckIcon from '@/assets/icons/check.svg?react'
import UploadIcon from '@/assets/icons/upload.svg?react'
import QueueIcon from '@/assets/icons/queue.svg?react'
import PartialSuccess from '@/assets/icons/partialsuccess.svg?react'

const ErrorFileName = ({ name }) => {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 50;
  const needsTruncation = name.length > LIMIT;
  const display = !needsTruncation || expanded ? name : name.slice(0, LIMIT) + '…';
  return (
    <li className="break-words text-[#FF0000] leading-snug">
      {display}
      {needsTruncation && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-1 text-[#FF8080] hover:text-[#FF0000] underline underline-offset-2"
        >
          View Full Ad Name
        </button>
      )}
    </li>
  );
};

export default function TikTokJobQueue({
  hasStartedAnyJob,
  isJobTrackerExpanded,
  setIsJobTrackerExpanded,
  jobQueue,
  setJobQueue,
  currentJob,
  completedJobs,
  setCompletedJobs,
  progress,
  trackedProgress,
  videoUploading,
  videoUploadProgress,
  isCancelling,
  setIsCancelling,
  currentAbortController,
  jobId,
  progressMessage,
  trackedMessage,
  liveProgress,
  refreshPage,
  handleRetryJob,
  formatQueuedJobLabel,
  API_BASE_URL,
}) {
  if (!hasStartedAnyJob) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed State */}
      {!isJobTrackerExpanded && (
        <div
          className="bg-white rounded-3xl border border-gray-200/50 border-4 shadow-xl p-2 flex items-center gap-3 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105"
          onClick={() => setIsJobTrackerExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <RocketIcon2
              alt="Rocket Icon"
              className="!w-10 h-10 object-contain"
            />
            <span className="font-medium text-sm">Job Queue</span>
          </div>
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
            {jobQueue.length + (currentJob && jobQueue.length === 0 ? 1 : 0)} Active
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500 rotate-180" />
        </div>
      )}

      {/* Expanded State */}
      {isJobTrackerExpanded && (
        <div className="bg-white border border-gray-200/50 border-4 rounded-[20px] shadow-lg w-96 max-h-[600px] overflow-hidden flex flex-col transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Fixed size container for the RocketIcon */}
              <div className="w-12 h-12 flex-shrink-0">
                <RocketIcon2
                  alt="Rocket Icon"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="font-semibold text-sm">Job Queue</h3>
                <p className="text-sm font-medium text-gray-400">{jobQueue.length + (currentJob && jobQueue.length === 0 ? 1 : 0)} Active</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsJobTrackerExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Jobs List */}
          <div className="flex-1 overflow-y-auto">

            {/* Completed Jobs */}

            {completedJobs.map((job) => {
              return (
                <div key={job.id} className="p-3.5 border-b border-gray-100">
                  {/* Main job row */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {job.status === 'cancelled' ? (
                        <Ban className="w-6 h-6 text-orange-500" />
                      ) : job.status === 'error' ? (
                        <CircleX className="w-6 h-6 text-red-500" />
                      ) : job.status === 'partial-success' ? (
                        <PartialSuccess className="w-6 h-6" />
                      ) : job.status === 'retry' ? (
                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                      ) : (
                        <CheckIcon className="w-6 h-6" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p
                        style={{ overflowWrap: 'anywhere' }}
                        className={`text-sm break-words ${job.status === 'cancelled'
                          ? 'text-orange-500'
                          : job.status === 'error'
                            ? 'text-red-600'
                            : job.status === 'partial-success'
                              ? 'text-[#F0A000]'
                              : job.status === 'retry'
                                ? 'text-orange-600'
                                : 'text-gray-700'
                          }`}
                      >
                        {job.message}
                      </p>
                      {job.status === 'cancelled' && job.totalCount > 0 && job.successCount > 0 && (
                        <div className="flex gap-2 mt-1.5">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-lg">
                            <CheckIcon className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium text-green-700">
                              {job.successCount} created
                            </span>
                          </div>
                          {job.failureCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-lg">
                              <CircleX className="w-3 h-3 text-red-500" />
                              <span className="text-xs font-medium text-red-600">
                                {job.failureCount} failed
                              </span>
                            </div>
                          )}
                        </div>
                      )}


                      {job.status === 'retry' && (
                        <span className="block text-xs text-orange-500 mt-1">
                          Reload page to try again.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {job.status === 'retry' && (
                        <button
                          type="button"
                          onClick={refreshPage}
                          className="text-orange-600 hover:text-orange-800 p-1 rounded"
                          title="Retry job"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      {job.selectedAdvertiser && (job.status === 'success' || job.status === 'partial-success' || job.status === 'cancelled') && (
                        <a
                          href={`https://ads.tiktok.com/i18n/manage/creative?aadvid=${job.selectedAdvertiser}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-500 hover:text-blue-500 transition-colors p-1"
                          title="View in Ads Manager"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}

                      {(job.status === 'error' || job.status === 'partial-success') && job.formData && (
                        <button
                          type="button"
                          onClick={() => handleRetryJob(job)}
                          className="text-gray-500 hover:text-blue-500 transition-colors p-1"
                          title="Restore to form"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setCompletedJobs((prev) => prev.filter((j) => j.id !== job.id))
                        }
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Remove job"
                      >
                        <CircleX className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Error details (moved outside the flex row) */}
                  {(job.status === 'partial-success' || job.status === 'cancelled' || job.status === 'error') && job.errorMessages?.length > 0 && (
                    <div className="mt-2 ml-9">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-[#FF0000] font-medium">
                          View error details
                        </summary>
                        <div className="mt-2 ml-1 space-y-3">
                          {(() => {
                            const errorGroups = job.errorMessages.reduce((acc, item) => {
                              const key = item.error;
                              if (!acc[key]) acc[key] = { error: item.error, fileNames: [] };
                              if (item.fileName) acc[key].fileNames.push(item.fileName);
                              return acc;
                            }, {});

                            return Object.values(errorGroups).map((group, idx) => {
                              const count = group.fileNames.length || 1;
                              return (
                                <div key={idx} className="border-l-2 border-[#FF0000]/40 pl-2">
                                  <div className="text-[#FF0000] font-medium flex items-start gap-1.5">
                                    <span className="flex-1">{group.error}</span>
                                    <span className="shrink-0 px-1.5 rounded bg-[#FF0000]/10 text-[#FF0000]">
                                      {count} {count === 1 ? 'ad' : 'ads'}
                                    </span>
                                  </div>
                                  {group.fileNames.length > 0 && (
                                    <ul className="mt-1.5 ml-3 list-disc space-y-1">
                                      {group.fileNames.map((name, i) => (
                                        <ErrorFileName key={i} name={name} />
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current Job */}
            {currentJob && (
              <div className="p-3.5 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="flex-shrink-0">
                    <UploadIcon className="w-6 h-6" />
                  </div>
                  <p className="flex-1 text-sm font-medium text-gray-700 break-all">
                    {formatQueuedJobLabel(currentJob, 'Posting')}
                  </p>
                  <span className="text-sm font-semibold text-gray-900">{Math.round(videoUploading ? videoUploadProgress : (progress || trackedProgress || 0))}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${videoUploading ? videoUploadProgress : (progress || trackedProgress || 0)}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsCancelling(true);
                      if (currentAbortController) {
                        currentAbortController.abort();
                      }
                      const cancelJobId = jobId;
                      if (cancelJobId) {
                        try {
                          await fetch(`${API_BASE_URL}/auth/cancel-job`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ jobId: cancelJobId })
                          });
                        } catch (e) { /* best-effort */ }
                      }
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    title="Cancel job"
                  >
                    <CircleX className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2">
                  {isCancelling ? (
                    <div className="flex items-center gap-1.5">
                      <Loader className="animate-spin h-3 w-3 text-red-400" />
                      <span className="text-xs text-red-400">Cancelling...</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">{videoUploading ? 'Uploading video to TikTok...' : (progressMessage || trackedMessage)}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {(progressMessage || trackedMessage) && liveProgress.total > 0 && (
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
                          <CheckIcon className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700">
                            {liveProgress.succeeded}/{liveProgress.total}
                          </span>
                        </div>
                        {liveProgress.failed > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                            <CircleX className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-medium text-red-600">
                              {liveProgress.failed}/{liveProgress.total}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Live error details */}
                {liveProgress.errors && liveProgress.errors.length > 0 && (
                  <div className="mt-2">
                    <details className="text-xs" open>
                      <summary className="cursor-pointer text-[#FF0000] font-medium">
                        View error details
                      </summary>
                      <div className="mt-2 ml-1 space-y-3">
                        {(() => {
                          const errorGroups = liveProgress.errors.reduce((acc, item) => {
                            const key = item.error;
                            if (!acc[key]) acc[key] = { error: item.error, fileNames: [] };
                            if (item.fileName) acc[key].fileNames.push(item.fileName);
                            return acc;
                          }, {});

                          return Object.values(errorGroups).map((group, idx) => {
                            const count = group.fileNames.length || 1;
                            return (
                              <div key={idx} className="border-l-2 border-[#FF0000]/40 pl-2">
                                <div className="text-[#FF0000] font-medium flex items-start gap-1.5">
                                  <span className="flex-1">{group.error}</span>
                                  <span className="shrink-0 px-1.5 rounded bg-[#FF0000]/10 text-[#FF0000]">
                                    {count} {count === 1 ? 'ad' : 'ads'}
                                  </span>
                                </div>
                                {group.fileNames.length > 0 && (
                                  <ul className="mt-1.5 ml-3 list-disc space-y-1">
                                    {group.fileNames.map((name, i) => (
                                      <ErrorFileName key={i} name={name} />
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}

            {/* Queued Jobs */}
            {jobQueue.slice(currentJob ? 1 : 0).map((job, index) => (
              <div key={job.id || index} className="p-3.5 border-b border-gray-100 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <QueueIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="flex-1 text-sm text-gray-600">
                  {formatQueuedJobLabel(job, 'Queued')}
                </p>
                <button
                  type="button"
                  onClick={() => setJobQueue(prev => prev.filter((_, i) => i !== (currentJob ? index + 1 : index)))}
                  className="text-gray-400 hover:text-red-600"
                >
                  <CircleX className="h-4 w-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
