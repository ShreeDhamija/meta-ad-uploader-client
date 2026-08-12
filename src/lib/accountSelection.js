export const META_PLATFORM = "meta"
export const TIKTOK_PLATFORM = "tiktok"

export function getPlanAccountLimit(planType) {
  if (planType === "starter") return 1
  if (planType === "brand") return 5
  return Infinity
}

export function selectionNeedsAttention(planType, selectedIds) {
  const limit = getPlanAccountLimit(planType)
  if (!Number.isFinite(limit)) return false
  return !Array.isArray(selectedIds) || selectedIds.length === 0
}

export function getRequiredSelectionPlatforms({
  planType,
  selectedMetaIds,
  selectedTikTokIds,
  isTikTokConnected,
  requireTikTokTrialSelection = false,
}) {
  const required = []

  if (selectionNeedsAttention(planType, selectedMetaIds)) {
    required.push(META_PLATFORM)
  }

  const needsPaidTikTokSelection = isTikTokConnected
    && selectionNeedsAttention(planType, selectedTikTokIds)
  const needsTrialTikTokSelection = isTikTokConnected
    && requireTikTokTrialSelection
    && planType === "free_trial"
    && (!Array.isArray(selectedTikTokIds) || selectedTikTokIds.length === 0)

  if (needsPaidTikTokSelection || needsTrialTikTokSelection) {
    required.push(TIKTOK_PLATFORM)
  }

  return required
}

export function normalizeCheckoutPlanType(planType) {
  return planType === "agency" ? "pro" : planType
}
