"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
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
import { ChevronDown, Loader2, Plus, Trash2, Upload, CirclePlus, ChevronsUpDown, RefreshCcw } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAuth } from "@/lib/AuthContext"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import ShopDestinationSelector from "@/components/shop-destination-selector"
// import { Infotooltip } from "./ui/infotooltip"
import { v4 as uuidv4 } from 'uuid';
import ConfigIcon from '@/assets/icons/plus.svg?react';
import FacebookIcon from '@/assets/icons/fb.svg?react';
import InstagramIcon from '@/assets/icons/plus.svg?react';
import LabelIcon from '@/assets/icons/label.svg?react';
import TemplateIcon from '@/assets/icons/file.svg?react';
import LinkIcon from '@/assets/icons/link.svg?react';
import CTAIcon from '@/assets/icons/cta.svg?react';
import { useNavigate } from "react-router-dom"
import CogIcon from '@/assets/icons/cog.svg?react';
import pLimit from 'p-limit';


const useAdCreationProgress = (jobId, isCreatingAds) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!jobId) return;

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
    const maxJobNotFoundRetries = 30; // More patient for job not found (15 seconds total)
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
          setStatus('error');
          setMessage('Job not found. The task may have expired or been cancelled.');
        }
        return;
      }

      jobNotFoundCount++;
      // Shorter delay for job not found since server is responding
      const delay = Math.min(baseRetryDelay, 1000);

      console.log(`⏳ Job not found - Retrying in ${delay}ms... (attempt ${jobNotFoundCount}/${maxJobNotFoundRetries})`);

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

        eventSource = new EventSource(`https://api.withblip.com/api/progress/${jobId}`);

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

              // Auto-cleanup on job completion
              if (data.status === 'complete' || data.status === 'error') {
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

  // Reset state when ad creation stops
  useEffect(() => {
    if (!isCreatingAds) {
      setProgress(0);
      setMessage('');
      setStatus('idle');
    }
  }, [isCreatingAds]);

  return { progress, message, status };
};

// //Progress Tracker Hook
// const useAdCreationProgress = (jobId, isCreatingAds) => {
//   const [progress, setProgress] = useState(0);
//   const [message, setMessage] = useState('');
//   const [status, setStatus] = useState('idle');

//   useEffect(() => {
//     if (!jobId) return;

//     // console.log('🔄 New jobId detected, resetting state:', jobId);
//     setProgress(0);
//     setMessage('');
//     setStatus('idle');

//     let retryCount = 0;
//     const baseRetryDelay = 500;
//     const maxRetryDelay = 5000;
//     let isConnecting = true;

//     const connectSSE = () => {
//       if (!isConnecting) return;

//       // console.log(`🔌 SSE attempt #${retryCount + 1} for:`, jobId);
//       const eventSource = new EventSource(`https://api.withblip.com/api/progress/${jobId}`);

//       eventSource.onmessage = (event) => {
//         const data = JSON.parse(event.data);
//         // console.log('📨 Raw SSE data received:', data);

//         if (data.message === 'Job not found') {
//           // console.log(`❌ Job not found, closing connection...`);
//           eventSource.close();
//           retryCount++;

//           const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount - 1), maxRetryDelay);

//           // console.log(`⏳ Retrying in ${delay}ms... (attempt ${retryCount})`);
//           setTimeout(() => {
//             if (isConnecting) {
//               connectSSE();
//             }
//           }, delay);
//           return;
//         }

//         retryCount = 0; // Reset retry counter on success
//         // console.log('✅ Setting state - Progress:', data.progress, 'Status:', data.status);
//         setProgress(data.progress);
//         setMessage(data.message);
//         setStatus(data.status);

//         if (data.status === 'complete' || data.status === 'error') {
//           // console.log('🏁 Job finished, closing SSE connection');
//           eventSource.close();
//           isConnecting = false;
//         }
//       };

//       eventSource.onerror = (error) => {
//         console.error('❌ SSE Error:', error);
//         eventSource.close();

//         if (isConnecting) {
//           retryCount++;
//           const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount - 1), maxRetryDelay);
//           setTimeout(() => {
//             if (isConnecting) {
//               connectSSE();
//             }
//           }, delay);
//         }
//       };
//     };

//     connectSSE();

//     return () => {
//       isConnecting = false;
//     };
//   }, [jobId]);



//   useEffect(() => {

//     if (!isCreatingAds) {
//       // console.log('🧹 Job completely finished, resetting hook state');
//       setProgress(0);
//       setMessage('');
//       setStatus('idle');
//     }
//   }, [isCreatingAds]);


//   return { progress, message, status };
// };

