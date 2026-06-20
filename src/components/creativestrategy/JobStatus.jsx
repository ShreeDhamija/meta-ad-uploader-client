// Shared poller for long-running creative jobs. Polls GET /api/jobs/:id every
// 2s until the job completes or fails, then calls onDone. Used by every
// long-running creative action's UI.
import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";

export default function JobStatus({ jobId, onDone }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const { job } = await creativeApi.getJob(jobId);
        if (cancelled) return;
        setJob(job);
        if (job.status === "completed" || job.status === "failed") {
          onDone?.(job);
          return; // stop polling
        }
        timer.current = setTimeout(poll, 2000);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    };
    poll();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // onDone intentionally excluded — we don't want to restart polling if the
    // parent passes a new closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (!jobId) return null;
  if (error) return <span className="text-sm text-red-600">job error: {error}</span>;
  if (!job) return <span className="text-sm text-gray-500">starting…</span>;

  return (
    <span className="text-sm">
      <span
        className={
          job.status === "completed"
            ? "text-green-600"
            : job.status === "failed"
              ? "text-red-600"
              : "text-blue-600"
        }
      >
        {job.status}
      </span>
      {job.progress && Object.keys(job.progress).length > 0 && job.status !== "failed" && (
        <span className="text-gray-500"> · {JSON.stringify(job.progress)}</span>
      )}
      {job.status === "failed" && job.error && (
        <span className="text-red-600"> — {job.error}</span>
      )}
    </span>
  );
}

JobStatus.propTypes = {
  jobId: PropTypes.string,
  onDone: PropTypes.func,
};
