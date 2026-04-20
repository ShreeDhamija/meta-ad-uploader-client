"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import axios from "axios"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate, deleteCopyTemplates } from "@/lib/deleteCopyTemplate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import TextareaAutosize from 'react-textarea-autosize'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users, ChevronDown, Loader, Plus, Trash2, Upload, ChevronsUpDown, RefreshCcw, CircleX, AlertTriangle, RotateCcw, Eye, FileText, X, Clock, ChevronLeft, ChevronRight, Ban, Phone, ArrowUpDown, Check, Info } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/lib/AuthContext"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import ScheduleDateTimePicker from "@/components/ui/ScheduleDateTimePicker"
import ShopDestinationSelector from "@/components/shop-destination-selector"
import PostSelectorInline from "@/components/PostIDSelector"
import MetaMediaLibraryModal from "@/components/MetaMediaLibraryModal";
import { v4 as uuidv4 } from 'uuid';
import ConfigIcon from '@/assets/icons/plus.svg?react';
import FacebookIcon from '@/assets/icons/fb.svg?react';
import InstagramIcon from '@/assets/icons/ig.svg?react';
import DropboxIcon from '@/assets/Dropbox.png';
import LabelIcon from '@/assets/icons/label.svg?react';
import TemplateIcon from '@/assets/icons/file.svg?react';
import LinkIcon from '@/assets/icons/link.svg?react';
import CTAIcon from '@/assets/icons/cta.svg?react';
import { useNavigate } from "react-router-dom"
import CogIcon from '@/assets/icons/cog.svg?react';
import RocketIcon2 from '@/assets/icons/rocket.svg?react';
import CheckIcon from '@/assets/icons/check.svg?react';
import UploadIcon from '@/assets/icons/upload.svg?react';
import QueueIcon from '@/assets/icons/queue.svg?react';
import PartialSuccess from '@/assets/icons/partialsuccess.svg?react';
import pLimit from 'p-limit';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';



const useAdCreationProgress = (jobId, isCreatingAds) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [metaData, setMetadata] = useState({});



  const resetProgress = useCallback(() => {
    setProgress(0);
    setMessage('');
    setStatus('idle');
  }, []);


  useEffect(() => {
    if (!jobId) {
      setProgress(0);
      setMessage('');
      setStatus('idle');
      return;
    }


    // Reset state for new job
    setProgress(0);
    setMessage('');
    setStatus('idle');

    // Track all cleanup items
    let eventSource = null;
    let retryTimeoutId = null;
    let connectionTimeoutId = null;
    let isSubscribed = true;
    let retryCount = 0;
    let jobNotFoundCount = 0; // Separate counter for job not found

    const baseRetryDelay = 500;
    const maxRetryDelay = 5000;
    const maxConnectionRetries = 10; // For connection errors
    const maxJobNotFoundRetries = 50; // More patient for job not found (15 seconds total)
    const connectionTimeout = 10000;

    // Complete cleanup function
    const cleanup = () => {
      isSubscribed = false;

      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }

      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }

      if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close();
        eventSource = null;
      }
    };

    // Separate retry logic for different scenarios
    const scheduleConnectionRetry = (reason) => {
      if (!isSubscribed || retryCount >= maxConnectionRetries) {
        if (retryCount >= maxConnectionRetries) {
          // console.error('Max connection retry attempts reached');
          setStatus('error');
          setMessage('Connection failed. Please check your internet connection.');
        }
        return;
      }

      retryCount++;
      const delay = Math.min(
        baseRetryDelay * Math.pow(2, retryCount - 1),
        maxRetryDelay
      );



      retryTimeoutId = setTimeout(() => {
        if (isSubscribed) connectSSE();
      }, delay);
    };

    const scheduleJobRetry = () => {
      if (!isSubscribed || jobNotFoundCount >= maxJobNotFoundRetries) {
        if (jobNotFoundCount >= maxJobNotFoundRetries) {
          // console.error('Job not found after maximum attempts - job may not exist');
          setStatus('job-not-found'); // NEW: Specific status instead of 'error'
          setMessage('Job not found. The task may have expired or been cancelled.');
        }
        return;
      }

      jobNotFoundCount++;
      // Shorter delay for job not found since server is responding
      const delay = Math.min(baseRetryDelay, 1000);

      retryTimeoutId = setTimeout(() => {
        if (isSubscribed) connectSSE();
      }, delay);
    };

    const connectSSE = () => {
      if (!isSubscribed) return;

      try {


        // Close any existing connection
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        eventSource = new EventSource(`${API_BASE_URL}/api/progress/${jobId}`);

        // Set connection timeout
        connectionTimeoutId = setTimeout(() => {
          if (eventSource && eventSource.readyState === EventSource.CONNECTING) {
            // console.warn('SSE connection timeout');
            eventSource.close();
            scheduleConnectionRetry('Connection timeout');
          }
        }, connectionTimeout);

        eventSource.onopen = () => {
          retryCount = 0; // Reset connection retry counter

          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }
        };

        eventSource.onmessage = (event) => {
          if (!isSubscribed) {
            cleanup();
            return;
          }

          try {
            const data = JSON.parse(event.data);

            // Handle job not found with patience
            if (data.message === 'Job not found') {

              // Close current connection cleanly but don't cleanup everything
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }

              // Reset connection retry counter since server responded
              retryCount = 0;

              // Schedule patient retry for job availability
              scheduleJobRetry();
              return;
            }

            // Job found! Reset all counters and update state
            if (isSubscribed) {
              retryCount = 0;
              jobNotFoundCount = 0;

              setProgress(data.progress);
              setMessage(data.message);
              setStatus(data.status);
              // ADD: Store metadata
              setMetadata({
                successCount: data.successCount,
                failureCount: data.failureCount,
                totalCount: data.totalCount,
                errorMessages: data.errorMessages // NEW

              });

              // Auto-cleanup on job completion
              if (data.status === 'complete' || data.status === 'error' || data.status === 'partial-success' || data.status === 'cancelled') {
                cleanup();
              }
            }
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
            // Don't retry on parse errors, just log them
          }
        };

        eventSource.onerror = (error) => {
          // console.error('❌ SSE Error:', error);

          if (!isSubscribed) {
            cleanup();
            return;
          }

          // Close the failed connection
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Clear connection timeout if it exists
          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }

          // Retry connection errors with exponential backoff
          scheduleConnectionRetry('Connection error');
        };

      } catch (error) {
        // console.error('Failed to create EventSource:', error);
        if (isSubscribed) {
          setStatus('error');
          setMessage('Failed to initialize progress tracking.');
        }
        cleanup();
      }
    };

    // Start the connection
    connectSSE();

    // Cleanup on unmount or jobId change
    return cleanup;
  }, [jobId]);



  return { progress, message, status, metaData, resetProgress };
};


function withUniqueId(file) {
  if (file.isDrive || file.isDropbox) return file; // Drive/Dropbox already have unique id
  if (file.uniqueId) return file; // already tagged
  file.uniqueId = `${file.name}-${file.lastModified || Date.now()}-${uuidv4()}`;
  return file;
}

// ADD THIS NEW FUNCTION:
const getFileId = (file) => {
  if (file.isDrive) return file.id;
  if (file.isDropbox) return file.dropboxId;
  if (file.isMetaLibrary) return file.type === 'image' ? file.hash : file.id;
  return file.uniqueId || file.name;
};

const isVideoFile = (file) => {
  if (!file) return false;
  const type = file.type || file.mimeType || "";
  if (type.startsWith("video/") || type === "video/quicktime") return true;

  const name = file.name || file.originalname || "";
  return /\.(mov|mp4|avi|webm|mkv|m4v)$/i.test(name);
};





const getMimeFromName = (name) => {
  const ext = (name || '').split('.').pop().toLowerCase();
  const mimeMap = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'm4v': 'video/x-m4v',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };
  return mimeMap[ext] || 'application/octet-stream';
};

const VARIANT_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const getGroupFileIds = (group) => Array.isArray(group) ? group : (group?.fileIds || []);

const normalizeFileGroups = (groups = []) => groups.map((group) => (
  Array.isArray(group)
    ? { id: uuidv4(), fileIds: [...group] }
    : { ...group, id: group.id || uuidv4(), fileIds: [...(group.fileIds || [])] }
));

function VariantDot({ variantId, variants }) {
  const idx = variants.findIndex((variant) => variant.id === variantId);
  const color = VARIANT_COLORS[Math.max(0, idx) % VARIANT_COLORS.length];

  return <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: color }} />;
}


const extractFolderId = (url) => {
  const idMatch = url.match(/[-\w]{25,}/);
  return idMatch ? idMatch[0] : null;
};

/**
 * Hook to fetch approved partnership ad partners for a given Instagram account
 */
