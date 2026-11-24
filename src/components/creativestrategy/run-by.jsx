// "by <teammate>" label for runs and generations. Shown only to people on a
// team, and only when someone other than the viewer did it (or the Monday
// auto-run did) — your own work and solo accounts show nothing.
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { creativeApi } from "@/lib/creativeApi";

// uid → Promise<{ name, pictureUrl } | null>, shared across the page. Lookups
// made in the same tick go out as one request.
const profiles = new Map();
let queued = new Map();
let timer = null;

function flush() {
  const batch = queued;
  queued = new Map();
  timer = null;
  creativeApi.getUserProfiles([...batch.keys()])
    .then((res) => batch.forEach((resolve, uid) => resolve(res?.profiles?.[uid] ?? null)))
    .catch(() => batch.forEach((resolve, uid) => { profiles.delete(uid); resolve(null); }));
}

function loadProfile(uid) {
  if (!profiles.has(uid)) {
    profiles.set(uid, new Promise((resolve) => {
      queued.set(uid, resolve);
      if (!timer) timer = setTimeout(flush, 0);
    }));
  }
  return profiles.get(uid);
}

const initials = (name) => (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** True when a run by `uid` / `auto` should be labelled for this viewer. */
export function useShowRunBy({ uid, auto }) {
  const { userId, teamId } = useAuth();
  if (!teamId) return false;
  if (auto) return true;
  return !!uid && String(uid) !== String(userId);
}

export default function RunBy({ uid = null, auto = false, prefix = "by", className = "" }) {
  const show = useShowRunBy({ uid, auto });
  const [profile, setProfile] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setProfile(null);
    setImgFailed(false);
    if (show && !auto && uid) loadProfile(String(uid)).then((p) => { if (live) setProfile(p); });
    return () => { live = false; };
  }, [show, auto, uid]);

  if (!show) return null;
  if (auto) {
    return (
      <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
        {prefix} <CalendarClock className="h-3 w-3" aria-hidden="true" /> weekly auto-run
      </span>
    );
  }
  if (!profile?.name) return null;
  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
      {prefix}
      {profile.pictureUrl && !imgFailed ? (
        <img src={profile.pictureUrl} alt="" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} className="h-4 w-4 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-stone-200 text-[8px] font-semibold text-stone-600">{initials(profile.name)}</span>
      )}
      <span className="font-medium">{profile.name}</span>
    </span>
  );
}

RunBy.propTypes = {
  uid: PropTypes.string,
  auto: PropTypes.bool,
  prefix: PropTypes.string,
  className: PropTypes.string,
};

/** "<label> <date> by <teammate>" line, rendered only when RunBy would show. */
export function RunByNote({ label, at = null, uid = null, auto = false, className = "" }) {
  const show = useShowRunBy({ uid, auto });
  if (!show || !at) return null;
  const date = new Date(at);
  return (
    <p className={className}>
      {label} <time dateTime={at}>{date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time> <RunBy uid={uid} auto={auto} />
    </p>
  );
}

RunByNote.propTypes = {
  label: PropTypes.string.isRequired,
  at: PropTypes.string,
  uid: PropTypes.string,
  auto: PropTypes.bool,
  className: PropTypes.string,
};
