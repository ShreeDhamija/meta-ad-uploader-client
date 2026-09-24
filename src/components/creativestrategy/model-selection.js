export function defaultSelection(model, operation) {
  return { model: model.id, ...(model.efforts ? { effort: operation?.effort || "low" } : {}),
    ...(model.qualities ? { quality: "high" } : {}), ...(model.imageSizes ? { imageSize: "1K" } : {}) };
}

