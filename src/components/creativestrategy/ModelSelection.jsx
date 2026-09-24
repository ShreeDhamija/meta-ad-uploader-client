import PropTypes from "prop-types";

import { defaultSelection } from "./model-selection";

export default function ModelSelection({ catalog, operationId, value, onChange, label = "Model", disabled = false }) {
  const operation = catalog?.operations.find(op => op.id === operationId);
  const options = catalog?.models.filter(m => operation?.models.includes(m.id)) || [];
  const selected = options.find(m => m.id === value?.model);
  return <div className="cs-model-selection">
    <label><span>{label}</span><select disabled={disabled} value={value?.model || ""} onChange={e => onChange(defaultSelection(options.find(m => m.id === e.target.value), operation))}>
      {!value?.model && <option value="">Select a model</option>}
      {options.map(model => <option key={model.id} value={model.id} disabled={model.availability === "missing_credentials"}>
        {model.label}{model.availability === "missing_credentials" ? " — key required" : ""}
      </option>)}
    </select></label>
    {selected?.efforts && <label><span>Reasoning effort</span><select disabled={disabled} value={value.effort || operation.effort} onChange={e => onChange({ ...value, effort: e.target.value })}>
      {selected.efforts.map(e => <option key={e} value={e}>{e}</option>)}
    </select></label>}
    {selected?.qualities && <label><span>Image quality</span><select disabled={disabled} value={value.quality || "high"} onChange={e => onChange({ ...value, quality: e.target.value })}>
      {selected.qualities.map(q => <option key={q} value={q}>{q}</option>)}
    </select></label>}
    {selected?.imageSizes && <label><span>Resolution</span><select disabled={disabled} value={value.imageSize || "1K"} onChange={e => onChange({ ...value, imageSize: e.target.value })}>
      {selected.imageSizes.map(s => <option key={s} value={s}>{s}</option>)}
    </select></label>}
    {selected && <p className="cs-model-price">{selected.availability === "missing_credentials" ? "Provider key is required on the server." : "Key configured · model access untested"}
      {selected.pricingStatus === "needs_refresh" ? " · Pricing needs verification before comparisons" : selected.capabilities.includes("image") ? ` · Image output $${selected.imageOutput}/1M tokens, plus input` : ` · $${selected.input} input / $${selected.output} output per 1M tokens`}
      {selected.priceUntil && Date.now() < Date.parse(selected.priceUntil) && ` · Introductory rates end ${new Date(selected.priceUntil).toLocaleDateString()}`}
      {selected.accessNote && ` · ${selected.accessNote}`}
    </p>}
  </div>;
}
ModelSelection.propTypes = { catalog: PropTypes.object, operationId: PropTypes.string.isRequired, value: PropTypes.object, onChange: PropTypes.func.isRequired, label: PropTypes.string, disabled: PropTypes.bool };
