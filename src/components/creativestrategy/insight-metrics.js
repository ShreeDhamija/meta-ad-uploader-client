/** IDs are authoritative. Name matching only supports pre-ID audit snapshots. */
export function matchInsightAds(cluster, ads) {
  if (Array.isArray(cluster.ad_ids)) {
    const ids = new Set(cluster.ad_ids);
    return ads.filter(ad => ids.has(ad.adId));
  }
  const names = new Set(cluster.ad_names || []);
  return ads.filter(ad => names.has(ad.adName));
}

export function funnelBuckets(ads) {
  const buckets = Object.fromEntries(["TOF", "MOF", "BOF", "Unclassified"].map(stage => [stage, { spend: 0, count: 0, purchases: 0 }]));
  for (const ad of ads) {
    if (!(ad.spend > 0)) continue;
    const label = String(ad.funnelPosition || "").trim().toUpperCase();
    const stage = ["TOF", "MOF", "BOF"].includes(label) ? label : "Unclassified";
    buckets[stage].spend += ad.spend;
    buckets[stage].count += 1;
    buckets[stage].purchases += ad.purchases || 0;
  }
  return buckets;
}
