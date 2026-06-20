// Placeholder for nav items whose feature lands in a later phase.
import PropTypes from "prop-types";

export default function ComingSoon({ label, phase }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center">
      <p className="text-neutral-700 font-medium">{label}</p>
      <p className="text-sm text-neutral-400 mt-1">
        {phase && phase !== "later" ? `Arrives in ${phase}.` : "Coming in a later phase."}
      </p>
    </div>
  );
}

ComingSoon.propTypes = {
  label: PropTypes.string,
  phase: PropTypes.string,
};
