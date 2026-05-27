"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import { useNavigate } from "react-router-dom"

import { useTikTokVideoUpload } from "@/hooks/useTikTokVideoUpload"
import { readCache, writeCache } from "@/lib/dataCache"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { cn } from "@/lib/utils"
import { saveTikTokSettings, deleteTikTokCopyTemplate } from "@/lib/saveTikTokSettings"
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  CloudUpload,
  Copy,
  FileText,
  Globe,
  Link as LinkIcon,
  Loader,
  Plus,
  RefreshCcw,
  Type as TemplateIcon,
  Trash,
  Trash2,
  Upload,
  Users,
  Video,
  X,
  Zap,
  AlertTriangle,
  Ban,
  CircleX,
  Eye,
  RotateCcw,
  Image,
  CopyIcon,
  ArrowUpDown,
  Info
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import TextareaAutosize from 'react-textarea-autosize'
import { toast } from "sonner"
import CTAIcon from '@/assets/icons/cta.svg?react';
import CheckBlackIcon from '@/assets/icons/CheckBlack.svg?react';
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import axios from "axios"
import { useAppData } from "@/lib/AppContext"

import DesktopIcon from '@/assets/Desktop.webp'
import DropboxIcon from '@/assets/Dropbox.png'
import AdAccountIcon from '@/assets/icons/adaccount.svg?react'
import { default as CogIcon, default as ConfigIcon } from '@/assets/icons/cog.svg?react'
import CampaignIcon from '@/assets/icons/folder.svg?react'
import AdSetIcon from '@/assets/icons/grid.svg?react'
import PlusIcon from '@/assets/icons/plus.svg?react'
import RocketIcon2 from '@/assets/icons/rocket.svg?react'
import CheckIcon from '@/assets/icons/check.svg?react'
import UploadIcon from '@/assets/icons/upload.svg?react'
import QueueIcon from '@/assets/icons/queue.svg?react'
import PartialSuccess from '@/assets/icons/partialsuccess.svg?react'
import LabelIcon from '@/assets/icons/label.svg?react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const TIKTOK_PINK = '#FE2C55'

const VARIANT_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

function VariantDot({ variantId, variants }) {
  const idx = variants.findIndex((v) => v.id === variantId)
  const color = VARIANT_COLORS[Math.max(0, idx) % VARIANT_COLORS.length]
  return <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
}

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'DOWNLOAD_NOW', label: 'Download' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'BOOK_NOW', label: 'Book Now' },
  { value: 'PLAY_GAME', label: 'Play Game' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'WATCH_NOW', label: 'Watch Now' },
  { value: 'INSTALL_NOW', label: 'Install Now' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'CALL_NOW', label: 'Call Now' },
  { value: 'LISTEN_NOW', label: 'Listen Now' },
  { value: 'VISIT_STORE', label: 'Visit Store' },
  { value: 'SEND_MESSAGE', label: 'Send Message' },
  { value: 'VIEW_PROFILE', label: 'View Profile' },
  { value: 'READ_MORE', label: 'Read More' },
  { value: 'GET_TICKETS_NOW', label: 'Get Tickets Now' },
  { value: 'WATCH_LIVE', label: 'Watch Live' },
  { value: 'GET_SHOWTIMES', label: 'Get Showtimes' },
  { value: 'CHECK_AVAILABILITY', label: 'Check Availability' },
  { value: 'EXPERIENCE_NOW', label: 'Experience Now' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'VIEW_NOW', label: 'View Now' },
  { value: 'SHOOT_WITH_THIS_EFFECT', label: 'Shoot with this effect' },
  { value: 'PREORDER_NOW', label: 'Preorder Now' },
  { value: 'VIEW_VIDEO_WITH_THIS_EFFECT', label: 'View video with this effect' },
  { value: 'JOIN_THIS_HASHTAG', label: 'Join this hashtag' },
]

const UPLOAD_SOURCE_OPTIONS = [
  {
    id: 'local',
    name: 'My Computer',
    icon: DesktopIcon,
    fullLabel: 'Upload from Computer',
    compactLabel: 'Computer'
  },
  {
    id: 'drive',
    name: 'Google Drive',
    icon: 'https://api.withblip.com/googledrive.png',
    fullLabel: 'Choose Files from Google Drive',
    compactLabel: 'Google Drive'
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: DropboxIcon,
    fullLabel: 'Choose Files from Dropbox',
    compactLabel: 'Dropbox'
  },
]

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

const useAdCreationProgress = (jobId) => {
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

    setProgress(0);
    setMessage('');
    setStatus('idle');

    let eventSource = null;
    let retryTimeoutId = null;
    let connectionTimeoutId = null;
    let isSubscribed = true;
    let retryCount = 0;
    let jobNotFoundCount = 0;

    const baseRetryDelay = 500;
    const maxRetryDelay = 5000;
    const maxConnectionRetries = 10;
    const maxJobNotFoundRetries = 50;
    const connectionTimeout = 10000;

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

    const scheduleConnectionRetry = (reason) => {
      if (!isSubscribed || retryCount >= maxConnectionRetries) {
        if (retryCount >= maxConnectionRetries) {
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
          setStatus('job-not-found');
          setMessage('Job not found. The task may have expired or been cancelled.');
        }
        return;
      }

      jobNotFoundCount++;
      const delay = Math.min(baseRetryDelay, 1000);

      retryTimeoutId = setTimeout(() => {
        if (isSubscribed) connectSSE();
      }, delay);
    };

    const connectSSE = () => {
      if (!isSubscribed) return;

      try {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        eventSource = new EventSource(`${API_BASE_URL}/api/progress/${jobId}`);

        connectionTimeoutId = setTimeout(() => {
          if (eventSource && eventSource.readyState === EventSource.CONNECTING) {
            eventSource.close();
            scheduleConnectionRetry('Connection timeout');
          }
        }, connectionTimeout);

        eventSource.onopen = () => {
          retryCount = 0;

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

            if (data.message === 'Job not found') {
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }

              retryCount = 0;
              scheduleJobRetry();
              return;
            }

            if (isSubscribed) {
              retryCount = 0;
              jobNotFoundCount = 0;

              setProgress(data.progress);
              setMessage(data.message);
              setStatus(data.status);
              setMetadata({
                successCount: data.successCount,
                failureCount: data.failureCount,
                totalCount: data.totalCount,
                errorMessages: data.errorMessages
              });

              if (data.status === 'complete' || data.status === 'error' || data.status === 'partial-success' || data.status === 'cancelled') {
                cleanup();
              }
            }
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
          }
        };

        eventSource.onerror = (error) => {
          if (!isSubscribed) {
            cleanup();
            return;
          }

          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }

          scheduleConnectionRetry('Connection error');
        };

      } catch (error) {
        if (isSubscribed) {
          setStatus('error');
          setMessage('Failed to initialize progress tracking.');
        }
        cleanup();
      }
    };

    connectSSE();
    return cleanup;
  }, [jobId]);

  return { progress, message, status, metaData, resetProgress };
};

