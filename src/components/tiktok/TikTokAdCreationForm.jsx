"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TikTokPostSelectorInline from "./TikTokPostSelectorInline"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import { useNavigate } from "react-router-dom"

import { useTikTokVideoUpload } from "@/hooks/useTikTokVideoUpload"
import { readCache, writeCache, clearCache } from "@/lib/dataCache"
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
  Info,
  Search,
  BookOpen,
  Store
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
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
import CogIcon from '@/assets/icons/cog.svg?react'
import ConfigIcon from '@/assets/icons/plus.svg?react'
import CampaignIcon from '@/assets/icons/folder.svg?react'
import AdSetIcon from '@/assets/icons/grid.svg?react'
import TemplateIcon from '@/assets/icons/file.svg?react'
import RocketIcon2 from '@/assets/icons/rocket.svg?react'
import CheckIcon from '@/assets/icons/check.svg?react'
import UploadIcon from '@/assets/icons/upload.svg?react'
import QueueIcon from '@/assets/icons/queue.svg?react'
import PartialSuccess from '@/assets/icons/partialsuccess.svg?react'
import LabelIcon from '@/assets/icons/label.svg?react'
import TikTokIconUrl from '@/assets/icons/tiktok.svg'
import TikTokJobQueue from './TikTokJobQueue'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const TIKTOK_PINK = '#FE2C55'

const VARIANT_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

function VariantDot({ variantId, variants }) {
  const idx = variants.findIndex((v) => v.id === variantId)
  const color = VARIANT_COLORS[Math.max(0, idx) % VARIANT_COLORS.length]
  return <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
}

const CTA_ASSET_MAPPING = {
  LEARN_MORE: {
    asset_content: "Learn more ",
    asset_ids: ["201781", "201535"]
  },
  SHOP_NOW: {
    asset_content: "Shop now",
    asset_ids: ["201885", "201387"]
  },
  SIGN_UP: {
    asset_content: "Sign up",
    asset_ids: ["202162", "201512"]
  },
  DOWNLOAD_NOW: {
    asset_content: "Download",
    asset_ids: ["201902", "201404"]
  },
  CONTACT_US: {
    asset_content: "Contact us",
    asset_ids: ["202006", "201562"]
  },
  ORDER_NOW: {
    asset_content: "Order now",
    asset_ids: ["202046", "201641"]
  },
  BOOK_NOW: {
    asset_content: "Book now",
    asset_ids: ["201751", "201455"]
  },
  PLAY_GAME: {
    asset_content: "Play game",
    asset_ids: ["202005", "201561"]
  },
  APPLY_NOW: {
    asset_content: "Apply now",
    asset_ids: ["201963", "201489"]
  },
  WATCH_NOW: {
    asset_content: "Watch now",
    asset_ids: ["201964", "201490"]
  },
  INSTALL_NOW: {
    asset_content: "Install now",
    asset_ids: ["202114", "201743"]
  },
  GET_QUOTE: {
    asset_content: "Get quote",
    asset_ids: ["202023", "201579"]
  },
  SUBSCRIBE: {
    asset_content: "Subscribe",
    asset_ids: ["201753", "201457"]
  },
  LISTEN_NOW: {
    asset_content: "Listen now",
    asset_ids: ["201995", "201523"]
  },
  VISIT_STORE: {
    asset_content: "Visit store",
    asset_ids: ["201824", "201616"]
  },
  READ_MORE: {
    asset_content: "Read more",
    asset_ids: ["201829", "201621"]
  },
  GET_TICKETS_NOW: {
    asset_content: "Get tickets now",
    asset_ids: ["201913", "201415"]
  },
  GET_SHOWTIMES: {
    asset_content: "Get showtimes",
    asset_ids: ["201953", "201452"]
  },
  EXPERIENCE_NOW: {
    asset_content: "Experience now",
    asset_ids: ["202098", "201693"]
  },
  INTERESTED: {
    asset_content: "Interested",
    asset_ids: ["201867", "201369"]
  },
  VIEW_NOW: {
    asset_content: "View now",
    asset_ids: ["202001", "201529"]
  },
  PREORDER_NOW: {
    asset_content: "Pre-order now",
    asset_ids: ["202013", "201569"]
  },
  TAKE_A_LOOK: {
    asset_content: "Take a look",
    asset_ids: ["201960", "201486"]
  },
  GO_STREAM_IT: {
    asset_content: "Go stream it",
    asset_ids: ["201912", "201414"]
  },
  FOLLOW_US_TO_WATCH: {
    asset_content: "Follow us to watch",
    asset_ids: ["201924", "201426"]
  },
  CLICK_TO_WATCH: {
    asset_content: "Click to watch",
    asset_ids: ["201783", "201537"]
  },
  CLICK_TO_WATCH_NOW: {
    asset_content: "Click to watch now",
    asset_ids: ["201898", "201400"]
  },
  FOLLOW_FOR_MORE: {
    asset_content: "Follow for more",
    asset_ids: ["201789", "201545"]
  },
  FOLLOW_US_NOW: {
    asset_content: "Follow us now",
    asset_ids: ["201826", "201618"]
  },
  STREAM_NOW: {
    asset_content: "Stream now",
    asset_ids: ["202038", "201633"]
  },
  CHECK_IT_OUT: {
    asset_content: "Check it out",
    asset_ids: ["202156", "202150"]
  },
  DONATE_NOW: {
    asset_content: "Donate now",
    asset_ids: ["201865", "201367"]
  },
  COMPARE_NOW: {
    asset_content: "Compare now",
    asset_ids: ["205597", "205596"]
  }
};

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
  { value: 'LISTEN_NOW', label: 'Listen Now' },
  { value: 'VISIT_STORE', label: 'Visit Store' },
  { value: 'READ_MORE', label: 'Read More' },
  { value: 'GET_TICKETS_NOW', label: 'Get Tickets Now' },
  { value: 'GET_SHOWTIMES', label: 'Get Showtimes' },
  { value: 'EXPERIENCE_NOW', label: 'Experience Now' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'VIEW_NOW', label: 'View Now' },
  { value: 'PREORDER_NOW', label: 'Pre-order Now' },
  { value: 'TAKE_A_LOOK', label: 'Take a Look' },
  { value: 'GO_STREAM_IT', label: 'Go Stream It' },
  { value: 'FOLLOW_US_TO_WATCH', label: 'Follow Us to Watch' },
  { value: 'CLICK_TO_WATCH', label: 'Click to Watch' },
  { value: 'CLICK_TO_WATCH_NOW', label: 'Click to Watch Now' },
  { value: 'FOLLOW_FOR_MORE', label: 'Follow for More' },
  { value: 'FOLLOW_US_NOW', label: 'Follow Us Now' },
  { value: 'STREAM_NOW', label: 'Stream Now' },
  { value: 'CHECK_IT_OUT', label: 'Check It Out' },
  { value: 'DONATE_NOW', label: 'Donate Now' },
  { value: 'COMPARE_NOW', label: 'Compare Now' }
];

