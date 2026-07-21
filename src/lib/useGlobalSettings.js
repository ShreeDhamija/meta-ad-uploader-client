import { useEffect, useMemo, useState } from "react";
import { LEGACY_FLAG_TO_CARD_ID, ONBOARDING_CARDS, WIZARD_LAUNCH_DATE } from "./onboardingCards";
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";

export default function useGlobalSettings() {
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding] = useState(false);
  const [hasSeenAnalyticsOnboarding, setHasSeenAnalyticsOnboarding] = useState(false);
  const [hasSeenAnalyticsHomePopup, setHasSeenAnalyticsHomePopup] = useState(false);
  const [hasSeenPowerupPopup, setHasSeenPowerupPopup] = useState(false);
  const [hasImportedCsv, setHasImportedCsv] = useState(false);
  const [hasSeenCsvImportGuide, setHasSeenCsvImportGuide] = useState(false);
  const [seenOnboardingCards, setSeenOnboardingCards] = useState([]);
  const [selectedAdAccountIds, setSelectedAdAccountIds] = useState([]);
  const [uploadSources, setUploadSources] = useState(["local", "drive", "dropbox"]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/global`, {
        credentials: "include",
      });

      // A 401 on first load is usually a brief session race right after
      // login. Retry once before giving up — never redirect.
      if (res.status === 401) {
        await new Promise((r) => setTimeout(r, 400));
        res = await fetch(`${API_BASE_URL}/settings/global`, {
          credentials: "include",
        });
      }

      const data = await res.json();

      setHasSeenOnboarding(data?.settings?.hasSeenOnboarding || false);
      setHasSeenSettingsOnboarding(data?.settings?.hasSeenSettingsOnboarding || false);
      setHasSeenAnalyticsOnboarding(data?.settings?.hasSeenAnalyticsOnboarding || false);
      setHasSeenAnalyticsHomePopup(data?.settings?.hasSeenAnalyticsHomePopup || false);
      setHasSeenPowerupPopup(data?.settings?.hasSeenPowerupPopup || false);
      setHasImportedCsv(data?.settings?.hasImportedCsv || false);
      const csvImportGuideSeen = data?.settings?.hasSeenCsvImportGuide || false;
      setHasSeenCsvImportGuide(csvImportGuideSeen);
      setSeenOnboardingCards(Array.isArray(data?.settings?.seenOnboardingCards) ? data.settings.seenOnboardingCards : []);
      setSelectedAdAccountIds(data?.settings?.selectedAdAccountIds || []);
      const savedUploadSources = Array.isArray(data?.settings?.uploadSources) ? data.settings.uploadSources : ["local", "drive", "dropbox"];
      // Legacy settings may contain CSV from the earlier rollout. Until
      // the new one-time guide has been acknowledged, keep it unchecked.
      setUploadSources(csvImportGuideSeen ? savedUploadSources : savedUploadSources.filter((source) => source !== "csv"));
    } catch (err) {
      console.error("Failed to fetch global settings:", err);
      setHasSeenOnboarding(false);
      setSelectedAdAccountIds([]);
      setHasSeenSettingsOnboarding(false);
      setHasSeenAnalyticsOnboarding(false);
      setHasSeenAnalyticsHomePopup(false);
      setHasSeenPowerupPopup(false);
      setHasImportedCsv(false);
      setHasSeenCsvImportGuide(false);
      setSeenOnboardingCards([]);
      setUploadSources(["local", "drive", "dropbox"]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Listen for updates and refetch
    const handleUpdate = () => fetchSettings();
    window.addEventListener("globalSettingsUpdated", handleUpdate);

    return () => window.removeEventListener("globalSettingsUpdated", handleUpdate);
  }, []);

  // Merges new-style seenOnboardingCards with legacy gates so existing
  // users only see cards added after WIZARD_LAUNCH_DATE.
  const effectiveSeenOnboardingIds = useMemo(() => {
    const set = new Set(seenOnboardingCards);
    const legacy = { hasSeenPowerupPopup, hasSeenAnalyticsHomePopup };
    Object.entries(LEGACY_FLAG_TO_CARD_ID).forEach(([flag, id]) => {
      if (legacy[flag]) set.add(id);
    });
    if (hasSeenOnboarding) {
      ONBOARDING_CARDS.forEach((card) => {
        if (!card.addedAt || card.addedAt > WIZARD_LAUNCH_DATE) return;
        const legacyFlag = Object.keys(LEGACY_FLAG_TO_CARD_ID).find((flag) => LEGACY_FLAG_TO_CARD_ID[flag] === card.id);
        if (legacyFlag && !legacy[legacyFlag]) return;
        set.add(card.id);
      });
    }
    return Array.from(set);
  }, [seenOnboardingCards, hasSeenPowerupPopup, hasSeenAnalyticsHomePopup, hasSeenOnboarding]);

  return {
    loading,
    hasSeenOnboarding,
    setHasSeenOnboarding,
    hasSeenSettingsOnboarding,
    setHasSeenSettingsOnboarding,
    hasSeenAnalyticsOnboarding,
    hasSeenAnalyticsHomePopup,
    setHasSeenAnalyticsHomePopup,
    hasSeenPowerupPopup,
    setHasSeenPowerupPopup,
    hasImportedCsv,
    setHasImportedCsv,
    hasSeenCsvImportGuide,
    setHasSeenCsvImportGuide,
    seenOnboardingCards,
    setSeenOnboardingCards,
    effectiveSeenOnboardingIds,
    selectedAdAccountIds,
    uploadSources,
    setUploadSources,
  };
}
