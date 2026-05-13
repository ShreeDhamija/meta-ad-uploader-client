"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { readCache, writeCache } from "@/lib/dataCache"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { cn } from "@/lib/utils"
import {
  Check,
  ChevronsUpDown,
  CloudUpload,
  FileText,
  Link as LinkIcon,
  Loader,
  RefreshCcw,
  Trash2,
  Upload,
  Users,
  Video,
  X
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import TextareaAutosize from 'react-textarea-autosize'
import { toast } from "sonner"

import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import axios from "axios"

import DesktopIcon from '@/assets/Desktop.webp'
import DropboxIcon from '@/assets/Dropbox.png'
import AdAccountIcon from '@/assets/icons/adaccount.svg?react'
import CogIcon from '@/assets/icons/cog.svg?react'
import CTAIcon from '@/assets/icons/cta.svg?react'
import CampaignIcon from '@/assets/icons/folder.svg?react'
import AdSetIcon from '@/assets/icons/grid.svg?react'
import PlusIcon from '@/assets/icons/plus.svg?react'
import TemplateIcon from '@/assets/icons/template.svg?react'


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const TIKTOK_PINK = '#FE2C55'

const CTA_OPTIONS = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'BOOK_NOW', label: 'Book Now' },
  { value: 'WATCH_NOW', label: 'Watch Now' },
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

