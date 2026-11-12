// Upgraded Smart+ detection shared by the TikTok launcher page and its ad creation form.

// /smart_plus/ad/create/ accepts 1-50 creatives in one ad's creative_list.
export const MAX_SMART_PLUS_GROUP_CREATIVES = 50;

export function isSmartPlusCampaign(c) {
  if (!c) return false;
  return Boolean(
    c.is_smart_performance_campaign === true ||
    c.is_smart_performance_campaign === "true" ||
    c.is_smart_performance_campaign === 1 ||
    c.campaign_automation_type === "UPGRADED_SMART_PLUS" ||
    c.campaign_automation_type === "SMART_PLUS" ||
    c.campaign_automation_type === "SMART_PERFORMANCE_CAMPAIGN" ||
    c.is_smart === true ||
    c.is_smart === "true",
  );
}

/** True when the selected campaign, or the campaign behind a selected ad group, is Smart+. */
export function isSmartPlusSelection({
  campaigns = [],
  selectedCampaign = [],
  adGroups = [],
  selectedAdGroup = [],
  showDuplicateAdGroupBlock = false,
  duplicateAdGroup = "",
}) {
  const findCampaign = (id) => campaigns.find((c) => c.campaign_id === id);

  if (selectedCampaign?.some((id) => isSmartPlusCampaign(findCampaign(id)))) return true;

  const activeAdGroups = showDuplicateAdGroupBlock && duplicateAdGroup ? [duplicateAdGroup] : selectedAdGroup || [];
  return activeAdGroups.some((agId) => {
    const ag = adGroups.find((g) => g.adgroup_id === agId);
    return Boolean(ag && isSmartPlusCampaign(findCampaign(ag.campaignId || ag.campaign_id)));
  });
}