export default function AdCreationForm({
  isLoading,
  setIsLoading,
  pages,
  setPages,
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
  enablePlacementCustomization,
  setEnablePlacementCustomization,
  fileGroups,
  setFileGroups,
  adAccountSettings
}) {
  // Local state
  const navigate = useNavigate()
  const [openPage, setOpenPage] = useState(false)
  const [googleAuthStatus, setGoogleAuthStatus] = useState({
    checking: true,
    authenticated: false,
    accessToken: null
  });

  //gogle drive pickers
  const [accessToken, setAccessToken] = useState(null)

  //S3 States
  const [uploadingToS3, setUploadingToS3] = useState(false)



  const [pageSearchValue, setPageSearchValue] = useState("")
  // const [isDuplicating, setIsDuplicating] = useState(false)
  const { isLoggedIn } = useAuth()
  const [openInstagram, setOpenInstagram] = useState(false)
  const [instagramSearchValue, setInstagramSearchValue] = useState("")
  const [publishPending, setPublishPending] = useState(false);

  //Porgress Trackers
  const [isCreatingAds, setIsCreatingAds] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const { progress: trackedProgress, message: trackedMessage, status } = useAdCreationProgress(jobId, isCreatingAds);
  const [showCompletedView, setShowCompletedView] = useState(false);




  // const [isCarouselAd, setIsCarouselAd] = useState(false);
  const [applyTextToAllCards, setApplyTextToAllCards] = useState(false);
  const [applyHeadlinesToAllCards, setApplyHeadlinesToAllCards] = useState(false);


  // Upload large file to S3
  const uploadToS3 = async (file) => {
    try {
      // Get presigned URL
      const response = await axios.post(
        "https://api.withblip.com/auth/get-upload-url",
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        },
        { withCredentials: true }
      )

      const { uploadUrl, publicUrl } = response.data

      // Upload directly to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        }
      });
      // console.log(publicUrl);
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        s3Url: publicUrl,
        isS3Upload: true
      }
    } catch (error) {
      console.error('S3 upload failed:', error)
      throw new Error(`Failed to upload ${file.name} to S3`)
    }
  }



  async function uploadDriveFileToS3(file) {
    const driveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;



    const res = await fetch("https://api.withblip.com/api/upload-from-drive", {
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
    return data.s3Url;
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
  ]

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
    try {
      const res = await fetch("https://api.withblip.com/auth/fetch-pages", {
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
    }
  };

  useEffect(() => {
    if (jobId) {
      setProgress(trackedProgress);
      setProgressMessage(trackedMessage);

      if (status === 'complete') {
        // Don't automatically close - just show the completed view
        setShowCompletedView(true);
        // toast.success("Ads created successfully!");
      } else if (status === 'error') {
        // For errors, you might want to also show a close button
        setShowCompletedView(true);
        toast.error("Error creating ads");
      }
    }
  }, [trackedProgress, trackedMessage, status, jobId]);


  useEffect(() => {
    const adName = computeAdName(null, adValues.dateType);
    setAdName(adName);
  }, [adValues, adOrder, selectedItems]); // Remove customTextValue, add adValues



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
          "https://api.withblip.com/auth/google/status",
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



  const createPicker = useCallback((token) => {
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

    const allFolders = new google.picker.DocsView()
      .setIncludeFolders(true)
      .setMimeTypes(mimeTypes)
      .setSelectFolderEnabled(false);

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

    const picker = new google.picker.PickerBuilder()
      .addView(myFolders)
      .addView(allFolders)
      .addView(sharedDriveFolders)
      .addView(onlySharedFolders)
      .setOAuthToken(token)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
      .hideTitleBar()
      .setAppId(102886794705)
      .setCallback((data) => {
        if (data.action !== "picked") return;

        const selected = data.docs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          size: doc.sizeBytes,
          accessToken: token
        }));

        setDriveFiles((prev) => [...prev, ...selected]);
        if (data.action === "picked" || data.action === "cancel") {
          picker.setVisible(false);
        }
      })
      .build();

    picker.setVisible(true);
  }, [setDriveFiles]);


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
        "https://api.withblip.com/auth/google/status",
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
      "https://api.withblip.com/auth/google?popup=true",
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
      toast.error("Google login timed out.");
    }, 65000);

    const listener = (event) => {
      if (event.origin !== "https://api.withblip.com") return;

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
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);



  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })


  const getVideoAspectRatio = async (file) => {
    if (file.mimeType && file.mimeType.startsWith('video/')) {
      // For Drive files
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = `https://drive.google.com/uc?id=${file.id}&export=download`;

        video.addEventListener('loadedmetadata', () => {
          resolve(video.videoWidth / video.videoHeight);
        });

        video.addEventListener('error', () => {
          resolve(16 / 9); // Default aspect ratio
        });

        // Timeout fallback
        setTimeout(() => resolve(16 / 9), 5000);
      });
    } else if (file.type && file.type.startsWith('video/')) {
      // For local files
      return new Promise((resolve, reject) => {
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



  // Generate thumbnail from video file
  const generateThumbnail = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const video = document.createElement("video")
      video.preload = "metadata"
      video.src = url
      video.muted = true
      video.playsInline = true
      video.currentTime = 0.1
      video.addEventListener("loadeddata", () => {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataURL = canvas.toDataURL()
        URL.revokeObjectURL(url)
        resolve(dataURL)
      })
      video.addEventListener("error", () => {
        reject("Error generating thumbnail")
      })
    })
  }, [])





  const getDriveVideoThumbnail = (driveFile) => {
    if (!driveFile.mimeType.startsWith('video/')) return null;

    // Google Drive provides thumbnails for videos via this URL
    return `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w400-h300`;
  };


  useEffect(() => {
    const processThumbnails = async () => {
      const videoFiles = files.filter(file =>
        file.type.startsWith("video/") && !videoThumbs[file.name]
      );

      if (videoFiles.length === 0) return;

      // Adaptive batch size
      const BATCH_SIZE = videoFiles.length <= 3 ? videoFiles.length
        : videoFiles.length <= 10 ? 3
          : 4; // Slightly larger batches for many files

      // Show initial progress if many files
      if (videoFiles.length > 5) {
        toast.info(`Generating thumbnails for ${videoFiles.length} videos...`);
      }

      for (let i = 0; i < videoFiles.length; i += BATCH_SIZE) {
        const batch = videoFiles.slice(i, i + BATCH_SIZE);

        const thumbnailPromises = batch.map(file =>
          generateThumbnail(file)
            .then(thumb => ({ name: file.name, thumb }))
            .catch(err => {
              console.error(`Thumbnail error for ${file.name}:`, err);
              return null;
            })
        );

        const results = await Promise.all(thumbnailPromises);

        setVideoThumbs(prev => {
          const updates = {};
          results.forEach(result => {
            if (result) updates[result.name] = result.thumb;
          });
          return { ...prev, ...updates };
        });

        // Shorter pause for better UX
        if (i + BATCH_SIZE < videoFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Handle Drive files...
    };

    processThumbnails();
  }, [files, driveFiles, videoThumbs, generateThumbnail, getDriveVideoThumbnail, setVideoThumbs]);




  useEffect(() => {
    if (!uploadingToS3 && publishPending) {
      setPublishPending(false);
      handleCreateAd(new Event('submit')); // fake event to reuse logic
    }
  }, [uploadingToS3, publishPending]);

  // Functions for managing dynamic input fields
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

  const handleCloseProgressPopup = () => {
    // Reset all the states that were being reset automatically
    setIsCreatingAds(false);
    setJobId(null);
    setFiles([]);
    setDriveFiles([]);
    setVideoThumbs({});
    setFileGroups([]);
    setEnablePlacementCustomization(false);
    setShowCompletedView(false);
    setProgress(0);
    setProgressMessage('');
  };



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
        if (fileType.startsWith("image/")) return "static";
        if (fileType.startsWith("video/")) return "video";
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





  const duplicateAdSetRequest = async (adSetId, campaignId, adAccountId) => {
    const response = await axios.post(
      "https://api.withblip.com/auth/duplicate-adset",
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


  const handleCreateAd = async (e) => {
    e.preventDefault();

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
        const videoFiles = allFiles.filter(file =>
          file.type?.startsWith('video/') || file.mimeType?.startsWith('video/')
        );

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
                if (aspectRatio) {
                  const key = file.id || file.name;
                  return { key, aspectRatio };
                }
                return null;
              } catch (error) {
                console.error(`Failed to get aspect ratio for ${file.name}:`, error);
                const key = file.id || file.name;
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



    setIsLoading(true);
    // ✅ Step: Upload large local video files to S3 before creating ads
    const largeFiles = files.filter((file) =>
      file.type.startsWith("video/") && file.size > 100 * 1024 * 1024
    );

    // Step: Upload large Drive videos to S3
    const largeDriveFiles = driveFiles.filter(file =>
      file.mimeType.startsWith("video/") && file.size > 100 * 1024 * 1024
    );

    let s3Results = [];
    const s3DriveResults = [];

    const totalLargeFiles = largeFiles.length + largeDriveFiles.length;
    if (totalLargeFiles > 0) {
      setProgressMessage(`Uploading ${totalLargeFiles} videos...`);

      // Set up concurrency limiter
      const limit = pLimit(3);

      // Upload regular large files with concurrency control
      const uploadPromises = largeFiles.map(file =>
        limit(() => uploadToS3(file)) // Your existing function unchanged
      );

      const results = await Promise.allSettled(uploadPromises);

      // Process regular file results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const uploadResult = result.value;
          if (enablePlacementCustomization && aspectRatioMap[largeFiles[index].name]) {
            uploadResult.aspectRatio = aspectRatioMap[largeFiles[index].name];
          }
          s3Results.push(uploadResult);
        } else {
          toast.error(`Failed to upload ${largeFiles[index].name}`);
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
          const s3Url = result.value;
          const uploadResult = {
            ...largeDriveFiles[index],
            s3Url
          };
          // Include aspect ratio if we have it
          if (enablePlacementCustomization && aspectRatioMap[largeDriveFiles[index].id]) {
            uploadResult.aspectRatio = aspectRatioMap[largeDriveFiles[index].id];
          }
          s3DriveResults.push(uploadResult);
        } else {
          toast.error(`Failed to upload Drive video: ${largeDriveFiles[index].name}`);
          console.error("❌ Drive to S3 upload failed", result.reason);
        }
      });

      setProgress(50);
      setProgressMessage('S3 uploads complete! Creating ads...');
      toast.success("All video files uploaded!");
    }

    // 🔧 NOW start the actual job (50-100% progress)
    const frontendJobId = uuidv4();
    // console.log(frontendJobId);
    setJobId(frontendJobId); // This triggers SSE


    const smallDriveFiles = driveFiles.filter(file =>
      !(file.mimeType.startsWith("video/") && file.size > 100 * 1024 * 1024)
    );


    // Determine the ad set(s) to use: if "Create New AdSet" is chosen, duplicate it
    let finalAdSetIds = [...selectedAdSets];
    if (duplicateAdSet) {
      try {
        const newAdSetId = await duplicateAdSetRequest(duplicateAdSet, selectedCampaign, selectedAdAccount, newAdSetName.trim());
        finalAdSetIds = [newAdSetId];
      } catch (error) {
        toast.error("Error duplicating ad set: " + (error.message || "Unknown error"));
        setIsLoading(false);
        return;
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
      // console.log("reached validation check");
      const totalFiles = files.length + driveFiles.length + s3Results.length + s3DriveResults.length;
      // console.log("totalFiles", totalFiles);
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

    try {
      const promises = [];
      // console.log("is carousel ad", isCarouselAd);
      // console.log("dynamic adset length", dynamicAdSetIds.length);

      // FIRST: Handle carousel ads (completely separate from dynamic/non-dynamic)
      if (isCarouselAd && dynamicAdSetIds.length === 0) {
        if (selectedAdSets.length === 0 && !duplicateAdSet) {
          toast.error("Please select at least one ad set for carousel");
          return;
        }
        // console.log("reached carousel handling block for nonDynamicAdsets,", nonDynamicAdSetIds);
        // For carousel, process each selected ad set separately (one call per ad set)
        nonDynamicAdSetIds.forEach((adSetId) => {
          // console.log("🎠 Creating carousel for adSetId:", adSetId);
          const formData = new FormData();
          formData.append("adName", computeAdName(files[0] || driveFiles[0], adValues.dateType));
          formData.append("headlines", JSON.stringify(headlines));
          formData.append("descriptions", JSON.stringify(descriptions));
          formData.append("messages", JSON.stringify(messages));
          formData.append("adAccountId", selectedAdAccount);
          formData.append("adSetId", adSetId);
          formData.append("pageId", pageId);
          formData.append("instagramAccountId", instagramAccountId);
          formData.append("link", JSON.stringify(link));
          formData.append("cta", cta);
          formData.append("isCarouselAd", isCarouselAd);
          formData.append("launchPaused", launchPaused);
          formData.append("enablePlacementCustomization", false);
          formData.append("jobId", frontendJobId);
          // console.log("jobId in attached form", frontendJobId);

          // Add all local files (small ones)
          files.forEach((file) => {
            if (file.size <= 100 * 1024 * 1024) {
              formData.append("mediaFiles", file);
            }
          });

          // Add small drive files
          smallDriveFiles.forEach((driveFile) => {
            formData.append("driveFiles", JSON.stringify({
              id: driveFile.id,
              name: driveFile.name,
              mimeType: driveFile.mimeType,
              accessToken: driveFile.accessToken
            }));
          });

          // Add S3 URLs for large files
          [...s3Results, ...s3DriveResults].forEach((s3File) => {
            formData.append("s3VideoUrls", s3File.s3Url);
          });

          if (selectedShopDestination && showShopDestinationSelector) {
            formData.append("shopDestination", selectedShopDestination);
            formData.append("shopDestinationType", selectedShopDestinationType);
          }
          // console.log("reached backend endpoint");

          promises.push(
            axios.post("https://api.withblip.com/auth/create-ad", formData, {
              withCredentials: true,
              headers: { "Content-Type": "multipart/form-data" },
            })
          );
        });
      }

      // Process dynamic adsets
      if (dynamicAdSetIds.length > 0) {
        // For each dynamic adset, create ONE request with ALL media files
        dynamicAdSetIds.forEach((adSetId) => {
          const formData = new FormData();
          formData.append("adName", computeAdName(files[0] || driveFiles[0], adValues.dateType));
          formData.append("headlines", JSON.stringify(headlines));
          formData.append("descriptions", JSON.stringify(descriptions));
          formData.append("messages", JSON.stringify(messages));
          formData.append("adAccountId", selectedAdAccount);
          formData.append("adSetId", adSetId);
          formData.append("pageId", pageId);
          formData.append("instagramAccountId", instagramAccountId);
          formData.append("link", JSON.stringify(link));
          formData.append("cta", cta);
          formData.append("isCarouselAd", isCarouselAd);
          formData.append("enablePlacementCustomization", false);
          formData.append("launchPaused", launchPaused);
          formData.append("jobId", frontendJobId);

          // Add all local files
          files.forEach((file) => {
            if (file.size <= 100 * 1024 * 1024) {
              formData.append("mediaFiles", file);
            }
          });

          //Add Drive Files
          smallDriveFiles.forEach((driveFile) => {
            formData.append("driveFiles", JSON.stringify({
              id: driveFile.id,
              name: driveFile.name,
              mimeType: driveFile.mimeType,
              accessToken: driveFile.accessToken
            }));
          });

          //add large file URLs
          [...s3Results, ...s3DriveResults].forEach((s3File) => {
            formData.append("s3VideoUrls", s3File.s3Url);
          });


          // For video dynamic creative, use the single thumbnail (if provided)
          if (thumbnail) {
            formData.append("thumbnail", thumbnail);
          }
          // Add shop destination if needed
          if (selectedShopDestination && showShopDestinationSelector) {
            formData.append("shopDestination", selectedShopDestination)
            formData.append("shopDestinationType", selectedShopDestinationType)
          }



          promises.push(
            axios.post("https://api.withblip.com/auth/create-ad", formData, {
              withCredentials: true,
              headers: { "Content-Type": "multipart/form-data" },
            })
          );
        });
      }


      if (nonDynamicAdSetIds.length > 0 && !isCarouselAd) {
        nonDynamicAdSetIds.forEach((adSetId) => {

          const groupedFileIds = enablePlacementCustomization ? new Set(fileGroups.flat()) : new Set();


          const hasUngroupedFiles = (
            files.some(file => !groupedFileIds.has(file.name) && file.size <= 100 * 1024 * 1024) ||
            smallDriveFiles.some(driveFile => !groupedFileIds.has(driveFile.id)) ||
            [...s3Results, ...s3DriveResults].some(s3File =>
              !groupedFileIds.has(s3File.name) && !groupedFileIds.has(s3File.id)
            )
          );

          // NEW: Check if placement customization is enabled
          if (enablePlacementCustomization && fileGroups.length > 0) {
            // Process ONLY grouped files

            fileGroups.forEach((group, groupIndex) => {
              const firstFileId = group[0];
              let firstFileForNaming = null;

              // Find the actual file object for the first file in this group
              firstFileForNaming = files.find(f => (f.isDrive ? f.id : f.name) === firstFileId) ||
                smallDriveFiles.find(f => f.id === firstFileId) ||
                [...s3Results, ...s3DriveResults].find(f => f.name === firstFileId);

              const formData = new FormData();
              formData.append("adName", computeAdName(firstFileForNaming || files[0] || driveFiles[0], adValues.dateType)); // ✅ FIXED
              formData.append("headlines", JSON.stringify(headlines));
              formData.append("descriptions", JSON.stringify(descriptions));
              formData.append("messages", JSON.stringify(messages));
              formData.append("adAccountId", selectedAdAccount);
              formData.append("adSetId", adSetId);
              formData.append("pageId", pageId);
              formData.append("instagramAccountId", instagramAccountId);
              formData.append("link", JSON.stringify(link));
              formData.append("cta", cta);
              formData.append("enablePlacementCustomization", enablePlacementCustomization);
              formData.append("launchPaused", launchPaused);
              formData.append("jobId", frontendJobId);

              const groupVideoMetadata = [];

              group.forEach(fileId => {
                const file = files.find(f => (f.isDrive ? f.id : f.name) === fileId);
                if (file && !file.isDrive && file.size <= 100 * 1024 * 1024) {
                  formData.append("mediaFiles", file);
                  if (file.type.startsWith("video/")) {
                    groupVideoMetadata.push({
                      fileName: file.name,
                      aspectRatio: aspectRatioMap[file.name] || 16 / 9
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
                  if (driveFile.mimeType.startsWith("video/")) {
                    groupVideoMetadata.push({
                      driveId: driveFile.id,
                      aspectRatio: aspectRatioMap[driveFile.id] || 16 / 9
                    });
                  }
                }
              });

              // Add S3 files from this group
              group.forEach(fileId => {
                const s3File = [...s3Results, ...s3DriveResults].find(f => {
                  // Match by original file name or Drive ID
                  return (f.name && f.name === fileId) || (f.id && f.id === fileId);
                });
                if (s3File) {
                  formData.append("s3VideoUrls", s3File.s3Url);
                  if (s3File.mimeType?.startsWith("video/") || s3File.type?.startsWith("video/")) {
                    groupVideoMetadata.push({
                      s3Url: s3File.s3Url,
                      aspectRatio: s3File.aspectRatio || 16 / 9
                    });
                  }
                }
              });

              // Only add video metadata if we have any videos
              if (groupVideoMetadata.length > 0) {
                formData.append("videoMetadata", JSON.stringify(groupVideoMetadata));
              }


              if (selectedShopDestination && showShopDestinationSelector) {
                formData.append("shopDestination", selectedShopDestination);
                formData.append("shopDestinationType", selectedShopDestinationType);
              }

              formData.append("totalGroups", fileGroups.length);
              formData.append("currentGroupIndex", groupIndex + 1);
              formData.append("hasUngroupedFiles", hasUngroupedFiles);


              promises.push(
                axios.post("https://api.withblip.com/auth/create-ad", formData, {
                  withCredentials: true,
                  headers: { "Content-Type": "multipart/form-data" },
                })
              );
            });
          }

          // const groupedFileIds = enablePlacementCustomization ? new Set(fileGroups.flat()) : new Set();
          // const hasUngroupedFiles = (
          //   files.some(file => !groupedFileIds.has(file.name) && file.size <= 100 * 1024 * 1024) ||
          //   smallDriveFiles.some(driveFile => !groupedFileIds.has(driveFile.id)) ||
          //   [...s3Results, ...s3DriveResults].some(s3File =>
          //     !groupedFileIds.has(s3File.name) && !groupedFileIds.has(s3File.id)
          //   )
          // );


          if (hasUngroupedFiles) {
            // Regular processing - one ad per file

            // Handle local files
            files.forEach((file, index) => {
              if (file.size > 100 * 1024 * 1024 || groupedFileIds.has(file.name)) return; // Skip large files (already handled via S3)
              const formData = new FormData();
              formData.append("adName", computeAdName(file, adValues.dateType, index));
              formData.append("headlines", JSON.stringify(headlines));
              formData.append("descriptions", JSON.stringify(descriptions));
              formData.append("messages", JSON.stringify(messages));
              formData.append("imageFile", file);
              formData.append("adAccountId", selectedAdAccount);
              formData.append("adSetId", adSetId);
              formData.append("pageId", pageId);
              formData.append("instagramAccountId", instagramAccountId);
              formData.append("link", JSON.stringify(link));
              formData.append("cta", cta);
              formData.append("enablePlacementCustomization", false);
              if (thumbnail) {
                formData.append("thumbnail", thumbnail);
              }
              if (selectedShopDestination && showShopDestinationSelector) {
                formData.append("shopDestination", selectedShopDestination);
                formData.append("shopDestinationType", selectedShopDestinationType);
              }
              formData.append("launchPaused", launchPaused);
              formData.append("jobId", frontendJobId);

              promises.push(
                axios.post("https://api.withblip.com/auth/create-ad", formData, {
                  withCredentials: true,
                  headers: { "Content-Type": "multipart/form-data" },
                })
              );
            });

            // Handle small drive files
            smallDriveFiles.forEach((driveFile, index) => {
              if (groupedFileIds.has(driveFile.id)) return;
              const formData = new FormData();
              formData.append("adName", computeAdName(driveFile, adValues.dateType, index));
              formData.append("headlines", JSON.stringify(headlines));
              formData.append("descriptions", JSON.stringify(descriptions));
              formData.append("messages", JSON.stringify(messages));
              formData.append("adAccountId", selectedAdAccount);
              formData.append("adSetId", adSetId);
              formData.append("pageId", pageId);
              formData.append("instagramAccountId", instagramAccountId);
              formData.append("link", JSON.stringify(link));
              formData.append("cta", cta);
              formData.append("enablePlacementCustomization", false);
              formData.append("driveFile", "true");
              formData.append("driveId", driveFile.id);
              formData.append("driveMimeType", driveFile.mimeType);
              formData.append("driveAccessToken", driveFile.accessToken);
              formData.append("driveName", driveFile.name);
              if (selectedShopDestination && showShopDestinationSelector) {
                formData.append("shopDestination", selectedShopDestination);
                formData.append("shopDestinationType", selectedShopDestinationType);
              }
              formData.append("launchPaused", launchPaused);
              formData.append("jobId", frontendJobId);

              promises.push(
                axios.post("https://api.withblip.com/auth/create-ad", formData, {
                  withCredentials: true,
                  headers: { "Content-Type": "multipart/form-data" },
                })
              );
            });

            // Handle S3 uploaded files
            [...s3Results, ...s3DriveResults].forEach((s3File, index) => {
              if (groupedFileIds.has(s3File.name) || groupedFileIds.has(s3File.id)) {
                return; // Skip grouped files
              }
              const formData = new FormData();
              formData.append("adName", computeAdName(s3File, adValues.dateType, index));
              formData.append("headlines", JSON.stringify(headlines));
              formData.append("descriptions", JSON.stringify(descriptions));
              formData.append("messages", JSON.stringify(messages));
              formData.append("s3VideoUrl", s3File.s3Url);
              formData.append("adAccountId", selectedAdAccount);
              formData.append("adSetId", adSetId);
              formData.append("pageId", pageId);
              formData.append("instagramAccountId", instagramAccountId);
              formData.append("link", JSON.stringify(link));
              formData.append("cta", cta);
              formData.append("enablePlacementCustomization", false);
              if (selectedShopDestination && showShopDestinationSelector) {
                formData.append("shopDestination", selectedShopDestination);
                formData.append("shopDestinationType", selectedShopDestinationType);
              }
              formData.append("launchPaused", launchPaused);
              formData.append("jobId", frontendJobId);

              promises.push(
                axios.post("https://api.withblip.com/auth/create-ad", formData, {
                  withCredentials: true,
                  headers: { "Content-Type": "multipart/form-data" },
                })
              );
            });

          } // Close else block
        }); // Close forEach
      } // Close if condition

      // console.log('🚀 Starting API calls (Promise.all) now');
      const responses = await Promise.all(promises);
      toast.success("Ads created successfully!");
      // setIsCreatingAds(false);
    } catch (error) {
      let errorMessage = "Unknown error occurred";

      if (typeof error.response?.data === "string") {
        errorMessage = error.response.data;
      } else if (error.response?.data?.error?.code === 2 && error.response?.data?.error?.is_transient) {
        // Facebook internal transient error
        errorMessage = "Facebook's server had a temporary issue. Please try again in a few seconds.";
      } else if (error.response?.data?.error?.message) {
        // Fallback to Facebook-provided message
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(`Error uploading ads: ${errorMessage}`);
      console.error("Error uploading ads:", error.response?.data || error);
      console.error("Error uploading ads:", error.response?.data || error);
      // setIsCreatingAds(false);
      setJobId(null);
      selectedAdSets
    } finally {
      setIsLoading(false);
    }
  }





  return (
    <Card className=" !bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-md rounded-2xl">
      {isCreatingAds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] py-4 px-6 shadow-xl max-w-md w-full mx-4">
            <div className="text-left">
              {!showCompletedView ? (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="relative">
                      <img
                        src="https://api.withblip.com/uploadrocket.webp"
                        alt="Rocket"
                        width={30}
                        height={30}
                        className="animate-bounce"
                        style={{
                          animationDuration: "2s",
                          animationTimingFunction: "ease-in-out",
                        }}
                      />
                      <div className="absolute -top-1 -right-1 w-2 h-2">
                        <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                      </div>
                      <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5">
                        <div className="w-1 h-1 bg-yellow-300 rounded-full animate-ping delay-300"></div>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Creating Ads</h3>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-900">Progress</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {Math.round(jobId ? trackedProgress : progress)}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${jobId ? trackedProgress : progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-gray-900 mb-4">
                    {jobId ? trackedMessage : progressMessage}
                  </p>

                  <p className="text-xs font-medium text-gray-500">
                    Progress Tracker is in beta.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="relative">
                      {status === 'complete' ? (
                        <div className="w-[30px] h-[30px] bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-[30px] h-[30px] bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900">
                      {status === 'complete' ? 'Ads Created Successfully!' : 'Error Creating Ads'}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-700 mb-6">
                    {status === 'complete'
                      ? 'Your ads have been successfully created!'
                      : 'There was an error creating your ads. Please try again.'}
                  </p>

                  <Button
                    onClick={handleCloseProgressPopup}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2"
                  >
                    Close
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ConfigIcon className="w-5 h-5" />
            Select ad preferences
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="carousel-ad"
              checked={isCarouselAd}
              onCheckedChange={(checked) => {
                setIsCarouselAd(checked);
                if (!checked && link.length > 1) {
                  setLink([link[0] || ""]);
                }
              }}
              disabled={!isLoggedIn}
              className="border-gray-400 rounded-md"
            />
            <label
              htmlFor="carousel-ad"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Create Carousel Ad
            </label>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleCreateAd} className="space-y-6">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <FacebookIcon className="w-4 h-4" />
                    Select a Page
                  </Label>
                  <RefreshCcw
                    className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                    onClick={refreshPages}
                  />

                </div>
                <Popover open={openPage} onOpenChange={setOpenPage}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPage}
                      disabled={!isLoggedIn}
                      id="page"
                      className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
                    >
                      {pageId ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              pages.find((page) => page.id === pageId)?.profilePicture ||
                              "https://api.withblip.com/backup_page_image.png"
                              || "/placeholder.svg"}
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
                {selectedAdAccount && (!adAccountSettings?.adNameFormula || Object.keys(adAccountSettings.adNameFormula).length === 0) && (
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
                Generate an ad name by selecting and re-ordering the properties below
              </Label>

              <div className="flex flex-wrap items-center gap-2">
              </div>
              <ReorderAdNameParts
                order={adOrder}
                setOrder={setAdOrder}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                values={adValues}
                setValues={setAdValues}
                onItemToggle={onItemToggle}
                variant="home"
              />
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
                              // Fill all positions with the first message
                              const firstMessage = messages[0];
                              setMessages(new Array(messages.length).fill(firstMessage));
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
                          className="border border-gray-400 rounded-xl bg-white shadow w-full px-3 py-2 text-sm resize-none focus:outline-none"
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
                            // Fill all positions with the first headline
                            const firstHeadline = headlines[0];
                            setHeadlines(new Array(headlines.length).fill(firstHeadline));
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
                      <Input
                        value={value}
                        onChange={(e) => {
                          if (isCarouselAd && applyHeadlinesToAllCards) {
                            // Update all positions with the same value
                            setHeadlines(new Array(headlines.length).fill(e.target.value));
                          } else {
                            updateField(setHeadlines, headlines, index, e.target.value);
                          }
                        }}
                        className="border border-gray-400 rounded-xl bg-white shadow"
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
                            setLink([link[0] || ""]);
                          } else {
                            setLink([link[0] || "", ""]);
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

                <div className="space-y-3">
                  {link.map((value, index) => (
                    <div key={index} className={`flex items-start gap-2 ${isCarouselAd && link.length === 1 && index > 0 ? 'hidden' : ''}`}>
                      <Input
                        type="url"
                        value={value}
                        className="border border-gray-400 rounded-xl bg-white shadow"
                        onChange={(e) => {
                          if (isCarouselAd && link.length === 1) {
                            setLink([e.target.value]);
                          } else {
                            const newLinks = [...link];
                            newLinks[index] = e.target.value;
                            setLink(newLinks);
                          }
                        }}
                        placeholder={isCarouselAd && link.length > 1 ? `Link for card ${index + 1}` : "https://example.com"}
                        disabled={!isLoggedIn}
                        required
                      />
                      {link.length > 1 && !(isCarouselAd && link.length === 1) && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="border border-gray-400 rounded-xl bg-white shadow-sm"
                          size="icon"
                          onClick={() => {
                            const newLinks = link.filter((_, i) => i !== index);
                            setLink(newLinks);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-gray-600 cursor-pointer hover:text-red-500" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      )}
                    </div>
                  ))}
                  {isCarouselAd && link.length < 10 && link.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                      onClick={() => setLink([...link, ""])}
                    >
                      <Plus className="mr-2 h-4 w-4 text-white" />
                      Add link field
                    </Button>
                  )}
                </div>
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
              <Label className="text-gray-500 text-[12px] font-regular">All media will be posted as a new ad set unless posting to a dynamic ad set</Label>
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
          </div>
          <Button
            type="submit"
            className="w-full h-12 bg-neutral-950 hover:bg-blue-700 text-white rounded-xl"
            disabled={
              !isLoggedIn || (selectedAdSets.length === 0 && !duplicateAdSet) || (files.length === 0 && driveFiles.length === 0) || isLoading || (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === ""))
            }
          >
            {isLoading || uploadingToS3 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadingToS3 ? "Uploading to cloud..." : "Publishing Ads..."}
              </>
            ) : (
              "Publish Ads"
            )}
          </Button>
          <div
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
          </div>


        </form>
      </CardContent>
    </Card >
  )
}