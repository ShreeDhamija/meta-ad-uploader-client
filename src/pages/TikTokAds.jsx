import DesktopIcon from '@/assets/Desktop.webp'
import Header from '@/components/header'
import MediaPreview from '@/components/media-preview'
import TikTokAdCreationForm from '@/components/tiktok/TikTokAdCreationForm'
import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useAuth } from '@/lib/AuthContext'
import useSubscription from '@/lib/useSubscriptionSettings'
import { useIntercom } from '@/lib/useIntercom'
import useTikTokAdvertiserSettings from '@/lib/useTikTokAdvertiserSettings'
import { saveTikTokSettings } from '@/lib/saveTikTokSettings'
import { Loader2 } from "lucide-react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import { v4 as uuidv4 } from "uuid"

const TIKTOK_CACHE_KEY = 'tiktok_ads_cache';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const isVideoFile = (file) => {
  if (!file) return false;
  const type = file.type || file.mimeType || "";
  if (type.startsWith("video/") || type === "video/quicktime") return true;

  const name = file.name || file.originalname || "";
  return /\.(mov|mp4|avi|webm|mkv|m4v)$/i.test(name);
};

const getFileId = (file) => {
  if (file.isDrive) return file.id;
  if (file.isDropbox) return file.dropboxId;
  if (file.isFrameio) return file.frameioId;
  if (file.isMetaLibrary) return file.type === 'image' ? file.hash : file.id;
  return file.uniqueId || file.name;
};

