import PropTypes from "prop-types";
import ModelSelection from "./ModelSelection";
import "./models.css";

export default function RunModelControls({ models, operations, title = "Models for this run", disabled = false }) {
  const count = operations.filter(id => models.selections[id]).length;
  return <details className="cs-run-models">
    <summary><span>{title}</span><span>{count ? `${count} override${count === 1 ? "" : "s"}` : "Saved defaults"}</span></summary>
    <div className="cs-run-models-body">
      <p className="cs-model-help">Choose each step independently. Changes apply to your next submission here, then reset to your saved defaults. Only the steps needed for your request will run.</p>
      {models.error ? <div role="alert" className="cs-model-error">Could not load model choices: {models.error}. You can still run with saved defaults. <button type="button" onClick={models.retry}>Try again</button></div>
        : !models.catalog ? <p role="status" className="cs-model-help">Loading models…</p>
          : <div className="cs-run-model-grid">{operations.map(id => {
            const op = models.catalog.operations.find(item => item.id === id);
            if (!op) return null;
            return <div key={id}>
              <ModelSelection catalog={models.catalog} operationId={id} label={op.label} value={models.selections[id] || models.catalog.resolved.selections[id]} disabled={disabled} onChange={value => models.change(id, value)} />
              {models.selections[id] && <button type="button" className="cs-run-model-reset" disabled={disabled} onClick={() => models.reset([id])}>Use saved default</button>}
            </div>;
          })}</div>}
      {count > 0 && <button type="button" className="cs-model-secondary" disabled={disabled} onClick={() => models.reset(operations)}>Reset all overrides</button>}
    </div>
  </details>;
}
RunModelControls.propTypes = { models: PropTypes.object.isRequired, operations: PropTypes.arrayOf(PropTypes.string).isRequired, title: PropTypes.string, disabled: PropTypes.bool };
