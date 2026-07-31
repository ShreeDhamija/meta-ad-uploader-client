export function getGroupFileIds(group) {
  return Array.isArray(group) ? group : group?.fileIds || [];
}

export function getGroupLayoutKey(group, index) {
  return Array.isArray(group) || !group?.id ? `group-${index}` : String(group.id);
}

export function getCreativeUnitsForForm(state, form, mediaById) {
  const layout = state?.mediaLayout || {};
  const items = Array.isArray(layout.items) ? layout.items : [];
  const groups = Array.isArray(layout.fileGroups) ? layout.fileGroups : [];
  const formId = form?.id || "default";
  const groupVariantMap = layout.groupVariantMap || {};
  const fileVariantMap = layout.fileVariantMap || {};
  const postVariantMap = layout.postVariantMap || {};
  const savedNames = layout.creativeAdNames?.[formId] || {};
  const groupedKeys = new Set(groups.flatMap(getGroupFileIds));
  const itemByOriginalKey = new Map(items.map((item) => [String(item.originalKey), item]));
  const fallbackAdName = form?.values?.adName || "Ad";
  const units = [];

  groups.forEach((group, groupIndex) => {
    const groupKey = getGroupLayoutKey(group, groupIndex);
    const persistedGroupId = Array.isArray(group) ? null : group?.id;
    const assignedFormId = persistedGroupId ? groupVariantMap[persistedGroupId] || "default" : "default";
    if (assignedFormId !== formId) return;

    const media = getGroupFileIds(group)
      .map((originalKey) => itemByOriginalKey.get(String(originalKey)))
      .map((item) => item && mediaById.get(item.mediaId))
      .filter(Boolean);
    if (media.length === 0) return;
    units.push({
      id: `group:${groupKey}`,
      type: "group",
      groupKey,
      media,
      adName: savedNames.groups?.[groupKey] || fallbackAdName,
    });
  });

  items.forEach((item) => {
    const originalKey = String(item.originalKey);
    if (groupedKeys.has(item.originalKey) || groupedKeys.has(originalKey)) return;
    const assignmentMap = originalKey.startsWith("post:") || originalKey.startsWith("igpost:")
      ? postVariantMap
      : fileVariantMap;
    const assignedFormId = items.length <= 1 ? formId : assignmentMap[originalKey] || "default";
    if (assignedFormId !== formId) return;
    const media = mediaById.get(item.mediaId);
    if (!media) return;
    units.push({
      id: `file:${originalKey}`,
      type: "single",
      originalKey,
      media: [media],
      adName: savedNames.files?.[originalKey] || fallbackAdName,
    });
  });

  return units;
}