export default function TikTokAdCreationForm({ advertiserId, advertisers, onAdvertiserChange }) {
  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow"
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`
  const formTextareaChrome = "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"

  const { tiktokFetch, tiktokUser, isLoading: authLoading, refreshTikTokUser } = useTikTokAuth()

  useEffect(() => {
    console.group('🎯 [TikTokAdCreationForm] Mounted')
    console.log('  advertiserId prop  :', advertiserId || 'NONE')
    console.log('  advertisers prop   :', advertisers?.length, 'items', advertisers)
    console.log('  tiktokUser         :', tiktokUser)
    console.log('  localStorage uid   :', localStorage.getItem('tiktok_uid'))
    console.log('  localStorage token :', localStorage.getItem('tiktok_token') ? localStorage.getItem('tiktok_token').slice(0,12)+'...' : 'MISSING')
    console.log('  localStorage adIds :', localStorage.getItem('tiktok_advertiser_ids'))
    console.log('  API_BASE_URL       :', API_BASE_URL)
    console.groupEnd()
  }, [])

  const [selectedAdvertiser, setSelectedAdvertiser] = useState(advertiserId || '')
  const [campaigns, setCampaigns] = useState([])
  const [adGroups, setAdGroups] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedAdGroup, setSelectedAdGroup] = useState('')
  const [adName, setAdName] = useState('')
  const [adText, setAdText] = useState('')
  const [cta, setCta] = useState(['SHOP_NOW'])
  const [landingUrl, setLandingUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [driveFiles, setDriveFiles] = useState([])
  const [dropboxFiles, setDropboxFiles] = useState([])
  const [uploadSources, setUploadSources] = useState(['local', 'drive', 'dropbox'])
  const [uploadSourcesOpen, setUploadSourcesOpen] = useState(false)
  const [videoPreview, setVideoPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingAdGroups, setLoadingAdGroups] = useState(false)
  const [identities, setIdentities] = useState([])
  const [selectedIdentity, setSelectedIdentity] = useState('')
  const [loadingIdentities, setLoadingIdentities] = useState(false)

  // Popover States
  const [openAdvertiser, setOpenAdvertiser] = useState(false)
  const [openCampaign, setOpenCampaign] = useState(false)
  const [openAdGroup, setOpenAdGroup] = useState(false)
  const [advertiserSearch, setAdvertiserSearch] = useState('')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [adGroupSearch, setAdGroupSearch] = useState('')

  // Cloud Picker State
  const [googleAuthStatus, setGoogleAuthStatus] = useState({ checking: true, authenticated: false, accessToken: null })
  const [showFolderInput, setShowFolderInput] = useState(false)
  const [folderLinkValue, setFolderLinkValue] = useState("")
  const [isImportingFolder, setIsImportingFolder] = useState(false)
  const pickerInstanceRef = useRef(null)


  const fileRef = useRef()

  const toggleCta = (value) => {
    setCta(prev =>
      prev.includes(value)
        ? (prev.length > 1 ? prev.filter(v => v !== value) : prev)
        : [...prev, value]
    )
  }

  const getMimeFromName = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    const map = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'webm': 'video/webm',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    return map[ext] || 'application/octet-stream';
  };

  const isVideoFile = (file) => {
    const mime = file.mimeType || file.type || getMimeFromName(file.name);
    return mime.startsWith('video/');
  };

  const extractFolderId = (url) => {
    const folderMatch = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    return folderMatch ? folderMatch[1] : null;
  };

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
        const response = await axios.get(`${API_BASE_URL}/auth/google/status`, { withCredentials: true });
        setGoogleAuthStatus({
          checking: false,
          authenticated: response.data.authenticated,
          accessToken: response.data.accessToken
        });
      } catch (error) {
        setGoogleAuthStatus({ checking: false, authenticated: false, accessToken: null });
      }
    };
    checkGoogleAuth();
  }, []);

  // Google Picker Logic
  const createPicker = useCallback((token, initialFolderId = null) => {
    if (pickerInstanceRef.current) {
      try { pickerInstanceRef.current.setVisible(false); } catch (e) {}
    }
    setShowFolderInput(true);
    const mimeTypes = ["application/vnd.google-apps.folder", "image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm", "video/quicktime"].join(",");
    
    let mainView;
    if (initialFolderId) {
      mainView = new google.picker.DocsView().setIncludeFolders(true).setMimeTypes(mimeTypes).setSelectFolderEnabled(false).setParent(initialFolderId);
    } else {
      mainView = new google.picker.DocsView().setIncludeFolders(true).setMimeTypes(mimeTypes).setSelectFolderEnabled(false);
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
          }));
          // For TikTok, we only support one video at a time for now in the simple form
          // But we can store them in driveFiles
          setDriveFiles(selected);
          if (selected.length > 0) {
            // Pick the first one as the active video
            const file = selected[0];
            setVideoFile(null); // Clear local file
            setDropboxFiles([]); // Clear dropbox files
            toast.success(`Selected ${file.name} from Google Drive`);
          }
        }
        if (data.action === "picked" || data.action === "cancel") {
          setShowFolderInput(false);
          setFolderLinkValue("");
          pickerInstanceRef.current = null;
        }
      });

    pickerBuilder.addView(mainView);
    const picker = pickerBuilder.build();
    pickerInstanceRef.current = picker;
    picker.setVisible(true);
  }, []);

  const openPicker = useCallback((token) => {
    if (!window.google || !window.google.picker) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js?onload=onApiLoad';
      document.body.appendChild(script);
      window.onApiLoad = () => {
        window.gapi.load('picker', () => createPicker(token));
      };
    } else {
      createPicker(token);
    }
  }, [createPicker]);

  const handleDriveClick = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/google/status`, { withCredentials: true });
      if (res.data.authenticated && res.data.accessToken) {
        setGoogleAuthStatus({ authenticated: true, checking: false, accessToken: res.data.accessToken });
        openPicker(res.data.accessToken);
        return;
      }
    } catch (err) {}

    const authWindow = window.open(`${API_BASE_URL}/auth/google?popup=true`, "_blank", "width=1100,height=750");
    if (!authWindow) return toast.error("Popup blocked. Please allow popups and try again.");

    const listener = (event) => {
      if (event.origin !== `${API_BASE_URL}`) return;
      const { type, accessToken } = event.data || {};
      if (type === "google-auth-success") {
        window.removeEventListener("message", listener);
        authWindow.close();
        setGoogleAuthStatus({ authenticated: true, checking: false, accessToken });
        openPicker(accessToken);
      }
    };
    window.addEventListener("message", listener);
  }, [openPicker]);

  const handleImportFromFolder = useCallback(async () => {
    if (!googleAuthStatus.accessToken) return toast.error('Not authenticated with Google Drive');
    const link = folderLinkValue || "";
    const fileMatch = link.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    const fileId = fileMatch ? fileMatch[1] : null;

    if (fileId) {
      try {
        setIsImportingFolder(true);
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
          headers: { Authorization: `Bearer ${googleAuthStatus.accessToken}` }
        });
        if (!response.ok) throw new Error("File not found or permission denied.");
        const data = await response.json();
        const newFile = { id: data.id, name: data.name, mimeType: data.mimeType, size: parseInt(data.size || "0", 10), accessToken: googleAuthStatus.accessToken, isDrive: true };
        setDriveFiles([newFile]);
        setVideoFile(null);
        setDropboxFiles([]);
        setShowFolderInput(false);
        setFolderLinkValue("");
        toast.success(`Imported: ${data.name}`);
      } catch (error) {
        toast.error("Failed to import file.");
      } finally {
        setIsImportingFolder(false);
      }
      return;
    }

    const folderId = extractFolderId(link);
    if (!folderId) return toast.error('Invalid Google Drive link');
    createPicker(googleAuthStatus.accessToken, folderId);
  }, [folderLinkValue, googleAuthStatus.accessToken, createPicker]);

  // Dropbox Logic
  useEffect(() => {
    if (document.getElementById('dropboxjs')) return;
    const script = document.createElement('script');
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
    script.id = 'dropboxjs';
    script.setAttribute('data-app-key', import.meta.env.VITE_DROPBOX_APP_KEY || 'YOUR_DROPBOX_APP_KEY');
    script.async = true;
    document.head.appendChild(script);
  }, []);

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
        }));
        setDropboxFiles(dropboxFilesData);
        if (dropboxFilesData.length > 0) {
          setVideoFile(null);
          setDriveFiles([]);
          toast.success(`Selected ${dropboxFilesData[0].name} from Dropbox`);
        }
      },
      linkType: 'direct',
      multiselect: false, // For now, keep it simple
      extensions: ['.mp4', '.mov', '.webm'],
    });
  }, []);

  const handleDropboxClick = useCallback(async () => {
    if (!window.Dropbox) return toast.error("Dropbox is still loading.");
    try {
      const statusRes = await fetch(`${API_BASE_URL}/auth/dropbox/status`, { credentials: 'include' });
      const statusData = await statusRes.json();
      if (statusData.authenticated && statusData.accessToken) {
        openDropboxChooser(statusData.accessToken);
        return;
      }
    } catch (err) {}

    const authWindow = window.open(`${API_BASE_URL}/auth/dropbox?popup=true`, 'dropbox-auth', "width=600,height=700");
    const handleMessage = (event) => {
      if (event.origin !== API_BASE_URL) return;
      if (event.data?.type === 'dropbox-auth-success') {
        window.removeEventListener('message', handleMessage);
        openDropboxChooser(event.data.accessToken);
      }
    };
    window.addEventListener('message', handleMessage);
  }, [openDropboxChooser]);


  useEffect(() => {
    if (advertiserId) setSelectedAdvertiser(advertiserId)
  }, [advertiserId])

  const handleAdvertiserChange = useCallback((value) => {
    setSelectedAdvertiser(value)
    if (onAdvertiserChange) {
      onAdvertiserChange(value)
    }
    // Reset selections
    setSelectedCampaign('')
    setSelectedAdGroup('')
    setCampaigns([])
    setAdGroups([])
  }, [onAdvertiserChange])

  useEffect(() => {
    if (!selectedAdvertiser) {
      console.log('⚠️ [TikTok Form] No advertiser selected — skipping campaign fetch')
      setCampaigns([])
      setSelectedCampaign('')
      return
    }

    // Check Cache First
    const cacheKey = `tiktok_campaigns_${selectedAdvertiser}`
    const cached = readCache(cacheKey)
    if (cached) {
      console.log('📦 [TikTok Form] Using cached campaigns', cached.length)
      setCampaigns(cached)
      setSelectedCampaign('')
      setAdGroups([])
      return
    }

    setLoadingCampaigns(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
    const url = `${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`
    console.group(`📡 [TikTok Form] Fetching campaigns for advertiser: ${selectedAdvertiser}`)
    console.log('  URL                :', url)
    console.groupEnd()
    tiktokFetch(url)
      .then(async r => {
        const body = await r.text()
        let d
        try { d = JSON.parse(body) } catch { d = {} }
        return d
      })
      .then(d => {
        const list = d.campaigns || []
        console.log(`✅ [TikTok Form] Campaigns loaded: ${list.length} item(s)`)
        setCampaigns(list)
        writeCache(cacheKey, list) // Write to Cache
        setSelectedCampaign('')
        setAdGroups([])
      })
      .catch(err => {
        console.error('❌ [TikTok Form] fetch-campaigns FAILED:', err)
        toast.error('Failed to load campaigns')
      })
      .finally(() => setLoadingCampaigns(false))

    setLoadingIdentities(true)
    const identityUrl = `${API_BASE_URL}/api/tiktok/fetch-identities?advertiserId=${selectedAdvertiser}`
    tiktokFetch(identityUrl)
      .then(r => r.json())
      .then(d => {
        const list = d.identities || []
        console.log(`✅ [TikTok Form] Identities loaded: ${list.length}`, list)
        setIdentities(list)
        if (list.length > 0) {
          const best = list.find(i => i.identity_type === 'TT_USER') ||
                       list.find(i => i.identity_type === 'BC_AUTH_TT') ||
                       list[0]
          setSelectedIdentity(best.identity_id)
        } else {
          setSelectedIdentity('CUSTOMIZED_USER')
        }
      })
      .catch(err => console.error('❌ [TikTok Form] Failed to fetch identities:', err))
      .finally(() => setLoadingIdentities(false))
  }, [selectedAdvertiser])

  useEffect(() => {
    if (!selectedCampaign) {
      setAdGroups([])
      setSelectedAdGroup('')
      return
    }

    // Check Cache
    const cacheKey = `tiktok_adgroups_${selectedCampaign}`
    const cached = readCache(cacheKey)
    if (cached) {
      console.log('📦 [TikTok Form] Using cached adgroups', cached.length)
      setAdGroups(cached)
      setSelectedAdGroup('')
      return
    }

    setLoadingAdGroups(true)
    const url = `${API_BASE_URL}/api/tiktok/fetch-adgroups?advertiserId=${selectedAdvertiser}&campaignId=${selectedCampaign}`
    console.group(`📡 [TikTok Form] Fetching adgroups for campaign: ${selectedCampaign}`)
    console.groupEnd()
    tiktokFetch(url)
      .then(r => r.json())
      .then(d => {
        const list = d.adGroups || d.adgroups || []
        console.log(`✅ [TikTok Form] Ad Groups loaded: ${list.length}`)
        setAdGroups(list)
        writeCache(cacheKey, list) // Write to Cache
        setSelectedAdGroup('')
      })
      .catch(err => {
        console.error('❌ [TikTok Form] fetch-adgroups FAILED:', err)
        toast.error('Failed to load ad groups')
      })
      .finally(() => setLoadingAdGroups(false))
  }, [selectedCampaign, selectedAdvertiser])

  const handleVideoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setUploadProgress(0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.group('🚀 [TikTok Form] handleSubmit triggered')
    console.log('  selectedAdvertiser :', selectedAdvertiser || 'MISSING')
    console.log('  selectedCampaign   :', selectedCampaign || 'MISSING')
    console.log('  selectedAdGroup    :', selectedAdGroup || 'MISSING')
    console.log('  adName             :', adName.trim() || 'MISSING')
    console.log('  cta                :', cta)
    console.log('  videoFile          :', videoFile?.name || 'MISSING')
    console.groupEnd()

    if (!selectedAdvertiser) return toast.error('Please select an advertiser')
    if (!selectedAdGroup) return toast.error('Please select an ad group')
    if (!selectedIdentity) return toast.error('Please select a TikTok Identity/Profile')
    if (!adName.trim()) return toast.error('Ad name is required')
    if (cta.length === 0) return toast.error('Please select at least one Call to Action')
    const isCloudFile = driveFiles.length > 0 || dropboxFiles.length > 0
    if (!videoFile && !isCloudFile) return toast.error("Please select a video")

    setIsSubmitting(true)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      let videoId = null;

      if (tiktokLibraryFiles.length > 0) {
        // Skip upload for items already in TikTok Library
        videoId = tiktokLibraryFiles[0].videoId;
        setIsUploading(false);
        setUploadProgress(100);
      } else {
        toast.info('Uploading video...')
        const formData = new FormData()
        
        if (videoFile) {
          formData.append('videoFile', videoFile)
        } else if (driveFiles.length > 0) {
          formData.append('driveFile', JSON.stringify(driveFiles[0]))
        } else if (dropboxFiles.length > 0) {
          formData.append('dropboxFile', JSON.stringify(dropboxFiles[0]))
        }
        
        const uploadParams = new URLSearchParams({ advertiserId: selectedAdvertiser })
        const uploadUrl = `${API_BASE_URL}/api/tiktok/upload-video?${uploadParams}`
        console.group(`📡 [TikTok Form] Uploading video`)
        console.log('  URL                :', uploadUrl)
        if (videoFile) {
          console.log('  File name          :', videoFile.name)
          console.log('  File size          :', (videoFile.size / 1024 / 1024).toFixed(2), 'MB')
        } else {
          const sourceName = driveFiles.length > 0 ? 'Google Drive' : 'Dropbox';
          console.log('  Source             :', sourceName)
          console.log('  File name          :', driveFiles[0]?.name || dropboxFiles[0]?.name)
        }
        console.log('  x-tiktok-user-id   :', localStorage.getItem('tiktok_uid') || 'MISSING')
        console.log('  x-tiktok-token     :', localStorage.getItem('tiktok_token') ? '✅ present' : '❌ MISSING')
        console.groupEnd()
        
        const uploadRes = await tiktokFetch(uploadUrl, {
          method: 'POST',
          body: formData,
        })

        const uploadRawText = await uploadRes.text()
        console.group('📬 [TikTok Form] upload-video response')
        console.log('  HTTP Status        :', uploadRes.status, uploadRes.statusText)
        console.log('  Raw Body           :', uploadRawText)
        console.groupEnd()

        let uploadData = {}
        try {
          uploadData = JSON.parse(uploadRawText)
        } catch (parseErr) {
          throw new Error(`Server returned non-JSON response (${uploadRes.status}): ${uploadRawText.slice(0, 200)}`)
        }

        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || uploadData.message || `Upload failed with status ${uploadRes.status}`)
        }
        
        videoId = uploadData.videoId;
        setUploadProgress(100)
        setIsUploading(false)
        toast.success('Video uploaded!')
      }

      toast.info(`Creating ${cta.length} ad(s)...`)
      const creatives = cta.map(action => ({
        video_id: videoId,
        ad_text: adText,
        call_to_action: action,
        landing_page_url: landingUrl,
        ad_name: `${adName.trim()} (${action})`
      }))
      const createPayload = {
        advertiserId: selectedAdvertiser,
        adgroupId: selectedAdGroup,
        identityId: selectedIdentity === 'CUSTOMIZED_USER' ? undefined : selectedIdentity,
        identityType: selectedIdentity === 'CUSTOMIZED_USER' ? 'CUSTOMIZED_USER' : undefined,
        adName: adName.trim(),
        creatives
      }
      console.group(`📡 [TikTok Form] Creating ${cta.length} ad(s)`)
      console.log('  URL                :', `${API_BASE_URL}/api/tiktok/create-ad`)
      console.log('  Payload            :', JSON.stringify(createPayload, null, 2))
      console.groupEnd()
      const createRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/create-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
      })
      const createData = await createRes.json()
      console.group('📬 [TikTok Form] create-ad response')
      console.log('  HTTP Status        :', createRes.status, createRes.statusText)
      console.log('  Data               :', createData)
      console.groupEnd()
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Ad creation failed')
      }
      toast.success(`🎉 ${cta.length} TikTok ad(s) created successfully!`)
      setAdName(''); setAdText(''); setLandingUrl(''); setCta(['SHOP_NOW'])
      setVideoFile(null); setVideoPreview(null); setUploadProgress(0)
    } catch (err) {
      console.error('❌ [TikTok Form] handleSubmit error:', err.message)
      toast.error(err.message)
      setIsUploading(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Identity Section - Now matching Meta AdAccountSettings style */}
      <Card className="!bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <CogIcon className="w-5 h-5" />
              Ad Account Configuration
            </div>
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1 font-medium">Select your advertiser account and identity</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Advertiser Account */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <AdAccountIcon className="w-4 h-4" />
                Advertiser Account
              </Label>
              <RefreshCcw 
                className={cn("h-4 w-4 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors", authLoading && "animate-spin")} 
                onClick={() => {
                  toast.promise(refreshTikTokUser(), {
                    loading: 'Refreshing accounts...',
                    success: 'Accounts refreshed!',
                    error: 'Refresh failed'
                  })
                }}
              />
            </div>
            <Popover open={openAdvertiser} onOpenChange={setOpenAdvertiser}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openAdvertiser}
                  disabled={!advertisers || advertisers.length === 0}
                  className={cn(
                    "w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white",
                    !selectedAdvertiser && "text-gray-500"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {selectedAdvertiser
                      ? advertisers.find(adv => (adv.advertiser_id || adv.id) === selectedAdvertiser)?.advertiser_name || selectedAdvertiser
                      : "Select an Advertiser Account"}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="p-0 bg-white shadow-lg rounded-2xl" 
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
              >
                <Command>
                  <CommandInput 
                    placeholder="Search accounts..." 
                    value={advertiserSearch}
                    onValueChange={setAdvertiserSearch}
                    className="bg-transparent border-none focus:ring-0"
                  />
                  <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                    <CommandEmpty>No advertiser found.</CommandEmpty>
                    <CommandGroup>
                      {advertisers?.filter(adv => 
                        (adv.advertiser_name || adv.name || '').toLowerCase().includes(advertiserSearch.toLowerCase()) ||
                        (adv.advertiser_id || adv.id || '').toLowerCase().includes(advertiserSearch.toLowerCase())
                      ).map(adv => {
                        const id = adv.advertiser_id || adv.id
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
                            <div className="flex flex-col w-full">
                              <span className="font-medium">{adv.advertiser_name || adv.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">ID: {id}</span>
                            </div>
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

          {/* Post As (Identity) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Post As (Identity)
            </Label>
            <Select
              value={selectedIdentity}
              onValueChange={setSelectedIdentity}
              disabled={!selectedAdvertiser || loadingIdentities}
            >
              <SelectTrigger className={formFieldChrome}>
                <SelectValue placeholder="Select TikTok identity" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl shadow-lg border-gray-200">
                <SelectItem value="CUSTOMIZED_USER" className="cursor-pointer hover:bg-gray-50 rounded-lg m-1">
                  <div className="flex flex-col">
                    <span className="font-medium italic">Custom Identity (No Link Required)</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Uses Ad Name as Profile Name</span>
                  </div>
                </SelectItem>
                {identities.map(i => (
                  <SelectItem
                    key={i.identity_id}
                    value={i.identity_id}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg m-1"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{i.display_name || i.identity_id}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{i.identity_type}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {identities.length === 0 && !loadingIdentities && selectedAdvertiser && (
              <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                <PlusIcon className="w-3 h-3" />
                No linked accounts found. "Custom Identity" will be used.
              </p>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Placement Section */}
      <Card className="!bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <CampaignIcon className="w-4 h-4 text-gray-500" />
            Placement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Campaign */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <CampaignIcon className="w-3.5 h-3.5" />
                  Campaign
                </Label>
                {loadingCampaigns && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
              </div>
              <Popover open={openCampaign} onOpenChange={setOpenCampaign}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={!selectedAdvertiser || loadingCampaigns}
                    className={cn(
                      "w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white",
                      !selectedCampaign && "text-gray-500"
                    )}
                  >
                    <div className="truncate">
                      {selectedCampaign
                        ? campaigns.find(c => c.campaign_id === selectedCampaign)?.campaign_name || selectedCampaign
                        : "Select a Campaign"}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0 bg-white shadow-lg rounded-2xl" 
                  align="start"
                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                >
                  <Command>
                    <CommandInput 
                      placeholder="Search campaigns..." 
                      value={campaignSearch}
                      onValueChange={setCampaignSearch}
                      className="bg-transparent border-none focus:ring-0"
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                      <CommandEmpty>No campaign found.</CommandEmpty>
                      <CommandGroup>
                        {campaigns.filter(c => 
                          (c.campaign_name || '').toLowerCase().includes(campaignSearch.toLowerCase())
                        ).map(c => (
                          <CommandItem
                            key={c.campaign_id}
                            value={c.campaign_id}
                            onSelect={() => {
                              setSelectedCampaign(c.campaign_id)
                              setOpenCampaign(false)
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                              selectedCampaign === c.campaign_id ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                            )}
                          >
                            <span className="truncate">{c.campaign_name}</span>
                            {selectedCampaign === c.campaign_id && <Check className="ml-auto h-4 w-4 text-black" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                    <div className="p-2 border-t border-gray-100">
                      <Button
                        type="button"
                        onClick={() => {
                          setOpenCampaign(false)
                          document.getElementById('tiktok-duplicator-section')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="w-full h-10 rounded-xl bg-zinc-800 hover:bg-black text-white text-xs font-bold"
                      >
                        <PlusIcon className="w-3.5 h-3.5 mr-2" />
                        Launch in a New Campaign
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ad Group */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <AdSetIcon className="w-3.5 h-3.5" />
                  Ad Group
                </Label>
                {loadingAdGroups && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
              </div>
              <Popover open={openAdGroup} onOpenChange={setOpenAdGroup}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={!selectedCampaign || loadingAdGroups}
                    className={cn(
                      "w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white",
                      !selectedAdGroup && "text-gray-500"
                    )}
                  >
                    <div className="truncate">
                      {selectedAdGroup
                        ? adGroups.find(g => g.adgroup_id === selectedAdGroup)?.adgroup_name || selectedAdGroup
                        : "Select an Ad Group"}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0 bg-white shadow-lg rounded-2xl" 
                  align="start"
                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                >
                  <Command>
                    <CommandInput 
                      placeholder="Search ad groups..." 
                      value={adGroupSearch}
                      onValueChange={setAdGroupSearch}
                      className="bg-transparent border-none focus:ring-0"
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                      <CommandEmpty>No ad group found.</CommandEmpty>
                      <CommandGroup>
                        {adGroups.filter(g => 
                          (g.adgroup_name || '').toLowerCase().includes(adGroupSearch.toLowerCase())
                        ).map(g => (
                          <CommandItem
                            key={g.adgroup_id}
                            value={g.adgroup_id}
                            onSelect={() => {
                              setSelectedAdGroup(g.adgroup_id)
                              setOpenAdGroup(false)
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                              selectedAdGroup === g.adgroup_id ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                            )}
                          >
                            <span className="truncate">{g.adgroup_name}</span>
                            {selectedAdGroup === g.adgroup_id && <Check className="ml-auto h-4 w-4 text-black" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Creative Section */}
      <Card className="!bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <Video className="w-4 h-4 text-gray-500" />
            Creative
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Video Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      const checked = uploadSources.includes(src.id);
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
                      );
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
                  {videoPreview ? (
                    <div className="relative group">
                      <video src={videoPreview} className="mx-auto max-h-48 rounded-2xl shadow-md border border-white" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                        <RefreshCcw className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Click to upload video</p>
                        <p className="text-xs text-gray-400 mt-1">Recommended ratio: 9:16 for TikTok</p>
                      </div>
                    </>
                  )}
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
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                        {driveFiles.length > 0 ? "Google Drive" : "Dropbox"} Selected
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
                    onClick={() => {
                      setDriveFiles([]);
                      setDropboxFiles([]);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Cloud Source Buttons */}
            {(() => {
              const rowSources = uploadSources.filter((s) => s !== 'local');
              if (rowSources.length === 0) return null;

              return (
                <div className="grid grid-cols-2 gap-2">
                  {rowSources.map((id) => {
                    const src = UPLOAD_SOURCE_OPTIONS.find((o) => o.id === id);
                    if (!src) return null;

                    let onClick;
                    if (id === 'drive') onClick = handleDriveClick;
                    else if (id === 'dropbox') onClick = handleDropboxClick;

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
                        <span className="truncate text-xs font-semibold uppercase tracking-wider">{src.compactLabel}</span>
                      </Button>
                    );
                  })}
                </div>
              );
            })()}

            {isUploading && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-emerald-600 mt-1 uppercase tracking-widest">
                  Uploading {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          {/* Ad Details: Name + Text */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Ad Name
              </Label>
              <Input
                type="text"
                placeholder="Enter your ad name"
                value={adName}
                onChange={e => setAdName(e.target.value)}
                className={formInputChrome}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <TemplateIcon className="w-4 h-4" />
                Ad Copy / Caption
              </Label>
              <TextareaAutosize
                value={adText}
                onChange={e => setAdText(e.target.value)}
                placeholder="What's your ad about? 🔥"
                minRows={3}
                maxRows={10}
                className={formTextareaChrome}
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CTA Multi-select Dropdown */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <CTAIcon className="w-4 h-4" />
                Call to Action
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Multi-select</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between font-normal",
                      formFieldChrome,
                      cta.length === 0 && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">
                      {cta.length > 0 
                        ? `${cta.length} selected (${cta.map(v => CTA_OPTIONS.find(o => o.value === v)?.label).join(', ')})`
                        : "Select CTA options"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-white rounded-2xl shadow-xl border-gray-200" align="start">
                  <Command className="rounded-2xl">
                    <CommandInput placeholder="Search CTAs..." className="h-9" />
                    <CommandEmpty>No CTA found.</CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandGroup>
                        {CTA_OPTIONS.map((opt) => (
                          <CommandItem
                            key={opt.value}
                            value={opt.value}
                            onSelect={() => toggleCta(opt.value)}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-xl m-1"
                          >
                            <div className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border border-gray-300 transition-all",
                              cta.includes(opt.value) ? "bg-black border-black text-white" : "bg-transparent"
                            )}>
                              {cta.includes(opt.value) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-sm font-medium">{opt.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Landing URL */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3" />
                Landing Page URL
              </Label>
              <Input
                type="url"
                placeholder="https://myshop.com/product"
                value={landingUrl}
                onChange={e => setLandingUrl(e.target.value)}
                className={formInputChrome}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-base transition-all shadow-lg",
            isSubmitting
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-black hover:bg-zinc-800 text-white hover:scale-[1.01] active:scale-[0.99]"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              {isUploading ? 'Uploading Media...' : 'Creating TikTok Ad...'}
            </div>
          ) : (
            'Create TikTok Ad'
          )}
        </Button>
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium uppercase tracking-widest">
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

    </form>
  )
}

function FolderPickerOverlay({ show, linkValue, setLinkValue, onImport, onCancel, isImporting }) {
  if (!show) return null;
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
          <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
            Or browse in the picker window
          </p>
        </div>
      </div>
    </div>
  );
}