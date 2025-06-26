"use client"

import { useState, useCallback, useEffect } from "react"
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
import { ChevronDown, Loader2, Plus, Trash2, Upload } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, RefreshCcw } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import ShopDestinationSelector from "@/components/shop-destination-selector"
import { Infotooltip } from "./ui/infotooltip"
import { v4 as uuidv4 } from 'uuid';



//Progress Tracker Hook
const useAdCreationProgress = (jobId, isCreatingAds) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!jobId) return;

    console.log('🔄 New jobId detected, resetting state:', jobId);
    setProgress(0);
    setMessage('');
    setStatus('idle');

    let retryCount = 0;
    const baseRetryDelay = 500;
    const maxRetryDelay = 5000;
    let isConnecting = true;

    const connectSSE = () => {
      if (!isConnecting) return;

      console.log(`🔌 SSE attempt #${retryCount + 1} for:`, jobId);
      const eventSource = new EventSource(`https://meta-ad-uploader-server-production.up.railway.app/api/progress/${jobId}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Raw SSE data received:', data);

        if (data.message === 'Job not found') {
          console.log(`❌ Job not found, closing connection...`);
          eventSource.close();
          retryCount++;

          const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount - 1), maxRetryDelay);

          console.log(`⏳ Retrying in ${delay}ms... (attempt ${retryCount})`);
          setTimeout(() => {
            if (isConnecting) {
              connectSSE();
            }
          }, delay);
          return;
        }

        retryCount = 0; // Reset retry counter on success
        console.log('✅ Setting state - Progress:', data.progress, 'Status:', data.status);
        setProgress(data.progress);
        setMessage(data.message);
        setStatus(data.status);

        if (data.status === 'complete' || data.status === 'error') {
          console.log('🏁 Job finished, closing SSE connection');
          eventSource.close();
          isConnecting = false;
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE Error:', error);
        eventSource.close();

        if (isConnecting) {
          retryCount++;
          const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount - 1), maxRetryDelay);
          setTimeout(() => {
            if (isConnecting) {
              connectSSE();
            }
          }, delay);
        }
      };
    };

    connectSSE();

    return () => {
      isConnecting = false;
    };
  }, [jobId]);

  // useEffect(() => {
  //   if (!jobId) return;

  //   console.log('🔄 New jobId detected, resetting state:', jobId);
  //   setProgress(0);
  //   setMessage('');
  //   setStatus('idle');

  //   let retryCount = 0;
  //   const maxRetries = 10;
  //   const retryDelay = 500;

  //   const connectSSE = () => {
  //     console.log(`🔌 SSE attempt #${retryCount + 1} for:`, jobId);
  //     const eventSource = new EventSource(`https://meta-ad-uploader-server-production.up.railway.app/api/progress/${jobId}`);

  //     eventSource.onmessage = (event) => {
  //       const data = JSON.parse(event.data);
  //       console.log('📨 Raw SSE data received:', data);

  //       if (data.message === 'Job not found' && retryCount < maxRetries) {
  //         console.log(`❌ Job not found, closing connection...`);
  //         eventSource.close();
  //         retryCount++;
  //         console.log(`⏳ Retrying in ${retryDelay}ms... (attempt ${retryCount}/${maxRetries})`);
  //         setTimeout(connectSSE, retryDelay);
  //         return;
  //       }

  //       console.log('✅ Setting state - Progress:', data.progress, 'Status:', data.status);
  //       setProgress(data.progress);
  //       setMessage(data.message);
  //       setStatus(data.status);

  //       if (data.status === 'complete' || data.status === 'error') {
  //         console.log('🏁 Job finished, closing SSE connection');
  //         eventSource.close();
  //       }
  //     };

  //     eventSource.onerror = (error) => {
  //       console.error('❌ SSE Error:', error);
  //       eventSource.close();
  //       if (retryCount < maxRetries) {
  //         retryCount++;
  //         setTimeout(connectSSE, retryDelay);
  //       } else {
  //         setStatus('error');
  //       }
  //     };
  //   };

  //   connectSSE();
  // }, [jobId]);

  useEffect(() => {
    if (!isCreatingAds) {
      console.log('🧹 Job completely finished, resetting hook state');
      setProgress(0);
      setMessage('');
      setStatus('idle');
    }
  }, [isCreatingAds]);


  return { progress, message, status };
};

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
  customTextValue,
  setCustomTextValue,
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
  setLaunchPaused
}) {
  // Local state

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
  const [isDuplicating, setIsDuplicating] = useState(false)
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
  console.log('🎭 Popup state - Status:', status, 'Progress:', trackedProgress, 'JobId:', jobId, 'Message:', trackedMessage);




  // Upload large file to S3
  const uploadToS3 = async (file) => {
    try {
      // Get presigned URL
      const response = await axios.post(
        "https://meta-ad-uploader-server-production.up.railway.app/auth/get-upload-url",
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

    console.log("🚀 Uploading Drive files to S3:", {
      name: file.name,
      size: file.size,
      hasAccessToken: !!file.accessToken
    });

    const res = await fetch("https://meta-ad-uploader-server-production.up.railway.app/api/upload-from-drive", {
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
    if (!res.ok) throw new Error(data.error || "S3 upload failed");
    return data.s3Url;
  }



  const formulaParts = adOrder.map((key) => {
    if (!selectedItems.includes(key)) return null;
    if (key === "adType") return "[File_Type]";
    if (key === "dateType") return adValues.dateType;
    if (key === "fileName") return "File Name";
    if (key === "iteration") return "itr";
    if (key === "customText") return customTextValue || "Custom Text";
    return null;
  }).filter(Boolean);

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

  // Filtered pages for combobox
  const filteredPages = pages.filter((page) => page.name.toLowerCase().includes(pageSearchValue.toLowerCase()))
  const filteredInstagramAccounts = pages
    .filter((page) => page.instagramAccount)
    .filter((page) =>
      page.instagramAccount.username.toLowerCase().includes(instagramSearchValue.toLowerCase())
    )


  const refreshPages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("https://meta-ad-uploader-server-production.up.railway.app/auth/fetch-pages", {
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


  // Update local state when progress changes
  useEffect(() => {
    console.log('🔄 Progress state update:', { trackedProgress, trackedMessage, status }); // ADD THIS
    if (jobId) {
      setProgress(trackedProgress);
      setProgressMessage(trackedMessage);

      if (status === 'complete') {
        setIsCreatingAds(false);
        setJobId(null);
        // toast.success("Ads created successfully!");
      } else if (status === 'error') {
        setIsCreatingAds(false);
        setJobId(null);
      }
    }
  }, [trackedProgress, trackedMessage, status, jobId]);


  useEffect(() => {
    const adName = computeAdName(null, adValues.dateType);  // <-- Pass dateType explicitly
    setAdName(adName);
  }, [customTextValue, adValues.dateType, adOrder, selectedItems]);





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
          "https://meta-ad-uploader-server-production.up.railway.app/auth/google/status",
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





  const handleDriveClick = async () => {
    try {
      // 🔁 Check if already authenticated
      const res = await axios.get(
        "https://meta-ad-uploader-server-production.up.railway.app/auth/google/status",
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

    // ⬇️ If not authenticated, fallback to popup login
    const authWindow = window.open(
      "https://meta-ad-uploader-server-production.up.railway.app/auth/google?popup=true",
      "_blank",
      "width=500,height=600"
    );

    if (!authWindow) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", listener);
      if (!authWindow.closed) authWindow.close();
      toast.error("Google login timed out.");
    }, 15000);

    const listener = (event) => {
      if (event.origin !== "https://meta-ad-uploader-server-production.up.railway.app") return;

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
  };




  const openPicker = (token) => {
    // Load the picker API if not already loaded
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
  };

  const createPicker = (token) => {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(true)        // ✅ Show folders
      .setSelectFolderEnabled(false); // ✅ Don't allow selecting folders

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
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
  };


  // Dropzone logic
  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);



  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })






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



  // Update your useEffect to be much simpler:
  useEffect(() => {
    // Generate thumbnails for local video files only
    files.forEach((file) => {
      if (file.type.startsWith("video/") && !videoThumbs[file.name]) {
        generateThumbnail(file)
          .then((thumb) => {
            setVideoThumbs((prev) => ({ ...prev, [file.name]: thumb }));
          })
          .catch((err) => {
            toast.error(`Thumbnail generation error: ${err}`);
            console.error("Thumbnail generation error:", err);
          });
      }
    });

    // For Google Drive videos, just store the thumbnail URL
    driveFiles.forEach((driveFile) => {
      if (driveFile.mimeType.startsWith("video/") && !videoThumbs[driveFile.name]) {
        const thumbnailUrl = getDriveVideoThumbnail(driveFile);
        if (thumbnailUrl) {
          setVideoThumbs((prev) => ({ ...prev, [driveFile.name]: thumbnailUrl }));
        }
      }
    });
  }, [files, driveFiles, videoThumbs, generateThumbnail, setVideoThumbs]);

  // Add this useEffect after your existing useEffects
  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== "https://meta-ad-uploader-server-production.up.railway.app") {
        return;
      }

      const { type, accessToken } = event.data || {};

      if (type === "google-auth-success") {
        if (!accessToken) return;
        setGoogleAuthStatus({
          checking: false,
          authenticated: true,
          accessToken
        });
        openPicker(accessToken);
      } else if (type === "google-auth-error") {
        toast.error("Google authentication failed");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!uploadingToS3 && publishPending) {
      setPublishPending(false);
      handleCreateAd(new Event('submit')); // fake event to reuse logic
    }
  }, [uploadingToS3, publishPending]);

  // Functions for managing dynamic input fields
  const addField = (setter, values) => {
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



  const computeAdName = (file, dateTypeInput, iterationIndex) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthAbbrev = monthNames[now.getMonth()];
    const date = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    const monthYear = `${monthAbbrev}${year}`;
    const monthDayYear = `${monthAbbrev}${date}${year}`;

    let fileName = "file_name"; // default if no file
    if (file && file.name) {
      fileName = file.name.replace(/\.[^/.]+$/, ""); // remove extension
    }

    const parts = adOrder.map((key) => {
      if (!selectedItems.includes(key)) return null;

      if (key === "adType") {
        if (!file) {
          return "file_type"; // Preview mode
        }
        const fileType = file.type || file.mimeType || "";
        if (fileType.startsWith("image/")) return "static";
        if (fileType.startsWith("video/")) return "video";
        return "file_type"; // fallback
      }
      if (key === "dateType") {
        return dateTypeInput === "MonthDDYYYY" ? monthDayYear : monthYear;
      }
      if (key === "fileName") return fileName;
      if (key === "iteration") {
        if (iterationIndex != null) {
          return String(iterationIndex + 1).padStart(2, "0");
        }
        return "01"; // fallback
      }
      if (key === "customText") return customTextValue || "custom_text";
      return null;
    }).filter(Boolean);

    const adName = parts.join("_");

    return adName || "Ad Generated Through Blip";
  };


  const duplicateAdSetRequest = async (adSetId, campaignId, adAccountId) => {
    const response = await axios.post(
      "https://meta-ad-uploader-server-production.up.railway.app/auth/duplicate-adset",
      { adSetId, campaignId, adAccountId, newAdSetName },
      { withCredentials: true },
    )
    return response.data.copied_adset_id
  }


  // Check if any selected ad sets have SHOP_AUTOMATIC destination type
  const hasShopAutomaticAdSets = () => {
    if (duplicateAdSet) {
      const adset = adSets.find((a) => a.id === duplicateAdSet)
      return adset?.destination_type === "SHOP_AUTOMATIC"
    }

    return selectedAdSets.some((adsetId) => {
      const adset = adSets.find((a) => a.id === adsetId)
      return adset?.destination_type === "SHOP_AUTOMATIC"
    })
  }

  const showShopDestinationSelector = hasShopAutomaticAdSets() && pageId

  const handleCreateAd = async (e) => {
    e.preventDefault();

    setIsCreatingAds(true);
    setProgress(0);
    setProgressMessage('Starting ad creation...');
    // const frontendJobId = uuidv4(); // Generate UUID
    // console.log(frontendJobId);
    // setJobId(frontendJobId);
    // console.log(jobId);



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
    // Validate shop destination for shop automatic ad sets
    if (showShopDestinationSelector && !selectedShopDestination) {
      toast.error("Please select a shop destination for shop ads")
      return
    }
    if (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === "")) {
      toast.error("Please enter a name for the new ad set")
      return
    }

    setIsLoading(true);
    // ✅ Step: Upload large local video files to S3 before creating ads
    const largeFiles = files.filter((file) => file.size > 100 * 1024 * 1024);

    // Step: Upload large Drive videos to S3
    const largeDriveFiles = driveFiles.filter(file =>
      file.mimeType.startsWith("video/") && file.size > 100 * 1024 * 1024
    );

    let s3Results = [];
    const s3DriveResults = [];

    const totalLargeFiles = largeFiles.length + largeDriveFiles.length;


    // if (largeFiles.length > 0) {
    //   setUploadingToS3(true);
    //   toast.info(`Uploading ${largeFiles.length} large file(s) to S3...`);

    //   try {
    //     const s3UploadPromises = largeFiles.map(uploadToS3);
    //     s3Results = await Promise.all(s3UploadPromises);
    //     toast.success("All large video files uploaded to S3!");
    //   } catch (err) {
    //     toast.error("Error uploading large files to S3");
    //     setIsLoading(false);
    //     return;
    //   } finally {
    //     setUploadingToS3(false);
    //   }
    // }



    // for (const file of largeDriveFiles) {
    //   try {
    //     const s3Url = await uploadDriveFileToS3(file); // 👇 see below
    //     s3DriveResults.push({ ...file, s3Url });
    //   } catch (err) {
    //     toast.error(`Failed to upload Drive video: ${file.name}`);
    //     console.error("❌ Drive to S3 upload failed", err);
    //     return; // exit early if a file failed
    //   }
    // }

    if (totalLargeFiles > 0) {
      setProgressMessage(`Uploading ${totalLargeFiles} large files to S3...`);

      // Upload regular large files
      for (let i = 0; i < largeFiles.length; i++) {
        const progressPercent = Math.round((i / totalLargeFiles) * 50);
        setProgress(progressPercent);
        setProgressMessage(`Uploading file ${i + 1}/${totalLargeFiles} to S3...`);

        try {
          const result = await uploadToS3(largeFiles[i]);
          s3Results.push(result);
        } catch (err) {
          toast.error(`Failed to upload ${largeFiles[i].name} to S3`);
          setIsCreatingAds(false);
          setIsLoading(false);
          return;
        }
      }

      // Upload Drive large files
      for (let i = 0; i < largeDriveFiles.length; i++) {
        const progressPercent = Math.round(((largeFiles.length + i) / totalLargeFiles) * 50);
        setProgress(progressPercent);
        setProgressMessage(`Uploading Drive file ${largeFiles.length + i + 1}/${totalLargeFiles} to S3...`);

        try {
          const s3Url = await uploadDriveFileToS3(largeDriveFiles[i]);
          s3DriveResults.push({ ...largeDriveFiles[i], s3Url });
        } catch (err) {
          toast.error(`Failed to upload Drive video: ${largeDriveFiles[i].name}`);
          console.error("❌ Drive to S3 upload failed", err);
          setIsCreatingAds(false);
          setIsLoading(false);
          return;
        }
      }

      setProgress(50);
      setProgressMessage('S3 uploads complete! Creating ads...');
      toast.success("All large video files uploaded to S3!");
    }

    // 🔧 NOW start the actual job (50-100% progress)
    const frontendJobId = uuidv4();
    console.log(frontendJobId);
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

    try {
      const promises = [];

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
          formData.append("link", link);
          formData.append("cta", cta);



          // Add all local files
          files.forEach((file) => {
            if (file.size <= 100 * 1024 * 1024) {
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

          formData.append("launchPaused", launchPaused);
          formData.append("jobId", frontendJobId);







          promises.push(
            axios.post("https://meta-ad-uploader-server-production.up.railway.app/auth/create-ad", formData, {
              withCredentials: true,
              headers: { "Content-Type": "multipart/form-data" },
            })
          );
        });
      }



      // Process non-dynamic adsets (one ad per file)
      if (nonDynamicAdSetIds.length > 0) {
        nonDynamicAdSetIds.forEach((adSetId) => {
          // Handle local files
          files.forEach((file, index) => {
            if (file.size > 100 * 1024 * 1024) return; // Skip large files (already handled via S3)
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
            formData.append("link", link);
            formData.append("cta", cta);
            if (thumbnail) {
              formData.append("thumbnail", thumbnail);
            }
            if (selectedShopDestination && showShopDestinationSelector) {
              formData.append("shopDestination", selectedShopDestination)
              formData.append("shopDestinationType", selectedShopDestinationType)
            }
            formData.append("launchPaused", launchPaused);
            formData.append("jobId", frontendJobId);
            console.log("jobId in attached form", frontendJobId);


            promises.push(
              axios.post("https://meta-ad-uploader-server-production.up.railway.app/auth/create-ad", formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
              })
            );
          });


          smallDriveFiles.forEach((driveFile, index) => {
            const formData = new FormData();
            formData.append("adName", computeAdName(driveFile, adValues.dateType, index));
            formData.append("headlines", JSON.stringify(headlines));
            formData.append("descriptions", JSON.stringify(descriptions));
            formData.append("messages", JSON.stringify(messages));
            formData.append("adAccountId", selectedAdAccount);
            formData.append("adSetId", adSetId);
            formData.append("pageId", pageId);
            formData.append("instagramAccountId", instagramAccountId);
            formData.append("link", link);
            formData.append("cta", cta);
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
              axios.post("https://meta-ad-uploader-server-production.up.railway.app/auth/create-ad", formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
              })
            );
          });



          // Handle S3 uploaded files
          [...s3Results, ...s3DriveResults].forEach((s3File, index) => {
            const formData = new FormData();
            formData.append("adName", computeAdName(s3File, adValues.dateType, index));
            formData.append("headlines", JSON.stringify(headlines));
            formData.append("descriptions", JSON.stringify(descriptions));
            formData.append("messages", JSON.stringify(messages));
            formData.append("s3VideoUrl", s3File.s3Url); // Add S3 URL
            formData.append("adAccountId", selectedAdAccount);
            formData.append("adSetId", adSetId);
            formData.append("pageId", pageId);
            formData.append("instagramAccountId", instagramAccountId);
            formData.append("link", link);
            formData.append("cta", cta);
            if (selectedShopDestination && showShopDestinationSelector) {
              formData.append("shopDestination", selectedShopDestination)
              formData.append("shopDestinationType", selectedShopDestinationType)
            }
            formData.append("launchPaused", launchPaused);
            formData.append("jobId", frontendJobId);
            console.log("jobId in attached form for large File", frontendJobId);

            promises.push(
              axios.post("https://meta-ad-uploader-server-production.up.railway.app/auth/create-ad", formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
              })
            );
          });

        });
      }

      console.log('🚀 Starting API calls (Promise.all) now');
      const responses = await Promise.all(promises);

      // Extract jobId from the first successful response:
      // const successfulResponse = responses.find(r => r.data?.jobId);
      // if (successfulResponse?.data?.jobId) {
      //   setJobId(successfulResponse.data.jobId);
      // }
      toast.success("Ads created successfully!");
      setIsCreatingAds(false);
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
      setIsCreatingAds(false);
      setJobId(null);
    } finally {
      setIsLoading(false);
    }
  }





  return (
    <Card className=" !bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-md">

      {isCreatingAds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] py-4 px-6 shadow-xl max-w-md w-full mx-4">
            <div className="text-left">
              {/* Header with rocket and title */}
              <div className="flex items-center gap-2 mb-6">
                <div className="relative">
                  <img
                    src="https://meta-ad-uploader-server-production.up.railway.app/uploadrocket.webp" // Replace with your image path
                    alt="Rocket"
                    width={30}
                    height={30}
                    className="animate-bounce"
                    style={{
                      animationDuration: "2s",
                      animationTimingFunction: "ease-in-out",
                    }}
                  />
                  {/* Sparkle effects */}
                  <div className="absolute -top-1 -right-1 w-2 h-2">
                    <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5">
                    <div className="w-1 h-1 bg-yellow-300 rounded-full animate-ping delay-300"></div>
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900">Creating Ads</h3>
              </div>

              {/* Progress section */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-900">Progress</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {Math.round(jobId ? trackedProgress : progress)}%
                  </span>
                </div>

                {/* Thick progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${jobId ? trackedProgress : progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Status message */}
              <p className="text-xs font-semibold text-gray-900 mb-4">
                {jobId ? trackedMessage : progressMessage}
              </p>

              {/* Disclaimer */}
              <p className="text-xs font-medium text-gray-500">
                *Video Processing Estimates might not be accurate.
              </p>
            </div>
          </div>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img src="https://unpkg.com/@mynaui/icons/icons/plus-hexagon.svg" className="w-5 h-5" />
          Select ad preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateAd} className="space-y-6">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <img src="https://unpkg.com/@mynaui/icons/icons/brand-facebook.svg" className="w-4 h-4" />
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
                              "https://meta-ad-uploader-server-production.up.railway.app/backup_page_image.png"
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
                  <img src="https://unpkg.com/@mynaui/icons/icons/brand-instagram.svg" className="w-4 h-4" />
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
                              "https://meta-ad-uploader-server-production.up.railway.app/backup_page_image.png"
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
                                src={page.instagramAccount.profilePictureUrl || "https://meta-ad-uploader-server-production.up.railway.app/backup_page_image.png"}
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
              <Label htmlFor="adName" className="flex items-center gap-2">
                <img src="https://unpkg.com/@mynaui/icons/icons/label.svg" className="w-4 h-4" />
                Ad Name (Internal Name)
                <Infotooltip
                  side="bottom"
                />
              </Label>
              <Label className="text-gray-500 text-[12px] leading-5 font-normal block">
                You can generate an ad name by selecting and re-ordering the properties below
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
                customTextValue={customTextValue}
                onCustomTextChange={setCustomTextValue}
                onItemToggle={onItemToggle}
                variant="home"
              />


              <div className="flex items-center w-full border border-gray-400 rounded-xl bg-white px-1 py-2 shadow h-[35px] !mt-[10px]">
                {formulaParts.length > 0 ? (
                  <div className="flex items-center">
                    {formulaParts.map((part, index) => (
                      <div key={index} className="flex items-center">
                        <span className="bg-gray-200 text-xs px-2 py-1 rounded-[8px]">{part}</span>
                        {index < formulaParts.length - 1 && <span className="text-sm text-gray-500 mx-1">_</span>}
                      </div>
                    ))}

                  </div>
                ) : (
                  <span className="text-gray-400 text-sm"> </span>
                )}
              </div>


            </div>

            <div className="space-y-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <img src="https://unpkg.com/@mynaui/icons/icons/file-text.svg" className="w-4 h-4" />
                  Select Copy Template
                </Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="border border-gray-400 rounded-xl bg-white shadow">
                    <SelectValue placeholder="Choose a Template" />
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
                  <Label>Primary Text</Label>
                  <div className="space-y-3">
                    {messages.map((value, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <TextareaAutosize
                          value={value}
                          onChange={(e) => updateField(setMessages, messages, index, e.target.value)}
                          placeholder="Add text option"
                          disabled={!isLoggedIn}
                          minRows={2}
                          maxRows={10}
                          className="border border-gray-400 rounded-xl bg-white shadow w-full px-3 py-2 text-sm resize-none focus:outline-none"
                          style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#c7c7c7 transparent'
                          }}
                        />
                        {messages.length > 1 && (
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
                    {messages.length < 5 && (
                      <Button
                        type="button"
                        size="sm"
                        className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                        onClick={() => addField(setMessages, messages)}
                      >
                        <Plus className="mr-2 h-4 w-4 text-white" />
                        Add text option
                      </Button>
                    )}
                  </div>
                </div>

                {/* Headlines Section */}
                <div className="space-y-2">
                  <Label>Headlines</Label>
                  <div className="space-y-3">
                    {headlines.map((value, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={value}
                          onChange={(e) => updateField(setHeadlines, headlines, index, e.target.value)}
                          className="border border-gray-400 rounded-xl bg-white shadow"
                          placeholder="Enter headline"
                          disabled={!isLoggedIn}
                        />
                        {headlines.length > 1 && (
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
                    {headlines.length < 5 && (
                      <Button
                        type="button"
                        size="sm"
                        className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                        onClick={() => addField(setHeadlines, headlines)}
                      >
                        <Plus className="mr-2 h-4 w-4 text-white" />
                        Add headline option
                      </Button>
                    )}
                  </div>
                </div>

                {/* Descriptions Section */}
                {/* <div className="space-y-2">
                <Label>Descriptions</Label>
                <div className="space-y-3">
                  {descriptions.map((value, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Textarea
                        value={value}
                        className="border border-gray-400 rounded-xl bg-white shadow"
                        onChange={(e) => updateField(setDescriptions, descriptions, index, e.target.value)}
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
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      )}
                    </div>
                  ))}
                  {descriptions.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className=" w-full border border-gray-200 rounded-xl shadow"
                      onClick={() => addField(setDescriptions, descriptions)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Description
                    </Button>
                  )}
                </div>
              </div> */}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="Link (URL)" className="flex items-center gap-2">
                  <img src="https://unpkg.com/@mynaui/icons/icons/link-one.svg" className="w-4 h-4" />
                  Link (URL)
                </Label>
                <p className="text-gray-500 text-[12px] font-regular">
                  Your UTMs will be auto applied from your Configuration Settings
                </p>
                <Input
                  id="link"
                  type="url"
                  value={link}
                  className="border border-gray-400 rounded-xl bg-white shadow"
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://example.com"
                  disabled={!isLoggedIn}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta" className="flex items-center gap-2">
                  <img src="https://unpkg.com/@mynaui/icons/icons/click.svg" className="w-4 h-4" />
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

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail - Optional(Only for videos)</Label>
                <div className="flex items-center space-x-2">
                  {/* Custom button for file input */}
                  <label
                    htmlFor="thumbnail"
                    className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-400 rounded-xl bg-white shadow hover:bg-gray-100 text-xs"
                  >
                    Choose File
                  </label>
                  {/* Hidden file input */}
                  <input
                    id="thumbnail"
                    type="file"
                    className="hidden"
                    onChange={(e) => setThumbnail(e.target.files[0])}
                    disabled={!isLoggedIn}
                  />
                  {/* Display uploaded file name and trash button if a file is selected */}
                  {thumbnail && (
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">{thumbnail.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        className="border border-gray-400 rounded-xl bg-white shadow-sm"
                        size="icon"
                        onClick={() => setThumbnail(null)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove thumbnail</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
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
            <Button type="button" onClick={handleDriveClick} className="w-full bg-sky-700 text-white rounded-xl h-[48px]">
              <img
                src="https://meta-ad-uploader-server-production.up.railway.app/googledrive.png"
                alt="Drive Icon"
                className="h-4 w-4"
              />
              Import from Google Drive
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