export default function TikTokAds() {
  const navigate = useNavigate()
  const { isTikTokLoggedIn, tiktokAdvertisers, refreshTikTokUser, isLoading: authLoading } = useTikTokAuth()
  const { isLoggedIn, authLoading: metaAuthLoading } = useAuth()
  const { hasActiveAccess, loading: subscriptionLoading } = useSubscription()
  const userHasActiveAccess = hasActiveAccess ? hasActiveAccess() : true
  const { showMessenger, hideMessenger } = useIntercom()

  const [selectedAdvertiser, setSelectedAdvertiser] = useState(() => {
    // 1. Check URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const preselected = urlParams.get('adsaccount') || urlParams.get('advertiser');
    if (preselected) {
      try {
        localStorage.setItem('last_selected_tiktok_advertiser', preselected);
      } catch (e) { }
      return preselected;
    }

    // 2. Check localStorage
    try {
      const lastSelected = localStorage.getItem('last_selected_tiktok_advertiser');
      if (lastSelected) return lastSelected;
    } catch (e) {
      console.error('Failed to read last selected advertiser:', e);
    }

    return '';
  });
  const [adName, setAdName] = useState('')
  const [adTexts, setAdTexts] = useState([''])
  const [cta, setCta] = useState(['SHOP_NOW'])
  const [landingUrl, setLandingUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [driveFiles, setDriveFiles] = useState([])
  const [dropboxFiles, setDropboxFiles] = useState([])
  const [selectedIdentity, setSelectedIdentity] = useState('')
  const [sparkAuthCodes, setSparkAuthCodes] = useState([''])
  const [urlMode, setUrlMode] = useState('WEBSITE')
  const [adType, setAdType] = useState('NORMAL')
  const [showMobileBanner, setShowMobileBanner] = useState(true)
  const [productName, setProductName] = useState("")
  const [productImageUrl, setProductImageUrl] = useState("")
  const [sellingPoints, setSellingPoints] = useState([])
  const [selectedSavedProductId, setSelectedSavedProductId] = useState("")


  // Read the 24-hour cache once at component creation (mirrors Meta's Home.jsx pattern).
  // Defined as a plain function — not a hook — so it's safe to call here before useState.
  const _readTikTokCache = () => {
    try {
      const raw = localStorage.getItem(TIKTOK_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) return data;
    } catch (e) {
      console.error('Failed to parse TikTok ads cache:', e);
    }
    return null;
  };
  const _tiktokCache = _readTikTokCache();

  // Only restore campaign/ad-group cache if it belongs to the same advertiser
  const _cacheMatchesAdvertiser = _tiktokCache?.selectedAdvertiser === (_tiktokCache?.selectedAdvertiser && selectedAdvertiser
    ? selectedAdvertiser : _tiktokCache?.selectedAdvertiser);

  // Lifted form fetching states (to snapshot campaign & ad group selections)
  const [campaigns, setCampaigns] = useState(() => (_tiktokCache?.selectedAdvertiser === selectedAdvertiser ? _tiktokCache?.campaigns : null) || [])
  const [adGroups, setAdGroups] = useState(() => (_tiktokCache?.selectedAdvertiser === selectedAdvertiser ? _tiktokCache?.adGroups : null) || [])
  const [selectedCampaign, setSelectedCampaign] = useState(() => (_tiktokCache?.selectedAdvertiser === selectedAdvertiser ? _tiktokCache?.selectedCampaign : null) || [])
  const [selectedAdGroup, setSelectedAdGroup] = useState(() => (_tiktokCache?.selectedAdvertiser === selectedAdvertiser ? _tiktokCache?.selectedAdGroup : null) || [])
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

  // Video thumbnail processing refs and effects
  const processingRef = useRef(new Set());
  const videoThumbsRef = useRef(videoThumbs);

  useEffect(() => {
    videoThumbsRef.current = videoThumbs;
  }, [videoThumbs]);

  const generateThumbnail = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.remove();
        clearTimeout(timeout);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject("Timeout");
      }, 8000);

      video.preload = "metadata";
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0.1;

      video.addEventListener("loadeddata", () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          const MAX_THUMB_SIZE = 320;
          const scale = Math.min(1, MAX_THUMB_SIZE / Math.max(video.videoWidth, video.videoHeight));

          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL("image/jpeg", 0.7);

          cleanup();
          resolve(dataURL);
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      video.addEventListener("error", () => {
        cleanup();
        reject("Error generating thumbnail");
      });
    });
  }, []);

  const getDriveVideoThumbnail = useCallback(async (file, signal) => {
    if (file.pickerThumbnail) {
      return file.pickerThumbnail.replace(/=s\d+$/, '=w400-h300');
    }
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?fields=thumbnailLink`,
        {
          headers: { Authorization: `Bearer ${file.accessToken}` },
          signal: signal
        }
      );
      if (!response.ok) throw new Error('Failed to fetch Drive thumbnail');
      const data = await response.json();
      if (data.thumbnailLink) {
        return data.thumbnailLink.replace(/=s\d+$/, '=w400-h300');
      }
      return "https://api.withblip.com/thumbnail.jpg";
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      return "https://api.withblip.com/thumbnail.jpg";
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const processThumbnails = async () => {
      // --- 1. LOCAL FILES ---
      const videoFiles = files.filter(file => {
        const fileId = getFileId(file);
        return isVideoFile(file) &&
          !file.isDrive &&
          !file.isDropbox &&
          !videoThumbsRef.current[fileId] &&
          !processingRef.current.has(fileId);
      });

      if (videoFiles.length > 0) {
        videoFiles.forEach(file => processingRef.current.add(getFileId(file)));
        const MAX_CONCURRENT = 2;
        const queue = [...videoFiles];

        const processNext = async () => {
          if (queue.length === 0 || abortController.signal.aborted) return;
          const file = queue.shift();
          const fileId = getFileId(file);

          try {
            const thumb = await generateThumbnail(file);
            if (!abortController.signal.aborted) {
              setVideoThumbs(prev => ({ ...prev, [fileId]: thumb }));
            }
          } catch (err) {
            console.error(`Thumbnail error for ${file.name}:`, err);
            if (!abortController.signal.aborted) {
              setVideoThumbs(prev => ({
                ...prev,
                [fileId]: "https://api.withblip.com/thumbnail.jpg"
              }));
            }
          } finally {
            processingRef.current.delete(fileId);
            if (queue.length > 0 && !abortController.signal.aborted) {
              if ('requestIdleCallback' in window) {
                requestIdleCallback(() => processNext(), { timeout: 100 });
              } else {
                setTimeout(processNext, 0);
              }
            }
          }
        };

        const initialPromises = [];
        for (let i = 0; i < Math.min(MAX_CONCURRENT, videoFiles.length); i++) {
          initialPromises.push(processNext());
        }
        await Promise.all(initialPromises);
      }

      // --- 2. GOOGLE DRIVE ---
      const driveFilesNeedingThumbs = driveFiles.filter(file => {
        const fileId = getFileId(file);
        return isVideoFile(file) &&
          !videoThumbsRef.current[fileId] &&
          !processingRef.current.has(fileId);
      });

      if (driveFilesNeedingThumbs.length > 0 && !abortController.signal.aborted) {
        driveFilesNeedingThumbs.forEach(file => processingRef.current.add(getFileId(file)));
        const MAX_DRIVE_CONCURRENT = 3;
        const driveQueue = [...driveFilesNeedingThumbs];

        const processNextDrive = async () => {
          if (driveQueue.length === 0 || abortController.signal.aborted) return;
          const file = driveQueue.shift();
          const fileId = getFileId(file);

          try {
            const thumbUrl = await getDriveVideoThumbnail(file, abortController.signal);
            if (!abortController.signal.aborted) {
              setVideoThumbs(prev => ({ ...prev, [fileId]: thumbUrl }));
            }
          } finally {
            processingRef.current.delete(fileId);
            if (driveQueue.length > 0 && !abortController.signal.aborted) {
              processNextDrive();
            }
          }
        };

        const drivePromises = [];
        for (let i = 0; i < Math.min(MAX_DRIVE_CONCURRENT, driveFilesNeedingThumbs.length); i++) {
          drivePromises.push(processNextDrive());
        }
      }

      // --- 3. DROPBOX ---
      const dropboxFilesNeedingThumbs = dropboxFiles.filter(file => {
        const fileId = file.dropboxId;
        return !videoThumbsRef.current[fileId] && !processingRef.current.has(fileId);
      });

      if (dropboxFilesNeedingThumbs.length > 0 && !abortController.signal.aborted) {
        dropboxFilesNeedingThumbs.forEach(file => processingRef.current.add(file.dropboxId));
        const BATCH_SIZE = 25;

        for (let i = 0; i < dropboxFilesNeedingThumbs.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) break;
          const batch = dropboxFilesNeedingThumbs.slice(i, i + BATCH_SIZE);
          const filesData = batch.map(f => ({ id: f.dropboxId, link: f.link }));

          try {
            const response = await fetch(`${API_BASE_URL}/api/dropbox/thumbnails/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ files: filesData }),
              signal: abortController.signal
            });

            if (response.ok) {
              const data = await response.json();
              const newThumbs = {};
              batch.forEach(file => {
                const dId = file.dropboxId;
                if (data.thumbnails && data.thumbnails[dId]) {
                  newThumbs[dId] = data.thumbnails[dId];
                } else {
                  newThumbs[dId] = file.icon || "https://api.withblip.com/thumbnail.jpg";
                }
              });
              setVideoThumbs(prev => ({ ...prev, ...newThumbs }));
            }
          } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Dropbox batch error:", error);
            const failedThumbs = {};
            batch.forEach(f => {
              failedThumbs[f.dropboxId] = "https://api.withblip.com/thumbnail.jpg";
            });
            setVideoThumbs(prev => ({ ...prev, ...failedThumbs }));
          } finally {
            batch.forEach(f => processingRef.current.delete(f.dropboxId));
          }
        }
      }

      // --- 4. FRAME.IO ---
      const frameioFilesNeedingThumbs = (frameioFiles || []).filter(file => {
        const fileId = file.frameioId;
        return !videoThumbsRef.current[fileId] && !processingRef.current.has(fileId);
      });

      if (frameioFilesNeedingThumbs.length > 0 && !abortController.signal.aborted) {
        const newThumbs = {};
        frameioFilesNeedingThumbs.forEach(file => {
          newThumbs[file.frameioId] = file.pickerThumbnail || "https://api.withblip.com/thumbnail.jpg";
        });
        setVideoThumbs(prev => ({ ...prev, ...newThumbs }));
      }
    };

    processThumbnails();

    return () => {
      abortController.abort();
      processingRef.current.clear();
    };
  }, [files, driveFiles, dropboxFiles, frameioFiles, generateThumbnail, getDriveVideoThumbnail, setVideoThumbs]);


  // Load preferences for selected advertiser
  const { settings: advertiserPrefs, refetch: refetchAdvertiserPrefs } = useTikTokAdvertiserSettings(selectedAdvertiser)

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

  useEffect(() => {
    localStorage.setItem('last_active_launcher', '/tiktok-ads');
  }, []);

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
    if (!authLoading && !metaAuthLoading && !isTikTokLoggedIn && !isLoggedIn) {
      navigate('/tiktok-login')
    }
  }, [isTikTokLoggedIn, isLoggedIn, authLoading, metaAuthLoading, navigate])

  // Auto-select first advertiser account
  useEffect(() => {
    if (tiktokAdvertisers.length > 0 && !selectedAdvertiser) {
      const firstId = tiktokAdvertisers[0].advertiser_id || tiktokAdvertisers[0].id
      setSelectedAdvertiser(firstId)
    }
  }, [tiktokAdvertisers, selectedAdvertiser])

  // Save selected advertiser to localStorage to persist selection across page navigations
  useEffect(() => {
    if (selectedAdvertiser) {
      try {
        localStorage.setItem('last_selected_tiktok_advertiser', selectedAdvertiser);
      } catch (e) { }
    }
  }, [selectedAdvertiser])

  // Cache TikTok ads form state (mirrors Meta's Home.jsx caching pattern)
  useEffect(() => {
    if (!selectedAdvertiser) {
      localStorage.removeItem(TIKTOK_CACHE_KEY);
      return;
    }
    const cacheData = {
      selectedAdvertiser,
      campaigns,
      selectedCampaign,
      adGroups,
      selectedAdGroup,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(TIKTOK_CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) { }
  }, [selectedAdvertiser, campaigns, selectedCampaign, adGroups, selectedAdGroup]);

  // Sync state with preferences when they load
  const restoredDefaultsRef = useRef({});
  useEffect(() => {
    if (advertiserPrefs && selectedAdvertiser) {
      // Check if we already restored defaults for this advertiser
      if (restoredDefaultsRef.current[selectedAdvertiser]) return;

      // 1. Default Identity (only if not already set)
      if (!selectedIdentity && advertiserPrefs.defaultIdentityId) {
        setSelectedIdentity(advertiserPrefs.defaultIdentityId);
      }

      // 2. Default CTA
      if (Array.isArray(cta) && cta.length === 1 && cta[0] === 'SHOP_NOW' && advertiserPrefs.defaultCTAs?.length > 0) {
        setCta(advertiserPrefs.defaultCTAs);
      }

      // 3. Default Landing URL
      if (!landingUrl && advertiserPrefs.links?.length > 0) {
        const defaultLink = advertiserPrefs.links.find(l => l.isDefault) || advertiserPrefs.links[0];
        setLandingUrl(defaultLink.url);
      }

      // 4. Default Ad Text — use default template if set, otherwise fall back to first available template
      if (adTexts.length === 1 && adTexts[0] === '' && advertiserPrefs.copyTemplates) {
        const templateName = advertiserPrefs.defaultTemplateName
          || Object.keys(advertiserPrefs.copyTemplates)[0]
          || '';
        const template = templateName ? advertiserPrefs.copyTemplates[templateName] : null;
        if (template && template.texts?.length > 0) {
          setAdTexts(template.texts);
        }
      }

      // Mark as restored
      restoredDefaultsRef.current[selectedAdvertiser] = true;
    }
  }, [advertiserPrefs, selectedAdvertiser]);

  // Auto-populate product from saved catalog selection in Firebase
  const catalogRestoredRef = useRef({});
  useEffect(() => {
    if (!selectedAdvertiser) return;
    if (catalogRestoredRef.current[selectedAdvertiser]) return;

    const uid = localStorage.getItem('tiktok_uid');
    const token = localStorage.getItem('tiktok_token');

    fetch(`${API_BASE_URL}/api/tiktok/catalog/selection?advertiserId=${selectedAdvertiser}`, {
      credentials: 'include',
      headers: {
        ...(uid && { 'x-tiktok-user-id': uid }),
        ...(token && { 'x-tiktok-token': token }),
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.selection?.product_id) {
          const sel = data.selection;
          // Only set if not already populated
          if (!productName) setProductName(sel.product_name || '');
          if (!productImageUrl) setProductImageUrl(sel.product_image_url || '');
          if (!selectedSavedProductId) setSelectedSavedProductId(sel.product_id || '');
          catalogRestoredRef.current[selectedAdvertiser] = true;
        }
      })
      .catch(err => console.warn('[TikTokAds] Could not load catalog selection:', err.message));
  }, [selectedAdvertiser]);

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
    adTexts,
    cta,
    landingUrl,
    selectedIdentity,
    sparkAuthCodes,
    urlMode,
    selectedCampaign,
    selectedAdGroup,
    duplicateAdGroup,
    newAdGroupName,
    productName,
    productImageUrl,
    sellingPoints,
    selectedSavedProductId,
  }), [
    adName,
    adTexts,
    cta,
    landingUrl,
    selectedIdentity,
    sparkAuthCodes,
    urlMode,
    selectedCampaign,
    selectedAdGroup,
    duplicateAdGroup,
    newAdGroupName,
    productName,
    productImageUrl,
    sellingPoints,
    selectedSavedProductId,
  ]);

  const hydrateFromSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    setAdName(snapshot.adName || "");
    setAdTexts(snapshot.adTexts || [""]);
    const rawCta = snapshot.cta;
    setCta(Array.isArray(rawCta) ? rawCta : (rawCta ? [rawCta] : ["SHOP_NOW"]));
    setLandingUrl(snapshot.landingUrl || "");
    setSelectedIdentity(snapshot.selectedIdentity || "");
    setSparkAuthCodes(snapshot.sparkAuthCodes || [""]);
    setUrlMode(snapshot.urlMode || "WEBSITE");
    const rawCampaign = snapshot.selectedCampaign || "";
    setSelectedCampaign(Array.isArray(rawCampaign) ? rawCampaign : (rawCampaign ? [rawCampaign] : []));
    const rawAdGroup = snapshot.selectedAdGroup || "";
    setSelectedAdGroup(Array.isArray(rawAdGroup) ? rawAdGroup : (rawAdGroup ? [rawAdGroup] : []));
    setDuplicateAdGroup(snapshot.duplicateAdGroup || "");
    setNewAdGroupName(snapshot.newAdGroupName || "");
    setProductName(snapshot.productName || "");
    setProductImageUrl(snapshot.productImageUrl || "");
    setSellingPoints(snapshot.sellingPoints || []);
    setSelectedSavedProductId(snapshot.selectedSavedProductId || "");
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

  if (authLoading || metaAuthLoading || subscriptionLoading) return null

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
            <div className={`flex-1 lg:flex-[55] min-w-0 space-y-6 ${(!userHasActiveAccess || !isTikTokLoggedIn) ? 'pointer-events-none opacity-40 cursor-not-allowed select-none' : ''}`}>
              <TikTokAdCreationForm
                advertiserId={selectedAdvertiser}
                advertisers={tiktokAdvertisers}
                onAdvertiserChange={setSelectedAdvertiser}
                advertiserPrefs={advertiserPrefs}
                refetchAdvertiserPrefs={refetchAdvertiserPrefs}

                // Lifted Form State
                adName={adName} setAdName={setAdName}
                adTexts={adTexts} setAdTexts={setAdTexts}
                cta={cta} setCta={setCta}
                landingUrl={landingUrl} setLandingUrl={setLandingUrl}
                productName={productName} setProductName={setProductName}
                productImageUrl={productImageUrl} setProductImageUrl={setProductImageUrl}
                sellingPoints={sellingPoints} setSellingPoints={setSellingPoints}
                selectedSavedProductId={selectedSavedProductId} setSelectedSavedProductId={setSelectedSavedProductId}
                videoFile={videoFile} setVideoFile={setVideoFile}
                videoPreview={videoPreview} setVideoPreview={setVideoPreview}
                driveFiles={driveFiles} setDriveFiles={setDriveFiles}
                dropboxFiles={dropboxFiles} setDropboxFiles={setDropboxFiles}
                selectedIdentity={selectedIdentity} setSelectedIdentity={setSelectedIdentity}
                sparkAuthCodes={sparkAuthCodes} setSparkAuthCodes={setSparkAuthCodes}
                urlMode={urlMode} setUrlMode={setUrlMode}
                adType={adType} setAdType={setAdType}
                importedPosts={importedPosts} setImportedPosts={setImportedPosts}

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
            <div className={`flex-1 lg:flex-[45] min-w-0 ${(!userHasActiveAccess || !isTikTokLoggedIn) ? 'pointer-events-none opacity-40 cursor-not-allowed select-none' : ''}`}>
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
                    handleAddVariant={() => { }} // Safe no-op to disable adding variants in TikTok
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