const UPLOAD_SOURCE_OPTIONS = [
  {
    id: 'local',
    name: 'My Computer',
    icon: DesktopIcon,
    fullLabel: 'Upload from Computer',
    compactLabel: 'Local PC'
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
  sparkAuthCodes, setSparkAuthCodes,
  urlMode, setUrlMode,
  adType, setAdType,
  importedPosts, setImportedPosts,

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
  selectedSavedProductId, setSelectedSavedProductId,
  selectedFiles,
  setSelectedFiles,
  onBeforeMediaClear
}) {
  const navigate = useNavigate()
  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow"
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`
  const formTextareaChrome = "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"

  const addField = (setter, values) => {
    setter([...values, ""]);
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

  const campaignsLoadedForAdvertiserRef = useRef(campaigns.length > 0 ? selectedAdvertiser : null)
  const adGroupsLoadedForSelectionRef = useRef(
    (adGroups.length > 0 && selectedCampaign.length > 0)
      ? `${selectedAdvertiser}:${JSON.stringify([...selectedCampaign].sort())}`
      : ""
  )


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
  const [showCustomLink, setShowCustomLink] = useState(false)
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
  const [sparkSourceTab, setSparkSourceTab] = useState("video_list") // "auth_codes" | "video_list"
  const [isResolvingCodes, setIsResolvingCodes] = useState(false)
  const [resolvedCodes, setResolvedCodes] = useState([])
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

  // Google/Dropbox state variables
  const [googleAuthStatus, setGoogleAuthStatus] = useState({ checking: true, authenticated: false, accessToken: null })
  const [uploadSources, setUploadSources] = useState(['local', 'drive', 'dropbox'])
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

  const [formCatalogId, setFormCatalogId] = useState(null)
  const [formCatalogName, setFormCatalogName] = useState(null)
  const [formProductId, setFormProductId] = useState([])
  const [formProductName, setFormProductName] = useState(null)

  const [formCatalogs, setFormCatalogs] = useState([])
  const [formCatalogProducts, setFormCatalogProducts] = useState([])
  const [loadingFormCatalogs, setLoadingFormCatalogs] = useState(false)
  const [loadingFormProducts, setLoadingFormProducts] = useState(false)
  const [openFormCatalog, setOpenFormCatalog] = useState(false)
  const [openFormProduct, setOpenFormProduct] = useState(false)
  const [formCatalogSearch, setFormCatalogSearch] = useState("")
  const [formProductSearch, setFormProductSearch] = useState("")

  const [formStoreId, setFormStoreId] = useState(null)
  const [formStoreName, setFormStoreName] = useState(null)
  const [formStoreProductId, setFormStoreProductId] = useState([])
  const [formStoreProductName, setFormStoreProductName] = useState(null)
  const [formStoreBcId, setFormStoreBcId] = useState(null)
  const [formStoreCatalogId, setFormStoreCatalogId] = useState(null)

  const [formStores, setFormStores] = useState([])
  const [formStoreProducts, setFormStoreProducts] = useState([])
  const [loadingFormStores, setLoadingFormStores] = useState(false)
  const [loadingFormStoreProducts, setLoadingFormStoreProducts] = useState(false)
  const [openFormStore, setOpenFormStore] = useState(false)
  const [openFormStoreProduct, setOpenFormStoreProduct] = useState(false)
  const [formStoreSearch, setFormStoreSearch] = useState("")
  const [formStoreProductSearch, setFormStoreProductSearch] = useState("")

  const isShoppingAdGroup = useMemo(() => {
    const activeAgId = selectedAdGroup?.[0] || (showDuplicateAdGroupBlock ? duplicateAdGroup : null);
    if (!activeAgId) return false;
    const agObj = adGroups.find(g => g.adgroup_id === activeAgId);
    if (!agObj) return false;
    return !!(
      (agObj.shopping_ads_type && agObj.shopping_ads_type !== 'UNSET') ||
      (agObj.product_source && agObj.product_source !== 'UNSET')
    );
  }, [selectedAdGroup, adGroups, showDuplicateAdGroupBlock, duplicateAdGroup]);

  const areAllSelectedAdGroupsShopping = useMemo(() => {
    const activeAdGroups = showDuplicateAdGroupBlock && duplicateAdGroup
      ? [duplicateAdGroup]
      : (selectedAdGroup || []);

    if (activeAdGroups.length === 0) return false;

    // Only return true (disappear/hide landing URL) if ALL selected ad groups are product_source: "STORE"
    return activeAdGroups.every(agId => {
      const agObj = adGroups.find(g => g.adgroup_id === agId);
      if (!agObj) return false;
      return agObj.product_source && String(agObj.product_source).toUpperCase() === 'STORE';
    });
  }, [selectedAdGroup, adGroups, showDuplicateAdGroupBlock, duplicateAdGroup]);

  const showProductCatalog = useMemo(() => {
    if (selectedCampaign && selectedCampaign.length > 0) {
      const hasSalesCampaign = selectedCampaign.some(campId => {
        const c = campaigns.find(x => x.campaign_id === campId);
        return c && String(c.virtual_objective_type).toUpperCase() === 'SALES';
      });
      if (hasSalesCampaign) return true;
    }

    const activeAgId = selectedAdGroup?.[0] || (showDuplicateAdGroupBlock ? duplicateAdGroup : null);
    if (activeAgId) {
      const agObj = adGroups.find(g => g.adgroup_id === activeAgId);
      if (agObj) {
        const campId = agObj.campaignId || agObj.campaign_id;
        const c = campaigns.find(x => x.campaign_id === campId);
        if (c && String(c.virtual_objective_type).toUpperCase() === 'SALES') {
          return true;
        }
      }
    }

    return false;
  }, [selectedCampaign, campaigns, selectedAdGroup, showDuplicateAdGroupBlock, duplicateAdGroup, adGroups]);

  const isSalesCampaignSelected = useMemo(() => {
    if (selectedCampaign && selectedCampaign.length > 0) {
      const hasSalesCampaign = selectedCampaign.some(campId => {
        const c = campaigns.find(x => x.campaign_id === campId);
        return c && String(c.virtual_objective_type).toUpperCase() === 'SALES';
      });
      if (hasSalesCampaign) return true;
    }

    const activeAgId = selectedAdGroup?.[0] || (showDuplicateAdGroupBlock ? duplicateAdGroup : null);
    if (activeAgId) {
      const agObj = adGroups.find(g => g.adgroup_id === activeAgId);
      if (agObj) {
        const campId = agObj.campaignId || agObj.campaign_id;
        const c = campaigns.find(x => x.campaign_id === campId);
        if (c && String(c.virtual_objective_type).toUpperCase() === 'SALES') {
          return true;
        }
      }
    }

    return false;
  }, [selectedCampaign, campaigns, selectedAdGroup, showDuplicateAdGroupBlock, duplicateAdGroup, adGroups]);

  useEffect(() => {
    const activeAgId = selectedAdGroup?.[0] || (showDuplicateAdGroupBlock ? duplicateAdGroup : null);
    if (!activeAgId) {
      setFormCatalogId(null);
      setFormCatalogName(null);
      return;
    }
    const agObj = adGroups.find(g => g.adgroup_id === activeAgId);
    if (agObj && agObj.catalog_id) {
      setFormCatalogId(agObj.catalog_id);
      const matched = formCatalogs.find(c => c.catalog_id === agObj.catalog_id);
      setFormCatalogName(matched ? matched.catalog_name : `Catalog ${agObj.catalog_id}`);
    } else {
      setFormCatalogId(null);
      setFormCatalogName(null);
    }
  }, [selectedAdGroup, adGroups, showDuplicateAdGroupBlock, duplicateAdGroup, formCatalogs]);

  useEffect(() => {
    if (formCatalogId && formCatalogs.length > 0) {
      const matched = formCatalogs.find(c => c.catalog_id === formCatalogId);
      if (matched) {
        setFormCatalogName(matched.catalog_name);
      }
    }
  }, [formCatalogId, formCatalogs]);

  // Sync default selection from preferences once when loaded
  const activeFormProductImage = useMemo(() => {
    const firstId = Array.isArray(formProductId) ? formProductId[0] : formProductId;
    if (!firstId) return null;
    const matched = formCatalogProducts.find(p => p.product_id === firstId);
    if (matched) return matched.image_url || null;
    if (firstId === advertiserPrefs?.catalogSelection?.product_id) {
      return advertiserPrefs?.catalogSelection?.product_image_url || null;
    }
    return null;
  }, [formCatalogProducts, formProductId, advertiserPrefs]);

  const selectedProductsLabel = useMemo(() => {
    const productIds = Array.isArray(formProductId) ? formProductId : (formProductId ? [formProductId] : []);
    if (productIds.length === 0) return 'Select a Product';
    if (productIds.length === 1) {
      const matched = formCatalogProducts.find(p => p.product_id === productIds[0]);
      if (matched) return matched.product_name;
      const catSel = advertiserPrefs?.catalogSelection;
      if (catSel && catSel.product_id === productIds[0]) {
        return catSel.product_name || productIds[0];
      }
      return productIds[0];
    }
    return `${productIds.length} Products Selected`;
  }, [formProductId, formCatalogProducts, advertiserPrefs]);

  const formCatalogInitRef = useRef({});
  useEffect(() => {
    if (!selectedAdvertiser) return;
    if (formCatalogInitRef.current[selectedAdvertiser]) return;

    if (advertiserPrefs?.catalogSelection) {
      const sel = advertiserPrefs.catalogSelection;
      setFormCatalogId(sel.catalog_id || null);
      setFormCatalogName(sel.catalog_name || null);
      const initialProductIds = Array.isArray(sel.product_id)
        ? sel.product_id
        : sel.product_id ? [sel.product_id] : [];
      setFormProductId(initialProductIds);
      setFormProductName(sel.product_name || null);
      formCatalogInitRef.current[selectedAdvertiser] = true;
    }
  }, [advertiserPrefs, selectedAdvertiser]);

  // Fetch catalogs for creation form dropdown
  useEffect(() => {
    if (!selectedAdvertiser) {
      setFormCatalogs([]);
      return;
    }
    setLoadingFormCatalogs(true);
    const uid = localStorage.getItem('tiktok_uid');
    const token = localStorage.getItem('tiktok_token');
    fetch(`${API_BASE_URL}/api/tiktok/catalog/list?advertiserId=${selectedAdvertiser}`, {
      credentials: 'include',
      headers: {
        ...(uid && { 'x-tiktok-user-id': uid }),
        ...(token && { 'x-tiktok-token': token }),
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormCatalogs(data.catalogs || []);
        }
      })
      .catch(err => console.warn('[CreationForm] Failed to load catalogs:', err.message))
      .finally(() => setLoadingFormCatalogs(false));
  }, [selectedAdvertiser]);

  // Fetch products for selected form catalog
  useEffect(() => {
    if (!selectedAdvertiser || !formCatalogId) {
      setFormCatalogProducts([]);
      return;
    }
    setLoadingFormProducts(true);
    const uid = localStorage.getItem('tiktok_uid');
    const token = localStorage.getItem('tiktok_token');
    fetch(`${API_BASE_URL}/api/tiktok/catalog/products?advertiserId=${selectedAdvertiser}&catalog_id=${formCatalogId}`, {
      credentials: 'include',
      headers: {
        ...(uid && { 'x-tiktok-user-id': uid }),
        ...(token && { 'x-tiktok-token': token }),
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormCatalogProducts(data.products || []);
        }
      })
      .catch(err => console.warn('[CreationForm] Failed to load products:', err.message))
      .finally(() => setLoadingFormProducts(false));
  }, [selectedAdvertiser, formCatalogId]);

  // ── Showcase Store & Store Products computation and fetches ──

  const showStoreProductSelection = useMemo(() => {
    return selectedAdGroup.some(agId => {
      const agObj = adGroups.find(g => g.adgroup_id === agId);
      return agObj && agObj.product_source === 'SHOWCASE';
    });
  }, [selectedAdGroup, adGroups]);

  const activeFormStoreProductImage = useMemo(() => {
    const firstId = Array.isArray(formStoreProductId) ? formStoreProductId[0] : formStoreProductId;
    if (!firstId) return null;
    const matched = formStoreProducts.find(p => p.item_group_id === firstId);
    if (matched) return matched.product_image_url || null;
    if (firstId === advertiserPrefs?.storeSelection?.product_id) {
      return advertiserPrefs?.storeSelection?.product_image_url || null;
    }
    return null;
  }, [formStoreProducts, formStoreProductId, advertiserPrefs]);

  const selectedStoreProductsLabel = useMemo(() => {
    const productIds = Array.isArray(formStoreProductId) ? formStoreProductId : (formStoreProductId ? [formStoreProductId] : []);
    if (productIds.length === 0) return 'Select a Store Product';
    if (productIds.length === 1) {
      const matched = formStoreProducts.find(p => p.item_group_id === productIds[0]);
      if (matched) return matched.title;
      const storeSel = advertiserPrefs?.storeSelection;
      if (storeSel && storeSel.product_id === productIds[0]) {
        return storeSel.product_name || productIds[0];
      }
      return productIds[0];
    }
    return `${productIds.length} Products Selected`;
  }, [formStoreProductId, formStoreProducts, advertiserPrefs]);

  const formStoreInitRef = useRef({});
  useEffect(() => {
    if (!selectedAdvertiser) return;
    if (formStoreInitRef.current[selectedAdvertiser]) return;

    if (advertiserPrefs?.storeSelection) {
      const sel = advertiserPrefs.storeSelection;
      setFormStoreId(sel.store_id || null);
      setFormStoreName(sel.store_name || null);
      const initialProductIds = Array.isArray(sel.product_id)
        ? sel.product_id
        : sel.product_id ? [sel.product_id] : [];
      setFormStoreProductId(initialProductIds);
      setFormStoreProductName(sel.product_name || null);
      setFormStoreBcId(sel.bc_id || null);
      setFormStoreCatalogId(sel.catalog_id || null);
      formStoreInitRef.current[selectedAdvertiser] = true;
    }
  }, [advertiserPrefs, selectedAdvertiser]);

  // Sync selected adgroup's store preferences if they are modified on ad group select
  useEffect(() => {
    const activeAgId = selectedAdGroup?.[0] || (showDuplicateAdGroupBlock ? duplicateAdGroup : null);
    if (!activeAgId) return;
    const agObj = adGroups.find(g => g.adgroup_id === activeAgId);
    if (agObj && agObj.product_source === 'SHOWCASE') {
      // Find matches in formStores if loaded
      const matched = formStores.find(s => s.store_id === agObj.store_id);
      if (matched) {
        setFormStoreId(matched.store_id);
        setFormStoreName(matched.store_name);
        setFormStoreBcId(matched.store_authorized_bc_id || null);
        setFormStoreCatalogId(matched.catalog_id || null);
      }
    }
  }, [selectedAdGroup, adGroups, showDuplicateAdGroupBlock, duplicateAdGroup, formStores]);

  // Fetch stores list
  useEffect(() => {
    if (!selectedAdvertiser) {
      setFormStores([]);
      return;
    }
    setLoadingFormStores(true);
    const uid = localStorage.getItem('tiktok_uid');
    const token = localStorage.getItem('tiktok_token');
    fetch(`${API_BASE_URL}/api/tiktok/store/list?advertiserId=${selectedAdvertiser}`, {
      credentials: 'include',
      headers: {
        ...(uid && { 'x-tiktok-user-id': uid }),
        ...(token && { 'x-tiktok-token': token }),
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormStores(data.stores || []);
        }
      })
      .catch(err => console.warn('[CreationForm] Failed to load stores:', err.message))
      .finally(() => setLoadingFormStores(false));
  }, [selectedAdvertiser]);

  const selectedLocationIds = useMemo(() => {
    const locs = new Set();
    selectedAdGroup.forEach(agId => {
      const agObj = adGroups.find(g => g.adgroup_id === agId);
      if (agObj && Array.isArray(agObj.location_ids)) {
        agObj.location_ids.forEach(loc => locs.add(loc));
      }
    });
    return Array.from(locs);
  }, [selectedAdGroup, adGroups]);

  const selectedIdentityObj = useMemo(() => {
    return identities.find(i => i.identity_id === selectedIdentity) || null;
  }, [identities, selectedIdentity]);

  // Effect 1: Fetch SHOWCASE products (identity-based).
  // Intentionally does NOT depend on formStoreId so that setFormStoreId() called
  // during product selection never re-triggers this fetch.
  useEffect(() => {
    if (!selectedAdvertiser || !showStoreProductSelection) return;
    if (!selectedIdentity) {
      setFormStoreProducts([]);
      return;
    }
    setLoadingFormStoreProducts(true);
    const uid = localStorage.getItem('tiktok_uid');
    const token = localStorage.getItem('tiktok_token');
    const identityObj = identities.find(i => i.identity_id === selectedIdentity);
    const identityType = identityObj?.identity_type || 'BC_AUTH_TT';
    const url = `${API_BASE_URL}/api/tiktok/showcase/products?advertiserId=${selectedAdvertiser}&identityId=${selectedIdentity}&identityType=${identityType}`;

    fetch(url, {
      credentials: 'include',
      headers: {
        ...(uid && { 'x-tiktok-user-id': uid }),
        ...(token && { 'x-tiktok-token': token }),
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const mappedProducts = (data.products || [])
            .filter(p => {
              const status = (p.status || p.product_status || '').toUpperCase();
              // Only show products explicitly marked AVAILABLE, or with no status field
              return !status || status === 'AVAILABLE';
            })
            .map(p => ({
              item_group_id: p.item_group_id || p.product_id || p.id,
              title: p.title || p.product_name || p.name || 'Unnamed Product',
              product_image_url: p.product_image_url || p.image_url || p.logo_url || (p.image_info?.web_uri) || null,
              store_id: p.store_id || null,
              min_price: p.min_price || null,
              currency: p.currency || null
            }));
          setFormStoreProducts(mappedProducts);
        }
      })
      .catch(err => console.warn('[CreationForm] Failed to load showcase products:', err.message))
      .finally(() => setLoadingFormStoreProducts(false));
  }, [selectedAdvertiser, showStoreProductSelection, selectedIdentity, identities]);

  // Effect 2: Fetch regular STORE products (store-based).
  // Only runs when NOT in showcase mode, so identity/showcase changes don't re-trigger this.
  useEffect(() => {
    if (!selectedAdvertiser || showStoreProductSelection) return;
    if (!formStoreId) {
      setFormStoreProducts([]);
      return;
    }
    setLoadingFormStoreProducts(true);
    const uid = localStorage.getItem('tiktok_uid');
    const token = localStorage.getItem('tiktok_token');
    let url = `${API_BASE_URL}/api/tiktok/store/products?advertiserId=${selectedAdvertiser}&store_id=${formStoreId}`;
    if (formStoreBcId) {
      url += `&bc_id=${formStoreBcId}`;
    }
    fetch(url, {
      credentials: 'include',
      headers: {
        ...(uid && { 'x-tiktok-user-id': uid }),
        ...(token && { 'x-tiktok-token': token }),
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const availableProducts = (data.products || [])
            .filter(p => {
              const status = (p.status || p.product_status || '').toUpperCase();
              return !status || status === 'AVAILABLE';
            });
          setFormStoreProducts(availableProducts);
        }
      })
      .catch(err => console.warn('[CreationForm] Failed to load store products:', err.message))
      .finally(() => setLoadingFormStoreProducts(false));
  }, [selectedAdvertiser, showStoreProductSelection, formStoreId, formStoreBcId]);



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

    const filterPosts = (items) => items.filter((post) => {
      const postKey = `post:${post.id}`
      return (postVariantMap[postKey] || 'default') === variantId
    })

    const variantFiles = filterFiles(files || [])
    const variantDriveFiles = filterFiles(driveFiles || []).map(f => ({ ...f, isDrive: true }))
    const variantDropboxFiles = filterFiles(dropboxFiles || []).map(f => ({ ...f, isDropbox: true }))
    const variantLibraryFiles = filterFiles(tiktokLibraryFiles || [])
    const variantImportedPosts = filterPosts(importedPosts || [])

    const formData = {
      adName: variantState.adName || adName || '',
      adTexts: variantState.adTexts || (variantState.adText ? [variantState.adText] : null) || adTexts || [''],
      cta: variantState.cta || cta || ['SHOP_NOW'],
      landingUrl: variantState.landingUrl || landingUrl || '',
      sparkAuthCodes: variantState.sparkAuthCodes || sparkAuthCodes || [''],
      urlMode: variantState.urlMode || urlMode || 'WEBSITE',
      adType: variantState.adType || adType || 'NORMAL',

      files: [...variantFiles],
      driveFiles: [...variantDriveFiles],
      dropboxFiles: [...variantDropboxFiles],
      tiktokLibraryFiles: [...variantLibraryFiles],
      importedPosts: [...variantImportedPosts],

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
      fileCount = formData.importedPosts.length
    }

    const activeAdGroups = formData.selectedAdGroup || []
    const adGroupDisplayName = (showDuplicateAdGroupBlock && duplicateAdGroup)
      ? (newAdGroupName || 'New Ad Group')
      : activeAdGroups.length === 1
        ? (adGroups.find(ag => ag.adgroup_id === activeAdGroups[0])?.adgroup_name || 'selected ad group')
        : `${activeAdGroups.length} ad groups`

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      variantId,
      variantName: variants.find(v => v.id === variantId)?.name || 'Default',
      adCount: fileCount * (formData.selectedAdGroup?.length || 1),
      adGroupDisplayName,
      formData,
    }
  }, [
    variants, adName, adTexts, cta, landingUrl, sparkAuthCodes, urlMode, adType,
    files, driveFiles, dropboxFiles, tiktokLibraryFiles, importedPosts, selectedAdvertiser,
    selectedCampaign, selectedAdGroup, showDuplicateAdGroupBlock, duplicateAdGroup,
    newAdGroupName, selectedIdentity, fileVariantMap, postVariantMap, launchPaused,
    productName, productImageUrl, sellingPoints, adGroups
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
    setSparkAuthCodes(d.sparkAuthCodes || [''])
    setUrlMode(d.urlMode || 'WEBSITE')
    setAdType(d.adType || 'NORMAL')

    setFiles(d.files || [])
    setDriveFiles(d.driveFiles || [])
    setDropboxFiles(d.dropboxFiles || [])
    if (setSparkAuthCodes) setSparkAuthCodes(d.sparkAuthCodes || [''])

    setSelectedAdvertiser(d.selectedAdvertiser || '')
    setSelectedCampaign(d.selectedCampaign || [])
    setSelectedAdGroup(d.selectedAdGroup || [])

    setVariants([{ id: 'default', name: 'Default', snapshot: null }])
    setActiveVariantId('default')
    setFileVariantMap({})
    setGroupVariantMap({})
    setPostVariantMap({})
  }, [
    setAdName, setAdTexts, setCta, setLandingUrl, setSparkAuthCodes, setUrlMode,
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
      sparkAuthCodes,
      urlMode,
      adType,
      files,
      driveFiles,
      dropboxFiles,
      tiktokLibraryFiles,
      importedPosts,
      selectedAdvertiser,
      selectedCampaign,
      selectedAdGroup,
      isDuplicatingAdGroupMode,
      duplicateAdGroup,
      newAdGroupName,
      selectedIdentity,
      launchPaused,
    } = jobToProcess.formData

    setProgress(0)
    setProgressMessage('Starting TikTok ad creation...')

    const itemsToUpload = []
    if (adType === 'SPARK') {
      (importedPosts || []).forEach(post => {
        itemsToUpload.push({
          type: 'spark',
          file: {
            name: post.ad_name || 'Spark Ad',
            id: post.id,
            authCode: post.auth_code,
            identityId: post.identity_id,
            identityType: post.identity_type,
            identityAuthorizedBcId: post.identity_authorized_bc_id || ""
          }
        })
      })
    } else {
      (files || []).forEach(f => itemsToUpload.push({ type: 'local', file: f }));
      (driveFiles || []).forEach(f => itemsToUpload.push({ type: 'drive', file: f }));
      (dropboxFiles || []).forEach(f => itemsToUpload.push({ type: 'dropbox', file: f }));
      (tiktokLibraryFiles || []).forEach(f => itemsToUpload.push({ type: 'library', file: f }));
    }

    let totalCount = itemsToUpload.length * (isDuplicatingAdGroupMode ? 1 : selectedAdGroup.length)

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
      const uploadedItems = []
      const uploadErrors = []

      // Stage 1: Upload media files
      for (let i = 0; i < itemsToUpload.length; i++) {
        if (signal.aborted) throw new DOMException('Job cancelled.', 'AbortError')
        const item = itemsToUpload[i]
        let videoId = null
        let currentS3Url = null

        const progressBase = Math.round((i / itemsToUpload.length) * 40) // Spend up to 40% on uploading
        updateProgress(progressBase, `Uploading media ${i + 1}/${itemsToUpload.length}: ${item.file.name}...`)

        try {
          if (adType === 'SPARK') {
            videoId = item.file.id
          } else if (item.type === 'local') {
            const uploadResult = await uploadVideoToTikTok(item.file, signal)
            if (!uploadResult?.videoId) {
              throw new Error(`Video upload failed for "${item.file.name}"`)
            }
            videoId = uploadResult.videoId
            currentS3Url = uploadResult.s3Url || null
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

            updateProgress(progressBase + 5, `Downloading "${item.file.name}" from ${sourceName}...`)
            const uploadRes = await tiktokFetch(uploadUrl, { method: 'POST', body: formData, signal })
            const uploadData = await uploadRes.json()
            if (!uploadRes.ok || !uploadData.success || !uploadData.videoId) {
              throw new Error(uploadData.error || `Upload failed for "${item.file.name}"`)
            }
            videoId = uploadData.videoId
            currentS3Url = uploadData.s3Url || null
          } else if (item.type === 'library') {
            videoId = item.file.videoId
          }

          uploadedItems.push({
            item,
            videoId,
            s3Url: currentS3Url
          })
        } catch (err) {
          if (err.name === 'AbortError' || signal.aborted) {
            throw err
          }
          console.error(`Upload failed for ${item.file.name}:`, err)
          const errDetail = err.message || 'Upload failed'
          const failedAdCount = isDuplicatingAdGroupMode ? 1 : selectedAdGroup.length

          uploadErrors.push({ error: errDetail, fileName: item.file.name })
          setLiveProgress(prev => ({
            ...prev,
            completed: prev.completed + failedAdCount,
            failed: prev.failed + failedAdCount,
            errors: [...prev.errors, { error: errDetail, fileName: item.file.name }]
          }))
        }
      }

      // Stage 2: Compilation & bulk ad group submission
      updateProgress(40, 'Compiling ad groups payload...')

      const selectedIdentityObj = identities.find(i => i.identity_id === selectedIdentity)
      const isCustomized = !selectedIdentity || selectedIdentity === 'CUSTOMIZED_USER'
      const finalUrl = urlMode === 'WEBSITE'
        ? applyUtmsToUrl(landingUrl, advertiserPrefs?.defaultUTMs || [])
        : landingUrl

      let adGroupIdsToSubmit = [...selectedAdGroup]

      if (isDuplicatingAdGroupMode && uploadedItems.length > 0) {
        updateProgress(42, 'Duplicating ad group on-the-fly...')
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

      const adGroupsMap = {}

      for (let idx = 0; idx < uploadedItems.length; idx++) {
        const { item, videoId, s3Url } = uploadedItems[idx]

        const currentIdentityId = adType === 'SPARK' ? item.file.identityId : (isCustomized ? undefined : selectedIdentity)
        const currentIdentityType = adType === 'SPARK' ? item.file.identityType : (isCustomized ? 'CUSTOMIZED_USER' : (selectedIdentityObj?.identity_type || 'TT_USER'))
        const currentIdentityAuthorizedBcId = adType === 'SPARK' ? item.file.identityAuthorizedBcId : (isCustomized ? undefined : (selectedIdentityObj?.identity_authorized_bc_id || ''))

        const finalAdName = computeAdNameFromFormula(
          item.file,
          idx,
          landingUrl,
          adNameFormulaV2,
          adType
        )

        for (const adgroupId of adGroupIdsToSubmit) {
          const adGroupObj = adGroups.find(ag => ag.adgroup_id === adgroupId)
          const shoppingAdsType = adGroupObj?.shopping_ads_type || null
          const productSource = adGroupObj?.product_source || null
          const isShoppingAg = !!(
            (shoppingAdsType && shoppingAdsType !== 'UNSET') ||
            (productSource && productSource !== 'UNSET')
          )

          const campaignObj = campaigns.find(c => c.campaign_id === adGroupObj?.campaignId || c.campaign_id === selectedCampaign[0])
          const showProductCatalogForAdGroup = campaignObj && String(campaignObj.virtual_objective_type).toUpperCase() === 'SALES'

          let catalogIdToUse = null
          let skuIdToUse = null
          let itemGroupIdToUse = null

          if (isShoppingAg) {
            if (productSource === 'SHOWCASE') {
              catalogIdToUse = formStoreCatalogId || adGroupObj?.catalog_id || null
              const productIds = Array.isArray(formStoreProductId) ? formStoreProductId : (formStoreProductId ? [formStoreProductId] : [])
              if (productIds.length > 0) {
                skuIdToUse = productIds.join(',')
              }
            } else if (showProductCatalogForAdGroup && formCatalogId) {
              catalogIdToUse = formCatalogId
              const productIds = Array.isArray(formProductId) ? formProductId : (formProductId ? [formProductId] : [])
              const skuIds = []
              const itemGroupIds = []

              productIds.forEach(id => {
                const matchedProd = formCatalogProducts.find(p => p.product_id === id)
                if (matchedProd) {
                  if (matchedProd.item_group_id) {
                    itemGroupIds.push(matchedProd.item_group_id)
                  }
                  const resolvedSku = matchedProd.sku_id || matchedProd.product_id
                  if (resolvedSku) {
                    skuIds.push(resolvedSku)
                  }
                } else {
                  const catSel = advertiserPrefs?.catalogSelection
                  if (catSel && catSel.product_id === id) {
                    if (catSel.item_group_id) {
                      itemGroupIds.push(catSel.item_group_id)
                    }
                    const resolvedSku = catSel.sku_id || catSel.product_id
                    if (resolvedSku) {
                      skuIds.push(resolvedSku)
                    }
                  } else {
                    skuIds.push(id)
                  }
                }
              })

              if (skuIds.length > 0) {
                skuIdToUse = skuIds.join(',')
              }
              if (itemGroupIds.length > 0) {
                itemGroupIdToUse = itemGroupIds.join(',')
              }
            } else {
              if (adGroupObj?.catalog_id) {
                catalogIdToUse = adGroupObj.catalog_id
              }
              if (adGroupObj?.sku_ids) {
                if (Array.isArray(adGroupObj.sku_ids) && adGroupObj.sku_ids.length > 0) {
                  skuIdToUse = adGroupObj.sku_ids[0]
                } else if (typeof adGroupObj.sku_ids === 'string' && adGroupObj.sku_ids.trim() !== '') {
                  skuIdToUse = adGroupObj.sku_ids
                }
              }
              if (adGroupObj?.item_group_ids) {
                if (Array.isArray(adGroupObj.item_group_ids) && adGroupObj.item_group_ids.length > 0) {
                  itemGroupIdToUse = adGroupObj.item_group_ids[0]
                } else if (typeof adGroupObj.item_group_ids === 'string' && adGroupObj.item_group_ids.trim() !== '') {
                  itemGroupIdToUse = adGroupObj.item_group_ids
                }
              }
            }
          }

          const isSalesCampaign = !!(
            (campaignObj && String(campaignObj.virtual_objective_type).toUpperCase() === 'SALES') ||
            isShoppingAg
          )
          let creativeCTAs = Array.isArray(cta) ? cta : [cta]
          if (isSalesCampaign && creativeCTAs.length > 0) {
            creativeCTAs = [creativeCTAs[0]]
          }
          const activeCaptions = (adTexts || []).filter(t => t.trim() !== '')
          let finalCaptions = activeCaptions.length > 0 ? [activeCaptions[0]] : ['']

          const creatives = []
          const useMultipleTextsNative = false;

          if (useMultipleTextsNative) {
            const singleCta = creativeCTAs[0] || 'SHOP_NOW';
            const creative = {
              video_id: videoId,
              ad_texts: finalCaptions,
              call_to_action: singleCta,
              ad_name: finalAdName,
              identity_type: currentIdentityType,
              landing_page_type: urlMode === 'WEBSITE' ? 'EXTERNAL_WEBSITE' : 'INSTANT_PAGE',
              operation_status: launchPaused ? 'DISABLE' : 'ENABLE',
              ...(urlMode === 'WEBSITE'
                ? { landing_page_url: finalUrl }
                : { page_id: landingUrl }
              ),
              ...(adType === 'SPARK' ? {
                is_spark_ad: true,
                spark_ad_auth_code: item.file.authCode,
                tiktok_item_id: videoId,
                adType: 'SPARK'
              } : {}),
              ...(shoppingAdsType ? { shopping_ads_type: shoppingAdsType } : {}),
              ...(productSource ? { product_source: productSource } : {})
            }
            if (currentIdentityId) creative.identity_id = currentIdentityId
            if (currentIdentityAuthorizedBcId) creative.identity_authorized_bc_id = currentIdentityAuthorizedBcId

            if (isShoppingAg) {
              if (catalogIdToUse) creative.catalog_id = catalogIdToUse;
              if (skuIdToUse) creative.sku_id = skuIdToUse;
              if (itemGroupIdToUse) creative.item_group_id = itemGroupIdToUse;
              if (productSource === 'SHOWCASE') {
                creative.store_id = formStoreId || adGroupObj?.store_id || null;
              }
            }

            creatives.push(creative)
          } else {
            for (const singleCaption of finalCaptions) {
              if (creativeCTAs.length > 1) {
                let creativeAdName = finalAdName
                if (finalCaptions.length > 1) {
                  const cleanCap = singleCaption.trim().substring(0, 15)
                  creativeAdName = `${finalAdName} - ${cleanCap ? `"${cleanCap}"` : `Text ${finalCaptions.indexOf(singleCaption) + 1}`}`
                }

                const creative = {
                  video_id: videoId,
                  ad_text: singleCaption,
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
                    spark_ad_auth_code: item.file.authCode,
                    tiktok_item_id: videoId,
                    adType: 'SPARK'
                  } : {}),
                  ...(shoppingAdsType ? { shopping_ads_type: shoppingAdsType } : {}),
                  ...(productSource ? { product_source: productSource } : {})
                }
                if (currentIdentityId) creative.identity_id = currentIdentityId
                if (currentIdentityAuthorizedBcId) creative.identity_authorized_bc_id = currentIdentityAuthorizedBcId

                if (isShoppingAg) {
                  if (catalogIdToUse) creative.catalog_id = catalogIdToUse;
                  if (skuIdToUse) creative.sku_id = skuIdToUse;
                  if (itemGroupIdToUse) creative.item_group_id = itemGroupIdToUse;
                  if (productSource === 'SHOWCASE') {
                    creative.store_id = formStoreId || adGroupObj?.store_id || null;
                  }
                }

                creatives.push(creative)
              } else {
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
                      spark_ad_auth_code: item.file.authCode,
                      tiktok_item_id: videoId,
                      adType: 'SPARK'
                    } : {}),
                    ...(shoppingAdsType ? { shopping_ads_type: shoppingAdsType } : {}),
                    ...(productSource ? { product_source: productSource } : {})
                  }
                  if (currentIdentityId) creative.identity_id = currentIdentityId
                  if (currentIdentityAuthorizedBcId) creative.identity_authorized_bc_id = currentIdentityAuthorizedBcId

                  if (isShoppingAg) {
                    if (catalogIdToUse) creative.catalog_id = catalogIdToUse;
                    if (skuIdToUse) creative.sku_id = skuIdToUse;
                    if (itemGroupIdToUse) creative.item_group_id = itemGroupIdToUse;
                    if (productSource === 'SHOWCASE') {
                      creative.store_id = formStoreId || adGroupObj?.store_id || null;
                    }
                  }

                  creatives.push(creative)
                }
              }
            }
          }

          if (!adGroupsMap[adgroupId]) {
            const adGroupObj = adGroups.find(ag => ag.adgroup_id === adgroupId)
            adGroupsMap[adgroupId] = {
              adgroupId: adgroupId,
              adName: finalAdName,
              adType: adType,
              s3Url: s3Url,
              ad_count: adGroupObj?.ad_count !== undefined ? adGroupObj.ad_count : 0,
              creatives: []
            }
          }
          adGroupsMap[adgroupId].creatives.push(...creatives)
        }
      }

      const adGroupsPayload = Object.values(adGroupsMap)

      if (adGroupsPayload.length === 0) {
        throw new Error('All video uploads failed. Cannot create TikTok ads.')
      }

      updateProgress(45, 'Creating tiktok ads')

      const campaignObj = campaigns.find(c => c.campaign_id === selectedCampaign[0])

      const createPayload = {
        advertiserId: selectedAdvertiser,
        jobId: jobToProcess.id,
        campaignAutomationType: campaignObj?.campaign_automation_type || null,
        cta: Array.isArray(cta) ? cta : [cta],
        initialFailureCount: uploadErrors.length * (isDuplicatingAdGroupMode ? 1 : selectedAdGroup.length),
        initialErrorMessages: uploadErrors.map(e => ({ error: e.error, fileName: e.fileName })),
        adGroups: adGroupsPayload,
        s3Urls: uploadedItems.map(item => item.s3Url).filter(Boolean)
      }

      const createRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/create-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
        signal
      })
      const createData = await createRes.json()
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Batch ad creation failed')
      }

      if (setAdGroups) {
        setAdGroups(prevAdGroups => {
          return prevAdGroups.map(ag => {
            const adGroupPay = adGroupsPayload.find(pay => pay.adgroupId === ag.adgroup_id)
            if (adGroupPay) {
              return {
                ...ag,
                ad_count: (ag.ad_count || 0) + adGroupPay.creatives.length
              }
            }
            return ag;
          })
        })
      }

    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) {
        setStatus('cancelled')
        updateProgress(100, 'Job cancelled.')

        await fetch(`${API_BASE_URL}/auth/cancel-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: jobToProcess.id })
        }).catch(() => { })
      } else {
        setStatus('error')
        updateProgress(100, `Job Failed: ${err.message}`)

        await fetch(`${API_BASE_URL}/auth/complete-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: jobToProcess.id,
            message: `Job Failed: ${err.message}`,
            status: 'error',
            successCount: 0,
            failureCount: totalCount,
            totalCount,
            errorMessages: [{ error: err.message }]
          })
        }).catch(() => { })
      }
    } finally {
      setCurrentAbortController(null)
      currentJobIdRef.current = null
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
        selectedAdvertiser: jobToProcess.formData?.selectedAdvertiser || "",
        selectedAdGroup: jobToProcess.formData?.selectedAdGroup || [],
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

  // Sync SSE progress to local progress state
  useEffect(() => {
    if (currentJob && trackedStatus !== 'idle') {
      setProgress(trackedProgress)
      setProgressMessage(trackedMessage)
    }
  }, [trackedProgress, trackedMessage, currentJob, trackedStatus])

  // Listen to final status updates from SSE to complete the job and advance the queue
  useEffect(() => {
    if (!isProcessingQueue || !currentJob) {
      return
    }

    if (trackedStatus === 'idle') {
      return
    }

    if (
      trackedStatus === 'complete' ||
      trackedStatus === 'partial-success' ||
      trackedStatus === 'error' ||
      trackedStatus === 'job-not-found' ||
      trackedStatus === 'cancelled'
    ) {
      const successCount = trackedMetaData?.successCount || 0
      const failureCount = trackedMetaData?.failureCount || 0
      const totalCount = trackedMetaData?.totalCount || currentJob.adCount || 1
      const errorMessages = trackedMetaData?.errorMessages || []

      let completedJob = {
        id: currentJob.id,
        completedAt: Date.now(),
        formData: currentJob.formData,
        selectedAdvertiser: currentJob.formData.selectedAdvertiser,
        selectedAdGroup: currentJob.formData.selectedAdGroup,
        successCount,
        failureCount,
        totalCount,
        errorMessages: errorMessages.map(msg => typeof msg === 'string' ? { error: msg } : msg)
      }

      if (trackedStatus === 'complete') {
        completedJob.status = 'success'
        completedJob.message = `${currentJob.adCount || 1} Ad${currentJob.adCount !== 1 ? 's' : ''} successfully posted to ${currentJob.adGroupDisplayName}`
        toast.success(completedJob.message)
      } else if (trackedStatus === 'partial-success') {
        completedJob.status = 'partial-success'
        completedJob.message = `${successCount} Ad${successCount !== 1 ? 's' : ''} successfully posted to ${currentJob.adGroupDisplayName} (with ${failureCount} failure${failureCount !== 1 ? 's' : ''})`
        toast.warning(completedJob.message)
      } else if (trackedStatus === 'cancelled') {
        completedJob.status = 'cancelled'
        completedJob.message = trackedMessage || 'Job cancelled.'
        toast.info('Job cancelled.')
      } else if (trackedStatus === 'job-not-found') {
        completedJob.status = 'retry'
        completedJob.message = 'Job timed out. Refresh page to try again.'
      } else {
        completedJob.status = 'error'
        completedJob.message = `Job Failed: ${trackedMessage || 'An unknown error occurred.'}`
        toast.error(completedJob.message)
      }

      addCompletedJob(completedJob)

      // Clear cache and refresh ad groups to get the new ad counts from TikTok
      if (Array.isArray(selectedCampaign)) {
        selectedCampaign.forEach(campId => {
          clearCache(`tiktok_adgroups_${campId}`);
        });
      }
      try {
        forceRefreshAdGroups(null, false);
      } catch (refreshErr) {
        console.warn('[TikTokAdCreationForm] Failed to refresh ad groups on job completion:', refreshErr);
      }

      // Advance queue
      setJobQueue(prev => prev.slice(1))
      setCurrentJob(null)
      setIsProcessingQueue(false)
      setIsCancelling(false)
    }
  }, [trackedStatus, trackedMessage, trackedMetaData, isProcessingQueue, currentJob, addCompletedJob])

  // Sync SSE metadata updates to liveProgress
  useEffect(() => {
    if (currentJob && trackedMetaData && (trackedMetaData.successCount !== undefined || trackedMetaData.failureCount !== undefined)) {
      setLiveProgress(prev => ({
        ...prev,
        succeeded: trackedMetaData.successCount || 0,
        failed: trackedMetaData.failureCount || 0,
        completed: (trackedMetaData.successCount || 0) + (trackedMetaData.failureCount || 0),
        errors: (trackedMetaData.errorMessages || []).map(err => typeof err === 'string' ? { error: err } : err)
      }))
    }
  }, [trackedMetaData, currentJob])

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

  // Fetch Campaigns on Advertiser change
  useEffect(() => {
    if (!selectedAdvertiser) {
      campaignsLoadedForAdvertiserRef.current = null
      setCampaigns([])
      setSelectedCampaign([])
      return
    }

    if (campaignsLoadedForAdvertiserRef.current === selectedAdvertiser) {
      return
    }

    const cacheKey = `tiktok_campaigns_${selectedAdvertiser}`
    const cached = readCache(cacheKey)
    if (cached) {
      setCampaigns(cached)
      campaignsLoadedForAdvertiserRef.current = selectedAdvertiser
    } else {
      setLoadingCampaigns(true)
      const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
      tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`)
        .then(r => r.json())
        .then(d => {
          const list = d.campaigns || []
          setCampaigns(list)
          writeCache(cacheKey, list)
          campaignsLoadedForAdvertiserRef.current = selectedAdvertiser
        })
        .catch(() => toast.error('Failed to load campaigns'))
        .finally(() => setLoadingCampaigns(false))
    }
  }, [selectedAdvertiser, setCampaigns, setSelectedCampaign, tiktokFetch])

  // Fetch Identities on Advertiser change
  useEffect(() => {
    if (!selectedAdvertiser) {
      setIdentities([])
      return
    }

    fetchTikTokIdentities(selectedAdvertiser).then(list => {
      setIdentities((list || []).filter(i => i.identity_type === 'BC_AUTH_TT'))
    })
  }, [selectedAdvertiser, setIdentities, fetchTikTokIdentities])

  // Automatically sync identities from context cache when selectedAdvertiser or context value changes
  useEffect(() => {
    if (selectedAdvertiser && tiktokIdentities[selectedAdvertiser]) {
      setIdentities(tiktokIdentities[selectedAdvertiser].filter(i => i.identity_type === 'BC_AUTH_TT'));
    }
  }, [selectedAdvertiser, tiktokIdentities, setIdentities]);

  // Automatically update selectedIdentity when adType or identities list changes
  useEffect(() => {
    if (identities.length > 0) {
      const best = identities.find(i => i.identity_type === 'BC_AUTH_TT') ||
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
      adGroupsLoadedForSelectionRef.current = ""
      setAdGroups([])
      setSelectedAdGroup([])
      return
    }

    const selectionKey = `${selectedAdvertiser}:${JSON.stringify([...selectedCampaign].sort())}`
    if (adGroupsLoadedForSelectionRef.current === selectionKey) {
      return
    }

    // Synchronously set the ref to prevent re-entrant loops triggered by subsequent setAdGroups/setLoadingAdGroups re-renders
    adGroupsLoadedForSelectionRef.current = selectionKey

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
          return prevSelected.filter(id => unique.some(g => g.adgroup_id === id))
        })
      })
      .catch(() => {
        if (!active) return
        // Reset ref so that if fetching failed, a retry is possible
        adGroupsLoadedForSelectionRef.current = ""
        toast.error('Failed to load ad groups')
      })
      .finally(() => {
        if (active) setLoadingAdGroups(false)
      })

    return () => {
      active = false
    }
  }, [selectedCampaign, selectedAdvertiser, campaigns, tiktokFetch, setAdGroups, setSelectedAdGroup])

  // Fetch Instant Pages when advertiser changes or urlMode switches to INSTANT_PAGE
  useEffect(() => {
    if (!selectedAdvertiser) return
    setLoadingPages(true)
    tiktokFetch(`${API_BASE_URL}/api/tiktok/instant-pages?advertiserId=${selectedAdvertiser}`)
      .then(r => r.json())
      .then(d => setInstantPages(d.pages || []))
      .catch(() => { })
      .finally(() => setLoadingPages(false))
  }, [selectedAdvertiser, tiktokFetch])

  // Sync advertiser preferences for Ad Name Formula — only update when the formula actually changes
  useEffect(() => {
    if (advertiserPrefs) {
      const incoming = advertiserPrefs.adNameFormulaV2 || { rawInput: "" };
      setAdNameFormulaV2(prev => {
        const prevStr = JSON.stringify(prev);
        const nextStr = JSON.stringify(incoming);
        return prevStr === nextStr ? prev : incoming;
      });
    }
  }, [advertiserPrefs]);

  // Sync showCustomLink depending on selected landingUrl
  useEffect(() => {
    if (urlMode === 'WEBSITE') {
      const availableLinks = advertiserPrefs?.links || [];
      if (availableLinks.length === 0) {
        setShowCustomLink(true);
      } else {
        if (!landingUrl) {
          setShowCustomLink(false);
        } else {
          const exists = availableLinks.some(l => l.url === landingUrl);
          setShowCustomLink(!exists);
        }
      }
    } else {
      setShowCustomLink(false);
    }
  }, [landingUrl, advertiserPrefs?.links, urlMode]);

  // Sync copy templates — use defaultTemplateName if set, otherwise fall back to first template
  useEffect(() => {
    if (advertiserPrefs?.defaultTemplateName) {
      setSelectedTemplate(advertiserPrefs.defaultTemplateName);
    } else if (advertiserPrefs?.copyTemplates) {
      const firstKey = Object.keys(advertiserPrefs.copyTemplates)[0];
      setSelectedTemplate(firstKey || "");
    } else {
      setSelectedTemplate("");
    }
  }, [selectedAdvertiser, advertiserPrefs]);

  const copyTemplates = advertiserPrefs?.copyTemplates || {};
  const defaultTemplateName = advertiserPrefs?.defaultTemplateName || "";

  const hasAnyContent = adTexts.some(t => t.trim() !== "");

  const hasUnsavedTemplateChangesRaw = useMemo(() => {
    if (!selectedTemplate || !copyTemplates[selectedTemplate]) return false;
    const tpl = copyTemplates[selectedTemplate];
    const currentText = adTexts.map(t => t.trim()).filter(Boolean)[0] || "";
    const originalText = tpl.text || (tpl.texts && tpl.texts[0]) || "";
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
    const currentText = adTexts.map(t => t.trim()).filter(Boolean)[0] || "";
    if (!currentText) return null;
    for (const [name, tpl] of Object.entries(copyTemplates)) {
      if (name === selectedTemplate) continue;
      const originalText = tpl.text || (tpl.texts && tpl.texts[0]) || "";
      if (currentText.trim() === originalText.trim()) {
        return name;
      }
    }
    return null;
  }, [adTexts, copyTemplates, selectedTemplate]);

  const handleSaveAsNewTemplate = async () => {
    const name = newTemplateNameInput.trim();
    if (!name) return;
    if (copyTemplates && copyTemplates[name]) {
      toast.error("Template name already exists");
      return;
    }
    setIsSavingNew(true);
    try {
      const templateData = {
        name,
        text: adTexts.map(t => t.trim()).filter(Boolean)[0] || "",
      };
      const updated = { ...(copyTemplates || {}) };
      updated[name] = templateData;

      const nextSettings = { copyTemplates: updated };
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
        text: adTexts.map(t => t.trim()).filter(Boolean)[0] || "",
      };
      const updated = { ...(copyTemplates || {}) };
      updated[selectedTemplate] = templateData;

      const nextSettings = { copyTemplates: updated };
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
        // Prune any selectedCampaign IDs that no longer exist in the fresh list
        setSelectedCampaign(prev => prev.filter(id => list.some(c => c.campaign_id === id)))
        writeCache(`tiktok_campaigns_${selectedAdvertiser}`, list)
        toast.success('Campaigns refreshed!')
      })
      .catch(() => toast.error('Failed to refresh campaigns'))
      .finally(() => setLoadingCampaigns(false))
  }

  const forceRefreshAdGroups = (e, showToast = true) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
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
        if (showToast) {
          toast.success('Ad Groups refreshed!')
        }
      })
      .catch(() => {
        if (showToast) {
          toast.error('Failed to refresh ad groups')
        }
      })
      .finally(() => setLoadingAdGroups(false))
  }

  const forceRefreshIdentities = (e) => {
    e.stopPropagation()
    if (!selectedAdvertiser || loadingIdentities) return
    fetchTikTokIdentities(selectedAdvertiser, true)
      .then(list => {
        const filtered = (list || []).filter(i => i.identity_type === 'BC_AUTH_TT')
        setIdentities(filtered)
        if (filtered.length > 0) {
          setSelectedIdentity(filtered[0].identity_id)
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
    if (campaign.adgroup_count >= 20) {
      return toast.error(`Cannot duplicate this campaign. It has ${campaign.adgroup_count} ad groups, which reaches or exceeds the limit of 20.`)
    }
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

    selectedFiles.forEach((file) => {
      if (file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name)) {
        const url = URL.createObjectURL(file);
        const tempVideo = document.createElement("video");
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
          const width = tempVideo.videoWidth;
          const height = tempVideo.videoHeight;
          const ratio = width / height;
          const targetRatio = 9 / 16;
          const diff = Math.abs(ratio - targetRatio);
          if (diff > 0.05) {
            toast.warning(`"${file.name}" has an aspect ratio of ${width}x${height} (${ratio.toFixed(2)}). TikTok strongly recommends a vertical 9:16 ratio (0.56) for optimal delivery.`, {
              duration: 8000
            });
          }
          URL.revokeObjectURL(url);
        };
      }
    });

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
    e.target.value = ""
  }

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    acceptedFiles.forEach((file) => {
      if (file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name)) {
        const url = URL.createObjectURL(file);
        const tempVideo = document.createElement("video");
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
          const width = tempVideo.videoWidth;
          const height = tempVideo.videoHeight;
          const ratio = width / height;
          const targetRatio = 9 / 16;
          const diff = Math.abs(ratio - targetRatio);
          if (diff > 0.05) {
            toast.warning(`"${file.name}" has an aspect ratio of ${width}x${height} (${ratio.toFixed(2)}). TikTok strongly recommends a vertical 9:16 ratio (0.56) for optimal delivery.`, {
              duration: 8000
            });
          }
          URL.revokeObjectURL(url);
        };
      }
    });

    const taggedFiles = acceptedFiles.map(file => {
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
  }, [setFiles, setVideoFile, setVideoPreview])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/gif': ['.gif']
    }
  })

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
      mainView = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setMimeTypes(mimeTypes)
        .setSelectFolderEnabled(false)
        .setParent(initialFolderId)
    } else {
      mainView = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setMimeTypes(mimeTypes)
        .setSelectFolderEnabled(false)
    }

    const myFolders = new google.picker.DocsView()
      .setOwnedByMe(true)
      .setIncludeFolders(true)
      .setMimeTypes(mimeTypes)
      .setSelectFolderEnabled(false)

    const sharedDriveFolders = new google.picker.DocsView()
      .setOwnedByMe(true)
      .setIncludeFolders(true)
      .setMimeTypes(mimeTypes)
      .setSelectFolderEnabled(false)
      .setEnableDrives(true)

    const onlySharedFolders = new google.picker.DocsView()
      .setOwnedByMe(false)
      .setIncludeFolders(true)
      .setMimeTypes(mimeTypes)
      .setSelectFolderEnabled(false)

    const pickerBuilder = new google.picker.PickerBuilder()
      .setOAuthToken(token)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
      .hideTitleBar()
      .setAppId("102886794705")
      .setCallback((data) => {
        if (data.action === "picked") {
          const selected = data.docs.map(doc => {
            const thumb = doc.thumbnails && doc.thumbnails.length > 0
              ? doc.thumbnails[doc.thumbnails.length - 1].url
              : null

            return {
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              size: doc.sizeBytes,
              accessToken: token,
              isDrive: true,
              pickerThumbnail: thumb
            }
          })
          setDriveFiles(selected)
          if (selected.length > 0) {
            setVideoFile(null)
            setDropboxFiles([])
          }
        }
        if (data.action === "picked" || data.action === "cancel") {
          setShowFolderInput(false)
          setFolderLinkValue("")
          pickerInstanceRef.current = null
        }
      })

    if (initialFolderId) {
      pickerBuilder.addView(mainView)
    }
    pickerBuilder
      .addView(myFolders)
      .addView(sharedDriveFolders)
      .addView(onlySharedFolders)

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
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,thumbnailLink`, {
          headers: { Authorization: `Bearer ${googleAuthStatus.accessToken}` }
        })
        if (!response.ok) throw new Error("File not found or permission denied.")
        const data = await response.json()
        const newFile = {
          id: data.id,
          name: data.name,
          mimeType: data.mimeType,
          size: parseInt(data.size || "0", 10),
          accessToken: googleAuthStatus.accessToken,
          isDrive: true,
          pickerThumbnail: data.thumbnailLink || null
        }
        setDriveFiles([newFile])
        setVideoFile(null)
        setDropboxFiles([])
        setShowFolderInput(false)
        setFolderLinkValue("")
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
      if (adType === "SPARK" && (!adName || adName === "Ad Generated Through Blip")) {
        return " ";
      }
      return adName || "Ad Generated Through Blip";
    }

    let fileName = "";
    if (adType !== "SPARK" && file && file.name) {
      fileName = "";
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
    const finalCalculatedName = calculatedName.trim();
    if (!finalCalculatedName) {
      return adType === "SPARK" ? " " : "Ad Generated Through Blip";
    }
    if (adType === "SPARK" && finalCalculatedName === "Ad Generated Through Blip") {
      return " ";
    }
    return finalCalculatedName;
  }, [adNameFormulaV2, adName]);

  const hasMediaInFormData = (fd) => {
    if (fd.adType === 'SPARK') return true;
    return fd.files.length > 0 || fd.driveFiles.length > 0 || fd.dropboxFiles.length > 0 || fd.tiktokLibraryFiles.length > 0;
  }

  const clearQueuedMedia = () => {
    setVideoFile(null)
    setVideoPreview(null)
    if (setFiles) setFiles([])
    setDriveFiles([])
    setDropboxFiles([])
    if (setImportedPosts) setImportedPosts([])
    setFileVariantMap({})
    setGroupVariantMap({})
    setPostVariantMap({})
    if (setSelectedFiles) setSelectedFiles(new Set())
  }

  // Submit form handler to queue background jobs
  const handleQueueJob = async (e) => {
    if (e) e.preventDefault();

    if (isQueueingJobs) {
      return;
    }
    setIsQueueingJobs(true);

    try {
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

        let fileCount = fd.files.length + fd.driveFiles.length + fd.dropboxFiles.length + fd.tiktokLibraryFiles.length;
        if (fd.adType === 'SPARK') {
          fileCount = fd.importedPosts.length;
        }

        const activeTexts = fd.adTexts ? fd.adTexts.filter(t => t.trim() !== '') : [];
        const captionCount = activeTexts.length > 0 ? activeTexts.length : 1;
        const adsToBeCreated = fileCount * captionCount;

        if (adsToBeCreated > 50) {
          toast.error(`${variant.name}: You cannot launch more than 50 ads at once (current selection: ${adsToBeCreated} ads).`);
          return;
        }

        if (!fd.isDuplicatingAdGroupMode && fd.selectedAdGroup && fd.selectedAdGroup.length > 0) {
          for (const adgroupId of fd.selectedAdGroup) {
            const agObj = adGroups.find(ag => ag.adgroup_id === adgroupId);
            if (agObj) {
              const currentAdCount = agObj.ad_count || 0;

              // Calculate ads already queued for this ad group in the job queue
              let queuedAdsCount = 0;
              jobQueue.forEach(qj => {
                const qfd = qj.formData;
                if (!qfd.isDuplicatingAdGroupMode && qfd.selectedAdGroup && qfd.selectedAdGroup.includes(adgroupId)) {
                  let qFileCount = qfd.files.length + qfd.driveFiles.length + qfd.dropboxFiles.length + qfd.tiktokLibraryFiles.length;
                  if (qfd.adType === 'SPARK') {
                    qFileCount = qfd.importedPosts.length;
                  }
                  const qActiveTexts = qfd.adTexts ? qfd.adTexts.filter(t => t.trim() !== '') : [];
                  const qCaptionCount = qActiveTexts.length > 0 ? qActiveTexts.length : 1;
                  queuedAdsCount += qFileCount * qCaptionCount;
                }
              });

              // Also account for the currently running job if it is targeting this ad group
              if (currentJob) {
                const qfd = currentJob.formData;
                if (!qfd.isDuplicatingAdGroupMode && qfd.selectedAdGroup && qfd.selectedAdGroup.includes(adgroupId)) {
                  let qFileCount = qfd.files.length + qfd.driveFiles.length + qfd.dropboxFiles.length + qfd.tiktokLibraryFiles.length;
                  if (qfd.adType === 'SPARK') {
                    qFileCount = qfd.importedPosts.length;
                  }
                  const qActiveTexts = qfd.adTexts ? qfd.adTexts.filter(t => t.trim() !== '') : [];
                  const qCaptionCount = qActiveTexts.length > 0 ? qActiveTexts.length : 1;
                  queuedAdsCount += qFileCount * qCaptionCount;
                }
              }

              if (currentAdCount + queuedAdsCount + adsToBeCreated > 50) {
                if (queuedAdsCount > 0) {
                  toast.error(`${variant.name}: Cannot launch ads. Ad group "${agObj.adgroup_name}" currently has ${currentAdCount} ads and ${queuedAdsCount} ads pending in the job queue. Adding ${adsToBeCreated} more would exceed the limit of 50 ads per ad group.`);
                } else {
                  toast.error(`${variant.name}: Cannot launch ads. Ad group "${agObj.adgroup_name}" currently has ${currentAdCount} ads. Adding ${adsToBeCreated} more would exceed the limit of 50 ads per ad group.`);
                }
                return;
              }
            }
          }
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
          if (!fd.importedPosts || fd.importedPosts.length === 0) {
            toast.error(`${variant.name}: Spark Ads require at least one selected organic post.`);
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

      setJobQueue((prev) => [...prev, ...queuedJobs]);
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

  const refreshPage = () => {
    window.location.reload();
  }

  const formatQueuedJobLabel = (job, prefix) => {
    const summary = `${job.adCount} ad${job.adCount !== 1 ? 's' : ''} to ${job.adGroupDisplayName || 'ad group'}`;
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

  const handleResolveAuthCodes = async () => {
    // Split any entries in sparkAuthCodes by commas/newlines/spaces if multiple are typed/pasted
    const lines = [];
    sparkAuthCodes.forEach(code => {
      if (!code) return;
      const parts = code.split(/[\n\r,]+/).map(p => p.trim()).filter(Boolean);
      lines.push(...parts);
    });

    if (lines.length === 0) {
      toast.error("Please enter at least one authorization code.");
      return;
    }

    setIsResolvingCodes(true);
    const newResolved = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      let authCode = line;
      let originalPostAuthCode = "";
      if (line.includes(",")) {
        const parts = line.split(",").map(p => p.trim());
        authCode = parts[0];
        originalPostAuthCode = parts[1] || "";
      }

      // Skip if already in resolved/imported posts
      const isAlreadyResolved = importedPosts.some(p => p.auth_code === authCode);
      if (isAlreadyResolved) {
        continue;
      }

      try {
        // Step 1: Authorize Spark Ad post
        const authRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-authorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advertiserId: selectedAdvertiser,
            authCode,
            originalPostAuthCode
          })
        });
        const authData = await authRes.json();
        if (!authRes.ok || !authData.success) {
          throw new Error(authData.error || authData.message || 'Failed to authorize organic post');
        }

        // Step 2: Fetch video info
        const infoParams = new URLSearchParams({
          advertiserId: selectedAdvertiser,
          authCode
        });
        const infoRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-video-info?${infoParams}`);
        const infoData = await infoRes.json();
        if (!infoRes.ok || !infoData.success) {
          throw new Error(infoData.error || infoData.message || 'Failed to retrieve organic video information');
        }

        const videoObj = infoData.video || {};
        const itemId = (typeof videoObj.item_id === 'string' ? videoObj.item_id : '') ||
          (typeof videoObj.video_id === 'string' ? videoObj.video_id : '') ||
          (typeof infoData.videoId === 'string' ? infoData.videoId : '') ||
          authCode;
        const caption = videoObj.text || videoObj.title || videoObj.caption || `Spark Post ${itemId}`;
        const likes = videoObj.like_count || 0;
        const views = videoObj.view_count || 0;
        const tiktokName = videoObj.user_info?.tiktok_name || videoObj.display_name || "TikTok Creator";
        const postIdentityId = videoObj.user_info?.identity_id || selectedIdentity;
        const postIdentityType = videoObj.user_info?.identity_type || "BC_AUTH_TT";
        const newPost = {
          id: itemId,
          image_url: videoObj.poster_url || videoObj.cover_image_url || "",
          preview_url: videoObj.preview_url || "",
          previewUrl: videoObj.preview_url || "",
          ad_name: caption,
          tiktok_name: tiktokName,
          auth_code: authCode,
          original_post_auth_code: originalPostAuthCode,
          identity_id: postIdentityId,
          identity_type: postIdentityType,
          likes: likes,
          views: views,
          auth_end_time: videoObj.auth_info?.auth_end_time || null,
          status: 'success'
        };

        newResolved.push(newPost);
      } catch (err) {
        console.error("Error resolving auth code:", authCode, err);
        newResolved.push({
          id: `error-${Date.now()}-${index}`,
          ad_name: `Error resolving: ${line}`,
          auth_code: authCode,
          original_post_auth_code: originalPostAuthCode,
          status: 'error',
          error: err.message || "Failed to resolve post"
        });
      }
    }

    setIsResolvingCodes(false);
    // Append successful ones to importedPosts
    const successfulPosts = newResolved.filter(p => p.status === 'success');
    if (successfulPosts.length > 0) {
      setImportedPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = successfulPosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      toast.success(`Successfully resolved ${successfulPosts.length} posts.`);
    }

    setResolvedCodes(prev => {
      const existing = [...prev];
      newResolved.forEach(p => {
        const idx = existing.findIndex(e => e.auth_code === p.auth_code);
        if (idx > -1) {
          existing[idx] = p;
        } else {
          existing.push(p);
        }
      });
      return existing;
    });

    if (newResolved.some(p => p.status === 'error')) {
      toast.error("Some auth codes could not be resolved. See details below.");
    }
  };

  const handleRetryResolve = async (failedItem) => {
    setIsResolvingCodes(true);
    try {
      const authRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiserId: selectedAdvertiser,
          authCode: failedItem.auth_code,
          originalPostAuthCode: failedItem.original_post_auth_code
        })
      });
      const authData = await authRes.json();
      if (!authRes.ok || !authData.success) {
        throw new Error(authData.error || authData.message || 'Failed to authorize organic post');
      }

      const infoParams = new URLSearchParams({
        advertiserId: selectedAdvertiser,
        authCode: failedItem.auth_code
      });
      const infoRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-video-info?${infoParams}`);
      const infoData = await infoRes.json();
      if (!infoRes.ok || !infoData.success) {
        throw new Error(infoData.error || infoData.message || 'Failed to retrieve organic video information');
      }

      const videoObj = infoData.video || {};
      const itemId = (typeof videoObj.item_id === 'string' ? videoObj.item_id : '') ||
        (typeof videoObj.video_id === 'string' ? videoObj.video_id : '') ||
        (typeof infoData.videoId === 'string' ? infoData.videoId : '') ||
        failedItem.auth_code;
      const caption = videoObj.text || videoObj.title || videoObj.caption || `Spark Post ${itemId}`;
      const posterUrl = videoObj.poster_url || videoObj.cover_image_url || videoObj.preview_url || "";
      const likes = videoObj.like_count || 0;
      const views = videoObj.view_count || 0;
      const tiktokName = videoObj.user_info?.tiktok_name || videoObj.display_name || "TikTok Creator";
      const postIdentityId = videoObj.user_info?.identity_id || selectedIdentity;
      const postIdentityType = videoObj.user_info?.identity_type || "BC_AUTH_TT";

      const updatedPost = {
        id: itemId,
        image_url: posterUrl,
        preview_url: videoObj.preview_url || "",
        previewUrl: videoObj.preview_url || "",
        ad_name: caption,
        tiktok_name: tiktokName,
        auth_code: failedItem.auth_code,
        original_post_auth_code: failedItem.original_post_auth_code,
        identity_id: postIdentityId,
        identity_type: postIdentityType,
        likes: likes,
        views: views,
        auth_end_time: videoObj.auth_info?.auth_end_time || null,
        status: 'success'
      };

      setResolvedCodes(prev =>
        prev.map(p => p.auth_code === failedItem.auth_code ? updatedPost : p)
      );

      setImportedPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        if (existingIds.has(updatedPost.id)) return prev;
        return [...prev, updatedPost];
      });

      toast.success(`Successfully resolved code ${failedItem.auth_code}!`);
    } catch (err) {
      console.error("Retry failed:", err);
      setResolvedCodes(prev =>
        prev.map(p =>
          p.auth_code === failedItem.auth_code
            ? { ...p, error: err.message || "Failed to resolve post", status: 'error' }
            : p
        )
      );
      toast.error(`Retry failed: ${err.message}`);
    } finally {
      setIsResolvingCodes(false);
    }
  };

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
      if (!importedPosts || importedPosts.length === 0) {
        errors.push("At least one selected organic post is required")
      }
    } else {
      const hasMedia = (files && files.length > 0) ||
        (driveFiles && driveFiles.length > 0) ||
        (dropboxFiles && dropboxFiles.length > 0) ||
        (tiktokLibraryFiles && tiktokLibraryFiles.length > 0);
      if (!hasMedia) {
        errors.push("At least one media item is required")
      }
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

    if (!areAllSelectedAdGroupsShopping && urlMode === 'WEBSITE') {
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
    selectedAdGroup, newAdGroupName, selectedIdentity, adType, importedPosts,
    adTexts, adNameFormulaV2, adName, cta, urlMode, landingUrl,
    files, driveFiles, dropboxFiles, tiktokLibraryFiles, areAllSelectedAdGroupsShopping
  ])

  const validationErrors = getValidationErrors()
  const isFormValid = validationErrors.length === 0
  const publishDisabled = !isFormValid || (selectedFiles && selectedFiles.size > 0)

  return (
    <>
      <form onSubmit={handleQueueJob} className="space-y-6">

        <TikTokJobQueue
          hasStartedAnyJob={hasStartedAnyJob}
          isJobTrackerExpanded={isJobTrackerExpanded}
          setIsJobTrackerExpanded={setIsJobTrackerExpanded}
          jobQueue={jobQueue}
          setJobQueue={setJobQueue}
          currentJob={currentJob}
          completedJobs={completedJobs}
          setCompletedJobs={setCompletedJobs}
          progress={progress}
          trackedProgress={trackedProgress}
          videoUploading={videoUploading}
          videoUploadProgress={videoUploadProgress}
          isCancelling={isCancelling}
          setIsCancelling={setIsCancelling}
          currentAbortController={currentAbortController}
          jobId={jobId}
          progressMessage={progressMessage}
          trackedMessage={trackedMessage}
          liveProgress={liveProgress}
          refreshPage={refreshPage}
          handleRetryJob={handleRetryJob}
          formatQueuedJobLabel={formatQueuedJobLabel}
          API_BASE_URL={API_BASE_URL}
        />

        {/* Card 1: Ads Account and Configuration */}
        <Card className="!bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CogIcon className="w-5 h-5" />
                Ad Account Configuration
              </div>
            </CardTitle>
            <CardDescription>Select your ad account, campaign and ad group</CardDescription>
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
                        : "Select an Ad Account"}
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
                    disabled={loadingCampaigns || !selectedAdvertiser}
                    className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-full overflow-hidden flex items-center gap-2">
                      {loadingCampaigns ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin shrink-0" />
                          <span className="block truncate flex-1 text-left text-gray-500">Fetching campaigns...</span>
                        </>
                      ) : (
                        <span className="block truncate flex-1 text-left text-sm font-medium">
                          {selectedAdvertiser && campaigns.length === 0
                            ? "No campaigns exist in this ad account. Try selecting a different account."
                            : selectedCampaign.length === 0
                              ? "Select campaigns"
                              : (() => {
                                const validSelected = selectedCampaign.filter(id => campaigns.some(c => c.campaign_id === id));
                                if (validSelected.length === 1) {
                                  return campaigns.find(c => c.campaign_id === validSelected[0])?.campaign_name || validSelected[0];
                                }
                                return `${validSelected.length} campaigns selected`;
                              })()}
                        </span>
                      )}
                    </div>
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
                        disabled={
                          campaigns.length === 0 ||
                          (selectedCampaign.length === 1 &&
                            (() => {
                              const camp = campaigns.find(c => c.campaign_id === selectedCampaign[0]);
                              return camp?.is_smart_performance_campaign || (camp?.adgroup_count !== undefined && camp.adgroup_count >= 20);
                            })())
                        }
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
                                  !c.is_smart_performance_campaign &&
                                  (c.adgroup_count === undefined || c.adgroup_count < 20) &&
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
              <Popover open={openAdGroup} onOpenChange={(v) => { if (!v || (!loadingAdGroups && selectedCampaign.length > 0)) setOpenAdGroup(v) }}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={selectedCampaign.length === 0 || loadingAdGroups}
                    className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-full overflow-hidden flex items-center gap-2">
                      {loadingAdGroups ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin shrink-0" />
                          <span className="block truncate flex-1 text-left text-gray-500">Fetching ad groups...</span>
                        </>
                      ) : (
                        <span className="block truncate flex-1 text-left text-sm font-medium">
                          {showDuplicateAdGroupBlock
                            ? "New Ad Group"
                            : selectedCampaign.length > 0 && adGroups.length === 0
                              ? "No ad groups exist in this campaign. Select a different campaign"
                              : selectedAdGroup.length > 0
                                ? `${selectedAdGroup.length} ad group${selectedAdGroup.length > 1 ? "s" : ""} selected`
                                : "Select Ad Groups"}
                        </span>
                      )}
                    </div>
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
                    <CommandEmpty>No ad groups exist in this campaign. Select a different campaign</CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar px-2" selectOnFocus={false}>
                      <CommandGroup>
                        <CommandItem
                          key="create-new-adgroup"
                          value="create-new-adgroup"
                          disabled={selectedCampaign.length !== 1}
                          onSelect={() => {
                            if (selectedCampaign.length === 1) {
                              setShowDuplicateAdGroupBlock(true);
                              setSelectedAdGroup([]);
                              setOpenAdGroup(false);
                            }
                          }}
                          className={`
                            h-10 w-full px-4 py-3 m-1 rounded-2xl 
                            ${selectedCampaign.length !== 1 ? '!bg-zinc-800 !text-zinc-500' : '!bg-zinc-700 !text-white'}
                            shadow-md 
                            flex items-center justify-center 
                            text-sm font-semibold 
                            ${selectedCampaign.length !== 1 ? 'cursor-not-allowed' : 'cursor-pointer'}
                            transition-all duration-150 
                            ${selectedCampaign.length === 1 ? 'hover:!bg-black' : ''}
                          `}
                        >
                          🚀 Launch in a New Ad Group
                          {selectedCampaign.length !== 1 && (
                            <span className="ml-2 text-xs text-zinc-400">
                              (Please select 1 campaign)
                            </span>
                          )}
                        </CommandItem>
                      </CommandGroup>
                      {filteredAdGroups.length > 0 && (
                        <CommandGroup heading="Launch in an existing ad group">
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
                                    const isFull = ag.ad_count !== undefined && ag.ad_count >= 50;
                                    return (
                                      <CommandItem
                                        key={`${ag.campaignId || 'camp'}-${ag.adgroup_id}`}
                                        value={ag.adgroup_id}
                                        onSelect={() => {
                                          if (isSelected) {
                                            setSelectedAdGroup(prev => prev.filter(id => id !== ag.adgroup_id))
                                          } else {
                                            if (isFull) {
                                              return toast.error(`Cannot select ad group "${ag.adgroup_name}". It already has ${ag.ad_count} ads, which is the limit of 50.`);
                                            }
                                            setSelectedAdGroup(prev => [...prev, ag.adgroup_id])
                                          }
                                        }}
                                        className={cn(
                                          "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                          isSelected ? "bg-gray-100 font-semibold" : "hover:bg-gray-50",
                                          (!isSelected && isFull) && "opacity-50 cursor-not-allowed"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <Checkbox
                                            id={`adgroup-${ag.adgroup_id}`}
                                            checked={isSelected}
                                            className="w-4 h-4 bg-white border border-gray-300 rounded-[6px] data-[state=checked]:bg-zinc-800 data-[state=checked]:text-white pointer-events-none"
                                          />
                                          <div className="flex-1 min-w-0 flex items-center justify-between">
                                            <span className={cn("text-sm font-medium truncate flex-1", (ag.operation_status === "DISABLE" || ag.operation_status === false || ag.operation_status === "false" || (!isSelected && isFull)) && "text-gray-400")}>
                                              {ag.adgroup_name}
                                            </span>
                                            <span className="flex items-center">
                                              {ag.ad_count !== undefined && (
                                                <span className="text-xs text-gray-400 mr-1.5">({ag.ad_count} {ag.ad_count === 1 ? 'Ad' : 'Ads'})</span>
                                              )}
                                              {(ag.operation_status === "ENABLE" || ag.operation_status === true || ag.operation_status === "true") && (
                                                <span className="ml-0 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                              )}
                                            </span>
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
                        Select an ad group shell to duplicate
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
                          <CommandEmpty>No ad groups exist in this campaign. Select a different campaign</CommandEmpty>
                          <CommandList className="max-h-[220px] overflow-y-auto rounded-2xl custom-scrollbar">
                            <CommandGroup>
                              {(() => {
                                const filtered = adGroups.filter((ag) =>
                                  (ag.adgroup_name || ag.adgroup_id || '').toLowerCase().includes(duplicateAdGroupSearchValue.toLowerCase())
                                );
                                if (filtered.length === 0) {
                                  return (
                                    <CommandItem disabled className="opacity-50 cursor-not-allowed">
                                      No ad groups found.
                                    </CommandItem>
                                  );
                                }
                                return filtered.map((ag) => (
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
                                ));
                              })()}
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
                            <span>New ad group name</span>
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
                <ConfigIcon className="w-5 h-5" />
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
                            const firstLinked = identities.find(i => i.identity_type === 'BC_AUTH_TT') || identities[0];
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
                              Image / Video
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
                  <Users className="w-4 h-4" />
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
                            <span className="flex items-center gap-2">
                              <img
                                src={found.avatar_url || found.profile_image || TikTokIconUrl}
                                alt={found.display_name}
                                className="w-6 h-6 rounded-full object-cover shrink-0 bg-gray-50 border border-gray-100 p-0.5"
                              />
                              <span className="font-semibold text-gray-900">{found.display_name}</span>
                            </span>
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
                              "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150 flex items-center justify-between",
                              selectedIdentity === i.identity_id ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={i.avatar_url || i.profile_image || TikTokIconUrl}
                                alt={i.display_name}
                                className="w-6 h-6 rounded-full object-cover shrink-0 bg-gray-50 border border-gray-100 p-0.5"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-gray-900 truncate">{i.display_name}</span>
                                <span className="text-[10px] text-gray-400 font-normal shrink-0 truncate">{i.username}</span>
                              </div>
                            </div>
                            {selectedIdentity === i.identity_id && <Check className="ml-auto h-4 w-4 text-black shrink-0" />}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Zap className="w-4 h-4" />
                    Spark Ads Video Sourcing
                  </Label>

                  <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setSparkSourceTab("video_list")}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${sparkSourceTab === "video_list"
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-500 hover:text-black"
                        }`}
                    >
                      Choose from Video List
                    </button>
                    <button
                      type="button"
                      onClick={() => setSparkSourceTab("auth_codes")}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${sparkSourceTab === "auth_codes"
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-500 hover:text-black"
                        }`}
                    >
                      Paste Auth Codes
                    </button>
                  </div>
                </div>

                {sparkSourceTab === "auth_codes" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-400">
                        Authorization Codes
                      </Label>
                      <div className="space-y-3">
                        {sparkAuthCodes.map((value, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex flex-col w-full">
                              <Input
                                value={value}
                                onChange={(e) => updateField(setSparkAuthCodes, sparkAuthCodes, index, e.target.value)}
                                onBlur={() => {
                                  if (sparkAuthCodes.some(c => c.trim())) {
                                    handleResolveAuthCodes();
                                  }
                                }}
                                placeholder="Enter spark code (e.g. abcd12345)"
                                className={formInputChrome}
                              />
                            </div>
                            {sparkAuthCodes.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="border border-gray-400 rounded-xl bg-white shadow-xs"
                                size="icon"
                                onClick={() => removeField(setSparkAuthCodes, sparkAuthCodes, index)}
                              >
                                <Trash2 className="w-4 h-4 text-gray-600 cursor-pointer hover:text-red-500" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          className="w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                          onClick={() => addField(setSparkAuthCodes, sparkAuthCodes)}
                        >
                          <Plus className="mr-2 h-4 w-4 text-white" />
                          Add spark code option
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal pl-1 mt-1">
                        Enter the organic post video codes generated from the creator's TikTok app. For stitch or duet videos, enter both codes separated by a comma.
                      </p>
                    </div>

                    {isResolvingCodes && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                        <Loader className="h-3.5 w-3.5 animate-spin text-gray-400" />
                        Resolving codes...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl p-4 bg-white h-[500px] overflow-hidden flex flex-col shadow-xs">
                    {(!selectedIdentity || selectedIdentity === 'CUSTOMIZED_USER') ? (
                      <div className="flex flex-col items-center justify-center text-center p-8 flex-1 text-gray-500">
                        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                        <p className="text-sm font-semibold">Promote From Account Required</p>
                        <p className="text-xs text-gray-400 mt-1">Please select an account in the field above to browse its video list.</p>
                      </div>
                    ) : (
                      <TikTokPostSelectorInline
                        advertiserId={selectedAdvertiser}
                        identityId={selectedIdentity}
                        identityObj={identities.find(i => i.identity_id === selectedIdentity) || null}
                        onImport={setImportedPosts}
                        importedPosts={importedPosts}
                      />
                    )}
                  </div>
                )}
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
                      (files?.length > 0 || videoFile || driveFiles?.length > 0 || dropboxFiles?.length > 0 || (adType === 'SPARK' && importedPosts?.length > 0))
                        ? computeAdNameFromFormula(
                          (adType === 'SPARK' && importedPosts?.length > 0)
                            ? { name: importedPosts[0].ad_name || 'Spark Ad' }
                            : (files[0] || videoFile || driveFiles[0] || dropboxFiles[0]),
                          0,
                          landingUrl,
                          null,
                          adType
                        )
                        : "Upload a file to see example"
                    }
                  </Label>
                </div>

              </div>

              {/* 4. Ad Copy / Caption with template picker */}
              {adType !== 'SPARK' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="flex items-center gap-2 mb-0">
                          <TemplateIcon className="w-4 h-4" />
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
                                      const loadedText = data.text || (data.texts && data.texts[0]) || "";
                                      setAdTexts([loadedText]);
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

                  {/* Single Text Option Textarea */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5">
                      {renderDiffMark("adTexts")}
                      <span className="font-semibold text-sm">Ad Text</span>
                      {adType === 'SPARK' && <span className="text-gray-400 font-normal text-xs">(Optional)</span>}
                    </Label>

                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-zinc-400 font-medium">{(adTexts[0] || "").length}/100</span>
                          </div>
                          <TextareaAutosize
                            value={adTexts[0] || ""}
                            onChange={(e) => {
                              setAdTexts([e.target.value]);
                            }}
                            placeholder="Add text option"
                            minRows={2}
                            maxRows={8}
                            className={`${formTextareaChrome} ${(adTexts[0] || "").length > 100 ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : ""}`}
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
                          />
                          {(adTexts[0] || "").length > 100 && (
                            <p className="text-xs text-red-500 font-medium mt-1">Text cannot exceed 100 characters</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Call to Action & Landing Page URL Stacked */}
              <div className="space-y-6">

                {/* Landing URL Selector */}
                {!areAllSelectedAdGroupsShopping && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between m-0">
                      <Label className="flex items-center gap-1.5">
                        {renderDiffMark("landingUrl")}
                        <LinkIcon className="w-4 h-4" />
                        Link (URL)
                      </Label>

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
                    <p className="text-gray-500 text-[12px] font-regular mt-0.5 mb-0">
                      Your UTMs will be auto applied from Preferences
                    </p>

                    {urlMode === 'WEBSITE' ? (
                      <div className="space-y-3">
                        {!showCustomLink && advertiserPrefs?.links?.length > 0 && (
                          <Select
                            value={landingUrl || ""}
                            onValueChange={(value) => setLandingUrl(value)}
                            disabled={!advertiserId || advertiserPrefs?.links?.length === 0}
                          >
                            <SelectTrigger className={cn("w-full", formFieldChrome)}>
                              <SelectValue placeholder="Select a link" />
                            </SelectTrigger>

                            <SelectContent className="bg-white shadow-lg rounded-xl w-auto">
                              {advertiserPrefs.links.map((linkObj, index) => (
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
                            {(showCustomLink || !advertiserPrefs?.links || advertiserPrefs.links.length === 0) && (
                              <div className="w-full">
                                <Input
                                  type="text"
                                  value={landingUrl}
                                  onChange={(e) => setLandingUrl(e.target.value)}
                                  className={cn("w-full", formInputChrome)}
                                  placeholder="https://example.com"
                                  disabled={!advertiserId}
                                  required
                                />
                              </div>
                            )}

                            {advertiserPrefs?.links?.length > 0 && (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="tiktok-custom-link-toggle"
                                  checked={showCustomLink}
                                  onCheckedChange={(checked) => {
                                    setShowCustomLink(checked);
                                    if (checked) {
                                      setLandingUrl("");
                                    } else {
                                      const defaultLink = advertiserPrefs.links.find(l => l.isDefault) || advertiserPrefs.links[0];
                                      setLandingUrl(defaultLink?.url || "");
                                    }
                                  }}
                                  className="border-gray-300 w-4 h-4 rounded-md"
                                />
                                <label htmlFor="tiktok-custom-link-toggle" className="text-xs font-medium text-gray-600">
                                  Enter custom link
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Select
                          value={landingUrl || ""}
                          onValueChange={(value) => setLandingUrl(value)}
                          disabled={!advertiserId || loadingPages}
                        >
                          <SelectTrigger className={cn("w-full", formFieldChrome)}>
                            <SelectValue placeholder={loadingPages ? "Loading Instant Pages..." : "Select an Instant Page"} />
                          </SelectTrigger>

                          <SelectContent className="bg-white shadow-lg rounded-xl w-auto">
                            {instantPages.map((pageObj) => (
                              <SelectItem
                                key={pageObj.page_id}
                                value={pageObj.page_id}
                                className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-xl mx-2 my-1 ml-4"
                              >
                                <span className="text-xs font-bold truncate">{pageObj.title}</span>
                              </SelectItem>
                            ))}
                            {instantPages.length === 0 && !loadingPages && (
                              <div className="p-4 text-center">
                                <p className="text-xs text-gray-400 italic">No instant pages found</p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  </div>
                )}

                {/* Call to Action Multi Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {renderDiffMark("cta")}
                    <CTAIcon className="w-4 h-4" />
                    Call-to-Action (CTA)
                  </Label>
                  <Popover open={openCta} onOpenChange={setOpenCta}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow hover:bg-white px-3 py-4.5"
                      >
                        <span className="text-sm truncate">
                          {Array.isArray(cta) && cta.length > 0
                            ? cta.map(v => CTA_OPTIONS.find(o => o.value === v)?.label || v).join(", ")
                            : "Select a CTA"}
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
              </div>

              {/* Optional Section: Add Product Information — only shown when ad group has a catalog */}
              {isShoppingAdGroup && showProductCatalog && formCatalogId && (
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <div className="flex flex-col gap-1">
                    <Label className="flex items-center gap-2 font-semibold text-sm">
                      <BookOpen className="w-4 h-4" />
                      Product Information
                    </Label>
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Select a product to promote from the auto-selected catalog.
                    </span>
                  </div>

                  {/* Catalog Selection (Locked/Read-Only) */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Catalog</Label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={true}
                      className="w-full justify-between border border-gray-300 rounded-2xl bg-gray-50 shadow flex items-center px-3 py-4.5 cursor-not-allowed opacity-90 text-left"
                    >
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {formCatalogName || `Catalog ${formCatalogId}`}
                      </span>
                    </Button>
                  </div>

                  {/* Product Selection */}
                  {formCatalogId && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-700">Product</Label>
                      <Popover open={openFormProduct} onOpenChange={(open) => {
                        setOpenFormProduct(open);
                        if (!open) setFormProductSearch("");
                      }}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={loadingFormProducts}
                            className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow flex items-center hover:bg-white px-3 py-4.5"
                          >
                            {loadingFormProducts ? (
                              <div className="flex items-center gap-2">
                                <Loader className="h-4 w-4 animate-spin text-gray-400" />
                                <span className="text-sm text-gray-400">Loading products...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0 font-normal">
                                {activeFormProductImage && (
                                  <img
                                    src={activeFormProductImage}
                                    alt=""
                                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100 font-normal"
                                  />
                                )}
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {selectedProductsLabel}
                                </span>
                              </div>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border-gray-200 shadow-2xl animate-none"
                          align="start"
                          sideOffset={4}
                          side="bottom"
                          avoidCollisions={false}
                          style={{ minWidth: "var(--radix-popover-trigger-width)", width: "auto" }}
                        >
                          <div className="flex flex-col overflow-hidden rounded-xl bg-white text-gray-900">
                            <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                              <input
                                type="text"
                                placeholder="Search products..."
                                value={formProductSearch}
                                onChange={(e) => setFormProductSearch(e.target.value)}
                                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                              />
                            </div>
                            <div className="max-h-[360px] overflow-y-auto rounded-xl p-1">
                              {(() => {
                                const filtered = formCatalogProducts.filter(prod => {
                                  const name = (prod.product_name || "").toLowerCase();
                                  const id = String(prod.product_id || "").toLowerCase();
                                  const q = formProductSearch.toLowerCase();
                                  return name.includes(q) || id.includes(q);
                                });
                                if (filtered.length === 0) {
                                  return (
                                    <div className="py-6 text-center text-xs text-gray-500">
                                      {formCatalogProducts.length === 0 ? 'No products in this catalog.' : 'No results.'}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="space-y-0.5">
                                    {filtered.map((prod) => (
                                      <button
                                        type="button"
                                        key={prod.product_id}
                                        onClick={() => {
                                          setFormProductId(prev => {
                                            const current = Array.isArray(prev) ? prev : (prev ? [prev] : []);
                                            return current.includes(prod.product_id)
                                              ? current.filter(id => id !== prod.product_id)
                                              : [...current, prod.product_id];
                                          });
                                        }}
                                        className={cn(
                                          "w-full text-left px-3 py-2 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-3",
                                          (Array.isArray(formProductId) ? formProductId.includes(prod.product_id) : formProductId === prod.product_id) ? "bg-gray-50 font-medium" : ""
                                        )}
                                      >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${(Array.isArray(formProductId) ? formProductId.includes(prod.product_id) : formProductId === prod.product_id) ? "bg-black border-black text-white" : "border-gray-200"}`}>
                                          {(Array.isArray(formProductId) ? formProductId.includes(prod.product_id) : formProductId === prod.product_id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        {prod.image_url && (
                                          <img
                                            src={prod.image_url}
                                            alt=""
                                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 truncate">{prod.product_name}</p>
                                          {prod.price && (
                                            <p className="text-xs text-gray-400">{prod.price} {prod.currency}</p>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Section: Add Store & Product Information (Showcase) */}
              {isShoppingAdGroup && showStoreProductSelection && (
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <div className="flex flex-col gap-1">
                    <Label className="flex items-center gap-2 font-semibold text-sm">
                      <Store className="w-4 h-4" />
                      Showcase Product Information <span className="text-gray-400 font-normal text-xs">• Optional</span>
                    </Label>
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Select a showcase product to promote.
                    </span>
                  </div>

                  {/* Showcase Product Selection */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Showcase Product</Label>
                    <Popover open={openFormStoreProduct} onOpenChange={(open) => {
                      setOpenFormStoreProduct(open);
                      if (!open) setFormStoreProductSearch("");
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={loadingFormStoreProducts}
                          className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow flex items-center hover:bg-white px-3 py-4.5"
                        >
                          {loadingFormStoreProducts ? (
                            <div className="flex items-center gap-2">
                              <Loader className="h-4 w-4 animate-spin text-gray-400" />
                              <span className="text-sm text-gray-400">Loading showcase products...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0 font-normal">
                              {activeFormStoreProductImage && (
                                <img
                                  src={activeFormStoreProductImage}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100 font-normal"
                                />
                              )}
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {selectedStoreProductsLabel}
                              </span>
                            </div>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border-gray-200 shadow-2xl animate-none"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={{ minWidth: "var(--radix-popover-trigger-width)", width: "auto" }}
                      >
                        <div className="flex flex-col overflow-hidden rounded-xl bg-white text-gray-900">
                          <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                            <input
                              type="text"
                              placeholder="Search showcase products..."
                              value={formStoreProductSearch}
                              onChange={(e) => setFormStoreProductSearch(e.target.value)}
                              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                            />
                          </div>
                          <div className="max-h-[360px] overflow-y-auto rounded-xl p-1">
                            {(() => {
                              const filtered = formStoreProducts.filter(prod => {
                                const name = (prod.title || "").toLowerCase();
                                const id = String(prod.item_group_id || "").toLowerCase();
                                const q = formStoreProductSearch.toLowerCase();
                                return name.includes(q) || id.includes(q);
                              });
                              if (filtered.length === 0) {
                                return (
                                  <div className="py-6 text-center text-xs text-gray-500">
                                    {formStoreProducts.length === 0 ? 'No showcase products found.' : 'No results.'}
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-0.5">
                                  {filtered.map((prod) => (
                                    <button
                                      type="button"
                                      key={prod.item_group_id}
                                      onClick={() => {
                                        setFormStoreProductId(prev => {
                                          const current = Array.isArray(prev) ? prev : (prev ? [prev] : []);
                                          return current.includes(prod.item_group_id)
                                            ? current.filter(id => id !== prod.item_group_id)
                                            : [...current, prod.item_group_id];
                                        });
                                        if (prod.store_id) {
                                          setFormStoreId(prod.store_id);
                                        }
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-3",
                                        (Array.isArray(formStoreProductId) ? formStoreProductId.includes(prod.item_group_id) : formStoreProductId === prod.item_group_id) ? "bg-gray-50 font-medium" : ""
                                      )}
                                    >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${(Array.isArray(formStoreProductId) ? formStoreProductId.includes(prod.item_group_id) : formStoreProductId === prod.item_group_id) ? "bg-black border-black text-white" : "border-gray-200"}`}>
                                        {(Array.isArray(formStoreProductId) ? formStoreProductId.includes(prod.item_group_id) : formStoreProductId === prod.item_group_id) && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      {prod.product_image_url && (
                                        <img
                                          src={prod.product_image_url}
                                          alt=""
                                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{prod.title}</p>
                                        {prod.min_price && (
                                          <p className="text-xs text-gray-400">{prod.min_price} {prod.currency}</p>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* 6. Media Section or Spark Info Card */}
              {adType !== 'SPARK' && (
                <div className="pt-6">
                  {(
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          {renderDiffMark("videoFile")}
                          Upload Media
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
                          {...getRootProps()}
                          className={`group cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
                            }`}
                        >
                          <input {...getInputProps()} />
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

                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Button
                    type="submit"
                    disabled={isQueueingJobs || publishDisabled}
                    className="w-full h-12 bg-neutral-950 hover:bg-blue-700 text-white rounded-2xl font-semibold transition-all duration-150"
                  >
                    {isQueueingJobs ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="w-5 h-5 animate-spin" />
                        Publishing Ads...
                      </div>
                    ) : (
                      'Publish Ads'
                    )}
                  </Button>

                  {!areAllSelectedAdGroupsShopping && urlMode === 'WEBSITE' && !landingUrl?.trim() && (
                    <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                      Please provide a link URL
                    </div>
                  )}

                  {!areAllSelectedAdGroupsShopping && urlMode === 'WEBSITE' && landingUrl?.trim() && !(() => {
                    try {
                      const urlString = landingUrl.trim();
                      if (/^https?:\/\//i.test(urlString)) {
                        new URL(urlString);
                        return true;
                      }
                    } catch (_) { }
                    return false;
                  })() && (
                      <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                        Link (URL) must be a valid URL starting with http:// or https://
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
                        disabled={isQueueingJobs}
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
                {newTemplateNameInput.trim() && copyTemplates && copyTemplates[newTemplateNameInput.trim()] && (
                  <p className="text-xs text-red-500 mt-1">This template name already exists</p>
                )}
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
                  disabled={!newTemplateNameInput.trim() || isSavingNew || !!(copyTemplates && copyTemplates[newTemplateNameInput.trim()])}
                  className="bg-blue-600 text-white rounded-xl hover:bg-blue-700 min-w-[80px] disabled:opacity-50"
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
    <div
      className="fixed left-1/2 transform -translate-x-1/2 z-[2147483647] bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-[500px]"
      style={{
        top: 'max(20px, calc(50vh - 380px))' // Positions it above center where picker usually appears, capped at 20px from top
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900">Quick Navigate to Folder</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 w-6 p-0 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Paste Google Drive folder or file link here"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onImport()
              }
            }}
            className="flex-1 border border-gray-200 focus:ring-black focus:border-black rounded-lg text-sm px-3 py-2 h-9"
          />
          <Button
            type="button"
            onClick={onImport}
            disabled={!linkValue || isImporting}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 text-sm h-9 flex items-center justify-center min-w-[70px] disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Opening...
              </>
            ) : (
              "Open"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}