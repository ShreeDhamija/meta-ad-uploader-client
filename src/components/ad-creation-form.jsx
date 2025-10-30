"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import axios from "axios"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TextareaAutosize from 'react-textarea-autosize'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, Loader, Plus, Trash2, Upload, ChevronsUpDown, RefreshCcw, CircleX, AlertTriangle, RotateCcw } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/lib/AuthContext"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import ShopDestinationSelector from "@/components/shop-destination-selector"
import { v4 as uuidv4 } from 'uuid';
import ConfigIcon from '@/assets/icons/plus.svg?react';
import FacebookIcon from '@/assets/icons/fb.svg?react';
import InstagramIcon from '@/assets/icons/ig.svg?react';
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

      console.log(`⏳ ${reason} - Retrying connection in ${delay}ms... (attempt ${retryCount})`);


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

      // console.log(`⏳ Job not found - Retrying in ${delay}ms... (attempt ${jobNotFoundCount}/${maxJobNotFoundRetries})`);

      retryTimeoutId = setTimeout(() => {
        if (isSubscribed) connectSSE();
      }, delay);
    };

    const connectSSE = () => {
      if (!isSubscribed) return;

      try {
        console.log(`🔌 SSE connecting to job: ${jobId} (connection attempt ${retryCount + 1}, job search attempt ${jobNotFoundCount + 1})`);

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
          console.log('✅ SSE connected successfully');
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
              console.log(`📋 Job not found yet (${jobNotFoundCount + 1}/${maxJobNotFoundRetries}), server is working...`);

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
              console.log('✅ Job found! Receiving progress updates');
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
                console.log('🏁 Job finished, closing SSE');
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
  if (file.isDrive) return file; // Drive already has unique id
  if (file.uniqueId) return file; // already tagged
  file.uniqueId = `${file.name}-${file.lastModified || Date.now()}-${uuidv4()}`;
  return file;
}

// ADD THIS NEW FUNCTION:
const getFileId = (file) => {
  return file.isDrive ? file.id : (file.uniqueId || file.name);
};

const isVideoFile = (file) => {
  if (!file) return false;
  const type = file.type || file.mimeType || "";
  if (type.startsWith("video/") || type === "video/quicktime") return true;

  const name = file.name || file.originalname || "";
  return /\.(mov|mp4|avi|webm|mkv|m4v)$/i.test(name);
};

const getExtensionFromMime = (mime = "") => {
  if (mime === "video/quicktime") return ".mov";
  if (mime.startsWith("video/")) return ".mp4";
  if (mime.startsWith("image/")) return ".jpg";
  return "";
};



const extractFolderId = (url) => {
  const idMatch = url.match(/[-\w]{25,}/);
  return idMatch ? idMatch[0] : null;
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
  cta,
  setCta,
  thumbnail,
  setThumbnail,
  files,
  setFiles,
  videoThumbs,
  setVideoThumbs,
  selectedAdSets,
  duplicateAdSet,
  selectedCampaign,
  selectedAdAccount,
  adSets,
  copyTemplates,
  defaultTemplateName,
  selectedTemplate,
  setSelectedTemplate,
  driveFiles,
  setDriveFiles,
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
  campaignObjective
}) {
  // Local state
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
  const [customLink, setCustomLink] = useState("")
  const [showCustomLink, setShowCustomLink] = useState(false)
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

  const S3_UPLOAD_THRESHOLD = 40 * 1024 * 1024; // 40 MB


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

    if (isCarouselAd || isDynamicAdSet()) {
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
      adCount = files.length + driveFiles.length;
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
        driveFiles: [...driveFiles],  // These already contain accessToken per file
        videoThumbs: { ...videoThumbs },
        thumbnail,

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
        isCarouselAd,
        enablePlacementCustomization,
        fileGroups: fileGroups ? [...fileGroups.map(group => [...group])] : [],

        // Shop configuration
        selectedShopDestination,
        selectedShopDestinationType,

        // For computing adName
        adNameFormulaV2: adNameFormulaV2 ? { ...adNameFormulaV2 } : null,
        adValues,

        // Reference data needed for processing
        adSets: [...adSets]
      }
    };
  };


  const uploadToS3 = async (file, onChunkUploaded, uniqueId) => {
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

    // console.log('✅ Input validation passed');

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const limit = pLimit(5);
    let uploadId = null;
    let s3Key = null;

    try {
      // console.log('🔄 Step 1: Starting multipart upload...');

      const startPayload = {
        fileName: file.name,
        fileType: file.type
      };
      // console.log('📤 Sending start-upload request:', startPayload);

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
      let uploadedChunks = 0;

      const uploadPromises = presignedUrls.map((part, index) => {
        const { partNumber, url } = part;
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = start + CHUNK_SIZE;
        const chunk = file.slice(start, end);

        console.log(`📦 Preparing chunk ${partNumber}/${totalChunks}:`, {
          partNumber,
          chunkSize: chunk.size,
          start,
          end: Math.min(end, file.size)
        });

        return limit(async () => {
          try {

            const uploadResponse = await axios.put(url, chunk, {
              headers: { 'Content-Type': file.type },
              timeout: 60000
            });

            if (onChunkUploaded) {
              uploadedChunks++;
              console.log(`📈 Progress: ${uploadedChunks}/${totalChunks} chunks uploaded`);
              onChunkUploaded();
            }

            const etag = uploadResponse.headers.etag;
            if (!etag) {
              console.error(`❌ No ETag received for chunk ${partNumber}`);
              throw new Error(`No ETag received for part ${partNumber}`);
            }

            const cleanEtag = etag.replace(/"/g, '');
            console.log(`🏷️ Chunk ${partNumber} ETag:`, cleanEtag);

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

      console.log('⏳ Waiting for all chunks to upload...');
      const completedParts = await Promise.all(uploadPromises);

      console.log('✅ Step 3 complete:', {
        completedPartsCount: completedParts.length,
        expectedCount: totalChunks,
        allPartsValid: completedParts.every(p => p.PartNumber && p.ETag)
      });

      console.log('🔄 Step 4: Completing multipart upload...');
      const completePayload = {
        key: s3Key,
        uploadId: uploadId,
        parts: completedParts
      };
      console.log('📤 Sending complete-upload request:', {
        key: s3Key,
        uploadId: uploadId.substring(0, 20) + '...',
        partsCount: completedParts.length
      });

      const completeResponse = await axios.post(
        `${API_BASE_URL}/auth/s3/complete-upload`,
        completePayload,
        { withCredentials: true }
      );



      console.log('✅ Step 4 complete - Upload successful!');

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
      console.error('❌ === S3 UPLOAD FAILED ===');
      console.error('❌ Error details:', {
        fileName: file.name,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        uploadId,
        s3Key,
        stack: error.stack
      });

      // Cleanup on error
      if (uploadId && s3Key) {
        console.log('🧹 Attempting to abort failed upload...');
        try {
          await axios.post(
            `${API_BASE_URL}/auth/s3/abort-upload`,
            {
              key: s3Key,
              uploadId: uploadId
            },
            { withCredentials: true }
          );
          console.log('✅ Failed upload aborted successfully');
        } catch (abortError) {
          console.error('❌ Failed to abort upload:', abortError.message);
        }
      }

      throw new Error(`Failed to upload ${file.name} to S3: ${error.message}`);
    }
  };

  async function uploadDriveFileToS3(file) {
    const driveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;



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
        size: file.size// ✅ Pass the access token from the file object
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "S3 upload failed again");
    return {
      ...file, // Spreads all original properties like id, name, etc.
      s3Url: data.s3Url,
      isS3Upload: true
    };
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
          message: `${currentJob.adCount || 1} Ad${currentJob.adCount !== 1 ? 's' : ''} successfully posted to ${adSetDisplayText}`,
          completedAt: Date.now(),
          status: 'success'
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
          errorMessages: metaData.errorMessages // NEW

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
      "image/webp",
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



  // Dropzone logic
  const onDrop = useCallback((acceptedFiles) => {
    // setFiles((prev) => [...prev, ...acceptedFiles]);
    setFiles(prev => [
      ...prev,
      ...acceptedFiles.map(withUniqueId)
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


  // const generateThumbnail = useCallback((file) => {
  //   return new Promise((resolve, reject) => {
  //     const url = URL.createObjectURL(file)
  //     const video = document.createElement("video")

  //     // CRITICAL: Add timeout
  //     const timeout = setTimeout(() => {
  //       URL.revokeObjectURL(url)
  //       reject("Timeout")
  //     }, 8000)

  //     video.preload = "metadata"
  //     video.src = url
  //     video.muted = true
  //     video.playsInline = true
  //     video.currentTime = 0.1

  //     video.addEventListener("loadeddata", () => {
  //       clearTimeout(timeout) // Clear timeout on success
  //       try {
  //         const canvas = document.createElement("canvas")
  //         canvas.width = video.videoWidth
  //         canvas.height = video.videoHeight
  //         const ctx = canvas.getContext("2d")
  //         ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  //         const dataURL = canvas.toDataURL()
  //         URL.revokeObjectURL(url)
  //         resolve(dataURL)
  //       } catch (err) {
  //         reject(err)
  //       }
  //     })

  //     video.addEventListener("error", () => {
  //       clearTimeout(timeout)
  //       URL.revokeObjectURL(url)
  //       reject("Error generating thumbnail")
  //     })
  //   })
  // }, [])



  // const getDriveVideoThumbnail = (driveFile) => {
  //   // if (!driveFile.mimeType.startsWith('video/')) return null;
  //   if (!isVideoFile(driveFile)) return null;

  //   // Google Drive provides thumbnails for videos via this URL
  //   return `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w400-h300`;
  // };


  // useEffect(() => {
  //   const processThumbnails = async () => {
  //     const videoFiles = files.filter(file =>
  //       isVideoFile(file) && !videoThumbs[getFileId(file)]
  //     );


  //     if (videoFiles.length === 0) return;

  //     // Adaptive batch size
  //     const BATCH_SIZE = videoFiles.length <= 3 ? videoFiles.length
  //       : videoFiles.length <= 10 ? 3
  //         : 4; // Slightly larger batches for many files

  //     // Show initial progress if many files
  //     if (videoFiles.length > 5) {
  //       toast.info(`Generating thumbnails for ${videoFiles.length} videos...`);
  //     }

  //     for (let i = 0; i < videoFiles.length; i += BATCH_SIZE) {
  //       const batch = videoFiles.slice(i, i + BATCH_SIZE);

  //       const thumbnailPromises = batch.map(file =>
  //         generateThumbnail(file)
  //           .then(thumb => ({ id: getFileId(file), thumb }))
  //           .catch(err => {
  //             console.error(`Thumbnail error for ${file.name}:`, err);
  //             return {
  //               id: getFileId(file),
  //               thumb: "https://api.withblip.com/thumbnail.jpg"
  //             };
  //           })
  //       );

  //       const results = await Promise.all(thumbnailPromises);


  //       setVideoThumbs(prev => {
  //         const updates = {};
  //         results.forEach(result => {
  //           if (result) updates[result.id] = result.thumb;
  //         });
  //         return { ...prev, ...updates };
  //       });


  //       // Shorter pause for better UX
  //       if (i + BATCH_SIZE < videoFiles.length) {
  //         await new Promise(resolve => setTimeout(resolve, 10));
  //       }
  //     }

  //     // Handle Drive files...
  //   };

  //   processThumbnails();
  // }, [files, driveFiles, videoThumbs, generateThumbnail, getDriveVideoThumbnail, setVideoThumbs]);


  // Functions for managing dynamic input fields


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

  const getDriveVideoThumbnail = (driveFile) => {
    if (!isVideoFile(driveFile)) return null;
    return `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w400-h300`;
  };

  // Track processing state, not processed files
  const processingRef = useRef(new Set());

  useEffect(() => {
    // Use AbortController for cleanup
    const abortController = new AbortController();

    const processThumbnails = async () => {
      // Filter only unprocessed video files - check both videoThumbs and processing
      const videoFiles = files.filter(file => {
        const fileId = getFileId(file);
        return isVideoFile(file) &&
          !videoThumbs[fileId] && // Check actual thumbnails
          !processingRef.current.has(fileId); // Not currently processing
      });

      if (videoFiles.length === 0) {
        // Handle Drive files only if there are no local files to process
        const driveThumbs = {};
        driveFiles.forEach(file => {
          const fileId = getFileId(file);
          if (isVideoFile(file) && !videoThumbs[fileId]) {
            const thumb = getDriveVideoThumbnail(file);
            if (thumb) {
              driveThumbs[fileId] = thumb;
            }
          }
        });

        if (Object.keys(driveThumbs).length > 0) {
          setVideoThumbs(prev => ({ ...prev, ...driveThumbs }));
        }
        return;
      }

      // Show toast ONLY for files that actually need processing
      if (videoFiles.length > 5) {
        toast.info(`Generating thumbnails for ${videoFiles.length} videos...`);
      }

      // Mark files as being processed
      videoFiles.forEach(file => {
        processingRef.current.add(getFileId(file));
      });

      // Process with limited concurrency instead of batches
      const MAX_CONCURRENT = 2; // Process only 2 at a time
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
          // Remove from processing set once done
          processingRef.current.delete(fileId);

          // Show progress if many files
          if (videoFiles.length > 10 && completed % 5 === 0) {
            toast.info(`Generated ${completed}/${videoFiles.length} thumbnails...`);
          }

          // Use requestIdleCallback for better performance
          if (queue.length > 0 && !abortController.signal.aborted) {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => processNext(), { timeout: 100 });
            } else {
              setTimeout(processNext, 0);
            }
          }
        }
      };

      // Start initial concurrent processes
      const initialPromises = [];
      for (let i = 0; i < Math.min(MAX_CONCURRENT, videoFiles.length); i++) {
        initialPromises.push(processNext());
      }
      await Promise.all(initialPromises);

      // Handle Drive files after local files are done
      const driveThumbs = {};
      driveFiles.forEach(file => {
        const fileId = getFileId(file);
        if (isVideoFile(file) && !videoThumbs[fileId]) {
          const thumb = getDriveVideoThumbnail(file);
          if (thumb) {
            driveThumbs[fileId] = thumb;
          }
        }
      });

      if (Object.keys(driveThumbs).length > 0) {
        setVideoThumbs(prev => ({ ...prev, ...driveThumbs }));
      }
    };

    processThumbnails();

    // Cleanup on unmount or dependency change
    return () => {
      abortController.abort();
      // Clear processing set on cleanup
      processingRef.current.clear();
    };
  }, [files, driveFiles, videoThumbs, generateThumbnail, getDriveVideoThumbnail, setVideoThumbs]);


  const addField = (setter, values, ma) => {
    if (values.length < 5) {
      setter([...values, ""])
    }
  }

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

    let fileName = "file_name";
    if (file && file.name) {
      fileName = file.name.replace(/\.[^/.]+$/, "");
    }

    let fileType = "file_type";

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
        else adTypeLabel = "";
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

    return adName || "Ad Generated Through Blip";
  }, [adNameFormulaV2]);


  useEffect(() => {
    const adName = computeAdNameFromFormula(null);
    setAdName(adName);
  }, [adNameFormulaV2, computeAdNameFromFormula]);


  useEffect(() => {
    if (isCarouselAd) {
      const fileCount = files.length + driveFiles.length;

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
  }, [files.length, driveFiles.length, isCarouselAd, applyTextToAllCards, applyHeadlinesToAllCards]);


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
      videoThumbs,
      thumbnail,

      // Selections
      selectedAdSets,
      duplicateAdSet,
      newAdSetName,
      pageId,
      instagramAccountId,
      selectedAdAccount,
      selectedCampaign,

      // Configuration
      launchPaused,
      isCarouselAd,
      enablePlacementCustomization,
      fileGroups,

      // Shop
      selectedShopDestination,
      selectedShopDestinationType,

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

    if (files.length === 0 && driveFiles.length === 0) {
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
        const allFiles = [...files, ...driveFiles];
        // const videoFiles = allFiles.filter(file =>
        //   file.type?.startsWith('video/') || file.mimeType?.startsWith('video/')
        // );

        const videoFiles = allFiles.filter(isVideoFile);


        if (videoFiles.length > 0) {
          const BATCH_SIZE = 3;

          for (let i = 0; i < videoFiles.length; i += BATCH_SIZE) {
            const batch = videoFiles.slice(i, i + BATCH_SIZE);



            // Update progress message
            setProgressMessage(`Analyzing videos: ${Math.min(i + BATCH_SIZE, videoFiles.length)}/${videoFiles.length}`);

            // Process batch in parallel
            const batchPromises = batch.map(async (file) => {
              try {
                const aspectRatio = await getVideoAspectRatio(file);
                console.log("aspect ratio for video", aspectRatio);
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
    }

    const largeFiles = files.filter(file =>
      isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD
    );
    const largeDriveFiles = driveFiles.filter(file =>
      isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD
    );


    let s3Results = [];
    const s3DriveResults = [];

    const totalLargeFiles = largeFiles.length + largeDriveFiles.length;
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

      console.log('🔍 Large files check before upload:', largeFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        hasUniqueId: !!file.uniqueId,
        uniqueId: file.uniqueId,
        getFileIdResult: getFileId(file),
        allFileKeys: Object.keys(file)
      })));


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

      setProgress(100);
      setProgressMessage('File upload complete! Creating ads...');
      // toast.success("Video files uploaded!");
    }

    // 🔧 NOW start the actual job (50-100% progress)
    const frontendJobId = uuidv4();
    const smallDriveFiles = driveFiles.filter(file =>
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
    // console.log("✅ About to reach try block");

    // Add carousel validation
    if (isCarouselAd) {
      const totalFiles = files.length + driveFiles.length + s3Results.length + s3DriveResults.length;
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
      // console.log("passed validation check");
    }

    // Add flexible ads validation
    if (adType === 'flexible') {
      const totalFiles = files.length + driveFiles.length + s3Results.length + s3DriveResults.length;

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

    // setJobId(frontendJobId); // This triggers SSE

    // try {
    //   const promises = [];

    //   // FIRST: Handle carousel ads (completely separate from dynamic/non-dynamic)
    //   if (isCarouselAd && dynamicAdSetIds.length === 0) {
    //     if (selectedAdSets.length === 0 && !duplicateAdSet) {
    //       toast.error("Please select at least one ad set for carousel");
    //       return;
    //     }

    //     // For carousel, process each selected ad set separately (one call per ad set)
    //     nonDynamicAdSetIds.forEach((adSetId) => {
    //       const formData = new FormData();
    //       formData.append("adName", computeAdNameFromFormula(files[0] || driveFiles[0], 0, link[0], jobData.formData.adNameFormulaV2, adType));
    //       formData.append("headlines", JSON.stringify(headlines));
    //       formData.append("descriptions", JSON.stringify(descriptions));
    //       formData.append("messages", JSON.stringify(messages));
    //       formData.append("adAccountId", selectedAdAccount);
    //       formData.append("adSetId", adSetId);
    //       formData.append("pageId", pageId);
    //       formData.append("instagramAccountId", instagramAccountId);
    //       formData.append("link", JSON.stringify(link));
    //       formData.append("cta", cta);
    //       formData.append("isCarouselAd", isCarouselAd);
    //       formData.append("launchPaused", launchPaused);
    //       formData.append("enablePlacementCustomization", false);
    //       formData.append("jobId", frontendJobId);

    //       // Create order metadata for all files
    //       const fileOrder = [];
    //       let fileIndex = 0;

    //       // Process files in the order they appear in the UI
    //       files.forEach((file) => {
    //         if (file.size <= S3_UPLOAD_THRESHOLD) {
    //           // Small local file
    //           fileOrder.push({
    //             index: fileIndex++,
    //             type: 'local',
    //             name: file.name
    //           });
    //           formData.append("mediaFiles", file);
    //         } else {
    //           // Large local file (should be in s3Results)
    //           const s3File = s3Results.find(s3f => s3f.name === file.name);
    //           if (s3File) {
    //             fileOrder.push({
    //               index: fileIndex++,
    //               type: 's3',
    //               url: s3File.s3Url,
    //               name: file.name
    //             });
    //           }
    //         }
    //       });

    //       // Process drive files
    //       driveFiles.forEach((driveFile) => {
    //         if (driveFile.size <= S3_UPLOAD_THRESHOLD) {
    //           // Small drive file
    //           fileOrder.push({
    //             index: fileIndex++,
    //             type: 'drive',
    //             id: driveFile.id,
    //             name: driveFile.name
    //           });
    //           formData.append("driveFiles", JSON.stringify({
    //             id: driveFile.id,
    //             name: driveFile.name,
    //             mimeType: driveFile.mimeType,
    //             accessToken: driveFile.accessToken
    //           }));
    //         } else {
    //           // Large drive file (should be in s3DriveResults)
    //           const s3DriveFile = s3DriveResults.find(s3f => s3f.id === driveFile.id);
    //           if (s3DriveFile) {
    //             fileOrder.push({
    //               index: fileIndex++,
    //               type: 's3',
    //               url: s3DriveFile.s3Url,
    //               name: driveFile.name,
    //               driveId: driveFile.id
    //             });
    //           }
    //         }
    //       });

    //       // Send the file order metadata
    //       formData.append("fileOrder", JSON.stringify(fileOrder));



    //       // Add S3 URLs for large files
    //       [...s3Results, ...s3DriveResults].forEach((s3File) => {
    //         formData.append("s3VideoUrls", s3File.s3Url);
    //         formData.append("s3VideoName", s3File.name); // <<< ADD THIS LINE
    //         console.log("s3VideoName", s3File.name);
    //       });

    //       if (selectedShopDestination && showShopDestinationSelector) {
    //         formData.append("shopDestination", selectedShopDestination);
    //         formData.append("shopDestinationType", selectedShopDestinationType);
    //       }
    //       // console.log("reached backend endpoint");

    //       promises.push(
    //         axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //           withCredentials: true,
    //           headers: { "Content-Type": "multipart/form-data" },
    //         })
    //       );
    //     });
    //   }

    //   // FLEXIBLE ADS: Handle flexible ads to non-dynamic ad sets
    //   if (adType === 'flexible' && nonDynamicAdSetIds.length > 0) {
    //     console.log("🎨 Creating flexible ad with:", {
    //       filesCount: files.length + driveFiles.length + s3Results.length + s3DriveResults.length,
    //       groupCount: fileGroups.length,
    //       nonDynamicAdSetIds
    //     });

    //     // Check if we have groups
    //     if (fileGroups.length > 0) {
    //       // GROUPED FLEXIBLE ADS: Create one ad per group per ad set
    //       console.log(`📦 Creating ${fileGroups.length} grouped flexible ads`);

    //       fileGroups.forEach((group, groupIndex) => {
    //         nonDynamicAdSetIds.forEach((adSetId) => {
    //           const formData = new FormData();

    //           // Find the first file in this group for naming
    //           const firstFileId = group[0];
    //           const firstFile = files.find(f => getFileId(f) === firstFileId) ||
    //             driveFiles.find(f => f.id === firstFileId);

    //           formData.append("adName", computeAdNameFromFormula(
    //             firstFile || files[0] || driveFiles[0],
    //             groupIndex,
    //             link[0],
    //             jobData.formData.adNameFormulaV2,
    //             adType
    //           ));
    //           formData.append("headlines", JSON.stringify(headlines));
    //           formData.append("descriptions", JSON.stringify(descriptions));
    //           formData.append("messages", JSON.stringify(messages));
    //           formData.append("adAccountId", selectedAdAccount);
    //           formData.append("adSetId", adSetId);
    //           formData.append("pageId", pageId);
    //           formData.append("instagramAccountId", instagramAccountId);
    //           formData.append("link", JSON.stringify(link));
    //           formData.append("cta", cta);
    //           formData.append("isCarouselAd", false);
    //           formData.append("adType", "flexible");
    //           formData.append("launchPaused", launchPaused);
    //           formData.append("enablePlacementCustomization", false);
    //           formData.append("jobId", frontendJobId);
    //           formData.append("totalGroups", fileGroups.length);
    //           formData.append("currentGroupIndex", groupIndex + 1);

    //           // Add only files from this group
    //           group.forEach(fileId => {
    //             // Check in local files
    //             const file = files.find(f => getFileId(f) === fileId);
    //             if (file && file.size <= S3_UPLOAD_THRESHOLD) {
    //               formData.append("mediaFiles", file);
    //             }

    //             // Check in drive files
    //             const driveFile = smallDriveFiles.find(f => f.id === fileId);
    //             if (driveFile) {
    //               formData.append("driveFiles", JSON.stringify({
    //                 id: driveFile.id,
    //                 name: driveFile.name,
    //                 mimeType: driveFile.mimeType,
    //                 accessToken: driveFile.accessToken
    //               }));
    //             }

    //             // Check in S3 files
    //             const s3File = [...s3Results, ...s3DriveResults].find(
    //               s3f => s3f.uniqueId === fileId || s3f.id === fileId
    //             );
    //             if (s3File) {
    //               formData.append("s3VideoUrls", s3File.s3Url);
    //               formData.append("s3VideoNames", s3File.name);
    //             }
    //           });

    //           // Add shop destination if needed
    //           if (selectedShopDestination && showShopDestinationSelector) {
    //             formData.append("shopDestination", selectedShopDestination);
    //             formData.append("shopDestinationType", selectedShopDestinationType);
    //           }

    //           promises.push(
    //             axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //               withCredentials: true,
    //               headers: { "Content-Type": "multipart/form-data" },
    //             })
    //           );
    //         });
    //       });

    //     } else {
    //       // UNGROUPED FLEXIBLE ADS: Send ALL files (existing logic)
    //       nonDynamicAdSetIds.forEach((adSetId) => {
    //         const formData = new FormData();
    //         formData.append("adName", computeAdNameFromFormula(files[0] || driveFiles[0], 0, link[0], jobData.formData.adNameFormulaV2, adType));
    //         formData.append("headlines", JSON.stringify(headlines));
    //         formData.append("descriptions", JSON.stringify(descriptions));
    //         formData.append("messages", JSON.stringify(messages));
    //         formData.append("adAccountId", selectedAdAccount);
    //         formData.append("adSetId", adSetId);
    //         formData.append("pageId", pageId);
    //         formData.append("instagramAccountId", instagramAccountId);
    //         formData.append("link", JSON.stringify(link));
    //         formData.append("cta", cta);
    //         formData.append("isCarouselAd", false);
    //         formData.append("adType", "flexible");
    //         formData.append("launchPaused", launchPaused);
    //         formData.append("enablePlacementCustomization", false);
    //         formData.append("jobId", frontendJobId);

    //         // Add all small local files
    //         files.forEach((file) => {
    //           if (file.size <= S3_UPLOAD_THRESHOLD) {
    //             formData.append("mediaFiles", file);
    //           }
    //         });

    //         // Add all small drive files
    //         smallDriveFiles.forEach((driveFile) => {
    //           formData.append("driveFiles", JSON.stringify({
    //             id: driveFile.id,
    //             name: driveFile.name,
    //             mimeType: driveFile.mimeType,
    //             accessToken: driveFile.accessToken
    //           }));
    //         });

    //         // Add all large file URLs (S3)
    //         [...s3Results, ...s3DriveResults].forEach((s3File) => {
    //           formData.append("s3VideoUrls", s3File.s3Url);
    //           formData.append("s3VideoNames", s3File.name);
    //         });

    //         // Add video thumbnail if provided
    //         if (thumbnail) {
    //           formData.append("thumbnail", thumbnail);
    //         }

    //         // Add shop destination if needed
    //         if (selectedShopDestination && showShopDestinationSelector) {
    //           formData.append("shopDestination", selectedShopDestination);
    //           formData.append("shopDestinationType", selectedShopDestinationType);
    //         }

    //         promises.push(
    //           axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //             withCredentials: true,
    //             headers: { "Content-Type": "multipart/form-data" },
    //           })
    //         );
    //       });
    //     }
    //   }


    //   // Process dynamic adsets
    //   if (dynamicAdSetIds.length > 0) {
    //     // For each dynamic adset, create ONE request with ALL media files
    //     dynamicAdSetIds.forEach((adSetId) => {
    //       const formData = new FormData();
    //       // formData.append("adName", computeAdName(files[0] || driveFiles[0], adValues.dateType));
    //       formData.append("adName", computeAdNameFromFormula(files[0] || driveFiles[0], 0, link[0], jobData.formData.adNameFormulaV2));
    //       formData.append("headlines", JSON.stringify(headlines));
    //       formData.append("descriptions", JSON.stringify(descriptions));
    //       formData.append("messages", JSON.stringify(messages));
    //       formData.append("adAccountId", selectedAdAccount);
    //       formData.append("adSetId", adSetId);
    //       formData.append("pageId", pageId);
    //       formData.append("instagramAccountId", instagramAccountId);
    //       formData.append("link", JSON.stringify(link));
    //       formData.append("cta", cta);
    //       formData.append("isCarouselAd", isCarouselAd);
    //       formData.append("enablePlacementCustomization", false);
    //       formData.append("launchPaused", launchPaused);
    //       formData.append("jobId", frontendJobId);

    //       // Add all local files
    //       files.forEach((file) => {
    //         if (file.size <= S3_UPLOAD_THRESHOLD) {
    //           formData.append("mediaFiles", file);
    //         }
    //       });

    //       //Add Drive Files
    //       smallDriveFiles.forEach((driveFile) => {
    //         formData.append("driveFiles", JSON.stringify({
    //           id: driveFile.id,
    //           name: driveFile.name,
    //           mimeType: driveFile.mimeType,
    //           accessToken: driveFile.accessToken
    //         }));
    //       });

    //       //add large file URLs
    //       [...s3Results, ...s3DriveResults].forEach((s3File) => {
    //         formData.append("s3VideoUrls", s3File.s3Url);
    //         formData.append("s3VideoNames", s3File.name); // <<< ADD THIS LINE

    //       });


    //       // For video dynamic creative, use the single thumbnail (if provided)
    //       if (thumbnail) {
    //         formData.append("thumbnail", thumbnail);
    //       }
    //       // Add shop destination if needed
    //       if (selectedShopDestination && showShopDestinationSelector) {
    //         formData.append("shopDestination", selectedShopDestination)
    //         formData.append("shopDestinationType", selectedShopDestinationType)
    //       }



    //       promises.push(
    //         axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //           withCredentials: true,
    //           headers: { "Content-Type": "multipart/form-data" },
    //         })
    //       );
    //     });
    //   }

    //   if (nonDynamicAdSetIds.length > 0 && !isCarouselAd && adType !== 'flexible') {
    //     // if (nonDynamicAdSetIds.length > 0 && !isCarouselAd) {
    //     nonDynamicAdSetIds.forEach((adSetId) => {

    //       const groupedFileIds = enablePlacementCustomization ? new Set(fileGroups.flat()) : new Set();
    //       const hasUngroupedFiles = (
    //         files.some(file => !groupedFileIds.has(getFileId(file)) && file.size <= S3_UPLOAD_THRESHOLD) ||
    //         smallDriveFiles.some(driveFile => !groupedFileIds.has(driveFile.id)) ||
    //         [...s3Results, ...s3DriveResults].some(s3File =>
    //           !(groupedFileIds.has(s3File.uniqueId) || groupedFileIds.has(s3File.id)) // <-- Corrected logic
    //         )
    //       );

    //       let globalIterationIndex = 0;

    //       // NEW: Check if placement customization is enabled
    //       if (enablePlacementCustomization && fileGroups.length > 0) {
    //         // Process ONLY grouped files

    //         console.log("checking grouped files");
    //         fileGroups.forEach((group, groupIndex) => {
    //           const firstFileId = group[0];
    //           let firstFileForNaming = null;

    //           // Find the actual file object for the first file in this group
    //           firstFileForNaming = files.find(f => getFileId(f) === firstFileId) ||
    //             smallDriveFiles.find(f => f.id === firstFileId) ||
    //             [...s3Results, ...s3DriveResults].find(f => f.uniqueId === firstFileId || f.id === firstFileId);


    //           const formData = new FormData();
    //           formData.append("adName", computeAdNameFromFormula(firstFileForNaming || files[0] || driveFiles[0], globalIterationIndex, link[0], jobData.formData.adNameFormulaV2));
    //           formData.append("headlines", JSON.stringify(headlines));
    //           formData.append("descriptions", JSON.stringify(descriptions));
    //           formData.append("messages", JSON.stringify(messages));
    //           formData.append("adAccountId", selectedAdAccount);
    //           formData.append("adSetId", adSetId);
    //           formData.append("pageId", pageId);
    //           formData.append("instagramAccountId", instagramAccountId);
    //           formData.append("link", JSON.stringify(link));
    //           formData.append("cta", cta);
    //           formData.append("enablePlacementCustomization", enablePlacementCustomization);
    //           formData.append("launchPaused", launchPaused);
    //           formData.append("jobId", frontendJobId);

    //           const groupVideoMetadata = [];

    //           group.forEach(fileId => {
    //             const file = files.find(f => getFileId(f) === fileId);
    //             if (file && !file.isDrive && file.size <= S3_UPLOAD_THRESHOLD) {

    //               console.log(`  ✅ Found local file:`, {
    //                 name: file.name,
    //                 originalname: file.originalname,
    //                 type: file.type,
    //                 size: file.size,
    //                 hasName: !!file.name
    //               });

    //               formData.append("mediaFiles", file);
    //               console.log(`  📤 Appended local file to formData: ${file.name}`);

    //               if (isVideoFile(file)) {
    //                 groupVideoMetadata.push({
    //                   fileName: file.name,
    //                   uniqueId: getFileId(file),  // ← Add this
    //                   aspectRatio: aspectRatioMap[getFileId(file)] || 16 / 9

    //                 });
    //               }
    //               console.log("group video metadata", groupVideoMetadata);
    //             }
    //           });

    //           // Add drive files from this group
    //           group.forEach(fileId => {
    //             const driveFile = smallDriveFiles.find(f => f.id === fileId);
    //             if (driveFile) {
    //               console.log(`  ✅ Found drive file:`, {
    //                 id: driveFile.id,
    //                 name: driveFile.name,
    //                 mimeType: driveFile.mimeType
    //               });

    //               formData.append("driveFiles", JSON.stringify({
    //                 id: driveFile.id,
    //                 name: driveFile.name,
    //                 mimeType: driveFile.mimeType,
    //                 accessToken: driveFile.accessToken
    //               }));
    //               if (isVideoFile(driveFile)) {
    //                 // After the group.forEach loops that build groupVideoMetadata
    //                 console.log("Creating groupMetaData");

    //                 groupVideoMetadata.push({
    //                   driveId: driveFile.id,
    //                   aspectRatio: aspectRatioMap[getFileId(driveFile)] || 16 / 9
    //                 });
    //               }
    //               // After the group.forEach loops that build groupVideoMetadata
    //               console.log(`🔍 Group ${groupIndex + 1} videoMetadata built:`, groupVideoMetadata);
    //               console.log(`🔍 Total metadata entries:`, groupVideoMetadata.length);
    //             }
    //           });

    //           // Add S3 files from this group
    //           group.forEach(fileId => {
    //             const s3File = [...s3Results, ...s3DriveResults].find(f =>
    //               f.uniqueId === fileId || f.id === fileId // <-- Use the correct IDs
    //             );
    //             if (s3File) {
    //               console.log(`  ✅ Found S3 file:`, {
    //                 name: s3File.name,
    //                 s3Url: s3File.s3Url,
    //                 hasName: !!s3File.name
    //               });
    //               formData.append("s3VideoUrls", s3File.s3Url);
    //               formData.append("s3VideoNames", s3File.name); // <<< ADD THIS LINE
    //               console.log("s3VideoNames", s3File.name);
    //               if (isVideoFile(s3File)) {
    //                 groupVideoMetadata.push({
    //                   s3Url: s3File.s3Url,
    //                   aspectRatio: s3File.aspectRatio || 16 / 9
    //                 });
    //               }

    //             }
    //           });

    //           // Only add video metadata if we have any videos
    //           if (groupVideoMetadata.length > 0) {
    //             console.log("sending group video metadata");

    //             formData.append("videoMetadata", JSON.stringify(groupVideoMetadata));
    //           }
    //           console.log(`📤 Sending videoMetadata to server:`, JSON.stringify(groupVideoMetadata, null, 2));



    //           if (selectedShopDestination && showShopDestinationSelector) {
    //             formData.append("shopDestination", selectedShopDestination);
    //             formData.append("shopDestinationType", selectedShopDestinationType);
    //           }

    //           formData.append("totalGroups", fileGroups.length);
    //           formData.append("currentGroupIndex", groupIndex + 1);
    //           formData.append("hasUngroupedFiles", hasUngroupedFiles);


    //           promises.push(
    //             axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //               withCredentials: true,
    //               headers: { "Content-Type": "multipart/form-data" },
    //             })
    //           );
    //           globalIterationIndex++;
    //         });
    //       }


    //       if (hasUngroupedFiles) {
    //         // Regular processing - one ad per file


    //         // Handle local files
    //         files.forEach((file, index) => {
    //           if (file.size > S3_UPLOAD_THRESHOLD || groupedFileIds.has(getFileId(file))) return;//skip files
    //           const formData = new FormData();
    //           formData.append("adName", computeAdNameFromFormula(file, globalIterationIndex, link[0], jobData.formData.adNameFormulaV2));
    //           formData.append("headlines", JSON.stringify(headlines));
    //           formData.append("descriptions", JSON.stringify(descriptions));
    //           formData.append("messages", JSON.stringify(messages));
    //           formData.append("imageFile", file);
    //           formData.append("adAccountId", selectedAdAccount);
    //           formData.append("adSetId", adSetId);
    //           formData.append("pageId", pageId);
    //           formData.append("instagramAccountId", instagramAccountId);
    //           formData.append("link", JSON.stringify(link));
    //           formData.append("cta", cta);
    //           formData.append("enablePlacementCustomization", false);
    //           if (thumbnail) {
    //             formData.append("thumbnail", thumbnail);
    //           }
    //           if (selectedShopDestination && showShopDestinationSelector) {
    //             formData.append("shopDestination", selectedShopDestination);
    //             formData.append("shopDestinationType", selectedShopDestinationType);
    //           }
    //           formData.append("launchPaused", launchPaused);
    //           formData.append("jobId", frontendJobId);

    //           promises.push(
    //             axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //               withCredentials: true,
    //               headers: { "Content-Type": "multipart/form-data" },
    //             })
    //           );
    //           globalIterationIndex++;
    //         });

    //         // Handle small drive files
    //         smallDriveFiles.forEach((driveFile, index) => {
    //           if (groupedFileIds.has(getFileId(driveFile))) return;

    //           const formData = new FormData();
    //           // formData.append("adName", computeAdName(driveFile, adValues.dateType, globalIterationIndex));
    //           formData.append("adName", computeAdNameFromFormula(driveFile, globalIterationIndex, link[0], jobData.formData.adNameFormulaV2));
    //           formData.append("headlines", JSON.stringify(headlines));
    //           formData.append("descriptions", JSON.stringify(descriptions));
    //           formData.append("messages", JSON.stringify(messages));
    //           formData.append("adAccountId", selectedAdAccount);
    //           formData.append("adSetId", adSetId);
    //           formData.append("pageId", pageId);
    //           formData.append("instagramAccountId", instagramAccountId);
    //           formData.append("link", JSON.stringify(link));
    //           formData.append("cta", cta);
    //           formData.append("enablePlacementCustomization", false);
    //           formData.append("driveFile", "true");
    //           formData.append("driveId", driveFile.id);
    //           formData.append("driveMimeType", driveFile.mimeType);
    //           formData.append("driveAccessToken", driveFile.accessToken);
    //           formData.append("driveName", driveFile.name);
    //           if (selectedShopDestination && showShopDestinationSelector) {
    //             formData.append("shopDestination", selectedShopDestination);
    //             formData.append("shopDestinationType", selectedShopDestinationType);
    //           }
    //           formData.append("launchPaused", launchPaused);
    //           formData.append("jobId", frontendJobId);

    //           promises.push(
    //             axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //               withCredentials: true,
    //               headers: { "Content-Type": "multipart/form-data" },
    //             })
    //           );
    //           globalIterationIndex++;
    //         });

    //         // Handle S3 uploaded files
    //         [...s3Results, ...s3DriveResults].forEach((s3File, index) => {
    //           if (groupedFileIds.has(s3File.uniqueId) || groupedFileIds.has(s3File.id)) { // <-- Use the correct IDs
    //             return; // Skip grouped files
    //           }

    //           const formData = new FormData();
    //           // formData.append("adName", computeAdName(s3File, adValues.dateType, globalIterationIndex));
    //           formData.append("adName", computeAdNameFromFormula(s3File, globalIterationIndex, link[0], jobData.formData.adNameFormulaV2));
    //           formData.append("headlines", JSON.stringify(headlines));
    //           formData.append("descriptions", JSON.stringify(descriptions));
    //           formData.append("messages", JSON.stringify(messages));
    //           formData.append("s3VideoUrl", s3File.s3Url);
    //           formData.append("s3VideoName", s3File.name);
    //           formData.append("adAccountId", selectedAdAccount);
    //           formData.append("adSetId", adSetId);
    //           formData.append("pageId", pageId);
    //           formData.append("instagramAccountId", instagramAccountId);
    //           formData.append("link", JSON.stringify(link));
    //           formData.append("cta", cta);
    //           formData.append("enablePlacementCustomization", false);
    //           if (selectedShopDestination && showShopDestinationSelector) {
    //             formData.append("shopDestination", selectedShopDestination);
    //             formData.append("shopDestinationType", selectedShopDestinationType);
    //           }
    //           formData.append("launchPaused", launchPaused);
    //           formData.append("jobId", frontendJobId);

    //           promises.push(
    //             axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
    //               withCredentials: true,
    //               headers: { "Content-Type": "multipart/form-data" },
    //             })
    //           );
    //           globalIterationIndex++;
    //         });

    //       } // Close else block
    //     }); // Close forEach
    //   } // Close if condition




    //   try {
    //     const responses = await Promise.all(promises);
    //     console.log("job finished calling final endpoint");
    //     // Try to complete the job
    //     try {
    //       console.log("job finished calling final endpoint try block");
    //       await axios.post(`${API_BASE_URL}/auth/complete-job`, {
    //         jobId: frontendJobId,
    //         message: 'All ads created successfully!'
    //       }, {
    //         withCredentials: true,
    //         timeout: 5000 // Don't wait forever
    //       });
    //     } catch (completeError) {
    //       console.warn("Failed to update progress tracker, but ads were created successfully");
    //       // Still show the toast since ads actually succeeded
    //     }
    //     console.log("job finished calling final endpoint try block ended");
    //     // toast.success("Ads created successfully!");
    //   }
    //   catch (error) {
    //     // error handling here
    //   }

    // } catch (error) {
    //   let errorMessage = "Unknown error occurred";

    //   if (typeof error.response?.data === "string") {
    //     errorMessage = error.response.data;
    //   } else if (error.response?.data?.error?.code === 2 && error.response?.data?.error?.is_transient) {
    //     // Facebook internal transient error
    //     errorMessage = "Facebook's server had a temporary issue. Please try again in a few seconds.";
    //   } else if (error.response?.data?.error?.message) {
    //     // Fallback to Facebook-provided message
    //     errorMessage = error.response.data.error.message;
    //   } else if (error.message) {
    //     errorMessage = error.message;
    //   }

    //   console.log("❌ handleCreateAd catch:", error.message);
    //   // setLastJobFailed(true);
    //   // toast.error(`Error uploading ads: ${errorMessage}`);
    //   throw new Error(errorMessage);

    // } finally {
    //   setIsLoading(false);

    // }


    // ============================================================================
    // HELPER FUNCTIONS - Abstract formData operations
    // ============================================================================

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
        jobId
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
        s3Results,
        s3DriveResults,
        S3_UPLOAD_THRESHOLD,
        smallDriveFiles
      }
    ) => {
      formData.append("isCarouselAd", isCarouselAd);
      formData.append("enablePlacementCustomization", false);
      formData.append("fileOrder", JSON.stringify(fileOrder));

      // Add S3 URLs for large files
      [...s3Results, ...s3DriveResults].forEach((s3File) => {
        formData.append("s3VideoUrls", s3File.s3Url);
        formData.append("s3VideoName", s3File.name);
      });
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
        s3Results,
        s3DriveResults,
        S3_UPLOAD_THRESHOLD,
        getFileId,
        isVideoFile,
        aspectRatioMap
      }
    ) => {
      const groupVideoMetadata = [];

      // Add local files from this group
      group.forEach(fileId => {
        const file = files.find(f => getFileId(f) === fileId);
        if (file && !file.isDrive && file.size <= S3_UPLOAD_THRESHOLD) {
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

      // Add S3 files from this group
      group.forEach(fileId => {
        const s3File = [...s3Results, ...s3DriveResults].find(f =>
          f.uniqueId === fileId || f.id === fileId
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
        s3Results,
        s3DriveResults,
        S3_UPLOAD_THRESHOLD
      }
    ) => {
      // Add all small local files
      files.forEach((file) => {
        if (file.size <= S3_UPLOAD_THRESHOLD) {
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

      // Add all large file URLs (S3)
      [...s3Results, ...s3DriveResults].forEach((s3File) => {
        formData.append("s3VideoUrls", s3File.s3Url);
        formData.append("s3VideoNames", s3File.name);
      });
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
     * Append single S3 file fields
     */
    const appendSingleS3File = (formData, s3File) => {
      formData.append("s3VideoUrl", s3File.s3Url);
      formData.append("s3VideoName", s3File.name);
      formData.append("enablePlacementCustomization", false);
    };

    /**
     * Build file order metadata for carousel ads
     */
    const buildCarouselFileOrder = (
      files,
      driveFiles,
      s3Results,
      s3DriveResults,
      S3_UPLOAD_THRESHOLD
    ) => {
      const fileOrder = [];
      let fileIndex = 0;

      // Process files in the order they appear in the UI
      files.forEach((file) => {
        if (file.size <= S3_UPLOAD_THRESHOLD) {
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
        if (driveFile.size <= S3_UPLOAD_THRESHOLD) {
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

      return fileOrder;
    };

    /**
     * Make API call to create ad
     */
    const createAdApiCall = async (formData, API_BASE_URL) => {
      return axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
    };

    // ============================================================================
    // MAIN REFACTORED CODE
    // ============================================================================

    try {
      const promises = [];

      // Pre-compute common JSON strings and values
      const commonPrecomputed = preComputeCommonValues(headlines, descriptions, messages, link);

      // Pre-compute ad names for all files
      const precomputedAdNames = [];
      let globalFileIndex = 0;

      // ============================================================================
      // SECTION 1: CAROUSEL ADS
      // ============================================================================
      if (isCarouselAd && dynamicAdSetIds.length === 0) {
        if (selectedAdSets.length === 0 && !duplicateAdSet) {
          toast.error("Please select at least one ad set for carousel");
          return;
        }

        // Pre-compute file order once for carousel
        const carouselFileOrder = buildCarouselFileOrder(
          files,
          driveFiles,
          s3Results,
          s3DriveResults,
          S3_UPLOAD_THRESHOLD
        );

        // Pre-compute ad name for carousel
        const carouselAdName = computeAdNameFromFormula(
          files[0] || driveFiles[0],
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
            jobId: frontendJobId
          });

          // Append carousel-specific fields
          appendCarouselFields(formData, {
            isCarouselAd,
            fileOrder: carouselFileOrder,
            files,
            driveFiles,
            s3Results,
            s3DriveResults,
            S3_UPLOAD_THRESHOLD,
            smallDriveFiles
          });

          // Append shop destination
          appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

          // Add media files to formData
          files.forEach((file) => {
            if (file.size <= S3_UPLOAD_THRESHOLD) {
              formData.append("mediaFiles", file);
            }
          });

          driveFiles.forEach((driveFile) => {
            if (driveFile.size <= S3_UPLOAD_THRESHOLD) {
              formData.append("driveFiles", JSON.stringify({
                id: driveFile.id,
                name: driveFile.name,
                mimeType: driveFile.mimeType,
                accessToken: driveFile.accessToken
              }));
            }
          });

          // NOW trigger SSE after formData is built
          setJobId(frontendJobId);

          promises.push(createAdApiCall(formData, API_BASE_URL));
        });
      }

      // ============================================================================
      // SECTION 2: FLEXIBLE ADS TO NON-DYNAMIC AD SETS
      // ============================================================================
      if (adType === 'flexible' && nonDynamicAdSetIds.length > 0) {
        console.log("🎨 Creating flexible ad with:", {
          filesCount: files.length + driveFiles.length + s3Results.length + s3DriveResults.length,
          groupCount: fileGroups.length,
          nonDynamicAdSetIds
        });

        if (fileGroups.length > 0) {
          // GROUPED FLEXIBLE ADS: Create one ad per group per ad set
          console.log(`📦 Creating ${fileGroups.length} grouped flexible ads`);

          // Pre-compute ad names for each group
          const groupAdNames = fileGroups.map((group, groupIndex) => {
            const firstFileId = group[0];
            const firstFile = files.find(f => getFileId(f) === firstFileId) ||
              driveFiles.find(f => f.id === firstFileId);

            return computeAdNameFromFormula(
              firstFile || files[0] || driveFiles[0],
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
                jobId: frontendJobId
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
                s3Results,
                s3DriveResults,
                S3_UPLOAD_THRESHOLD,
                getFileId,
                isVideoFile,
                aspectRatioMap
              });

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              // NOW trigger SSE after formData is built
              setJobId(frontendJobId);

              promises.push(createAdApiCall(formData, API_BASE_URL));
              globalFileIndex++;
            });
          });

        } else {
          // UNGROUPED FLEXIBLE ADS: Send ALL files

          // Pre-compute ad name once for ungrouped flexible
          const ungroupedFlexibleAdName = computeAdNameFromFormula(
            files[0] || driveFiles[0],
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
              jobId: frontendJobId
            });

            // Append flexible ad fields
            appendFlexibleAdFields(formData, { adType: "flexible" });

            // Append all media files
            appendAllMediaFiles(formData, {
              files,
              smallDriveFiles,
              s3Results,
              s3DriveResults,
              S3_UPLOAD_THRESHOLD
            });

            // Add video thumbnail if provided
            if (thumbnail) {
              formData.append("thumbnail", thumbnail);
            }

            // Append shop destination
            appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

            // NOW trigger SSE after formData is built
            setJobId(frontendJobId);

            promises.push(createAdApiCall(formData, API_BASE_URL));
          });
        }
      }

      // ============================================================================
      // SECTION 3: DYNAMIC AD SETS
      // ============================================================================
      if (dynamicAdSetIds.length > 0) {
        // Pre-compute ad name for dynamic ads
        const dynamicAdName = computeAdNameFromFormula(
          files[0] || driveFiles[0],
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
            jobId: frontendJobId
          });

          // Append dynamic ad set fields
          appendDynamicAdSetFields(formData, { isCarouselAd, thumbnail });

          // Append all media files
          appendAllMediaFiles(formData, {
            files,
            smallDriveFiles,
            s3Results,
            s3DriveResults,
            S3_UPLOAD_THRESHOLD
          });

          // Append shop destination
          appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

          // NOW trigger SSE after formData is built
          setJobId(frontendJobId);

          promises.push(createAdApiCall(formData, API_BASE_URL));
        });
      }

      // ============================================================================
      // SECTION 4: NON-DYNAMIC AD SETS (Non-Carousel, Non-Flexible)
      // ============================================================================
      if (nonDynamicAdSetIds.length > 0 && !isCarouselAd && adType !== 'flexible') {
        nonDynamicAdSetIds.forEach((adSetId) => {
          const groupedFileIds = enablePlacementCustomization ? new Set(fileGroups.flat()) : new Set();
          const hasUngroupedFiles = (
            files.some(file => !groupedFileIds.has(getFileId(file)) && file.size <= S3_UPLOAD_THRESHOLD) ||
            smallDriveFiles.some(driveFile => !groupedFileIds.has(driveFile.id)) ||
            [...s3Results, ...s3DriveResults].some(s3File =>
              !(groupedFileIds.has(s3File.uniqueId) || groupedFileIds.has(s3File.id))
            )
          );

          let localIterationIndex = 0;

          // Process GROUPED files if placement customization is enabled
          if (enablePlacementCustomization && fileGroups.length > 0) {
            console.log("checking grouped files");

            // Pre-compute ad names for grouped files
            const groupedAdNames = fileGroups.map((group, groupIndex) => {
              const firstFileId = group[0];
              const firstFileForNaming = files.find(f => getFileId(f) === firstFileId) ||
                smallDriveFiles.find(f => f.id === firstFileId) ||
                [...s3Results, ...s3DriveResults].find(f => f.uniqueId === firstFileId || f.id === firstFileId);

              return computeAdNameFromFormula(
                firstFileForNaming || files[0] || driveFiles[0],
                localIterationIndex + groupIndex,
                link[0],
                jobData.formData.adNameFormulaV2
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
                jobId: frontendJobId
              });

              // Append group media files
              const groupVideoMetadata = appendGroupMediaFiles(formData, group, {
                files,
                smallDriveFiles,
                s3Results,
                s3DriveResults,
                S3_UPLOAD_THRESHOLD,
                getFileId,
                isVideoFile,
                aspectRatioMap
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

              // NOW trigger SSE after formData is built
              setJobId(frontendJobId);

              promises.push(createAdApiCall(formData, API_BASE_URL));
              localIterationIndex++;
            });
          }

          // Process UNGROUPED files
          if (hasUngroupedFiles) {
            // Pre-compute ad names for all ungrouped files
            const ungroupedLocalFiles = files.filter(file =>
              file.size <= S3_UPLOAD_THRESHOLD && !groupedFileIds.has(getFileId(file))
            );
            const ungroupedDriveFiles = smallDriveFiles.filter(driveFile =>
              !groupedFileIds.has(driveFile.id)
            );
            const ungroupedS3Files = [...s3Results, ...s3DriveResults].filter(s3File =>
              !(groupedFileIds.has(s3File.uniqueId) || groupedFileIds.has(s3File.id))
            );

            // Pre-compute ad names
            const localFileAdNames = ungroupedLocalFiles.map((file, index) =>
              computeAdNameFromFormula(file, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2)
            );

            localIterationIndex += ungroupedLocalFiles.length;

            const driveFileAdNames = ungroupedDriveFiles.map((driveFile, index) =>
              computeAdNameFromFormula(driveFile, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2)
            );

            localIterationIndex += ungroupedDriveFiles.length;

            const s3FileAdNames = ungroupedS3Files.map((s3File, index) =>
              computeAdNameFromFormula(s3File, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2)
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
                jobId: frontendJobId
              });

              // Append single image file
              appendSingleImageFile(formData, { file, thumbnail });

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              // NOW trigger SSE after formData is built
              setJobId(frontendJobId);

              promises.push(createAdApiCall(formData, API_BASE_URL));
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
                jobId: frontendJobId
              });

              // Append single drive file
              appendSingleDriveFile(formData, driveFile);

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              // NOW trigger SSE after formData is built
              setJobId(frontendJobId);

              promises.push(createAdApiCall(formData, API_BASE_URL));
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
                jobId: frontendJobId
              });

              // Append single S3 file
              appendSingleS3File(formData, s3File);

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              // NOW trigger SSE after formData is built
              setJobId(frontendJobId);

              promises.push(createAdApiCall(formData, API_BASE_URL));
            });
          }
        });
      }

      setLiveProgress({ completed: 0, succeeded: 0, failed: 0, total: promises.length });

      const trackedPromises = promises.map(promise =>
        promise
          .then(result => {
            setLiveProgress(prev => ({
              ...prev,
              completed: prev.completed + 1,
              succeeded: prev.succeeded + 1
            }));
            return result;
          })
          .catch(error => {
            setLiveProgress(prev => ({
              ...prev,
              completed: prev.completed + 1,
              failed: prev.failed + 1
            }));
            throw error;
          })
      );


      // ============================================================================
      // EXECUTE ALL API CALLS
      // ============================================================================
      // Replace the existing Promise.all block with:
      try {
        const responses = await Promise.allSettled(trackedPromises); // 🆕 Changed from promises to trackedPromises


        const successCount = responses.filter(r => r.status === 'fulfilled').length;
        const failureCount = responses.filter(r => r.status === 'rejected').length;
        const totalCount = responses.length;

        const errorMessages = responses
          .filter(r => r.status === 'rejected')
          .map((r, index) => {
            let errorMsg = 'Unknown error';
            if (r.reason?.response?.data?.error) {
              errorMsg = r.reason.response.data.error;
            } else if (r.reason?.response?.data) {
              errorMsg = r.reason.response.data;
            } else if (r.reason?.message) {
              errorMsg = r.reason.message;
            }
            return errorMsg;
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
            errorMessages // NEW: Send error messages

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

    if (files.length === 0 && driveFiles.length === 0) {
      toast.error("Please upload at least one file or import from Drive");
      return;
    }

    // Capture current form state as a job
    const newJob = captureFormDataAsJob();
    // Add to queue
    setJobQueue(prev => [...prev, newJob]);

    // Clear form immediately
    // setFiles([]);
    // setDriveFiles([]);
    // setVideoThumbs({});
    // setThumbnail(null);

    // setFileGroups([]);
    // setEnablePlacementCustomization(false);
    if (!preserveMedia) {
      setFiles([]);
      setDriveFiles([]);
      setVideoThumbs({});
      setThumbnail(null);
      setFileGroups([]);
      setEnablePlacementCustomization(false);
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

                {completedJobs.map((job) => (
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

                      <div className="flex-1 min-w-0">
                        <p
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
                              const errorCounts = job.errorMessages.reduce((acc, errorMsg) => {
                                acc[errorMsg] = (acc[errorMsg] || 0) + 1;
                                return acc;
                              }, {});
                              return Object.entries(errorCounts).map(([errorMsg, count], idx) => (
                                <li key={idx} className="break-words">
                                  {errorMsg}
                                  {count > 1 && (
                                    <span className="ml-1 text-red-500 font-medium">
                                      (×{count})
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
                ))}

                {/* Current Job */}
                {currentJob && (
                  <div className="p-3.5 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="flex-shrink-0">
                        <UploadIcon className="w-6 h-6" />
                      </div>
                      <p className="flex-1 text-sm font-medium text-gray-700 break-all">
                        Posting {currentJob.adCount} Ad{currentJob.adCount !== 1 ? 's' : ''} to {(() => {
                          if (currentJob.formData.duplicateAdSet) {
                            return currentJob.formData.newAdSetName || 'New Ad Set';
                          } else {
                            const selectedAdSetIds = currentJob.formData.selectedAdSets;
                            if (selectedAdSetIds.length === 1) {
                              const adSet = adSets.find(a => a.id === selectedAdSetIds[0]);
                              return adSet?.name || 'selected adset';
                            } else {
                              return `${selectedAdSetIds.length} adsets`;
                            }
                          }
                        })()}
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
                      Queued {job.adCount} ad{job.adCount !== 1 ? 's' : ''} to {adSets.find(a => a.id === job.formData.selectedAdSets[0])?.name || 'New Adset'}
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
        <CardTitle className="flex items-center justify-between w-full">
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
                    <span className="text-orange-700">(Beta)</span>
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
          <div className="space-y-10">
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
                      maxWidth: "none",
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
                      maxWidth: "none"
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
                    Setup Ad Name Formula
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
                    Setup Templates
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
                              const fileCount = files.length + driveFiles.length;
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
                            const fileCount = files.length + driveFiles.length; // ← Use file count!
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
                            console.log('📝 Updating all headlines to:', newHeadlines);
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
                    {!showCustomLink && (
                      <Select
                        value={link[0] || ""}
                        onValueChange={(value) => setLink([value])}
                        disabled={!isLoggedIn || availableLinks.length === 0}
                      >
                        <SelectTrigger className="border border-gray-400 rounded-xl bg-white shadow">
                          <SelectValue placeholder={availableLinks.length === 0 ? "No links available - Add links in Settings" : "Select a link"} />
                        </SelectTrigger>
                        <SelectContent className="bg-white shadow-lg rounded-xl">
                          {availableLinks.map((linkObj, index) => (
                            <SelectItem
                              key={index}
                              value={linkObj.url}
                              className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-xl mx-2 my-1 ml-4"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate max-w-[300px]">{linkObj.url}</span>
                                {linkObj.isDefault && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
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
                        {showCustomLink && (
                          <div className="w-full">
                            <Input
                              type="url"
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

                        {/* Checkbox toggle */}
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
                            Use custom link
                          </label>
                        </div>
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
                            type="url"
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

            <div className="space-y-2">
              <Label className="block">Upload Media</Label>
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
          </div>
          <div style={{ marginTop: "10px", marginBottom: "1rem" }}>
            <Button type="button" onClick={handleDriveClick} className="w-full bg-zinc-800 border border-gray-300 hover:bg-blue-700 text-white rounded-xl h-[48px]">
              <img
                src="https://api.withblip.com/googledrive.png"
                alt="Drive Icon"
                className="h-4 w-4"
              />
              Choose Files from Google Drive

            </Button>
            <div className="text-xs text-gray-500 text-left mt-0.5">
              Drive files upload 5X faster
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


          <div className="space-y-1">
            <Button
              type="submit"
              className="w-full h-12 bg-neutral-950 hover:bg-blue-700 text-white rounded-xl"
              disabled={
                !isLoggedIn ||
                (selectedAdSets.length === 0 && !duplicateAdSet) ||
                (files.length === 0 && driveFiles.length === 0) ||
                (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === "")) ||
                (adType === 'carousel' && (files.length + driveFiles.length) < 2) ||
                (adType === 'flexible' && fileGroups.length === 0 && (files.length + driveFiles.length) > 10) ||
                (showShopDestinationSelector && !selectedShopDestination) ||
                (!showCustomLink && !link[0]) ||
                (showCustomLink && !customLink.trim())
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
            {isCarouselAd && (files.length + driveFiles.length) > 0 && (files.length + driveFiles.length) < 2 && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Carousel ads require at least 2 files. You have {files.length + driveFiles.length}.
              </div>
            )}

            {/* Validation message for missing link */}
            {((!showCustomLink && !link[0]) || (showCustomLink && !customLink.trim())) && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Please provide a link URL
              </div>
            )}

          </div>
          {/* <div
            className={cn(
              "flex items-center space-x-2 p-2 rounded-xl transition-colors duration-150", // Base styling: padding, rounded corners, transition
              launchPaused
                ? "bg-red-50 border border-red-300" // Conditional: light red background and border if PAUSED
                : "border border-transparent" // Default: transparent border (or can be themed)
            )}
          >
            <Checkbox
              id="launchPaused"
              checked={launchPaused}
              onCheckedChange={setLaunchPaused}
              disabled={!isLoggedIn}
              className={cn(
                "rounded-md", // Or "rounded-lg", "rounded-full"
                "focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0", // Remove focus ring
                launchPaused ? "data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500" : ""
              )} // Optional: style checkbox itself when checked & paused
            />
            <Label
              htmlFor="launchPaused"
              className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                launchPaused ? "text-red-600" : "" // Conditional: red text if PAUSED
              )}
            >
              Publish ads TURNED OFF
            </Label>
          </div> */}

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
                  className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500"

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
                  className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-red-500 data-[state=checked]:text-red-500"

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
              Preserve Media on Upload
            </Label>
          </div>


        </form>
      </CardContent>
    </Card >
  )
}


