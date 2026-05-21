import DesktopIcon from '@/assets/Desktop.webp'
import Header from '@/components/header'
import MediaPreview from '@/components/media-preview'
import TikTokAdCreationForm from '@/components/tiktok/TikTokAdCreationForm'
import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useIntercom } from '@/lib/useIntercom'
import useTikTokAdvertiserSettings from '@/lib/useTikTokAdvertiserSettings'
import { saveTikTokSettings } from '@/lib/saveTikTokSettings'
import { Loader2 } from "lucide-react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import { v4 as uuidv4 } from "uuid"

// Error boundary to catch component preview failures and prevent crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by preview boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center border border-dashed border-red-200 rounded-3xl bg-red-50/50">
          <p className="text-red-600 mb-2 font-bold text-sm">Something went wrong with the preview</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-semibold shadow-sm transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TikTokAds() {
  const navigate = useNavigate()
  const { isTikTokLoggedIn, tiktokAdvertisers, refreshTikTokUser, isLoading: authLoading } = useTikTokAuth()
  const { showMessenger, hideMessenger } = useIntercom()

  const [selectedAdvertiser, setSelectedAdvertiser] = useState('')
  const [adName, setAdName] = useState('')
  const [adText, setAdText] = useState('')
  const [cta, setCta] = useState('SHOP_NOW') // Now a single string default value
  const [landingUrl, setLandingUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [driveFiles, setDriveFiles] = useState([])
  const [dropboxFiles, setDropboxFiles] = useState([])
  const [selectedIdentity, setSelectedIdentity] = useState('')
  const [sparkAuthCode, setSparkAuthCode] = useState('')
  const [urlMode, setUrlMode] = useState('WEBSITE')
  const [adType, setAdType] = useState('NORMAL')
  const [showMobileBanner, setShowMobileBanner] = useState(true)

  // Lifted form fetching states (to snapshot campaign & ad group selections)
  const [campaigns, setCampaigns] = useState([])
  const [adGroups, setAdGroups] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState([])
  const [selectedAdGroup, setSelectedAdGroup] = useState([])
  const [identities, setIdentities] = useState([])

  // Mocked state arrays & variables for MediaPreview integration compatibility
  const [files, setFiles] = useState([])
  const [importedPosts, setImportedPosts] = useState([])
  const [frameioFiles, setFrameioFiles] = useState([])
  const [importedFiles, setImportedFiles] = useState([])
  const [videoThumbs, setVideoThumbs] = useState({})
  const [isCarouselAd, setIsCarouselAd] = useState(false)
  const [enablePlacementCustomization, setEnablePlacementCustomization] = useState(false)
  const [fileGroups, setFileGroups] = useState([])
  const [selectedAdSets, setSelectedAdSets] = useState([])
  const [adSets, setAdSets] = useState([])
  const [duplicateAdSet, setDuplicateAdSet] = useState('')
  const [duplicateAdGroup, setDuplicateAdGroup] = useState('')
  const [newAdGroupName, setNewAdGroupName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [selectedIgOrganicPosts, setSelectedIgOrganicPosts] = useState([])
  const [hasSeenPowerupPopup, setHasSeenPowerupPopup] = useState(false)
  const [showPowerupPopup, setShowPowerupPopup] = useState(false)

  // Variant States
  const [variants, setVariants] = useState([{ id: "default", name: "Default", snapshot: null }])
  const [activeVariantId, setActiveVariantId] = useState("default")
  const [fileVariantMap, setFileVariantMap] = useState({})
  const [groupVariantMap, setGroupVariantMap] = useState({})
  const [postVariantMap, setPostVariantMap] = useState({})

  // Load preferences for selected advertiser
  const { settings: advertiserPrefs } = useTikTokAdvertiserSettings(selectedAdvertiser)

  // Sync files with videoFile/videoPreview for backend submissions and video uploading hooks
  useEffect(() => {
    if (files && files.length > 0) {
      const file = files[0]
      setVideoFile(file)
      if (file instanceof File) {
        const previewUrl = URL.createObjectURL(file)
        setVideoPreview(previewUrl)
        return () => URL.revokeObjectURL(previewUrl)
      } else if (file.url) {
        setVideoPreview(file.url)
      } else if (file.preview) {
        setVideoPreview(file.preview)
      }
    } else {
      setVideoFile(null)
      setVideoPreview(null)
    }
  }, [files])

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      toast.success('🎉 TikTok connected successfully!')
      refreshTikTokUser()
      window.history.replaceState({}, '', '/tiktok-ads')
    }
  }, [refreshTikTokUser])

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isTikTokLoggedIn) {
      navigate('/tiktok-login')
    }
  }, [isTikTokLoggedIn, authLoading, navigate])

  // Auto-select first advertiser account
  useEffect(() => {
    if (tiktokAdvertisers.length > 0 && !selectedAdvertiser) {
      const firstId = tiktokAdvertisers[0].advertiser_id || tiktokAdvertisers[0].id
      setSelectedAdvertiser(firstId)
    }
  }, [tiktokAdvertisers, selectedAdvertiser])

  // Sync state with preferences when they load
  useEffect(() => {
    if (advertiserPrefs) {
      // 1. Default Identity (only if not already set)
      if (!selectedIdentity && advertiserPrefs.defaultIdentityId) {
        setSelectedIdentity(advertiserPrefs.defaultIdentityId);
      }

      // 2. Default CTA (string conversion)
      if (cta === 'SHOP_NOW' && advertiserPrefs.defaultCTAs?.length > 0) {
        setCta(advertiserPrefs.defaultCTAs[0]);
      }

      // 3. Default Landing URL
      if (!landingUrl && advertiserPrefs.links?.length > 0) {
        const defaultLink = advertiserPrefs.links.find(l => l.isDefault) || advertiserPrefs.links[0];
        setLandingUrl(defaultLink.url);
      }

      // 4. Default Ad Text (from default template)
      if (!adText && advertiserPrefs.copyTemplates && advertiserPrefs.defaultTemplateName) {
        const template = advertiserPrefs.copyTemplates[advertiserPrefs.defaultTemplateName];
        if (template && template.texts?.length > 0) {
          setAdText(template.texts[0]);
        }
      }

      // 5. Default Campaign & Ad Group — restore saved defaults
      if (selectedCampaign.length === 0 && advertiserPrefs.defaultCampaignId) {
        const val = advertiserPrefs.defaultCampaignId;
        setSelectedCampaign(Array.isArray(val) ? val : [val]);
      }
      if (selectedAdGroup.length === 0 && advertiserPrefs.defaultAdGroupId) {
        const val = advertiserPrefs.defaultAdGroupId;
        setSelectedAdGroup(Array.isArray(val) ? val : [val]);
      }
    }
  }, [advertiserPrefs, selectedAdvertiser]);

  // Auto-save campaign + adgroup selection as defaults whenever they change.
  // Debounced to avoid hammering Firestore on rapid changes.
  const saveDefaultsTimerRef = useRef(null);
  useEffect(() => {
    // Only save once we have a loaded pref object (prevents saving empty values on first mount)
    if (!selectedAdvertiser || advertiserPrefs === null) return;

    clearTimeout(saveDefaultsTimerRef.current);
    saveDefaultsTimerRef.current = setTimeout(async () => {
      try {
        await saveTikTokSettings(selectedAdvertiser, {
          defaultCampaignId: selectedCampaign.length > 0 ? selectedCampaign : null,
          defaultAdGroupId: selectedAdGroup.length > 0 ? selectedAdGroup : null,
        });
        console.log('[TikTok] Saved default campaign/adgroup:', selectedCampaign, selectedAdGroup);
      } catch (err) {
        console.warn('[TikTok] Failed to auto-save default campaign/adgroup:', err.message);
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(saveDefaultsTimerRef.current);
  }, [selectedCampaign, selectedAdGroup, selectedAdvertiser, advertiserPrefs]);

  // Variant helper methods matching Home.jsx pattern
  const cloneSnapshotValue = (value) => {
    if (Array.isArray(value)) return [...value];
    if (value && typeof value === "object") {
      return JSON.parse(JSON.stringify(value));
    }
    return value;
  };

  const snapshotValuesEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

  const captureCurrentSnapshot = useCallback(() => ({
    adName,
    adText,
    cta,
    landingUrl,
    selectedIdentity,
    sparkAuthCode,
    urlMode,
    selectedCampaign,
    selectedAdGroup,
    duplicateAdGroup,
    newAdGroupName,
  }), [
    adName,
    adText,
    cta,
    landingUrl,
    selectedIdentity,
    sparkAuthCode,
    urlMode,
    selectedCampaign,
    selectedAdGroup,
    duplicateAdGroup,
    newAdGroupName,
  ]);

  const hydrateFromSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    setAdName(snapshot.adName || "");
    setAdText(snapshot.adText || "");
    setCta(snapshot.cta || "SHOP_NOW");
    setLandingUrl(snapshot.landingUrl || "");
    setSelectedIdentity(snapshot.selectedIdentity || "");
    setSparkAuthCode(snapshot.sparkAuthCode || "");
    setUrlMode(snapshot.urlMode || "WEBSITE");
    const rawCampaign = snapshot.selectedCampaign || "";
    setSelectedCampaign(Array.isArray(rawCampaign) ? rawCampaign : (rawCampaign ? [rawCampaign] : []));
    const rawAdGroup = snapshot.selectedAdGroup || "";
    setSelectedAdGroup(Array.isArray(rawAdGroup) ? rawAdGroup : (rawAdGroup ? [rawAdGroup] : []));
    setDuplicateAdGroup(snapshot.duplicateAdGroup || "");
    setNewAdGroupName(snapshot.newAdGroupName || "");
  }, []);

  const switchVariant = useCallback((targetId) => {
    if (targetId === activeVariantId) return;

    const targetVariant = variants.find((variant) => variant.id === targetId);
    if (!targetVariant) return;

    const currentSnapshot = captureCurrentSnapshot();

    setVariants((prev) => prev.map((variant) => {
      if (variant.id === activeVariantId) {
        return { ...variant, snapshot: currentSnapshot };
      }
      if (variant.id === targetId) {
        return { ...variant, snapshot: null };
      }
      return variant;
    }));

    hydrateFromSnapshot(targetVariant.snapshot);
    setActiveVariantId(targetId);
    setSelectedFiles(new Set());
  }, [activeVariantId, captureCurrentSnapshot, hydrateFromSnapshot, variants]);

  const getVariantSnapshot = useCallback((variantId) => {
    if (variantId === activeVariantId) {
      return captureCurrentSnapshot();
    }
    return variants.find((variant) => variant.id === variantId)?.snapshot || null;
  }, [activeVariantId, captureCurrentSnapshot, variants]);

  const isFormFieldModified = useCallback((fieldKeys) => {
    if (activeVariantId === "default") return false;

    const activeSnapshot = getVariantSnapshot(activeVariantId);
    const defaultSnapshot = getVariantSnapshot("default");
    if (!activeSnapshot || !defaultSnapshot) return false;

    const keys = Array.isArray(fieldKeys) ? fieldKeys : [fieldKeys];
    return keys.some((key) => !snapshotValuesEqual(activeSnapshot[key], defaultSnapshot[key]));
  }, [activeVariantId, getVariantSnapshot]);

  const handleAddVariant = useCallback(() => {
    const usedLetters = new Set(
      variants
        .filter((variant) => variant.id !== "default")
        .map((variant) => variant.name.replace(/^(Form|Variant)\s+/, ""))
    );
    const nextLetter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((letter) => !usedLetters.has(letter));

    if (!nextLetter) {
      toast.error("Maximum 26 Variants");
      return;
    }

    const currentSnapshot = captureCurrentSnapshot();
    const defaultSnapshot = cloneSnapshotValue(getVariantSnapshot("default")) || cloneSnapshotValue(currentSnapshot);
    const newVariantId = uuidv4();

    setVariants((prev) => [
      ...prev.map((variant) => (
        variant.id === activeVariantId
          ? { ...variant, snapshot: currentSnapshot }
          : variant
      )),
      { id: newVariantId, name: `Variant ${nextLetter}`, snapshot: defaultSnapshot }
    ]);
    setSelectedFiles(new Set());
  }, [activeVariantId, captureCurrentSnapshot, getVariantSnapshot, variants]);

  const handleDeleteVariant = useCallback((variantId) => {
    if (variantId === "default") return;

    const defaultVariant = variants.find((variant) => variant.id === "default");
    const wasActive = variantId === activeVariantId;
    const reassignedCount =
      Object.values(fileVariantMap).filter((value) => value === variantId).length +
      Object.values(groupVariantMap).filter((value) => value === variantId).length +
      Object.values(postVariantMap).filter((value) => value === variantId).length;

    setFileVariantMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === variantId) delete next[key];
      });
      return next;
    });

    setGroupVariantMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === variantId) delete next[key];
      });
      return next;
    });

    setPostVariantMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === variantId) delete next[key];
      });
      return next;
    });

    setVariants((prev) => prev.filter((variant) => variant.id !== variantId));

    if (wasActive) {
      hydrateFromSnapshot(defaultVariant?.snapshot);
      setActiveVariantId("default");
      setVariants((prev) => prev.map((variant) => (
        variant.id === "default" ? { ...variant, snapshot: null } : variant
      )));
    }

    toast.success(
      reassignedCount > 0
        ? `Variant deleted. ${reassignedCount} assignment${reassignedCount === 1 ? "" : "s"} moved to Default.`
        : "Variant deleted."
    );
  }, [activeVariantId, fileVariantMap, groupVariantMap, postVariantMap, hydrateFromSnapshot, variants]);

  const handleDeleteAllVariants = useCallback(() => {
    if (variants.length <= 1) return;

    const defaultVariant = variants.find((variant) => variant.id === "default");
    const defaultSnapshot = activeVariantId === "default"
      ? captureCurrentSnapshot()
      : defaultVariant?.snapshot;
    const clearedAssignments = Object.keys(fileVariantMap).length + Object.keys(groupVariantMap).length + Object.keys(postVariantMap).length;

    setFileVariantMap({});
    setGroupVariantMap({});
    setPostVariantMap({});
    setVariants([{ id: "default", name: "Default", snapshot: null }]);
    setSelectedFiles(new Set());

    if (activeVariantId !== "default" && defaultSnapshot) {
      hydrateFromSnapshot(defaultSnapshot);
    }

    setActiveVariantId("default");

    toast.success(
      clearedAssignments > 0
        ? `All variants deleted. ${clearedAssignments} assignment${clearedAssignments === 1 ? "" : "s"} moved to Default.`
        : "All variants deleted."
    );
  }, [
    activeVariantId,
    captureCurrentSnapshot,
    fileVariantMap,
    groupVariantMap,
    postVariantMap,
    hydrateFromSnapshot,
    variants,
  ]);

  // Sync variant cleanups when variants list changes
  useEffect(() => {
    const activeVariantIds = new Set(variants.map((v) => v.id))
    setFileVariantMap((prev) => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach((key) => {
        if (!activeVariantIds.has(next[key])) {
          delete next[key]
          changed = true
        }
      })
      return changed ? next : prev
    })
    setGroupVariantMap((prev) => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach((key) => {
        if (!activeVariantIds.has(next[key])) {
          delete next[key]
          changed = true
        }
      })
      return changed ? next : prev
    })
    setPostVariantMap((prev) => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach((key) => {
        if (!activeVariantIds.has(next[key])) {
          delete next[key]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [variants])

  // Clean file variant map if files are deleted
  useEffect(() => {
    const validFileIds = new Set([
      ...files.map((file) => file.isDrive ? file.id : file.uniqueId || file.name),
      ...driveFiles.map((file) => file.id),
      ...dropboxFiles.map((file) => file.dropboxId),
    ])
    setFileVariantMap((prev) => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach((key) => {
        if (!validFileIds.has(key)) {
          delete next[key]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [files, driveFiles, dropboxFiles])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Loading TikTok Ads...</p>
        </div>
      </div>
    )
  }

  if (!isTikTokLoggedIn) return null

  return (
    <>
      {showMobileBanner && (
        <div className="mobile-message fixed inset-0 bg-white flex flex-col items-center justify-center p-6 z-[100] lg:hidden">
          <div className="text-center max-w-md">
            <img src={DesktopIcon} alt="Desktop computer" className="w-24 h-24 mb-4 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Desktop Recommended</h1>
            <p className="text-gray-600 mb-6">
              Thanks for signing up! <br></br>Blip works best on a bigger screen. <br></br> We've sent you an email to help you<br></br> pick up from here.
            </p>
            <button
              onClick={() => setShowMobileBanner(false)}
              className="mt-4 px-6 py-2 text-sm text-white bg-blue-600 rounded-xl hover:text-blue-700 transition-colors"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1600px] mx-auto py-8 px-2 sm:px-4 md:px-6">
        <Toaster richColors position="bottom-left" closeButton />

        <Header showMessenger={showMessenger} hideMessenger={hideMessenger} />

        <main className="pt-4 pb-20">
          <div className="flex flex-col lg:flex-row gap-6 min-w-0">
            {/* Left Column: Form and Duplicator (55% width) */}
            <div className="flex-1 lg:flex-[55] min-w-0 space-y-6">
              <TikTokAdCreationForm
                advertiserId={selectedAdvertiser}
                advertisers={tiktokAdvertisers}
                onAdvertiserChange={setSelectedAdvertiser}
                advertiserPrefs={advertiserPrefs}

                // Lifted Form State
                adName={adName} setAdName={setAdName}
                adText={adText} setAdText={setAdText}
                cta={cta} setCta={setCta}
                landingUrl={landingUrl} setLandingUrl={setLandingUrl}
                videoFile={videoFile} setVideoFile={setVideoFile}
                videoPreview={videoPreview} setVideoPreview={setVideoPreview}
                driveFiles={driveFiles} setDriveFiles={setDriveFiles}
                dropboxFiles={dropboxFiles} setDropboxFiles={setDropboxFiles}
                selectedIdentity={selectedIdentity} setSelectedIdentity={setSelectedIdentity}
                sparkAuthCode={sparkAuthCode} setSparkAuthCode={setSparkAuthCode}
                urlMode={urlMode} setUrlMode={setUrlMode}
                adType={adType} setAdType={setAdType}

                // Form Fetching States
                campaigns={campaigns} setCampaigns={setCampaigns}
                adGroups={adGroups} setAdGroups={setAdGroups}
                selectedCampaign={selectedCampaign} setSelectedCampaign={setSelectedCampaign}
                selectedAdGroup={selectedAdGroup} setSelectedAdGroup={setSelectedAdGroup}
                duplicateAdGroup={duplicateAdGroup} setDuplicateAdGroup={setDuplicateAdGroup}
                newAdGroupName={newAdGroupName} setNewAdGroupName={setNewAdGroupName}
                identities={identities} setIdentities={setIdentities}
                files={files} setFiles={setFiles}

                // Variants Props
                variants={variants}
                setVariants={setVariants}
                activeVariantId={activeVariantId}
                setActiveVariantId={setActiveVariantId}
                switchVariant={switchVariant}
                handleAddVariant={handleAddVariant}
                handleDeleteVariant={handleDeleteVariant}
                handleDeleteAllVariants={handleDeleteAllVariants}
                isFormFieldModified={isFormFieldModified}
                fileVariantMap={fileVariantMap}
                setFileVariantMap={setFileVariantMap}
                groupVariantMap={groupVariantMap}
                setGroupVariantMap={setGroupVariantMap}
                postVariantMap={postVariantMap}
                setPostVariantMap={setPostVariantMap}
              />
            </div>

            {/* Right Column: Media Preview (45% width) */}
            <div className="flex-1 lg:flex-[45] min-w-0">
              <div className="sticky top-6">
                <ErrorBoundary>
                  <MediaPreview
                    files={[...files, ...driveFiles.map((f) => ({ ...f, isDrive: true }))]}
                    setFiles={setFiles}
                    importedPosts={importedPosts}
                    setImportedPosts={setImportedPosts}
                    driveFiles={driveFiles}
                    setDriveFiles={setDriveFiles}
                    dropboxFiles={dropboxFiles}
                    setDropboxFiles={setDropboxFiles}
                    frameioFiles={frameioFiles}
                    setFrameioFiles={setFrameioFiles}
                    importedFiles={importedFiles}
                    setImportedFiles={setImportedFiles}
                    videoThumbs={videoThumbs}
                    isCarouselAd={isCarouselAd}
                    adType={adType} // Pass adType to MediaPreview ('NORMAL' or 'SPARK')
                    enablePlacementCustomization={enablePlacementCustomization}
                    setEnablePlacementCustomization={setEnablePlacementCustomization}
                    fileGroups={fileGroups}
                    setFileGroups={setFileGroups}
                    selectedAdSets={selectedAdSets}
                    adSets={adSets}
                    duplicateAdSet={duplicateAdSet}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    selectedIgOrganicPosts={selectedIgOrganicPosts}
                    setSelectedIgOrganicPosts={setSelectedIgOrganicPosts}
                    variants={variants}
                    activeVariantId={activeVariantId}
                    handleAddVariant={handleAddVariant}
                    handleDeleteAllVariants={handleDeleteAllVariants}
                    fileVariantMap={fileVariantMap}
                    setFileVariantMap={setFileVariantMap}
                    groupVariantMap={groupVariantMap}
                    setGroupVariantMap={setGroupVariantMap}
                    postVariantMap={postVariantMap}
                    setPostVariantMap={setPostVariantMap}
                    hasSeenPowerupPopup={hasSeenPowerupPopup}
                    setShowPowerupPopup={setShowPowerupPopup}
                    isLaunchingMedia={false}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
