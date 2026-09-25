// Operations used by each Creative Strategy action, including conditional
// review/repair steps. Keep these aligned with the backend pipeline calls.
const hooks = ["copy.hooks.write", "copy.hooks.review", "copy.hooks.rewrite"];
const script = [...hooks, "copy.script.write", "copy.script.repair"];
const staticBrief = ["copy.static.headlines", "copy.static.visual"];

export const RUN_OPERATIONS = {
  weekly: ["strategy.weekly"],
  weeklyBrief: [...script, ...staticBrief],
  persona: ["strategy.persona.expand"],
  ingestion: ["research.context.extract"],
  assets: ["asset.classify"],
  research: ["research.brand", "research.reviews", "research.competitor.pick", "research.competitor.synthesis", "research.sentiment.align", "research.consumer.report", "research.persona.plan", "research.persona.build", "research.persona.crossmap", "research.query_gen", "research.reddit.synthesis"],
  intelligence: ["analysis.ad.evidence", "analysis.ad.interpret", "analysis.audit.messaging", "analysis.audit.visuals", "analysis.audit.personas", "analysis.audit.quadrant_analysis", "analysis.audit.concept_seeds"],
  library: [...hooks, "copy.headlines.write", "copy.headlines.review", "copy.headlines.rewrite", "copy.library.primary"],
  inspiration: ["analysis.inspo.image", "analysis.inspo.transcript", "analysis.inspo.video"],
  statics: ["image.generate", "strategy.static.plan", "copy.fields.fill", "image.reference.describe", "image.prompt.rewrite", "image.composition.describe"],
  fillCopy: ["copy.fields.fill"],
  scripts: ["strategy.static.plan", ...script],
  brief: ["strategy.static.plan", ...script, ...staticBrief],
};

RUN_OPERATIONS.setup = [...new Set([
  ...RUN_OPERATIONS.ingestion, ...RUN_OPERATIONS.research, ...RUN_OPERATIONS.intelligence,
  ...RUN_OPERATIONS.library, ...RUN_OPERATIONS.weekly,
])];
