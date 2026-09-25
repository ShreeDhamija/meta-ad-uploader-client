// Historical results stay in the queue without becoming fresh session alerts.
// Include tracked jobs even when an older service omits the completion timestamp.
export function isCurrentSessionResult(job, sessionStartedAt, sessionJobs) {
  return sessionJobs.has(job.id) || Number(job.finishedAt) >= sessionStartedAt;
}
