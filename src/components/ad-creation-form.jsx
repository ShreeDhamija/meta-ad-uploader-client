"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import axios from "axios"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import TextareaAutosize from 'react-textarea-autosize'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, ChevronDown, Loader, Plus, Trash2, Upload, ChevronsUpDown, RefreshCcw, CircleX, AlertTriangle, RotateCcw, Eye, FileText, X } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/lib/AuthContext"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import ShopDestinationSelector from "@/components/shop-destination-selector"
import PostSelectorInline from "@/components/PostIDSelector"
import { MetaMediaLibraryModal } from "@/components/MetaMediaLibraryModal";
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
          console.error('Max connection retry attempts reached');
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
          console.error('Job not found after maximum attempts - job may not exist');
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
            console.warn('SSE connection timeout');
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
              if (data.status === 'complete' || data.status === 'error' || data.status === 'partial-success') {
                cleanup();
              }
            }
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
            // Don't retry on parse errors, just log them
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ SSE Error:', error);

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
        console.error('Failed to create EventSource:', error);
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
      console.error('Error fetching partnership ad partners:', err);
      setError(err.response?.data?.error || 'Failed to fetch partners');
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



export default function AdCreationForm({
  isLoading,
  setIsLoading,
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
  videoThumbs,
  setVideoThumbs,
  selectedAdSets,
  duplicateAdSet,
  campaigns,
  selectedCampaign,
  selectedAdAccount,
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
  newAdSetName,
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
  refreshAdSets,
  adNameFormulaV2,
  setAdNameFormulaV2,
  campaignObjective,
  selectedFiles,
  setSelectedFiles,
  useExistingPosts
}) {
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
  const [preserveMedia, setPreserveMedia] = useState(false);
  const [liveProgress, setLiveProgress] = useState({
    completed: 0,
    succeeded: 0,
    failed: 0,
    total: 0
  });

  // const [isCarouselAd, setIsCarouselAd] = useState(false);
  const [applyTextToAllCards, setApplyTextToAllCards] = useState(false);
  const [applyHeadlinesToAllCards, setApplyHeadlinesToAllCards] = useState(false);
  const S3_UPLOAD_THRESHOLD = 1 * 1024 * 1024; // 40 MB
  const [usePostID, setUsePostID] = useState(false);
  const [leadgenForms, setLeadgenForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loadingForms, setLoadingForms] = useState(false);


  // Partnership Ads State
  const [isPartnershipAd, setIsPartnershipAd] = useState(false);
  const [partnerIgAccountId, setPartnerIgAccountId] = useState("");
  const [partnerFbPageId, setPartnerFbPageId] = useState("");
  const [openPartnerSelector, setOpenPartnerSelector] = useState(false);
  const [partnerSearchValue, setPartnerSearchValue] = useState("");

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
      partner.creatorUsername.toLowerCase().includes(searchLower) ||
      partner.creatorIgId.includes(partnerSearchValue)
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


  const captureFormDataAsJob = () => {

    let adCount = 0;

    const isDynamicAdSet = () => {
      if (duplicateAdSet) {
        // For duplicated adset, check the original adset's dynamic flag
        const originalAdset = adSets.find((a) => a.id === duplicateAdSet);
        return originalAdset?.is_dynamic_creative || false;
      } else {
        // Check if any selected adsets are dynamic
        return selectedAdSets.some((adsetId) => {
          const adset = adSets.find((a) => a.id === adsetId);
          return adset?.is_dynamic_creative || false;
        });
      }
    };

    if (importedPosts.length > 0) {
      adCount = importedPosts.length * (selectedAdSets.length || 1);
    } else if (isCarouselAd || isDynamicAdSet()) {
      // Carousel and dynamic ads are always 1 ad per selected adset
      adCount = selectedAdSets.length || 1;
    } else if (enablePlacementCustomization && fileGroups && fileGroups.length > 0) {
      const groupedFileIds = new Set(fileGroups.flat());
      const ungroupedFiles = [...files, ...driveFiles].filter(f =>
        !groupedFileIds.has(getFileId(f))
      );
      adCount = fileGroups.length + ungroupedFiles.length;
    }
    else if (adType === 'flexible') {
      if (fileGroups.length > 0) {
        adCount = fileGroups.length * (selectedAdSets.length || 1);
      } else {
        adCount = selectedAdSets.length || 1;
      }
    }
    else {
      adCount = files.length + driveFiles.length + importedFiles.length + dropboxFiles.length;
    }


    return {
      id: uuidv4(),
      createdAt: Date.now(),
      status: 'queued',
      adCount: adCount,
      formData: {
        // Form content states
        headlines: [...headlines],
        descriptions: [...descriptions],
        messages: [...messages],
        link: [...link],
        cta,

        // File states
        files: [...files],
        driveFiles: [...driveFiles],
        dropboxFiles: [...dropboxFiles],  // ADD THIS LINE
        videoThumbs: { ...videoThumbs },
        thumbnail,
        importedPosts: [...importedPosts],
        importedFiles: [...importedFiles],  // ADD THIS



        // Selection states
        selectedAdSets: [...selectedAdSets],
        duplicateAdSet,
        newAdSetName,
        pageId,
        instagramAccountId,
        selectedAdAccount,
        selectedCampaign,

        // Ad configuration
        launchPaused,
        adType,
        isCarouselAd,
        enablePlacementCustomization,
        fileGroups: fileGroups ? [...fileGroups.map(group => [...group])] : [],

        // Shop configuration
        selectedShopDestination,
        selectedShopDestinationType,
        selectedForm,
        //partnership ads
        isPartnershipAd,
        partnerIgAccountId,
        partnerFbPageId,

        // For computing adName
        adNameFormulaV2: adNameFormulaV2 ? { ...adNameFormulaV2 } : null,
        adValues,

        // Reference data needed for processing
        adSets: [...adSets],
        adSetDisplayName: duplicateAdSet
          ? (newAdSetName || 'New Ad Set')
          : selectedAdSets.length === 1
            ? (adSets.find(a => a.id === selectedAdSets[0])?.name || 'selected ad set')
            : `${selectedAdSets.length} adsets`

      }
    };
  };

  // Add this helper function
  const uploadChunkWithRetry = async (url, chunk, fileType, partNumber, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.put(url, chunk, {
          headers: { 'Content-Type': fileType },
          timeout: 120000, // Increase to 2 min for slow connections
        });
        return response;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const isNetworkError = !error.response || error.code === 'ECONNABORTED';

        if (isLastAttempt || !isNetworkError) throw error;

        // console.log(`⚠️ Chunk ${partNumber} failed (attempt ${attempt}/${maxRetries}). Retrying...`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1))); // Exponential backoff
      }
    }
  };

  const uploadToS3 = async (file, onChunkUploaded, uniqueId, maxUploadRetries = 2) => {
    // Validate inputs
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
          { withCredentials: true }
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
          { withCredentials: true }
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
              const uploadResponse = await uploadChunkWithRetry(url, chunk, file.type, partNumber);

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
              { withCredentials: true }
            );
            break;
          } catch (error) {
            if (attempt === 5) {
              throw error;
            }
            const delay = 2000 * Math.pow(2, attempt - 1);
            // console.log(`⚠️ S3 complete-upload attempt ${attempt} failed. Retrying in ${delay}ms...`);
            // console.log(`   Error: ${error.message}`);
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
        console.error(`❌ Upload attempt ${uploadAttempt}/${maxUploadRetries} failed for ${file.name}:`, error.message);

        // Abort the current upload before retrying
        if (uploadId && s3Key) {
          // console.log(`🧹 Aborting failed upload (attempt ${uploadAttempt})...`);
          try {
            await axios.post(
              `${API_BASE_URL}/auth/s3/abort-upload`,
              { key: s3Key, uploadId: uploadId },
              { withCredentials: true }
            );
            // console.log(`✅ Successfully aborted upload for retry`);
          } catch (abortError) {
            console.error('❌ Failed to abort upload:', abortError.message);
          }
        }

        // If not the last attempt, wait before retrying
        if (uploadAttempt < maxUploadRetries) {
          const delay = 3000 * uploadAttempt;
          // console.log(`⏳ Retrying upload for ${file.name} in ${delay}ms...`);
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

  async function uploadDriveFileToS3(file, maxRetries = 3) {
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
          })
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
        // If this was the last attempt, throw the error
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

  async function uploadDropboxFileToS3(file, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/upload-from-dropbox`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: file.directLink,
            fileName: file.name,
            mimeType: file.mimeType || getMimeFromName(file.name),
            size: file.size
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
        if (attempt === maxRetries) {
          throw new Error(`Dropbox S3 upload failed after ${maxRetries} attempts: ${error.message}`);
        }
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }



  // CTA options
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
    setLiveProgress({ completed: 0, succeeded: 0, failed: 0, total: 0 });

    const jobToProcess = jobQueue[0];

    setIsProcessingQueue(true);
    setCurrentJob(jobToProcess);
    setHasStartedAnyJob(true);

    setProgress(0);
    // setMessage('Initializing...');
    setShowCompletedView(false);
    setJobId(null);

    handleCreateAd(jobToProcess).catch(err => {
      console.error("Critical error during job initialization:", err);
      const failedJob = {
        id: jobToProcess.id,
        message: `Job Failed: ${err.message || 'An initialization error occurred.'}`,
        completedAt: Date.now(),
        status: 'error'
      };
      setCompletedJobs(prev => [...prev, failedJob]);
      setJobQueue(prev => prev.slice(1));
      setCurrentJob(null);
      setIsProcessingQueue(false);
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
    if (status === 'complete' || status === 'partial-success' || status === 'error' || status === 'job-not-found') {
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
        setCompletedJobs(prev => [...prev, completedJob]);

        if (currentJob.formData.duplicateAdSet) {
          refreshAdSets();
        }
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
          selectedAdSets: currentJob.formData.selectedAdSets,      // ADD THIS
          selectedAdAccount: currentJob.formData.selectedAdAccount  // ADD THIS

        };
        setCompletedJobs(prev => [...prev, completedJob]);
        toast.warning(trackedMessage);
        if (currentJob.formData.duplicateAdSet) {
          refreshAdSets();
        }
      } else if (status === 'job-not-found') {
        // Handle retry case
        const failedJob = {
          id: currentJob.id,
          message: `Job timed out. Refresh page to try again`,
          completedAt: Date.now(),
          status: 'retry',
          jobData: currentJob
        };
        setCompletedJobs(prev => [...prev, failedJob]);
      } else {
        const failedJob = {
          id: currentJob.id,
          message: `Job Failed: ${trackedMessage || 'An unknown error occurred.'}`,
          completedAt: Date.now(),
          status: 'error'
        };
        setCompletedJobs(prev => [...prev, failedJob]);
        toast.error(`Job failed: ${trackedMessage || 'An unknown error occurred.'}`);
      }

      // The job is finished. Clean up and advance to the next one.
      setShowCompletedView(true);
      setJobQueue(prev => prev.slice(1));
      setCurrentJob(null);
      setIsProcessingQueue(false);
    }
  }, [status, isProcessingQueue, currentJob]);




  useEffect(() => {
    if (!selectedTemplate || !copyTemplates[selectedTemplate]) return;
    const tpl = copyTemplates[selectedTemplate];
    setMessages(tpl.primaryTexts || [""]);
    setHeadlines(tpl.headlines || [""]);
    setDescriptions(tpl.descriptions || [""]);
  }, [selectedTemplate, copyTemplates]);



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
        console.error("Failed to check Google auth status:", error);
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
          const selected = data.docs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            size: doc.sizeBytes,
            accessToken: token
          }));

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



  const handleImportFromFolder = useCallback(() => {
    const folderId = extractFolderId(folderLinkValue);

    if (!folderId) {
      toast.error('Invalid Google Drive folder link');
      return;
    }

    if (!googleAuthStatus.accessToken) {
      toast.error('Not authenticated with Google Drive');
      return;
    }

    createPicker(googleAuthStatus.accessToken, folderId);
  }, [folderLinkValue, googleAuthStatus.accessToken, createPicker]);

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

  // Separate function for the Chooser
  const openDropboxChooser = useCallback(() => {
    window.Dropbox.choose({
      success: async (selectedFiles) => {
        console.log('=== DROPBOX CHOOSER RAW RESPONSE ===');
        selectedFiles.forEach(f => {
          console.log(`File: ${f.name}`);
          console.log(`  id: ${f.id}`);
          console.log(`  link: ${f.link}`);
        });

        const dropboxFilesData = selectedFiles.map((file) => ({
          dropboxId: file.id,
          name: file.name,
          link: file.link,
          directLink: file.link.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '?dl=1'),
          size: file.bytes,
          // icon: file.icon,
          isDropbox: true,
          mimeType: getMimeFromName(file.name)
        }));

        setDropboxFiles(prev => [...prev, ...dropboxFilesData]);
      },
      cancel: () => {
        console.log('Dropbox picker cancelled');
      },
      linkType: 'direct',
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

    // Check if user is authenticated with Dropbox
    try {
      const statusRes = await fetch(`${API_BASE_URL}/auth/dropbox/status`, {
        credentials: 'include'
      });
      const statusData = await statusRes.json();

      if (!statusData.authenticated) {
        // Need to authenticate first
        // toast.info("Please connect your Dropbox account first");

        // Open OAuth popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          `${API_BASE_URL}/auth/dropbox?popup=true`,
          'dropbox-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Wait for OAuth to complete
        const handleMessage = (event) => {
          if (event.data?.type === 'dropbox-auth-success') {
            window.removeEventListener('message', handleMessage);
            toast.success("Dropbox connected! Opening file picker...");
            // Now open the Chooser
            openDropboxChooser();
          } else if (event.data?.type === 'dropbox-auth-error') {
            window.removeEventListener('message', handleMessage);
            toast.error("Failed to connect Dropbox");
          }
        };

        window.addEventListener('message', handleMessage);
        return;
      }

      // Already authenticated, open Chooser directly
      openDropboxChooser();

    } catch (error) {
      console.error('Error checking Dropbox auth:', error);
      toast.error("Failed to check Dropbox connection");
    }
  }, []);



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
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?fields=videoMediaMetadata`, {
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

  // Rename to be more accurate - this is ONLY for Drive
  const getDriveVideoThumbnail = (driveFile) => {
    if (!isVideoFile(driveFile) || !driveFile.isDrive) return null;
    return `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w400-h300`;
  };

  // Track processing state, not processed files
  const processingRef = useRef(new Set());



  useEffect(() => {
    const abortController = new AbortController();

    const processThumbnails = async () => {
      // --- 1. LOCAL FILES (No changes) ---
      const videoFiles = files.filter(file => {
        const fileId = getFileId(file);
        return isVideoFile(file) &&
          !file.isDrive &&
          !file.isDropbox &&
          !videoThumbs[fileId] &&
          !processingRef.current.has(fileId);
      });

      if (videoFiles.length > 0) {
        videoFiles.forEach(file => processingRef.current.add(getFileId(file)));

        const MAX_CONCURRENT = 2;
        const queue = [...videoFiles];
        let completed = 0;

        const processNext = async () => {
          if (queue.length === 0 || abortController.signal.aborted) return;
          const file = queue.shift();
          const fileId = getFileId(file);

          try {
            const thumb = await generateThumbnail(file);
            if (!abortController.signal.aborted) {
              setVideoThumbs(prev => ({ ...prev, [fileId]: thumb }));
              completed++;
            }
          } catch (err) {
            console.error(`Thumbnail error for ${file.name}:`, err);
            if (!abortController.signal.aborted) {
              setVideoThumbs(prev => ({
                ...prev,
                [fileId]: "https://api.withblip.com/thumbnail.jpg"
              }));
              completed++;
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

      // --- 2. GOOGLE DRIVE (No changes) ---
      const driveThumbs = {};
      driveFiles.forEach(file => {
        const fileId = getFileId(file);
        if (isVideoFile(file) && !videoThumbs[fileId]) {
          const thumb = getDriveVideoThumbnail(file);
          if (thumb) driveThumbs[fileId] = thumb;
        }
      });
      if (Object.keys(driveThumbs).length > 0) {
        setVideoThumbs(prev => ({ ...prev, ...driveThumbs }));
      }

      // --- 3. DROPBOX (UPDATED: BATCH PROCESSING) ---
      const dropboxVideoFiles = dropboxFiles.filter(file => {
        const fileId = getFileId(file);
        // Ensure we have a dropboxId to send to the API
        return isVideoFile(file) &&
          !videoThumbs[fileId] &&
          !processingRef.current.has(fileId);
      });

      if (dropboxVideoFiles.length > 0 && !abortController.signal.aborted) {
        // Mark all as processing immediately so UI shows loading
        dropboxVideoFiles.forEach(file => processingRef.current.add(getFileId(file)));
        setVideoThumbs(prev => ({ ...prev })); // Force re-render

        // Dropbox allows max 25 items per batch request
        const BATCH_SIZE = 25;

        for (let i = 0; i < dropboxVideoFiles.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) break;

          const batch = dropboxVideoFiles.slice(i, i + BATCH_SIZE);
          // Important: Send the actual dropboxId, not the generic fileId
          const filesData = batch.map(f => ({
            id: f.dropboxId,
            link: f.link  // Include the original Dropbox link
          }));

          console.log('Files data:', JSON.stringify(filesData, null, 2));

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

              // Map the returned Dropbox IDs back to your generic file IDs if necessary
              // Assuming getFileId(file) might return something different than file.dropboxId
              const newThumbs = {};

              batch.forEach(file => {
                const dId = file.dropboxId;
                const genericId = getFileId(file);

                if (data.thumbnails && data.thumbnails[dId]) {
                  newThumbs[genericId] = data.thumbnails[dId];
                } else {
                  // Fallback for failed specific items in the batch
                  newThumbs[genericId] = "https://api.withblip.com/thumbnail.jpg";
                }
              });

              setVideoThumbs(prev => ({ ...prev, ...newThumbs }));
            }
          } catch (error) {
            console.error("Dropbox batch error:", error);
            // On batch failure, set placeholders for this batch
            const failedThumbs = {};
            batch.forEach(f => {
              failedThumbs[getFileId(f)] = "https://api.withblip.com/thumbnail.jpg";
            });
            setVideoThumbs(prev => ({ ...prev, ...failedThumbs }));
          } finally {
            // Cleanup processing state for this batch
            batch.forEach(f => processingRef.current.delete(getFileId(f)));
          }
        }
      }
    };

    processThumbnails();

    return () => {
      abortController.abort();
      processingRef.current.clear();
    };
  }, [files, driveFiles, dropboxFiles, videoThumbs, generateThumbnail, getDriveVideoThumbnail, setVideoThumbs]);

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



  const computeAdNameFromFormula = useCallback((file, iterationIndex = 0, link = "", formula = null, adType = "") => {

    if (!adNameFormulaV2?.rawInput) {
      // Fallback to old computation if no V2 formula
      return computeAdName(file, adValues.dateType, iterationIndex);
    }

    const formulaToUse = formula || adNameFormulaV2;
    if (!formulaToUse?.rawInput) {
      // Fallback to old computation if no V2 formula
      return computeAdName(file, adValues.dateType, iterationIndex);
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthAbbrev = monthNames[now.getMonth()];
    const date = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    const monthYear = `${monthAbbrev}${year}`;
    const monthDayYear = `${monthAbbrev}${date}${year}`;

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
        // Remove protocol and get the path
        const urlWithoutProtocol = link.replace(/^https?:\/\//, "");
        const lastSlashIndex = urlWithoutProtocol.lastIndexOf("/");

        // If there's a slash and something after it
        if (lastSlashIndex > 0 && lastSlashIndex < urlWithoutProtocol.length - 1) {
          urlSlug = urlWithoutProtocol.substring(lastSlashIndex + 1);
        }
      } catch (e) {
        // If URL parsing fails, keep urlSlug as empty string
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
      }
      catch (e) {
        adTypeLabel = "";
      }
    }

    // Replace variables in the formula
    let adName = formulaToUse.rawInput
      .replace(/\{\{File Name\}\}/g, fileName)
      .replace(/\{\{File Type\}\}/g, fileType)
      .replace(/\{\{Date \(MonthYYYY\)\}\}/g, monthYear)
      .replace(/\{\{Date \(MonthDDYYYY\)\}\}/g, monthDayYear)
      .replace(/\{\{Iteration\}\}/g, String(iterationIndex + 1).padStart(2, "0"))
      .replace(/\{\{URL Slug\}\}/g, urlSlug)
      .replace(/\{\{Ad Type\}\}/g, adTypeLabel);

    return adName.trim() || "Ad Generated Through Blip";
  }, [adNameFormulaV2]);


  useEffect(() => {
    const adName = computeAdNameFromFormula(null);
    setAdName(adName);
  }, [adNameFormulaV2, computeAdNameFromFormula]);


  useEffect(() => {
    if (isCarouselAd) {
      const fileCount = files.length + driveFiles.length + dropboxFiles.length + importedFiles.length;

      // Sync messages when apply-to-all is checked
      if (applyTextToAllCards && fileCount > 0 && messages.length !== fileCount) {
        const firstMessage = messages[0] || "";
        setMessages(new Array(fileCount).fill(firstMessage));
      }

      // Sync headlines when apply-to-all is checked
      if (applyHeadlinesToAllCards && fileCount > 0 && headlines.length !== fileCount) {
        const firstHeadline = headlines[0] || "";
        setHeadlines(new Array(fileCount).fill(firstHeadline));
      }
    }
  }, [files.length, driveFiles.length, dropboxFiles.length, importedFiles.length, isCarouselAd, applyTextToAllCards, applyHeadlinesToAllCards]);


  const duplicateAdSetRequest = async (adSetId, campaignId, adAccountId) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/duplicate-adset`,
      { adSetId, campaignId, adAccountId, newAdSetName },
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


  const showShopDestinationSelector = hasShopAutomaticAdSets && pageId;


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




  const handleCreateAd = async (jobData) => {

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

      // Other
      adValues,
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

    if (files.length === 0 && driveFiles.length === 0 && dropboxFiles.length === 0 && importedPosts.length === 0 && importedFiles.length === 0) {
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
        uploadedChunks += 1;
        const percent = Math.round((uploadedChunks / totalChunksAllFiles) * 100);
        setProgress(percent);
        setProgressMessage("Uploading files for processing...");
      };

      const uploadPromises = largeFiles.map(file =>
        limit(() => uploadToS3(file, updateOverallProgress, getFileId(file))) // <-- Pass the ID here

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
          toast.error(`Failed to upload ${largeFiles[index].name} due to weak network connection. Reload page to try again`);
          console.error(`❌ Failed to upload ${largeFiles[index].name}:`, result.reason);
        }
      });

      // Upload Drive files with concurrency control
      const driveUploadPromises = largeDriveFiles.map(file =>
        limit(() => uploadDriveFileToS3(file)) // Your existing function unchanged
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
          toast.error(`Failed to upload Drive video: ${largeDriveFiles[index].name}`);
          console.error("❌ Drive to S3 upload failed", result.reason);
        }
      });

      // Upload Dropbox files with concurrency control
      const dropboxUploadPromises = largeDropboxFiles.map(file =>
        limit(() => uploadDropboxFileToS3(file))
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
          toast.error(`Failed to upload Dropbox video: ${largeDropboxFiles[index].name}`);
          console.error("❌ Dropbox to S3 upload failed", result.reason);
        }
      });

      setProgress(100);
      setProgressMessage('File upload complete! Creating ads...');
      // toast.success("Video files uploaded!");
    }

    // 🔧 NOW start the actual job (50-100% progress)
    const frontendJobId = uuidv4();
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
        const newAdSetId = await duplicateAdSetRequest(duplicateAdSet, selectedCampaign[0], selectedAdAccount, newAdSetName.trim());
        finalAdSetIds = [newAdSetId];
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

    // Add flexible ads validation
    if (adType === 'flexible') {
      const totalFiles = files.length + driveFiles.length + dropboxFiles.length + (importedFiles?.length || 0);
      console.log('File counts:', {
        files: files.length,
        driveFiles: driveFiles.length,
        s3Results: s3Results.length,
        s3DriveResults: s3DriveResults.length,
        importedFiles: importedFiles?.length || 0,
        totalFiles
      });

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
        cta,
        launchPaused,
        jobId,
        selectedForm,
        isPartnershipAd,
        partnerIgAccountId,
        partnerFbPageId
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
      formData.append("link", linkJSON);
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

      }
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
     * Append carousel-specific fields and files
     */
    const appendCarouselFields = (
      formData,
      {
        isCarouselAd,
        fileOrder,
        files,
        driveFiles,
        dropboxFiles,           // ADD
        s3Results,
        s3DriveResults,
        s3DropboxResults,       // ADD
        S3_UPLOAD_THRESHOLD,
        smallDriveFiles,
        smallDropboxFiles,      // ADD
        importedFiles
      }
    ) => {
      formData.append("isCarouselAd", isCarouselAd);
      formData.append("enablePlacementCustomization", false);
      formData.append("fileOrder", JSON.stringify(fileOrder));

      // Add S3 URLs for large files (including Dropbox)
      [...s3Results, ...s3DriveResults, ...s3DropboxResults].forEach((s3File) => {
        formData.append("s3VideoUrls", s3File.s3Url);
        formData.append("s3VideoNames", s3File.name);  // Note: was "s3VideoName" - should be "s3VideoNames" for consistency
      });

      // Add small Drive files
      smallDriveFiles.forEach((driveFile) => {
        formData.append("driveFiles", JSON.stringify({
          id: driveFile.id,
          name: driveFile.name,
          mimeType: driveFile.mimeType,
          accessToken: driveFile.accessToken
        }));
      });

      // ADD: Small Dropbox files
      smallDropboxFiles.forEach((dropboxFile) => {
        formData.append("dropboxFiles", JSON.stringify({
          dropboxId: dropboxFile.dropboxId,
          name: dropboxFile.name,
          directLink: dropboxFile.directLink,
          mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name)
        }));
      });

      // Meta library files
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




    const createAdApiCall = async (formData, API_BASE_URL) => {
      const maxRetries = 5;
      const baseDelay = 1000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          });

          return response;

        } catch (error) {

          if (error.response && error.response.status === 400) {
            console.error('Create Ad Logic Error received (not retrying):', error.response.data);
            throw error;
          }

          if (attempt === maxRetries - 1) {
            console.error(`Failed after ${maxRetries} attempts:`, error.message);
            throw error;
          }

          console.warn(`Attempt ${attempt + 1} failed, retrying... (${error.message})`);

          const delay = baseDelay * Math.pow(1.5, attempt) + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };


    try {
      const promises = [];
      const promiseMetadata = []; // ADD THIS

      // Pre-compute common JSON strings and values
      const commonPrecomputed = preComputeCommonValues(headlines, descriptions, messages, link);
      let globalFileIndex = 0;

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

            promises.push(createAdApiCall(formData, API_BASE_URL));
            promiseMetadata.push({ fileName: post.ad_name });
          });
        });

      }

      if (isCarouselAd && dynamicAdSetIds.length === 0) {
        if (selectedAdSets.length === 0 && !duplicateAdSet) {
          toast.error("Please select at least one ad set for carousel");
          return;
        }

        // Pre-compute file order once for carousel
        const carouselFileOrder = buildCarouselFileOrder(
          files,
          driveFiles,
          dropboxFiles,      // ADD
          s3Results,
          s3DriveResults,
          s3DropboxResults,  // ADD
          S3_UPLOAD_THRESHOLD,
          importedFiles
        );


        // Pre-compute ad name for carousel
        const carouselAdName = computeAdNameFromFormula(
          files[0] || driveFiles[0] || dropboxFiles[0] || (importedFiles?.[0] ? { name: importedFiles[0].name } : null),  // ADD dropboxFiles[0]
          0,
          link[0],
          jobData.formData.adNameFormulaV2,
          adType
        );

        // For carousel, process each selected ad set separately
        nonDynamicAdSetIds.forEach((adSetId) => {
          const formData = new FormData();

          // Append common fields
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
            cta,
            launchPaused,
            jobId: frontendJobId,
            selectedForm,
            isPartnershipAd,
            partnerIgAccountId,
            partnerFbPageId
          });

          // Append carousel-specific fields
          appendCarouselFields(formData, {
            isCarouselAd,
            fileOrder: carouselFileOrder,
            files,
            driveFiles,
            dropboxFiles,           // ADD
            s3Results,
            s3DriveResults,
            s3DropboxResults,       // ADD
            S3_UPLOAD_THRESHOLD,
            smallDriveFiles,
            smallDropboxFiles,      // ADD
            importedFiles
          });

          // Append shop destination
          appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

          // Add media files to formData
          files.forEach((file) => {
            if (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD) {
              formData.append("mediaFiles", file);
            }
          });

          driveFiles.forEach((driveFile) => {
            if (!isVideoFile(driveFile) || driveFile.size <= S3_UPLOAD_THRESHOLD) {
              formData.append("driveFiles", JSON.stringify({
                id: driveFile.id,
                name: driveFile.name,
                mimeType: driveFile.mimeType,
                accessToken: driveFile.accessToken
              }));
            }
          });
          promises.push(createAdApiCall(formData, API_BASE_URL));
          promiseMetadata.push(null); // ADD - keeps array indices aligned

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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
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
              promises.push(createAdApiCall(formData, API_BASE_URL));
              globalFileIndex++;
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
              cta,
              launchPaused,
              jobId: frontendJobId,
              selectedForm,
              isPartnershipAd,
              partnerIgAccountId,
              partnerFbPageId
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
            promises.push(createAdApiCall(formData, API_BASE_URL));
            promiseMetadata.push(null); // ADD - keeps array indices aligned

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
            cta,
            launchPaused,
            jobId: frontendJobId,
            selectedForm,
            isPartnershipAd,
            partnerIgAccountId,
            partnerFbPageId
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
          promises.push(createAdApiCall(formData, API_BASE_URL));
          promiseMetadata.push(null); // ADD - keeps array indices aligned

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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
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
              promises.push(createAdApiCall(formData, API_BASE_URL));
              promiseMetadata.push({ fileName: groupedAdNames[groupIndex] }); // ADD
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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
              });

              // Append single image file
              appendSingleImageFile(formData, { file, thumbnail });

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);
              promises.push(createAdApiCall(formData, API_BASE_URL));
              promiseMetadata.push({ fileName: file.name }); // ADD

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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
              });

              // Append single drive file
              appendSingleDriveFile(formData, driveFile);

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              promises.push(createAdApiCall(formData, API_BASE_URL));
              promiseMetadata.push({ fileName: driveFile.name }); // ADD

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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
              });

              appendSingleDropboxFile(formData, dropboxFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              promises.push(createAdApiCall(formData, API_BASE_URL));
              promiseMetadata.push({ fileName: dropboxFile.name });
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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
              });

              // Append single S3 file
              appendSingleS3File(formData, s3File);

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              promises.push(createAdApiCall(formData, API_BASE_URL));
              promiseMetadata.push({ fileName: s3File.name || s3File.originalName || 'S3 Video' }); // ADD

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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
              });

              appendMetaImageFile(formData, metaFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              promises.push(createAdApiCall(formData, API_BASE_URL));
              promiseMetadata.push({ fileName: metaFile.name });
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
                cta,
                launchPaused,
                jobId: frontendJobId,
                selectedForm,
                isPartnershipAd,
                partnerIgAccountId,
                partnerFbPageId
              });

              appendMetaVideoFile(formData, metaFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              promises.push(createAdApiCall(formData, API_BASE_URL));
              promiseMetadata.push({ fileName: metaFile.name });
            });


          }
        });
      }


      if (promises.length === 0) {
        setIsLoading(false);
        throw new Error("Form data failed to compile. You ran into our sneakiest bug. We're trying to fix it.");
      }


      setLiveProgress({ completed: 0, succeeded: 0, failed: 0, total: promises.length });

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
              // 1. Update Live Counter
              setLiveProgress(prev => ({
                ...prev,
                completed: prev.completed + 1,
                failed: prev.failed + 1
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

        if (failureCount > 0 && successCount > 0) {
          jobStatus = 'partial-success';
          jobMessage = `${successCount} of ${totalCount} ads created. ${failureCount} failed.`;
        }
        else if (failureCount === totalCount) {
          jobStatus = 'error';
          const firstError = responses.find(r => r.status === 'rejected');

          // Extract fbErrorMsg from response
          let errorMsg = 'Unknown error';
          if (firstError?.reason?.response?.data?.error) {
            errorMsg = firstError.reason.response.data.error; // This is fbErrorMsg
          } else if (firstError?.reason?.response?.data) {
            errorMsg = firstError.reason.response.data;
          } else if (firstError?.reason?.message) {
            errorMsg = firstError.reason.message;
          }

          jobMessage = `${errorMsg}`;
        }

        try {
          await axios.post(`${API_BASE_URL}/auth/complete-job`, {
            jobId: frontendJobId,
            status: jobStatus,
            message: jobMessage,
            successCount,      // ADD
            failureCount,      // ADD
            totalCount,
            errorMessages,
            selectedAdSets,      // ADD - from formData destructure
            selectedAdAccount    //

          }, {
            withCredentials: true,
            timeout: 5000
          });
        } catch (completeError) {
          console.warn("Failed to update progress tracker");
        }

      } catch (error) {
        console.error("Unexpected error:", error);
      }

    } catch (error) {
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
    }
  }

  const handleQueueJob = (e) => {
    e.preventDefault();

    // Validation (keep your existing validation)
    if (selectedAdSets.length === 0 && !duplicateAdSet) {
      toast.error("Please select at least one ad set");
      return;
    }

    if (files.length === 0 && driveFiles.length === 0 && dropboxFiles.length === 0 && importedPosts.length === 0 && importedFiles.length === 0) {
      toast.error("Please upload at least one file or import from Drive");
      return;
    }

    // Capture current form state as a job
    const newJob = captureFormDataAsJob();
    // Add to queue
    setJobQueue(prev => [...prev, newJob]);

    // Clear form immediately
    if (!preserveMedia) {
      setFiles([]);
      setDriveFiles([]);
      setDropboxFiles([]);  // ADD THIS LINE
      setVideoThumbs({});
      setThumbnail(null);
      setFileGroups([]);
      setEnablePlacementCustomization(false);
      setImportedPosts([]);  // ADD THIS
      setImportedFiles([]);

    }


  };


  return (
    <Card className=" !bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-md rounded-2xl">
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
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {job.status === 'error' ? (
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
                            className={`text-sm break-words ${job.status === 'error'
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

                          {job.status === 'retry' && (
                            <span className="block text-xs text-orange-500 mt-1">
                              Reload page to try again.
                            </span>
                          )}
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
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
                                const url = `https://adsmanager.facebook.com/adsmanager/manage/adsets/edit/standalone?act=${job.selectedAdAccount}&selected_adset_ids=${job.selectedAdSets[0]}`;
                                window.open(url, '_blank');
                              }}
                              className="text-gray-500 hover:text-blue-500 transition-colors"
                              title="View in Ads Manager"
                            >
                              <Eye className="w-4 h-4" />
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
                      {job.status === 'partial-success' && job.errorMessages?.length > 0 && (
                        <div className="mt-2 ml-9">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-[#FF0000]">
                              View error details
                            </summary>
                            <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[#FF0000]">
                              {(() => {
                                const errorGroups = job.errorMessages.reduce((acc, item) => {
                                  const key = item.error;
                                  if (!acc[key]) {
                                    acc[key] = { error: item.error, fileNames: [] };
                                  }
                                  if (item.fileName) {
                                    acc[key].fileNames.push(item.fileName);
                                  }
                                  return acc;
                                }, {});

                                return Object.values(errorGroups).map((group, idx) => (
                                  <li key={idx} className="break-words">
                                    {group.fileNames.length > 0 && (
                                      <span className="font-medium">{group.fileNames.join(', ')}: </span>
                                    )}
                                    {group.error}
                                    {group.fileNames.length === 0 && job.errorMessages.filter(e => e.error === group.error).length > 1 && (
                                      <span className="ml-1 text-red-500 font-medium">
                                        (×{job.errorMessages.filter(e => e.error === group.error).length})
                                      </span>
                                    )}
                                  </li>
                                ));
                              })()}
                            </ul>
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
                        Posting {currentJob.adCount} Ad{currentJob.adCount !== 1 ? 's' : ''} to {currentJob.formData.adSetDisplayName}
                      </p>
                      <span className="text-sm font-semibold text-gray-900">{Math.round(progress || trackedProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress || trackedProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">{progressMessage || trackedMessage}</p>
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
                )}

                {/* Queued Jobs */}
                {jobQueue.slice(currentJob ? 1 : 0).map((job, index) => (
                  <div key={job.id || index} className="p-3.5 border-b border-gray-100 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <QueueIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                    <p className="flex-1 text-sm text-gray-600">
                      Queued {job.adCount} ad{job.adCount !== 1 ? 's' : ''} to {job.formData.adSetDisplayName}
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
          <div className="flex items-center space-x-2">
            <Label htmlFor="ad-type" className="text-sm whitespace-nowrap">
              Ad Type:
            </Label>
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
              disabled={!isLoggedIn}
            >
              <SelectTrigger className="w-[180px] bg-white border-gray-400 rounded-xl font-medium">
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
          </div>
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
                />
              </div>

            ) : (
              // Show regular form content when toggle is OFF
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
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
                          className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
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
                        <Command filter={() => 1} loop={false} defaultValue={pageId}>
                          <CommandInput
                            placeholder="Search pages..."
                            value={pageSearchValue}
                            onValueChange={setPageSearchValue}
                          />
                          <CommandEmpty>No page found.</CommandEmpty>
                          <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
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
                                      "px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                      "data-[selected=true]:bg-gray-100",
                                      pageId === page.id && "bg-gray-100 rounded-xl font-semibold",
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
                      <InstagramIcon className="w-4 h-4" />
                      Select Instagram Account
                    </Label>
                    <Popover open={openInstagram} onOpenChange={setOpenInstagram}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openInstagram}
                          className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
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
                            placeholder="Search Instagram usernames..."
                            value={instagramSearchValue}
                            onValueChange={setInstagramSearchValue}
                          />
                          <CommandEmpty>No Instagram accounts found.</CommandEmpty>
                          <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
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
                                    "px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
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
                          Create Partnership Ad
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
                          Select an Instagram account first to enable partnership ads
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
                              <InstagramIcon className="w-4 h-4" />
                              Partner Instagram Account
                            </Label>
                            <Popover open={openPartnerSelector} onOpenChange={setOpenPartnerSelector}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openPartnerSelector}
                                  className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
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
                                            <span>@{partner.creatorUsername}</span>
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

                <div className="space-y-1">
                  <Label htmlFor="adName" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
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
                  <Label className="text-gray-500 text-[12px] leading-5 font-normal block">
                    Type
                    <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-sm text-black">
                      /
                    </span>
                    to see list of variables you can use. You can also save custom text.
                  </Label>

                  <ReorderAdNameParts
                    formulaInput={adNameFormulaV2?.rawInput || ""}
                    onFormulaChange={(newRawInput) => {
                      setAdNameFormulaV2({ rawInput: newRawInput });
                    }}
                    variant="home"
                  />
                  <div className="mt-1">
                    <Label className="text-xs text-gray-500">
                      Ad Name Preview: {
                        (files.length > 0 || driveFiles.length > 0)
                          ? computeAdNameFromFormula(files[0] || driveFiles[0], 0, link[0], null, adType)
                          : "Upload a file to see example"
                      }
                    </Label>
                  </div>
                </div>




                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="flex items-center gap-2 mb-0">
                        <TemplateIcon className="w-4 h-4" />
                        {Object.keys(copyTemplates).length === 0
                          ? "Select a Copy Template"
                          : "Select a Copy Template"}
                      </Label>
                      {Object.keys(copyTemplates).length === 0 && (<Button
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
                    </div>

                    <Select
                      value={selectedTemplate}
                      onValueChange={setSelectedTemplate}
                      disabled={Object.keys(copyTemplates).length === 0}
                    >
                      <SelectTrigger
                        className="border border-gray-400 rounded-xl bg-white shadow"
                        disabled={Object.keys(copyTemplates).length === 0}
                      >
                        <SelectValue
                          placeholder={
                            Object.keys(copyTemplates).length === 0
                              ? "No templates available for selected ad account"
                              : "Choose a Template"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-white shadow-lg rounded-xl max-h-full p-0 pr-2">
                        {Object.entries(copyTemplates)
                          .sort(([a], [b]) => {
                            if (a === defaultTemplateName) return -1;
                            if (b === defaultTemplateName) return 1;
                            return a.localeCompare(b);
                          })
                          .map(([templateName]) => (
                            <SelectItem
                              key={templateName}
                              value={templateName}
                              className="text-sm px-4 py-2 rounded-xl hover:bg-gray-100"
                            >
                              {templateName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>


                  <div className="space-y-2">
                    {/* Primary text Section */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>
                          Primary Text
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
                                  const fileCount = files.length + driveFiles.length + importedFiles.length;
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
                            <TextareaAutosize
                              value={value}
                              onChange={(e) => {
                                if (isCarouselAd && applyTextToAllCards) {
                                  // Update all positions with the same value
                                  setMessages(new Array(messages.length).fill(e.target.value));
                                } else {
                                  updateField(setMessages, messages, index, e.target.value);
                                }
                              }}
                              placeholder={isCarouselAd ? `Text for card ${index + 1}` : "Add text option"}
                              disabled={!isLoggedIn}
                              minRows={2}
                              maxRows={10}
                              className="border border-gray-300 rounded-xl bg-white shadow w-full px-3 py-2 text-sm resize-none focus:outline-none"
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#c7c7c7 transparent'
                              }}
                            />
                            {messages.length > 1 && !(isCarouselAd && applyTextToAllCards) && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="border border-gray-400 rounded-xl bg-white shadow-sm"
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
                        {messages.length < (isCarouselAd ? 10 : 5) && (
                          <Button
                            type="button"
                            size="sm"
                            className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                            onClick={() => addField(setMessages, messages)}
                          >
                            <Plus className="mr-2 h-4 w-4 text-white" />
                            {isCarouselAd ? 'Add card text' : 'Add text option'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Headlines Section */}
                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span>
                        Headlines
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
                                const fileCount = files.length + driveFiles.length + importedFiles.length; // ← Use file count!
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
                            className="border border-gray-300 rounded-xl bg-white shadow w-full px-3 py-2 text-sm resize-none focus:outline-none"
                            style={{
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#c7c7c7 transparent'
                            }}
                            placeholder={isCarouselAd ? `Headline for card ${index + 1}` : "Enter headline"}
                            disabled={!isLoggedIn}
                          />
                          {headlines.length > 1 && !(isCarouselAd && applyHeadlinesToAllCards) && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="border border-gray-400 rounded-xl bg-white shadow-sm"
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
                      {headlines.length < (isCarouselAd ? 10 : 5) && (
                        <Button
                          type="button"
                          size="sm"
                          className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                          onClick={() => addField(setHeadlines, headlines)}
                        >
                          <Plus className="mr-2 h-4 w-4 text-white" />
                          {isCarouselAd ? 'Add card headline' : 'Add headline option'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Descriptions Section - only show if template has descriptions */}

                  {descriptions.some(d => d.trim()) && (
                    <div className="space-y-2">
                      <Label>Descriptions</Label>
                      <div className="space-y-3">
                        {descriptions.map((value, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <TextareaAutosize
                              value={value}
                              onChange={(e) => updateField(setDescriptions, descriptions, index, e.target.value)}
                              minRows={1}
                              maxRows={10}
                              className="border border-gray-300 rounded-xl bg-white shadow w-full px-3 py-2 text-sm resize-none focus:outline-none"
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#c7c7c7 transparent'
                              }}
                              placeholder="Enter description"
                              disabled={!isLoggedIn}
                            />
                            {descriptions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="border border-gray-400 rounded-xl bg-white shadow-sm"
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
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Link (URL)
                      </span>
                      {isCarouselAd && (
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
                      Your UTMs will be auto applied from Preferences
                    </p>

                    {!isCarouselAd || link.length === 1 ? (
                      // Single link mode (normal ads or carousel with "apply to all")
                      <div className="space-y-3">
                        {!showCustomLink && availableLinks.length > 0 && (
                          <Select
                            value={link[0] || ""}
                            onValueChange={(value) => setLink([value])}
                            disabled={!isLoggedIn || availableLinks.length === 0}
                          >
                            <SelectTrigger className="border border-gray-400 rounded-xl bg-white shadow w-full">
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
                                  className="w-full border border-gray-400 rounded-xl bg-white shadow"
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
                                <SelectTrigger className="border border-gray-400 rounded-xl bg-white shadow">
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
                                className="border border-gray-400 rounded-xl bg-white shadow"
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
                      <CTAIcon className="w-4 h-4" />
                      Call-to-Action (CTA)
                    </Label>
                    <Select disabled={!isLoggedIn} value={cta} onValueChange={setCta}>
                      <SelectTrigger id="cta" className="border border-gray-400 rounded-xl bg-white shadow">
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
                    isVisible={showShopDestinationSelector}
                  />
                </div>

                {shouldShowLeadFormSelector && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="leadgen-form" className="flex items-center gap-2">
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
                            console.error('Error fetching leadgen forms:', error);
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
                      <SelectTrigger id="leadgen-form" className="border border-gray-400 rounded-xl bg-white shadow">
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
                    />
                  </div>
                  <div
                    {...getRootProps()}
                    className={`group cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
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
                      className="w-full bg-zinc-800 border border-gray-300 hover:bg-blue-700 text-white rounded-xl h-[48px] flex items-center justify-center gap-2"
                    >
                      <img
                        src="https://api.withblip.com/googledrive.png"
                        alt="Drive Icon"
                        className="h-4 w-4"
                      />
                      Choose Files from Google Drive
                    </Button>

                    <div className="text-xs text-gray-500 text-left mt-0.5">
                      Google Drive & Dropbox files upload 5X faster
                    </div>
                  </div>

                  {/* Dropbox */}
                  <div className="flex-1">
                    <Button
                      type="button"
                      onClick={handleDropboxClick}
                      className="w-full bg-zinc-800 border border-gray-300 hover:bg-blue-700 text-white rounded-xl h-[48px] flex items-center justify-center gap-2"
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
                          className="flex-1"

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
              className="w-full h-12 bg-neutral-950 hover:bg-blue-700 text-white rounded-xl"
              disabled={
                !isLoggedIn ||
                (selectedAdSets.length === 0 && !duplicateAdSet) ||
                (files.length === 0 && driveFiles.length === 0 && dropboxFiles.length === 0 && importedPosts.length === 0 && importedFiles.length === 0) ||
                (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === "")) ||
                (adType === 'carousel' && (files.length + driveFiles.length + importedFiles.length + dropboxFiles.length) < 2) ||
                (adType === 'flexible' && fileGroups.length === 0 && (files.length + driveFiles.length + importedFiles.length + dropboxFiles.length) > 10) ||
                (showShopDestinationSelector && !selectedShopDestination) ||
                ((importedPosts.length === 0) && !showCustomLink && !link[0]) ||
                ((importedPosts.length === 0) && showCustomLink && !customLink.trim()) ||
                (selectedFiles.size > 0) ||
                (shouldShowLeadFormSelector && !selectedForm)

              }
            >
              Publish Ads
            </Button>

            {/* Validation message */}
            {showShopDestinationSelector && !selectedShopDestination && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Please select a shop destination
              </div>
            )}
            {/* Validation message for Carousel Ads */}
            {isCarouselAd && (files.length + driveFiles.length + dropboxFiles.length) > 0 && (files.length + driveFiles.length + dropboxFiles.length) < 2 && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Carousel ads require at least 2 files. You have {files.length + driveFiles.length + dropboxFiles.length}.
              </div>
            )}

            {/* Validation message for missing link */}
            {((!showCustomLink && !link[0]) || (showCustomLink && !customLink.trim())) && (importedPosts.length === 0) && (!useExistingPosts) && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Please provide a link URL
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

          </div>

          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Ad Status:</Label>

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
    </Card >
  )
}


