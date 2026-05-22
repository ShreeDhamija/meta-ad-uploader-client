"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useTikTokVideoUpload } from "@/hooks/useTikTokVideoUpload"
import { readCache, writeCache } from "@/lib/dataCache"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { cn } from "@/lib/utils"
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
  Zap
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import TextareaAutosize from 'react-textarea-autosize'
import { toast } from "sonner"
import CTAIcon from '@/assets/icons/cta.svg?react';
import CheckBlackIcon from '@/assets/icons/CheckBlack.svg?react';
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import axios from "axios"

import DesktopIcon from '@/assets/Desktop.webp'
import DropboxIcon from '@/assets/Dropbox.png'
import AdAccountIcon from '@/assets/icons/adaccount.svg?react'
import { default as CogIcon, default as ConfigIcon } from '@/assets/icons/cog.svg?react'
import CampaignIcon from '@/assets/icons/folder.svg?react'
import AdSetIcon from '@/assets/icons/grid.svg?react'
import PlusIcon from '@/assets/icons/plus.svg?react'

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

export default function TikTokAdCreationForm({
  advertiserId,
  advertisers,
  onAdvertiserChange,

  // Lifted Form State
  adName, setAdName,
  adText, setAdText,
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
  advertiserPrefs
}) {
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

  const [selectedAdvertiser, setSelectedAdvertiser] = useState(advertiserId || '')

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
  const [openTemplatePicker, setOpenTemplatePicker] = useState(false)

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
  const [loadingIdentities, setLoadingIdentities] = useState(false)
  const [instantPages, setInstantPages] = useState([])
  const [loadingPages, setLoadingPages] = useState(false)
  const [showDeleteAllVariantsDialog, setShowDeleteAllVariantsDialog] = useState(false)

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

    setLoadingIdentities(true)
    tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-identities?advertiserId=${selectedAdvertiser}&_t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        const list = d.identities || []
        setIdentities(list)
        // Note: the identity selection logic now lives in the separate useEffect below
      })
      .catch(() => { })
      .finally(() => setLoadingIdentities(false))
  }, [selectedAdvertiser, setCampaigns, setSelectedCampaign, setAdGroups, setIdentities, tiktokFetch])

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
        setAdGroups(combined)
        setSelectedAdGroup(prevSelected => {
          // Keep any currently selected ad groups that are actually present in the newly fetched ad groups
          const stillValidSelected = prevSelected.filter(id => combined.some(g => g.adgroup_id === id))
          if (stillValidSelected.length > 0) {
            return stillValidSelected
          } else {
            // Fallback to defaults if none of the previously selected ones are still valid
            return defaultAdGroupIds.filter(id => combined.some(g => g.adgroup_id === id))
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
        setAdGroups(results.flat())
        toast.success('Ad Groups refreshed!')
      })
      .catch(() => toast.error('Failed to refresh ad groups'))
      .finally(() => setLoadingAdGroups(false))
  }

  const forceRefreshIdentities = (e) => {
    e.stopPropagation()
    if (!selectedAdvertiser || loadingIdentities) return
    setLoadingIdentities(true)
    tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-identities?advertiserId=${selectedAdvertiser}&_t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        const list = d.identities || []
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
      .finally(() => setLoadingIdentities(false))
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
    const file = e.target.files[0]
    if (!file) return
    if (setFiles) {
      setFiles([file])
    } else {
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
    }
    setUploadProgress(0)
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

  // Submit form handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    const isDuplicatingAdGroupMode = showDuplicateAdGroupBlock && duplicateAdGroup
    if (!selectedAdvertiser) return toast.error('Please select an advertiser')
    if (!isDuplicatingAdGroupMode && (!selectedAdGroup || selectedAdGroup.length === 0)) {
      return toast.error('Please select at least one ad group')
    }
    if (isDuplicatingAdGroupMode && !newAdGroupName.trim()) {
      return toast.error('Please enter a name for the new duplicated ad group')
    }

    if (!selectedIdentity || selectedIdentity === 'CUSTOMIZED_USER') {
      return toast.error(adType === 'NORMAL'
        ? 'Identity is required. Please select one.'
        : 'Promote From is required. Please select a linked TikTok account.'
      )
    }

    if (adType === 'SPARK') {
      if (!sparkAuthCode || !sparkAuthCode.trim()) {
        return toast.error('Spark Ads require an Organic Post Authorization Code or link.')
      }
    }

    if (!adName.trim()) return toast.error('Ad name is required')
    if (!cta || cta.length === 0) return toast.error('Please select at least one Call to Action')

    const isCloudFile = driveFiles.length > 0 || dropboxFiles.length > 0
    if (adType === 'NORMAL' && !videoFile && !isCloudFile) {
      return toast.error("Please select a video")
    }

    setIsSubmitting(true)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      let videoId = null

      if (adType === 'SPARK') {
        toast.info('Authorizing organic TikTok post...')
        // 1. POST /api/tiktok/spark-authorize
        const authRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-authorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advertiserId: selectedAdvertiser,
            authCode: sparkAuthCode.trim()
          })
        })
        const authData = await authRes.json()
        if (!authRes.ok || !authData.success) {
          throw new Error(authData.error || 'Failed to authorize organic post')
        }

        toast.info('Fetching organic video information...')
        // 2. GET /api/tiktok/spark-video-info
        const infoParams = new URLSearchParams({
          advertiserId: selectedAdvertiser,
          authCode: sparkAuthCode.trim()
        })
        const infoRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/spark-video-info?${infoParams}`)
        const infoData = await infoRes.json()
        if (!infoRes.ok || !infoData.success) {
          throw new Error(infoData.error || 'Failed to retrieve organic video information')
        }

        videoId = infoData.videoId
        setIsUploading(false)
        setUploadProgress(100)
      } else {
        if (tiktokLibraryFiles.length > 0) {
          videoId = tiktokLibraryFiles[0].videoId
          setIsUploading(false)
          setUploadProgress(100)
        } else if (videoFile) {
          console.log('[TikTok Submit] Uploading local video file:', videoFile.name, videoFile.size)
          toast.info('Uploading video...')
          const uploadResult = await uploadVideoToTikTok(videoFile)
          console.log('[TikTok Submit] Upload hook result:', JSON.stringify(uploadResult))
          if (!uploadResult?.videoId) {
            throw new Error('Video upload failed — no video ID returned')
          }
          videoId = uploadResult.videoId
          console.log('[TikTok Submit] ✅ Video ID resolved:', videoId)
          setIsUploading(false)
          setUploadProgress(100)
        } else {
          const formData = new FormData()
          if (driveFiles.length > 0) {
            formData.append('driveFile', JSON.stringify(driveFiles[0]))
          } else if (dropboxFiles.length > 0) {
            formData.append('dropboxFile', JSON.stringify(dropboxFiles[0]))
          }

          const uploadParams = new URLSearchParams({ advertiserId: selectedAdvertiser })
          const uploadUrl = `${API_BASE_URL}/api/tiktok/upload-video?${uploadParams}`
          const sourceName = driveFiles.length > 0 ? 'Google Drive' : 'Dropbox'

          toast.info(`Downloading from ${sourceName} and uploading...`)
          const uploadRes = await tiktokFetch(uploadUrl, { method: 'POST', body: formData })
          const uploadRawText = await uploadRes.text()

          let uploadData = {}
          try { uploadData = JSON.parse(uploadRawText) } catch (parseErr) {
            throw new Error(`Server returned non-JSON response (${uploadRes.status}): ${uploadRawText.slice(0, 200)}`)
          }

          if (!uploadRes.ok || !uploadData.success) {
            throw new Error(uploadData.error || uploadData.message || `Upload failed with status ${uploadRes.status}`)
          }

          videoId = uploadData.videoId
          setUploadProgress(100)
          setIsUploading(false)
          toast.success('Video uploaded!')
        }
      }

      const selectedIdentityObj = identities.find(i => i.identity_id === selectedIdentity)
      const isCustomized = !selectedIdentity || selectedIdentity === 'CUSTOMIZED_USER'
      const currentIdentityId = isCustomized ? undefined : selectedIdentity
      const currentIdentityType = isCustomized ? 'CUSTOMIZED_USER' : (selectedIdentityObj?.identity_type || 'TT_USER')

      toast.info(`Creating TikTok ads...`)

      const finalUrl = urlMode === 'WEBSITE'
        ? applyUtmsToUrl(landingUrl, advertiserPrefs?.defaultUTMs || [])
        : landingUrl

      const results = []
      const errors = []

      let adGroupIdsToSubmit = [...selectedAdGroup]

      if (isDuplicatingAdGroupMode) {
        toast.info('Duplicating ad group on-the-fly...')
        const dupRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/adgroup/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advertiser_id: selectedAdvertiser,
            source_adgroup_id: duplicateAdGroup,
            new_campaign_id: selectedCampaign[0],
            new_adgroup_name: newAdGroupName.trim()
          })
        })
        const dupData = await dupRes.json()
        if (!dupRes.ok || !dupData.success || !dupData.copied_adgroup_id) {
          throw new Error(dupData.error || 'Ad group duplication failed')
        }

        toast.success(`🎉 Ad group duplicated successfully as "${dupData.adgroup_name}"!`)
        adGroupIdsToSubmit = [dupData.copied_adgroup_id]

        // Fetch refreshed list of ad groups to populate dropdown
        try {
          const params = new URLSearchParams({ advertiserId: selectedAdvertiser, campaignId: selectedCampaign[0] })
          const refetchRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-adgroups?${params}`)
          const refetchData = await refetchRes.json()
          const list = refetchData.adGroups || refetchData.adgroups || []
          const enrichedList = list.map(ag => ({
            ...ag,
            campaignId: selectedCampaign[0],
            campaignName: campaigns.find(c => c.campaign_id === selectedCampaign[0])?.campaign_name || selectedCampaign[0]
          }))
          setAdGroups(enrichedList)
          writeCache(`tiktok_adgroups_${selectedCampaign[0]}`, list)
        } catch (e) {
          console.warn('Failed to refresh ad groups after duplication:', e.message)
        }
      }

      for (const adgroupId of adGroupIdsToSubmit) {
        const adGroupName = adGroups.find(ag => ag.adgroup_id === adgroupId)?.adgroup_name ||
          (isDuplicatingAdGroupMode ? newAdGroupName.trim() : adgroupId)
        toast.info(`Creating ad in: ${adGroupName}...`)

        const creativeCTAs = Array.isArray(cta) ? cta : [cta];
        const creatives = creativeCTAs.map((singleCta) => {
          const creative = {
            video_id: videoId,
            ad_text: adText,
            call_to_action: singleCta,
            ad_name: creativeCTAs.length > 1 ? `${adName.trim()} - ${singleCta}` : `${adName.trim()}`,
            identity_type: currentIdentityType,
            landing_page_type: urlMode === 'WEBSITE' ? 'EXTERNAL_WEBSITE' : 'INSTANT_PAGE',
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
          return creative;
        })

        const createPayload = {
          advertiserId: selectedAdvertiser,
          adgroupId: adgroupId,
          ...(currentIdentityId ? { identityId: currentIdentityId } : {}),
          identityType: currentIdentityType,
          adName: adName.trim(),
          adType: adType,
          creatives: creatives
        }

        console.log(`[TikTok Submit] 🚀 Sending create-ad payload for ${adgroupId}:`, JSON.stringify(createPayload, null, 2))

        try {
          const createRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/create-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload),
          })
          const createData = await createRes.json()
          console.log(`[TikTok Submit] Create-ad response status for ${adgroupId}:`, createRes.status)
          console.log(`[TikTok Submit] Create-ad response data for ${adgroupId}:`, JSON.stringify(createData))
          if (!createRes.ok || !createData.success) {
            throw new Error(createData.error || 'Ad creation failed')
          }
          results.push(adgroupId)
        } catch (err) {
          errors.push({ adgroupId, adGroupName, error: err.message })
        }
      }

      if (errors.length > 0) {
        if (results.length > 0) {
          toast.warning(`🎉 Created ads in ${results.length} ad groups, but failed in ${errors.length} groups: \n` + errors.map(e => `${e.adGroupName}: ${e.error}`).join('\n'))
        } else {
          throw new Error(`Failed to create ads in all selected ad groups: \n` + errors.map(e => `${e.adGroupName}: ${e.error}`).join('\n'))
        }
      } else {
        toast.success(`🎉 TikTok ads created successfully in all ${results.length} ad groups!`)
      }

      // Reset form fields
      setAdName('')
      setAdText('')
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
    } catch (err) {
      toast.error(err.message)
      setIsUploading(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const shouldScrollVariantPicker = variants.length > 3

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

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
                <AdAccountIcon className="w-4 h-4 text-gray-500" />
                Advertiser's Account
              </Label>
              {authLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
            </div>
            <Popover open={openAdvertiser} onOpenChange={setOpenAdvertiser}>
              <PopoverTrigger asChild>
                <Button
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
                      : "Select Advertiser's Account"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
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
          </div>

          {/* 2. Campaign Combobox with Duplication Form */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {renderDiffMark("selectedCampaign")}
                <CampaignIcon className="w-4 h-4 text-gray-500" />
                Select a Campaign
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
              <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
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
                                <span className={cn("text-sm font-medium truncate flex-1", c.operation_status === "DISABLE" && "text-gray-400")}>
                                  {c.campaign_name}
                                </span>
                                {c.operation_status === "ENABLE" && (
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
                      disabled={selectedCampaign.length !== 1}
                      onClick={() => {
                        if (selectedCampaign.length === 1) {
                          const campId = selectedCampaign[0];
                          setDuplicateCampaign(campId);
                          const camp = campaigns.find(c => c.campaign_id === campId);
                          if (camp) {
                            setNewCampaignName((camp.campaign_name || '') + "_copy");
                          }
                        }
                        setShowDuplicateCampaignBlock(true);
                        setOpenCampaign(false);
                      }}
                      className="h-10 w-full px-4 py-3 rounded-2xl bg-zinc-800 text-white shadow-md flex items-center justify-center text-xs font-semibold cursor-pointer transition-all duration-150 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                      variant="outline"
                    >
                      <CampaignIcon className="mr-2 h-4 w-4 text-white" />
                      Launch in a New Campaign
                    </Button>
                  </div>
                </Command>
              </PopoverContent>
            </Popover>

            {showDuplicateCampaignBlock && (
              <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 rounded-3xl relative mt-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateCampaignBlock(false)
                    setDuplicateCampaign("")
                    setNewCampaignName("")
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-400 hover:text-gray-600 transition-all duration-150 shadow-sm"
                  aria-label="Close duplicate campaign selection"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5 pr-6">
                    <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900 leading-none">
                      <Copy className="w-4 h-4 text-gray-700 shrink-0" />
                      Select a Campaign to Duplicate
                    </div>
                    <span className="text-xs sm:text-[13px] text-gray-500 font-medium block leading-none">
                      We'll copy the selected campaign and duplicate its ad groups.
                    </span>
                  </div>

                  {/* Dropdown/Popover to select campaign to duplicate */}
                  <Popover open={openDuplicateCampaign} onOpenChange={setOpenDuplicateCampaign}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDuplicateCampaign}
                        disabled={campaigns.length === 0}
                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow-sm overflow-hidden whitespace-nowrap hover:bg-white text-sm h-11 px-5 font-normal text-gray-900 transition-all duration-150"
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
                                    <span className={cn("text-sm font-medium", c.operation_status === "DISABLE" && "text-gray-400")}>
                                      {c.campaign_name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {c.operation_status === "ENABLE" && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
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

                  {/* Includes Ads Option */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold text-gray-900">Includes Ads</Label>
                      <p className="text-xs text-gray-500 font-medium">Also recreate ads under each ad group</p>
                    </div>
                    <Switch
                      checked={duplicateIncludeAds}
                      onCheckedChange={setDuplicateIncludeAds}
                    />
                  </div>

                  {/* New Campaign Name Input */}
                  {duplicateCampaign && (
                    <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <Label htmlFor="newCampaignName" className="text-xs font-semibold text-gray-700">
                          {renderDiffMark("newCampaignName")}
                          New Campaign Name
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
                        className="w-full h-11 rounded-2xl bg-zinc-800 hover:bg-black text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 px-4 shadow transition-all active:scale-[0.98]"
                      >
                        {isDuplicating ? (
                          <><Loader className="w-4 h-4 animate-spin" />Creating...</>
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
                <AdSetIcon className="w-4 h-4 text-gray-500" />
                Select an Ad Group
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
                  variant="outline"
                  role="combobox"
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
              <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput
                    placeholder="Search ad groups..."
                    value={adGroupSearch}
                    onValueChange={setAdGroupSearch}
                    className="bg-transparent border-none focus:ring-0"
                  />
                  <CommandEmpty>No ad group found.</CommandEmpty>
                  <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                    <CommandGroup>
                      {filteredAdGroups.length > 0 ? (
                        (() => {
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
                                      key={ag.adgroup_id}
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
                                          <span className={cn("text-sm font-medium truncate flex-1", ag.operation_status === "DISABLE" && "text-gray-400")}>
                                            {ag.adgroup_name}
                                          </span>
                                          {ag.operation_status === "ENABLE" && (
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
                        })()
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">No ad groups found.</p>
                      )}
                    </CommandGroup>
                  </CommandList>

                  <div className="p-2 border-t border-gray-100">
                    <Button
                      type="button"
                      disabled={selectedCampaign.length !== 1}
                      onClick={() => {
                        setShowDuplicateAdGroupBlock(true);
                        setOpenAdGroup(false);
                      }}
                      className="h-10 w-full px-4 py-3 rounded-2xl bg-zinc-800 text-white shadow-md flex items-center justify-center text-xs font-semibold cursor-pointer transition-all duration-150 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                      variant="outline"
                    >
                      <AdSetIcon className="mr-2 h-4 w-4 text-white" />
                      Launch in a New Ad Group
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
              <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 rounded-3xl relative mt-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateAdGroupBlock(false)
                    setDuplicateAdGroup("")
                    setNewAdGroupName("")
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-400 hover:text-gray-600 transition-all duration-150 shadow-sm"
                  aria-label="Close duplicate ad group selection"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5 pr-6">
                    <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900 leading-none">
                      {renderDiffMark("duplicateAdGroup")}
                      <Copy className="w-4 h-4 text-gray-700 shrink-0" />
                      Select an ad group to duplicate
                    </div>
                    <span className="text-xs sm:text-[13px] text-gray-500 font-medium block leading-none">
                      We'll copy the ad group and all its settings
                    </span>
                  </div>

                  <Popover open={openDuplicateAdGroup} onOpenChange={setOpenDuplicateAdGroup}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDuplicateAdGroup}
                        disabled={adGroups.length === 0}
                        className="w-full justify-between border border-gray-300 rounded-full bg-white shadow-sm overflow-hidden whitespace-nowrap hover:bg-white text-sm h-11 px-5 font-normal text-gray-900 transition-all duration-150"
                      >
                        <span className="block truncate text-left">
                          {duplicateAdGroup
                            ? adGroups.find((ag) => ag.adgroup_id === duplicateAdGroup)?.adgroup_name || duplicateAdGroup
                            : "Select ad group to duplicate"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 bg-white shadow-lg rounded-2xl"
                      align="start"
                      sideOffset={4}
                      side="bottom"
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
                                    <span className={cn("text-sm font-medium", ag.operation_status === "DISABLE" && "text-gray-400")}>
                                      {ag.adgroup_name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {ag.operation_status === "ENABLE" && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
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
                          New Ad Group Name
                        </Label>
                        <Input
                          id="newAdGroupName"
                          value={newAdGroupName}
                          onChange={(e) => setNewAdGroupName(e.target.value)}
                          placeholder="Enter new ad group name..."
                          className="border border-gray-300 rounded-2xl bg-white shadow-sm py-2 px-4 text-sm h-11 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                        />
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
                  variant="outline"
                  role="combobox"
                  disabled={!selectedAdvertiser || loadingIdentities}
                  className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow transition-colors duration-150 hover:bg-white disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <span className="truncate text-sm font-medium">
                    {selectedIdentity && selectedIdentity !== 'CUSTOMIZED_USER'
                      ? identities.find(i => i.identity_id === selectedIdentity)?.display_name || selectedIdentity
                      : adType === 'NORMAL'
                        ? "Select Identity"
                        : "Select account to Promote From"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 bg-white shadow-lg rounded-2xl" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
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
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{i.display_name}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-tight">{i.identity_type}</span>
                          </div>
                          {selectedIdentity === i.identity_id && <Check className="ml-auto h-4 w-4 text-black" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
              <p className="text-xs text-gray-400 leading-relaxed pl-1">
                Enter the organic post video code (authorized from the TikTok app) or the post link to boost it as a Spark Ad.
              </p>
            </div>
          )}

          {/* Creative Fields - Visible for both Normal and Spark Ad types */}
          <div className="space-y-6">
            {/* 3. Ad Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {renderDiffMark("adName")}
                <FileText className="w-4 h-4 text-gray-500" />
                Ad Name
              </Label>
              <Input
                type="text"
                placeholder="e.g. Black Friday Launch Ad"
                value={adName}
                onChange={e => setAdName(e.target.value)}
                className={formInputChrome}
              />
            </div>

            {/* 4. Ad Copy / Caption with template picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {renderDiffMark("adText")}
                  <TemplateIcon className="w-4 h-4 text-gray-500" />
                  Ad Copy / Caption {adType === 'SPARK' && <span className="text-gray-400 font-normal text-xs">(Optional - uses organic caption if empty)</span>}
                </Label>
                {advertiserPrefs?.copyTemplates && Object.keys(advertiserPrefs.copyTemplates).length > 0 && (
                  <Popover open={openTemplatePicker} onOpenChange={setOpenTemplatePicker}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700 p-0">
                        {openTemplatePicker ? "Close Picker" : "Use Template"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-1 bg-white rounded-2xl shadow-xl border-gray-100" align="end">
                      <Command>
                        <CommandInput placeholder="Search templates..." className="h-8" />
                        <CommandList>
                          <CommandEmpty>No templates found.</CommandEmpty>
                          <CommandGroup heading="Ad Text Templates">
                            {Object.entries(advertiserPrefs.copyTemplates).map(([name, data]) => (
                              <CommandItem
                                key={name}
                                onSelect={() => {
                                  if (data.texts?.length > 0) setAdText(data.texts[0])
                                  setOpenTemplatePicker(false)
                                }}
                                className="p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">{name}</span>
                                  <span className="text-[10px] text-gray-500 line-clamp-1">{data.texts?.[0]}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <TextareaAutosize
                value={adText}
                onChange={e => setAdText(e.target.value)}
                placeholder="Write a catchy caption... ✍️"
                minRows={3}
                maxRows={8}
                className={formTextareaChrome}
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
              />
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
                  <PopoverContent className="p-0 bg-white rounded-2xl shadow-xl border border-gray-100" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandInput placeholder="Search CTAs..." className="bg-transparent border-none focus:ring-0" />
                      <CommandEmpty>No CTA found.</CommandEmpty>
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
                                <span className="text-xs font-medium">{opt.label}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Landing URL Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    {renderDiffMark("landingUrl")}
                    <LinkIcon className="w-4 h-4 text-gray-500" />
                    Landing Page URL
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
                      <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-300 hover:text-gray-600">
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-1 bg-white rounded-2xl shadow-xl border-gray-100" align="end">
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
              </div>
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
                    <PopoverContent align="end" className="bg-white rounded-xl p-2 w-64 border border-gray-200 shadow-lg">
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
                              <span className="text-sm text-gray-800">{src.name}</span>
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
                    className={cn(
                      "group cursor-pointer border-2 border-dashed rounded-3xl p-8 text-center transition-all",
                      videoFile ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="video/mp4,video/quicktime"
                      className="hidden"
                      onChange={handleVideoSelect}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Click to upload video</p>
                        <p className="text-xs text-gray-400 mt-1">Recommended ratio: 9:16 for TikTok</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cloud File Preview */}
                {(driveFiles.length > 0 || dropboxFiles.length > 0) && (
                  <div className="border border-emerald-200 bg-emerald-50/30 rounded-3xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-emerald-100 flex items-center justify-center shadow-sm">
                          <Video className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                            {driveFiles[0]?.name || dropboxFiles[0]?.name}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-bold">
                            {driveFiles.length > 0 ? "Google Drive" : "Dropbox"} Selected
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
                        onClick={() => {
                          setDriveFiles([])
                          setDropboxFiles([])
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cloud Source Buttons */}
                {(() => {
                  const rowSources = uploadSources.filter((s) => s !== 'local')
                  if (rowSources.length === 0) return null

                  return (
                    <div className="grid grid-cols-2 gap-2">
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
                            <span className="truncate text-xs font-semibold">{src.compactLabel}</span>
                          </Button>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Progress bar */}
                {(isUploading || videoUploading) && (
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

        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-base transition-all shadow-lg bg-black hover:bg-zinc-800 text-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50",
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              {(isUploading || videoUploading) ? 'Uploading Media...' : 'Creating TikTok Ad...'}
            </div>
          ) : (
            'Create TikTok Ad'
          )}
        </Button>
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
          Your ad will be live after TikTok's review process
        </p>
      </div>

      <FolderPickerOverlay
        show={showFolderInput}
        linkValue={folderLinkValue}
        setLinkValue={setFolderLinkValue}
        onImport={handleImportFromFolder}
        onCancel={() => setShowFolderInput(false)}
        isImporting={isImportingFolder}
      />

      {/* FLOATING VARIANT PICKER BAR AT BOTTOM */}
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
                  setShowDeleteAllVariantsDialog(false)
                  handleDeleteAllVariants()
                }}
              >
                Delete All Variants
              </Button>
            </div>
          </div>
        </div>
      )}

    </form>
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