export default function TikTokAdCreationForm({
  advertiserId,
  advertisers,
  onAdvertiserChange,
  advertiserPrefs,
  refetchAdvertiserPrefs,

  // Lifted Form State
  adName, setAdName,
  adTexts, setAdTexts,
  cta, setCta,
  landingUrl, setLandingUrl,
  videoFile, setVideoFile,
  videoPreview, setVideoPreview,
  driveFiles, setDriveFiles,
  dropboxFiles, setDropboxFiles,
  selectedIdentity, setSelectedIdentity,
  sparkAuthCode, setSparkAuthCode,
  urlMode, setUrlMode,
  adType, setAdType,

  // Form Fetching States
  campaigns, setCampaigns,
  adGroups, setAdGroups,
  selectedCampaign, setSelectedCampaign,
  selectedAdGroup, setSelectedAdGroup,
  duplicateAdGroup, setDuplicateAdGroup,
  newAdGroupName, setNewAdGroupName,
  identities, setIdentities,
  files, setFiles,

  // Variants Props
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

  // Lifted Product States
  productName, setProductName,
  productImageUrl, setProductImageUrl,
  sellingPoints, setSellingPoints,
  selectedSavedProductId, setSelectedSavedProductId
}) {
  const navigate = useNavigate()
  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow"
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`
  const formTextareaChrome = "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"

  const renderDiffMark = (fieldKeys) => {
    if (isFormFieldModified && isFormFieldModified(fieldKeys)) {
      return (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block shrink-0" style={{ transform: 'translateY(-1px)' }} />
      )
    }
    return null
  }

  const { tiktokFetch, refreshTikTokUser, isLoading: authLoading } = useTikTokAuth()
  const { tiktokIdentities, tiktokIdentitiesLoading, fetchTikTokIdentities } = useAppData()

  const [selectedAdvertiser, setSelectedAdvertiser] = useState(advertiserId || '')
  const [adNameFormulaV2, setAdNameFormulaV2] = useState({ rawInput: "" })
  const [newSellingPoint, setNewSellingPoint] = useState("")


  useEffect(() => {
    if (advertiserId) setSelectedAdvertiser(advertiserId)
  }, [advertiserId])

  // Video upload hook
  const {
    uploadVideo: uploadVideoToTikTok,
    uploading: videoUploading,
    uploadProgress: videoUploadProgress,
  } = useTikTokVideoUpload(selectedAdvertiser)

  // Local state for combobox visibility
  const [openAdvertiser, setOpenAdvertiser] = useState(false)
  const [openCampaign, setOpenCampaign] = useState(false)
  const [openAdGroup, setOpenAdGroup] = useState(false)
  const [openIdentity, setOpenIdentity] = useState(false)
  const [openCta, setOpenCta] = useState(false)
  const [openUrlPicker, setOpenUrlPicker] = useState(false)
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)

  // Copy template state
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [templateSearch, setTemplateSearch] = useState("")
  const [sortMode, setSortMode] = useState(() => localStorage.getItem("tiktokHomeTemplateSortMode") || "default")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState(new Set())
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false)
  const [showSaveNewDialog, setShowSaveNewDialog] = useState(false)
  const [newTemplateNameInput, setNewTemplateNameInput] = useState("")

  // Duplication local states
  const [duplicateIncludeAds, setDuplicateIncludeAds] = useState(true)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showDuplicateCampaignBlock, setShowDuplicateCampaignBlock] = useState(false)
  const [duplicateCampaign, setDuplicateCampaign] = useState('')
  const [openDuplicateCampaign, setOpenDuplicateCampaign] = useState(false)
  const [duplicateCampaignSearchValue, setDuplicateCampaignSearchValue] = useState('')
  const [showDuplicateAdGroupBlock, setShowDuplicateAdGroupBlock] = useState(false)
  const [openDuplicateAdGroup, setOpenDuplicateAdGroup] = useState(false)
  const [duplicateAdGroupSearchValue, setDuplicateAdGroupSearchValue] = useState('')

  // Search input local states
  const [advertiserSearch, setAdvertiserSearch] = useState('')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [adGroupSearch, setAdGroupSearch] = useState('')

  // Library / Upload status local states
  const [tiktokLibraryFiles] = useState([]) // Keep library files array empty to default upload paths
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Google/Dropbox state variables
  const [googleAuthStatus, setGoogleAuthStatus] = useState({ checking: true, authenticated: false, accessToken: null })
  const [uploadSources, setUploadSources] = useState(['local'])
  const [uploadSourcesOpen, setUploadSourcesOpen] = useState(false)
  const [showFolderInput, setShowFolderInput] = useState(false)
  const [folderLinkValue, setFolderLinkValue] = useState("")
  const [isImportingFolder, setIsImportingFolder] = useState(false)

  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingAdGroups, setLoadingAdGroups] = useState(false)
  const loadingIdentities = tiktokIdentitiesLoading[selectedAdvertiser] || false
  const [instantPages, setInstantPages] = useState([])
  const [loadingPages, setLoadingPages] = useState(false)
  const [showDeleteAllVariantsDialog, setShowDeleteAllVariantsDialog] = useState(false)

  // Job Queue / Progress tracking states
  const [jobId, setJobId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [status, setStatus] = useState('idle')
  const {
    progress: trackedProgress,
    message: trackedMessage,
    status: trackedStatus,
    metaData: trackedMetaData,
    resetProgress
  } = useAdCreationProgress(jobId)

  const [jobQueue, setJobQueue] = useState([])
  const [currentJob, setCurrentJob] = useState(null)
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const [isJobTrackerExpanded, setIsJobTrackerExpanded] = useState(true)
  const [completedJobs, setCompletedJobs] = useState([])
  const [hasStartedAnyJob, setHasStartedAnyJob] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [currentAbortController, setCurrentAbortController] = useState(null)
  const [isQueueingJobs, setIsQueueingJobs] = useState(false)
  const currentJobIdRef = useRef(null)
  const [launchPaused, setLaunchPaused] = useState(false)

  const [liveProgress, setLiveProgress] = useState({
    completed: 0,
    succeeded: 0,
    failed: 0,
    total: 0,
    errors: []
  })
  const [preserveMedia, setPreserveMedia] = useState(false)


  const fileRef = useRef()
  const pickerInstanceRef = useRef(null)

  const filteredCampaigns = useMemo(() =>
    campaigns.filter((c) =>
      (c.campaign_name || c.campaign_id || '').toLowerCase().includes(campaignSearch.toLowerCase())
    ),
    [campaigns, campaignSearch]
  )

  const filteredAdGroups = useMemo(() =>
    adGroups.filter((ag) =>
      (ag.adgroup_name || ag.adgroup_id || '').toLowerCase().includes(adGroupSearch.toLowerCase())
    ),
    [adGroups, adGroupSearch]
  )

  const countFilesForVariant = (variantId) => {
    let count = 0
    Object.values(fileVariantMap).forEach((val) => {
      if (val === variantId) count++
    })
    Object.values(groupVariantMap).forEach((val) => {
      if (val === variantId) count++
    })
    Object.values(postVariantMap).forEach((val) => {
      if (val === variantId) count++
    })
    return count
  }

  const getFileId = (file) => {
    if (!file) return ''
    return file.id || file.name || file.videoId || ''
  }

  const captureFormDataAsJob = useCallback((variantId = 'default') => {
    const getVariantState = (vid) => {
      const v = variants.find(val => val.id === vid)
      if (!v) return null
      return v.state || v.snapshot || v
    }

    const variantState = getVariantState(variantId)
    if (!variantState) return null

    const filterFiles = (items) => items.filter((file) => {
      const fileId = getFileId(file)
      return (fileVariantMap[fileId] || 'default') === variantId
    })

    const variantFiles = filterFiles(files || [])
    const variantDriveFiles = filterFiles(driveFiles || []).map(f => ({ ...f, isDrive: true }))
    const variantDropboxFiles = filterFiles(dropboxFiles || []).map(f => ({ ...f, isDropbox: true }))
    const variantLibraryFiles = filterFiles(tiktokLibraryFiles || [])

    const formData = {
      adName: variantState.adName || adName || '',
      adTexts: variantState.adTexts || (variantState.adText ? [variantState.adText] : null) || adTexts || [''],
      cta: variantState.cta || cta || ['SHOP_NOW'],
      landingUrl: variantState.landingUrl || landingUrl || '',
      sparkAuthCode: variantState.sparkAuthCode || sparkAuthCode || '',
      urlMode: variantState.urlMode || urlMode || 'WEBSITE',
      adType: variantState.adType || adType || 'NORMAL',

      files: [...variantFiles],
      driveFiles: [...variantDriveFiles],
      dropboxFiles: [...variantDropboxFiles],
      tiktokLibraryFiles: [...variantLibraryFiles],

      selectedAdvertiser,
      selectedCampaign,
      selectedAdGroup,

      isDuplicatingAdGroupMode: showDuplicateAdGroupBlock && duplicateAdGroup,
      duplicateAdGroup,
      newAdGroupName,
      selectedIdentity,
      launchPaused,

      productName: variantState.productName || productName || '',
      productImageUrl: variantState.productImageUrl || productImageUrl || '',
      sellingPoints: variantState.sellingPoints || sellingPoints || [],
    }

    let fileCount = formData.files.length + formData.driveFiles.length + formData.dropboxFiles.length + formData.tiktokLibraryFiles.length
    if (formData.adType === 'SPARK') {
      fileCount = 1
    }

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      variantId,
      variantName: variants.find(v => v.id === variantId)?.name || 'Default',
      adCount: fileCount * (formData.selectedAdGroup?.length || 1),
      formData,
    }
  }, [
    variants, adName, adTexts, cta, landingUrl, sparkAuthCode, urlMode, adType,
    files, driveFiles, dropboxFiles, tiktokLibraryFiles, selectedAdvertiser,
    selectedCampaign, selectedAdGroup, showDuplicateAdGroupBlock, duplicateAdGroup,
    newAdGroupName, selectedIdentity, fileVariantMap, launchPaused,
    productName, productImageUrl, sellingPoints
  ])

  const addCompletedJob = useCallback((completedJob) => {
    setCompletedJobs(prev => {
      const updated = [...prev, completedJob]
      return updated.map((j, i) =>
        i < updated.length - 3 ? { ...j, formData: null } : j
      )
    })
  }, [])

  const handleRetryJob = useCallback((job) => {
    const d = job.formData
    if (!d) return

    setAdName(d.adName || '')
    setAdTexts(d.adTexts || (d.adText ? [d.adText] : ['']))
    setCta(d.cta || ['SHOP_NOW'])
    setLandingUrl(d.landingUrl || '')
    setSparkAuthCode(d.sparkAuthCode || '')
    setUrlMode(d.urlMode || 'WEBSITE')
    setAdType(d.adType || 'NORMAL')

    setFiles(d.files || [])
    setDriveFiles(d.driveFiles || [])
    setDropboxFiles(d.dropboxFiles || [])
    if (setSparkAuthCode) setSparkAuthCode(d.sparkAuthCode || '')

    setSelectedAdvertiser(d.selectedAdvertiser || '')
    setSelectedCampaign(d.selectedCampaign || [])
    setSelectedAdGroup(d.selectedAdGroup || [])

    setVariants([{ id: 'default', name: 'Default', snapshot: null }])
    setActiveVariantId('default')
    setFileVariantMap({})
    setGroupVariantMap({})
    setPostVariantMap({})
  }, [
    setAdName, setAdTexts, setCta, setLandingUrl, setSparkAuthCode, setUrlMode,
    setAdType, setFiles, setDriveFiles, setDropboxFiles, setSelectedAdvertiser,
    setSelectedCampaign, setSelectedAdGroup, setVariants, setActiveVariantId,
    setFileVariantMap, setGroupVariantMap, setPostVariantMap
  ])

  // Sequentially process the publishing job queue
  const handleCreateAd = async (jobToProcess) => {
    const abortController = new AbortController()
    const signal = abortController.signal
    setCurrentAbortController(abortController)
    currentJobIdRef.current = jobToProcess.id

    const {
      adName,
      adTexts,
      cta,
      landingUrl,
      sparkAuthCode,
      urlMode,
      adType,
      files,
      driveFiles,
      dropboxFiles,
      tiktokLibraryFiles,
      selectedAdvertiser,
      selectedCampaign,
      selectedAdGroup,
      isDuplicatingAdGroupMode,
      duplicateAdGroup,
      newAdGroupName,
      selectedIdentity,
      launchPaused,
    } = jobToProcess.formData

    setIsSubmitting(true)
    setIsUploading(true)
    setProgress(0)
    setProgressMessage('Starting TikTok ad creation...')

    const itemsToUpload = []
    if (adType === 'SPARK') {
      itemsToUpload.push({ type: 'spark', file: { name: 'Spark Ad' } })
    } else {
      (files || []).forEach(f => itemsToUpload.push({ type: 'local', file: f }));
      (driveFiles || []).forEach(f => itemsToUpload.push({ type: 'drive', file: f }));
      (dropboxFiles || []).forEach(f => itemsToUpload.push({ type: 'dropbox', file: f }));
      (tiktokLibraryFiles || []).forEach(f => itemsToUpload.push({ type: 'library', file: f }));
    }

    let successCount = 0
    let failureCount = 0
    let totalCount = itemsToUpload.length * (isDuplicatingAdGroupMode ? 1 : selectedAdGroup.length)
    let errorMessages = []

    setLiveProgress({
      completed: 0,
      succeeded: 0,
      failed: 0,
      total: totalCount,
      errors: []
    })

    const updateProgress = (pct, msg) => {
      setProgress(pct)
      setProgressMessage(msg)
    }

    try {
      let sparkVideoId = null
      if (adType === 'SPARK') {
        updateProgress(5, 'Authorizing organic TikTok post...')
        if (signal.aborted) throw new DOMException('Job cancelled.', 'AbortError')
        const authRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-authorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advertiserId: selectedAdvertiser,
            authCode: sparkAuthCode.trim()
          }),
          signal
        })
        const authData = await authRes.json()
        if (!authRes.ok || !authData.success) {
          throw new Error(authData.error || 'Failed to authorize organic post')
        }

        updateProgress(10, 'Fetching organic video information...')
        if (signal.aborted) throw new DOMException('Job cancelled.', 'AbortError')
        const infoParams = new URLSearchParams({
          advertiserId: selectedAdvertiser,
          authCode: sparkAuthCode.trim()
        })
        const infoRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-video-info?${infoParams}`, { signal })
        const infoData = await infoRes.json()
        if (!infoRes.ok || !infoData.success) {
          throw new Error(infoData.error || 'Failed to retrieve organic video information')
        }
        sparkVideoId = infoData.videoId
      }

      for (let i = 0; i < itemsToUpload.length; i++) {
        if (signal.aborted) throw new DOMException('Job cancelled.', 'AbortError')
        const item = itemsToUpload[i]
        let videoId = null

        const progressBase = Math.round((i / itemsToUpload.length) * 90)
        const progressNext = Math.round(((i + 1) / itemsToUpload.length) * 90)

        updateProgress(progressBase + 5, `Uploading and processing media ${i + 1}/${itemsToUpload.length}: ${item.file.name}...`)

        if (adType === 'SPARK') {
          videoId = sparkVideoId
        } else if (item.type === 'local') {
          const uploadResult = await uploadVideoToTikTok(item.file)
          if (!uploadResult?.videoId) {
            throw new Error(`Video upload failed for "${item.file.name}"`)
          }
          videoId = uploadResult.videoId
        } else if (item.type === 'drive' || item.type === 'dropbox') {
          const formData = new FormData()
          if (item.type === 'drive') {
            formData.append('driveFile', JSON.stringify(item.file))
          } else {
            formData.append('dropboxFile', JSON.stringify(item.file))
          }

          const uploadParams = new URLSearchParams({ advertiserId: selectedAdvertiser })
          const uploadUrl = `${API_BASE_URL}/api/tiktok/upload-video?${uploadParams}`
          const sourceName = item.type === 'drive' ? 'Google Drive' : 'Dropbox'

          updateProgress(progressBase + 10, `Downloading "${item.file.name}" from ${sourceName}...`)
          const uploadRes = await tiktokFetch(uploadUrl, { method: 'POST', body: formData, signal })
          const uploadData = await uploadRes.json()
          if (!uploadRes.ok || !uploadData.success || !uploadData.videoId) {
            throw new Error(uploadData.error || `Upload failed for "${item.file.name}"`)
          }
          videoId = uploadData.videoId
        } else if (item.type === 'library') {
          videoId = item.file.videoId
        }

        const selectedIdentityObj = identities.find(i => i.identity_id === selectedIdentity)
        const isCustomized = !selectedIdentity || selectedIdentity === 'CUSTOMIZED_USER'
        const currentIdentityId = isCustomized ? undefined : selectedIdentity
        const currentIdentityType = isCustomized ? 'CUSTOMIZED_USER' : (selectedIdentityObj?.identity_type || 'TT_USER')

        const finalUrl = urlMode === 'WEBSITE'
          ? applyUtmsToUrl(landingUrl, advertiserPrefs?.defaultUTMs || [])
          : landingUrl

        let adGroupIdsToSubmit = [...selectedAdGroup]

        if (isDuplicatingAdGroupMode && i === 0) {
          updateProgress(progressBase + 15, 'Duplicating ad group on-the-fly...')
          const dupRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/adgroup/duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              advertiser_id: selectedAdvertiser,
              source_adgroup_id: duplicateAdGroup,
              new_campaign_id: selectedCampaign[0],
              new_adgroup_name: newAdGroupName.trim()
            }),
            signal
          })
          const dupData = await dupRes.json()
          if (!dupRes.ok || !dupData.success || !dupData.copied_adgroup_id) {
            throw new Error(dupData.error || 'Ad group duplication failed')
          }
          adGroupIdsToSubmit = [dupData.copied_adgroup_id]
        }

        for (const adgroupId of adGroupIdsToSubmit) {
          if (signal.aborted) throw new DOMException('Job cancelled.', 'AbortError')
          const adGroupName = adGroups.find(ag => ag.adgroup_id === adgroupId)?.adgroup_name || adgroupId

          const finalAdName = computeAdNameFromFormula(
            item.file,
            i,
            landingUrl,
            adNameFormulaV2,
            adType
          )

          updateProgress(progressBase + 20, `Creating ad "${finalAdName}" in group "${adGroupName}"...`)

          const creativeCTAs = Array.isArray(cta) ? cta : [cta]
          const activeCaptions = (adTexts || []).filter(t => t.trim() !== '')
          const finalCaptions = activeCaptions.length > 0 ? activeCaptions : ['']

          const creatives = []
          for (const singleCaption of finalCaptions) {
            for (const singleCta of creativeCTAs) {
              let creativeAdName = finalAdName
              const modifiers = []
              if (finalCaptions.length > 1) {
                const cleanCap = singleCaption.trim().substring(0, 15)
                modifiers.push(cleanCap ? `"${cleanCap}"` : `Text ${finalCaptions.indexOf(singleCaption) + 1}`)
              }
              if (creativeCTAs.length > 1) {
                modifiers.push(singleCta)
              }
              if (modifiers.length > 0) {
                creativeAdName = `${finalAdName} - ${modifiers.join(' - ')}`
              }

              const creative = {
                video_id: videoId,
                ad_text: singleCaption,
                call_to_action: singleCta,
                ad_name: creativeAdName,
                identity_type: currentIdentityType,
                landing_page_type: urlMode === 'WEBSITE' ? 'EXTERNAL_WEBSITE' : 'INSTANT_PAGE',
                operation_status: launchPaused ? 'DISABLE' : 'ENABLE',
                ...(urlMode === 'WEBSITE'
                  ? { landing_page_url: finalUrl }
                  : { page_id: landingUrl }
                ),
                ...(adType === 'SPARK' ? {
                  is_spark_ad: true,
                  spark_ad_auth_code: sparkAuthCode.trim(),
                  adType: 'SPARK'
                } : {})
              }
              if (currentIdentityId) creative.identity_id = currentIdentityId
              creatives.push(creative)
            }
          }

          const createPayload = {
            advertiserId: selectedAdvertiser,
            adgroupId: adgroupId,
            ...(currentIdentityId ? { identityId: currentIdentityId } : {}),
            identityType: currentIdentityType,
            adName: finalAdName,
            adType: adType,
            creatives: creatives,
            jobId: jobToProcess.id
          }

          try {
            const createRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/create-ad`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createPayload),
              signal
            })
            const createData = await createRes.json()
            if (!createRes.ok || !createData.success) {
              throw new Error(createData.error || 'Ad creation failed')
            }

            successCount++
            setLiveProgress(prev => {
              const updatedCompleted = prev.completed + 1
              return {
                ...prev,
                completed: updatedCompleted,
                succeeded: prev.succeeded + 1
              }
            })
          } catch (err) {
            failureCount++
            const errDetail = err.message || 'Ad creation failed'
            errorMessages.push({ error: errDetail, fileName: item.file.name })
            setLiveProgress(prev => {
              const updatedCompleted = prev.completed + 1
              return {
                ...prev,
                completed: updatedCompleted,
                failed: prev.failed + 1,
                errors: [...prev.errors, { error: errDetail, fileName: item.file.name }]
              }
            })
          }
        }
      }

      updateProgress(100, 'TikTok ad creation complete!')
      setStatus('complete')

      const completedJob = {
        id: jobToProcess.id,
        message: failureCount > 0
          ? `Completed with ${failureCount} failure(s).`
          : `Created TikTok ads successfully for all ${itemsToUpload.length} videos!`,
        completedAt: Date.now(),
        status: failureCount === 0 ? 'complete' : (successCount > 0 ? 'partial-success' : 'error'),
        formData: jobToProcess.formData,
        successCount,
        failureCount,
        totalCount,
        errorMessages,
      }

      addCompletedJob(completedJob)

      await fetch(`${API_BASE_URL}/auth/complete-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobToProcess.id,
          message: completedJob.message,
          status: completedJob.status,
          successCount,
          failureCount,
          totalCount,
          errorMessages,
        })
      }).catch(() => { })

    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) {
        setStatus('cancelled')
        updateProgress(100, 'Job cancelled.')
        const cancelledJob = {
          id: jobToProcess.id,
          message: 'Job cancelled.',
          completedAt: Date.now(),
          status: 'cancelled',
          formData: jobToProcess.formData,
          successCount,
          failureCount,
          totalCount,
          errorMessages,
        }
        addCompletedJob(cancelledJob)

        await fetch(`${API_BASE_URL}/auth/cancel-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: jobToProcess.id })
        }).catch(() => { })
      } else {
        setStatus('error')
        updateProgress(100, `Job Failed: ${err.message}`)
        const failedJob = {
          id: jobToProcess.id,
          message: `Job Failed: ${err.message}`,
          completedAt: Date.now(),
          status: 'error',
          formData: jobToProcess.formData,
          successCount,
          failureCount,
          totalCount,
          errorMessages: [{ error: err.message }],
        }
        addCompletedJob(failedJob)

        await fetch(`${API_BASE_URL}/auth/complete-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: jobToProcess.id,
            message: failedJob.message,
            status: 'error',
            successCount,
            failureCount,
            totalCount,
            errorMessages: [{ error: err.message }],
          })
        }).catch(() => { })
      }
    } finally {
      setJobQueue(prev => prev.slice(1))
      setIsSubmitting(false)
      setIsUploading(false)
      setCurrentJob(null)
      setIsProcessingQueue(false)
      setIsCancelling(false)
    }
  }

  useEffect(() => {
    if (jobQueue.length === 0 || isProcessingQueue) {
      return
    }

    const jobToProcess = jobQueue[0]

    setIsProcessingQueue(true)
    setCurrentJob(jobToProcess)
    setHasStartedAnyJob(true)

    setProgress(0)
    setProgressMessage('Initializing...')
    setJobId(jobToProcess.id)
    setIsCancelling(false)

    handleCreateAd(jobToProcess).catch(err => {
      const failedJob = {
        id: jobToProcess.id,
        message: `Job Failed: ${err.message || 'An initialization error occurred.'}`,
        completedAt: Date.now(),
        status: 'error',
        formData: jobToProcess.formData,
        successCount: 0,
        failureCount: 0,
        totalCount: jobToProcess.adCount,
        errorMessages: [{ error: err.message }],
      }
      addCompletedJob(failedJob)
      setJobQueue(prev => prev.slice(1))
      setCurrentJob(null)
      setIsProcessingQueue(false)
      setIsCancelling(false)
    })
  }, [jobQueue, isProcessingQueue])

  // Handle advertiser account change
  const handleAdvertiserChange = useCallback((value) => {
    setSelectedAdvertiser(value)
    if (onAdvertiserChange) {
      onAdvertiserChange(value)
    }
    setSelectedCampaign([])
    setSelectedAdGroup([])
    setCampaigns([])
    setAdGroups([])
  }, [onAdvertiserChange, setCampaigns, setAdGroups, setSelectedCampaign, setSelectedAdGroup])

  // Fetch Campaigns & Identities on Advertiser change
  useEffect(() => {
    if (!selectedAdvertiser) {
      setCampaigns([])
      setSelectedCampaign([])
      return
    }

    const cacheKey = `tiktok_campaigns_${selectedAdvertiser}`
    const cached = readCache(cacheKey)
    if (cached) {
      setCampaigns(cached)
      setSelectedCampaign([])
      setAdGroups([])
    } else {
      setLoadingCampaigns(true)
      const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
      tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`)
        .then(r => r.json())
        .then(d => {
          const list = d.campaigns || []
          setCampaigns(list)
          writeCache(cacheKey, list)
          setSelectedCampaign([])
          setAdGroups([])
        })
        .catch(() => toast.error('Failed to load campaigns'))
        .finally(() => setLoadingCampaigns(false))
    }

    fetchTikTokIdentities(selectedAdvertiser).then(list => {
      setIdentities(list)
    })
  }, [selectedAdvertiser, setCampaigns, setSelectedCampaign, setAdGroups, setIdentities, tiktokFetch, fetchTikTokIdentities])

  // Automatically sync identities from context cache when selectedAdvertiser or context value changes
  useEffect(() => {
    if (selectedAdvertiser && tiktokIdentities[selectedAdvertiser]) {
      setIdentities(tiktokIdentities[selectedAdvertiser]);
    }
  }, [selectedAdvertiser, tiktokIdentities, setIdentities]);

  // Automatically update selectedIdentity when adType or identities list changes
  useEffect(() => {
    if (identities.length > 0) {
      const best = identities.find(i => i.identity_type === 'TT_USER') ||
        identities.find(i => i.identity_type === 'BC_AUTH_TT') ||
        identities[0]
      setSelectedIdentity(best?.identity_id || '')
    } else {
      setSelectedIdentity('')
      if (adType === 'SPARK') {
        setAdType('NORMAL')
      }
    }
  }, [identities, adType, setSelectedIdentity, setAdType])

  // Fetch Ad Groups on Campaign change
  useEffect(() => {
    let active = true

    if (!selectedCampaign || selectedCampaign.length === 0) {
      setAdGroups([])
      setSelectedAdGroup([])
      return
    }

    // The saved default ad group for this campaign (from Firestore prefs)
    const savedDefaultAdGroupId = advertiserPrefs?.defaultAdGroupId || ''
    const defaultAdGroupIds = Array.isArray(savedDefaultAdGroupId)
      ? savedDefaultAdGroupId
      : (savedDefaultAdGroupId ? [savedDefaultAdGroupId] : [])

    setLoadingAdGroups(true)
    setAdGroups([]) // Clear old ad groups immediately to avoid showing stale data from the previous campaign!

    const fetchPromises = selectedCampaign.map(campId => {
      const cacheKey = `tiktok_adgroups_${campId}`
      const cached = readCache(cacheKey)
      if (cached) {
        return Promise.resolve(cached.map(ag => ({
          ...ag,
          campaignId: campId,
          campaignName: campaigns.find(c => c.campaign_id === campId)?.campaign_name || campId
        })))
      } else {
        return tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-adgroups?advertiserId=${selectedAdvertiser}&campaignId=${campId}`)
          .then(r => r.json())
          .then(d => {
            const list = d.adGroups || d.adgroups || []
            writeCache(cacheKey, list)
            return list.map(ag => ({
              ...ag,
              campaignId: campId,
              campaignName: campaigns.find(c => c.campaign_id === campId)?.campaign_name || campId
            }))
          })
      }
    })

    Promise.all(fetchPromises)
      .then(results => {
        if (!active) return
        const combined = results.flat()
        // Unique by adgroup_id
        const unique = []
        const seen = new Set()
        for (const ag of combined) {
          if (!seen.has(ag.adgroup_id)) {
            seen.add(ag.adgroup_id)
            unique.push(ag)
          }
        }
        setAdGroups(unique)
        setSelectedAdGroup(prevSelected => {
          // Keep any currently selected ad groups that are actually present in the newly fetched ad groups
          const stillValidSelected = prevSelected.filter(id => unique.some(g => g.adgroup_id === id))
          if (stillValidSelected.length > 0) {
            return stillValidSelected
          } else {
            // Fallback to defaults if none of the previously selected ones are still valid
            return defaultAdGroupIds.filter(id => unique.some(g => g.adgroup_id === id))
          }
        })
      })
      .catch(() => {
        if (!active) return
        toast.error('Failed to load ad groups')
      })
      .finally(() => {
        if (active) setLoadingAdGroups(false)
      })

    return () => {
      active = false
    }
  }, [selectedCampaign, selectedAdvertiser, setAdGroups, setSelectedAdGroup, tiktokFetch, advertiserPrefs, campaigns])

  // Fetch Instant Pages on Advertiser change
  useEffect(() => {
    if (!selectedAdvertiser) return
    setLoadingPages(true)
    const uid = localStorage.getItem('tiktok_uid')
    const token = localStorage.getItem('tiktok_token')
    fetch(`${API_BASE_URL}/api/tiktok/fetch-pages?advertiserId=${selectedAdvertiser}`, {
      headers: {
        ...(uid && { 'x-tiktok-user-id': uid }),
        ...(token && { 'x-tiktok-token': token }),
      }
    })
      .then(r => r.json())
      .then(d => setInstantPages(d.pages || []))
      .catch(() => { })
      .finally(() => setLoadingPages(false))
  }, [selectedAdvertiser])

  // Sync advertiser preferences for Ad Name Formula
  useEffect(() => {
    if (advertiserPrefs) {
      if (advertiserPrefs.adNameFormulaV2) {
        setAdNameFormulaV2(advertiserPrefs.adNameFormulaV2);
      } else {
        setAdNameFormulaV2({ rawInput: "" });
      }
    }
  }, [advertiserPrefs]);

  // Sync copy templates
  useEffect(() => {
    if (advertiserPrefs?.defaultTemplateName) {
      setSelectedTemplate(advertiserPrefs.defaultTemplateName);
    } else {
      setSelectedTemplate("");
    }
  }, [selectedAdvertiser, advertiserPrefs]);

  const copyTemplates = advertiserPrefs?.copyTemplates || {};
  const defaultTemplateName = advertiserPrefs?.defaultTemplateName || "";

  const hasAnyContent = adTexts[0]?.trim() !== "";

  const hasUnsavedTemplateChangesRaw = useMemo(() => {
    if (!selectedTemplate || !copyTemplates[selectedTemplate]) return false;
    const tpl = copyTemplates[selectedTemplate];
    const currentText = adTexts[0] || "";
    const originalText = tpl.texts?.[0] || tpl.text || "";
    return currentText.trim() !== originalText.trim();
  }, [adTexts, copyTemplates, selectedTemplate]);

  const [hasUnsavedTemplateChanges, setHasUnsavedTemplateChanges] = useState(false);

  useEffect(() => {
    if (!hasUnsavedTemplateChangesRaw) {
      setHasUnsavedTemplateChanges(false);
      return;
    }
    const timer = setTimeout(() => setHasUnsavedTemplateChanges(true), 300);
    return () => clearTimeout(timer);
  }, [hasUnsavedTemplateChangesRaw]);

  // Does this exact combo already exist in another template?
  const existingDuplicateTemplate = useMemo(() => {
    const currentText = adTexts[0]?.trim() || "";
    if (!currentText) return null;
    for (const [name, tpl] of Object.entries(copyTemplates)) {
      if (name === selectedTemplate) continue;
      const originalText = tpl.texts?.[0] || tpl.text || "";
      if (currentText === originalText.trim()) {
        return name;
      }
    }
    return null;
  }, [adTexts, copyTemplates, selectedTemplate]);

  const handleSaveAsNewTemplate = async () => {
    const name = newTemplateNameInput.trim();
    if (!name || copyTemplates[name]) return;
    setIsSavingNew(true);
    try {
      const templateData = {
        name,
        texts: [adTexts[0]?.trim() || ""],
      };
      const updated = { ...(copyTemplates || {}) };
      updated[name] = templateData;

      const nextSettings = { ...advertiserPrefs, copyTemplates: updated };
      await saveTikTokSettings(selectedAdvertiser, nextSettings);

      if (refetchAdvertiserPrefs) {
        await refetchAdvertiserPrefs();
      }

      setSelectedTemplate(name);
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
        texts: [adTexts[0]?.trim() || ""],
      };
      const updated = { ...(copyTemplates || {}) };
      updated[selectedTemplate] = templateData;

      const nextSettings = { ...advertiserPrefs, copyTemplates: updated };
      await saveTikTokSettings(selectedAdvertiser, nextSettings);

      if (refetchAdvertiserPrefs) {
        await refetchAdvertiserPrefs();
      }

      toast.success("Template updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update template");
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  const handleBulkDeleteTemplates = async () => {
    if (selectedForDelete.size === 0) return;
    setIsDeletingTemplates(true);
    try {
      const namesToDelete = [...selectedForDelete];
      for (const name of namesToDelete) {
        await deleteTikTokCopyTemplate(selectedAdvertiser, name);
      }

      if (refetchAdvertiserPrefs) {
        await refetchAdvertiserPrefs();
      }

      toast.success(`Deleted ${namesToDelete.length} template${namesToDelete.length > 1 ? "s" : ""}`);
      setSelectedForDelete(new Set());
      setBulkDeleteMode(false);
      if (namesToDelete.includes(selectedTemplate)) {
        setSelectedTemplate("");
      }
    } catch (err) {
      toast.error("Failed to delete templates");
      console.error(err);
    } finally {
      setIsDeletingTemplates(false);
    }
  };

  const toggleDeleteSelection = useCallback((name) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const sortedFilteredTemplates = useMemo(() => {
    let entries = Object.entries(copyTemplates);

    // Filter by search
    if (templateSearch.trim()) {
      const query = templateSearch.toLowerCase();
      entries = entries.filter(([name]) => name.toLowerCase().includes(query));
    }

    // Sort — default template always pinned at top
    entries.sort(([a, aData], [b, bData]) => {
      if (a === defaultTemplateName) return -1;
      if (b === defaultTemplateName) return 1;
      return 0;
    });

    if (sortMode === "oldest") {
      const defaultEntry = entries.find(([name]) => name === defaultTemplateName);
      const rest = entries.filter(([name]) => name !== defaultTemplateName);
      entries = defaultEntry ? [defaultEntry, ...rest.reverse()] : rest.reverse();
    }

    return entries;
  }, [copyTemplates, defaultTemplateName, templateSearch, sortMode]);

  // Setup Campaign Duplication name automatic suffixing
  useEffect(() => {
    if (selectedCampaign && selectedCampaign.length === 1) {
      const campId = selectedCampaign[0]
      const camp = campaigns.find(c => c.campaign_id === campId)
      if (camp) {
        setNewCampaignName((camp.campaign_name || '') + "_copy")
      }
    } else {
      setNewCampaignName('')
    }
  }, [selectedCampaign, campaigns])

  // Setup Ad Group Duplication name automatic suffixing
  useEffect(() => {
    if (duplicateAdGroup) {
      const adGroup = adGroups.find(ag => ag.adgroup_id === duplicateAdGroup)
      if (adGroup) {
        setNewAdGroupName((adGroup.adgroup_name || '') + "_copy")
      }
    } else {
      setNewAdGroupName('')
    }
  }, [duplicateAdGroup, adGroups, setNewAdGroupName])

  // Force refreshes
  const forceRefreshCampaigns = (e) => {
    e.stopPropagation()
    if (!selectedAdvertiser) return
    setLoadingCampaigns(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
    tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`)
      .then(r => r.json())
      .then(d => {
        const list = d.campaigns || []
        setCampaigns(list)
        writeCache(`tiktok_campaigns_${selectedAdvertiser}`, list)
        toast.success('Campaigns refreshed!')
      })
      .catch(() => toast.error('Failed to refresh campaigns'))
      .finally(() => setLoadingCampaigns(false))
  }

  const forceRefreshAdGroups = (e) => {
    e.stopPropagation()
    if (!selectedCampaign || selectedCampaign.length === 0) return
    setLoadingAdGroups(true)

    const fetchPromises = selectedCampaign.map(campId => {
      return tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-adgroups?advertiserId=${selectedAdvertiser}&campaignId=${campId}`)
        .then(r => r.json())
        .then(d => {
          const list = d.adGroups || d.adgroups || []
          writeCache(`tiktok_adgroups_${campId}`, list)
          return list.map(ag => ({
            ...ag,
            campaignId: campId,
            campaignName: campaigns.find(c => c.campaign_id === campId)?.campaign_name || campId
          }))
        })
    })

    Promise.all(fetchPromises)
      .then(results => {
        const combined = results.flat()
        const unique = []
        const seen = new Set()
        for (const ag of combined) {
          if (!seen.has(ag.adgroup_id)) {
            seen.add(ag.adgroup_id)
            unique.push(ag)
          }
        }
        setAdGroups(unique)
        toast.success('Ad Groups refreshed!')
      })
      .catch(() => toast.error('Failed to refresh ad groups'))
      .finally(() => setLoadingAdGroups(false))
  }

  const forceRefreshIdentities = (e) => {
    e.stopPropagation()
    if (!selectedAdvertiser || loadingIdentities) return
    fetchTikTokIdentities(selectedAdvertiser, true)
      .then(list => {
        setIdentities(list)
        if (list.length > 0) {
          const best = list.find(i => i.identity_type === 'TT_USER') ||
            list.find(i => i.identity_type === 'BC_AUTH_TT') ||
            list[0]
          setSelectedIdentity(best.identity_id)
        } else {
          setSelectedIdentity('')
        }
        toast.success('Identities refreshed!')
      })
      .catch(() => toast.error('Failed to refresh identities'))
  }

  // Handle Campaign Duplication request
  const handleDuplicateCampaign = useCallback(async (campaignId) => {
    if (!campaignId || !selectedAdvertiser || !newCampaignName.trim()) return
    const campaign = campaigns.find(c => c.campaign_id === campaignId)
    if (!campaign) return
    setIsDuplicating(true)
    const duplicatedName = newCampaignName.trim()
    try {
      const res = await tiktokFetch(`${API_BASE_URL}/api/tiktok/campaign/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: selectedAdvertiser,
          source_campaign_id: campaignId,
          new_campaign_name: duplicatedName,
          duplicate_ads: duplicateIncludeAds
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Duplication failed')
      }
      toast.success('🎉 Campaign duplicated successfully!')
      setNewCampaignName('')
      setDuplicateCampaign('')
      setShowDuplicateCampaignBlock(false)

      const newCampaignObj = {
        campaign_id: data.new_campaign_id,
        campaign_name: duplicatedName
      }

      if (data.new_campaign_id) {
        setCampaigns(prev => {
          if (prev.some(c => c.campaign_id === data.new_campaign_id)) return prev;
          return [newCampaignObj, ...prev];
        });
        setSelectedCampaign([data.new_campaign_id])
        setSelectedAdGroup([])
        setOpenCampaign(false)
      }

      const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
      try {
        const listRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`)
        const listData = await listRes.json()
        const list = listData.campaigns || []
        const mergedList = [
          newCampaignObj,
          ...list.filter(c => c.campaign_id !== data.new_campaign_id)
        ]
        setCampaigns(mergedList)
        writeCache(`tiktok_campaigns_${selectedAdvertiser}`, mergedList)
      } catch (err) {
        console.error('Failed to refetch campaigns:', err)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsDuplicating(false)
    }
  }, [selectedAdvertiser, campaigns, duplicateIncludeAds, newCampaignName, tiktokFetch, setCampaigns, setSelectedCampaign, setSelectedAdGroup])

  const getMimeFromName = (name) => {
    const ext = name.split('.').pop().toLowerCase()
    const map = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'webm': 'video/webm',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    }
    return map[ext] || 'application/octet-stream'
  }

  const handleVideoSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length === 0) return

    const taggedFiles = selectedFiles.map(file => {
      if (file.uniqueId) return file;
      file.uniqueId = `${file.name}-${file.lastModified || Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      return file;
    });

    if (setFiles) {
      setFiles(prev => [...(prev || []), ...taggedFiles])
    } else {
      setVideoFile(taggedFiles[0])
      setVideoPreview(URL.createObjectURL(taggedFiles[0]))
    }
    setUploadProgress(0)
    e.target.value = ""
  }

  const applyUtmsToUrl = (url, pairs = []) => {
    if (!url || !pairs || pairs.length === 0) return url
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      pairs.forEach(({ key, value }) => {
        if (key && value && !urlObj.searchParams.has(key)) {
          urlObj.searchParams.set(key, value)
        }
      })
      return urlObj.toString()
    } catch (e) {
      console.error('Failed to apply UTMs:', e)
      return url
    }
  }

  const toggleUploadSource = (id) => {
    setUploadSources(prev =>
      prev.includes(id)
        ? (prev.length > 1 ? prev.filter(s => s !== id) : prev)
        : [...prev, id]
    )
  }

  const handleUploadSourcesOpenChange = (open) => {
    setUploadSourcesOpen(open)
  }

  // Google Drive Auth Status
  useEffect(() => {
    const checkGoogleAuth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/google/status`, { withCredentials: true })
        setGoogleAuthStatus({
          checking: false,
          authenticated: response.data.authenticated,
          accessToken: response.data.accessToken
        })
      } catch (error) {
        setGoogleAuthStatus({ checking: false, authenticated: false, accessToken: null })
      }
    }
    checkGoogleAuth()
  }, [])

  // Google Picker Logic
  const createPicker = useCallback((token, initialFolderId = null) => {
    if (pickerInstanceRef.current) {
      try { pickerInstanceRef.current.setVisible(false); } catch (e) { }
    }
    setShowFolderInput(true)
    const mimeTypes = ["application/vnd.google-apps.folder", "image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm", "video/quicktime"].join(",")

    let mainView
    if (initialFolderId) {
      mainView = new google.picker.DocsView().setIncludeFolders(true).setMimeTypes(mimeTypes).setSelectFolderEnabled(false).setParent(initialFolderId)
    } else {
      mainView = new google.picker.DocsView().setIncludeFolders(true).setMimeTypes(mimeTypes).setSelectFolderEnabled(false)
    }

    const pickerBuilder = new google.picker.PickerBuilder()
      .setOAuthToken(token)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
      .hideTitleBar()
      .setAppId("102886794705")
      .setCallback((data) => {
        if (data.action === "picked") {
          const selected = data.docs.map(doc => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            size: doc.sizeBytes,
            accessToken: token,
            isDrive: true
          }))
          setDriveFiles(selected)
          if (selected.length > 0) {
            const file = selected[0]
            setVideoFile(null)
            setDropboxFiles([])
            toast.success(`Selected ${file.name} from Google Drive`)
          }
        }
        if (data.action === "picked" || data.action === "cancel") {
          setShowFolderInput(false)
          setFolderLinkValue("")
          pickerInstanceRef.current = null
        }
      })

    pickerBuilder.addView(mainView)
    const picker = pickerBuilder.build()
    pickerInstanceRef.current = picker
    picker.setVisible(true)
  }, [setDriveFiles, setVideoFile, setDropboxFiles])

  const openPicker = useCallback((token) => {
    if (!window.google || !window.google.picker) {
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js?onload=onApiLoad'
      document.body.appendChild(script)
      window.onApiLoad = () => {
        window.gapi.load('picker', () => createPicker(token))
      }
    } else {
      createPicker(token)
    }
  }, [createPicker])

  const handleDriveClick = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/google/status`, { withCredentials: true })
      if (res.data.authenticated && res.data.accessToken) {
        setGoogleAuthStatus({ authenticated: true, checking: false, accessToken: res.data.accessToken })
        openPicker(res.data.accessToken)
        return
      }
    } catch (err) { }

    const authWindow = window.open(`${API_BASE_URL}/auth/google?popup=true`, "_blank", "width=1100,height=750")
    if (!authWindow) return toast.error("Popup blocked. Please allow popups and try again.")

    const listener = (event) => {
      if (event.origin !== `${API_BASE_URL}`) return
      const { type, accessToken } = event.data || {}
      if (type === "google-auth-success") {
        window.removeEventListener("message", listener)
        authWindow.close()
        setGoogleAuthStatus({ authenticated: true, checking: false, accessToken })
        openPicker(accessToken)
      }
    }
    window.addEventListener("message", listener)
  }, [openPicker])

  const handleImportFromFolder = useCallback(async () => {
    if (!googleAuthStatus.accessToken) return toast.error('Not authenticated with Google Drive')
    const link = folderLinkValue || ""
    const fileMatch = link.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
    const fileId = fileMatch ? fileMatch[1] : null

    if (fileId) {
      try {
        setIsImportingFolder(true)
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
          headers: { Authorization: `Bearer ${googleAuthStatus.accessToken}` }
        })
        if (!response.ok) throw new Error("File not found or permission denied.")
        const data = await response.json()
        const newFile = { id: data.id, name: data.name, mimeType: data.mimeType, size: parseInt(data.size || "0", 10), accessToken: googleAuthStatus.accessToken, isDrive: true }
        setDriveFiles([newFile])
        setVideoFile(null)
        setDropboxFiles([])
        setShowFolderInput(false)
        setFolderLinkValue("")
        toast.success(`Imported: ${data.name}`)
      } catch (error) {
        toast.error("Failed to import file.")
      } finally {
        setIsImportingFolder(false)
      }
      return
    }

    const folderId = link.match(/folders\/([a-zA-Z0-9-_]+)/) ? link.match(/folders\/([a-zA-Z0-9-_]+)/)[1] : null
    if (!folderId) return toast.error('Invalid Google Drive link')
    createPicker(googleAuthStatus.accessToken, folderId)
  }, [folderLinkValue, googleAuthStatus.accessToken, createPicker, setDriveFiles, setVideoFile, setDropboxFiles])

  // Dropbox Logic
  useEffect(() => {
    if (document.getElementById('dropboxjs')) return
    const script = document.createElement('script')
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js'
    script.id = 'dropboxjs'
    script.setAttribute('data-app-key', import.meta.env.VITE_DROPBOX_APP_KEY || 'YOUR_DROPBOX_APP_KEY')
    script.async = true
    document.head.appendChild(script)
  }, [])

  const openDropboxChooser = useCallback((accessToken) => {
    window.Dropbox.choose({
      success: (selectedFiles) => {
        const dropboxFilesData = selectedFiles.map(file => ({
          dropboxId: file.id,
          name: file.name,
          link: file.link,
          directLink: file.link,
          size: file.bytes,
          isDropbox: true,
          mimeType: getMimeFromName(file.name),
          accessToken
        }))
        setDropboxFiles(dropboxFilesData)
        if (dropboxFilesData.length > 0) {
          setVideoFile(null)
          setDriveFiles([])
          toast.success(`Selected ${dropboxFilesData[0].name} from Dropbox`)
        }
      },
      linkType: 'direct',
      multiselect: false,
      extensions: ['.mp4', '.mov', '.webm'],
    })
  }, [setDropboxFiles, setVideoFile, setDriveFiles])

  const handleDropboxClick = useCallback(async () => {
    if (!window.Dropbox) return toast.error("Dropbox is still loading.")
    try {
      const statusRes = await fetch(`${API_BASE_URL}/auth/dropbox/status`, { credentials: 'include' })
      const statusData = await statusRes.json()
      if (statusData.authenticated && statusData.accessToken) {
        openDropboxChooser(statusData.accessToken)
        return
      }
    } catch (err) { }

    const authWindow = window.open(`${API_BASE_URL}/auth/dropbox?popup=true`, 'dropbox-auth', "width=600,height=700")
    const handleMessage = (event) => {
      if (event.origin !== API_BASE_URL) return
      if (event.data?.type === 'dropbox-auth-success') {
        window.removeEventListener('message', handleMessage)
        openDropboxChooser(event.data.accessToken)
      }
    }
    window.addEventListener('message', handleMessage)
  }, [openDropboxChooser])

  const computeAdNameFromFormula = useCallback((file, iterationIndex = 0, link = "", formula = null, adType = "") => {
    const formulaToUse = formula || adNameFormulaV2;
    if (!formulaToUse?.rawInput?.trim()) {
      return adName || "Ad Generated Through Blip";
    }

    let fileName = "";
    if (file && file.name) {
      fileName = file.name.replace(/\.[^/.]+$/, "");
    }

    let fileType = "";
    if (file) {
      const type = file.type || file.mimeType || "";
      if (type.startsWith("video/") || type === "video/quicktime" || /\.(mov|mp4|avi|webm|mkv|m4v)$/i.test(file.name || "")) {
        fileType = "Video";
      } else {
        fileType = "Static";
      }
    }

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

    let adTypeLabel = "Video";
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthAbbrev = monthNames[now.getMonth()];
    const date = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();

    const formatDate = (formatStr) => {
      const day = now.getDate();
      const month = now.getMonth();
      const year = now.getFullYear();
      const fmt = formatStr === 'custom' ? 'MMDDYYYY' : formatStr.toUpperCase();
      return fmt
        .replace(/YYYY/g, String(year))
        .replace(/YY/g, String(year).slice(-2))
        .replace(/MMM/g, monthNames[month])
        .replace(/MM/g, String(month + 1).padStart(2, '0'))
        .replace(/M/g, String(month + 1))
        .replace(/DD/g, String(day).padStart(2, '0'))
        .replace(/D/g, String(day));
    };

    let calculatedName = formulaToUse.rawInput
      .replace(/\{\{File Name\}\}/gi, fileName)
      .replace(/\{\{File Type\}\}/gi, fileType)
      .replace(/\{\{Date \(MonthYYYY\)\}\}/gi, `${monthAbbrev}${year}`)
      .replace(/\{\{Date \(MonthDDYYYY\)\}\}/gi, `${monthAbbrev}${date}${year}`)
      .replace(/\{\{Date\(([^)]+)\)\}\}/gi, (match, fmt) => formatDate(fmt))
      .replace(/\{\{Iteration\}\}/gi, String(iterationIndex + 1).padStart(2, "0"))
      .replace(/\{\{URL Slug\}\}/gi, urlSlug)
      .replace(/\{\{Ad Type\}\}/gi, adTypeLabel);

    calculatedName = calculatedName.replace(/\{\{([^}]+)\}\}/g, "");
    return calculatedName.trim() || "Ad Generated Through Blip";
  }, [adNameFormulaV2, adName]);

  const hasMediaInFormData = (fd) => {
    if (fd.adType === 'SPARK') return true;
    return fd.files.length > 0 || fd.driveFiles.length > 0 || fd.dropboxFiles.length > 0 || fd.tiktokLibraryFiles.length > 0;
  }

  const clearQueuedMedia = () => {
    setAdName('')
    setAdTexts([''])
    setLandingUrl('')
    setCta(['SHOP_NOW'])
    setVideoFile(null)
    setVideoPreview(null)
    if (setFiles) setFiles([])
    setDriveFiles([])
    setDropboxFiles([])
    setUploadProgress(0)
    if (setSparkAuthCode) setSparkAuthCode('')
    setDuplicateAdGroup('')
    setNewAdGroupName('')
    setShowDuplicateAdGroupBlock(false)
    setFileVariantMap({})
    setGroupVariantMap({})
    setPostVariantMap({})
  }

  // Submit form handler to queue background jobs
  const handleQueueJob = async (e) => {
    e.preventDefault();

    if (isQueueingJobs) {
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

      const fd = job.formData;

      if (!fd.selectedAdvertiser) {
        toast.error(`${variant.name}: Please select an advertiser account`);
        return;
      }

      if (!fd.isDuplicatingAdGroupMode && (!fd.selectedAdGroup || fd.selectedAdGroup.length === 0)) {
        toast.error(`${variant.name}: Please select at least one ad group`);
        return;
      }

      if (fd.isDuplicatingAdGroupMode && !fd.newAdGroupName.trim()) {
        toast.error(`${variant.name}: Please enter a name for the new duplicated ad group`);
        return;
      }

      if (!fd.selectedIdentity || fd.selectedIdentity === 'CUSTOMIZED_USER') {
        toast.error(fd.adType === 'NORMAL'
          ? `${variant.name}: Identity is required. Please select one.`
          : `${variant.name}: Promote From is required. Please select a linked TikTok account.`
        );
        return;
      }

      if (fd.adType === 'SPARK') {
        if (!fd.sparkAuthCode || !fd.sparkAuthCode.trim()) {
          toast.error(`${variant.name}: Spark Ads require an Organic Post Authorization Code or link.`);
          return;
        }
      }

      const hasFormula = adNameFormulaV2?.rawInput?.trim();
      if (!hasFormula && !fd.adName.trim()) {
        toast.error(`${variant.name}: Ad name is required`);
        return;
      }

      if (!fd.cta || fd.cta.length === 0) {
        toast.error(`${variant.name}: Please select at least one Call to Action`);
        return;
      }

      if (fd.adType !== 'SPARK') {
        const activeTexts = fd.adTexts ? fd.adTexts.filter(t => t.trim() !== '') : [];
        if (activeTexts.length === 0) {
          toast.error(`${variant.name}: Please enter ad text`);
          return;
        }
        for (const singleText of activeTexts) {
          if (singleText.length > 100) {
            toast.error(`${variant.name}: Text cannot exceed 100 characters ("${singleText.substring(0, 15)}...")`);
            return;
          }
        }
      }

      if (fd.urlMode === 'WEBSITE') {
        if (!fd.landingUrl || !fd.landingUrl.trim()) {
          toast.error(`${variant.name}: Landing Page URL is required`);
          return;
        }

        let isValidUrl = false;
        try {
          const urlString = fd.landingUrl.trim();
          if (/^https?:\/\//i.test(urlString)) {
            new URL(urlString);
            isValidUrl = true;
          }
        } catch (_) { }

        if (!isValidUrl) {
          toast.error(`${variant.name}: Please enter a valid Landing Page URL starting with http:// or https://`);
          return;
        }
      }

      newJobs.push(job);
    }

    if (newJobs.length === 0) {
      toast.error('No variants have files assigned or required fields filled. Nothing to publish.');
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
    } finally {
      setIsQueueingJobs(false);
    }
  };

  const refreshPage = () => {
    window.location.reload();
  }

  const formatQueuedJobLabel = (job, prefix) => {
    const adGroupName = job.formData?.selectedAdGroup?.map(id => {
      return adGroups.find(ag => ag.adgroup_id === id)?.adgroup_name || id;
    }).join(', ') || 'Duplicated Group';

    const summary = `${job.adCount} ad${job.adCount !== 1 ? 's' : ''} to ${adGroupName}`;
    return job.showVariantLabel && job.variantName
      ? `${prefix} ${job.variantName}: ${summary}`
      : `${prefix} ${summary}`;
  };

  const duplicateCaptionIndices = useMemo(() => {
    const dupes = new Set();
    const seen = {};
    adTexts.forEach((val, i) => {
      const normalized = val.trim().toLowerCase();
      if (!normalized) return;
      if (normalized in seen) {
        dupes.add(i);
      } else {
        seen[normalized] = i;
      }
    });
    return dupes;
  }, [adTexts]);

  const hasDuplicateCaptions = duplicateCaptionIndices.size > 0;

  const getValidationErrors = useCallback(() => {
    const errors = []

    if (!selectedAdvertiser) {
      errors.push("Select an advertiser account")
    }

    if (!selectedCampaign || selectedCampaign.length === 0) {
      errors.push("Select a campaign")
    }

    const isDuplicatingAdGroup = showDuplicateAdGroupBlock && duplicateAdGroup
    if (!isDuplicatingAdGroup && (!selectedAdGroup || selectedAdGroup.length === 0)) {
      errors.push("Select at least one ad group")
    }

    if (isDuplicatingAdGroup && !newAdGroupName.trim()) {
      errors.push("Enter a name for the duplicated ad group")
    }

    if (!selectedIdentity || selectedIdentity === 'CUSTOMIZED_USER') {
      errors.push(adType === 'NORMAL' ? "Select an identity" : "Select an account to Promote From")
    }

    if (adType === 'SPARK') {
      if (!sparkAuthCode || !sparkAuthCode.trim()) {
        errors.push("Organic Post Authorization Code is required")
      }
    } else {
      const activeTexts = adTexts ? adTexts.filter(t => t.trim() !== '') : []
      if (activeTexts.length === 0) {
        errors.push("Enter ad text")
      }
      for (const singleText of activeTexts) {
        if (singleText.length > 100) {
          errors.push(`Text cannot exceed 100 characters ("${singleText.substring(0, 15)}...")`)
        }
      }
    }

    const hasFormula = adNameFormulaV2?.rawInput?.trim()
    if (!hasFormula && !adName.trim()) {
      errors.push("Ad name is required")
    }

    if (!cta || cta.length === 0) {
      errors.push("Select at least one Call to Action")
    }

    if (urlMode === 'WEBSITE') {
      if (!landingUrl || !landingUrl.trim()) {
        errors.push("Landing Page URL is required")
      } else {
        let isValidUrl = false
        try {
          const urlString = landingUrl.trim()
          if (/^https?:\/\//i.test(urlString)) {
            new URL(urlString)
            isValidUrl = true
          }
        } catch (_) { }
        if (!isValidUrl) {
          errors.push("Landing Page URL must be a valid URL starting with http:// or https://")
        }
      }
    }

    return errors
  }, [
    selectedAdvertiser, selectedCampaign, showDuplicateAdGroupBlock, duplicateAdGroup,
    selectedAdGroup, newAdGroupName, selectedIdentity, adType, sparkAuthCode,
    adTexts, adNameFormulaV2, adName, cta, urlMode, landingUrl
  ])

  const validationErrors = getValidationErrors()
  const isFormValid = validationErrors.length === 0

  return (
    <>
      <form onSubmit={handleQueueJob} className="space-y-6">

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
                    className="!w-10 h-10 object-contain"
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
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-sm">Job Queue</h3>
                      <p className="text-sm font-medium text-gray-400">{jobQueue.length + (currentJob && jobQueue.length === 0 ? 1 : 0)} Active</p>
                    </div>
                  </div>
                  <button
                    type="button"
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
                              <CheckIcon className="w-6 h-6 text-green-500" />
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
                                type="button"
                                onClick={refreshPage}
                                className="text-orange-600 hover:text-orange-800 p-1 rounded"
                                title="Retry job"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}

                            {job.formData?.selectedAdvertiser && (
                              <a
                                href={`https://ads.tiktok.com/i18n/dashboard?advertiser_id=${job.formData.selectedAdvertiser}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-500 hover:text-blue-500 transition-colors p-1"
                                title="View in TikTok Ads Manager"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}

                            {(job.status === 'error' || job.status === 'partial-success') && job.formData && (
                              <button
                                type="button"
                                onClick={() => handleRetryJob(job)}
                                className="text-gray-500 hover:text-blue-500 transition-colors p-1"
                                title="Restore to form"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              type="button"
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
                        <span className="text-sm font-semibold text-gray-900">{Math.round(videoUploading ? videoUploadProgress : (progress || trackedProgress || 0))}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${videoUploading ? videoUploadProgress : (progress || trackedProgress || 0)}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            setIsCancelling(true);
                            if (currentAbortController) {
                              currentAbortController.abort();
                            }
                            const cancelJobId = currentJobIdRef.current || jobId;
                            if (cancelJobId) {
                              try {
                                await fetch(`${API_BASE_URL}/auth/cancel-job`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ jobId: cancelJobId })
                                });
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
                          <p className="text-xs text-gray-500">{videoUploading ? 'Uploading video to TikTok...' : (progressMessage || trackedMessage)}</p>
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
                        type="button"
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
        )}

        {/* Card 1: Ads Account and Configuration */}
        <Card className="!bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CogIcon className="w-5 h-5" />
                Ad Account Configuration
              </div>
            </CardTitle>
            <CardDescription>Select your ad account, campaign and ad set</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">

            {/* 1. Advertiser Account Combobox */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {renderDiffMark("selectedAdvertiser")}
                  <AdAccountIcon className="w-4 h-4" />
                  Ad Account
                </Label>
                {authLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
              </div>
              <Popover open={openAdvertiser} onOpenChange={setOpenAdvertiser}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white"
                  >
                    <span className="truncate text-sm font-medium">
                      {selectedAdvertiser
                        ? (() => {
                          const found = advertisers.find(a => String(a.advertiser_id || a.id) === String(selectedAdvertiser));
                          return found ? (found.advertiser_name || found.name || selectedAdvertiser) : selectedAdvertiser;
                        })()
                        : "Select Ad Account"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" side="bottom" avoidCollisions={false} style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput
                      placeholder="Search Advertiser..."
                      value={advertiserSearch}
                      onValueChange={setAdvertiserSearch}
                      className="bg-transparent border-none focus:ring-0"
                    />
                    <CommandEmpty>No advertiser found.</CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                      <CommandGroup>
                        {advertisers?.filter(adv =>
                          (adv.advertiser_name || adv.name || '').toLowerCase().includes(advertiserSearch.toLowerCase()) ||
                          (adv.advertiser_id || adv.id || '').toLowerCase().includes(advertiserSearch.toLowerCase())
                        ).map((a) => {
                          const id = a.advertiser_id || a.id
                          return (
                            <CommandItem
                              key={id}
                              value={id}
                              onSelect={() => {
                                handleAdvertiserChange(id)
                                setOpenAdvertiser(false)
                              }}
                              className={cn(
                                "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                selectedAdvertiser === id ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                              )}
                            >
                              <span className="text-sm font-medium">{a.advertiser_name || a.name || id}</span>
                              {selectedAdvertiser === id && <Check className="ml-auto h-4 w-4 text-black" />}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {!selectedAdvertiser && (
                <p className="text-xs text-red-500 font-medium mt-1">Please select an advertiser account</p>
              )}
            </div>

            {/* 2. Campaign Combobox with Duplication Form */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {renderDiffMark("selectedCampaign")}
                  <CampaignIcon className="w-4 h-4" />
                  Select a Campaign to launch Ads in
                </Label>
                <div className="flex items-center gap-2">
                  {loadingCampaigns && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
                  <button
                    type="button"
                    onClick={forceRefreshCampaigns}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh campaigns"
                  >
                    <RefreshCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <Popover open={openCampaign} onOpenChange={setOpenCampaign}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white"
                  >
                    <span className="truncate text-sm font-medium">
                      {selectedCampaign.length === 0
                        ? "Select Campaigns"
                        : selectedCampaign.length === 1
                          ? campaigns.find(c => c.campaign_id === selectedCampaign[0])?.campaign_name || selectedCampaign[0]
                          : `${selectedCampaign.length} campaigns selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" side="bottom" avoidCollisions={false} style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput
                      placeholder="Search campaigns..."
                      value={campaignSearch}
                      onValueChange={setCampaignSearch}
                      className="bg-transparent border-none focus:ring-0"
                    />
                    <CommandEmpty>No campaign found.</CommandEmpty>
                    <CommandList className="max-h-[220px] overflow-y-auto rounded-2xl custom-scrollbar">
                      <CommandGroup>
                        {filteredCampaigns.map((c) => {
                          const isSelected = selectedCampaign.includes(c.campaign_id)
                          return (
                            <CommandItem
                              key={c.campaign_id}
                              value={c.campaign_id}
                              onSelect={() => {
                                if (isSelected) {
                                  setSelectedCampaign(prev => prev.filter(id => id !== c.campaign_id))
                                } else {
                                  setSelectedCampaign(prev => [...prev, c.campaign_id])
                                }
                              }}
                              className={cn(
                                "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                isSelected ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                              )}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Checkbox
                                  id={`campaign-${c.campaign_id}`}
                                  checked={isSelected}
                                  className="w-4 h-4 bg-white border border-gray-300 rounded-[6px] data-[state=checked]:bg-zinc-800 data-[state=checked]:text-white pointer-events-none"
                                />
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                  <span className={cn("text-sm font-medium truncate flex-1", (c.operation_status === "DISABLE" || c.operation_status === false || c.operation_status === "false") && "text-gray-400")}>
                                    {c.campaign_name}
                                  </span>
                                  {(c.operation_status === "ENABLE" || c.operation_status === true || c.operation_status === "true") && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>

                    <div className="p-2 border-t border-gray-100">
                      <Button
                        type="button"
                        disabled={campaigns.length === 0}
                        onClick={() => {
                          if (selectedCampaign.length === 1) {
                            const campId = selectedCampaign[0];
                            setDuplicateCampaign(campId);
                            const camp = campaigns.find(c => c.campaign_id === campId);
                            if (camp) {
                              setNewCampaignName((camp.campaign_name || '') + "_copy");
                            }
                          } else {
                            setDuplicateCampaign("");
                            setNewCampaignName("");
                          }
                          setShowDuplicateCampaignBlock(true);
                          setOpenCampaign(false);
                        }}
                        className="h-10 w-full px-4 py-3 rounded-2xl bg-zinc-800 text-white hover:!bg-black hover:!text-white shadow-md flex items-center justify-center text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-none"
                      >
                        <CampaignIcon className="mr-2 h-4 w-4 text-white" />
                        Launch in a New Campaign
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>


              {showDuplicateCampaignBlock && (
                <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 relative mt-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicateCampaignBlock(false)
                      setDuplicateCampaign("")
                      setNewCampaignName("")
                    }}
                    className="absolute top-2 right-2 p-0.5 rounded-full !bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                    aria-label="Close duplicate campaign selection"
                  >
                    <X className="h-3 w-3 text-gray-700" />
                  </button>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="duplicateCampaign" className="flex items-center gap-2">
                      {renderDiffMark("duplicateCampaign")}
                      <CopyIcon className="w-4 h-4" />
                      Select a campaign to duplicate
                    </Label>
                    <Label className="text-gray-500 text-[12px] font-regular">We'll copy the campaign and all its ad groups</Label>

                    {/* Dropdown/Popover to select campaign to duplicate */}
                    <Popover open={openDuplicateCampaign} onOpenChange={setOpenDuplicateCampaign}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openDuplicateCampaign}
                          disabled={campaigns.length === 0}
                          className="w-full justify-between border border-gray-400 rounded-2xl bg-white shadow-sm overflow-hidden whitespace-nowrap hover:!bg-white text-sm h-11 px-5 font-normal text-gray-900 transition-all duration-150"
                        >
                          <span className="block truncate text-left">
                            {duplicateCampaign
                              ? campaigns.find((c) => c.campaign_id === duplicateCampaign)?.campaign_name || duplicateCampaign
                              : "Select campaign to duplicate"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0 bg-white shadow-lg rounded-2xl"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={{
                          width: 'var(--radix-popover-trigger-width)'
                        }}
                      >
                        <Command>
                          <CommandInput
                            placeholder="Search campaign..."
                            value={duplicateCampaignSearchValue}
                            onValueChange={setDuplicateCampaignSearchValue}
                            className="bg-transparent border-none focus:ring-0"
                          />
                          <CommandEmpty>No campaigns found.</CommandEmpty>
                          <CommandList className="max-h-[220px] overflow-y-auto rounded-2xl custom-scrollbar">
                            <CommandGroup>
                              {campaigns
                                .filter((c) =>
                                  (c.campaign_name || c.campaign_id || '').toLowerCase().includes(duplicateCampaignSearchValue.toLowerCase())
                                )
                                .map((c) => (
                                  <CommandItem
                                    key={c.campaign_id}
                                    value={c.campaign_id}
                                    onSelect={() => {
                                      setDuplicateCampaign(c.campaign_id);
                                      setNewCampaignName((c.campaign_name || '') + "_copy");
                                      setOpenDuplicateCampaign(false);
                                    }}
                                    className={cn(
                                      "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150 hover:bg-gray-50",
                                      duplicateCampaign === c.campaign_id && "bg-gray-100 font-semibold"
                                    )}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className={cn("text-sm font-medium", (c.operation_status === "DISABLE" || c.operation_status === false || c.operation_status === "false") && "text-gray-400")}>
                                        {c.campaign_name}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {(c.operation_status === "ENABLE" || c.operation_status === true || c.operation_status === "true") && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                                        {duplicateCampaign === c.campaign_id && <Check className="h-4 w-4 text-black shrink-0" />}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* New Campaign Name Input */}
                    {duplicateCampaign && (
                      <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                          <Label htmlFor="newCampaignName" className="inline-flex items-center gap-1">
                            {renderDiffMark("newCampaignName")}
                            <span>New campaign name</span>
                          </Label>
                          <Input
                            id="newCampaignName"
                            value={newCampaignName}
                            onChange={(e) => setNewCampaignName(e.target.value)}
                            placeholder="Enter new campaign name..."
                            className="border border-gray-300 rounded-2xl bg-white shadow-sm py-2 px-4 text-sm h-11 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleDuplicateCampaign(duplicateCampaign)}
                          disabled={isDuplicating || !newCampaignName.trim()}
                          className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 px-4 shadow transition-all active:scale-[0.98]"
                        >
                          {isDuplicating ? (
                            <><Loader className="w-4 h-4 animate-spin" />Duplicating...</>
                          ) : (
                            "Create Campaign"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Ad Group Combobox */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {renderDiffMark("selectedAdGroup")}
                  <AdSetIcon className="w-4 h-4" />
                  Launch in a new or existing ad group
                </Label>
                <div className="flex items-center gap-2">
                  {loadingAdGroups && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
                  <button
                    type="button"
                    onClick={forceRefreshAdGroups}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh ad groups"
                  >
                    <RefreshCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <Popover open={openAdGroup} onOpenChange={setOpenAdGroup}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={selectedCampaign.length === 0}
                    className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white"
                  >
                    <span className="truncate text-sm font-medium">
                      {selectedAdGroup.length === 0
                        ? "Select Ad Groups"
                        : selectedAdGroup.length === 1
                          ? adGroups.find(ag => ag.adgroup_id === selectedAdGroup[0])?.adgroup_name || selectedAdGroup[0]
                          : `${selectedAdGroup.length} ad groups selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" side="bottom" avoidCollisions={false} style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput
                      placeholder="Search ad groups..."
                      value={adGroupSearch}
                      onValueChange={setAdGroupSearch}
                      className="bg-transparent border-none focus:ring-0"
                    />
                    <CommandEmpty>No ad group found.</CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                      {filteredAdGroups.length > 0 && (
                        <CommandGroup>
                          {(() => {
                            const groupedByCampaign = filteredAdGroups.reduce((acc, adgroup) => {
                              const campaignId = adgroup.campaignId || 'unknown';
                              if (!acc[campaignId]) {
                                acc[campaignId] = [];
                              }
                              acc[campaignId].push(adgroup);
                              return acc;
                            }, {});

                            return Object.entries(groupedByCampaign).map(([campaignId, campaignAdGroups]) => {
                              const campaignName = campaignAdGroups[0]?.campaignName || campaignId;
                              return (
                                <div key={campaignId}>
                                  {selectedCampaign.length >= 2 && (
                                    <div className="px-4 py-2 mx-1 mb-1 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg pointer-events-none">
                                      {campaignName} Ad Groups
                                    </div>
                                  )}
                                  {campaignAdGroups.map((ag) => {
                                    const isSelected = selectedAdGroup.includes(ag.adgroup_id);
                                    return (
                                      <CommandItem
                                        key={`${ag.campaignId || 'camp'}-${ag.adgroup_id}`}
                                        value={ag.adgroup_id}
                                        onSelect={() => {
                                          if (isSelected) {
                                            setSelectedAdGroup(prev => prev.filter(id => id !== ag.adgroup_id))
                                          } else {
                                            setSelectedAdGroup(prev => [...prev, ag.adgroup_id])
                                          }
                                        }}
                                        className={cn(
                                          "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                          isSelected ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <Checkbox
                                            id={`adgroup-${ag.adgroup_id}`}
                                            checked={isSelected}
                                            className="w-4 h-4 bg-white border border-gray-300 rounded-[6px] data-[state=checked]:bg-zinc-800 data-[state=checked]:text-white pointer-events-none"
                                          />
                                          <div className="flex-1 min-w-0 flex items-center justify-between">
                                            <span className={cn("text-sm font-medium truncate flex-1", (ag.operation_status === "DISABLE" || ag.operation_status === false || ag.operation_status === "false") && "text-gray-400")}>
                                              {ag.adgroup_name}
                                            </span>
                                            {(ag.operation_status === "ENABLE" || ag.operation_status === true || ag.operation_status === "true") && (
                                              <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                            )}
                                          </div>
                                        </div>
                                      </CommandItem>
                                    )
                                  })}
                                </div>
                              )
                            });
                          })()}
                        </CommandGroup>
                      )}
                    </CommandList>

                    <div className="p-2 border-t border-gray-100">
                      <Button
                        type="button"
                        disabled={campaigns.length === 0}
                        onClick={() => {
                          setShowDuplicateAdGroupBlock(true);
                          setOpenAdGroup(false);
                        }}
                        className="h-10 w-full px-4 py-3 rounded-2xl bg-zinc-800 text-white hover:!bg-black hover:!text-white shadow-md flex items-center justify-center text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-none"
                      >
                        🚀 Launch in a New Ad Group
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>


              {selectedAdGroup.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedAdGroup.map((id) => {
                    const adgroup = adGroups.find((a) => a.adgroup_id === id)
                    return (
                      <label
                        key={id}
                        className="inline-flex items-center gap-2 bg-white rounded-2xl border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <button
                          type="button"
                          aria-label={`Remove ${adgroup ? adgroup.adgroup_name : id}`}
                          onClick={() => setSelectedAdGroup(prev => prev.filter((item) => item !== id))}
                          className="flex h-4 w-4 items-center justify-center"
                        >
                          <CheckBlackIcon className="w-4.5 h-4.5" />
                        </button>
                        <span className="text-gray-800 text-xs break-all">{adgroup ? adgroup.adgroup_name : id}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {showDuplicateAdGroupBlock && (
                <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 relative mt-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicateAdGroupBlock(false)
                      setDuplicateAdGroup("")
                      setNewAdGroupName("")
                    }}
                    className="absolute top-2 right-2 p-0.5 rounded-full !bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                    aria-label="Close duplicate ad group selection"
                  >
                    <X className="h-3 w-3 text-gray-700" />
                  </button>
                  <div className="flex-1 space-y-2">
                    <div className="flex-1 space-y-2">
                      <Label className="flex items-center gap-2">
                        {renderDiffMark("duplicateAdGroup")}
                        <Copy className="w-4 h-4 text-gray-700 shrink-0" />
                        Select an ad set shell to duplicate
                      </Label>
                      <Label className="text-gray-500 text-[12px] font-regular">We’ll retain all targeting settings and replace the creative</Label>
                    </div>

                    <Popover open={openDuplicateAdGroup} onOpenChange={setOpenDuplicateAdGroup}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={openDuplicateAdGroup}
                          disabled={adGroups.length === 0}
                          className="w-full justify-between border border-gray-400 rounded-2xl bg-white shadow-sm overflow-hidden whitespace-nowrap hover:!bg-white text-sm h-11 px-5 font-normal text-gray-900 transition-all duration-150"
                        >
                          <span className="block truncate text-left">
                            {duplicateAdGroup
                              ? adGroups.find((ag) => ag.adgroup_id === duplicateAdGroup)?.adgroup_name || duplicateAdGroup
                              : "Select existing ad group"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0 bg-white shadow-lg rounded-2xl"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={{
                          width: 'var(--radix-popover-trigger-width)'
                        }}
                      >
                        <Command>
                          <CommandInput
                            placeholder="Search ad group..."
                            value={duplicateAdGroupSearchValue}
                            onValueChange={setDuplicateAdGroupSearchValue}
                            className="bg-transparent border-none focus:ring-0"
                          />
                          <CommandEmpty>No ad groups found.</CommandEmpty>
                          <CommandList className="max-h-[220px] overflow-y-auto rounded-2xl custom-scrollbar">
                            <CommandGroup>
                              {adGroups
                                .filter((ag) =>
                                  (ag.adgroup_name || ag.adgroup_id || '').toLowerCase().includes(duplicateAdGroupSearchValue.toLowerCase())
                                )
                                .map((ag) => (
                                  <CommandItem
                                    key={ag.adgroup_id}
                                    value={ag.adgroup_id}
                                    onSelect={() => {
                                      setDuplicateAdGroup(ag.adgroup_id);
                                      setOpenDuplicateAdGroup(false);
                                    }}
                                    className={cn(
                                      "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150 hover:bg-gray-50",
                                      duplicateAdGroup === ag.adgroup_id && "bg-gray-100 font-semibold"
                                    )}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className={cn("text-sm font-medium", (ag.operation_status === "DISABLE" || ag.operation_status === false || ag.operation_status === "false") && "text-gray-400")}>
                                        {ag.adgroup_name}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {(ag.operation_status === "ENABLE" || ag.operation_status === true || ag.operation_status === "true") && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                                        {duplicateAdGroup === ag.adgroup_id && <Check className="h-4 w-4 text-black shrink-0" />}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* New Ad Group Name Input */}
                    {duplicateAdGroup && (
                      <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                          <Label htmlFor="newAdGroupName" className="text-xs font-semibold text-gray-700">
                            {renderDiffMark("newAdGroupName")}
                            <span>New ad set name</span>
                          </Label>
                          <Input
                            id="newAdGroupName"
                            value={newAdGroupName}
                            onChange={(e) => setNewAdGroupName(e.target.value)}
                            placeholder="Enter new ad group name..."
                            className="border border-gray-300 rounded-2xl bg-white shadow-sm py-2 px-4 text-sm h-11 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                          />
                          {!newAdGroupName.trim() && (
                            <p className="text-xs text-red-500 font-medium mt-1">Please enter a name for the duplicated ad group</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Card 2: Select Ad Preferences */}
        <Card className="!bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4 md:gap-2">
              <div className="flex items-center gap-2">
                <ConfigIcon className="w-5 h-5 text-gray-500" />
                Select ad preferences
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Label htmlFor="ad-type" className="text-sm whitespace-nowrap flex items-center gap-2">
                  {renderDiffMark("adType")}
                  Ad Type:
                </Label>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={activeVariantId !== 'default' ? 'cursor-not-allowed' : ''}>
                        <Select
                          value={adType}
                          onValueChange={(value) => {
                            if (activeVariantId !== 'default') return;
                            setAdType(value);
                            const firstLinked = identities.find(i => i.identity_type === 'TT_USER' || i.identity_type === 'BC_AUTH_TT') || identities[0];
                            if (firstLinked) {
                              setSelectedIdentity(firstLinked.identity_id);
                            } else {
                              setSelectedIdentity('');
                            }
                          }}
                          disabled={activeVariantId !== 'default'}
                        >
                          <SelectTrigger className={cn("w-[180px] h-10 py-2 font-medium", formFieldChrome)}>
                            <SelectValue placeholder="Select ad type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl gap-4">
                            <SelectItem
                              value="NORMAL"
                              className="rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5"
                            >
                              Normal Ad
                            </SelectItem>
                            <SelectItem
                              value="SPARK"
                              className="rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5"
                            >
                              Spark Ad
                            </SelectItem>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">

            {/* 2. Identity / Promote From (Linked Account) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {renderDiffMark("selectedIdentity")}
                  <Users className="w-4 h-4 text-gray-500" />
                  {adType === 'NORMAL' ? 'Identity' : 'Promote From'}
                </Label>
                <div className="flex items-center gap-2">
                  {loadingIdentities && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
                  <button
                    type="button"
                    onClick={forceRefreshIdentities}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh identities"
                    disabled={!selectedAdvertiser || loadingIdentities}
                  >
                    <RefreshCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <Popover open={openIdentity} onOpenChange={setOpenIdentity}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={!selectedAdvertiser || loadingIdentities}
                    className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow transition-colors duration-150 hover:bg-white disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <span className="truncate text-sm font-medium flex items-center gap-1.5">
                      {selectedIdentity && selectedIdentity !== 'CUSTOMIZED_USER'
                        ? (() => {
                          const found = identities.find(i => i.identity_id === selectedIdentity);
                          return found ? (
                            <span className="font-semibold text-gray-900">{found.display_name}</span>
                          ) : <span>{selectedIdentity}</span>;
                        })()
                        : <span>{adType === 'NORMAL' ? "Select Identity" : "Select account to Promote From"}</span>}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" side="bottom" avoidCollisions={false} style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder={adType === 'NORMAL' ? "Search identities..." : "Search accounts to promote from..."} className="bg-transparent border-none focus:ring-0" />
                    <CommandEmpty>{adType === 'NORMAL' ? "No identities found." : "No accounts found."}</CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                      <CommandGroup>
                        {identities.map((i) => (
                          <CommandItem
                            key={i.identity_id}
                            value={i.identity_id}
                            onSelect={() => {
                              setSelectedIdentity(i.identity_id)
                              setOpenIdentity(false)
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                              selectedIdentity === i.identity_id ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-gray-900">{i.display_name}</span>
                              <span className="text-xs text-gray-400 font-normal">{i.identity_id}</span>
                            </div>
                            {selectedIdentity === i.identity_id && <Check className="ml-auto h-4 w-4 text-black" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {(!selectedIdentity || selectedIdentity === 'CUSTOMIZED_USER') && (
                <p className="text-xs text-red-500 font-medium mt-1">
                  {adType === 'NORMAL' ? "Please select an identity" : "Please select an account to Promote From"}
                </p>
              )}
            </div>

            {/* Organic Post to Boost for Spark Ads */}
            {adType === 'SPARK' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {renderDiffMark("sparkAuthCode")}
                  <Zap className="w-4 h-4 text-gray-500" />
                  Organic Post Authorization Code / Link
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 5zcX8aB9 or copy-paste the authorized video link"
                  value={sparkAuthCode || ''}
                  onChange={e => setSparkAuthCode(e.target.value)}
                  className={formInputChrome}
                />
                {(!sparkAuthCode || !sparkAuthCode.trim()) && (
                  <p className="text-xs text-red-500 font-medium mt-1">Organic Post Authorization Code is required</p>
                )}
                <p className="text-xs text-gray-400 leading-relaxed pl-1">
                  Enter the organic post video code (authorized from the TikTok app) or the post link to boost it as a Spark Ad.
                </p>
              </div>
            )}

            {/* Creative Fields - Visible for both Normal and Spark Ad types */}
            <div className="space-y-6">
              {/* 3. Ad Name */}
              <div id="adName" className="space-y-1">
                <Label htmlFor="adName" className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {renderDiffMark("adNameFormulaV2")}
                    <LabelIcon className="w-4 h-4" />
                    <span className="font-semibold text-sm">Ad Name</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/settings?tab=tiktok&adsaccount=${selectedAdvertiser}`)}
                    className="text-xs px-3 pl-2 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900 ml-auto h-7 flex items-center gap-1 font-medium"
                    title="Configure ad name formula in settings"
                  >
                    <CogIcon className="w-3 h-3 text-white mr-1" />
                    Set Up Ad Name Formula
                  </Button>
                </Label>

                <ReorderAdNameParts
                  formulaInput={adNameFormulaV2?.rawInput || ""}
                  onFormulaChange={(newRawInput) => {
                    setAdNameFormulaV2({ rawInput: newRawInput });
                  }}
                  variant="home"
                  customVariables={advertiserPrefs?.customVariables || []}
                />
                <div className="mt-1">
                  <Label className="text-xs text-gray-500">
                    Ad Name Preview: {
                      (files?.length > 0 || videoFile || driveFiles?.length > 0 || dropboxFiles?.length > 0)
                        ? computeAdNameFromFormula(files[0] || videoFile || driveFiles[0] || dropboxFiles[0], 0, landingUrl, null, adType)
                        : "Upload a file to see example"
                    }
                  </Label>
                </div>

              </div>

              {/* 4. Ad Copy / Caption with template picker */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="flex items-center gap-2 mb-0">
                        <TemplateIcon className="w-4 h-4 text-zinc-600" />
                        Select a Copy Template
                      </Label>

                      {/* No templates + no content → Setup button */}
                      {Object.keys(copyTemplates).length === 0 && !hasAnyContent && selectedAdvertiser && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/settings?tab=tiktok&adsaccount=${selectedAdvertiser}`)}
                          className="text-xs px-3 pl-2 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900 ml-auto h-7 flex items-center gap-1 font-medium"
                        >
                          <CogIcon className="w-3 h-3 text-white mr-1" />
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
                            disabled={isSavingNew || isUpdatingTemplate || !!existingDuplicateTemplate}
                            onClick={() => setShowSaveNewDialog(true)}
                            className="text-xs px-3 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900 h-7 flex items-center gap-1 font-medium"
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
                            disabled={isSavingNew || isUpdatingTemplate || !!existingDuplicateTemplate}
                            onClick={() => setShowSaveNewDialog(true)}
                            className="text-xs px-3 py-0.5 border-gray-300 text-white bg-zinc-800 rounded-xl hover:text-white hover:bg-zinc-900 h-7 flex items-center gap-1 font-medium"
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
                              disabled={isUpdatingTemplate || isSavingNew || !!existingDuplicateTemplate}
                              onClick={handleUpdateSelectedTemplate}
                              className="text-xs px-3 py-0.5 border-gray-300 text-white bg-blue-600 rounded-xl hover:text-white hover:bg-blue-700 animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out fill-mode-both delay-200 h-7 flex items-center gap-1 font-medium"
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

                    {/* Popover Template Dropdown - Meta styled */}
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
                          className={`w-full justify-between ${formFieldChrome} hover:bg-white text-sm px-3 text-zinc-700`}
                          disabled={Object.keys(copyTemplates).length === 0}
                        >
                          <span className="truncate">
                            {Object.keys(copyTemplates).length === 0
                              ? "No templates available for selected advertiser"
                              : selectedTemplate || "Choose a Template"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border border-gray-100 shadow-xl"
                        align="start"
                        side="bottom"
                        avoidCollisions={false}
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
                              {/* Sort Menu */}
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
                                      {[
                                        { value: "default", label: "Recently Made" },
                                        { value: "oldest", label: "Oldest First" },
                                      ].map((option) => (
                                        <button
                                          key={option.value}
                                          type="button"
                                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center justify-between"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSortMode(option.value);
                                            localStorage.setItem("tiktokHomeTemplateSortMode", option.value);
                                            setShowSortMenu(false);
                                          }}
                                        >
                                          <span className="flex items-center gap-1.5">
                                            {option.label}
                                          </span>
                                          {sortMode === option.value && (
                                            <Check className="h-3.5 w-3.5 text-blue-500" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              {/* Bulk Delete Button */}
                              {bulkDeleteMode && selectedForDelete.size > 0 ? (
                                <button
                                  type="button"
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-70 animate-in zoom-in-95 duration-150"
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
                            {sortedFilteredTemplates.map(([name, data]) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  if (bulkDeleteMode) {
                                    toggleDeleteSelection(name);
                                  } else {
                                    setSelectedTemplate(name);
                                    if (data.texts && data.texts.length > 0) {
                                      setAdTexts([data.texts[0] || ""]);
                                    }
                                    setTemplateDropdownOpen(false);
                                    setTemplateSearch("");
                                  }
                                }}
                                className="px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150 hover:bg-gray-100"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  {bulkDeleteMode && (
                                    <Checkbox
                                      checked={selectedForDelete.has(name)}
                                      className="border-gray-300 w-4 h-4 rounded-md pointer-events-none"
                                    />
                                  )}
                                  <span className="text-sm truncate flex-1">{name}</span>
                                  {name === defaultTemplateName && (
                                    <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg shrink-0">
                                      Default
                                    </span>
                                  )}
                                  {!bulkDeleteMode && name === selectedTemplate && (
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
                </div>

                {/* Single Caption Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      {renderDiffMark("adTexts")}
                      <span className="font-semibold text-sm">Text</span>
                      {adType === 'SPARK' && <span className="text-gray-400 font-normal text-xs">(Optional)</span>}
                    </Label>
                    <span className="text-[10px] text-zinc-400 font-medium">{(adTexts[0] || "").length}/100</span>
                  </div>
                  <TextareaAutosize
                    value={adTexts[0] || ""}
                    onChange={(e) => {
                      setAdTexts([e.target.value]);
                    }}
                    placeholder="Write catchy ad text... ✍️"
                    minRows={3}
                    maxRows={8}
                    className={formTextareaChrome}
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
                  />
                  {(adTexts[0] || "").length > 100 && (
                    <p className="text-xs text-red-500 font-medium mt-1">Text cannot exceed 100 characters</p>
                  )}
                </div>
              </div>

              {/* 5. Call to Action & Landing Page URL Stacked */}
              <div className="space-y-6">

                {/* Call to Action Multi Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {renderDiffMark("cta")}
                    <CTAIcon className="w-4 h-4" />
                    Call to Action
                  </Label>
                  <Popover open={openCta} onOpenChange={setOpenCta}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow hover:bg-white px-3 py-6"
                      >
                        <span className="text-sm truncate">
                          {Array.isArray(cta) && cta.length > 0
                            ? cta.map(v => CTA_OPTIONS.find(o => o.value === v)?.label || v).join(", ")
                            : "None selected"}
                        </span>
                        <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 bg-white rounded-2xl shadow-xl border border-gray-100" align="start" side="bottom" avoidCollisions={false} style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandList className="max-h-[220px] overflow-y-auto rounded-2xl custom-scrollbar">
                          <CommandGroup>
                            {CTA_OPTIONS.map((opt) => {
                              const isSelected = Array.isArray(cta) && cta.includes(opt.value);
                              return (
                                <CommandItem
                                  key={opt.value}
                                  value={opt.value}
                                  onSelect={() => {
                                    const prev = Array.isArray(cta) ? cta : [];
                                    const next = prev.includes(opt.value)
                                      ? prev.filter(v => v !== opt.value)
                                      : [...prev, opt.value];
                                    setCta(next);
                                  }}
                                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-black border-black text-white" : "border-gray-200"}`}>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="text-sm font-medium">{opt.label}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {(!cta || cta.length === 0) && (
                    <p className="text-xs text-red-500 font-medium mt-1">Please select at least one Call to Action</p>
                  )}
                </div>

                {/* Landing URL Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      {renderDiffMark("landingUrl")}
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                      Landing Page URL
                    </Label>
                    <p className="text-gray-500 text-[12px] font-regular">
                      Your UTMs will be auto applied from Preferences
                    </p>
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setUrlMode('WEBSITE')}
                        className={cn("px-2 py-1 text-[10px] font-bold rounded-lg transition-all", urlMode === 'WEBSITE' ? "bg-white shadow-sm text-zinc-900" : "text-gray-400")}
                      >
                        Website
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrlMode('INSTANT_PAGE')}
                        className={cn("px-2 py-1 text-[10px] font-bold rounded-lg transition-all", urlMode === 'INSTANT_PAGE' ? "bg-white shadow-sm text-zinc-900" : "text-gray-400")}
                      >
                        Instant Page
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <Input
                      type="text"
                      placeholder={urlMode === 'WEBSITE' ? "https://myshop.com/product" : "Select an Instant Page"}
                      value={landingUrl}
                      onChange={e => setLandingUrl(e.target.value)}
                      className={cn(formInputChrome, "pr-10")}
                    />
                    <Popover open={openUrlPicker} onOpenChange={setOpenUrlPicker}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-300 hover:text-gray-600">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-1 bg-white rounded-2xl shadow-xl border-gray-100" align="end" side="bottom" avoidCollisions={false}>
                        <Command>
                          <CommandInput placeholder="Search links..." className="h-8" />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty>No results found.</CommandEmpty>
                            {urlMode === 'WEBSITE' ? (
                              <CommandGroup heading="Saved Links (Preferences)">
                                {advertiserPrefs?.links?.map(l => (
                                  <CommandItem
                                    key={l.url}
                                    onSelect={() => { setLandingUrl(l.url); setOpenUrlPicker(false); }}
                                    className="p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span className="text-xs truncate">{l.url}</span>
                                      {l.isDefault && <span className="ml-auto text-[8px] font-bold bg-blue-50 text-blue-500 px-1 py-0.5 rounded">Default</span>}
                                    </div>
                                  </CommandItem>
                                ))}
                                {(!advertiserPrefs?.links || advertiserPrefs.links.length === 0) && (
                                  <div className="p-4 text-center">
                                    <p className="text-[10px] text-gray-400 font-medium italic">No saved links in settings</p>
                                  </div>
                                )}
                              </CommandGroup>
                            ) : (
                              <CommandGroup heading="Instant Pages (TikTok)">
                                {loadingPages ? (
                                  <div className="p-4 flex justify-center"><Loader className="w-4 h-4 animate-spin text-gray-300" /></div>
                                ) : instantPages.length > 0 ? (
                                  instantPages.map(p => (
                                    <CommandItem
                                      key={p.page_id}
                                      onSelect={() => { setLandingUrl(p.page_id); setOpenUrlPicker(false); }}
                                      className="p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-xs font-bold truncate">{p.page_name}</span>
                                          <span className="text-[10px] text-gray-400 truncate">{p.page_id}</span>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))
                                ) : (
                                  <div className="p-4 text-center">
                                    <p className="text-[10px] text-gray-400 font-medium italic">No instant pages found</p>
                                  </div>
                                )}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {urlMode === 'WEBSITE' && !landingUrl?.trim() && (
                    <p className="text-xs text-red-500 font-medium mt-1">Landing Page URL is required</p>
                  )}
                  {urlMode === 'WEBSITE' && landingUrl?.trim() && !(() => {
                    try {
                      const urlString = landingUrl.trim();
                      if (/^https?:\/\//i.test(urlString)) {
                        new URL(urlString);
                        return true;
                      }
                    } catch (_) { }
                    return false;
                  })() && (
                      <p className="text-xs text-red-500 font-medium mt-1">Landing Page URL must be a valid URL starting with http:// or https://</p>
                    )}
                </div>
              </div>

              {/* Optional Section: Add Product Information */}
              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div className="flex flex-col gap-1">
                  <Label className="flex items-center gap-2 font-semibold text-sm">
                    {renderDiffMark(["productName", "productImageUrl", "sellingPoints"])}
                    <Info className="w-4 h-4 text-gray-500" />
                    Add product information <span className="text-gray-400 font-normal text-xs">• Optional</span>
                  </Label>
                  <span className="text-xs text-gray-500 leading-relaxed">
                    This information will be used in different ad variations to create personalized ad delivery with the goal of improving ad performance.
                  </span>
                </div>

                {/* Saved Product Picker */}
                {advertiserPrefs?.products?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">Select Saved Product</Label>
                    <Select
                      value={selectedSavedProductId}
                      onValueChange={(value) => {
                        setSelectedSavedProductId(value);
                        if (value === "none") {
                          setProductName("");
                          setProductImageUrl("");
                          setSellingPoints([]);
                          return;
                        }
                        const selectedProduct = advertiserPrefs.products.find(p => String(p.id) === value);
                        if (selectedProduct) {
                          setProductName(selectedProduct.name || "");
                          setProductImageUrl(selectedProduct.image || "");
                          setSellingPoints(selectedProduct.sellingPoints || []);
                        } else {
                          setProductName("");
                          setProductImageUrl("");
                          setSellingPoints([]);
                        }
                      }}
                    >
                      <SelectTrigger className={cn("w-full h-11 py-2 font-medium", formFieldChrome)}>
                        <SelectValue placeholder="Select a saved product to auto-fill..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl gap-4">
                        <SelectItem value="none" className="rounded-xl data-[highlighted]:bg-gray-100 transition-all my-0.5">
                          -- Clear Selection / Custom Product --
                        </SelectItem>
                        {advertiserPrefs.products.map(p => (
                          <SelectItem
                            key={p.id}
                            value={String(p.id)}
                            className="rounded-xl data-[highlighted]:bg-gray-100 transition-all my-0.5 cursor-pointer"
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="product-name" className="text-xs font-semibold text-gray-700">Product name</Label>
                  <Input
                    id="product-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter title"
                    className={formInputChrome}
                  />
                </div>

                {/* Product Image */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700 block">Product image</Label>
                  <div className="flex items-center gap-3">
                    {productImageUrl ? (
                      <div className="relative shrink-0">
                        <img src={productImageUrl} alt="Product" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setProductImageUrl("")}
                          className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 animate-[bounce_1s_infinite]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-gray-100 transition-colors">
                        <Plus className="w-6 h-6 text-gray-400" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("advertiserId", selectedAdvertiser);

                            try {
                              const res = await fetch(`${API_BASE_URL}/api/tiktok/product-image/upload`, {
                                method: "POST",
                                body: formData,
                                credentials: "include",
                                headers: {
                                  'x-tiktok-user-id': localStorage.getItem('tiktok_uid'),
                                  'x-tiktok-token': localStorage.getItem('tiktok_token'),
                                }
                              });
                              const data = await res.json();
                              if (data.success && data.url) {
                                setProductImageUrl(data.url);
                              } else {
                                throw new Error(data.error || "Failed to upload image");
                              }
                            } catch (err) {
                              console.error("Failed to upload image:", err.message);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Selling Points */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700 block">Selling points</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSellingPoint}
                      onChange={(e) => setNewSellingPoint(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!newSellingPoint.trim()) return;
                          if (sellingPoints.includes(newSellingPoint.trim())) return;
                          setSellingPoints([...sellingPoints, newSellingPoint.trim()]);
                          setNewSellingPoint("");
                        }
                      }}
                      placeholder="Press enter to add each entry"
                      className="border border-gray-300 rounded-2xl h-11 px-4 text-sm flex-1 focus:outline-hidden focus:ring-0 focus-visible:outline-hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (!newSellingPoint.trim()) return;
                        if (sellingPoints.includes(newSellingPoint.trim())) return;
                        setSellingPoints([...sellingPoints, newSellingPoint.trim()]);
                        setNewSellingPoint("");
                      }}
                      className="rounded-2xl h-11 px-6 bg-zinc-800 text-white font-semibold hover:bg-black"
                    >
                      Confirm
                    </Button>
                  </div>

                  {/* Suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-gray-500">
                    <span>Suggestions:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!sellingPoints.includes("x% off")) {
                          setSellingPoints([...sellingPoints, "x% off"]);
                        }
                      }}
                      className="text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      + x% off
                    </button>
                    <span>,</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!sellingPoints.includes("Save $x")) {
                          setSellingPoints([...sellingPoints, "Save $x"]);
                        }
                      }}
                      className="text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      + Save $x
                    </button>
                    <span>,</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!sellingPoints.includes("Limited-time offer")) {
                          setSellingPoints([...sellingPoints, "Limited-time offer"]);
                        }
                      }}
                      className="text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      + Limited-time offer
                    </button>
                  </div>

                  {/* Tags display */}
                  {sellingPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {sellingPoints.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-[11px] text-gray-700 px-2.5 py-1 rounded-full font-medium">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setSellingPoints(sellingPoints.filter(t => t !== tag))}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Media Section or Spark Info Card */}
              <div className="border-t border-gray-100 pt-6">
                {adType === 'SPARK' ? (
                  <div className="rounded-3xl border border-blue-100 bg-blue-50/20 p-6 flex flex-col md:flex-row items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
                      <Video className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-gray-900">Organic Video Selected</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        You have selected a <strong>Spark Ad</strong>. The video and caption from the authorized organic TikTok post will be used directly. Local and cloud file uploads are automatically bypassed.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        {renderDiffMark("videoFile")}
                        Video (.mp4, .mov)
                      </Label>
                      <Popover open={uploadSourcesOpen} onOpenChange={handleUploadSourcesOpenChange}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            className={cn(
                              "h-9 px-3 flex items-center gap-1.5 text-black hover:bg-white border !border-gray-200",
                              formFieldChrome
                            )}
                          >
                            <CloudUpload className="h-4 w-4" />
                            Manage Sources
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" side="bottom" avoidCollisions={false} className="bg-white rounded-xl p-2 w-64 border border-gray-200 shadow-lg">
                          <div className="flex flex-col">
                            {UPLOAD_SOURCE_OPTIONS.map((src) => {
                              const checked = uploadSources.includes(src.id)
                              return (
                                <label
                                  key={src.id}
                                  className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-100"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleUploadSource(src.id)}
                                  />
                                  <img
                                    src={src.icon}
                                    alt=""
                                    className={'h-4 w-4 object-contain'}
                                  />
                                  <span className="text-sm text-gray-800">{src.compactLabel}</span>
                                </label>
                              )
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {uploadSources.includes('local') && !driveFiles.length && !dropboxFiles.length && (
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="group cursor-pointer border-2 border-dashed border-gray-300 rounded-3xl p-8 text-center transition-all hover:border-gray-400 hover:bg-gray-50"
                      >
                        <input
                          ref={fileRef}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/gif"
                          multiple
                          className="hidden"
                          onChange={handleVideoSelect}
                        />
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Click to upload video or image</p>
                            <p className="text-xs text-gray-400 mt-1">Recommended ratio: 9:16 for TikTok videos</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cloud Source Buttons */}
                    {(() => {
                      const rowSources = uploadSources.filter((s) => s !== 'local')
                      if (rowSources.length === 0) return null

                      return (
                        <div className={cn("grid gap-2", rowSources.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                          {rowSources.map((id) => {
                            const src = UPLOAD_SOURCE_OPTIONS.find((o) => o.id === id)
                            if (!src) return null

                            let onClick
                            if (id === 'drive') onClick = handleDriveClick
                            else if (id === 'dropbox') onClick = handleDropboxClick

                            return (
                              <Button
                                key={id}
                                type="button"
                                onClick={onClick}
                                className="bg-black hover:bg-zinc-800 text-white rounded-2xl h-[48px] flex items-center justify-center gap-2 px-3 transition-all active:scale-95"
                              >
                                <img
                                  src={typeof src.icon === 'string' ? src.icon : undefined}
                                  alt={src.name}
                                  className="h-4 w-4 object-contain"
                                  style={typeof src.icon !== 'string' ? { display: 'none' } : {}}
                                />
                                {typeof src.icon === 'function' && <src.icon className="h-4 w-4" />}
                                <span className="truncate text-xs font-semibold">{src.fullLabel}</span>
                              </Button>
                            )
                          })}
                        </div>
                      )
                    })()}

                    {/* Progress bar */}
                    {(isUploading || videoUploading) && !isSubmitting && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${videoUploading ? videoUploadProgress : uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-medium text-emerald-600 mt-1">
                          Uploading {videoUploading ? videoUploadProgress : uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className={cn(
                    "w-full h-14 rounded-2xl font-bold text-base transition-all shadow-lg bg-black hover:bg-zinc-800 text-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50",
                    (isSubmitting || !isFormValid) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      {(isUploading || videoUploading) ? 'Uploading Media...' : 'Creating TikTok Ad...'}
                    </div>
                  ) : (
                    'Publish Ads'
                  )}
                </Button>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mt-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-medium inline-flex items-center gap-1">
                        {renderDiffMark("launchPaused")}
                        <span>Ad Status:</span>
                      </Label>

                      <RadioGroup
                        value={launchPaused ? "paused" : "active"}
                        onValueChange={(value) => setLaunchPaused(value === "paused")}
                        disabled={isSubmitting}
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
                  </div>

                  <div className="flex items-center space-x-2 rounded-xl transition-colors duration-150">
                    <Checkbox
                      id="preserveMedia"
                      checked={preserveMedia}
                      onCheckedChange={setPreserveMedia}
                      className="rounded-md focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Label
                      htmlFor="preserveMedia"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Don't clear media after publishing ads
                    </Label>
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <FolderPickerOverlay
          show={showFolderInput}
          linkValue={folderLinkValue}
          setLinkValue={setFolderLinkValue}
          onImport={handleImportFromFolder}
          onCancel={() => setShowFolderInput(false)}
          isImporting={isImportingFolder}
        />

        {/* FLOATING VARIANT PICKER BAR AT BOTTOM */}
        {
          variants.length > 1 && (
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
                      const isActive = variant.id === activeVariantId
                      const assignedCount = countFilesForVariant(variant.id)

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
                      )
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
                        <Trash className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Delete all variants</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          )
        }

      </form >

      {
        showDeleteAllVariantsDialog && (
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
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setShowDeleteAllVariantsDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full rounded-xl"
                  onClick={() => {
                    setShowDeleteAllVariantsDialog(false)
                    handleDeleteAllVariants()
                  }}
                >
                  Delete All Variants
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {
        showSaveNewDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => {
                setShowSaveNewDialog(false);
                setNewTemplateNameInput("");
              }}
            />
            <div
              className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-[400px] p-6 space-y-4"
              style={{ animation: 'templateBtnIn 0.2s ease-out forwards' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Save Ad Text Template</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Give your new copy template a name.
                </p>
                <Input
                  type="text"
                  placeholder="Template name (e.g. Summer Text)..."
                  value={newTemplateNameInput}
                  onChange={(e) => setNewTemplateNameInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-2"
                  autoFocus
                />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setShowSaveNewDialog(false);
                    setNewTemplateNameInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!newTemplateNameInput.trim() || isSavingNew}
                  className="bg-blue-600 text-white rounded-xl hover:bg-blue-700 min-w-[80px]"
                  onClick={handleSaveAsNewTemplate}
                >
                  {isSavingNew ? <Loader className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </>
  )
}

function FolderPickerOverlay({ show, linkValue, setLinkValue, onImport, onCancel, isImporting }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 tracking-tight">Quick Import</h3>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Paste a Google Drive folder or file link to quickly navigate to it or import it.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Paste Google Drive link here"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onImport()}
              className="border-gray-200 rounded-2xl focus:ring-black"
            />
            <Button
              onClick={onImport}
              disabled={!linkValue || isImporting}
              className="bg-black text-white rounded-2xl px-6"
            >
              {isImporting ? <Loader className="w-4 h-4 animate-spin" /> : "Go"}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 text-center font-bold">
            Or browse in the picker window
          </p>
        </div>
      </div>
    </div>
  )
}