const usePartnershipAdPartners = (instagramAccountId, pageAccessToken) => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPartners = useCallback(async () => {
    // Skip if missing required params
    if (!instagramAccountId || !pageAccessToken) {
      setPartners([]);
      return;
    }

    setIsLoading(true);
    setError(null);


    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/partnership-ads/partners`,
        {
          params: { instagramAccountId, pageAccessToken },
          withCredentials: true
        }
      );

      // Map to cleaner format
      const approvedPartners = (response.data.data || []).map(partner => ({
        id: partner.id,
        creatorIgId: partner.creator_ig_id,
        creatorUsername: partner.creator_username,
        creatorFbPageId: partner.creator_fb_page_id,
      }));

      setPartners(approvedPartners);
    } catch (err) {
      setError(err.response?.data?.error || 'Re-authenticate the app and approve additional permissions to make partnership ads');
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  }, [instagramAccountId, pageAccessToken]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return { partners, isLoading, error, refetch: fetchPartners };
};

const ErrorFileName = ({ name }) => {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 50;
  const needsTruncation = name.length > LIMIT;
  const display = !needsTruncation || expanded ? name : name.slice(0, LIMIT) + '…';
  return (
    <li className="break-words text-[#FF0000] leading-snug">
      {display}
      {needsTruncation && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-1 text-[#FF8080] hover:text-[#FF0000] underline underline-offset-2"
        >
          View Full Ad Name
        </button>
      )}
    </li>
  );
};


export default function AdCreationForm({
  isLoading,
  setIsLoading,
  adAccounts,
  setAdAccounts,
  pages,
  setPages,
  pagesLoading,
  pageId,
  setPageId,
  instagramAccountId,
  setInstagramAccountId,
  adName,
  setAdName,
  adOrder,
  setAdOrder,
  selectedItems,
  setSelectedItems,
  onItemToggle,
  adValues,
  setAdValues,
  messages,
  setMessages,
  headlines,
  setHeadlines,
  descriptions,
  setDescriptions,
  link,
  setLink,
  customLink,
  setCustomLink,
  phoneNumber,
  setPhoneNumber,
  showCustomLink,
  setShowCustomLink,
  cta,
  setCta,
  thumbnail,
  setThumbnail,
  files,
  setFiles,
  importedPosts,
  setImportedPosts,
  importedFiles,
  setImportedFiles,
  selectedIgOrganicPosts,
  setSelectedIgOrganicPosts,
  videoThumbs,
  setVideoThumbs,
  selectedAdSets,
  setSelectedAdSets,
  duplicateAdSet,
  setDuplicateAdSet,
  campaigns,
  selectedCampaign,
  setSelectedCampaign,
  selectedAdAccount,
  setSelectedAdAccount,
  adSets,
  copyTemplates,
  defaultTemplateName,
  selectedTemplate,
  setSelectedTemplate,
  driveFiles,
  setDriveFiles,
  dropboxFiles,
  setDropboxFiles,
  selectedShopDestination,
  setSelectedShopDestination,
  selectedShopDestinationType,
  setSelectedShopDestinationType,
  selectedForm,
  setSelectedForm,
  newAdSetName,
  setNewAdSetName,
  launchPaused,
  setLaunchPaused,
  isCarouselAd,
  setIsCarouselAd,
  adType,
  setAdType,
  enablePlacementCustomization,
  setEnablePlacementCustomization,
  fileGroups,
  setFileGroups,
  adAccountSettings,
  adNameFormulaV2,
  setAdNameFormulaV2,
  campaignObjective,
  selectedFiles,
  setSelectedFiles,
  useExistingPosts,
  refetchCopyTemplates,
  preferredTemplateRef,
  onAdSetCountsCreated,
  onAdSetCreated,
  isPartnershipAd,
  setIsPartnershipAd,
  partnerIgAccountId,
  setPartnerIgAccountId,
  partnerFbPageId,
  setPartnerFbPageId,
  partnershipIdentityMode,
  setPartnershipIdentityMode,
  adScheduleStartTime,
  setAdScheduleStartTime,
  adScheduleEndTime,
  setAdScheduleEndTime,
  variants,
  setVariants,
  activeVariantId,
  setActiveVariantId,
  switchVariant,
  handleAddVariant,
  handleDeleteVariant,
  handleDeleteAllVariants,
  isFormFieldModified,
  fileVariantMap,
  setFileVariantMap,
  groupVariantMap,
  setGroupVariantMap,
  postVariantMap,
  setPostVariantMap,
  onBeforeMediaClear
}) {
  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow";
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`;
  const formDropdownTriggerChrome = `${formFieldChrome} hover:bg-white`;
  const formTextareaChrome = "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0";
  const renderDiffMark = (fieldKeys) => (
    isFormFieldModified?.(fieldKeys) ? <span className="text-red-500 font-semibold">*</span> : null
  );

  // Local state
  const [showPostSelector, setShowPostSelector] = useState(false);
  const navigate = useNavigate()
  const [openPage, setOpenPage] = useState(false)
  const [googleAuthStatus, setGoogleAuthStatus] = useState({
    checking: true,
    authenticated: false,
    accessToken: null
  });

  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderLinkValue, setFolderLinkValue] = useState("");
  const [isImportingFolder, setIsImportingFolder] = useState(false);
  const pickerInstanceRef = useRef(null);

  //gogle drive pickers
  const [accessToken, setAccessToken] = useState(null)
  //S3 States
  const [uploadingToS3, setUploadingToS3] = useState(false)

  const [pageSearchValue, setPageSearchValue] = useState("")
  const { isLoggedIn } = useAuth()
  const [openInstagram, setOpenInstagram] = useState(false)
  const [instagramSearchValue, setInstagramSearchValue] = useState("")
  const [publishPending, setPublishPending] = useState(false);
  const [isQueueingJobs, setIsQueueingJobs] = useState(false);
  const [isPagesLoading, setIsPagesLoading] = useState(false);
  // const [isPostSelectorOpen, setIsPostSelectorOpen] = useState(false)
  const [linkCustomStates, setLinkCustomStates] = useState({}) // Track which carousel links are custom

  //Porgress Trackers
  const [isCreatingAds, setIsCreatingAds] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const { progress: trackedProgress, message: trackedMessage, status, metaData, resetProgress } = useAdCreationProgress(jobId, isCreatingAds);
  const [showCompletedView, setShowCompletedView] = useState(false);
  // Add these new states at the top of AdCreationForm
  const [jobQueue, setJobQueue] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isJobTrackerExpanded, setIsJobTrackerExpanded] = useState(true);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [hasStartedAnyJob, setHasStartedAnyJob] = useState(false);
  const [currentAbortController, setCurrentAbortController] = useState(null);
  const isInPromisePhase = useRef(false); // ADD THIS
  const currentJobIdRef = useRef(null); // ADD THIS
  const [isCancelling, setIsCancelling] = useState(false);

  const [preserveMedia, setPreserveMedia] = useState(false);

  const [liveProgress, setLiveProgress] = useState({
    completed: 0,
    succeeded: 0,
    failed: 0,
    total: 0,
    errors: []   // ← ADD
  });

  // const [isCarouselAd, setIsCarouselAd] = useState(false);
  const [applyTextToAllCards, setApplyTextToAllCards] = useState(false);
  const [applyHeadlinesToAllCards, setApplyHeadlinesToAllCards] = useState(false);
  const S3_UPLOAD_THRESHOLD = 1 * 1024 * 1024; // 40 MB
  const [usePostID, setUsePostID] = useState(false);
  const [leadgenForms, setLeadgenForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);


  // Partnership Ads State
  const [openPartnerSelector, setOpenPartnerSelector] = useState(false);
  const [partnerSearchValue, setPartnerSearchValue] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  const [isSavingNew, setIsSavingNew] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [newTemplateNameInput, setNewTemplateNameInput] = useState("");
  const [showSaveNewDialog, setShowSaveNewDialog] = useState(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [sortMode, setSortMode] = useState(() => localStorage.getItem("templateSortMode") || "default");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false);
  const [showDeleteAllVariantsDialog, setShowDeleteAllVariantsDialog] = useState(false);
  const wasPhoneCallCtaAutoAppliedRef = useRef(false);

  const [activeIgCaptionIndex, setActiveIgCaptionIndex] = useState(0);




  const formatScheduleLabel = () => {
    if (!adScheduleStartTime && !adScheduleEndTime) return null;
    const fmt = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    };
    const parts = [];
    if (adScheduleStartTime) parts.push(`Start: ${fmt(adScheduleStartTime)}`);
    if (adScheduleEndTime) parts.push(`End: ${fmt(adScheduleEndTime)}`);
    return parts.join(" · ");
  };

  // Get the selected page's access token
  const selectedPageAccessToken = useMemo(() => {
    const selectedPage = pages.find(p => p.id === pageId);
    return selectedPage?.access_token || null;
  }, [pages, pageId]);

  // Fetch partners only when toggle is ON (lazy loading)
  const {
    partners: availablePartners,
    isLoading: isLoadingPartners,
    error: partnersError,
    refetch: refetchPartners
  } = usePartnershipAdPartners(
    isPartnershipAd ? instagramAccountId : null,
    isPartnershipAd ? selectedPageAccessToken : null
  );

  // Filter partners based on search
  const filteredPartners = useMemo(() => {
    if (!partnerSearchValue) return availablePartners;
    const searchLower = partnerSearchValue.toLowerCase();
    return availablePartners.filter(partner =>
      (partner.creatorUsername ?? "").toLowerCase().includes(searchLower) ||
      partner.creatorIgId?.includes(partnerSearchValue)
    );
  }, [availablePartners, partnerSearchValue]);

  // Get selected partner for display
  const selectedPartner = useMemo(() => {
    return availablePartners.find(p => p.creatorIgId === partnerIgAccountId);
  }, [availablePartners, partnerIgAccountId]);

  // Handle partner selection - sets both IG and FB IDs
  const handlePartnerSelect = (partner) => {
    setPartnerIgAccountId(partner.creatorIgId);
    setPartnerFbPageId(partner.creatorFbPageId);
    setOpenPartnerSelector(false);
  };

  // Handle partnership toggle
  const handlePartnershipToggle = (checked) => {
    setIsPartnershipAd(checked);
    if (!checked) {
      setPartnerIgAccountId("");
      setPartnerFbPageId("");
    }
  };



  const refreshPage = useCallback(() => {
    window.location.reload();
  }, []);
  const fileGroupsAsArrays = useMemo(
    () => fileGroups.map((group) => getGroupFileIds(group)),
    [fileGroups]
  );

  const groupedFileIds = useMemo(
    () => new Set(fileGroups.flatMap((group) => getGroupFileIds(group))),
    [fileGroups]
  );

  const liveVariantSnapshot = useMemo(() => ({
    headlines,
    descriptions,
    messages,
    link,
    cta,
    phoneNumber,
    selectedAdAccount,
    selectedCampaign,
    selectedAdSets,
    adSets,
    duplicateAdSet,
    newAdSetName,
    pageId,
    instagramAccountId,
    selectedShopDestination,
    selectedShopDestinationType,
    selectedForm,
    isPartnershipAd,
    partnerIgAccountId,
    partnerFbPageId,
    partnershipIdentityMode,
    adNameFormulaV2,
    adValues,
    adScheduleStartTime,
    adScheduleEndTime,
    launchPaused,
  }), [
    headlines,
    descriptions,
    messages,
    link,
    cta,
    phoneNumber,
    selectedAdAccount,
    selectedCampaign,
    selectedAdSets,
    adSets,
    duplicateAdSet,
    newAdSetName,
    pageId,
    instagramAccountId,
    selectedShopDestination,
    selectedShopDestinationType,
    selectedForm,
    isPartnershipAd,
    partnerIgAccountId,
    partnerFbPageId,
    partnershipIdentityMode,
    adNameFormulaV2,
    adValues,
    adScheduleStartTime,
    adScheduleEndTime,
    launchPaused,
  ]);

  const getVariantState = useCallback((variantId) => {
    if (variantId === activeVariantId) return liveVariantSnapshot;
    return variants.find((variant) => variant.id === variantId)?.snapshot || null;
  }, [activeVariantId, liveVariantSnapshot, variants]);

  const hasMediaInFormData = useCallback((formData) => (
    (formData.files?.length || 0) > 0 ||
    (formData.driveFiles?.length || 0) > 0 ||
    (formData.dropboxFiles?.length || 0) > 0 ||
    (formData.importedPosts?.length || 0) > 0 ||
    (formData.importedFiles?.length || 0) > 0 ||
    (formData.selectedIgOrganicPosts?.length || 0) > 0
  ), []);

  const computeAdCount = useCallback((formData) => {
    if (!hasMediaInFormData(formData)) return 0;

    const isDynamicAdSet = () => {
      if (formData.duplicateAdSet) {
        const originalAdset = formData.adSets.find((adset) => adset.id === formData.duplicateAdSet);
        return originalAdset?.is_dynamic_creative || false;
      }

      return (formData.selectedAdSets || []).some((adsetId) => {
        const adset = formData.adSets.find((entry) => entry.id === adsetId);
        return adset?.is_dynamic_creative || false;
      });
    };

    if ((formData.importedPosts?.length || 0) > 0) {
      return formData.importedPosts.length * (formData.selectedAdSets.length || 1);
    }

    if (formData.isCarouselAd) {
      const carouselGroupCount = formData.fileGroups.length > 0 ? formData.fileGroups.length : 1;
      return carouselGroupCount * (formData.selectedAdSets.length || 1);
    }

    if (isDynamicAdSet()) {
      return formData.selectedAdSets.length || 1;
    }

    if (formData.enablePlacementCustomization && formData.fileGroups.length > 0) {
      const groupedIds = new Set(formData.fileGroups.flat());
      const ungroupedCount = [
        ...formData.files,
        ...formData.driveFiles.map((file) => ({ ...file, isDrive: true })),
        ...formData.dropboxFiles.map((file) => ({ ...file, isDropbox: true })),
        ...formData.importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
      ].filter((file) => !groupedIds.has(getFileId(file))).length;

      return formData.fileGroups.length + ungroupedCount;
    }

    if (formData.adType === 'flexible') {
      return formData.fileGroups.length > 0
        ? formData.fileGroups.length * (formData.selectedAdSets.length || 1)
        : (formData.selectedAdSets.length || 1);
    }

    if ((formData.selectedIgOrganicPosts?.length || 0) > 0) {
      return formData.selectedIgOrganicPosts.length * (formData.selectedAdSets.length || 1);
    }

    return formData.files.length + formData.driveFiles.length + formData.importedFiles.length + formData.dropboxFiles.length;
  }, [hasMediaInFormData]);

  const countFilesForVariant = useCallback((variantId) => {
    const variantGroups = fileGroups.filter(
      (group) => (groupVariantMap[group.id] || 'default') === variantId
    );
    const allFiles = [
      ...files,
      ...driveFiles.map((file) => ({ ...file, isDrive: true })),
      ...dropboxFiles.map((file) => ({ ...file, isDropbox: true })),
      ...importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
    ];

    const ungroupedCount = allFiles.filter((file) => {
      const fileId = getFileId(file);
      if (groupedFileIds.has(fileId)) return false;
      return (fileVariantMap[fileId] || 'default') === variantId;
    }).length;

    const importedPostsForVariant = importedPosts.filter(
      (post) => (postVariantMap[`post:${post.id}`] || 'default') === variantId
    ).length;
    const igOrganicPostsForVariant = selectedIgOrganicPosts.filter(
      (post) => (postVariantMap[`igpost:${post.source_instagram_media_id}`] || 'default') === variantId
    ).length;
    const postsForVariant = importedPostsForVariant + igOrganicPostsForVariant;

    if (isCarouselAd || enablePlacementCustomization || adType === 'flexible') {
      const defaultOnly = variantId === 'default'
        ? [
          ...files,
          ...driveFiles.map((file) => ({ ...file, isDrive: true })),
          ...dropboxFiles.map((file) => ({ ...file, isDropbox: true })),
          ...importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
        ].filter((file) => !groupedFileIds.has(getFileId(file))).length
        : 0;

      return variantGroups.length + (adType === 'flexible' && fileGroups.length === 0 ? ungroupedCount : defaultOnly) +
        postsForVariant;
    }

    return ungroupedCount + postsForVariant;
  }, [
    adType,
    driveFiles,
    dropboxFiles,
    enablePlacementCustomization,
    fileGroups,
    fileVariantMap,
    files,
    groupedFileIds,
    groupVariantMap,
    importedFiles,
    importedPosts,
    isCarouselAd,
    postVariantMap,
    selectedIgOrganicPosts,
  ]);

  const captureFormDataAsJob = useCallback((variantId = 'default') => {
    const variantState = getVariantState(variantId);
    if (!variantState) return null;

    const variantAdSets = Array.isArray(variantState.adSets) ? variantState.adSets : adSets;

    const filterFiles = (items, mapper = (item) => item) => items.filter((item) => {
      const file = mapper(item);
      const fileId = getFileId(file);
      const owningGroup = fileGroups.find((group) => getGroupFileIds(group).includes(fileId));

      if (owningGroup) {
        return (groupVariantMap[owningGroup.id] || 'default') === variantId;
      }

      if (adType === 'flexible' && fileGroups.length > 0) {
        return false;
      }

      if (isCarouselAd || enablePlacementCustomization) {
        return variantId === 'default';
      }

      return (fileVariantMap[fileId] || 'default') === variantId;
    });

    const variantFiles = filterFiles(files);
    const variantDriveFiles = filterFiles(driveFiles, (file) => ({ ...file, isDrive: true }));
    const variantDropboxFiles = filterFiles(dropboxFiles, (file) => ({ ...file, isDropbox: true }));
    const variantImportedFiles = filterFiles(importedFiles, (file) => ({ ...file, isMetaLibrary: true }));
    const variantFileGroups = fileGroups.filter(
      (group) => (groupVariantMap[group.id] || 'default') === variantId
    );
    const variantImportedPosts = importedPosts.filter(
      (post) => (postVariantMap[`post:${post.id}`] || 'default') === variantId
    );
    const variantIgOrganicPosts = selectedIgOrganicPosts.filter(
      (post) => (postVariantMap[`igpost:${post.source_instagram_media_id}`] || 'default') === variantId
    );

    const formData = {
      headlines: [...(variantState.headlines || [''])],
      descriptions: [...(variantState.descriptions || [''])],
      messages: [...(variantState.messages || [''])],
      link: [...(variantState.link || [''])],
      phoneNumber: variantState.phoneNumber || '',
      cta: variantState.cta || 'LEARN_MORE',
      files: [...variantFiles],
      driveFiles: [...variantDriveFiles],
      dropboxFiles: [...variantDropboxFiles],
      videoThumbs: { ...videoThumbs },
      thumbnail,
      importedPosts: [...variantImportedPosts],
      importedFiles: [...variantImportedFiles],
      selectedIgOrganicPosts: [...variantIgOrganicPosts],
      selectedAdSets: [...(variantState.selectedAdSets || [])],
      duplicateAdSet: variantState.duplicateAdSet || '',
      newAdSetName: variantState.newAdSetName || '',
      pageId: variantState.pageId || '',
      instagramAccountId: variantState.instagramAccountId || '',
      selectedAdAccount: variantState.selectedAdAccount || '',
      selectedCampaign: Array.isArray(variantState.selectedCampaign)
        ? [...variantState.selectedCampaign]
        : variantState.selectedCampaign,
      launchPaused: Boolean(variantState.launchPaused),
      adType,
      isCarouselAd,
      enablePlacementCustomization,
      fileGroups: variantFileGroups.map((group) => [...getGroupFileIds(group)]),
      selectedShopDestination: variantState.selectedShopDestination || '',
      selectedShopDestinationType: variantState.selectedShopDestinationType || '',
      selectedForm: variantState.selectedForm || null,
      isPartnershipAd: Boolean(variantState.isPartnershipAd),
      partnerIgAccountId: variantState.partnerIgAccountId || '',
      partnerFbPageId: variantState.partnerFbPageId || '',
      partnershipIdentityMode: variantState.partnershipIdentityMode || 'dynamic',
      adNameFormulaV2: variantState.adNameFormulaV2 ? { ...variantState.adNameFormulaV2 } : null,
      adValues: variantState.adValues ? JSON.parse(JSON.stringify(variantState.adValues)) : {},
      adScheduleStartTime: variantState.adScheduleStartTime || null,
      adScheduleEndTime: variantState.adScheduleEndTime || null,
      adSets: [...variantAdSets],
      adSetDisplayName: variantState.duplicateAdSet
        ? (variantState.newAdSetName || 'New Ad Set')
        : (variantState.selectedAdSets || []).length === 1
          ? (variantAdSets.find((entry) => entry.id === variantState.selectedAdSets[0])?.name || 'selected ad set')
          : `${(variantState.selectedAdSets || []).length} adsets`,
    };

    return {
      id: uuidv4(),
      createdAt: Date.now(),
      status: 'queued',
      adCount: computeAdCount(formData),
      variantId,
      variantName: variants.find((variant) => variant.id === variantId)?.name || 'Default',
      showVariantLabel: false,
      formData,
    };
  }, [
    adSets,
    adType,
    computeAdCount,
    driveFiles,
    dropboxFiles,
    enablePlacementCustomization,
    fileGroups,
    fileVariantMap,
    files,
    getVariantState,
    groupVariantMap,
    importedFiles,
    importedPosts,
    isCarouselAd,
    postVariantMap,
    selectedIgOrganicPosts,
    thumbnail,
    variants,
    videoThumbs,
  ]);

  const addCompletedJob = useCallback((completedJob) => {
    setCompletedJobs(prev => {
      const updated = [...prev, completedJob];
      return updated.map((j, i) =>
        i < updated.length - 3 ? { ...j, formData: null } : j
      );
    });
  }, []);

  const handleRetryJob = useCallback((job) => {
    const d = job.formData;
    if (!d) return;

    setHeadlines(d.headlines || ['']);
    setDescriptions(d.descriptions || ['']);
    setMessages(d.messages || ['']);
    setLink(d.link || ['']);
    setPhoneNumber(d.phoneNumber || '');
    setCta(d.cta || '');
    setSelectedAdAccount(d.selectedAdAccount || '');
    setSelectedCampaign(Array.isArray(d.selectedCampaign) ? d.selectedCampaign : []);
    setSelectedAdSets(d.selectedAdSets || []);
    setDuplicateAdSet(d.duplicateAdSet || '');
    setNewAdSetName(d.newAdSetName || '');
    setPageId(d.pageId || '');
    setInstagramAccountId(d.instagramAccountId || '');

    setFiles(d.files || []);
    setDriveFiles(d.driveFiles || []);
    setDropboxFiles(d.dropboxFiles || []);
    setImportedPosts(d.importedPosts || []);
    setImportedFiles(d.importedFiles || []);
    setSelectedIgOrganicPosts(d.selectedIgOrganicPosts || []);
    setVideoThumbs(d.videoThumbs || {});
    setThumbnail(d.thumbnail || null);

    setVariants([{ id: 'default', name: 'Default', snapshot: null }]);
    setActiveVariantId('default');
    setFileVariantMap({});
    setGroupVariantMap({});
    setPostVariantMap({});
    setAdType(d.adType || 'regular');
    setIsCarouselAd(d.isCarouselAd || false);
    setEnablePlacementCustomization(d.enablePlacementCustomization || false);
    setFileGroups(normalizeFileGroups(d.fileGroups || []));
    setSelectedFiles(new Set());
    setLaunchPaused(d.launchPaused || false);

    setSelectedShopDestination(d.selectedShopDestination || '');
    setSelectedShopDestinationType(d.selectedShopDestinationType || '');
    setSelectedForm(d.selectedForm || null);
    setIsPartnershipAd(Boolean(d.isPartnershipAd));
    setPartnerIgAccountId(d.partnerIgAccountId || '');
    setPartnerFbPageId(d.partnerFbPageId || '');
    setPartnershipIdentityMode(d.partnershipIdentityMode || 'dynamic');
    setAdScheduleStartTime(d.adScheduleStartTime || null);
    setAdScheduleEndTime(d.adScheduleEndTime || null);

    if (d.adNameFormulaV2) setAdNameFormulaV2(d.adNameFormulaV2);

    setCompletedJobs(prev => prev.filter(j => j.id !== job.id));

    toast.success('Form restored — review and resubmit when ready.');
  }, [setActiveVariantId, setAdNameFormulaV2, setAdScheduleEndTime, setAdScheduleStartTime, setAdType, setCta, setDescriptions, setDriveFiles, setDropboxFiles, setDuplicateAdSet, setEnablePlacementCustomization, setFileGroups, setFileVariantMap, setFiles, setGroupVariantMap, setHeadlines, setImportedFiles, setImportedPosts, setInstagramAccountId, setIsCarouselAd, setIsPartnershipAd, setLaunchPaused, setLink, setMessages, setNewAdSetName, setPageId, setPartnerFbPageId, setPartnerIgAccountId, setPartnershipIdentityMode, setPhoneNumber, setPostVariantMap, setSelectedAdAccount, setSelectedAdSets, setSelectedCampaign, setSelectedFiles, setSelectedForm, setSelectedIgOrganicPosts, setSelectedShopDestination, setSelectedShopDestinationType, setThumbnail, setVariants, setVideoThumbs]);


  const adLimitWarning = useMemo(() => {
    if (selectedAdSets.length === 0) return null;

    // Calculate how many ads this job will create per ad set
    let newAdsPerAdSet = 0;

    if (importedPosts.length > 0) {
      newAdsPerAdSet = importedPosts.length;
    } else if (isCarouselAd) {
      newAdsPerAdSet = (fileGroups.length > 0) ? fileGroups.length : 1;
    } else if (enablePlacementCustomization) {
      const groupedFileIds = new Set(fileGroupsAsArrays.flat());
      const ungroupedCount = [
        ...files,
        ...driveFiles.map(f => ({ ...f, isDrive: true })),
        ...(dropboxFiles || []).map(f => ({ ...f, isDropbox: true })),
        ...importedFiles.map(f => ({ ...f, isMetaLibrary: true })),
      ].filter(f => {
        const id = f.isMetaLibrary ? (f.type === 'image' ? f.hash : f.id)
          : f.isDropbox ? f.dropboxId
            : f.isDrive ? f.id : f.uniqueId || f.name;
        return !groupedFileIds.has(id);
      }).length;
      // ungrouped files pair up as placement groups of 2
      newAdsPerAdSet = fileGroups.length + Math.ceil(ungroupedCount / 2);
    } else if (adType === 'flexible') {
      newAdsPerAdSet = fileGroups.length > 0 ? fileGroups.length : 1;
    } else if (selectedIgOrganicPosts.length > 0) {
      newAdsPerAdSet = selectedIgOrganicPosts.length;
    } else {
      newAdsPerAdSet = files.length + driveFiles.length + importedFiles.length + (dropboxFiles?.length || 0);
    }

    // Find any ad set that would exceed 50
    const overLimitAdSets = selectedAdSets
      .map(id => adSets.find(a => a.id === id))
      .filter(adset => adset && (adset.totalAds || 0) + newAdsPerAdSet > 50);

    if (overLimitAdSets.length === 0) return null;

    return overLimitAdSets.map(a => a.name || a.id);
  }, [selectedAdSets, adSets, importedPosts, isCarouselAd, fileGroups, fileGroupsAsArrays, enablePlacementCustomization, files, driveFiles, dropboxFiles, importedFiles, adType, selectedIgOrganicPosts]);


  // Add this helper function
  // Whatever your uploadChunkWithRetry looks like, add signal:
  async function uploadChunkWithRetry(url, chunk, contentType, partNumber, maxRetries = 3, signal = null) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      try {
        return await axios.put(url, chunk, {
          headers: { 'Content-Type': contentType },
          signal, // This makes axios reject immediately on abort
        });
      } catch (error) {
        if (axios.isCancel(error) || error.name === 'AbortError' || signal?.aborted) {
          throw new DOMException('Cancelled', 'AbortError');
        }
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  const uploadToS3 = async (file, onChunkUploaded, uniqueId, maxUploadRetries = 2, signal = null) => {    // Validate inputs
    if (!file) {
      console.error('❌ FATAL: No file provided to uploadToS3');
      throw new Error('No file provided for upload');
    }

    if (!file.name) {
      console.error('❌ FATAL: File has no name property:', file);
      throw new Error('File missing name property');
    }

    if (!file.type) {
      console.error('❌ FATAL: File has no type property:', file);
      throw new Error('File missing type property');
    }

    if (typeof file.size !== 'number') {
      console.error('❌ FATAL: File has invalid size:', {
        size: file.size,
        sizeType: typeof file.size
      });
      throw new Error('File missing or invalid size property');
    }

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const limit = pLimit(5);

    let lastError = null;

    // Retry loop for the entire upload process
    for (let uploadAttempt = 1; uploadAttempt <= maxUploadRetries; uploadAttempt++) {
      let uploadId = null;
      let s3Key = null;

      try {
        const startPayload = {
          fileName: file.name,
          fileType: file.type
        };

        const startResponse = await axios.post(
          `${API_BASE_URL}/auth/s3/start-upload`,
          startPayload,
          { withCredentials: true, signal }
        );

        uploadId = startResponse.data.uploadId;
        s3Key = startResponse.data.key;

        if (!uploadId || !s3Key) {
          console.error('❌ Invalid start-upload response:', startResponse.data);
          throw new Error('Invalid response from start-upload endpoint');
        }

        const urlsPayload = {
          key: s3Key,
          uploadId: uploadId,
          parts: totalChunks
        };

        const urlsResponse = await axios.post(
          `${API_BASE_URL}/auth/s3/get-upload-urls`,
          urlsPayload,
          { withCredentials: true, signal }
        );

        const presignedUrls = urlsResponse.data.parts;

        if (!presignedUrls || !Array.isArray(presignedUrls)) {
          console.error('❌ Invalid presigned URLs response:', urlsResponse.data);
          throw new Error('Invalid presigned URLs response');
        }

        let uploadedChunksCount = 0;

        const uploadPromises = presignedUrls.map((part, index) => {
          const { partNumber, url } = part;
          const start = (partNumber - 1) * CHUNK_SIZE;
          const end = start + CHUNK_SIZE;
          const chunk = file.slice(start, end);

          return limit(async () => {
            try {
              const uploadResponse = await uploadChunkWithRetry(url, chunk, file.type, partNumber, 3, signal);
              // Only call progress callback on first attempt to avoid double-counting
              if (onChunkUploaded && uploadAttempt === 1) {
                uploadedChunksCount++;
                onChunkUploaded();
              }

              const etag = uploadResponse.headers.etag;
              if (!etag) {
                console.error(`❌ No ETag received for chunk ${partNumber}`);
                throw new Error(`No ETag received for part ${partNumber}`);
              }

              const cleanEtag = etag.replace(/"/g, '');
              return { PartNumber: partNumber, ETag: cleanEtag };
            } catch (chunkError) {
              console.error(`❌ Error uploading chunk ${partNumber}:`, {
                error: chunkError.message,
                status: chunkError.response?.status,
                statusText: chunkError.response?.statusText,
                responseData: chunkError.response?.data
              });
              throw chunkError;
            }
          });
        });


        const completedParts = await Promise.all(uploadPromises);


        const completePayload = {
          key: s3Key,
          uploadId: uploadId,
          parts: completedParts
        };

        let completeResponse;
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            completeResponse = await axios.post(
              `${API_BASE_URL}/auth/s3/complete-upload`,
              completePayload,
              { withCredentials: true, signal }
            );
            break;
          } catch (error) {
            if (attempt === 5) {
              throw error;
            }
            const delay = 2000 * Math.pow(2, attempt - 1);

            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        const result = {
          name: file.name,
          type: file.type,
          size: file.size,
          s3Url: completeResponse.data.publicUrl,
          isS3Upload: true,
          uniqueId: uniqueId
        };

        return result;

      } catch (error) {
        lastError = error;

        if (axios.isCancel(error) || error.name === 'AbortError' || signal?.aborted) {

          if (uploadId && s3Key) {
            try {

              await axios.post(
                `${API_BASE_URL}/auth/s3/abort-upload`,
                { key: s3Key, uploadId: uploadId },
                { withCredentials: true }
              );

            } catch (abortError) {

              console.error('Failed to abort S3 upload:', abortError.message);
            }
          }

          const cancelError = new DOMException(`Upload cancelled for ${file.name}`, 'AbortError');
          throw cancelError;
        }



        // Abort the current upload before retrying
        if (uploadId && s3Key) {

          try {
            await axios.post(
              `${API_BASE_URL}/auth/s3/abort-upload`,
              { key: s3Key, uploadId: uploadId },
              { withCredentials: true }
            );

          } catch (abortError) {
            console.error('❌ Failed to abort upload:', abortError.message);
          }
        }

        // If not the last attempt, wait before retrying
        if (uploadAttempt < maxUploadRetries) {
          const delay = 3000 * uploadAttempt;

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    console.error('❌ === S3 UPLOAD FAILED AFTER ALL RETRIES ===');
    console.error('❌ Final error details:', {
      fileName: file.name,
      error: lastError?.message,
      status: lastError?.response?.status,
      statusText: lastError?.response?.statusText,
      responseData: lastError?.response?.data,
      stack: lastError?.stack
    });

    throw new Error(`Failed to upload ${file.name} to S3 after ${maxUploadRetries} attempts: ${lastError?.message}`);
  };

  async function uploadDriveFileToS3(file, maxRetries = 3, signal = null) {
    const driveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/upload-from-drive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            driveFileUrl: driveDownloadUrl,
            fileName: file.name,
            mimeType: file.mimeType,
            accessToken: file.accessToken,
            size: file.size
          }),
          signal
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "S3 upload failed");

        // Success! Return the result
        return {
          ...file,
          s3Url: data.s3Url,
          isS3Upload: true
        };

      } catch (error) {
        if (axios.isCancel(error) || error.name === 'AbortError' || signal?.aborted) {
          throw new DOMException(`Upload cancelled for ${file.name}`, 'AbortError');
        }
        if (attempt === maxRetries) {
          throw new Error(`S3 upload failed after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        // console.log(`Upload attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }


  async function uploadDropboxFileToS3(file, maxRetries = 3, signal = null) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/upload-from-dropbox`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: file.dropboxId, // ✅ Send the ID
            fileName: file.name,
            mimeType: file.mimeType || getMimeFromName(file.name),
            accessToken: file.accessToken // ✅ Send the Token
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "S3 upload failed");

        return {
          ...file,
          s3Url: data.s3Url,
          isS3Upload: true
        };
      } catch (error) {
        if (axios.isCancel(error) || error.name === 'AbortError' || signal?.aborted) {
          throw new DOMException(`Upload cancelled for ${file.name}`, 'AbortError');
        }

        if (attempt === maxRetries) {
          throw new Error(`Dropbox S3 upload failed after ${maxRetries} attempts: ${error.message}`);
        }
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  const ctaOptions = [
    { value: "LEARN_MORE", label: "Learn More" },
    { value: "SHOP_NOW", label: "Shop Now" },
    { value: "SIGN_UP", label: "Sign Up" },
    { value: "SUBSCRIBE", label: "Subscribe" },
    { value: "GET_OFFER", label: "Get Offer" },
    { value: "CONTACT_US", label: "Contact Us" },
    { value: "DOWNLOAD", label: "Download" },
    { value: "BOOK_NOW", label: "Book Now" },
    { value: "SEE_MORE", label: "See More" },
    { value: "APPLY_NOW", label: "Apply Now" },
    { value: "INSTALL_MOBILE_APP", label: "Install Now" },
    { value: "CALL_NOW", label: "Call Now" },
  ]

  const availableLinks = adAccountSettings?.links || [];
  const defaultLink = availableLinks.find(l => l.isDefault) || availableLinks[0];

  const filteredPages = useMemo(() =>
    pages.filter((page) =>
      page.name.toLowerCase().includes(pageSearchValue.toLowerCase())
    ),
    [pages, pageSearchValue]
  );

  const filteredInstagramAccounts = useMemo(() =>
    pages
      .filter((page) => page.instagramAccount)
      .filter((page) =>
        page.instagramAccount.username.toLowerCase()
          .includes(instagramSearchValue.toLowerCase())
      ),
    [pages, instagramSearchValue]
  );


  const refreshPages = async () => {
    setIsLoading(true);
    setIsPagesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/fetch-pages`, {
        credentials: "include"
      });

      const data = await res.json();

      if (data.pages) {
        toast.success("Pages refreshed successfully!");
        setPages(data.pages);

        // ✅ Retain selected page and IG account if still valid
        const updatedPage = data.pages.find((p) => p.id === pageId);
        const updatedInstagram = data.pages
          .find((p) => p.instagramAccount?.id === instagramAccountId)
          ?.instagramAccount;

        if (!updatedPage) setPageId("");
        if (!updatedInstagram) setInstagramAccountId("");
      } else {
        toast.error("No pages returned.");
      }
    } catch (err) {
      toast.error(`Failed to fetch pages: ${err.message || "Unknown error"}`);
      console.error("Failed to fetch pages:", err);
    } finally {
      setIsLoading(false);
      setIsPagesLoading(false);
    }
  };



  // This useEffect now only handles the UI updates for the progress bar.
  useEffect(() => {
    if (currentJob) {
      setProgress(trackedProgress);
      setProgressMessage(trackedMessage);
    }
  }, [trackedProgress, trackedMessage, currentJob]);

  // This hook STARTS a new job from the queue when ready.
  useEffect(() => {
    // Do nothing if the queue is empty or a job is already processing.
    if (jobQueue.length === 0 || isProcessingQueue) {
      return;
    }

    // ✅ Call the reset function to clear the previous job's state.
    resetProgress();
    setLiveProgress({ completed: 0, succeeded: 0, failed: 0, total: 0, errors: [] });

    const jobToProcess = jobQueue[0];

    setIsProcessingQueue(true);
    setCurrentJob(jobToProcess);
    setHasStartedAnyJob(true);

    setProgress(0);
    // setMessage('Initializing...');
    setShowCompletedView(false);
    setJobId(null);
    setIsCancelling(false); // Reset for new job


    handleCreateAd(jobToProcess).catch(err => {
      // Don't treat cancellation as a critical error
      if (err.name === 'AbortError' || axios.isCancel(err)) {

        const cancelledJob = {
          id: jobToProcess.id,
          message: 'Job cancelled.',
          completedAt: Date.now(),
          status: 'cancelled',
          formData: jobToProcess.formData,
        };
        addCompletedJob(cancelledJob);
        setJobQueue(prev => prev.slice(1));
        setCurrentJob(null);
        setIsProcessingQueue(false);
        setIsCancelling(false);  // <-- AND HERE

        return;
      }


      const failedJob = {
        id: jobToProcess.id,
        message: `Job Failed: ${err.message || 'An initialization error occurred.'}`,
        completedAt: Date.now(),
        status: 'error',
        formData: jobToProcess.formData,
      };
      addCompletedJob(failedJob);
      setJobQueue(prev => prev.slice(1));
      setCurrentJob(null);
      setIsProcessingQueue(false);
      setIsCancelling(false);  // <-- HERE
    });
  }, [jobQueue, isProcessingQueue, resetProgress]);



  useEffect(() => {
    if (!isProcessingQueue || !currentJob) {
      return; // Do nothing if a job isn't active
    }

    // Guard clause to ignore stale status after a reset.
    if (status === 'idle') {
      return;
    }

    // Only act on the final states reported by the SSE hook
    if (status === 'complete' || status === 'partial-success' || status === 'error' || status === 'job-not-found' || status === 'cancelled') {
      if (status === 'complete') {
        // Fix: Handle multiple adsets properly
        const selectedAdSetIds = currentJob.formData.selectedAdSets;
        let adSetDisplayText;
        if (currentJob.formData.duplicateAdSet) {
          // New adset creation case
          adSetDisplayText = currentJob.formData.newAdSetName || 'New Adset';
        } else {
          // Existing adsets case
          const selectedAdSetIds = currentJob.formData.selectedAdSets;
          if (selectedAdSetIds.length === 1) {
            const adSet = adSets.find(a => a.id === selectedAdSetIds[0]);
            adSetDisplayText = adSet?.name || 'selected adset';
          } else {
            adSetDisplayText = `${selectedAdSetIds.length} adsets`;
          }
        }

        const completedJob = {
          id: currentJob.id,
          message: `${currentJob.adCount || 1} Ad${currentJob.adCount !== 1 ? 's' : ''} successfully posted to ${currentJob.formData.adSetDisplayName}`,
          completedAt: Date.now(),
          status: 'success',
          selectedAdSets: currentJob.formData.selectedAdSets,      // ADD THIS
          selectedAdAccount: currentJob.formData.selectedAdAccount  // ADD THIS
        };
        // setCompletedJobs(prev => [...prev, completedJob]);
        addCompletedJob(completedJob);


      } else if (status === 'partial-success') {

        const completedJob = {
          id: currentJob.id,
          message: trackedMessage,
          completedAt: Date.now(),
          status: 'partial-success',
          successCount: metaData.successCount,
          failureCount: metaData.failureCount,
          totalCount: metaData.totalCount,
          errorMessages: metaData.errorMessages,
          selectedAdSets: currentJob.formData.selectedAdSets,
          selectedAdAccount: currentJob.formData.selectedAdAccount,
          formData: currentJob.formData,
        };
        addCompletedJob(completedJob);
        toast.warning(trackedMessage);
      } else if (status === 'job-not-found') {

        const failedJob = {
          id: currentJob.id,
          message: `Job timed out. Refresh page to try again`,
          completedAt: Date.now(),
          status: 'retry',
          jobData: currentJob,
          formData: currentJob.formData,
        };
        addCompletedJob(failedJob);
      } else if (status === 'cancelled') {
        if (isInPromisePhase.current) {
          return; // Let the promise phase handle it
        }

        const cancelledJob = {
          id: currentJob.id,
          message: trackedMessage || 'Job cancelled. Some Ads might still have been made.',
          completedAt: Date.now(),
          status: 'cancelled',
          successCount: metaData.successCount,
          failureCount: metaData.failureCount,
          totalCount: metaData.totalCount,
          errorMessages: metaData.errorMessages,
          selectedAdSets: currentJob.formData.selectedAdSets,
          selectedAdAccount: currentJob.formData.selectedAdAccount,
          formData: currentJob.formData,
        };
        addCompletedJob(cancelledJob);
      }

      else {

        const failedJob = {
          id: currentJob.id,
          message: `Job Failed: ${trackedMessage || 'An unknown error occurred.'}`,
          completedAt: Date.now(),
          status: 'error',
          formData: currentJob.formData,
        };
        addCompletedJob(failedJob);
        toast.error(`Job failed: ${trackedMessage || 'An unknown error occurred.'}`);
      }

      // The job is finished. Clean up and advance to the next one.
      setShowCompletedView(true);
      setJobQueue(prev => prev.slice(1));
      setCurrentJob(null);
      setIsProcessingQueue(false);
      setIsCancelling(false);

    }
  }, [status, isProcessingQueue, currentJob]);




  useEffect(() => {
    if (!selectedTemplate || !copyTemplates[selectedTemplate]) return;
    const tpl = copyTemplates[selectedTemplate];
    setMessages(tpl.primaryTexts || [""]);
    setHeadlines(tpl.headlines || [""]);
    setDescriptions(tpl.descriptions || [""]);
  }, [selectedTemplate, copyTemplates]);

  useEffect(() => {
    if (!isCarouselAd) return;
    // Carousel "Primary Text" is a single input, so keep one description value in state.
    if (descriptions.length !== 1) {
      setDescriptions([descriptions[0] || ""]);
    }
  }, [isCarouselAd, descriptions]);



  // Drive Picker setup
  useEffect(() => {
    // Check Google auth status when component mounts
    const checkGoogleAuth = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/auth/google/status`,
          { withCredentials: true }
        );

        setGoogleAuthStatus({
          checking: false,
          authenticated: response.data.authenticated,
          accessToken: response.data.accessToken
        });

        // ✅ If just logged in, open picker automatically
        if (response.data.authenticated && window.location.search.includes('googleAuth=success')) {
          openPicker(response.data.accessToken);
          // Clean up the URL so it doesn't stay ?googleAuth=success
          const url = new URL(window.location);
          url.searchParams.delete('googleAuth');
          window.history.replaceState({}, document.title, url.pathname);
        }

      } catch (error) {

        setGoogleAuthStatus({
          checking: false,
          authenticated: false,
          accessToken: null
        });
      }
    };

    checkGoogleAuth();
  }, []);




  // 4. Updated createPicker with folder navigation support
  const createPicker = useCallback((token, initialFolderId = null) => {
    // Close existing picker if open
    if (pickerInstanceRef.current) {
      try {
        pickerInstanceRef.current.setVisible(false);
      } catch (e) {
        // Picker might already be closed
      }
    }

    setShowFolderInput(true);


    const mimeTypes = [
      "application/vnd.google-apps.folder",
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime"
    ].join(",");

    // Create view with optional folder parent
    let mainView;
    if (initialFolderId) {
      mainView = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setMimeTypes(mimeTypes)
        .setSelectFolderEnabled(false)
        .setParent(initialFolderId); // Navigate to specific folder
    } else {
      mainView = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setMimeTypes(mimeTypes)
        .setSelectFolderEnabled(false);
    }

    const myFolders = new google.picker.DocsView()
      .setOwnedByMe(true)
      .setIncludeFolders(true)
      .setMimeTypes(mimeTypes)
      .setSelectFolderEnabled(false);

    const sharedDriveFolders = new google.picker.DocsView()
      .setOwnedByMe(true)
      .setIncludeFolders(true)
      .setMimeTypes(mimeTypes)
      .setSelectFolderEnabled(false)
      .setEnableDrives(true);

    const onlySharedFolders = new google.picker.DocsView()
      .setOwnedByMe(false)
      .setIncludeFolders(true)
      .setMimeTypes(mimeTypes)
      .setSelectFolderEnabled(false);

    const pickerBuilder = new google.picker.PickerBuilder()
      .setOAuthToken(token)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
      .hideTitleBar()
      .setAppId(102886794705)
      .setCallback((data) => {
        if (data.action === "picked") {
          const selected = data.docs.map((doc) => {
            // Safely grab the Picker's thumbnail if it exists
            const thumb = doc.thumbnails && doc.thumbnails.length > 0
              ? doc.thumbnails[doc.thumbnails.length - 1].url
              : null;

            return {
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              size: doc.sizeBytes,
              accessToken: token,
              pickerThumbnail: thumb // Save it here
            };
          });

          setDriveFiles((prev) => [...prev, ...selected]);
        }

        if (data.action === "picked" || data.action === "cancel") {
          setShowFolderInput(false);
          setFolderLinkValue("");
          pickerInstanceRef.current = null;
        }
      });

    // Add main view first if navigating to folder
    if (initialFolderId) {
      pickerBuilder.addView(mainView);
    }

    // Add other views
    pickerBuilder
      .addView(myFolders)
      .addView(sharedDriveFolders)
      .addView(onlySharedFolders);

    const picker = pickerBuilder.build();
    pickerInstanceRef.current = picker;
    picker.setVisible(true);
  }, [setDriveFiles, setShowFolderInput, setFolderLinkValue]);





  const handleImportFromFolder = useCallback(async () => {
    if (!googleAuthStatus.accessToken) {
      toast.error('Not authenticated with Google Drive');
      return;
    }

    const link = folderLinkValue || "";

    // 1. Check if the URL is a direct FILE link (matches /file/d/ID)
    const fileMatch = link.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    const fileId = fileMatch ? fileMatch[1] : null;

    if (fileId) {
      // It's a file! Fetch it directly and bypass the Picker
      try {
        // Optional: If you use a toast library like react-hot-toast, you can show a loading state
        // const toastId = toast.loading("Importing file...");

        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,thumbnailLink`,
          { headers: { Authorization: `Bearer ${googleAuthStatus.accessToken}` } }
        );

        if (!response.ok) throw new Error("File not found or permission denied.");

        const data = await response.json();

        // Format the object EXACTLY how your Picker callback formats it
        const newFile = {
          id: data.id,
          name: data.name,
          mimeType: data.mimeType,
          size: parseInt(data.size || "0", 10), // API returns size as string
          accessToken: googleAuthStatus.accessToken,
          pickerThumbnail: data.thumbnailLink || null // Automatically hooks into our new thumbnail logic!
        };

        setDriveFiles((prev) => [...prev, newFile]);
        setShowFolderInput(false);
        setFolderLinkValue("");
        toast.success(`Successfully imported: ${data.name}`);


        // toast.success("File imported successfully!", { id: toastId });
      } catch (error) {

        toast.error("Failed to import file. Make sure you have access to it.");
      }
      return; // Stop execution here so we don't open the folder picker
    }

    // 2. If it's NOT a file link, assume it's a FOLDER link
    const folderId = extractFolderId(link);

    if (!folderId) {
      toast.error('Invalid Google Drive link');
      return;
    }

    // Open the picker pointing to the folder
    createPicker(googleAuthStatus.accessToken, folderId);

  }, [
    folderLinkValue,
    googleAuthStatus.accessToken,
    createPicker,
    setDriveFiles,
    setShowFolderInput,
    setFolderLinkValue
  ]);

  const openPicker = useCallback((token) => {
    if (!window.google || !window.google.picker) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js?onload=onApiLoad';
      document.body.appendChild(script);

      window.onApiLoad = () => {
        window.gapi.load('picker', () => {
          createPicker(token);
        });
      };
    } else {
      createPicker(token);
    }
  }, [createPicker]); // Note: createPicker needs to be memoized too


  const handleDriveClick = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/auth/google/status`,
        { withCredentials: true }
      );

      if (res.data.authenticated && res.data.accessToken) {
        setGoogleAuthStatus({
          authenticated: true,
          checking: false,
          accessToken: res.data.accessToken
        });
        openPicker(res.data.accessToken);
        return;
      }
    } catch (err) {
      console.warn("No valid Google session, proceeding to popup login.");
    }

    const authWindow = window.open(
      `${API_BASE_URL}/auth/google?popup=true`,
      "_blank",
      "width=1100,height=750"
    );

    if (!authWindow) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", listener);
      if (!authWindow.closed) authWindow.close();
      // toast.error("Google login timed out.");
    }, 65000);

    const listener = (event) => {
      if (event.origin !== `${API_BASE_URL}`) return;

      const { type, accessToken } = event.data || {};
      if (type === "google-auth-success") {
        clearTimeout(timeoutId);
        window.removeEventListener("message", listener);
        authWindow.close();

        setGoogleAuthStatus({
          authenticated: true,
          checking: false,
          accessToken
        });

        openPicker(accessToken);
      } else if (type === "google-auth-error") {
        clearTimeout(timeoutId);
        window.removeEventListener("message", listener);
        authWindow.close();
        toast.error("Google authentication failed");
      }
    };

    window.addEventListener("message", listener);
  }, [openPicker]); // Note: openPicker needs to be memoized too


  // Load Dropbox Chooser SDK
  useEffect(() => {
    if (document.getElementById('dropboxjs')) return; // Already loaded

    const script = document.createElement('script');
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
    script.id = 'dropboxjs';
    script.setAttribute('data-app-key', import.meta.env.VITE_DROPBOX_APP_KEY || 'YOUR_DROPBOX_APP_KEY');
    script.async = true;
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('dropboxjs');
      if (existingScript) existingScript.remove();
    };
  }, []);



  // ✅ CHANGE: Accept accessToken as an argument so we can attach it to files
  const openDropboxChooser = useCallback((accessToken) => {
    window.Dropbox.choose({
      success: async (selectedFiles) => {

        // Log for debugging
        selectedFiles.forEach(f => console.log(`File: ${f.name} ID: ${f.id}`));

        const dropboxFilesData = selectedFiles.map((file) => ({
          dropboxId: file.id, // ✅ We use this ID for the backend now
          name: file.name,
          link: file.link, // Kept for UI, but not used for upload
          directLink: file.link, // ✅ ADD THIS LINE
          size: file.bytes,
          isDropbox: true,
          mimeType: getMimeFromName(file.name),
          accessToken: accessToken // ✅ Attach token to file object
        }));

        setDropboxFiles(prev => [...prev, ...dropboxFilesData]);
      },
      cancel: () => {
        console.log('Dropbox picker cancelled');
      },
      linkType: 'direct', // Changed to preview (safer default), though 'direct' is fine too
      multiselect: true,
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm'],
      folderselect: false,
      sizeLimit: 1024 * 1024 * 1024
    });
  }, [setDropboxFiles]);

  const handleDropboxClick = useCallback(async () => {
    // Check if Dropbox SDK is loaded
    if (!window.Dropbox) {
      toast.error("Dropbox is still loading. Please try again in a moment.");
      return;
    }

    try {
      const statusRes = await fetch(`${API_BASE_URL}/auth/dropbox/status`, {
        credentials: 'include'
      });
      const statusData = await statusRes.json();

      // ✅ CHECK: If authenticated, pass the token immediately
      if (statusData.authenticated && statusData.accessToken) {
        openDropboxChooser(statusData.accessToken);
        return;
      }

      // If not authenticated, open Popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        `${API_BASE_URL}/auth/dropbox?popup=true`,
        'dropbox-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const handleMessage = (event) => {
        // ✅ CHANGE: Extract accessToken from success message
        if (event.data?.type === 'dropbox-auth-success') {
          window.removeEventListener('message', handleMessage);
          toast.success("Dropbox connected! Opening file picker...");

          // Pass the new token to the chooser
          openDropboxChooser(event.data.accessToken);
        } else if (event.data?.type === 'dropbox-auth-error') {
          window.removeEventListener('message', handleMessage);
          toast.error("Failed to connect Dropbox");
        }
      };

      window.addEventListener('message', handleMessage);

    } catch (error) {
      console.error('Error checking Dropbox auth:', error);
      toast.error("Failed to check Dropbox connection");
    }
  }, [openDropboxChooser]);


  // Dropzone logic
  const onDrop = useCallback((acceptedFiles) => {
    // 🚫 Filter out .webp and .heic files
    const filteredFiles = acceptedFiles.filter(
      (file) =>
        !file.name.toLowerCase().endsWith(".webp") &&
        !file.name.toLowerCase().endsWith(".heic")
    );

    if (filteredFiles.length < acceptedFiles.length) {
      toast.error("WebP and HEIC files are not supported by Facebook");
    }

    setFiles(prev => [
      ...prev,
      ...filteredFiles.map(withUniqueId)
    ]);
  }, []);





  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })


  const getVideoAspectRatio = async (file) => {

    if (!isVideoFile(file)) {
      return null; // Not a video file
    }


    if (file.isDropbox) {
      try {
        // We need to call our backend to get the metadata
        const response = await fetch(`${API_BASE_URL}/api/dropbox/video-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileId: file.dropboxId,
            fileLink: file.link
          })
        });

        if (response.ok) {
          const data = await response.json();

          if (data.width && data.height) {
            return data.width / data.height;
          }
        }
        return 16 / 9; // Fallback
      } catch (error) {
        console.error('Error getting Dropbox video metadata:', error);
        return 16 / 9;
      }
    }


    if (file.mimeType) {
      // For Drive files - NEW, RELIABLE METHOD
      if (!file.accessToken) {
        console.warn(`No access token for Drive file ${file.name}, falling back.`);
        return 16 / 9;
      }
      try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?fields=videoMediaMetadata&supportsAllDrives=true`, {
          headers: { 'Authorization': `Bearer ${file.accessToken}` }
        });
        if (!response.ok) {
          console.error(`Failed to get Drive video metadata for ${file.name}.`);
          return 16 / 9; // Default on API error
        }
        const data = await response.json();
        const metadata = data.videoMediaMetadata;
        if (metadata && metadata.width && metadata.height) {
          return metadata.width / metadata.height;
        }
        return 16 / 9; // Default if metadata is missing
      } catch (error) {
        console.error(`Error fetching Drive video metadata for ${file.name}:`, error);
        return 16 / 9; // Default on network error
      }
    } else if (file.type) {
      // For local files (This part is unchanged and correct)
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          const aspectRatio = video.videoWidth / video.videoHeight;
          URL.revokeObjectURL(url);
          resolve(aspectRatio);
        });
        video.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          resolve(16 / 9); // Default to 16:9 on error
        });
      });
    }
    return null; // Not a video file
  };



  const generateThumbnail = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.remove(); // Clean up video element
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
          // Limit thumbnail size to reduce memory usage
          const MAX_THUMB_SIZE = 320;
          const scale = Math.min(1, MAX_THUMB_SIZE / Math.max(video.videoWidth, video.videoHeight));

          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL("image/jpeg", 0.7); // Use JPEG with compression

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
    // 1. FASTEST: If Picker already gave us the thumbnail, use it instantly!
    if (file.pickerThumbnail) {
      return file.pickerThumbnail.replace(/=s\d+$/, '=w400-h300');
    }

    // 2. SAFEST FALLBACK: If Picker didn't have it, fetch from the API
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

  // Track processing state, not processed files
  const processingRef = useRef(new Set());




  // Add this ref near your other refs (near processingRef)
  const videoThumbsRef = useRef(videoThumbs);

  // Add this small useEffect to keep the ref in sync
  useEffect(() => {
    videoThumbsRef.current = videoThumbs;
  }, [videoThumbs]);

  // Replace your entire thumbnail processing useEffect with this:
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
              if ('requestIdleCallback' in window) requestIdleCallback(() => processNext(), { timeout: 100 });
              else setTimeout(processNext, 0);
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
        // Track processing to prevent duplicate fetches
        driveFilesNeedingThumbs.forEach(file => processingRef.current.add(getFileId(file)));

        const MAX_DRIVE_CONCURRENT = 3; // Fast, but avoids Google API rate limits
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
              processNextDrive(); // Process next in queue
            }
          }
        };

        // Kick off the concurrent workers
        const drivePromises = [];
        for (let i = 0; i < Math.min(MAX_DRIVE_CONCURRENT, driveFilesNeedingThumbs.length); i++) {
          drivePromises.push(processNextDrive());
        }
      }



      // --- 3. DROPBOX ---
      // We filter by dropboxId directly to avoid 'isDropbox' flag dependency issues
      const dropboxFilesNeedingThumbs = dropboxFiles.filter(file => {
        const fileId = file.dropboxId;

        return !videoThumbsRef.current[fileId] &&
          !processingRef.current.has(fileId);
      });

      if (dropboxFilesNeedingThumbs.length > 0 && !abortController.signal.aborted) {
        // Track by dropboxId
        dropboxFilesNeedingThumbs.forEach(file => processingRef.current.add(file.dropboxId));

        const BATCH_SIZE = 25;

        for (let i = 0; i < dropboxFilesNeedingThumbs.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) break;

          const batch = dropboxFilesNeedingThumbs.slice(i, i + BATCH_SIZE);

          const filesData = batch.map(f => ({
            id: f.dropboxId,
            link: f.link // or f.directLink, depending on your object structure
          }));

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

                // CRITICAL FIX: Save using the dropboxId as the key.
                // This matches what the UI component looks for.
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

            // Error handling: Save fallback using dropboxId key
            const failedThumbs = {};
            batch.forEach(f => {
              failedThumbs[f.dropboxId] = "https://api.withblip.com/thumbnail.jpg";
            });
            setVideoThumbs(prev => ({ ...prev, ...failedThumbs }));
          } finally {
            // Cleanup using dropboxId key
            batch.forEach(f => processingRef.current.delete(f.dropboxId));
          }
        }
      }
    };

    processThumbnails();

    return () => {
      abortController.abort();
      processingRef.current.clear();
    };
  }, [files, driveFiles, dropboxFiles, generateThumbnail, getDriveVideoThumbnail, setVideoThumbs]);


  const addField = (setter, values) => {
    const maxFields = isCarouselAd ? 10 : 5;
    if (values.length < maxFields) {
      setter([...values, ""]);
    }
  };

  const removeField = (setter, values, index) => {
    if (values.length > 1) {
      setter(values.filter((_, i) => i !== index))
    }
  }

  const updateField = (setter, values, index, newValue) => {
    const newValues = [...values]
    newValues[index] = newValue
    setter(newValues)
  }

  // Keep isCarouselAd in sync with adType for backward compatibility
  useEffect(() => {
    setIsCarouselAd(adType === 'carousel');
  }, [adType, setIsCarouselAd]);

  // Reset adType to 'regular' if flexible is selected but campaignObjective doesn't support it
  useEffect(() => {
    if (adType === 'flexible') {
      const supportsFlexible = campaignObjective.length > 0 &&
        campaignObjective.every(obj => ["OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(obj));

      if (!supportsFlexible) {
        setAdType('regular');
      }
    }
  }, [campaignObjective, adType, setAdType]);


  // Replace the existing function with this
  const computeAdName = useCallback((file, dateTypeInput, iterationIndex) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthAbbrev = monthNames[now.getMonth()];
    const date = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    const monthYear = `${monthAbbrev}${year}`;
    const monthDayYear = `${monthAbbrev}${date}${year}`;

    let fileName = "file_name";
    if (file && file.name) {
      fileName = file.name.replace(/\.[^/.]+$/, "");
    }

    const parts = adOrder.map((key) => {
      if (!selectedItems.includes(key)) return null;

      if (key === "adType") {
        if (!file) return "file_type";
        const fileType = file.type || file.mimeType || "";
        if (fileType.startsWith("image/")) return "Static";
        if (fileType.startsWith("video/")) return "Video";
        return "file_type";
      }
      if (key === "dateType") {
        return dateTypeInput === "MonthDDYYYY" ? monthDayYear : monthYear;
      }
      if (key === "fileName") return fileName;
      if (key === "iteration") {
        if (iterationIndex != null) {
          return String(iterationIndex + 1).padStart(2, "0");
        }
        return "01";
      }
      if (key.startsWith("customText_")) {
        const customText = adValues.customTexts?.[key]?.text;
        return customText || "custom_text";
      }

      return null;
    }).filter(Boolean);

    const adName = parts.join("_");
    return adName || "Ad Generated Through Blip";
  }, [adOrder, selectedItems, adValues]);




  const formatDate = (formatStr) => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth(); // 0-indexed
    const year = now.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Fallback if user never customized the placeholder
    const fmt = formatStr === 'custom'
      ? 'MMDDYYYY'
      : formatStr.toUpperCase();

    // Order matters — replace longer tokens first to avoid partial matches
    return fmt
      .replace(/YYYY/g, String(year))
      .replace(/YY/g, String(year).slice(-2))
      .replace(/MMM/g, monthNames[month])
      .replace(/MM/g, String(month + 1).padStart(2, '0'))
      .replace(/M/g, String(month + 1))
      .replace(/DD/g, String(day).padStart(2, '0'))
      .replace(/D/g, String(day));
  };


  const computeAdNameFromFormula = useCallback((file, iterationIndex = 0, link = "", formula = null, adType = "") => {

    if (!adNameFormulaV2?.rawInput) {
      return computeAdName(file, adValues.dateType, iterationIndex);
    }

    const formulaToUse = formula || adNameFormulaV2;
    if (!formulaToUse?.rawInput) {
      return computeAdName(file, adValues.dateType, iterationIndex);
    }

    let fileName = "";
    if (file && file.name) {
      fileName = file.name.replace(/\.[^/.]+$/, "");
    }

    let fileType = "";
    if (file) {
      if (isVideoFile(file)) {
        fileType = "Video";
      } else {
        fileType = "Static";
      }
    }

    // Extract URL slug
    let urlSlug = "";
    if (link) {
      try {
        const urlWithoutProtocol = link.replace(/^https?:\/\//, "");
        const lastSlashIndex = urlWithoutProtocol.lastIndexOf("/");
        if (lastSlashIndex > 0 && lastSlashIndex < urlWithoutProtocol.length - 1) {
          urlSlug = urlWithoutProtocol.substring(lastSlashIndex + 1);
        }
      } catch (e) {
        urlSlug = "";
      }
    }

    let adTypeLabel = "";
    if (adType) {
      try {
        if (adType === 'flexible')
          adTypeLabel = 'FLEX';
        else if (adType === 'carousel')
          adTypeLabel = 'CAR';
        else adTypeLabel = fileType;
      } catch (e) {
        adTypeLabel = "";
      }
    }

    // Legacy formats (backward compat — no migration needed)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthAbbrev = monthNames[now.getMonth()];
    const date = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();

    let adName = formulaToUse.rawInput
      .replace(/\{\{File Name\}\}/gi, fileName)
      .replace(/\{\{File Type\}\}/gi, fileType)
      .replace(/\{\{Date \(MonthYYYY\)\}\}/gi, `${monthAbbrev}${year}`)
      .replace(/\{\{Date \(MonthDDYYYY\)\}\}/gi, `${monthAbbrev}${date}${year}`)
      .replace(/\{\{Date\(([^)]+)\)\}\}/gi, (match, fmt) => formatDate(fmt))
      .replace(/\{\{Iteration\}\}/gi, String(iterationIndex + 1).padStart(2, "0"))
      .replace(/\{\{URL Slug\}\}/gi, urlSlug)
      .replace(/\{\{Ad Type\}\}/gi, adTypeLabel);
    adName = adName.replace(/\{\{([^:}]+):([^}]+)\}\}/g, (match, category, value) => value);
    adName = adName.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
      // Don't touch built-in variables that weren't already replaced
      // (shouldn't happen, but safety check)
      return "";
    });


    return adName.trim() || "Ad Generated Through Blip";
  }, [adNameFormulaV2]);


  useEffect(() => {
    const adName = computeAdNameFromFormula(null);
    setAdName(adName);
  }, [adNameFormulaV2, computeAdNameFromFormula]);


  useEffect(() => {
    if (!isCarouselAd) return;
    const fileCount = files.length + driveFiles.length + dropboxFiles.length + importedFiles.length;

    if (applyTextToAllCards && fileCount > 0) {
      const firstMessage = messages[0] || "";
      if (messages.length !== fileCount || messages.some((message) => message !== firstMessage)) {
        setMessages(new Array(fileCount).fill(firstMessage));
      }
    }

    if (applyHeadlinesToAllCards && fileCount > 0) {
      const firstHeadline = headlines[0] || "";
      if (headlines.length !== fileCount || headlines.some((headline) => headline !== firstHeadline)) {
        setHeadlines(new Array(fileCount).fill(firstHeadline));
      }
    }
  }, [
    files.length,
    driveFiles.length,
    dropboxFiles.length,
    importedFiles.length,
    isCarouselAd,
    applyTextToAllCards,
    applyHeadlinesToAllCards,
    messages,
    headlines
  ]);


  const duplicateAdSetRequest = async (adSetId, campaignId, adAccountId, adSetName) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/duplicate-adset`,
      { adSetId, campaignId, adAccountId, newAdSetName: adSetName ?? newAdSetName },
      { withCredentials: true },
    )
    return response.data.copied_adset_id
  }

  const hasShopAutomaticAdSets = useMemo(() => {
    if (duplicateAdSet) {
      const adset = adSets.find((a) => a.id === duplicateAdSet);
      return adset?.destination_type === "SHOP_AUTOMATIC";
    }

    return selectedAdSets.some((adsetId) => {
      const adset = adSets.find((a) => a.id === adsetId);
      return adset?.destination_type === "SHOP_AUTOMATIC";
    });
  }, [duplicateAdSet, selectedAdSets, adSets]);

  const areAllAdSetsPhoneCall = useCallback(() => {
    if (duplicateAdSet) {
      const adset = adSets.find((a) => a.id === duplicateAdSet);
      return adset?.destination_type === "PHONE_CALL";
    }

    if (selectedAdSets.length === 0) {
      return false;
    }

    return selectedAdSets.every((adsetId) => {
      const adset = adSets.find((a) => a.id === adsetId);
      return adset?.destination_type === "PHONE_CALL";
    });
  }, [duplicateAdSet, selectedAdSets, adSets]);

  const showShopDestinationSelector = hasShopAutomaticAdSets && pageId;
  const showPhoneNumberField = areAllAdSetsPhoneCall();
  const requiresDestinationValue = importedPosts.length === 0 && !useExistingPosts;
  const isMissingDestinationValue = requiresDestinationValue && (
    showPhoneNumberField
      ? !phoneNumber.trim()
      : ((!showCustomLink && !link[0]) || (showCustomLink && !customLink.trim()))
  );
  const hasAdNameFormulaConfigured = Boolean(adNameFormulaV2?.rawInput?.trim());

  useEffect(() => {
    const defaultCta = adAccountSettings?.defaultCTA || "LEARN_MORE";

    if (showPhoneNumberField) {
      if (cta !== "CALL_NOW") {
        wasPhoneCallCtaAutoAppliedRef.current = true;
        setCta("CALL_NOW");
      }
      return;
    }

    if (wasPhoneCallCtaAutoAppliedRef.current && cta === "CALL_NOW") {
      wasPhoneCallCtaAutoAppliedRef.current = false;
      setCta(defaultCta);
    }
  }, [showPhoneNumberField, cta, setCta, adAccountSettings?.defaultCTA]);


  const shouldShowLeadFormSelector = useMemo(() => {
    // Must have selections
    if (selectedCampaign.length === 0 || selectedAdSets.length === 0) {
      return false;
    }

    // All selected campaigns must have LEADS objective
    const allCampaignsAreLeads = selectedCampaign.every(campId => {
      const campaign = campaigns.find(c => c.id === campId);
      return campaign?.objective === 'OUTCOME_LEADS' || campaign?.objective === 'LEADS';
    });

    if (!allCampaignsAreLeads) {
      return false;
    }

    // All selected ad sets must have valid destination types
    const validDestinations = ['WEBSITE_AND_LEAD_FORM', 'ON_AD', 'LEAD_FORM_MESSENGER'];
    const allAdSetsValid = selectedAdSets.every(adSetId => {
      const adSet = adSets.find(a => a.id === adSetId);
      return validDestinations.includes(adSet?.destination_type);
    });

    return allAdSetsValid;
  }, [selectedCampaign, selectedAdSets, campaigns, adSets]);

  // Fetch leadgen forms when conditions are met
  useEffect(() => {
    const fetchLeadgenForms = async () => {
      if (!shouldShowLeadFormSelector || !pageId) {
        setLeadgenForms([]);
        setSelectedForm(null);
        return;
      }

      setLoadingForms(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/fetch-leadgen-forms?pageId=${encodeURIComponent(pageId)}`,
          { credentials: 'include' }
        );
        const data = await response.json();

        if (data.success && data.forms) {
          setLeadgenForms(data.forms);
        } else {
          setLeadgenForms([]);
        }
      } catch (error) {
        console.error('Error fetching leadgen forms:', error);
        setLeadgenForms([]);
      } finally {
        setLoadingForms(false);
      }
    };

    fetchLeadgenForms();
  }, [shouldShowLeadFormSelector, pageId]);





  // Check if current copy combo already exists in another template
  // Has the user changed anything from the currently selected template's saved values?
  const hasUnsavedTemplateChangesRaw = useMemo(() => {
    if (!selectedTemplate || !copyTemplates[selectedTemplate]) return false;
    const tpl = copyTemplates[selectedTemplate];
    return (
      JSON.stringify(messages.filter(t => t.trim())) !== JSON.stringify(tpl.primaryTexts || []) ||
      JSON.stringify(headlines.filter(t => t.trim())) !== JSON.stringify(tpl.headlines || []) ||
      JSON.stringify((descriptions || []).filter(t => t !== "")) !== JSON.stringify(tpl.descriptions || [])
    );
  }, [messages, headlines, descriptions, copyTemplates, selectedTemplate]);

  const [hasUnsavedTemplateChanges, setHasUnsavedTemplateChanges] = useState(false);

  useEffect(() => {
    if (!hasUnsavedTemplateChangesRaw) {
      setHasUnsavedTemplateChanges(false);
      return;
    }
    const timer = setTimeout(() => setHasUnsavedTemplateChanges(true), 300);
    return () => clearTimeout(timer);
  }, [hasUnsavedTemplateChangesRaw]);

  // Has the user typed anything at all (for no-template state)?
  const hasAnyContent = useMemo(() =>
    messages.some(t => t.trim()) || headlines.some(t => t.trim()),
    [messages, headlines]
  );

  // Does this exact combo already exist in another template?
  const existingDuplicateTemplate = useMemo(() => {
    const currentPrimary = JSON.stringify(messages.filter(t => t.trim()).sort());
    const currentHL = JSON.stringify(headlines.filter(t => t.trim()).sort());
    const currentDescs = JSON.stringify((descriptions || []).filter(t => t !== "").sort());
    for (const [name, tpl] of Object.entries(copyTemplates)) {
      if (name === selectedTemplate) continue;
      if (
        currentPrimary === JSON.stringify((tpl.primaryTexts || []).filter(t => t.trim()).sort()) &&
        currentHL === JSON.stringify((tpl.headlines || []).filter(t => t.trim()).sort()) &&
        currentDescs === JSON.stringify((tpl.descriptions || []).filter(t => t.trim()).sort())
      ) return name;
    }
    return null;
  }, [messages, headlines, descriptions, copyTemplates, selectedTemplate]);

  const handleSaveAsNewTemplate = async () => {
    const name = newTemplateNameInput.trim();
    if (!name || copyTemplates[name]) return;
    setIsSavingNew(true);
    try {
      const templateData = {
        name,
        primaryTexts: messages.filter(t => t.trim()),
        headlines: headlines.filter(t => t.trim()),
        descriptions: (descriptions || []).filter(t => t !== ""),
      };
      await saveCopyTemplate(selectedAdAccount, name, templateData, false);
      preferredTemplateRef.current = name;
      await refetchCopyTemplates();
      toast.success("Template saved!");
      setShowSaveNewDialog(false);
      setNewTemplateNameInput("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save template");
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleUpdateSelectedTemplate = async () => {
    if (!selectedTemplate || !copyTemplates[selectedTemplate]) return;
    setIsUpdatingTemplate(true);
    try {
      const templateData = {
        name: selectedTemplate,
        primaryTexts: messages.filter(t => t.trim()),
        headlines: headlines.filter(t => t.trim()),
        descriptions: (descriptions || []).filter(t => t !== ""),
      };
      await saveCopyTemplate(selectedAdAccount, selectedTemplate, templateData, false);
      preferredTemplateRef.current = selectedTemplate;
      await refetchCopyTemplates();
      toast.success("Template updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update template");
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  const sortedFilteredTemplates = useMemo(() => {
    let entries = Object.entries(copyTemplates);

    if (templateSearch.trim()) {
      const query = templateSearch.toLowerCase();
      entries = entries.filter(([name]) => name.toLowerCase().includes(query));
    }

    entries.sort(([a, aData], [b, bData]) => {
      if (a === defaultTemplateName) return -1;
      if (b === defaultTemplateName) return 1;

      if (sortMode === "most_used") {
        return (bData?.usageCount || 0) - (aData?.usageCount || 0);
      }
      if (sortMode === "oldest") return 0;
      return a.localeCompare(b);
    });

    if (sortMode === "oldest") {
      const defaultEntry = entries.find(([name]) => name === defaultTemplateName);
      const rest = entries.filter(([name]) => name !== defaultTemplateName);
      entries = defaultEntry ? [defaultEntry, ...rest.reverse()] : rest.reverse();
    }

    return entries;
  }, [copyTemplates, defaultTemplateName, templateSearch, sortMode]);

  const handleBulkDeleteTemplates = useCallback(async () => {
    if (selectedForDelete.size === 0) return;
    const namesToDelete = [...selectedForDelete];
    setIsDeletingTemplates(true);
    try {
      await deleteCopyTemplates(selectedAdAccount, namesToDelete);
      if (namesToDelete.includes(selectedTemplate)) {
        setSelectedTemplate("");
      }
      await refetchCopyTemplates();
      toast.success(`Deleted ${namesToDelete.length} template${namesToDelete.length > 1 ? "s" : ""}`);
      setSelectedForDelete(new Set());
      setBulkDeleteMode(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete templates");
    } finally {
      setIsDeletingTemplates(false);
    }
  }, [selectedAdAccount, selectedForDelete, selectedTemplate, setSelectedTemplate, refetchCopyTemplates]);

  const toggleDeleteSelection = useCallback((name) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);



  const duplicateIndices = useMemo(() => {
    if (isCarouselAd) return { messages: new Set(), headlines: new Set(), descriptions: new Set() };

    const findDupes = (arr) => {
      const dupes = new Set();
      const seen = {};
      arr.forEach((val, i) => {
        const trimmed = val.trim().toLowerCase();
        if (!trimmed) return;
        if (trimmed in seen) {
          dupes.add(i);
        } else {
          seen[trimmed] = i;
        }
      });
      return dupes;
    };

    return {
      messages: findDupes(messages),
      headlines: findDupes(headlines),
      descriptions: findDupes(descriptions),
    };
  }, [messages, headlines, descriptions, isCarouselAd]);

  const hasDuplicates = useMemo(() =>
    duplicateIndices.messages.size > 0 ||
    duplicateIndices.headlines.size > 0 ||
    duplicateIndices.descriptions.size > 0,
    [duplicateIndices]
  );


  const handleCreateAd = async (jobData) => {


    const abortController = new AbortController();
    const signal = abortController.signal;
    setCurrentAbortController(abortController);

    const throwIfCancelled = () => {
      if (signal.aborted) throw new DOMException('Job cancelled. Some Ads might still have been made.', 'AbortError');
    };


    const {
      // Form content
      headlines,
      descriptions,
      messages,
      link,
      cta,

      // Files
      files,
      driveFiles,
      dropboxFiles,
      videoThumbs,
      thumbnail,
      importedPosts,
      importedFiles,
      selectedIgOrganicPosts,   // ADD THIS


      selectedAdSets,
      duplicateAdSet,
      newAdSetName,
      pageId,
      instagramAccountId,
      selectedAdAccount,
      selectedCampaign,

      // Configuration
      launchPaused,
      adType,
      isCarouselAd,
      enablePlacementCustomization,
      fileGroups,

      // Shop
      selectedShopDestination,
      selectedShopDestinationType,
      selectedForm,
      //partnership ads
      isPartnershipAd,
      partnerIgAccountId,
      partnerFbPageId,
      partnershipIdentityMode,


      // Other
      adValues,
      adScheduleStartTime,
      adScheduleEndTime,
      phoneNumber,
      adSets
    } = jobData.formData;



    setIsCreatingAds(true);
    setProgress(0);
    setProgressMessage('Starting ad creation...');


    if (uploadingToS3) {
      setPublishPending(true);
      toast.info("Waiting for video upload to finish...");
      return;
    }

    if (selectedAdSets.length === 0 && !duplicateAdSet) {
      toast.error("Please select at least one ad set");
      return;
    }

    if (files.length === 0 && driveFiles.length === 0 && dropboxFiles.length === 0 && importedPosts.length === 0 && importedFiles.length === 0 && (!selectedIgOrganicPosts || selectedIgOrganicPosts.length === 0)) {
      toast.error("Please upload at least one file or import from Drive");
      return;
    }

    if (showShopDestinationSelector && !selectedShopDestination) {
      toast.error("Please select a shop destination for shop ads")
      return
    }
    if (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === "")) {
      toast.error("Please enter a name for the new ad set")
      return
    }


    let aspectRatioMap = {};
    // Replace your existing code with this:
    if (enablePlacementCustomization) {
      setProgressMessage('Analyzing video files...');

      try {
        const allFiles = [...files, ...driveFiles, ...dropboxFiles];
        const videoFiles = allFiles.filter(isVideoFile);

        if (videoFiles.length > 0) {
          const BATCH_SIZE = 3;

          for (let i = 0; i < videoFiles.length; i += BATCH_SIZE) {
            const batch = videoFiles.slice(i, i + BATCH_SIZE);

            // Update progress message
            setProgressMessage(`Analyzing videos: ${Math.min(i + BATCH_SIZE, videoFiles.length)}/${videoFiles.length}`);
            const batchPromises = batch.map(async (file) => {
              try {
                const aspectRatio = await getVideoAspectRatio(file);
                if (aspectRatio) {
                  // const key = file.id || file.name;
                  const key = getFileId(file);
                  return { key, aspectRatio };
                }
                return null;
              } catch (error) {
                console.error(`Failed to get aspect ratio for ${file.name}:`, error);
                const key = getFileId(file);  // ← Use getFileId here too
                return { key, aspectRatio: 16 / 9 }; // Default fallback
              }
            });

            // Wait for batch to complete
            const results = await Promise.all(batchPromises);

            // Add results to map
            results.forEach(result => {
              if (result) {
                aspectRatioMap[result.key] = result.aspectRatio;
              }
            });

            // Let UI breathe between batches (only if more batches remain)
            if (i + BATCH_SIZE < videoFiles.length) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
        }
      } catch (error) {
        console.error('Error getting video aspect ratios:', error);
        // Continue anyway with defaults
      }



      if (importedFiles && importedFiles.length > 0) {
        importedFiles.forEach(file => {
          if (file.width && file.height) {
            const aspectRatio = file.width / file.height;
            const key = file.type === 'image' ? file.hash : file.id;
            aspectRatioMap[key] = aspectRatio;
          }
        });
      }
    }

    const largeFiles = files.filter(file =>
      isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD
    );
    const largeDriveFiles = driveFiles.filter(file =>
      isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD
    );
    const largeDropboxFiles = dropboxFiles.filter(file =>
      isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD
    );

    let s3Results = [];
    const s3DriveResults = [];
    const s3DropboxResults = [];

    const totalLargeFiles = largeFiles.length + largeDriveFiles.length + largeDropboxFiles.length;
    if (totalLargeFiles > 0) {
      setProgressMessage(`Uploading videos...`);

      // Set up concurrency limiter
      const limit = pLimit(3)


      const CHUNK_SIZE = 10 * 1024 * 1024;
      const allFiles = largeFiles; // Or largeFiles + largeDriveFiles if needed

      const totalChunksAllFiles = allFiles.reduce(
        (sum, file) => sum + Math.ceil(file.size / CHUNK_SIZE),
        0
      );
      let uploadedChunks = 0;

      const updateOverallProgress = () => {
        if (signal?.aborted) return; // Don't update progress after cancel
        uploadedChunks += 1;
        const percent = Math.round((uploadedChunks / totalChunksAllFiles) * 100);
        setProgress(percent);
        setProgressMessage("Uploading files for processing...");
      };

      const uploadPromises = largeFiles.map(file =>
        limit(() => {
          throwIfCancelled();
          return uploadToS3(file, updateOverallProgress, getFileId(file), 2, signal);
        })
      );




      const results = await Promise.allSettled(uploadPromises);



      // Process regular file results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const uploadResult = result.value;
          if (enablePlacementCustomization && aspectRatioMap[getFileId(largeFiles[index])]) {
            uploadResult.aspectRatio = aspectRatioMap[getFileId(largeFiles[index])];
          }
          s3Results.push(uploadResult);
        } else {
          // Don't show error toast if this was a user cancellation
          const isCancellation = result.reason?.name === 'AbortError' ||
            axios.isCancel(result.reason) ||
            signal?.aborted;

          if (!isCancellation) {
            toast.error(`Failed to upload ${largeFiles[index].name} due to weak network connection. Reload page to try again`);
          }
          console.error(`❌ Failed to upload ${largeFiles[index].name}:`, result.reason);
        }
      });

      // Upload Drive files with concurrency control
      const driveUploadPromises = largeDriveFiles.map(file =>
        limit(() => {
          throwIfCancelled();
          return uploadDriveFileToS3(file, 3, signal);
        })
      );

      const driveResults = await Promise.allSettled(driveUploadPromises);

      // Process Drive file results
      driveResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const uploadResult = result.value; // The complete object is now the result

          // Include aspect ratio if we have it
          if (enablePlacementCustomization && aspectRatioMap[getFileId(largeDriveFiles[index])]) {
            uploadResult.aspectRatio = aspectRatioMap[getFileId(largeDriveFiles[index])];
          }

          s3DriveResults.push(uploadResult);



        } else {
          const isCancellation = result.reason?.name === 'AbortError' ||
            axios.isCancel(result.reason) ||
            signal?.aborted;

          if (!isCancellation) {
            toast.error(`Failed to upload Drive video: ${largeDriveFiles[index].name}`);
          }
          console.error("❌ Google Drive to S3 upload failed", result.reason);
        }
      });

      // Upload Dropbox files with concurrency control
      const dropboxUploadPromises = largeDropboxFiles.map(file =>
        limit(() => {
          throwIfCancelled();
          return uploadDropboxFileToS3(file, 3, signal);
        })
      );

      const dropboxResults = await Promise.allSettled(dropboxUploadPromises);

      // Process Dropbox file results
      dropboxResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const uploadResult = result.value;
          if (enablePlacementCustomization && aspectRatioMap[getFileId(largeDropboxFiles[index])]) {
            uploadResult.aspectRatio = aspectRatioMap[getFileId(largeDropboxFiles[index])];
          }
          uploadResult.dropboxId = largeDropboxFiles[index].dropboxId;  // ✅ Add this if missing
          s3DropboxResults.push(uploadResult);
        } else {
          const isCancellation = result.reason?.name === 'AbortError' ||
            axios.isCancel(result.reason) ||
            signal?.aborted;

          if (!isCancellation) {
            toast.error(`Failed to upload Dropbox video: ${largeDriveFiles[index].name}`);
          }
          console.error("❌ Dropbox to S3 upload failed", result.reason);
        }
      });
      throwIfCancelled();
      setProgress(100);
      setProgressMessage('File upload complete! Creating ads...');
      // toast.success("Video files uploaded!");
    }
    throwIfCancelled(); // ADD THIS LINE
    // 🔧 NOW start the actual job (50-100% progress)
    const frontendJobId = uuidv4();
    currentJobIdRef.current = frontendJobId;
    const smallDriveFiles = driveFiles.filter(file =>
      !(isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD)
    );

    const smallDropboxFiles = dropboxFiles.filter(file =>
      !(isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD)
    );


    // Determine the ad set(s) to use: if "Create New AdSet" is chosen, duplicate it
    let finalAdSetIds = [...selectedAdSets];
    if (duplicateAdSet) {
      try {
        throwIfCancelled();
        const newAdSetId = await duplicateAdSetRequest(duplicateAdSet, selectedCampaign[0], selectedAdAccount, newAdSetName.trim());
        finalAdSetIds = [newAdSetId];
        jobData.formData.selectedAdSets = [newAdSetId];
        onAdSetCreated?.({
          newAdSetId,
          sourceAdSetId: duplicateAdSet,
          name: newAdSetName.trim(),
          campaignId: selectedCampaign[0],
        });

      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || "Unknown error";
        setIsLoading(false);
        throw new Error("Error duplicating ad set: " + (errorMessage || "Unknown error"));
      }
    }

    // Separate the adsets into dynamic and non-dynamic arrays
    const dynamicAdSetIds = [];
    const nonDynamicAdSetIds = [];
    finalAdSetIds.forEach((adsetId) => {
      const adset = adSets.find((a) => a.id === adsetId);
      if (adset) {
        if (adset.is_dynamic_creative) {
          dynamicAdSetIds.push(adsetId);
        } else {
          nonDynamicAdSetIds.push(adsetId);
        }
      } else if (duplicateAdSet) {
        // For a duplicated adset not found locally, use the original adset's dynamic flag.
        const originalAdset = adSets.find((a) => a.id === duplicateAdSet);
        if (originalAdset && originalAdset.is_dynamic_creative) {
          dynamicAdSetIds.push(adsetId);
        } else {
          nonDynamicAdSetIds.push(adsetId);
        }
      }
    });


    // Add carousel validation
    if (isCarouselAd) {
      if (fileGroups && fileGroups.length > 0) {
        for (let i = 0; i < fileGroups.length; i++) {
          const group = fileGroups[i];
          if (group.length < 2) {
            toast.error(`Carousel group ${i + 1} needs at least 2 cards`);
            setIsLoading(false);
            return;
          }
          if (group.length > 10) {
            toast.error(`Carousel group ${i + 1} can have maximum 10 cards`);
            setIsLoading(false);
            return;
          }
        }
      } else {
        const totalFiles = files.length + driveFiles.length + dropboxFiles.length + (importedFiles?.length || 0);
        if (totalFiles < 2) {
          toast.error("Carousel ads require at least 2 files");
          setIsLoading(false);
          return;
        }
        if (totalFiles > 10) {
          toast.error("Carousel ads can have maximum 10 cards");
          setIsLoading(false);
          return;
        }
      }
    }

    // Add flexible ads validation
    if (adType === 'flexible') {
      const totalFiles = files.length + driveFiles.length + dropboxFiles.length + (importedFiles?.length || 0);


      // If no groups, validate single ad
      if (fileGroups.length === 0) {
        if (totalFiles > 10) {
          toast.error("Flexible ads can have maximum 10 files per ad. Use grouping to create multiple ads.");
          setIsLoading(false);
          return;
        }
        if (totalFiles < 1) {
          toast.error("Flexible ads require at least 1 file");
          setIsLoading(false);
          return;
        }
      } else {
        // Validate groups
        const hasInvalidGroup = fileGroups.some(group => group.length > 10);
        if (hasInvalidGroup) {
          toast.error("Each flexible ad group can have maximum 10 files");
          setIsLoading(false);
          return;
        }
      }
    }


    /**
     * Pre-compute common values that don't change per iteration
     */
    const preComputeCommonValues = (headlines, descriptions, messages, link) => {
      return {
        headlinesJSON: JSON.stringify(headlines),
        descriptionsJSON: JSON.stringify(descriptions),
        messagesJSON: JSON.stringify(messages),
        linkJSON: JSON.stringify(link)
      };
    };

    /**
     * Append common formData fields shared across all ad types
     */
    const appendCommonFields = (
      formData,
      {
        adName,
        headlinesJSON,
        descriptionsJSON,
        messagesJSON,
        selectedAdAccount,
        adSetId,
        pageId,
        instagramAccountId,
        linkJSON,
        phoneNumber,
        usePhoneNumberField,
        cta,
        launchPaused,
        jobId,
        selectedForm,
        isPartnershipAd,
        partnerIgAccountId,
        partnerFbPageId,
        partnershipIdentityMode,
        adScheduleStartTime,
        adScheduleEndTime,
      }
    ) => {
      formData.append("adName", adName);
      formData.append("headlines", headlinesJSON);
      formData.append("descriptions", descriptionsJSON);
      formData.append("messages", messagesJSON);
      formData.append("adAccountId", selectedAdAccount);
      formData.append("adSetId", adSetId);
      formData.append("pageId", pageId);
      formData.append("instagramAccountId", instagramAccountId);
      if (usePhoneNumberField) {
        formData.append("phoneNumber", phoneNumber);
      } else {
        formData.append("link", linkJSON);
      }
      formData.append("cta", cta);
      formData.append("launchPaused", launchPaused);
      formData.append("jobId", jobId);
      if (selectedForm) {
        formData.append("leadgenFormId", selectedForm);
      }
      if (isPartnershipAd && (partnerIgAccountId || partnerFbPageId)) {
        formData.append("isPartnershipAd", "true");
        if (partnerIgAccountId) {
          formData.append("partnerIgAccountId", partnerIgAccountId);
        }
        if (partnerFbPageId) {
          formData.append("partnerFbPageId", partnerFbPageId);
        }
        if (partnershipIdentityMode === 'first_identity_only') {
          formData.append("partnershipIdentityMode", "first_identity_only");
        }

      }

      if (adScheduleStartTime) {
        formData.append("adScheduleStartTime", adScheduleStartTime);
      }
      if (adScheduleEndTime) {
        formData.append("adScheduleEndTime", adScheduleEndTime);
      }
      // At the end of appendCommonFields, after the if blocks that append


    };

    /**
     * Append shop destination fields if applicable
     */
    const appendShopDestination = (formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector) => {
      if (selectedShopDestination && showShopDestinationSelector) {
        formData.append("shopDestination", selectedShopDestination);
        formData.append("shopDestinationType", selectedShopDestinationType);
      }
    };



    /**
     * Append flexible ad specific fields
     */
    const appendFlexibleAdFields = (formData, { adType, totalGroups, currentGroupIndex, hasUngroupedFiles }) => {
      formData.append("isCarouselAd", false);
      formData.append("adType", adType);
      formData.append("enablePlacementCustomization", false);

      if (totalGroups !== undefined) {
        formData.append("totalGroups", totalGroups);
        formData.append("currentGroupIndex", currentGroupIndex);
      }

      if (hasUngroupedFiles !== undefined) {
        formData.append("hasUngroupedFiles", hasUngroupedFiles);
      }
    };

    /**
     * Append dynamic ad set specific fields
     */
    const appendDynamicAdSetFields = (formData, { isCarouselAd, thumbnail }) => {
      formData.append("isCarouselAd", isCarouselAd);
      formData.append("enablePlacementCustomization", false);

      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }
    };

    /**
     * Append placement customization fields
     */
    const appendPlacementCustomizationFields = (formData, { enablePlacementCustomization, totalGroups, currentGroupIndex, videoMetadata }) => {
      formData.append("enablePlacementCustomization", enablePlacementCustomization);

      if (totalGroups !== undefined) {
        formData.append("totalGroups", totalGroups);
        formData.append("currentGroupIndex", currentGroupIndex);
      }

      if (videoMetadata && videoMetadata.length > 0) {



        formData.append("videoMetadata", JSON.stringify(videoMetadata));
      }
    };

    /**
     * Append media files for a specific group
     */
    const appendGroupMediaFiles = (
      formData,
      group,
      {
        files,
        smallDriveFiles,
        smallDropboxFiles,
        s3Results,
        s3DriveResults,
        s3DropboxResults,
        S3_UPLOAD_THRESHOLD,
        getFileId,
        isVideoFile,
        aspectRatioMap,
        importedFiles
      }
    ) => {
      const groupVideoMetadata = [];




      // Add local files from this group
      group.forEach(fileId => {
        const file = files.find(f => getFileId(f) === fileId);
        if (file && !file.isDrive && !file.isDropbox && (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD)) {
          formData.append("mediaFiles", file);

          if (isVideoFile(file)) {
            groupVideoMetadata.push({
              fileName: file.name,
              uniqueId: getFileId(file),
              aspectRatio: aspectRatioMap[getFileId(file)] || 16 / 9
            });
          }
        }
      });

      // Add drive files from this group
      group.forEach(fileId => {
        const driveFile = smallDriveFiles.find(f => f.id === fileId);
        if (driveFile) {
          formData.append("driveFiles", JSON.stringify({
            id: driveFile.id,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
            accessToken: driveFile.accessToken
          }));

          if (isVideoFile(driveFile)) {
            groupVideoMetadata.push({
              driveId: driveFile.id,
              aspectRatio: aspectRatioMap[getFileId(driveFile)] || 16 / 9
            });
          }
        }
      });

      // Add dropbox files from this group
      group.forEach(fileId => {
        const dropboxFile = smallDropboxFiles.find(f => f.dropboxId === fileId);
        if (dropboxFile) {
          formData.append("dropboxFiles", JSON.stringify({
            dropboxId: dropboxFile.dropboxId,
            name: dropboxFile.name,
            directLink: dropboxFile.directLink,
            mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name)
          }));

          if (isVideoFile(dropboxFile)) {
            groupVideoMetadata.push({
              dropboxId: dropboxFile.dropboxId,
              aspectRatio: aspectRatioMap[getFileId(dropboxFile)] || 16 / 9
            });
          }
        }
      });

      // CONSOLIDATED: Add ALL S3 files from this group (local, drive, and dropbox)
      group.forEach(fileId => {
        const allS3Results = [...s3Results, ...s3DriveResults, ...s3DropboxResults];



        const s3File = allS3Results.find(f =>
          f.uniqueId === fileId || f.id === fileId || f.dropboxId === fileId
        );




        if (s3File) {
          formData.append("s3VideoUrls", s3File.s3Url);
          formData.append("s3VideoNames", s3File.name);



          if (isVideoFile(s3File)) {
            groupVideoMetadata.push({
              s3Url: s3File.s3Url,
              aspectRatio: s3File.aspectRatio || 16 / 9
            });



          }
        } else {
          // 🔴 ADD THIS LOG

        }
      });

      // Add meta library files from this group
      group.forEach(fileId => {
        const metaFile = (importedFiles || []).find(f =>
          (f.type === 'image' && f.hash === fileId) ||
          (f.type === 'video' && f.id === fileId)
        );
        if (metaFile) {
          if (metaFile.type === 'image') {
            formData.append("metaImageHashes", metaFile.hash);
            formData.append("metaImageNames", metaFile.name);
            formData.append("metaImageWidths", String(metaFile.width || 0));
            formData.append("metaImageHeights", String(metaFile.height || 0));
          } else if (metaFile.type === 'video') {
            formData.append("metaVideoIds", metaFile.id);
            formData.append("metaVideoNames", metaFile.name);
            formData.append("metaVideoWidths", String(metaFile.width || 0));
            formData.append("metaVideoHeights", String(metaFile.height || 0));

            groupVideoMetadata.push({
              metaVideoId: metaFile.id,
              aspectRatio: (metaFile.width && metaFile.height)
                ? metaFile.width / metaFile.height
                : 16 / 9
            });
          }
        }
      });


      return groupVideoMetadata;

    };

    /**
     * Append all media files (for ungrouped scenarios)
     */
    const appendAllMediaFiles = (
      formData,
      {
        files,
        smallDriveFiles,
        smallDropboxFiles,
        s3Results,
        s3DriveResults,
        s3DropboxResults,   // ADD THIS
        S3_UPLOAD_THRESHOLD,
        importedFiles,
      }
    ) => {
      // Add all small local files
      files.forEach((file) => {
        if (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD) {
          formData.append("mediaFiles", file);
        }
      });

      // Add all small drive files
      smallDriveFiles.forEach((driveFile) => {
        formData.append("driveFiles", JSON.stringify({
          id: driveFile.id,
          name: driveFile.name,
          mimeType: driveFile.mimeType,
          accessToken: driveFile.accessToken
        }));
      });

      smallDropboxFiles.forEach((dropboxFile) => {
        formData.append("dropboxFiles", JSON.stringify({
          dropboxId: dropboxFile.dropboxId,
          name: dropboxFile.name,
          directLink: dropboxFile.directLink,
          mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name)
        }));
      });

      // Add all large file URLs (S3)
      [...s3Results, ...s3DriveResults, ...s3DropboxResults].forEach((s3File) => {
        formData.append("s3VideoUrls", s3File.s3Url);
        formData.append("s3VideoNames", s3File.name);
      });

      if (importedFiles && importedFiles.length > 0) {
        const metaImages = importedFiles.filter(f => f.type === 'image');
        const metaVideos = importedFiles.filter(f => f.type === 'video');

        metaImages.forEach((metaFile) => {
          formData.append("metaImageHashes", metaFile.hash);
          formData.append("metaImageNames", metaFile.name);
        });

        metaVideos.forEach((metaFile) => {
          formData.append("metaVideoIds", metaFile.id);
          formData.append("metaVideoNames", metaFile.name);
        });
      }

    };

    /**
     * Append single image file fields
     */
    const appendSingleImageFile = (formData, { file, thumbnail }) => {
      formData.append("imageFile", file);
      formData.append("enablePlacementCustomization", false);

      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }
    };

    /**
     * Append single drive file fields
     */
    const appendSingleDriveFile = (formData, driveFile) => {
      formData.append("enablePlacementCustomization", false);
      formData.append("driveFile", "true");
      formData.append("driveId", driveFile.id);
      formData.append("driveMimeType", driveFile.mimeType);
      formData.append("driveAccessToken", driveFile.accessToken);
      formData.append("driveName", driveFile.name);
    };


    /**
 * Append single dropbox file fields
 */
    const appendSingleDropboxFile = (formData, dropboxFile) => {
      formData.append("enablePlacementCustomization", false);
      formData.append("dropboxFile", "true");
      formData.append("dropboxId", dropboxFile.dropboxId);
      formData.append("dropboxLink", dropboxFile.directLink);
      formData.append("dropboxName", dropboxFile.name);
      formData.append("dropboxMimeType", dropboxFile.mimeType || getMimeFromName(dropboxFile.name));
    };

    /**
     * Append single S3 file fields
     */
    const appendSingleS3File = (formData, s3File) => {
      formData.append("s3VideoUrl", s3File.s3Url);
      formData.append("s3VideoName", s3File.name);
      formData.append("enablePlacementCustomization", false);
    };

    /**
    * Append single Meta library image file fields
    */
    const appendMetaImageFile = (formData, metaFile) => {
      formData.append("metaImageHash", metaFile.hash);
      formData.append("metaImageName", metaFile.name);
      formData.append("enablePlacementCustomization", false);
    };

    /**
     * Append single Meta library video file fields
     */
    const appendMetaVideoFile = (formData, metaFile) => {
      formData.append("metaVideoId", metaFile.id);
      formData.append("metaVideoName", metaFile.name);
      formData.append("enablePlacementCustomization", false);
    };

    /**
     * Build file order metadata for carousel ads
     */
    const buildCarouselFileOrder = (
      files,
      driveFiles,
      dropboxFiles,      // ADD THIS
      s3Results,
      s3DriveResults,
      s3DropboxResults,  // ADD THIS
      S3_UPLOAD_THRESHOLD,
      importedFiles  // ADD THIS PARAMETER

    ) => {
      const fileOrder = [];
      let fileIndex = 0;

      // Process files in the order they appear in the UI
      files.forEach((file) => {
        if (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD) {
          fileOrder.push({
            index: fileIndex++,
            type: 'local',
            name: file.name
          });
        } else {
          const s3File = s3Results.find(s3f => s3f.name === file.name);
          if (s3File) {
            fileOrder.push({
              index: fileIndex++,
              type: 's3',
              url: s3File.s3Url,
              name: file.name
            });
          }
        }
      });

      // Process drive files
      driveFiles.forEach((driveFile) => {
        if (!isVideoFile(driveFile) || driveFile.size <= S3_UPLOAD_THRESHOLD) {
          fileOrder.push({
            index: fileIndex++,
            type: 'drive',
            id: driveFile.id,
            name: driveFile.name
          });
        } else {
          const s3DriveFile = s3DriveResults.find(s3f => s3f.id === driveFile.id);
          if (s3DriveFile) {
            fileOrder.push({
              index: fileIndex++,
              type: 's3',
              url: s3DriveFile.s3Url,
              name: driveFile.name,
              driveId: driveFile.id
            });
          }
        }
      });

      // Process dropbox files
      dropboxFiles.forEach((dropboxFile) => {
        if (!isVideoFile(dropboxFile) || dropboxFile.size <= S3_UPLOAD_THRESHOLD) {
          fileOrder.push({
            index: fileIndex++,
            type: 'dropbox',
            dropboxId: dropboxFile.dropboxId,
            name: dropboxFile.name
          });
        } else {
          const s3DropboxFile = s3DropboxResults.find(s3f => s3f.dropboxId === dropboxFile.dropboxId);
          if (s3DropboxFile) {
            fileOrder.push({
              index: fileIndex++,
              type: 's3',
              url: s3DropboxFile.s3Url,
              name: dropboxFile.name,
              dropboxId: dropboxFile.dropboxId
            });
          }
        }
      });


      if (importedFiles && importedFiles.length > 0) {
        importedFiles.forEach((metaFile) => {
          if (metaFile.type === 'image') {
            fileOrder.push({
              index: fileIndex++,
              type: 'metaImage',
              hash: metaFile.hash,
              name: metaFile.name
            });
          } else if (metaFile.type === 'video') {
            fileOrder.push({
              index: fileIndex++,
              type: 'metaVideo',
              id: metaFile.id,
              name: metaFile.name
            });
          }
        });
      }

      return fileOrder;
    };


    /**
     * Build file order metadata for a single carousel group
     * Iterates in group order so card positions match the group's drag order
     */
    const buildCarouselFileOrderForGroup = (
      group,
      files,
      driveFiles,
      dropboxFiles,
      s3Results,
      s3DriveResults,
      s3DropboxResults,
      S3_UPLOAD_THRESHOLD,
      importedFiles
    ) => {
      const fileOrder = [];
      let fileIndex = 0;

      group.forEach((fileId) => {
        // Check local files
        const localFile = files.find(f => getFileId(f) === fileId);
        if (localFile) {
          if (isVideoFile(localFile) && localFile.size > S3_UPLOAD_THRESHOLD) {
            const s3File = s3Results.find(s3f => s3f.uniqueId === fileId || s3f.name === localFile.name);
            if (s3File) {
              fileOrder.push({ index: fileIndex++, type: 's3', url: s3File.s3Url, name: localFile.name });
            }
          } else {
            fileOrder.push({ index: fileIndex++, type: 'local', name: localFile.name });
          }
          return;
        }

        // Check drive files
        const driveFile = driveFiles.find(f => f.id === fileId);
        if (driveFile) {
          if (isVideoFile(driveFile) && driveFile.size > S3_UPLOAD_THRESHOLD) {
            const s3File = s3DriveResults.find(s3f => s3f.id === fileId);
            if (s3File) {
              fileOrder.push({ index: fileIndex++, type: 's3', url: s3File.s3Url, name: driveFile.name, driveId: driveFile.id });
            }
          } else {
            fileOrder.push({ index: fileIndex++, type: 'drive', id: driveFile.id, name: driveFile.name });
          }
          return;
        }

        // Check dropbox files
        const dropboxFile = dropboxFiles.find(f => f.dropboxId === fileId);
        if (dropboxFile) {
          if (isVideoFile(dropboxFile) && dropboxFile.size > S3_UPLOAD_THRESHOLD) {
            const s3File = s3DropboxResults.find(s3f => s3f.dropboxId === fileId);
            if (s3File) {
              fileOrder.push({ index: fileIndex++, type: 's3', url: s3File.s3Url, name: dropboxFile.name, dropboxId: dropboxFile.dropboxId });
            }
          } else {
            fileOrder.push({ index: fileIndex++, type: 'dropbox', dropboxId: dropboxFile.dropboxId, name: dropboxFile.name });
          }
          return;
        }

        // Check S3 results (for files that were already uploaded)
        const allS3 = [...s3Results, ...s3DriveResults, ...s3DropboxResults];
        const s3File = allS3.find(f => f.uniqueId === fileId || f.id === fileId || f.dropboxId === fileId);
        if (s3File) {
          fileOrder.push({ index: fileIndex++, type: 's3', url: s3File.s3Url, name: s3File.name });
          return;
        }

        // Check meta library files
        if (importedFiles) {
          const metaFile = importedFiles.find(f =>
            (f.type === 'image' && f.hash === fileId) ||
            (f.type === 'video' && f.id === fileId)
          );
          if (metaFile) {
            if (metaFile.type === 'image') {
              fileOrder.push({ index: fileIndex++, type: 'metaImage', hash: metaFile.hash, name: metaFile.name });
            } else {
              fileOrder.push({ index: fileIndex++, type: 'metaVideo', id: metaFile.id, name: metaFile.name });
            }
          }
        }
      });

      return fileOrder;
    };

    /**
 * Append media files from a specific carousel group to formData
 */
    const appendCarouselGroupMediaFiles = (
      formData,
      group,
      {
        files,
        smallDriveFiles,
        smallDropboxFiles,
        s3Results,
        s3DriveResults,
        s3DropboxResults,
        S3_UPLOAD_THRESHOLD,
        importedFiles
      }
    ) => {
      group.forEach(fileId => {
        // Local files
        const localFile = files.find(f => getFileId(f) === fileId);
        if (localFile && !localFile.isDrive && !localFile.isDropbox) {
          if (!isVideoFile(localFile) || localFile.size <= S3_UPLOAD_THRESHOLD) {
            formData.append("mediaFiles", localFile);
          }
          return;
        }

        // Drive files
        const driveFile = smallDriveFiles.find(f => f.id === fileId);
        if (driveFile) {
          formData.append("driveFiles", JSON.stringify({
            id: driveFile.id,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
            accessToken: driveFile.accessToken
          }));
          return;
        }

        // Dropbox files
        const dropboxFile = smallDropboxFiles.find(f => f.dropboxId === fileId);
        if (dropboxFile) {
          formData.append("dropboxFiles", JSON.stringify({
            dropboxId: dropboxFile.dropboxId,
            name: dropboxFile.name,
            directLink: dropboxFile.directLink,
            mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name)
          }));
          return;
        }

        // S3 files
        const allS3 = [...s3Results, ...s3DriveResults, ...s3DropboxResults];
        const s3File = allS3.find(f => f.uniqueId === fileId || f.id === fileId || f.dropboxId === fileId);
        if (s3File) {
          formData.append("s3VideoUrls", s3File.s3Url);
          formData.append("s3VideoNames", s3File.name);
          return;
        }

        // Meta library files
        if (importedFiles) {
          const metaFile = importedFiles.find(f =>
            (f.type === 'image' && f.hash === fileId) ||
            (f.type === 'video' && f.id === fileId)
          );
          if (metaFile) {
            if (metaFile.type === 'image') {
              formData.append("metaImageHashes", metaFile.hash);
              formData.append("metaImageNames", metaFile.name);
            } else {
              formData.append("metaVideoIds", metaFile.id);
              formData.append("metaVideoNames", metaFile.name);
            }
          }
        }
      });
    };

    const createAdApiCall = async (formData, API_BASE_URL, signal = null) => {
      const maxRetries = 5;
      const baseDelay = 1000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (signal?.aborted) throw new DOMException('Job cancelled. Some Ads might still have been made.', 'AbortError');
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
            signal,
          });

          return response;

        } catch (error) {

          if (error.response && error.response.status === 400) {
            console.error('Create Ad Logic Error received (not retrying):', error.response.data);
            throw error;
          }

          if (attempt === maxRetries - 1) {

            throw error;
          }



          const delay = baseDelay * Math.pow(1.5, attempt) + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };


    try {
      const promises = [];
      const promiseMetadata = []; // ADD THIS
      const queueCreateAdPromise = (formData, metadata = {}) => {
        promises.push(createAdApiCall(formData, API_BASE_URL, signal));
        promiseMetadata.push({
          adSetId: formData.get("adSetId"),
          ...metadata,
        });
      };

      // Pre-compute common JSON strings and values
      // NOTE: derive phone-vs-link from THIS job's ad sets (not the component's
      // currently-active variant) so variants whose ad sets belong to different
      // campaigns (e.g. one PHONE_CALL, one WEBSITE) send the correct field.
      const usePhoneNumberField = (() => {
        if (duplicateAdSet) {
          const adset = adSets.find((a) => a.id === duplicateAdSet);
          return adset?.destination_type === "PHONE_CALL";
        }
        if (!selectedAdSets || selectedAdSets.length === 0) return false;
        return selectedAdSets.every((adsetId) => {
          const adset = adSets.find((a) => a.id === adsetId);
          return adset?.destination_type === "PHONE_CALL";
        });
      })();
      const commonPrecomputed = preComputeCommonValues(headlines, descriptions, messages, link);

      // ============================================================================
      // SECTION 1: CAROUSEL ADS
      // ============================================================================



      if (importedPosts && importedPosts.length > 0) {
        // For each adset, create ads from each imported post
        const adSetIdsToUse = [...dynamicAdSetIds, ...nonDynamicAdSetIds];

        adSetIdsToUse.forEach((adSetId, adSetIndex) => {
          importedPosts.forEach((post, postIndex) => {
            const formData = new FormData();
            // Basic fields
            formData.append("adName", post.ad_name);
            formData.append("adAccountId", selectedAdAccount);
            formData.append("adSetId", adSetId);
            formData.append("pageId", pageId);
            formData.append("instagramAccountId", instagramAccountId || "");
            formData.append("launchPaused", launchPaused);
            formData.append("jobId", frontendJobId);

            // POST-SPECIFIC: Send the post ID instead of media
            if (usePostID) {
              // Post ID mode - create ad from post using object_story_id
              formData.append("postId", post.post_id);
              formData.append("adType", "post");
            } else {
              // Duplication mode - use ad copies endpoint
              formData.append("adId", post.ad_id);  // ← Changed from post.id to post.ad_id
              formData.append("adType", "duplication");
            }
            if (usePhoneNumberField) {
              formData.append("phoneNumber", phoneNumber);
            } else {
              formData.append("link", JSON.stringify(link));
            }

            queueCreateAdPromise(formData, { fileName: post.ad_name });
          });
        });

      }


      // ============================================================================
      // SECTION: INSTAGRAM ORGANIC POST ADS
      // ============================================================================
      if (selectedIgOrganicPosts && selectedIgOrganicPosts.length > 0) {
        const adSetIdsToUse = [...dynamicAdSetIds, ...nonDynamicAdSetIds];

        adSetIdsToUse.forEach((adSetId) => {
          selectedIgOrganicPosts.forEach((igPost, postIndex) => {
            const formData = new FormData();

            const adName = computeAdNameFromFormula(null, postIndex, link[0], jobData.formData.adNameFormulaV2, null);
            formData.append("adName", adName);
            formData.append("adAccountId", selectedAdAccount);
            formData.append("adSetId", adSetId);
            formData.append("pageId", pageId);
            formData.append("instagramAccountId", instagramAccountId || "");
            formData.append("launchPaused", launchPaused);
            formData.append("jobId", frontendJobId);
            formData.append("cta", cta || "LEARN_MORE");  // placeholder CTA
            if (usePhoneNumberField) {
              formData.append("phoneNumber", phoneNumber);
            } else {
              formData.append("link", JSON.stringify(link));
            }

            // IG post specific
            formData.append("sourceInstagramMediaId", igPost.source_instagram_media_id);
            formData.append("adType", "instagram_post");

            if (adScheduleStartTime) formData.append("adScheduleStartTime", adScheduleStartTime);
            if (adScheduleEndTime) formData.append("adScheduleEndTime", adScheduleEndTime);

            queueCreateAdPromise(formData, { fileName: igPost.ad_name });
          });
        });
      }


      if (isCarouselAd && dynamicAdSetIds.length === 0) {
        if (selectedAdSets.length === 0 && !duplicateAdSet) {
          toast.error("Please select at least one ad set for carousel");
          return;
        }

        // Determine groups: if user grouped files, use those. Otherwise treat all files as 1 group.
        const carouselGroups = (fileGroups && fileGroups.length > 0)
          ? fileGroups
          : [null]; // null = all files (backward compat)

        const totalCarouselGroups = carouselGroups.length;

        carouselGroups.forEach((group, groupIndex) => {
          // Build file order for this group
          let groupFileOrder;
          if (group) {
            // Grouped: build order from group's fileId array (respects drag order)
            groupFileOrder = buildCarouselFileOrderForGroup(
              group,
              files,
              driveFiles,
              dropboxFiles,
              s3Results,
              s3DriveResults,
              s3DropboxResults,
              S3_UPLOAD_THRESHOLD,
              importedFiles
            );
          } else {
            // Ungrouped: build order from all files (original behavior)
            groupFileOrder = buildCarouselFileOrder(
              files,
              driveFiles,
              dropboxFiles,
              s3Results,
              s3DriveResults,
              s3DropboxResults,
              S3_UPLOAD_THRESHOLD,
              importedFiles
            );
          }

          // Compute ad name for this group
          const firstFile = group
            ? (() => {
              const firstId = group[0];
              return files.find(f => getFileId(f) === firstId) ||
                driveFiles.find(f => f.id === firstId) ||
                dropboxFiles.find(f => f.dropboxId === firstId) ||
                (importedFiles || []).find(f =>
                  (f.type === 'image' && f.hash === firstId) ||
                  (f.type === 'video' && f.id === firstId)
                ) ||
                files[0];
            })()
            : files[0] || driveFiles[0] || dropboxFiles[0] || (importedFiles?.[0] ? { name: importedFiles[0].name } : null);

          const carouselAdName = computeAdNameFromFormula(
            firstFile,
            groupIndex,
            link[0],
            jobData.formData.adNameFormulaV2,
            adType
          );

          // For each ad set, create a formData
          nonDynamicAdSetIds.forEach((adSetId) => {
            const formData = new FormData();

            // Common fields
            appendCommonFields(formData, {
              adName: carouselAdName,
              headlinesJSON: commonPrecomputed.headlinesJSON,
              descriptionsJSON: commonPrecomputed.descriptionsJSON,
              messagesJSON: commonPrecomputed.messagesJSON,
              selectedAdAccount,
              adSetId,
              pageId,
              instagramAccountId,
              linkJSON: commonPrecomputed.linkJSON,
              phoneNumber,
              usePhoneNumberField,
              cta,
              launchPaused,
              jobId: frontendJobId,
              selectedForm,
              isPartnershipAd,
              partnerIgAccountId,
              partnerFbPageId,
              partnershipIdentityMode,
              adScheduleStartTime,
              adScheduleEndTime,
            });

            // Carousel-specific fields
            formData.append("isCarouselAd", true);
            formData.append("enablePlacementCustomization", false);
            formData.append("fileOrder", JSON.stringify(groupFileOrder));

            // Group index for SSE progress
            formData.append("totalGroups", String(totalCarouselGroups));
            formData.append("currentGroupIndex", String(groupIndex + 1));

            // Append media files
            if (group) {
              // Grouped: only this group's files
              appendCarouselGroupMediaFiles(formData, group, {
                files,
                smallDriveFiles,
                smallDropboxFiles,
                s3Results,
                s3DriveResults,
                s3DropboxResults,
                S3_UPLOAD_THRESHOLD,
                importedFiles
              });
            } else {
              // Ungrouped: all files (backward compat)
              files.forEach((file) => {
                if (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD) {
                  formData.append("mediaFiles", file);
                }
              });

              smallDriveFiles.forEach((driveFile) => {
                formData.append("driveFiles", JSON.stringify({
                  id: driveFile.id,
                  name: driveFile.name,
                  mimeType: driveFile.mimeType,
                  accessToken: driveFile.accessToken
                }));
              });

              smallDropboxFiles.forEach((dropboxFile) => {
                formData.append("dropboxFiles", JSON.stringify({
                  dropboxId: dropboxFile.dropboxId,
                  name: dropboxFile.name,
                  directLink: dropboxFile.directLink,
                  mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name)
                }));
              });

              [...s3Results, ...s3DriveResults, ...s3DropboxResults].forEach((s3File) => {
                formData.append("s3VideoUrls", s3File.s3Url);
                formData.append("s3VideoNames", s3File.name);
              });

              if (importedFiles && importedFiles.length > 0) {
                importedFiles.filter(f => f.type === 'image').forEach((metaFile) => {
                  formData.append("metaImageHashes", metaFile.hash);
                  formData.append("metaImageNames", metaFile.name);
                });
                importedFiles.filter(f => f.type === 'video').forEach((metaFile) => {
                  formData.append("metaVideoIds", metaFile.id);
                  formData.append("metaVideoNames", metaFile.name);
                });
              }
            }

            // Shop destination
            appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

            queueCreateAdPromise(formData, { fileName: group ? `Carousel Ad ${groupIndex + 1}` : carouselAdName });
          });
        });
      }

      // ============================================================================
      // SECTION 2: FLEXIBLE ADS TO NON-DYNAMIC AD SETS
      // ============================================================================
      if (adType === 'flexible' && nonDynamicAdSetIds.length > 0) {


        if (fileGroups.length > 0) {
          // GROUPED FLEXIBLE ADS: Create one ad per group per ad set

          // Pre-compute ad names for each group
          const groupAdNames = fileGroups.map((group, groupIndex) => {
            const firstFileId = group[0];
            const firstFile = files.find(f => getFileId(f) === firstFileId) ||
              driveFiles.find(f => f.id === firstFileId) ||
              dropboxFiles.find(f => f.dropboxId === firstFileId) ||  // ADD
              (importedFiles || []).find(f =>
                (f.type === 'image' && f.hash === firstFileId) ||
                (f.type === 'video' && f.id === firstFileId)
              );

            return computeAdNameFromFormula(
              firstFile || files[0] || driveFiles[0] || dropboxFiles[0],  // ADD dropboxFiles[0]
              groupIndex,
              link[0],
              jobData.formData.adNameFormulaV2,
              adType
            );
          });

          fileGroups.forEach((group, groupIndex) => {
            nonDynamicAdSetIds.forEach((adSetId) => {
              const formData = new FormData();

              // Append common fields
              appendCommonFields(formData, {
                adName: groupAdNames[groupIndex],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              // Append flexible ad fields
              appendFlexibleAdFields(formData, {
                adType: "flexible",
                totalGroups: fileGroups.length,
                currentGroupIndex: groupIndex + 1
              });

              // Append group media files
              const groupVideoMetadata = appendGroupMediaFiles(formData, group, {
                files,
                smallDriveFiles,
                smallDropboxFiles,  // ADD
                s3Results,
                s3DriveResults,
                s3DropboxResults,   // ADD
                S3_UPLOAD_THRESHOLD,
                getFileId,
                isVideoFile,
                aspectRatioMap,
                importedFiles
              });

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);
              queueCreateAdPromise(formData, { fileName: groupAdNames[groupIndex] });
            });
          });

        } else {
          // UNGROUPED FLEXIBLE ADS: Send ALL files

          // Pre-compute ad name once for ungrouped flexible
          const ungroupedFlexibleAdName = computeAdNameFromFormula(
            files[0] || driveFiles[0] || dropboxFiles[0] || (importedFiles?.[0] ? { name: importedFiles[0].name } : null),  // ADD
            0,
            link[0],
            jobData.formData.adNameFormulaV2,
            adType
          );

          nonDynamicAdSetIds.forEach((adSetId) => {
            const formData = new FormData();

            // Append common fields
            appendCommonFields(formData, {
              adName: ungroupedFlexibleAdName,
              headlinesJSON: commonPrecomputed.headlinesJSON,
              descriptionsJSON: commonPrecomputed.descriptionsJSON,
              messagesJSON: commonPrecomputed.messagesJSON,
              selectedAdAccount,
              adSetId,
              pageId,
              instagramAccountId,
              linkJSON: commonPrecomputed.linkJSON,
              phoneNumber,
              usePhoneNumberField,
              cta,
              launchPaused,
              jobId: frontendJobId,
              selectedForm,
              isPartnershipAd,
              partnerIgAccountId,
              partnerFbPageId,
              partnershipIdentityMode,
              adScheduleStartTime,
              adScheduleEndTime,
            });

            // Append flexible ad fields
            appendFlexibleAdFields(formData, { adType: "flexible" });

            // Append all media files
            appendAllMediaFiles(formData, {
              files,
              smallDriveFiles,
              smallDropboxFiles,  // ADD
              s3Results,
              s3DriveResults,
              s3DropboxResults,   // ADD
              S3_UPLOAD_THRESHOLD,
              importedFiles
            });

            // Add video thumbnail if provided
            if (thumbnail) {
              formData.append("thumbnail", thumbnail);
            }

            // Append shop destination
            appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);
            queueCreateAdPromise(formData);

          });
        }
      }

      // ============================================================================
      // SECTION 3: DYNAMIC AD SETS
      // ============================================================================
      if (dynamicAdSetIds.length > 0) {
        // Pre-compute ad name for dynamic ads
        const dynamicAdName = computeAdNameFromFormula(
          files[0] || driveFiles[0] || dropboxFiles[0],  // ADD dropboxFiles[0]
          0,
          link[0],
          jobData.formData.adNameFormulaV2
        );

        // For each dynamic adset, create ONE request with ALL media files
        dynamicAdSetIds.forEach((adSetId) => {
          const formData = new FormData();

          // Append common fields
          appendCommonFields(formData, {
            adName: dynamicAdName,
            headlinesJSON: commonPrecomputed.headlinesJSON,
            descriptionsJSON: commonPrecomputed.descriptionsJSON,
            messagesJSON: commonPrecomputed.messagesJSON,
            selectedAdAccount,
            adSetId,
            pageId,
            instagramAccountId,
            linkJSON: commonPrecomputed.linkJSON,
            phoneNumber,
            usePhoneNumberField,
            cta,
            launchPaused,
            jobId: frontendJobId,
            selectedForm,
            isPartnershipAd,
            partnerIgAccountId,
            partnerFbPageId,
            partnershipIdentityMode,
            adScheduleStartTime,
            adScheduleEndTime,
          });

          // Append dynamic ad set fields
          appendDynamicAdSetFields(formData, { isCarouselAd, thumbnail });

          // Append all media files
          appendAllMediaFiles(formData, {
            files,
            smallDriveFiles,
            smallDropboxFiles,  // ADD
            s3Results,
            s3DriveResults,
            s3DropboxResults,   // ADD
            S3_UPLOAD_THRESHOLD,
            importedFiles
          });

          // Append shop destination
          appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);
          queueCreateAdPromise(formData);

        });
      }

      // ============================================================================
      // SECTION 4: NON-DYNAMIC AD SETS (Non-Carousel, Non-Flexible)
      // ============================================================================
      if (nonDynamicAdSetIds.length > 0 && !isCarouselAd && adType !== 'flexible') {
        nonDynamicAdSetIds.forEach((adSetId) => {
          const groupedFileIds = enablePlacementCustomization ? new Set(fileGroups.flat()) : new Set();
          const hasUngroupedFiles = (
            files.some(file => !groupedFileIds.has(getFileId(file)) && (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD)) ||
            smallDriveFiles.some(driveFile => !groupedFileIds.has(driveFile.id)) ||
            smallDropboxFiles.some(dropboxFile => !groupedFileIds.has(dropboxFile.dropboxId)) ||  // ADD THIS
            [...s3Results, ...s3DriveResults, ...s3DropboxResults].some(s3File =>  // ADD s3DropboxResults
              !(groupedFileIds.has(s3File.uniqueId) || groupedFileIds.has(s3File.id) || groupedFileIds.has(s3File.dropboxId))  // ADD dropboxId check
            ) ||
            (importedFiles && importedFiles.some(f => {
              const fileId = f.type === 'image' ? f.hash : f.id;
              return !groupedFileIds.has(fileId);
            }))
          );



          let localIterationIndex = 0;

          // Process GROUPED files if placement customization is enabled
          if (enablePlacementCustomization && fileGroups.length > 0) {

            // Pre-compute ad names for grouped files
            const groupedAdNames = fileGroups.map((group, groupIndex) => {
              const firstFileId = group[0];

              const firstFileForNaming = files.find(f => getFileId(f) === firstFileId) ||
                smallDriveFiles.find(f => f.id === firstFileId) ||
                smallDropboxFiles.find(f => f.dropboxId === firstFileId) ||  // ADD THIS
                [...s3Results, ...s3DriveResults, ...s3DropboxResults].find(f =>   // ADD s3DropboxResults
                  f.uniqueId === firstFileId || f.id === firstFileId || f.dropboxId === firstFileId  // ADD dropboxId
                ) ||
                (importedFiles || []).find(f =>
                  (f.type === 'image' && f.hash === firstFileId) ||
                  (f.type === 'video' && f.id === firstFileId)
                );

              return computeAdNameFromFormula(
                firstFileForNaming || files[0] || driveFiles[0] || dropboxFiles[0],  // ADD dropboxFiles[0]
                localIterationIndex + groupIndex,
                link[0],
                jobData.formData.adNameFormulaV2,
                adType
              );
            });

            fileGroups.forEach((group, groupIndex) => {
              const formData = new FormData();

              // Append common fields
              appendCommonFields(formData, {
                adName: groupedAdNames[groupIndex],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });



              // Append group media files
              const groupVideoMetadata = appendGroupMediaFiles(formData, group, {
                files,
                smallDriveFiles,
                smallDropboxFiles,  // ADD
                s3Results,
                s3DriveResults,
                s3DropboxResults,   // ADD
                S3_UPLOAD_THRESHOLD,
                getFileId,
                isVideoFile,
                aspectRatioMap,
                importedFiles
              });



              // Append placement customization fields
              appendPlacementCustomizationFields(formData, {
                enablePlacementCustomization,
                totalGroups: fileGroups.length,
                currentGroupIndex: groupIndex + 1,
                videoMetadata: groupVideoMetadata
              });

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);
              // Append has ungrouped files flag
              formData.append("hasUngroupedFiles", hasUngroupedFiles);
              queueCreateAdPromise(formData, { fileName: groupedAdNames[groupIndex] });
              localIterationIndex++;
            });
          }

          // Process UNGROUPED files
          if (hasUngroupedFiles) {
            // Pre-compute ad names for all ungrouped files
            const ungroupedLocalFiles = files.filter(file =>
              (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD) && !groupedFileIds.has(getFileId(file))

            );
            const ungroupedDriveFiles = smallDriveFiles.filter(driveFile =>
              !groupedFileIds.has(driveFile.id)
            );
            const ungroupedDropboxFiles = smallDropboxFiles.filter(dropboxFile =>
              !groupedFileIds.has(dropboxFile.dropboxId)
            );
            const ungroupedS3Files = [...s3Results, ...s3DriveResults, ...s3DropboxResults].filter(s3File =>
              !(groupedFileIds.has(s3File.uniqueId) || groupedFileIds.has(s3File.id) || groupedFileIds.has(s3File.dropboxId))
            );

            // Pre-compute ad names
            const localFileAdNames = ungroupedLocalFiles.map((file, index) =>
              computeAdNameFromFormula(file, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType)
            );

            localIterationIndex += ungroupedLocalFiles.length;

            const driveFileAdNames = ungroupedDriveFiles.map((driveFile, index) =>
              computeAdNameFromFormula(driveFile, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType)
            );

            localIterationIndex += ungroupedDriveFiles.length;

            const dropboxFileAdNames = ungroupedDropboxFiles.map((dropboxFile, index) =>
              computeAdNameFromFormula(dropboxFile, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType)
            );

            localIterationIndex += ungroupedDropboxFiles.length;

            const s3FileAdNames = ungroupedS3Files.map((s3File, index) =>
              computeAdNameFromFormula(s3File, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType)
            );

            // Handle local files
            ungroupedLocalFiles.forEach((file, index) => {
              const formData = new FormData();

              // Append common fields
              appendCommonFields(formData, {
                adName: localFileAdNames[index],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              // Append single image file
              appendSingleImageFile(formData, { file, thumbnail });

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);
              queueCreateAdPromise(formData, { fileName: file.name });

            });

            // Handle small drive files
            ungroupedDriveFiles.forEach((driveFile, index) => {
              const formData = new FormData();

              // Append common fields
              appendCommonFields(formData, {
                adName: driveFileAdNames[index],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              // Append single drive file
              appendSingleDriveFile(formData, driveFile);

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: driveFile.name });

            });


            // Handle small dropbox files
            ungroupedDropboxFiles.forEach((dropboxFile, index) => {
              const formData = new FormData();

              appendCommonFields(formData, {
                adName: dropboxFileAdNames[index],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              appendSingleDropboxFile(formData, dropboxFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: dropboxFile.name });
            });

            // Handle S3 uploaded files
            ungroupedS3Files.forEach((s3File, index) => {
              const formData = new FormData();

              // Append common fields
              appendCommonFields(formData, {
                adName: s3FileAdNames[index],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              // Append single S3 file
              appendSingleS3File(formData, s3File);

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: s3File.name || s3File.originalName || 'S3 Video' });

            });


            // Handle Meta library imported files
            // Handle Meta library imported files - ONLY ungrouped ones
            const metaImages = (importedFiles || []).filter(f =>
              f.type === 'image' && !groupedFileIds.has(f.hash)
            );
            const metaVideos = (importedFiles || []).filter(f =>
              f.type === 'video' && !groupedFileIds.has(f.id)
            );

            // Pre-compute ad names for meta files
            const metaImageAdNames = metaImages.map((file, index) =>
              computeAdNameFromFormula({ name: file.name }, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType)
            );

            localIterationIndex += metaImages.length;

            const metaVideoAdNames = metaVideos.map((file, index) =>
              computeAdNameFromFormula({ name: file.name }, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType)
            );

            // Handle Meta library images
            metaImages.forEach((metaFile, index) => {
              const formData = new FormData();

              appendCommonFields(formData, {
                adName: metaImageAdNames[index],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              appendMetaImageFile(formData, metaFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: metaFile.name });
            });

            // Handle Meta library videos
            metaVideos.forEach((metaFile, index) => {
              const formData = new FormData();

              appendCommonFields(formData, {
                adName: metaVideoAdNames[index],
                headlinesJSON: commonPrecomputed.headlinesJSON,
                descriptionsJSON: commonPrecomputed.descriptionsJSON,
                messagesJSON: commonPrecomputed.messagesJSON,
                selectedAdAccount,
                adSetId,
                pageId,
                instagramAccountId,
                linkJSON: commonPrecomputed.linkJSON,
                phoneNumber,
                usePhoneNumberField,
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId,
                partnershipIdentityMode,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              appendMetaVideoFile(formData, metaFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: metaFile.name });
            });


          }
        });
      }


      if (promises.length === 0) {
        setIsLoading(false);
        throw new Error("Form data failed to compile. You ran into our sneakiest bug. We're trying to fix it.");
      }


      setLiveProgress({ completed: 0, succeeded: 0, failed: 0, total: promises.length, errors: [] });
      isInPromisePhase.current = true; // ADD THIS

      try {
        setJobId(frontendJobId);
        // Small delay to let SSE connect
        await new Promise(resolve => setTimeout(resolve, 100));
        // const responses = await Promise.allSettled(trackedPromises); // 🆕 Changed from promises to trackedPromises

        const responses = new Array(promises.length);

        const trackedPromises = promises.map((promise, index) =>
          promise
            .then(result => {
              // 1. Update Live Counter
              setLiveProgress(prev => ({
                ...prev,
                completed: prev.completed + 1,
                succeeded: prev.succeeded + 1
              }));

              // 2. Record Success explicitly
              responses[index] = { status: 'fulfilled', value: result };
              return result;
            })
            .catch(error => {
              // Check if this is a cancellation (frontend abort or backend 499)
              const isCancellation = axios.isCancel(error) ||
                error.name === 'AbortError' ||
                error.response?.status === 499 ||
                error.response?.data?.cancelled;

              if (isCancellation) {
                setLiveProgress(prev => ({
                  ...prev,
                  completed: prev.completed + 1,
                  // Don't increment failed — this was user-initiated
                }));
                responses[index] = { status: 'cancelled' };
                return null;
              }

              // Real error — existing logic
              let errorMsg = 'Unknown error';
              if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
              } else if (error.response?.data) {
                errorMsg = error.response.data;
              } else if (error.message) {
                errorMsg = error.message;
              }

              setLiveProgress(prev => ({
                ...prev,
                completed: prev.completed + 1,
                failed: prev.failed + 1,
                errors: [...prev.errors, {
                  fileName: promiseMetadata[index]?.fileName || null,
                  error: errorMsg
                }]
              }));

              responses[index] = { status: 'rejected', reason: error };
              return null;
            })
        );

        // We use Promise.all because we are catching rejections internally in trackedPromises
        await Promise.all(trackedPromises);

        const successCount = responses.filter(r => r.status === 'fulfilled').length;
        const failureCount = responses.filter(r => r.status === 'rejected').length;
        const totalCount = responses.length;
        const successfulAdCountsByAdSet = responses.reduce((acc, response, index) => {
          if (response?.status !== 'fulfilled') {
            return acc;
          }

          const adSetId = promiseMetadata[index]?.adSetId;
          if (!adSetId) {
            return acc;
          }

          acc[adSetId] = (acc[adSetId] || 0) + 1;
          return acc;
        }, {});

        if (Object.keys(successfulAdCountsByAdSet).length > 0) {
          onAdSetCountsCreated?.(successfulAdCountsByAdSet);
        }

        const errorMessages = responses
          .map((r, index) => ({ response: r, meta: promiseMetadata[index] }))
          .filter(({ response }) => response.status === 'rejected')
          .map(({ response, meta }) => {
            let errorMsg = 'Unknown error';
            if (response.reason?.response?.data?.error) {
              errorMsg = response.reason.response.data.error;
            } else if (response.reason?.response?.data) {
              errorMsg = response.reason.response.data;
            } else if (response.reason?.message) {
              errorMsg = response.reason.message;
            }
            return {
              fileName: meta?.fileName || null,
              error: errorMsg
            };
          });

        let jobStatus = 'complete';
        let jobMessage = 'All ads created successfully!';

        if (signal.aborted) {
          // User cancelled — determine what actually happened
          if (successCount === 0 && failureCount === 0) {
            jobStatus = 'cancelled';
            jobMessage = 'Job cancelled. Some Ads might still have been made.';
          } else if (successCount === totalCount) {
            // Everything finished before cancel propagated
            jobStatus = 'complete';
            jobMessage = `All ${totalCount} ads were created before cancellation took effect.`;
          } else if (successCount > 0) {
            jobStatus = 'partial-success';
            jobMessage = `Cancelled. ${successCount} of ${totalCount} ads were already created. This count could be inaccurate.`;
          } else {
            // Only failures and cancellations, no successes
            jobStatus = 'cancelled';
            jobMessage = 'Job cancelled Some Ads might still have been made..';
          }
        } else {
          // Normal (non-cancelled) completion
          if (failureCount > 0 && successCount > 0) {
            jobStatus = 'partial-success';
            jobMessage = `${successCount} of ${totalCount} ads created. ${failureCount} failed.`;
          } else if (failureCount === totalCount) {
            jobStatus = 'error';
            const firstError = responses.find(r => r.status === 'rejected');
            let errorMsg = 'Unknown error';
            if (firstError?.reason?.response?.data?.error) {
              errorMsg = firstError.reason.response.data.error;
            } else if (firstError?.reason?.response?.data) {
              errorMsg = firstError.reason.response.data;
            } else if (firstError?.reason?.message) {
              errorMsg = firstError.reason.message;
            }
            jobMessage = `${errorMsg}`;
          }
        }

        try {
          await axios.post(`${API_BASE_URL}/auth/complete-job`, {
            jobId: frontendJobId,
            status: jobStatus,
            message: jobMessage,
            successCount,
            failureCount,
            totalCount,
            errorMessages,
            selectedAdSets,
            selectedAdAccount,
            selectedTemplate
          }, {
            withCredentials: true,
            timeout: 5000
          });
        } catch (completeError) {
          console.warn("Failed to update progress tracker");
        }

        if (signal.aborted) {
          const cancelledJob = {
            id: jobData.id,
            message: jobMessage,
            completedAt: Date.now(),
            status: jobStatus, // 'cancelled', 'partial-success', or 'complete'
            successCount,
            failureCount,
            totalCount,
            errorMessages,
            selectedAdSets: selectedAdSets,
            selectedAdAccount: selectedAdAccount,
            formData: jobData.formData,
          };
          addCompletedJob(cancelledJob);

          // Clean up the queue directly since useEffect might not trigger
          setShowCompletedView(true);
          setJobQueue(prev => prev.slice(1));
          setCurrentJob(null);
          setIsProcessingQueue(false);
          setIsCancelling(false);
        }
        isInPromisePhase.current = false; // ADD THIS
      } catch (error) {
        console.error("Unexpected error:", error);
      }

    } catch (error) {
      // If user cancelled, don't treat as an error
      if (error.name === 'AbortError' || axios.isCancel(error)) {

        // Notify backend to mark job as cancelled
        try {
          await axios.post(`${API_BASE_URL}/auth/cancel-job`,
            { jobId: currentJob?.id },
            { withCredentials: true, timeout: 3000 }
          );
        } catch (e) { /* best-effort */ }
        return; // Don't throw — let the status useEffect handle it via SSE
      }

      let errorMessage = "Unknown error occurred";


      if (typeof error.response?.data === "string") {
        errorMessage = error.response.data;
      } else if (error.response?.data?.error?.code === 2 && error.response?.data?.error?.is_transient) {
        errorMessage = "Facebook's server had a temporary issue. Please try again in a few seconds.";
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.log("❌ handleCreateAd catch:", error.message);
      throw new Error(errorMessage);

    } finally {
      setIsLoading(false);
      setCurrentAbortController(null);
      currentJobIdRef.current = null; // ADD


    }
  }

  const clearQueuedMedia = () => {
    setFiles([]);
    setDriveFiles([]);
    setDropboxFiles([]);
    setVideoThumbs({});
    setThumbnail(null);
    setFileGroups([]);
    setEnablePlacementCustomization(false);
    setImportedPosts([]);
    setImportedFiles([]);
    setSelectedIgOrganicPosts([]);
    setFileVariantMap({});
    setGroupVariantMap({});
    setPostVariantMap({});
    setSelectedFiles(new Set());
  };

  const handleQueueJob = async (e) => {
    e.preventDefault();

    if (isQueueingJobs) {
      return;
    }

    if (files.length === 0 && driveFiles.length === 0 && dropboxFiles.length === 0 && importedPosts.length === 0 && importedFiles.length === 0 && selectedIgOrganicPosts.length === 0) {
      toast.error("Please upload at least one file or import from Drive");
      return;
    }

    const orderedVariants = [
      variants.find((variant) => variant.id === 'default'),
      ...variants.filter((variant) => variant.id !== 'default'),
    ].filter(Boolean);

    const newJobs = [];

    for (const variant of orderedVariants) {
      const job = captureFormDataAsJob(variant.id);
      if (!job || job.adCount === 0 || !hasMediaInFormData(job.formData)) {
        continue;
      }

      if ((job.formData.selectedAdSets || []).length === 0 && !job.formData.duplicateAdSet) {
        toast.error(`${variant.name}: please select at least one ad set`);
        return;
      }

      if (!job.formData.selectedAdAccount) {
        toast.error(`${variant.name}: please select an ad account`);
        return;
      }

      if (!job.formData.pageId) {
        toast.error(`${variant.name}: please select a Facebook page`);
        return;
      }

      newJobs.push(job);
    }

    if (newJobs.length === 0) {
      toast.error('No variants have files assigned. Nothing to publish.');
      return;
    }

    const shouldShowVariantLabel = newJobs.some((job) => job.variantId !== 'default');
    const queuedJobs = newJobs.map((job) => ({
      ...job,
      showVariantLabel: shouldShowVariantLabel,
    }));

    setIsQueueingJobs(true);

    try {
      setJobQueue((prev) => [...prev, ...queuedJobs]);
      // toast.success(
      //   newJobs.length === 1
      //     ? 'Job queued'
      //     : `Queued ${newJobs.length} jobs across variants`
      // );

      if (!preserveMedia) {
        try {
          await onBeforeMediaClear?.();
        } catch (error) {
          console.error("Failed to launch media preview animation:", error);
        }

        clearQueuedMedia();
      }
    } finally {
      setIsQueueingJobs(false);
    }
  };

  const populatedVariantSummaries = variants
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      count: countFilesForVariant(variant.id),
    }))
    .filter((variant) => variant.count > 0);
  const hasConfiguredFormSplits = populatedVariantSummaries.some((variant) => variant.id !== 'default');
  const shouldScrollVariantPicker = variants.length > 5;
  const formatQueuedJobLabel = (job, prefix) => {
    const summary = `${job.adCount} ad${job.adCount !== 1 ? 's' : ''} to ${job.formData.adSetDisplayName}`;
    return job.showVariantLabel && job.variantName
      ? `${prefix} ${job.variantName}: ${summary}`
      : `${prefix} ${summary}`;
  };

  const publishDisabled = variants.length > 1
    ? (
      !isLoggedIn ||
      (files.length === 0 && driveFiles.length === 0 && dropboxFiles.length === 0 && importedPosts.length === 0 && importedFiles.length === 0 && selectedIgOrganicPosts.length === 0) ||
      (selectedFiles.size > 0) ||
      (!isCarouselAd && hasDuplicates)
    )
    : (
      !isLoggedIn ||
      (selectedAdSets.length === 0 && !duplicateAdSet) ||
      (files.length === 0 && driveFiles.length === 0 && dropboxFiles.length === 0 && importedPosts.length === 0 && importedFiles.length === 0 && selectedIgOrganicPosts.length === 0) ||
      (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === "")) ||
      (adType === 'carousel' && (files.length + driveFiles.length + importedFiles.length + dropboxFiles.length) < 2) ||
      (adType === 'flexible' && fileGroups.length === 0 && (files.length + driveFiles.length + importedFiles.length + dropboxFiles.length) > 10) ||
      (showShopDestinationSelector && !selectedShopDestination) ||
      isMissingDestinationValue ||
      (selectedFiles.size > 0) ||
      (shouldShowLeadFormSelector && !selectedForm) ||
      (!isCarouselAd && hasDuplicates)
    );


  return (
    <Card className=" !bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl">
      {hasStartedAnyJob && (
        <div className="fixed bottom-4 right-4 z-50">
          {/* Collapsed State */}
          {!isJobTrackerExpanded && (
            <div
              className="bg-white rounded-3xl border border-gray-200/50 border-4 shadow-xl p-2 flex items-center gap-3 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105"
              onClick={() => setIsJobTrackerExpanded(true)}
            >
              <div className="flex items-center gap-2">
                <RocketIcon2
                  alt="Rocket Icon"
                  className="!w-10 h-10 object-contain" // Image fills its container
                />
                <span className="font-medium text-sm">Job Queue</span>
              </div>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                {jobQueue.length + (currentJob && jobQueue.length === 0 ? 1 : 0)} Active
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500 rotate-180" />
            </div>
          )}

          {/* Expanded State */}
          {isJobTrackerExpanded && (
            <div className="bg-white border border-gray-200/50 border-4 rounded-[20px] shadow-lg w-96 max-h-[600px] overflow-hidden flex flex-col transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-2">
              {/* Header */}
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Fixed size container for the RocketIcon */}
                  <div className="w-12 h-12 flex-shrink-0">
                    <RocketIcon2
                      alt="Rocket Icon"
                      className="w-full h-full object-contain" // Image fills its container
                    />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-sm">Job Queue</h3>
                    <p className="text-sm font-medium text-gray-400">{jobQueue.length + (currentJob && jobQueue.length === 0 ? 1 : 0)} Active</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsJobTrackerExpanded(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Jobs List */}
              <div className="flex-1 overflow-y-auto">

                {/* Completed Jobs */}

                {completedJobs.map((job) => {
                  return (
                    <div key={job.id} className="p-3.5 border-b border-gray-100">
                      {/* Main job row */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {job.status === 'cancelled' ? (
                            <Ban className="w-6 h-6 text-orange-500" />
                          ) : job.status === 'error' ? (
                            <CircleX className="w-6 h-6 text-red-500" />
                          ) : job.status === 'partial-success' ? (
                            <PartialSuccess className="w-6 h-6" />
                          ) : job.status === 'retry' ? (
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                          ) : (
                            <CheckIcon className="w-6 h-6" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p
                            style={{ overflowWrap: 'anywhere' }}
                            className={`text-sm break-words ${job.status === 'cancelled'
                              ? 'text-orange-500'
                              : job.status === 'error'
                                ? 'text-red-600'
                                : job.status === 'partial-success'
                                  ? 'text-[#F0A000]'
                                  : job.status === 'retry'
                                    ? 'text-orange-600'
                                    : 'text-gray-700'
                              }`}
                          >
                            {job.message}
                          </p>
                          {job.status === 'cancelled' && job.totalCount > 0 && job.successCount > 0 && (
                            <div className="flex gap-2 mt-1.5">
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-lg">
                                <CheckIcon className="w-3 h-3 text-green-600" />
                                <span className="text-xs font-medium text-green-700">
                                  {job.successCount} created
                                </span>
                              </div>
                              {job.failureCount > 0 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-lg">
                                  <CircleX className="w-3 h-3 text-red-500" />
                                  <span className="text-xs font-medium text-red-600">
                                    {job.failureCount} failed
                                  </span>
                                </div>
                              )}
                            </div>
                          )}


                          {job.status === 'retry' && (
                            <span className="block text-xs text-orange-500 mt-1">
                              Reload page to try again.
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {job.status === 'retry' && (
                            <button
                              onClick={refreshPage}
                              className="text-orange-600 hover:text-orange-800 p-1 rounded"
                              title="Retry job"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}

                          {job.selectedAdSets && job.selectedAdSets.length > 0 && job.selectedAdAccount && (
                            <button
                              onClick={() => {
                                const account = adAccounts.find(a => a.id === job.selectedAdAccount);
                                const bizId = account?.business_id || '';
                                const url = `https://adsmanager.facebook.com/adsmanager/manage/adsets/edit/standalone?${job.selectedAdAccount.replace('_', '=')}&selected_adset_ids=${job.selectedAdSets[0]}&business_id=${bizId}&global_scope_id=${bizId}`;
                                window.open(url, '_blank');
                              }}
                              className="text-gray-500 hover:text-blue-500 transition-colors p-1"
                              title="View in Ads Manager"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {(job.status === 'error' || job.status === 'partial-success') && job.formData && (
                            <button
                              onClick={() => handleRetryJob(job)}
                              className="text-gray-500 hover:text-blue-500 transition-colors p-1"
                              title="Restore to form"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setCompletedJobs((prev) => prev.filter((j) => j.id !== job.id))
                            }
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Remove job"
                          >
                            <CircleX className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      {/* Error details (moved outside the flex row) */}
                      {(job.status === 'partial-success' || job.status === 'cancelled') && job.errorMessages?.length > 0 && (
                        <div className="mt-2 ml-9">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-[#FF0000] font-medium">
                              View error details
                            </summary>
                            <div className="mt-2 ml-1 space-y-3">
                              {(() => {
                                const errorGroups = job.errorMessages.reduce((acc, item) => {
                                  const key = item.error;
                                  if (!acc[key]) acc[key] = { error: item.error, fileNames: [] };
                                  if (item.fileName) acc[key].fileNames.push(item.fileName);
                                  return acc;
                                }, {});

                                return Object.values(errorGroups).map((group, idx) => {
                                  const count = group.fileNames.length || 1;
                                  return (
                                    <div key={idx} className="border-l-2 border-[#FF0000]/40 pl-2">
                                      <div className="text-[#FF0000] font-medium flex items-start gap-1.5">
                                        <span className="flex-1">{group.error}</span>
                                        <span className="shrink-0 px-1.5 rounded bg-[#FF0000]/10 text-[#FF0000]">
                                          {count} {count === 1 ? 'ad' : 'ads'}
                                        </span>
                                      </div>
                                      {group.fileNames.length > 0 && (
                                        <ul className="mt-1.5 ml-3 list-disc space-y-1">
                                          {group.fileNames.map((name, i) => (
                                            <ErrorFileName key={i} name={name} />
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Current Job */}
                {currentJob && (
                  <div className="p-3.5 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="flex-shrink-0">
                        <UploadIcon className="w-6 h-6" />
                      </div>
                      <p className="flex-1 text-sm font-medium text-gray-700 break-all">
                        {formatQueuedJobLabel(currentJob, 'Posting')}
                      </p>
                      <span className="text-sm font-semibold text-gray-900">{Math.round(progress || trackedProgress)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress || trackedProgress}%` }}
                        />
                      </div>
                      <button
                        onClick={async () => {
                          setIsCancelling(true);
                          if (currentAbortController) {
                            currentAbortController.abort();
                          }
                          const cancelJobId = currentJobIdRef.current || jobId;
                          if (cancelJobId) {
                            try {
                              await axios.post(`${API_BASE_URL}/auth/cancel-job`,
                                { jobId: cancelJobId },
                                { withCredentials: true, timeout: 3000 }
                              );
                            } catch (e) { /* best-effort */ }
                          }
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        title="Cancel job"
                      >
                        <CircleX className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      {isCancelling ? (
                        <div className="flex items-center gap-1.5">
                          <Loader className="animate-spin h-3 w-3 text-red-400" />
                          <span className="text-xs text-red-400">Cancelling...</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">{progressMessage || trackedMessage}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {(progressMessage || trackedMessage) && liveProgress.total > 0 && (
                          <div className="flex gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
                              <CheckIcon className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">
                                {liveProgress.succeeded}/{liveProgress.total}
                              </span>
                            </div>
                            {liveProgress.failed > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                                <CircleX className="w-4 h-4 text-red-500" />
                                <span className="text-xs font-medium text-red-600">
                                  {liveProgress.failed}/{liveProgress.total}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Live error details */}
                    {liveProgress.errors && liveProgress.errors.length > 0 && (
                      <div className="mt-2">
                        <details className="text-xs" open>
                          <summary className="cursor-pointer text-[#FF0000] font-medium">
                            View error details
                          </summary>
                          <div className="mt-2 ml-1 space-y-3">
                            {(() => {
                              const errorGroups = liveProgress.errors.reduce((acc, item) => {
                                const key = item.error;
                                if (!acc[key]) acc[key] = { error: item.error, fileNames: [] };
                                if (item.fileName) acc[key].fileNames.push(item.fileName);
                                return acc;
                              }, {});

                              return Object.values(errorGroups).map((group, idx) => {
                                const count = group.fileNames.length || 1;
                                return (
                                  <div key={idx} className="border-l-2 border-[#FF0000]/40 pl-2">
                                    <div className="text-[#FF0000] font-medium flex items-start gap-1.5">
                                      <span className="flex-1">{group.error}</span>
                                      <span className="shrink-0 px-1.5 rounded bg-[#FF0000]/10 text-[#FF0000]">
                                        {count} {count === 1 ? 'ad' : 'ads'}
                                      </span>
                                    </div>
                                    {group.fileNames.length > 0 && (
                                      <ul className="mt-1.5 ml-3 list-disc space-y-1">
                                        {group.fileNames.map((name, i) => (
                                          <ErrorFileName key={i} name={name} />
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}

                {/* Queued Jobs */}
                {jobQueue.slice(currentJob ? 1 : 0).map((job, index) => (
                  <div key={job.id || index} className="p-3.5 border-b border-gray-100 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <QueueIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                    <p className="flex-1 text-sm text-gray-600">
                      {formatQueuedJobLabel(job, 'Queued')}
                    </p>
                    <button
                      onClick={() => setJobQueue(prev => prev.filter((_, i) => i !== (currentJob ? index + 1 : index)))}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <CircleX className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
      }

      <CardHeader>
        <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4 md:gap-2">
          <div className="flex items-center gap-2">
            <ConfigIcon className="w-5 h-5" />
            Select ad preferences
          </div>
          {!(useExistingPosts || selectedIgOrganicPosts.length > 0) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Label htmlFor="ad-type" className="text-sm whitespace-nowrap">
                Ad Type:
              </Label>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={activeVariantId !== 'default' ? 'cursor-not-allowed' : ''}>
                      <Select
                        value={
                          adType === 'flexible' && !campaignObjective.every(obj => ["OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(obj))
                            ? 'regular'
                            : adType
                        }
                        onValueChange={(value) => {
                          if (value === 'flexible' && !campaignObjective.every(obj => ["OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(obj))) {
                            setAdType('regular');
                            return;
                          }

                          if (activeVariantId !== 'default') {
                            return;
                          }

                          setAdType(value);

                          // Reset link states when switching away from carousel
                          if (value !== 'carousel' && link.length > 1) {
                            setLink([link[0] || ""]);
                            setLinkCustomStates({});
                            setShowCustomLink(false);
                          }

                          // Reset the "apply to all" states and restore from template
                          if (value !== 'carousel') {
                            setApplyTextToAllCards(false);
                            setApplyHeadlinesToAllCards(false);

                            if (selectedTemplate && copyTemplates[selectedTemplate]) {
                              const tpl = copyTemplates[selectedTemplate];
                              setMessages(tpl.primaryTexts || [""]);
                              setHeadlines(tpl.headlines || [""]);
                              setDescriptions(tpl.descriptions || [""]);
                            }
                          }
                        }}
                        disabled={!isLoggedIn || activeVariantId !== 'default'}
                      >
                        <SelectTrigger className={cn("w-[180px] h-10 py-2 font-medium", formFieldChrome)}>
                          <SelectValue placeholder="Select ad type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl gap-4" >
                          <SelectItem
                            value="regular"
                            className="rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5"
                          >
                            Image / Video
                          </SelectItem>

                          <SelectItem
                            value="carousel"
                            className="rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5"
                          >
                            Carousel
                          </SelectItem>

                          {campaignObjective.length > 0 && campaignObjective.every(obj => ["OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(obj)) && (
                            <SelectItem
                              value="flexible"
                              className="rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5"
                            >
                              Flexible

                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </span>
                  </TooltipTrigger>
                  {activeVariantId !== 'default' && (
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      Ad type is only changeable in the Default variant. Changing it there will apply to all variants.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleQueueJob}
          onKeyDown={(e) => {
            // Prevent Enter from submitting unless it's in a textarea (for line breaks)
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          className="space-y-6">
          <div className="space-y-10 overflow-hidden">
            {useExistingPosts ? (
              <div
                className="relative overflow-hidden"
                style={{ height: 'min(600px, calc(100vh - 400px))', contain: 'strict' }}
              >
                <PostSelectorInline
                  adAccountId={selectedAdAccount}
                  onImport={setImportedPosts}
                  usePostID={usePostID}
                  setUsePostID={setUsePostID}
                  campaigns={campaigns}
                  selectedAdAccount={selectedAdAccount}
                  importedPosts={importedPosts}  // add this

                />
              </div>

            ) : (
              // Show regular form content when toggle is OFF
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        {renderDiffMark("pageId")}
                        <FacebookIcon className="w-4 h-4" />
                        Select a Page
                      </Label>
                      <RefreshCcw
                        className={cn(
                          "h-4 w-4 cursor-pointer transition-all duration-200",
                          isPagesLoading
                            ? "h-3.5 w-3.5 text-gray-300 animate-[spin_3s_linear_infinite]"
                            : "text-gray-500 hover:text-gray-700"
                        )}
                        onClick={refreshPages}
                      />

                    </div>
                    <Popover open={openPage} onOpenChange={setOpenPage}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPage}
                          disabled={!isLoggedIn || pagesLoading || isPagesLoading} // 👈 Disable while loading
                          id="page"
                          className={cn("w-full justify-between", formDropdownTriggerChrome)}
                        >
                          {(pagesLoading || isPagesLoading) ? ( // 👈 Show loading state in button
                            <div className="flex items-center gap-2">
                              <Loader className="h-4 w-4 animate-spin" />
                              <span>Loading pages...</span>
                            </div>
                          ) : pageId ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  pages.find((page) => page.id === pageId)?.profilePicture ||
                                  "https://api.withblip.com/backup_page_image.png"
                                }
                                alt="Page"
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span>{pages.find((page) => page.id === pageId)?.name || pageId}</span>
                            </div>
                          ) : (
                            "Select a Page"
                          )}

                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={{
                          minWidth: "var(--radix-popover-trigger-width)",
                          width: "auto",
                          maxWidth: "var(--radix-popover-trigger-width)",

                        }}
                      >
                        <Command filter={() => 1} loop={false} defaultValue={pageId}>
                          <CommandInput
                            placeholder="Search pages..."
                            value={pageSearchValue}
                            onValueChange={setPageSearchValue}
                            className="bg-transparent"
                            wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                          />
                          <CommandEmpty>No page found.</CommandEmpty>
                          <CommandList className="max-h-[500px] overflow-y-auto rounded-2xl custom-scrollbar" selectOnFocus={false}>
                            <CommandGroup>
                              {filteredPages.length > 0 ? (
                                filteredPages.map((page) => (
                                  <CommandItem
                                    key={page.id}
                                    value={page.id}
                                    onSelect={() => {
                                      setPageId(page.id)
                                      setOpenPage(false)
                                      if (page.instagramAccount?.id) {
                                        setInstagramAccountId(page.instagramAccount.id)
                                      } else {
                                        setInstagramAccountId("") // Clear if not available
                                      }
                                      setPartnerIgAccountId("")
                                      setPartnerFbPageId("")
                                    }}
                                    className={cn(
                                      "px-3 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                      "data-[selected=true]:bg-gray-100",
                                      pageId === page.id && "bg-gray-100 rounded-2xl font-semibold",
                                      "hover:bg-gray-100",
                                      "flex items-center gap-2" // 👈 for image + name layout
                                    )}
                                    data-selected={page.id === pageId}
                                  >

                                    <img
                                      src={page.profilePicture || "/placeholder.svg"}
                                      alt={`${page.name} profile`}
                                      className="w-6 h-6 rounded-full object-cover border border-gray-300"
                                    />
                                    <span className="truncate">{page.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">{page.id}</span> {/* 👈 Gray ID on same line */}

                                  </CommandItem>

                                ))
                              ) : (
                                <CommandItem disabled className="opacity-50 cursor-not-allowed">
                                  No page found.
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {renderDiffMark("instagramAccountId")}
                      <InstagramIcon className="w-4 h-4" />
                      Select Instagram Account
                    </Label>
                    <Popover open={openInstagram} onOpenChange={setOpenInstagram}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openInstagram}
                          className={cn("w-full justify-between", formDropdownTriggerChrome)}
                          disabled={filteredInstagramAccounts.length === 0}
                        >
                          {instagramAccountId ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.profilePictureUrl ||
                                  "https://api.withblip.com/backup_page_image.png"
                                  || "/placeholder.svg"}
                                alt="Instagram"
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span>
                                {pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.username || instagramAccountId}
                              </span>
                            </div>
                          ) : (
                            "Select Instagram Account"
                          )}

                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={{
                          minWidth: "var(--radix-popover-trigger-width)",
                          width: "auto",
                          maxWidth: "var(--radix-popover-trigger-width)",

                        }}
                      >
                        <Command loop={false}>
                          <CommandInput
                            placeholder="Search Instagram usernames..."
                            value={instagramSearchValue}
                            onValueChange={setInstagramSearchValue}
                            className="bg-transparent"
                            wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                          />
                          <CommandEmpty>No Instagram accounts found.</CommandEmpty>
                          <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar" selectOnFocus={false}>
                            <CommandGroup>
                              {filteredInstagramAccounts.map((page) => (
                                <CommandItem
                                  key={page.instagramAccount.id}
                                  value={page.instagramAccount.id}
                                  onSelect={() => {
                                    setInstagramAccountId(page.instagramAccount.id)
                                    setOpenInstagram(false)
                                  }}
                                  className={cn(
                                    "px-3 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                    instagramAccountId === page.instagramAccount.id && "bg-gray-100 font-semibold",
                                    "hover:bg-gray-100 flex items-center gap-2"
                                  )}
                                >
                                  <img
                                    src={page.instagramAccount.profilePictureUrl || "https://api.withblip.com/backup_page_image.png"}
                                    alt={`${page.instagramAccount.username} profile`}
                                    className="w-6 h-6 rounded-full object-cover border border-gray-300"
                                  />
                                  <span>{page.instagramAccount.username}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Partnership Ad Toggle */}
                    <div className="space-y-4 pt-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <Label htmlFor="partnership-toggle" className="cursor-pointer">
                          <span className="inline-flex items-center gap-1">
                            {renderDiffMark("isPartnershipAd")}
                            <span>Add Partnership</span>
                          </span>
                        </Label>
                        <Switch
                          id="partnership-toggle"
                          checked={isPartnershipAd}
                          onCheckedChange={handlePartnershipToggle}
                          disabled={!instagramAccountId}
                        />
                      </div>

                      {!instagramAccountId && (
                        <p className="text-xs text-gray-500">
                          Select an Instagram account to fetch linked partners for
                        </p>
                      )}

                      {/* Partner Selector (only shown when toggle is ON) */}
                      {isPartnershipAd && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">
                              Select Partner Creator
                            </Label>
                            <RefreshCcw
                              className={cn(
                                "h-4 w-4 cursor-pointer transition-all duration-200",
                                isLoadingPartners
                                  ? "text-gray-300 animate-[spin_3s_linear_infinite]"
                                  : "text-gray-500 hover:text-gray-700"
                              )}
                              onClick={refetchPartners}
                            />
                          </div>

                          {partnersError && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                              <AlertTriangle className="w-4 h-4" />
                              <span>{partnersError}</span>
                            </div>
                          )}

                          {/* Partner Instagram Selector */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm text-gray-600">
                              {renderDiffMark("partnerIgAccountId")}
                              <InstagramIcon className="w-4 h-4" />
                              Partner Instagram Account
                            </Label>
                            <Popover open={openPartnerSelector} onOpenChange={setOpenPartnerSelector}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openPartnerSelector}
                                  className={cn("w-full justify-between", formDropdownTriggerChrome)}
                                  disabled={isLoadingPartners || availablePartners.length === 0}
                                >
                                  {isLoadingPartners ? (
                                    <div className="flex items-center gap-2">
                                      <Loader className="h-4 w-4 animate-spin" />
                                      <span>Loading partners...</span>
                                    </div>
                                  ) : selectedPartner ? (
                                    <div className="flex items-center gap-2">
                                      <span>@{selectedPartner.creatorUsername}</span>
                                      <span className="text-xs text-gray-400">
                                        ({selectedPartner.creatorIgId})
                                      </span>
                                    </div>
                                  ) : availablePartners.length === 0 ? (
                                    "No approved partners found"
                                  ) : (
                                    "Select a partner creator"
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
                                align="start"
                                sideOffset={4}
                                side="bottom"
                                avoidCollisions={false}
                                style={{
                                  minWidth: "var(--radix-popover-trigger-width)",
                                  width: "auto",
                                  maxWidth: "var(--radix-popover-trigger-width)",
                                }}
                              >
                                <Command loop={false}>
                                  <CommandInput
                                    placeholder="Search partners..."
                                    value={partnerSearchValue}
                                    onValueChange={setPartnerSearchValue}
                                  />
                                  <CommandEmpty>No partners found.</CommandEmpty>
                                  <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                                    <CommandGroup>
                                      {filteredPartners.map((partner) => (
                                        <CommandItem
                                          key={partner.creatorIgId}
                                          value={`${partner.creatorUsername} ${partner.creatorIgId}`}
                                          onSelect={() => handlePartnerSelect(partner)}
                                          className={cn(
                                            "px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                            partnerIgAccountId === partner.creatorIgId && "bg-gray-100 font-semibold",
                                            "hover:bg-gray-100 flex items-center gap-2"
                                          )}
                                        >
                                          <div className="flex flex-col">
                                            <span>@{partner.creatorUsername ?? "Username not available"}</span>
                                            <span className="text-xs text-gray-400">
                                              ID: {partner.creatorIgId}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Partner FB Page ID (auto-filled, read-only) */}
                          {partnerFbPageId && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm text-gray-600">
                                {renderDiffMark("partnerFbPageId")}
                                <FacebookIcon className="w-4 h-4" />
                                Partner Facebook Page ID
                              </Label>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-xl">
                                <span className="text-sm text-gray-700">
                                  @{selectedPartner?.creatorUsername} ({partnerFbPageId})
                                </span>
                                <span className="text-xs text-green-600 ml-auto">✓ Auto-filled</span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                {renderDiffMark("partnershipIdentityMode")}
                                <span>Select identities in header</span>
                              </span>
                            </Label>
                            <RadioGroup
                              value={partnershipIdentityMode}
                              onValueChange={setPartnershipIdentityMode}
                              className="flex items-center gap-4"
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="dynamic" id="identity-dynamic" />
                                <Label htmlFor="identity-dynamic" className="text-sm font-normal cursor-pointer">
                                  Dynamic
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem
                                  value="first_identity_only"
                                  id="identity-first"
                                  disabled={!partnerFbPageId && partnerIgAccountId}
                                />
                                <Label
                                  htmlFor="identity-first"
                                  className={cn(
                                    "text-sm font-normal cursor-pointer",
                                    !partnerFbPageId && partnerIgAccountId && "text-gray-400 cursor-not-allowed"
                                  )}
                                >
                                  First identity only
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>



                          {availablePartners.length === 0 && !isLoadingPartners && !partnersError && (
                            <p className="text-xs text-gray-500">
                              No approved partnership ad permissions found. Partners need to approve your brand first.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div id="adName" className="space-y-1">
                  <Label htmlFor="adName" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {renderDiffMark("adNameFormulaV2")}
                      <LabelIcon className="w-4 h-4" />
                      Ad Name
                    </div>
                    {selectedAdAccount && !adAccountSettings?.adNameFormulaV2?.rawInput && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/settings?tab=adaccount&adAccount=${selectedAdAccount}`)}
                        className="text-xs px-3 pl-2 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900"
                      >
                        <CogIcon className="w-3 h-3 mr-1 text-white" />
                        Set Up Ad Name Formula
                      </Button>
                    )}
                  </Label>

                  <ReorderAdNameParts
                    formulaInput={adNameFormulaV2?.rawInput || ""}
                    onFormulaChange={(newRawInput) => {
                      setAdNameFormulaV2({ rawInput: newRawInput });
                    }}
                    variant="home"
                    customVariables={adAccountSettings.customVariables || []}

                  />
                  <div className="mt-1">
                    <Label className="text-xs text-gray-500">
                      Ad Name Preview: {
                        (files.length > 0 || driveFiles.length > 0 || importedFiles.length > 0 || importedPosts.length > 0 || selectedIgOrganicPosts.length > 0)
                          ? computeAdNameFromFormula(files[0] || driveFiles[0], 0, link[0], null, adType)
                          : "Upload a file to see example"
                      }
                    </Label>
                  </div>
                </div>



                {selectedIgOrganicPosts.length === 0 ? (
                  <div className="space-y-3">


                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="flex items-center gap-2 mb-0">
                          <TemplateIcon className="w-4 h-4" />
                          Select a Copy Template
                        </Label>

                        {/* No templates + no content → Setup button */}
                        {Object.keys(copyTemplates).length === 0 && !hasAnyContent && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/settings?tab=adaccount&adAccount=${selectedAdAccount}`)}
                            className="text-xs px-3 pl-2 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900 ml-auto"
                          >
                            <CogIcon className="w-3 h-3 text-white" />
                            Set Up Templates
                          </Button>
                        )}

                        {/* No templates + content typed → Save as New only */}
                        {Object.keys(copyTemplates).length === 0 && hasAnyContent && (
                          <div className="ml-auto animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out fill-mode-both">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSavingNew || isUpdatingTemplate || !!existingDuplicateTemplate || hasDuplicates}
                              onClick={() => setShowSaveNewDialog(true)}
                              className="text-xs px-3 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900"
                            >
                              {isSavingNew ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : existingDuplicateTemplate ? (
                                `Already exists as "${existingDuplicateTemplate}"`
                              ) : (
                                "Save as New Template"
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Has templates + changes detected → both buttons */}
                        {Object.keys(copyTemplates).length > 0 && hasUnsavedTemplateChanges && (
                          <div className="flex items-center gap-2 ml-auto animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out fill-mode-both">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSavingNew || isUpdatingTemplate || !!existingDuplicateTemplate || hasDuplicates}
                              onClick={() => setShowSaveNewDialog(true)}
                              className="text-xs px-3 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900"
                            >
                              {isSavingNew ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : existingDuplicateTemplate ? (
                                `Already exists as "${existingDuplicateTemplate}"`
                              ) : (
                                "Save as New Template"
                              )}
                            </Button>
                            {selectedTemplate && copyTemplates[selectedTemplate] && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isUpdatingTemplate || isSavingNew || !!existingDuplicateTemplate || hasDuplicates}
                                onClick={handleUpdateSelectedTemplate}
                                className="text-xs px-3 py-0.5 border-gray-300 text-white bg-blue-600 rounded-xl hover:text-white hover:bg-blue-700 animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out fill-mode-both delay-200"
                              >
                                {isUpdatingTemplate ? (
                                  <>
                                    <Loader className="w-3 h-3 animate-spin mr-1" />
                                    Updating Template...
                                  </>
                                ) : (
                                  "Update Selected Template"
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <Popover open={templateDropdownOpen} onOpenChange={(open) => {
                        setTemplateDropdownOpen(open);
                        if (!open) {
                          setTemplateSearch("");
                          setShowSortMenu(false);
                          if (bulkDeleteMode && selectedForDelete.size === 0) {
                            setBulkDeleteMode(false);
                          }
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-between ${formFieldChrome} hover:bg-white`}
                            disabled={Object.keys(copyTemplates).length === 0}
                          >
                            <span className="truncate">
                              {Object.keys(copyTemplates).length === 0
                                ? "No templates available for selected ad account"
                                : selectedTemplate || "Choose a Template"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white"
                          align="start"
                          style={{
                            minWidth: "var(--radix-popover-trigger-width)",
                            width: "auto",
                          }}
                        >
                          <Command filter={() => 1} loop={false} className="overflow-visible">
                            <div className="flex items-center gap-1.5 mx-2 mt-2 mb-1">
                              <CommandInput
                                placeholder="Search templates..."
                                value={templateSearch}
                                onValueChange={setTemplateSearch}
                                wrapperClassName="flex-1 border-gray-200 bg-gray-50 mx-0 mt-0 mb-0"
                              />
                              <div className="flex items-center gap-1">
                                {/* Sort button */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    className={`p-1.5 rounded-lg transition-colors ${showSortMenu ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowSortMenu(!showSortMenu);
                                    }}
                                    title="Sort templates"
                                  >
                                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
                                  </button>
                                  {showSortMenu && (
                                    <>
                                      <div className="fixed inset-0 z-[99]" onClick={() => setShowSortMenu(false)} />
                                      <div className="absolute right-0 top-full mt-1 z-[100] bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[150px]">
                                        <TooltipProvider delayDuration={0}>
                                          {[
                                            { value: "default", label: "Recently Made" },
                                            { value: "oldest", label: "Oldest First" },
                                            { value: "most_used", label: "Most Used" },
                                          ].map((option) => (
                                            <button
                                              key={option.value}
                                              type="button"
                                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center justify-between"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSortMode(option.value);
                                                localStorage.setItem("templateSortMode", option.value);
                                                setShowSortMenu(false);
                                              }}
                                            >
                                              <span className="flex items-center gap-1.5">
                                                {option.label}
                                                {option.value === "most_used" && (
                                                  <Tooltip>
                                                    <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                      <Info className="h-3 w-3 text-gray-400" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="text-xs">
                                                      Tracking since 20th Apr '26
                                                    </TooltipContent>
                                                  </Tooltip>
                                                )}
                                              </span>
                                              {sortMode === option.value && (
                                                <Check className="h-3.5 w-3.5 text-blue-500" />
                                              )}
                                            </button>
                                          ))}
                                        </TooltipProvider>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {/* Bulk delete button */}
                                {bulkDeleteMode && selectedForDelete.size > 0 ? (
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-70"
                                    disabled={isDeletingTemplates}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBulkDeleteTemplates();
                                    }}
                                  >
                                    {isDeletingTemplates ? <Loader className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                    {isDeletingTemplates ? "Deleting..." : `Delete (${selectedForDelete.size})`}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={`p-1.5 rounded-lg transition-colors ${bulkDeleteMode ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (bulkDeleteMode) {
                                        setBulkDeleteMode(false);
                                        setSelectedForDelete(new Set());
                                      } else {
                                        setBulkDeleteMode(true);
                                      }
                                    }}
                                    title={bulkDeleteMode ? "Cancel delete" : "Delete templates"}
                                  >
                                    {bulkDeleteMode ? (
                                      <X className="h-3.5 w-3.5" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            <CommandList className="max-h-[300px] overflow-y-auto rounded-xl">
                              {sortedFilteredTemplates.map(([tplName, tplData]) => (
                                <CommandItem
                                  key={tplName}
                                  value={tplName}
                                  onSelect={() => {
                                    if (bulkDeleteMode) {
                                      toggleDeleteSelection(tplName);
                                    } else {
                                      setSelectedTemplate(tplName);
                                      setTemplateDropdownOpen(false);
                                      setTemplateSearch("");
                                    }
                                  }}
                                  className="px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150 hover:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    {bulkDeleteMode && (
                                      <Checkbox
                                        checked={selectedForDelete.has(tplName)}
                                        className="border-gray-300 w-4 h-4 rounded-md pointer-events-none"
                                      />
                                    )}
                                    <span className="text-sm truncate flex-1">{tplName}</span>
                                    {sortMode === "most_used" && tplData?.usageCount > 0 && (
                                      <span className="text-xs text-gray-400 shrink-0">{tplData.usageCount} ads</span>
                                    )}
                                    {tplName === defaultTemplateName && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg shrink-0">
                                        Default
                                      </span>
                                    )}
                                    {!bulkDeleteMode && tplName === selectedTemplate && (
                                      <Check className="h-4 w-4 text-blue-500 shrink-0" />
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>


                    <div className="space-y-2">
                      {/* Primary text Section */}
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1">
                            {renderDiffMark("messages")}
                            {isCarouselAd ? "Headline" : "Primary Text"}
                            {isCarouselAd && <span className="text-sm text-gray-500 ml-1">(One per carousel card)</span>}
                          </span>
                          {isCarouselAd && (
                            <div className="flex items-center space-x-1 ">
                              <Checkbox
                                id="apply-text-all"
                                checked={applyTextToAllCards}
                                onCheckedChange={(checked) => {
                                  setApplyTextToAllCards(checked);
                                  if (checked && messages.length > 0) {
                                    const firstMessage = messages[0];
                                    const fileCount = files.length + driveFiles.length + dropboxFiles.length + importedFiles.length;
                                    if (fileCount > 0) {
                                      setMessages(new Array(fileCount).fill(firstMessage));
                                    }

                                  } else if (!checked && selectedTemplate && copyTemplates[selectedTemplate]) {
                                    const tpl = copyTemplates[selectedTemplate];
                                    setMessages(tpl.primaryTexts || [""]);
                                  }
                                }}
                                className="border-gray-300 w-4 h-4 rounded-md"
                              />
                              <label htmlFor="apply-text-all" className="text-xs font-medium">
                                Apply To All Cards
                              </label>
                            </div>
                          )}
                        </Label>
                        <div className="space-y-3">
                          {messages.map((value, index) => (
                            <div key={index} className={`flex items-start gap-2 ${isCarouselAd && applyTextToAllCards && index > 0 ? 'hidden' : ''}`}>
                              <div className="flex flex-col w-full">
                                <TextareaAutosize
                                  value={value}
                                  onChange={(e) => {
                                    if (isCarouselAd && applyTextToAllCards) {
                                      setMessages(new Array(messages.length).fill(e.target.value));
                                    } else {
                                      updateField(setMessages, messages, index, e.target.value);
                                    }
                                  }}
                                  placeholder={isCarouselAd ? `Headline for card ${index + 1}` : "Add text option"}
                                  disabled={!isLoggedIn}
                                  minRows={2}
                                  maxRows={10}
                                  className={`${formTextareaChrome} ${duplicateIndices.messages.has(index)
                                    ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                    : ""
                                    }`}
                                  style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#c7c7c7 transparent'
                                  }}
                                />
                                {duplicateIndices.messages.has(index) && (
                                  <p className="text-xs text-red-500 mt-1">Duplicate values can cause errors when making ads</p>
                                )}
                              </div>
                              {messages.length > 1 && !(isCarouselAd && applyTextToAllCards) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="border border-gray-400 rounded-xl bg-white shadow-xs"
                                  size="icon"
                                  onClick={() => removeField(setMessages, messages, index)}
                                >
                                  <Trash2
                                    className="w-4 h-4 text-gray-600 cursor-pointer hover:text-red-500" />
                                  <span className="sr-only">Remove</span>
                                </Button>
                              )}
                            </div>
                          ))}
                          {messages.length < (isCarouselAd ? 10 : 5) && !(isCarouselAd && applyTextToAllCards) && (
                            <Button
                              type="button"
                              size="sm"
                              className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                              onClick={() => addField(setMessages, messages)}
                            >
                              <Plus className="mr-2 h-4 w-4 text-white" />
                              {isCarouselAd ? 'Add card headline' : 'Add text option'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Headlines Section */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1">
                          {renderDiffMark("headlines")}
                          {isCarouselAd ? "Description" : "Headlines"}
                          {isCarouselAd && <span className="text-sm text-gray-500 ml-1">(One per carousel card)</span>}
                        </span>
                        {isCarouselAd && (
                          <div className="flex items-center space-x-1">
                            <Checkbox
                              id="apply-headlines-all"
                              checked={applyHeadlinesToAllCards}
                              onCheckedChange={(checked) => {
                                setApplyHeadlinesToAllCards(checked);
                                if (checked && headlines.length > 0) {
                                  const firstHeadline = headlines[0];
                                  const fileCount = files.length + driveFiles.length + dropboxFiles.length + importedFiles.length;
                                  if (fileCount > 0) {
                                    setHeadlines(new Array(fileCount).fill(firstHeadline));
                                  }
                                } else if (!checked && selectedTemplate && copyTemplates[selectedTemplate]) {
                                  const tpl = copyTemplates[selectedTemplate];
                                  setHeadlines(tpl.headlines || [""]);
                                }
                              }}
                              className="border-gray-300 w-4 h-4 rounded-md"
                            />
                            <label htmlFor="apply-headlines-all" className="text-xs font-medium">
                              Apply To All Cards
                            </label>
                          </div>
                        )}
                      </Label>
                      <div className="space-y-3">
                        {headlines.map((value, index) => (
                          <div key={index} className={`flex items-center gap-2 ${isCarouselAd && applyHeadlinesToAllCards && index > 0 ? 'hidden' : ''}`}>
                            <div className="flex flex-col w-full">
                              <TextareaAutosize
                                value={value}
                                onChange={(e) => {
                                  if (isCarouselAd && applyHeadlinesToAllCards) {
                                    const newHeadlines = new Array(headlines.length).fill(e.target.value);
                                    setHeadlines(newHeadlines);
                                  } else {
                                    updateField(setHeadlines, headlines, index, e.target.value);
                                  }
                                }}
                                minRows={1}
                                maxRows={10}
                                className={`${formTextareaChrome} ${duplicateIndices.headlines.has(index)
                                  ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                  : ""
                                  }`}
                                style={{
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: '#c7c7c7 transparent'
                                }}
                                placeholder={isCarouselAd ? `Description for card ${index + 1}` : "Enter headline"}
                                disabled={!isLoggedIn}
                              />
                              {duplicateIndices.headlines.has(index) && (
                                <p className="text-xs text-red-500 mt-1">Duplicate values can cause errors when making ads</p>
                              )}
                            </div>
                            {headlines.length > 1 && !(isCarouselAd && applyHeadlinesToAllCards) && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="border border-gray-400 rounded-xl bg-white shadow-xs"
                                size="icon"
                                onClick={() => removeField(setHeadlines, headlines, index)}
                              >
                                <Trash2
                                  className="w-4 h-4 text-gray-600 cursor-pointer !hover:text-red-500" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            )}
                          </div>
                        ))}
                        {headlines.length < (isCarouselAd ? 10 : 5) && !(isCarouselAd && applyHeadlinesToAllCards) && (
                          <Button
                            type="button"
                            size="sm"
                            className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                            onClick={() => addField(setHeadlines, headlines)}
                          >
                            <Plus className="mr-2 h-4 w-4 text-white" />
                            {isCarouselAd ? 'Add card description' : 'Add headline option'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Descriptions Section - only show if template has descriptions */}


                    {(isCarouselAd || descriptions.some(d => d !== "")) && (
                      <div className="space-y-2">
                        <Label className="inline-flex items-center gap-1">
                          {renderDiffMark("descriptions")}
                          <span>{isCarouselAd ? "Primary Text" : "Descriptions"}</span>
                        </Label>
                        <div className="space-y-3">
                          {isCarouselAd ? (
                            <div className="flex items-center gap-2">
                              <TextareaAutosize
                                value={descriptions[0] || ''}
                                onChange={(e) => setDescriptions([e.target.value])}
                                minRows={2}
                                maxRows={10}
                                className={formTextareaChrome}
                                style={{
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: '#c7c7c7 transparent'
                                }}
                                placeholder="Enter primary text"
                                disabled={!isLoggedIn}
                              />
                            </div>
                          ) : (
                            <>
                              {descriptions.map((value, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div className="flex flex-col w-full">
                                    <TextareaAutosize
                                      value={value}
                                      onChange={(e) => updateField(setDescriptions, descriptions, index, e.target.value)}
                                      minRows={1}
                                      maxRows={10}
                                      className={`${formTextareaChrome} ${duplicateIndices.descriptions.has(index)
                                        ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                        : ""
                                        }`}
                                      style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#c7c7c7 transparent'
                                      }}
                                      placeholder="Enter description"
                                      disabled={!isLoggedIn}
                                    />
                                    {duplicateIndices.descriptions.has(index) && (
                                      <p className="text-xs text-red-500 mt-1">Duplicate values can cause errors when making ads</p>
                                    )}
                                  </div>
                                  {descriptions.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="border border-gray-400 rounded-xl bg-white shadow-xs"
                                      size="icon"
                                      onClick={() => removeField(setDescriptions, descriptions, index)}
                                    >
                                      <Trash2 className="w-4 h-4 text-gray-600 cursor-pointer hover:text-red-500" />
                                      <span className="sr-only">Remove</span>
                                    </Button>
                                  )}
                                </div>
                              ))}
                              {descriptions.length < 5 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                                  onClick={() => addField(setDescriptions, descriptions)}
                                >
                                  <Plus className="mr-2 h-4 w-4 text-white" />
                                  Add description option
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}


                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <TemplateIcon className="w-4 h-4" />
                      <span>Ad Copy</span>
                      {selectedIgOrganicPosts.length > 1 && (
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-xs text-gray-600">
                            {activeIgCaptionIndex + 1}/{selectedIgOrganicPosts.length}
                          </span>
                          <button
                            type="button"
                            disabled={activeIgCaptionIndex === 0}
                            onClick={() => setActiveIgCaptionIndex((prev) => prev - 1)}
                            className={`p-0.5 rounded transition-colors ${activeIgCaptionIndex === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={activeIgCaptionIndex === selectedIgOrganicPosts.length - 1}
                            onClick={() => setActiveIgCaptionIndex((prev) => prev + 1)}
                            className={`p-0.5 rounded transition-colors ${activeIgCaptionIndex === selectedIgOrganicPosts.length - 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </Label>
                    <TextareaAutosize
                      value={selectedIgOrganicPosts[activeIgCaptionIndex]?.caption || ''}
                      disabled
                      minRows={2}
                      maxRows={10}
                      className="border border-gray-200 shadom-md rounded-xl bg-gray-100 w-full px-3 py-2 text-sm resize-none focus:outline-none text-gray-500 cursor-not-allowed"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#c7c7c7 transparent'
                      }}
                      placeholder="No caption available"
                    />
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-xs text-blue-700">
                        Ad copy will be sourced from the selected Instagram posts.
                      </p>
                    </div>
                  </div>
                )
                }

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {renderDiffMark(showPhoneNumberField ? "phoneNumber" : "link")}
                        {showPhoneNumberField ? (
                          <Phone className="w-4 h-4" />
                        ) : (
                          <LinkIcon className="w-4 h-4" />
                        )}
                        {showPhoneNumberField ? "Phone Number" : "Link (URL)"}
                      </span>
                      {isCarouselAd && !showPhoneNumberField && (
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id="apply-link-all"
                            checked={link.length === 1}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const currentLink = customLink.trim() || link[0] || "";
                                setLink([currentLink]);
                              } else {
                                const currentLink = customLink.trim() || link[0] || "";
                                setLink([currentLink, ""]);
                              }
                            }}
                            className="border-gray-300 w-4 h-4 rounded-md"
                          />
                          <label htmlFor="apply-link-all" className="text-xs font-medium">
                            Apply To All Cards
                          </label>
                        </div>
                      )}
                    </Label>
                    <p className="text-gray-500 text-[12px] font-regular">
                      {showPhoneNumberField ? (
                        <>
                          This phone number will be used for your call ads.{" "}
                          <span className="font-semibold">Please add country code as well</span>
                        </>
                      ) : (
                        "Your UTMs will be auto applied from Preferences"
                      )}
                    </p>

                    {showPhoneNumberField ? (
                      <div className="space-y-3">
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className={cn("w-full", formInputChrome)}
                          placeholder="+15551234567. You must add country code without spaces."
                          disabled={!isLoggedIn}
                          required
                        />
                      </div>
                    ) : !isCarouselAd || link.length === 1 ? (
                      // Single link mode (normal ads or carousel with "apply to all")
                      <div className="space-y-3">
                        {!showCustomLink && availableLinks.length > 0 && (
                          <Select
                            value={link[0] || ""}
                            onValueChange={(value) => setLink([value])}
                            disabled={!isLoggedIn || availableLinks.length === 0}
                          >
                            <SelectTrigger className={cn("w-full", formFieldChrome)}>
                              <SelectValue placeholder="Select a link" />
                            </SelectTrigger>

                            <SelectContent className="bg-white shadow-lg rounded-xl w-auto">
                              {availableLinks.map((linkObj, index) => (
                                <SelectItem
                                  key={index}
                                  value={linkObj.url}
                                  className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-xl mx-2 my-1 ml-4"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="truncate max-w-[650px]">{linkObj.url}</span>

                                    {linkObj.isDefault && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg flex-shrink-0">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <div className="flex items-center space-x-2">
                          <div className="space-y-2 w-full">
                            {/* Custom link input */}
                            {(showCustomLink || availableLinks.length === 0) && (
                              <div className="w-full">
                                <Input
                                  type="text"
                                  value={customLink}
                                  onChange={(e) => {
                                    setCustomLink(e.target.value);
                                    setLink([e.target.value]);
                                  }}
                                  className={cn("w-full", formInputChrome)}
                                  placeholder="https://example.com"
                                  disabled={!isLoggedIn}
                                  required
                                />
                              </div>
                            )}

                            {/* Checkbox toggle - only show if they have saved links */}
                            {availableLinks.length > 0 && (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="custom-link-toggle"
                                  checked={showCustomLink}
                                  onCheckedChange={(checked) => {
                                    setShowCustomLink(checked);
                                    if (!checked) {
                                      setCustomLink("");
                                      const dropdownValue = defaultLink?.url || "";
                                      setLink([dropdownValue]);
                                    }
                                  }}
                                  className="border-gray-300 w-4 h-4 rounded-md"
                                />
                                <label htmlFor="custom-link-toggle" className="text-xs font-medium text-gray-600">
                                  Enter custom link
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Multiple links mode (carousel with separate links per card)
                      <div className="space-y-4">
                        {link.map((value, index) => (
                          <div key={index} className="border border-gray-200 rounded-xl p-3 space-y-3">
                            <Label className="text-sm font-medium">Card {index + 1} Link</Label>

                            {(!linkCustomStates || !linkCustomStates[index]) && (
                              <Select
                                value={value || ""}
                                onValueChange={(newValue) => {
                                  const newLinks = [...link];
                                  newLinks[index] = newValue;
                                  setLink(newLinks);
                                }}
                                disabled={!isLoggedIn || availableLinks.length === 0}
                              >
                                <SelectTrigger className={formFieldChrome}>
                                  <SelectValue placeholder="Select a link" />
                                </SelectTrigger>
                                <SelectContent className="bg-white shadow-lg rounded-xl">
                                  {availableLinks.map((linkObj, linkIndex) => (
                                    <SelectItem
                                      key={linkIndex}
                                      value={linkObj.url}
                                      className="cursor-pointer px-4 py-3 hover:bg-gray-100 rounded-xl mx-2 my-1"
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="truncate max-w-[250px]">{linkObj.url}</span>
                                        {linkObj.isDefault && (
                                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                            Default
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`custom-link-${index}`}
                                  checked={linkCustomStates?.[index] || false}
                                  onCheckedChange={(checked) => {
                                    const newStates = { ...linkCustomStates };
                                    newStates[index] = checked;
                                    setLinkCustomStates(newStates);

                                    if (!checked) {
                                      // Reset to dropdown value
                                      const newLinks = [...link];
                                      newLinks[index] = defaultLink?.url || "";
                                      setLink(newLinks);
                                    }
                                  }}
                                  className="border-gray-300 w-4 h-4 rounded-md"
                                />
                                <label htmlFor={`custom-link-${index}`} className="text-xs font-medium text-gray-600">
                                  Use custom link
                                </label>
                              </div>

                              {link.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newLinks = link.filter((_, i) => i !== index);
                                    setLink(newLinks);
                                    // Also clean up custom states
                                    const newStates = { ...linkCustomStates };
                                    delete newStates[index];
                                    setLinkCustomStates(newStates);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-500" />
                                </Button>
                              )}
                            </div>

                            {linkCustomStates?.[index] && (
                              <Input
                                type="text"
                                value={value}
                                onChange={(e) => {
                                  const newLinks = [...link];
                                  newLinks[index] = e.target.value;
                                  setLink(newLinks);
                                }}
                                className={formInputChrome}
                                placeholder="https://example.com"
                                disabled={!isLoggedIn}
                                required
                              />
                            )}
                          </div>
                        ))}

                        {link.length < 10 && (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                            onClick={() => setLink([...link, ""])}
                          >
                            <Plus className="mr-2 h-4 w-4 text-white" />
                            Add Card Link
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cta" className="flex items-center gap-2">
                      {renderDiffMark("cta")}
                      <CTAIcon className="w-4 h-4" />
                      Call-to-Action (CTA)
                    </Label>
                    <Select disabled={!isLoggedIn} value={cta} onValueChange={setCta}>
                      <SelectTrigger id="cta" className={formFieldChrome}>
                        <SelectValue placeholder="Select a CTA" />
                      </SelectTrigger>
                      <SelectContent className="bg-white shadow-lg rounded-xl max-h-full p-0 pr-2">
                        {ctaOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className={cn(
                              "w-full text-left",
                              "px-4 py-2 m-1 rounded-xl", // padding and spacing
                              "transition-colors duration-150",
                              "hover:bg-gray-100 hover:rounded-xl",
                              "data-[state=selected]:!bg-gray-100 data-[state=selected]:rounded-xl",
                              "data-[highlighted]:!bg-gray-100 data-[highlighted]:rounded-xl",
                              cta === option.value && "!bg-gray-100 font-semibold rounded-xl"
                            )}
                          >
                            {option.label}
                          </SelectItem>

                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Shop Destination Selector - Only show when needed */}
                  <ShopDestinationSelector
                    pageId={pageId}
                    selectedShopDestination={selectedShopDestination}
                    setSelectedShopDestination={setSelectedShopDestination}
                    selectedShopDestinationType={selectedShopDestinationType}
                    setSelectedShopDestinationType={setSelectedShopDestinationType}
                    isFieldModified={() => isFormFieldModified?.(["selectedShopDestination", "selectedShopDestinationType"])}
                    isVisible={showShopDestinationSelector}
                  />
                </div>

                {shouldShowLeadFormSelector && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="leadgen-form" className="flex items-center gap-2">
                        {renderDiffMark("selectedForm")}
                        <FileText className="w-4 h-4" />
                        Select a Form
                      </Label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!pageId || loadingForms) return;
                          setLoadingForms(true);
                          try {
                            const response = await fetch(
                              `${API_BASE_URL}/auth/fetch-leadgen-forms?pageId=${encodeURIComponent(pageId)}`,
                              { credentials: 'include' }
                            );
                            const data = await response.json();
                            if (data.success && data.forms) {
                              setLeadgenForms(data.forms);
                            } else {
                              setLeadgenForms([]);
                            }
                          } catch (error) {

                            setLeadgenForms([]);
                          } finally {
                            setLoadingForms(false);
                          }
                        }}
                        disabled={loadingForms}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                      >
                        <RefreshCcw className={cn("w-4 h-4", loadingForms && "animate-spin")} />

                      </button>
                    </div>

                    <Select
                      disabled={!isLoggedIn || loadingForms || leadgenForms.length === 0}
                      value={selectedForm || ""}
                      onValueChange={(value) => setSelectedForm(value || null)}
                    >
                      <SelectTrigger id="leadgen-form" className={formFieldChrome}>
                        <SelectValue placeholder={
                          loadingForms
                            ? "Loading forms..."
                            : leadgenForms.length === 0
                              ? "No forms available"
                              : "Select a form"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-white shadow-lg rounded-xl max-h-full p-0 pr-2">
                        {leadgenForms.map((form) => (
                          <SelectItem
                            key={form.id}
                            value={form.id}
                            className={cn(
                              "w-full text-left",
                              "px-4 py-2 m-1 rounded-xl",
                              "transition-colors duration-150",
                              "hover:bg-gray-100 hover:rounded-xl",
                              "data-[state=selected]:!bg-gray-100 data-[state=selected]:rounded-xl",
                              "data-[highlighted]:!bg-gray-100 data-[highlighted]:rounded-xl",
                              selectedForm === form.id && "!bg-gray-100 font-semibold rounded-xl"
                            )}
                          >
                            {form.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="block">Upload Media</Label>

                    <MetaMediaLibraryModal
                      adAccountId={selectedAdAccount}
                      isLoggedIn={isLoggedIn}
                      importedFiles={importedFiles}
                      setImportedFiles={setImportedFiles}
                      instagramAccountId={instagramAccountId}
                      selectedIgOrganicPosts={selectedIgOrganicPosts}
                      setSelectedIgOrganicPosts={setSelectedIgOrganicPosts}
                    />
                  </div>
                  <div
                    {...getRootProps()}
                    className={`group cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
                      }`}
                  >
                    <input {...getInputProps()} disabled={!isLoggedIn} />
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-gray-500 group-hover:text-black" />
                      {isDragActive ? (
                        <p className="text-sm text-gray-500 group-hover:text-black">Drop files here ...</p>
                      ) : (
                        <p className="text-sm text-gray-500 group-hover:text-black">
                          Drag & drop files here, or click to select files
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-2 mb-4">
                  {/* Google Drive */}
                  <div className="flex-1">
                    <Button
                      type="button"
                      onClick={handleDriveClick}
                      className="w-full bg-zinc-800 border border-gray-300 hover:bg-blue-700 text-white rounded-2xl h-[48px] flex items-center justify-center gap-2"
                    >
                      <img
                        src="https://api.withblip.com/googledrive.png"
                        alt="Drive Icon"
                        className="h-4 w-4"
                      />
                      Choose Files from Google Drive
                    </Button>

                    <div className="text-xs text-gray-500 text-left mt-0.5">
                      Google Drive  and Dropbox Files upload 5X faster
                    </div>
                  </div>

                  {/* Dropbox */}
                  <div className="flex-1">
                    <Button
                      type="button"
                      onClick={handleDropboxClick}
                      className="w-full bg-zinc-800 border border-gray-300 hover:bg-blue-700 text-white rounded-2xl h-[48px] flex items-center justify-center gap-2"
                    >
                      <img
                        src={DropboxIcon}
                        alt="Dropbox Icon"
                        className="h-4 w-4"
                      />
                      Choose Files from Dropbox
                    </Button>
                  </div>
                </div>


                {showFolderInput && (
                  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[2147483647] bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-[500px]" style={{
                    top: 'calc(50vh - 500px)' // Positions it above center where picker usually appears
                  }} >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Quick Navigate to Folder</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowFolderInput(false);
                            setFolderLinkValue("");
                          }}
                          className="h-6 w-6 p-0"
                        >

                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Paste Google Drive folder link here"
                          value={folderLinkValue}
                          onChange={(e) => setFolderLinkValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleImportFromFolder();
                            }
                          }}
                          className={cn("flex-1", formInputChrome)}

                        />
                        <Button
                          type="button"
                          onClick={handleImportFromFolder}
                          disabled={!folderLinkValue}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isImportingFolder ? (
                            <>
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                              Opening...
                            </>
                          ) : (
                            "Open"
                          )}
                        </Button>
                      </div>

                      <div className="text-xs text-gray-500">
                        Or browse files below ↓
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}

          </div>



          <div className="space-y-1">
            <Button
              type="submit"
              className="w-full h-12 bg-neutral-950 hover:bg-blue-700 text-white rounded-2xl"
              disabled={publishDisabled || isQueueingJobs}
            >
              {isQueueingJobs ? "Publishing Ads..." : "Publish Ads"}
            </Button>

            {variants.length > 1 && hasConfiguredFormSplits && (
              <div className="text-xs text-gray-500 mt-2">
                Publishing {populatedVariantSummaries.length} job{populatedVariantSummaries.length === 1 ? '' : 's'}:
                {' '}
                {populatedVariantSummaries.map((variant) => `${variant.name} (${variant.count})`).join(' · ')}
              </div>
            )}

            {!isCarouselAd && hasDuplicates && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Duplicate values found in your text fields — this can lead to errors when making ads. Please remove duplicates before publishing.
              </div>
            )}

            {showShopDestinationSelector && !selectedShopDestination && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Please select a shop destination
              </div>
            )}

            {adLimitWarning && (
              <div className="flex items-start gap-1 p-1 pl-2 bg-orange-50 border border-orange-200 rounded-2xl mt-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5 mr-0.5" />
                <span className="text-xs text-orange-700">
                  This might push your ad set past the 50 ads limit! Only Sales campaigns using Advantage+ Audience can contain a maximum of 150 Ads.
                </span>
              </div>
            )}

            {isCarouselAd && (files.length + driveFiles.length + dropboxFiles.length) > 0 && (files.length + driveFiles.length + dropboxFiles.length) < 2 && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Carousel ads require at least 2 files. You have {files.length + driveFiles.length + dropboxFiles.length}.
              </div>
            )}

            {isMissingDestinationValue && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                {showPhoneNumberField ? 'Please provide a phone number' : 'Please provide a link URL'}
              </div>
            )}
            {enablePlacementCustomization && selectedFiles && (selectedFiles.size > 1) && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                You have ungrouped files for placement customization. Use the group ads button on the top right to group files               </div>
            )}

            {shouldShowLeadFormSelector && !selectedForm && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Please select a lead form to publish lead ads
              </div>
            )}

            {!useExistingPosts && !publishDisabled && !hasAdNameFormulaConfigured && adName === "Ad Generated Through Blip" && !(showShopDestinationSelector && !selectedShopDestination) && !(!isCarouselAd && hasDuplicates) && !isMissingDestinationValue && !(shouldShowLeadFormSelector && !selectedForm) && (
              <div className="text-xs text-orange-700 text-left p-2 bg-orange-50 border border-orange-200 rounded-xl">
                Your ads will be named "Ad Generated Through Blip" since no ad name formula is set.{' '}
                <button
                  type="button"
                  className="underline decoration-gray-400 text-orange-900 font-medium"
                  onClick={() => document.getElementById('adName')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                >
                  Set ad name
                </button>
              </div>
            )}

          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium inline-flex items-center gap-1">
                  {renderDiffMark("launchPaused")}
                  <span>Ad Status:</span>
                </Label>

                <RadioGroup
                  value={launchPaused ? "paused" : "active"}
                  onValueChange={(value) => setLaunchPaused(value === "paused")}
                  disabled={!isLoggedIn}
                  className="flex items-center space-x-2"
                >
                  <div
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-xl transition-colors duration-150",
                      !launchPaused
                        ? "bg-green-50 border border-green-300"
                        : "border border-transparent"
                    )}
                  >
                    <RadioGroupItem
                      value="active"
                      id="statusActive"
                      className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500 [&[data-state=checked]_svg_circle]:fill-green-500"
                    />
                    <Label
                      htmlFor="statusActive"
                      className={cn(
                        "text-sm font-medium leading-none cursor-pointer",
                        !launchPaused ? "text-green-600" : "text-gray-600"
                      )}
                    >
                      Active
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-xl transition-colors duration-150",
                      launchPaused
                        ? "bg-red-50 border border-red-300"
                        : "border border-transparent"
                    )}
                  >
                    <RadioGroupItem
                      value="paused"
                      id="statusPaused"
                      className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-red-500 data-[state=checked]:text-red-500 [&[data-state=checked]_svg_circle]:fill-red-500"
                    />
                    <Label
                      htmlFor="statusPaused"
                      className={cn(
                        "text-sm font-medium leading-none cursor-pointer",
                        launchPaused ? "text-red-600" : "text-gray-600"
                      )}
                    >
                      Paused
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Schedule — pushed to the right, only for sales/app promo */}
              {campaignObjective.length > 0 &&
                campaignObjective.every(obj =>
                  ["OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(obj)
                ) && (
                  <div className="flex items-center gap-2">
                    <Popover open={showSchedule} onOpenChange={setShowSchedule}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium shadow-sm transition-colors",
                            (adScheduleStartTime || adScheduleEndTime)
                              ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {renderDiffMark(["adScheduleStartTime", "adScheduleEndTime"])}
                          {(adScheduleStartTime || adScheduleEndTime) ? "Scheduled" : "Ad Schedule"}
                        </button>
                      </PopoverTrigger>

                      <PopoverContent
                        className="w-[380px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
                        align="end"
                        sideOffset={10}
                      >
                        <div className="space-y-5">
                          <p className="text-sm font-semibold text-gray-800">Ad Schedule</p>

                          <ScheduleDateTimePicker
                            label="Start Time"
                            value={adScheduleStartTime}
                            onChange={(iso) => setAdScheduleStartTime(iso)}
                            onClear={() => setAdScheduleStartTime(null)}
                          />

                          <ScheduleDateTimePicker
                            label="End Time"
                            value={adScheduleEndTime}
                            onChange={(iso) => setAdScheduleEndTime(iso)}
                            onClear={() => setAdScheduleEndTime(null)}
                          />

                          {(adScheduleStartTime && adScheduleEndTime) &&
                            new Date(adScheduleEndTime) <= new Date(adScheduleStartTime) && (
                              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                                End time must be after start time
                              </p>
                            )}
                        </div>
                      </PopoverContent>
                    </Popover>


                  </div>
                )}
            </div>

            {/* Schedule summary — right-aligned */}
            {formatScheduleLabel() && (
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-xs text-blue-600">{formatScheduleLabel()}</p>
                <button
                  type="button"
                  onClick={() => {
                    setAdScheduleStartTime(null);
                    setAdScheduleEndTime(null);
                  }}
                  className="p-0.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Clear schedule"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>


          <div
            className={cn(
              "flex items-center space-x-2 rounded-xl transition-colors duration-150", // Base styling: padding, rounded corners, transition
            )}
          >
            <Checkbox
              id="preserveMedia"
              checked={preserveMedia}
              onCheckedChange={setPreserveMedia}
              disabled={!isLoggedIn}
              className={cn(
                "rounded-md", // Or "rounded-lg", "rounded-full"
                "focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0", // Remove focus ring
              )} // Optional: style checkbox itself when checked & paused
            />
            <Label
              htmlFor="preserveMedia"
              className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              )}
            >
              Don't clear media after publishing ads
            </Label>
          </div>


        </form>
      </CardContent>
      {showSaveNewDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ position: 'fixed', top: -20, left: 0, right: 0, bottom: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => { setShowSaveNewDialog(false); setNewTemplateNameInput(""); }}
            style={{ animation: 'templateBtnIn 0.2s ease-out forwards' }}
          />
          {/* Dialog */}
          <div
            className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-[400px] p-6 space-y-4"
            style={{ animation: 'templateBtnIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold">Save as New Template</h3>
              <p className="text-sm text-gray-500 mt-1">Give your new copy template a name.</p>
            </div>
            <Input
              value={newTemplateNameInput}
              onChange={(e) => setNewTemplateNameInput(e.target.value)}
              placeholder="e.g. Summer Sale Copy"
              className={formFieldChrome}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && !copyTemplates[newTemplateNameInput.trim()] && handleSaveAsNewTemplate()}
            />
            {copyTemplates[newTemplateNameInput.trim()] && (
              <p className="text-xs text-red-500">A template with this name already exists.</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => { setShowSaveNewDialog(false); setNewTemplateNameInput(""); }}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white rounded-xl hover:bg-blue-700 min-w-[80px]"
                disabled={!newTemplateNameInput.trim() || !!copyTemplates[newTemplateNameInput.trim()] || isSavingNew}
                onClick={handleSaveAsNewTemplate}
              >
                {isSavingNew ? (
                  <>
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                    Saving Template...
                  </>

                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {variants.length > 1 && (
        <TooltipProvider delayDuration={0}>
          <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-black bg-black px-2 py-2 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ScrollArea
              type="always"
              className={cn(
                "rounded-full",
                shouldScrollVariantPicker && "w-[34rem] max-w-[calc(100vw-9rem)] pb-2"
              )}
            >
              <div className="flex w-max items-center gap-1 pr-1">
                {variants.map((variant) => {
                  const isActive = variant.id === activeVariantId;
                  const assignedCount = countFilesForVariant(variant.id);

                  return (
                    <div key={variant.id} className="group flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => switchVariant(variant.id)}
                        className={cn(
                          "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2.5 text-sm transition",
                          isActive ? "bg-zinc-700 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <VariantDot variantId={variant.id} variants={variants} />
                        <span className="whitespace-nowrap">{variant.name}</span>
                        <span className={cn("text-xs whitespace-nowrap", isActive ? "text-white/70" : "text-white/55")}>
                          · {assignedCount} ad{assignedCount !== 1 ? "s" : ""}
                        </span>
                      </button>
                      {variant.id !== 'default' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(variant.id)}
                          className="ml-0.5 rounded-full p-1 text-white/60 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                          title="Delete variant"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex shrink-0 items-center gap-1 border-l border-white/50 pl-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add variant</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowDeleteAllVariantsDialog(true)}
                    className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete all variants</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      )}
      {showDeleteAllVariantsDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowDeleteAllVariantsDialog(false)}
          />
          <div
            className="relative w-[min(26rem,calc(100vw-2rem))] rounded-[32px] border border-gray-200 bg-white p-6 shadow-xl"
            style={{ animation: 'templateBtnIn 0.2s ease-out forwards' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Delete all variants?</h3>
              <p className="text-sm text-gray-500">
                This will remove every variant and move all assignments back to Default.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowDeleteAllVariantsDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="w-full rounded-xl"
                onClick={() => {
                  setShowDeleteAllVariantsDialog(false);
                  handleDeleteAllVariants();
                }}
              >
                Delete All Variants
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card >

  )
}
