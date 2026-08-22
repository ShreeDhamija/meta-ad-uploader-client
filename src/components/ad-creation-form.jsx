"use client";

import DesktopIcon from "@/assets/Desktop.webp";
import DropboxIcon from "@/assets/Dropbox.png";
import CsvFileIcon from "@/assets/csv-file.png";
import DraftFolderIcon from "@/assets/icons/BlueFolder.svg";
import FrameIcon from "@/assets/icons/Frame.webp";
import IGColorIcon from "@/assets/icons/IGColor.webp";
import MetaIcon from "@/assets/icons/MetaTag.svg";
import CheckIcon from "@/assets/icons/check.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import CTAIcon from "@/assets/icons/cta.svg?react";
import FacebookIcon from "@/assets/icons/fb.svg?react";
import TemplateIcon from "@/assets/icons/file.svg?react";
import InstagramIcon from "@/assets/icons/ig.svg?react";
import LabelIcon from "@/assets/icons/label.svg?react";
import LinkIcon from "@/assets/icons/link.svg?react";
import PartialSuccess from "@/assets/icons/partialsuccess.svg?react";
import ConfigIcon from "@/assets/icons/plus.svg?react";
import QueueIcon from "@/assets/icons/queue.svg?react";
import RocketIcon2 from "@/assets/icons/rocket.svg?react";
import UploadIcon from "@/assets/icons/upload.svg?react";
import DraftsModal from "@/components/DraftsModal";
import FacebookReauthDialog from "@/components/FacebookReauthDialog";
import FlexAdsImportModal from "@/components/FlexAdsImportModal";
import FrameioPickerModal from "@/components/FrameioPickerModal";
import MetaMediaLibraryModal from "@/components/MetaMediaLibraryModal";
import PostSelectorInline from "@/components/PostIDSelector";
import PixelTracking from "@/components/settings/PixelTracking";
import ShopDestinationSelector from "@/components/shop-destination-selector";
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts";
import ScheduleDateTimePicker from "@/components/ui/ScheduleDateTimePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/AuthContext";
import { deleteCopyTemplates } from "@/lib/deleteCopyTemplate";
import { cleanupPublishedDraftMedia, createDraftShareUrl, listDrafts, refreshDraftMediaUrl } from "@/lib/draftApi";
import { resizeOversizedImages } from "@/lib/resizeOversizedImage";
import { saveCopyTemplate } from "@/lib/saveCopyTemplate";
import { saveSettings } from "@/lib/saveSettings";
import useGlobalSettings from "@/lib/useGlobalSettings";
import { useIntercom } from "@/lib/useIntercom";
import { cn } from "@/lib/utils";
import axios from "axios";
import {
  AlertTriangle,
  ArrowUpDown,
  Ban,
  BicepsFlexed,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleX,
  Clock,
  CloudUpload,
  Eye,
  FileText,
  Info,
  Link2,
  Loader,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import pLimit from "p-limit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const NOOP = () => { };
const META_AD_CREATION_ACTION_REQUIRED = "META_AD_CREATION_ACTION_REQUIRED";
const META_ACTION_REQUIRED_MESSAGE = "Meta requires you to take certain steps to continue ad creation";
const TEMPLATE_LINK_SYNC_USER_ID = "929470643071391";
const PIXEL_TRACKING_FORM_ALLOWED_USER_IDS = ["10236978990363167", "10234447959963619", "10162737276661695", "10165258246808665"];
const INSTANT_EXPERIENCE_USER_IDS = ["10236978990363167", "2901368380250453"];
const LOWERCASE_FILE_NAME_FORMULA_USER_IDS = ["27431350269900471"];
const AD_SET_NAME_VARIABLE_TEAM_IDS = ["team_1777190523537_hmh1srk8j", "team_1787061148847_j1tmrxprb"];
const EMPTY_PIXEL_TRACKING_OVERRIDE = {
  websitePixelId: null,
  offlineDatasetId: null,
};

// Staging gate — used to hide work-in-progress UI (currently: the
// "View Top Creatives for Flexible Ads" trigger). Mirrors the pattern in
// pages/Login.jsx: prefer the env var, but fall back to a URL substring
// check so the gate still works on staging deploys with missing env vars
const IS_STAGING =
  import.meta.env.VITE_ENV === "staging" ||
  import.meta.env.VITE_ENV === "dev" ||
  API_BASE_URL.includes("staging") ||
  API_BASE_URL.includes("dev") ||
  (typeof window !== "undefined" &&
    (window.location.hostname.includes("staging.withblip.com") || window.location.hostname.includes("dev.withblip.com")));
const SHOW_DRAFT_UPDATE = false;
const PRE_JOB_RESIZE_TIMEOUT_MS = 2 * 60 * 1000;
const DUPLICATE_AD_SET_TIMEOUT_MS = 90 * 1000;
const META_UNSUPPORTED_TEXT_SEPARATOR_PATTERN = /[\u2028\u2029]/;
const META_UNSUPPORTED_TEXT_SEPARATOR_GLOBAL_PATTERN = /[\u2028\u2029]/g;

function sanitizeMetaAdTextOptions(values) {
  const hasUnsupportedSeparator = values.some((value) => typeof value === "string" && META_UNSUPPORTED_TEXT_SEPARATOR_PATTERN.test(value));

  if (!hasUnsupportedSeparator) return values;

  return values.map((value) => (typeof value === "string" ? value.replace(META_UNSUPPORTED_TEXT_SEPARATOR_GLOBAL_PATTERN, " ") : value));
}

function createTimeoutError(message) {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
}

function withTimeout(promise, timeoutMs, timeoutMessage, signal) {
  let timeoutId;
  let abortHandler;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createTimeoutError(timeoutMessage));
    }, timeoutMs);
  });

  const abortPromise = signal
    ? new Promise((_, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Job cancelled. Some Ads might still have been made.", "AbortError"));
        return;
      }

      abortHandler = () => {
        reject(new DOMException("Job cancelled. Some Ads might still have been made.", "AbortError"));
      };
      signal.addEventListener("abort", abortHandler, { once: true });
    })
    : null;

  return Promise.race(abortPromise ? [promise, timeoutPromise, abortPromise] : [promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
    if (signal && abortHandler) {
      signal.removeEventListener("abort", abortHandler);
    }
  });
}

function formatAdSetEndTime(endTime) {
  const date = new Date(endTime);
  if (Number.isNaN(date.getTime())) return endTime;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAdSetTimingIssue({ selectedAdSets = [], duplicateAdSet, adSets = [], adScheduleEndTime }) {
  const selectedIds = duplicateAdSet ? [duplicateAdSet] : selectedAdSets;
  const selectedAdSetsWithEndTime = selectedIds
    .map((id) => adSets.find((adSet) => adSet.id === id))
    .filter((adSet) => adSet?.end_time)
    .map((adSet) => ({
      adSet,
      endTime: new Date(adSet.end_time).getTime(),
    }))
    .filter(({ endTime }) => Number.isFinite(endTime))
    .sort((a, b) => a.endTime - b.endTime);

  const endedAdSet = selectedAdSetsWithEndTime.find(({ endTime }) => endTime <= Date.now());
  if (endedAdSet) {
    return {
      type: "ended",
      message: `Ad set end date is ${formatAdSetEndTime(endedAdSet.adSet.end_time)}, it has already ended. Select a different ad set`,
    };
  }

  const scheduledEndTime = adScheduleEndTime ? new Date(adScheduleEndTime).getTime() : NaN;
  const adSetEndingBeforeAds = Number.isFinite(scheduledEndTime) ? selectedAdSetsWithEndTime.find(({ endTime }) => scheduledEndTime > endTime) : null;

  if (adSetEndingBeforeAds) {
    return {
      type: "schedule-after-ad-set",
      message: "The ads end date is after the ad sets end date. Change the ad schedule to publish ads",
    };
  }

  return null;
}

const UPLOAD_SOURCE_OPTIONS = [
  {
    id: "local",
    name: "Local PC",
    icon: DesktopIcon,
    fullLabel: "Local PC",
    compactLabel: "Local PC",
  },
  {
    id: "csv",
    name: "CSV Sheet",
    icon: CsvFileIcon,
    fullLabel: "Import CSV Sheet",
    compactLabel: "CSV Sheet",
  },
  {
    id: "drive",
    name: "Google Drive",
    icon: "https://api.withblip.com/googledrive.png",
    fullLabel: "Choose Files from Google Drive",
    compactLabel: "Google Drive",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: DropboxIcon,
    fullLabel: "Choose Files from Dropbox",
    compactLabel: "Dropbox",
  },
  {
    id: "frameio",
    name: "Frame.io",
    icon: FrameIcon,
    iconClass: "h-6 w-6 rounded-sm object-cover",
    dropdownIconClass: "-ml-0.5 h-6 w-6 rounded-sm object-cover",
    fullLabel: "Choose Files from Frame.io",
    compactLabel: "Frame.io",
  },
  {
    id: "instagram",
    name: "Instagram Posts",
    icon: IGColorIcon,
    fullLabel: "Import from Instagram",
    compactLabel: "Instagram",
  },
  {
    id: "meta_library",
    name: "Ads Manager Media Library",
    icon: MetaIcon,
    fullLabel: "Import from Meta",
    compactLabel: "Meta Library",
  },
  {
    id: "drafts",
    name: "Drafts",
    icon: DraftFolderIcon,
    fullLabel: "Open Drafts",
    compactLabel: "Drafts",
  },
];

const useAdCreationProgress = (jobId, isCreatingAds) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [metaData, setMetadata] = useState({});

  const resetProgress = useCallback(() => {
    setProgress(0);
    setMessage("");
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!jobId) {
      setProgress(0);
      setMessage("");
      setStatus("idle");
      return;
    }

    // Reset state for new job
    setProgress(0);
    setMessage("");
    setStatus("idle");

    // Track all cleanup items
    let eventSource = null;
    let retryTimeoutId = null;
    let connectionTimeoutId = null;
    let isSubscribed = true;
    let retryCount = 0;
    let jobNotFoundCount = 0;

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
          setStatus("error");
          setMessage("Connection failed. Please check your internet connection.");
        }
        return;
      }

      retryCount++;
      const delay = Math.min(baseRetryDelay * Math.pow(2, retryCount - 1), maxRetryDelay);

      retryTimeoutId = setTimeout(() => {
        if (isSubscribed) connectSSE();
      }, delay);
    };

    const scheduleJobRetry = () => {
      if (!isSubscribed || jobNotFoundCount >= maxJobNotFoundRetries) {
        if (jobNotFoundCount >= maxJobNotFoundRetries) {
          // console.error('Job not found after maximum attempts - job may not exist');
          setStatus("job-not-found"); // NEW: Specific status instead of 'error'
          setMessage("Job not found. The task may have expired or been cancelled.");
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
            scheduleConnectionRetry("Connection timeout");
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
            if (data.message === "Job not found") {
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
                errorMessages: data.errorMessages, // NEW
                successfulAdNames: data.successfulAdNames,
              });

              // Auto-cleanup on job completion
              if (data.status === "complete" || data.status === "error" || data.status === "partial-success" || data.status === "cancelled") {
                cleanup();
              }
            }
          } catch (err) {
            console.error("Failed to parse SSE message:", err);
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
          scheduleConnectionRetry("Connection error");
        };
      } catch (error) {
        // console.error('Failed to create EventSource:', error);
        if (isSubscribed) {
          setStatus("error");
          setMessage("Failed to initialize progress tracking.");
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
  if (file.isFrameio) return file.frameioId;
  if (file.isMetaLibrary) return file.type === "image" ? file.hash : file.id;
  return file.uniqueId || file.name;
};

const getDraftCreativeKey = (file) => {
  if (file?.draftKey) return file.draftKey;
  return getFileId(file);
};

const isVideoFile = (file) => {
  if (!file) return false;
  const type = file.type || file.mimeType || "";
  if (type === "video") return true;
  if (type.startsWith("video/") || type === "video/quicktime") return true;

  const name = file.name || file.originalname || "";
  return /\.(mov|mp4|avi|webm|mkv|m4v)$/i.test(name);
};

const isGifFile = (file) => {
  if (!file) return false;
  const type = file.type || file.mimeType || "";
  if (type === "image/gif") return true;

  const name = file.name || file.originalname || "";
  return /\.gif$/i.test(name);
};

const isImageFile = (file) => {
  if (!file) return false;
  const type = file.type || file.mimeType || "";
  if (type === "image") return true;
  if (type.startsWith("image/")) return true;

  const name = file.name || file.originalname || "";
  return /\.(jpg|jpeg|png|gif)$/i.test(name);
};

const CATALOGUE_TEMPLATE_VARIABLES = [
  { name: "brand", description: "Brand" },
  { name: "current_price", description: "Current price" },
  { name: "description", description: "Description" },
  { name: "name", description: "Name" },
  { name: "price", description: "Price" },
  { name: "retailer_id", description: "Retailer ID" },
  { name: "url", description: "URL" },
  { name: "custom_label_0", description: "Custom label 0" },
  { name: "custom_label_1", description: "Custom label 1" },
  { name: "custom_label_2", description: "Custom label 2" },
  { name: "custom_label_3", description: "Custom label 3" },
  { name: "custom_label_4", description: "Custom label 4" },
];

function CatalogueVariableField({
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  multiline = false,
  minRows = 1,
  maxRows = 10,
  style,
  type = "text",
}) {
  const [showVariables, setShowVariables] = useState(false);
  const [activeVariableIndex, setActiveVariableIndex] = useState(0);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showVariables &&
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowVariables(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVariables]);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    const cursorPosition = event.target.selectionStart || nextValue.length;
    onValueChange(nextValue);

    const textBeforeCursor = nextValue.substring(0, cursorPosition);
    const lastOpen = textBeforeCursor.lastIndexOf("{{");
    const lastClose = textBeforeCursor.lastIndexOf("}}");
    const insideTemplateToken = lastOpen > lastClose;

    const shouldShowVariables = nextValue[cursorPosition - 1] === "/" && !insideTemplateToken;
    setShowVariables(shouldShowVariables);
    if (shouldShowVariables) {
      setActiveVariableIndex(0);
    }
  };

  const handleKeyDown = (event) => {
    if (!showVariables) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveVariableIndex(
        (currentIndex) => (currentIndex + direction + CATALOGUE_TEMPLATE_VARIABLES.length) % CATALOGUE_TEMPLATE_VARIABLES.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      insertVariable(CATALOGUE_TEMPLATE_VARIABLES[activeVariableIndex].name);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setShowVariables(false);
    }
  };

  const insertVariable = (variableName) => {
    const input = inputRef.current;
    const cursorPosition = input?.selectionStart ?? (value || "").length;
    const textBeforeCursor = (value || "").substring(0, cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    const insertAt = lastSlashIndex >= 0 ? lastSlashIndex : cursorPosition;
    const token = `{{product.${variableName}}}`;
    const nextValue = `${(value || "").substring(0, insertAt)}${token}${(value || "").substring(cursorPosition)}`;

    onValueChange(nextValue);
    setShowVariables(false);

    setTimeout(() => {
      const nextCursorPosition = insertAt + token.length;
      input?.setSelectionRange(nextCursorPosition, nextCursorPosition);
      input?.focus();
    }, 0);
  };

  const commonProps = {
    ref: inputRef,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    disabled,
    className,
    style,
  };

  return (
    <div className="relative w-full space-y-1.5">
      <p className="text-gray-500 text-[12px] leading-5">
        Type <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-xs text-black">/</span>
        to see catalog variables.
      </p>
      {multiline ? <TextareaAutosize {...commonProps} minRows={minRows} maxRows={maxRows} /> : <Input {...commonProps} type={type} />}
      {showVariables && (
        <div ref={menuRef} className="absolute left-0 top-full z-50 mt-1 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <Command
            value={CATALOGUE_TEMPLATE_VARIABLES[activeVariableIndex].name}
            onValueChange={(variableName) => {
              const nextIndex = CATALOGUE_TEMPLATE_VARIABLES.findIndex((variable) => variable.name === variableName);
              if (nextIndex >= 0) {
                setActiveVariableIndex(nextIndex);
              }
            }}
          >
            <CommandList className="max-h-64 outline-none">
              <CommandGroup heading="Product variables">
                {CATALOGUE_TEMPLATE_VARIABLES.map((variable) => (
                  <CommandItem
                    key={variable.name}
                    value={variable.name}
                    onSelect={() => insertVariable(variable.name)}
                    className="cursor-pointer rounded-lg px-2 py-2"
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="text-sm text-gray-800">{variable.description}</span>
                      <span className="shrink-0 font-mono text-xs text-gray-500">{`{{product.${variable.name}}}`}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

const getMimeFromName = (name) => {
  const ext = (name || "").split(".").pop().toLowerCase();
  const mimeMap = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    m4v: "video/x-m4v",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
  };
  return mimeMap[ext] || "application/octet-stream";
};

const VARIANT_COLORS = ["#6b7280", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

const getGroupFileIds = (group) => (Array.isArray(group) ? group : group?.fileIds || []);

const normalizeFileGroups = (groups = []) =>
  groups.map((group) =>
    Array.isArray(group) ? { id: uuidv4(), fileIds: [...group] } : { ...group, id: group.id || uuidv4(), fileIds: [...(group.fileIds || [])] },
  );

const getDisplayFileName = (file) => file?.name || file?.originalName || file?.originalname || file?.title || "Unnamed file";

const buildMediaFileEntries = ({ files = [], driveFiles = [], dropboxFiles = [], frameioFiles = [], importedFiles = [] }) =>
  [
    ...files.map((file) => ({
      id: file.uniqueId || file.name,
      name: getDisplayFileName(file),
    })),
    ...driveFiles.map((file) => ({
      id: file.id,
      name: getDisplayFileName(file),
    })),
    ...(dropboxFiles || []).map((file) => ({
      id: file.dropboxId,
      name: getDisplayFileName(file),
    })),
    ...(frameioFiles || []).map((file) => ({
      id: file.frameioId,
      name: getDisplayFileName(file),
    })),
    ...(importedFiles || []).map((file) => ({
      id: file.type === "image" ? file.hash : file.id,
      name: getDisplayFileName(file),
    })),
  ].filter((file) => file.id && file.name);

const findDuplicateFileNameWarnings = (groups, fileEntriesById) => {
  const warnings = [];

  groups.forEach((groupFileIds, groupIndex) => {
    const filesByName = new Map();

    groupFileIds.forEach((fileId) => {
      const file = fileEntriesById.get(String(fileId));
      if (!file) return;

      const normalizedName = file.name.trim().toLowerCase();
      if (!normalizedName) return;

      const existing = filesByName.get(normalizedName);
      if (existing) {
        existing.count += 1;
      } else {
        filesByName.set(normalizedName, {
          count: 1,
          fileName: file.name,
        });
      }
    });

    filesByName.forEach(({ count, fileName }, normalizedName) => {
      if (count < 2) return;

      warnings.push({
        key: `${groupIndex + 1}-${normalizedName}`,
        groupNumber: groupIndex + 1,
        fileName,
      });
    });
  });

  return warnings;
};

function VariantDot({ variantId, variants }) {
  const idx = variants.findIndex((variant) => variant.id === variantId);
  const color = VARIANT_COLORS[Math.max(0, idx) % VARIANT_COLORS.length];

  return <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: color }} />;
}

const truncateOverviewText = (value, limit = 72) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
};

function OverviewInlineEditor({ value, onSave, label, multiline = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    if (open) setDraft(value || "");
  }, [open, value]);

  const save = () => {
    onSave(draft);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Edit ${label}`}
          className="shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-blue-600 group-hover/overview-value:opacity-100 focus-visible:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={6} className="w-80 rounded-2xl border-gray-200 bg-white p-3 shadow-xl">
        <Label className="text-xs font-medium text-gray-700">Edit {label}</Label>
        {multiline ? (
          <TextareaAutosize
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            minRows={4}
            maxRows={10}
            autoFocus
            className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm leading-5 shadow-sm focus:border-blue-400 focus:outline-none"
          />
        ) : (
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
            }}
            autoFocus
            className="mt-2 h-10 rounded-xl border-gray-300 text-sm"
          />
        )}
        <div className="mt-3 flex justify-end gap-3">
          <button type="button" onClick={() => setOpen(false)} className="bg-transparent p-0 text-xs font-medium text-gray-500 hover:text-gray-800">
            Cancel
          </button>
          <button type="button" onClick={save} className="bg-transparent p-0 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VariantOverviewThumbnail({ file, videoThumbs, fitToWidth = false }) {
  const [localUrl, setLocalUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState(() => {
    const width = Number(file?.width || file?.videoWidth);
    const height = Number(file?.height || file?.videoHeight);
    return width > 0 && height > 0 ? width / height : 1;
  });
  const fileId = file ? getFileId(file) : "";
  const isVideo = isVideoFile(file) || file?.media_type === "VIDEO" || Boolean(file?.video_id);

  useEffect(() => {
    if (!file || isVideo || typeof File === "undefined" || !(file instanceof File)) {
      setLocalUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(file);
    setLocalUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file, isVideo]);

  const src =
    videoThumbs?.[fileId] ||
    file?.pickerThumbnail ||
    file?.thumbnail_url ||
    file?.thumbnailUrl ||
    file?.image_url ||
    file?.previewUrl ||
    file?.preview ||
    file?.media_url ||
    (file?.isMetaLibrary ? file?.url : "") ||
    (file?.isDrive ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w160-h120` : "") ||
    file?.directLink ||
    file?.icon ||
    localUrl ||
    "https://api.withblip.com/thumbnail.jpg";
  const name = getDisplayFileName(file);

  return (
    <div
      className={cn(
        "relative min-h-[72px] min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100",
        fitToWidth ? "w-full" : "h-full w-auto max-w-full",
      )}
      style={{ aspectRatio }}
    >
      <img
        src={src}
        alt={name}
        className="h-full w-full object-contain"
        onLoad={(event) => {
          const nextWidth = event.currentTarget.naturalWidth;
          const nextHeight = event.currentTarget.naturalHeight;
          if (nextWidth > 0 && nextHeight > 0) setAspectRatio(nextWidth / nextHeight);
        }}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "https://api.withblip.com/thumbnail.jpg";
        }}
      />
    </div>
  );
}

function OverviewCopyList({ label, values, onEdit }) {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const populated = (values || [])
    .map((value, sourceIndex) => ({ raw: String(value || ""), display: truncateOverviewText(value), sourceIndex }))
    .filter((value) => Boolean(value.display));
  if (populated.length === 0) return null;

  const toggleExpanded = (index) => {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <div className="space-y-2">
        {populated.map((value) => {
          const isExpanded = expandedItems.has(value.sourceIndex);
          const canExpand = value.raw.trim().length > 72;

          return (
            <div key={`${label}-${value.sourceIndex}`}>
              <div className="group/overview-value flex items-start gap-1">
                <p className="max-w-[18rem] flex-1 whitespace-pre-wrap break-words text-[11px] leading-4 text-gray-700">
                  {isExpanded ? value.raw.trim() : value.display}
                </p>
                {onEdit && (
                  <OverviewInlineEditor
                    value={value.raw}
                    onSave={(nextValue) => onEdit(value.sourceIndex, nextValue)}
                    label={label}
                    multiline
                  />
                )}
              </div>
              {canExpand && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(value.sourceIndex)}
                  className="mt-0.5 bg-transparent p-0 text-[10px] font-medium text-blue-600 shadow-none hover:text-blue-700 hover:underline"
                >
                  {isExpanded ? "View less" : "View more"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const extractFolderId = (url) => {
  const idMatch = url.match(/[-\w]{25,}/);
  return idMatch ? idMatch[0] : null;
};

/**
 * Hook to fetch approved partnership ad partners for a given Instagram account
 */
const usePartnershipAdPartners = (instagramAccountId, pageId) => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPartners = useCallback(async () => {
    // Skip if missing required params
    if (!instagramAccountId || !pageId) {
      setPartners([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/partnership-ads/partners`, {
        params: { instagramAccountId, pageId },
        withCredentials: true,
      });

      // Map to cleaner format
      const approvedPartners = (response.data.data || []).map((partner) => ({
        id: partner.id,
        creatorIgId: partner.creator_ig_id,
        creatorUsername: partner.creator_username,
        creatorFbPageId: partner.creator_fb_page_id,
      }));

      setPartners(approvedPartners);
    } catch (err) {
      setError(err.response?.data?.error || "Re-authenticate the app and approve additional permissions to make partnership ads");
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  }, [instagramAccountId, pageId]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return { partners, isLoading, error, refetch: fetchPartners };
};

const ErrorFileName = ({ adName, fileName }) => {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 50;
  // Older completed jobs only stored the ad name in `fileName`. Keep those
  // readable while showing both values for newly completed jobs.
  const displayName = adName || fileName || "Unknown ad";
  const fullDetails = adName && fileName ? `${displayName} (File Name: ${fileName})` : displayName;
  const needsTruncation = fullDetails.length > LIMIT;
  const display = !needsTruncation || expanded ? fullDetails : fullDetails.slice(0, LIMIT) + "…";
  return (
    <li className="break-words text-[#FF0000] leading-snug">
      {display}
      {needsTruncation && !expanded && (
        <button type="button" onClick={() => setExpanded(true)} className="ml-1 text-[#FF8080] hover:text-[#FF0000] underline underline-offset-2">
          View Full Details
        </button>
      )}
    </li>
  );
};

const CreatedAdName = ({ name }) => {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 50;
  const needsTruncation = name.length > LIMIT;
  const display = !needsTruncation || expanded ? name : `${name.slice(0, LIMIT)}...`;

  return (
    <li className="break-words text-gray-700 leading-snug">
      {display}
      {needsTruncation && !expanded && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(true);
          }}
          className="ml-1 text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          View Full Ad Name
        </button>
      )}
    </li>
  );
};

// --- S3 region detection ---
// Probes each regional bucket once per session via the S3 Transfer Acceleration
// endpoint and caches the fastest. `no-cors` HEAD requests measure round-trip
// without needing CORS config; opaque responses are fine — we only need timing.
const S3_REGION_BUCKETS = {
  "us-east-1": "withblip",
  "eu-west-1": "withblip-eu",
  "ap-southeast-1": "withblip-as",
  "ap-southeast-2": "withblip-au",
};
let _fastestRegionPromise = null;
function detectFastestS3Region() {
  // DEBUG: ?s3region=eu-west-1 (or ap-southeast-1 / ap-southeast-2 / us-east-1) forces a region.
  // Useful for verifying regional buckets work without VPN. Remove or ignore for production traffic.
  if (typeof window !== "undefined") {
    const forced = new URLSearchParams(window.location.search).get("s3region");
    if (forced && S3_REGION_BUCKETS[forced]) {
      return Promise.resolve(forced);
    }
  }
  if (_fastestRegionPromise) return _fastestRegionPromise;
  _fastestRegionPromise = (async () => {
    const results = await Promise.all(
      Object.entries(S3_REGION_BUCKETS).map(async ([region, bucket]) => {
        const url = `https://${bucket}.s3-accelerate.amazonaws.com/?probe=${Date.now()}`;
        const start = performance.now();
        try {
          await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
          return { region, latency: performance.now() - start };
        } catch {
          return { region, latency: Infinity };
        }
      }),
    );
    results.sort((a, b) => a.latency - b.latency);
    return results[0].latency === Infinity ? "us-east-1" : results[0].region;
  })();
  return _fastestRegionPromise;
}

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
  destinationType,
  setDestinationType,
  instantExperienceId,
  setInstantExperienceId,
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
  frameioFiles,
  setFrameioFiles,
  selectedShopDestination,
  setSelectedShopDestination,
  selectedShopDestinationType,
  setSelectedShopDestinationType,
  selectedShopProductCatalogId,
  setSelectedShopProductCatalogId,
  productExtensionProductSetId,
  setProductExtensionProductSetId,
  productExtensionProductCatalogId,
  setProductExtensionProductCatalogId,
  selectedForm,
  setSelectedForm,
  newAdSetName,
  setNewAdSetName,
  launchPaused,
  setLaunchPaused,
  discloseAiMedia,
  setDiscloseAiMedia,
  pixelTrackingOverride,
  setPixelTrackingOverride,
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
  teamId: teamIdProp,
  campaignObjective,
  selectedFiles,
  setSelectedFiles,
  useExistingPosts,
  editAdCreativeMode,
  usePostID,
  setUsePostID,
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
  partnerName,
  setPartnerName,
  partnershipIdentityMode,
  setPartnershipIdentityMode,
  partnershipPrimaryIdentity,
  setPartnershipPrimaryIdentity,
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
  onImportCsv,
  onBeforeMediaClear,
  onAdLaunchInProgressChange,
  onSaveDraft,
  onRestoreDraft,
}) {
  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow";
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`;
  const formDropdownTriggerChrome = `${formFieldChrome} hover:bg-white`;
  const formTextareaChrome =
    "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0";
  const [ctaOpen, setCtaOpen] = useState(false);
  const [ctaSearch, setCtaSearch] = useState("");
  const isFlexLikeAdType = adType === "flexible" || adType === "multi_media";
  const isCatalogueAd = adType === "catalogue";
  const isPlacementCustomizedSingleDescription = enablePlacementCustomization && !isCarouselAd;
  const hasPlacementCustomizationExtraDescriptions = isPlacementCustomizedSingleDescription && descriptions.length > 1;
  const renderDiffMark = (fieldKeys) => (isFormFieldModified?.(fieldKeys) ? <span className="text-red-500 font-semibold">*</span> : null);

  // Local state
  const [showPostSelector, setShowPostSelector] = useState(false);
  const navigate = useNavigate();
  const [openPage, setOpenPage] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState({
    checking: true,
    authenticated: false,
    accessToken: null,
  });

  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderLinkValue, setFolderLinkValue] = useState("");
  const [isImportingFolder, setIsImportingFolder] = useState(false);
  const [pendingCsvDriveImport, setPendingCsvDriveImport] = useState(null);
  const pendingCsvDriveImportRef = useRef(null);
  const [showFrameioConnectDialog, setShowFrameioConnectDialog] = useState(false);
  const [showFrameioConnectHelp, setShowFrameioConnectHelp] = useState(false);
  const pickerInstanceRef = useRef(null);
  const [pickerDialogHeight, setPickerDialogHeight] = useState(650);

  const disposeDrivePicker = useCallback((picker = pickerInstanceRef.current, hideFirst = true) => {
    if (!picker) return;

    if (pickerInstanceRef.current === picker) {
      pickerInstanceRef.current = null;
    }

    if (hideFirst) {
      try {
        picker.setVisible(false);
      } catch {
        // The Picker may already have removed its dialog after pick/cancel.
      }
    }

    try {
      picker.dispose?.();
    } catch {
      // Disposal is best-effort for older Picker API implementations.
    }
  }, []);

  useEffect(
    () => () => {
      disposeDrivePicker();
    },
    [disposeDrivePicker],
  );

  //gogle drive pickers
  const [accessToken, setAccessToken] = useState(null);
  //S3 States
  const [uploadingToS3, setUploadingToS3] = useState(false);

  const [pageSearchValue, setPageSearchValue] = useState("");
  const { isLoggedIn, userId, teamId: authTeamId } = useAuth();
  const teamId = teamIdProp || authTeamId || "";
  const showAdSetNameVariable = AD_SET_NAME_VARIABLE_TEAM_IDS.includes(String(teamId));
  const showPixelTrackingOverride = PIXEL_TRACKING_FORM_ALLOWED_USER_IDS.includes(String(userId));
  const { showMessenger } = useIntercom();
  const [showMetaActionHelp, setShowMetaActionHelp] = useState(false);
  const [openInstagram, setOpenInstagram] = useState(false);
  const [instagramSearchValue, setInstagramSearchValue] = useState("");
  const [isLinkPagesOpen, setIsLinkPagesOpen] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [isQueueingJobs, setIsQueueingJobs] = useState(false);
  const [draftMenuOpen, setDraftMenuOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaveMode, setDraftSaveMode] = useState("save");
  const [draftSaveProgress, setDraftSaveProgress] = useState({ value: 0, message: "" });
  const [failedPreviewUrl, setFailedPreviewUrl] = useState("");
  const [draftUpdateMenuOpen, setDraftUpdateMenuOpen] = useState(false);
  const [draftUpdateOptions, setDraftUpdateOptions] = useState([]);
  const [loadingDraftUpdateOptions, setLoadingDraftUpdateOptions] = useState(false);
  const draftSaveAbortControllerRef = useRef(null);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [isPagesLoading, setIsPagesLoading] = useState(false);
  // const [isPostSelectorOpen, setIsPostSelectorOpen] = useState(false)
  const [linkCustomStates, setLinkCustomStates] = useState({}); // Track which carousel links are custom
  const [instantExperiences, setInstantExperiences] = useState([]);
  const [instantExperiencesLoading, setInstantExperiencesLoading] = useState(false);
  const [instantExperiencesError, setInstantExperiencesError] = useState("");
  const instantExperiencesCacheRef = useRef(new Map());

  //Porgress Trackers
  const [isCreatingAds, setIsCreatingAds] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
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
  const pendingDraftMediaCleanupRef = useRef(new Map());
  const draftMediaCleanupInProgressRef = useRef(false);

  const [preserveMedia, setPreserveMedia] = useState(false);

  useEffect(
    () => () => {
      draftSaveAbortControllerRef.current?.abort();
    },
    [],
  );

  const adLaunchInProgress = uploadingToS3 || isQueueingJobs || isProcessingQueue || Boolean(currentJob) || jobQueue.length > 0;
  useEffect(() => {
    onAdLaunchInProgressChange?.(adLaunchInProgress);
  }, [adLaunchInProgress, onAdLaunchInProgressChange]);

  useEffect(() => {
    return () => onAdLaunchInProgressChange?.(false);
  }, [onAdLaunchInProgressChange]);

  useEffect(() => {
    if (
      isProcessingQueue ||
      currentJob ||
      jobQueue.length > 0 ||
      draftMediaCleanupInProgressRef.current ||
      pendingDraftMediaCleanupRef.current.size === 0
    ) {
      return;
    }

    const pending = [...pendingDraftMediaCleanupRef.current.values()];
    pendingDraftMediaCleanupRef.current.clear();
    draftMediaCleanupInProgressRef.current = true;

    const grouped = new Map();
    pending.forEach((media) => {
      const key = JSON.stringify([media.draftAdAccountId, media.draftId]);
      if (!grouped.has(key)) {
        grouped.set(key, {
          adAccountId: media.draftAdAccountId,
          draftId: media.draftId,
          mediaIds: new Set(),
        });
      }
      grouped.get(key).mediaIds.add(media.draftMediaId);
    });

    Promise.all(
      [...grouped.values()].map(async ({ adAccountId, draftId, mediaIds }) => {
        const result = await cleanupPublishedDraftMedia({
          adAccountId,
          draftId,
          mediaIds: [...mediaIds],
        });
        if (result.failedMediaIds?.length) {
          throw new Error(`Could not remove ${result.failedMediaIds.length} published draft file(s)`);
        }
      }),
    )
      .catch((error) => {
        console.warn("Published ads were created, but draft media cleanup failed:", error);
        toast.warning("Ads were created, but some draft media could not be removed");
      })
      .finally(() => {
        draftMediaCleanupInProgressRef.current = false;
      });
  }, [currentJob, isProcessingQueue, jobQueue.length]);

  const handleLinkMorePages = useCallback(() => {
    setOpenPage(false);
    setOpenInstagram(false);
    setIsLinkPagesOpen(true);
  }, []);
  const handleAddDescriptionsToggle = useCallback(
    (checked) => {
      setAddDescriptions(Boolean(checked));
      if (checked) {
        if (!descriptions.length) setDescriptions([""]);
        return;
      }
      setDescriptions([""]);
    },
    [descriptions.length, setDescriptions],
  );

  const getCatalogueMediaCount = useCallback(
    () => files.length + driveFiles.length + dropboxFiles.length + (frameioFiles?.length || 0) + importedFiles.length,
    [files.length, driveFiles.length, dropboxFiles.length, frameioFiles?.length, importedFiles.length],
  );

  const filterCatalogueImageFiles = useCallback(
    (incomingFiles) => {
      if (!isCatalogueAd) return incomingFiles;

      const incoming = Array.from(incomingFiles || []);
      const rejectedVideos = incoming.filter((file) => isVideoFile(file) || isGifFile(file));
      const rejectedNonImages = incoming.filter((file) => !isVideoFile(file) && !isGifFile(file) && !isImageFile(file));
      const imageFiles = incoming.filter((file) => isImageFile(file) && !isVideoFile(file) && !isGifFile(file));
      if (rejectedVideos.length > 0) {
        toast.error("Catalogue ads support image files only. Videos and GIFs are not supported.");
      }
      if (rejectedNonImages.length > 0) {
        toast.error("Catalogue ads support image files only.");
      }

      return imageFiles;
    },
    [isCatalogueAd],
  );
  const renderErrorSupportLink = () => (
    <p className="mt-2 text-xs font-medium text-red-800">
      Confused by the error?{" "}
      <button type="button" onClick={showMessenger} className="cursor-pointer underline underline-offset-2 hover:text-red-900">
        Chat with us
      </button>{" "}
      for support
    </p>
  );

  // Upload sources config — which upload options to display
  const {
    uploadSources: globalUploadSources,
    setUploadSources: setGlobalUploadSources,
    hasImportedCsv,
    setHasImportedCsv,
    hasSeenCsvImportGuide,
    setHasSeenCsvImportGuide,
  } = useGlobalSettings();
  const [uploadSources, setUploadSourcesLocal] = useState(globalUploadSources);
  const [uploadSourcesDirty, setUploadSourcesDirty] = useState(false);
  const [uploadSourcesOpen, setUploadSourcesOpen] = useState(false);
  const [showCsvImportGuide, setShowCsvImportGuide] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const csvFileInputRef = useRef(null);
  const downloadCsvTemplate = useCallback(async () => {
    const templateUrl = "https://api.withblip.com/csv-variant-import-template.csv";
    try {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error(`Template download failed (${response.status})`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = "csv-variant-import-template.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download CSV template:", error);
      window.open(templateUrl, "_blank", "noopener,noreferrer");
    }
  }, []);
  // Modal for "Get Top Ads For Flex" — only opened when adType === 'flexible'.
  // Imports selected ads' image hashes / video IDs into importedFiles, which
  // the existing flexible-ad launch path then bundles into asset_feed_spec.
  const [flexAdsImportOpen, setFlexAdsImportOpen] = useState(false);

  useEffect(() => {
    if (!uploadSourcesDirty) {
      setUploadSourcesLocal(globalUploadSources);
    }
  }, [globalUploadSources, uploadSourcesDirty]);

  const toggleUploadSource = useCallback(
    (id) => {
      const isBeingEnabled = !uploadSources.includes(id);
      const nextSources = isBeingEnabled ? [...uploadSources, id] : uploadSources.filter((source) => source !== id);
      setUploadSourcesLocal(nextSources);

      if (id === "csv" && isBeingEnabled && !hasSeenCsvImportGuide) {
        // Save this setup choice immediately because the guide replaces/closes
        // the source popover. Future clicks should go straight to the picker.
        setUploadSourcesDirty(false);
        setUploadSourcesOpen(false);
        setGlobalUploadSources(nextSources);
        setHasSeenCsvImportGuide(true);
        setShowCsvImportGuide(true);
        void saveSettings({
          globalSettings: {
            uploadSources: nextSources,
            hasSeenCsvImportGuide: true,
          },
        })
          .then(() => {
            window.dispatchEvent(new Event("globalSettingsUpdated"));
          })
          .catch((err) => {
            console.error("Failed to save CSV upload source:", err);
            toast.error("Failed to save CSV upload source");
          });
        return;
      }

      setUploadSourcesDirty(true);
    },
    [hasSeenCsvImportGuide, setGlobalUploadSources, setHasSeenCsvImportGuide, uploadSources],
  );

  const handleUploadSourcesOpenChange = useCallback(
    async (open) => {
      setUploadSourcesOpen(open);
      if (!open && uploadSourcesDirty) {
        const next = uploadSources;
        setUploadSourcesDirty(false);
        setGlobalUploadSources(next);
        try {
          await saveSettings({ globalSettings: { uploadSources: next } });
          window.dispatchEvent(new Event("globalSettingsUpdated"));
        } catch (err) {
          console.error("Failed to save upload sources:", err);
          toast.error("Failed to save upload sources");
        }
      }
    },
    [uploadSources, uploadSourcesDirty, setGlobalUploadSources],
  );

  const [liveProgress, setLiveProgress] = useState({
    completed: 0,
    succeeded: 0,
    failed: 0,
    total: 0,
    errors: [], // ← ADD
  });

  // const [isCarouselAd, setIsCarouselAd] = useState(false);
  const [applyTextToAllCards, setApplyTextToAllCards] = useState(false);
  const [applyHeadlinesToAllCards, setApplyHeadlinesToAllCards] = useState(false);
  const [addDescriptions, setAddDescriptions] = useState(() => (descriptions || []).some((description) => description !== ""));
  useEffect(() => {
    if ((descriptions || []).some((description) => description !== "")) {
      setAddDescriptions(true);
    }
  }, [descriptions]);
  const showDescriptions = isCarouselAd || addDescriptions;
  const S3_UPLOAD_THRESHOLD = 1 * 1024 * 1024; // 40 MB
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
  const [showVariantOverview, setShowVariantOverview] = useState(false);
  const wasPhoneCallCtaAutoAppliedRef = useRef(false);

  const [activeIgCaptionIndex, setActiveIgCaptionIndex] = useState(0);

  const [activeImportedPostIndex, setActiveImportedPostIndex] = useState(0);
  const [importedPostAdNames, setImportedPostAdNames] = useState({});

  // True while we are showing the PostIDSelector duplication UI (as opposed to
  // the regular creative form fields reached via "Edit Ad Creative"). The
  // editAdCreativeMode flag and its enter/exit handlers live in Home.jsx so the
  // toggle button can sit next to the "Duplicate Existing ads" switch.
  const isDuplicationMode = useExistingPosts && !editAdCreativeMode;

  const getImportedPostKey = (post) => post?.ad_id || post?.post_id || post?.id || "";

  useEffect(() => {
    if (importedPosts.length === 0) {
      if (Object.keys(importedPostAdNames).length > 0) setImportedPostAdNames({});
      if (activeImportedPostIndex !== 0) setActiveImportedPostIndex(0);
    } else if (activeImportedPostIndex >= importedPosts.length) {
      setActiveImportedPostIndex(0);
    }
  }, [importedPosts.length]);

  const formatScheduleLabel = () => {
    if (!adScheduleStartTime && !adScheduleEndTime) return null;
    const fmt = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      return (
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      );
    };
    const parts = [];
    if (adScheduleStartTime) parts.push(`Start: ${fmt(adScheduleStartTime)}`);
    if (adScheduleEndTime) parts.push(`End: ${fmt(adScheduleEndTime)}`);
    return parts.join(" · ");
  };

  const isStartScheduleNotFuture = adScheduleStartTime ? new Date(adScheduleStartTime) <= new Date() : false;

  const isEndScheduleBeforeStart = adScheduleStartTime && adScheduleEndTime ? new Date(adScheduleEndTime) <= new Date(adScheduleStartTime) : false;

  const canShowAdSchedule =
    campaignObjective.length > 0 && campaignObjective.every((obj) => ["OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(obj));

  const scheduleStartMinTime = useMemo(() => {
    if (!showSchedule) {
      return new Date(Date.now() + 5 * 60 * 1000);
    }

    return new Date(Date.now() + 5 * 60 * 1000);
  }, [showSchedule]);
  const userTimeZone = useMemo(() => {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
    return `${Intl.DateTimeFormat().resolvedOptions().timeZone} ${sign}${hours}:${minutes}`;
  }, []);

  useEffect(() => {
    if (!canShowAdSchedule) {
      setShowSchedule(false);
    }
  }, [canShowAdSchedule]);

  // Fetch partners only when toggle is ON (lazy loading)
  const {
    partners: availablePartners,
    isLoading: isLoadingPartners,
    error: partnersError,
    refetch: refetchPartners,
  } = usePartnershipAdPartners(isPartnershipAd ? instagramAccountId : null, isPartnershipAd ? pageId : null);

  // Filter partners based on search
  const filteredPartners = useMemo(() => {
    if (!partnerSearchValue) return availablePartners;
    const searchLower = partnerSearchValue.toLowerCase();
    return availablePartners.filter(
      (partner) => (partner.creatorUsername ?? "").toLowerCase().includes(searchLower) || partner.creatorIgId?.includes(partnerSearchValue),
    );
  }, [availablePartners, partnerSearchValue]);

  // Get selected partner for display
  const selectedPartner = useMemo(() => {
    return availablePartners.find((p) => p.creatorIgId === partnerIgAccountId);
  }, [availablePartners, partnerIgAccountId]);

  // Handle partner selection - sets both IG and FB IDs
  const handlePartnerSelect = (partner) => {
    setPartnerIgAccountId(partner.creatorIgId);
    setPartnerFbPageId(partner.creatorFbPageId);
    setPartnerName?.(partner.creatorUsername || partner.creatorName || "");
    setOpenPartnerSelector(false);
  };

  // Handle partnership toggle
  const handlePartnershipToggle = (checked) => {
    setIsPartnershipAd(checked);
    if (!checked) {
      setPartnerIgAccountId("");
      setPartnerFbPageId("");
      setPartnerName?.("");
    }
  };

  // The partner can only be the primary identity when they have an approved FB
  // page (it goes in object_story_spec.page_id). Without one, lock the primary
  // back to the brand — the partner still rides along as the secondary identity.
  useEffect(() => {
    if (!partnerFbPageId && partnershipPrimaryIdentity === "partner") {
      setPartnershipPrimaryIdentity("brand");
    }
  }, [partnerFbPageId, partnershipPrimaryIdentity, setPartnershipPrimaryIdentity]);

  const refreshPage = useCallback(() => {
    window.location.reload();
  }, []);
  const fileGroupsAsArrays = useMemo(() => fileGroups.map((group) => getGroupFileIds(group)), [fileGroups]);

  const groupedFileIds = useMemo(() => new Set(fileGroups.flatMap((group) => getGroupFileIds(group))), [fileGroups]);

  const liveVariantSnapshot = useMemo(
    () => ({
      headlines,
      descriptions,
      messages,
      link,
      customLink,
      showCustomLink,
      destinationType,
      instantExperienceId,
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
      selectedShopProductCatalogId,
      productExtensionProductSetId,
      productExtensionProductCatalogId,
      selectedForm,
      selectedTemplate,
      isPartnershipAd,
      partnerIgAccountId,
      partnerFbPageId,
      partnerName,
      partnershipIdentityMode,
      partnershipPrimaryIdentity,
      adNameFormulaV2,
      adValues,
      adScheduleStartTime,
      adScheduleEndTime,
      launchPaused,
      discloseAiMedia,
      pixelTrackingOverride,
    }),
    [
      headlines,
      descriptions,
      messages,
      link,
      customLink,
      showCustomLink,
      destinationType,
      instantExperienceId,
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
      selectedShopProductCatalogId,
      productExtensionProductSetId,
      productExtensionProductCatalogId,
      selectedForm,
      selectedTemplate,
      isPartnershipAd,
      partnerIgAccountId,
      partnerFbPageId,
      partnerName,
      partnershipIdentityMode,
      partnershipPrimaryIdentity,
      adNameFormulaV2,
      adValues,
      adScheduleStartTime,
      adScheduleEndTime,
      launchPaused,
      discloseAiMedia,
      pixelTrackingOverride,
    ],
  );

  const getVariantState = useCallback(
    (variantId) => {
      if (variantId === activeVariantId) return liveVariantSnapshot;
      return variants.find((variant) => variant.id === variantId)?.snapshot || null;
    },
    [activeVariantId, liveVariantSnapshot, variants],
  );

  const hasMediaInFormData = useCallback(
    (formData) =>
      formData.adType === "catalogue" ||
      (formData.files?.length || 0) > 0 ||
      (formData.driveFiles?.length || 0) > 0 ||
      (formData.dropboxFiles?.length || 0) > 0 ||
      (formData.frameioFiles?.length || 0) > 0 ||
      (formData.importedPosts?.length || 0) > 0 ||
      (formData.importedFiles?.length || 0) > 0 ||
      (formData.selectedIgOrganicPosts?.length || 0) > 0,
    [],
  );

  const computeAdCount = useCallback(
    (formData) => {
      if (!hasMediaInFormData(formData)) return 0;

      if (formData.adType === "catalogue") {
        const adSetCount = formData.selectedAdSets?.length || 0 || (formData.duplicateAdSet ? 1 : 0);
        const mediaCount =
          (formData.files?.length || 0) +
          (formData.driveFiles?.length || 0) +
          (formData.dropboxFiles?.length || 0) +
          (formData.frameioFiles?.length || 0) +
          (formData.importedFiles?.filter((file) => file.type === "image").length || 0);
        return adSetCount * Math.max(mediaCount, 1);
      }

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
          ...(formData.frameioFiles || []).map((file) => ({ ...file, isFrameio: true })),
          ...formData.importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
        ].filter((file) => !groupedIds.has(getFileId(file))).length;

        return formData.fileGroups.length + ungroupedCount;
      }

      if (formData.adType === "flexible" || formData.adType === "multi_media") {
        return formData.fileGroups.length > 0
          ? formData.fileGroups.length * (formData.selectedAdSets.length || 1)
          : formData.selectedAdSets.length || 1;
      }

      if ((formData.selectedIgOrganicPosts?.length || 0) > 0) {
        return formData.selectedIgOrganicPosts.length * (formData.selectedAdSets.length || 1);
      }

      return (
        formData.files.length +
        formData.driveFiles.length +
        formData.importedFiles.length +
        formData.dropboxFiles.length +
        (formData.frameioFiles?.length || 0)
      );
    },
    [hasMediaInFormData],
  );

  const countFilesForVariant = useCallback(
    (variantId) => {
      const totalMediaCount =
        files.length +
        driveFiles.length +
        dropboxFiles.length +
        (frameioFiles?.length || 0) +
        importedFiles.length +
        importedPosts.length +
        selectedIgOrganicPosts.length;
      if (totalMediaCount === 1) return 1;

      const variantGroups = fileGroups.filter((group) => (groupVariantMap[group.id] || "default") === variantId);
      const allFiles = [
        ...files,
        ...driveFiles.map((file) => ({ ...file, isDrive: true })),
        ...dropboxFiles.map((file) => ({ ...file, isDropbox: true })),
        ...(frameioFiles || []).map((file) => ({ ...file, isFrameio: true })),
        ...importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
      ];

      const ungroupedCount = allFiles.filter((file) => {
        const fileId = getFileId(file);
        if (groupedFileIds.has(fileId)) return false;
        return (fileVariantMap[fileId] || "default") === variantId;
      }).length;

      const importedPostsForVariant = importedPosts.filter((post) => (postVariantMap[`post:${post.id}`] || "default") === variantId).length;
      const igOrganicPostsForVariant = selectedIgOrganicPosts.filter(
        (post) => (postVariantMap[`igpost:${post.source_instagram_media_id}`] || "default") === variantId,
      ).length;
      const postsForVariant = importedPostsForVariant + igOrganicPostsForVariant;

      if (isCarouselAd || enablePlacementCustomization || isFlexLikeAdType) {
        const defaultOnly =
          variantId === "default"
            ? [
              ...files,
              ...driveFiles.map((file) => ({ ...file, isDrive: true })),
              ...dropboxFiles.map((file) => ({ ...file, isDropbox: true })),
              ...(frameioFiles || []).map((file) => ({ ...file, isFrameio: true })),
              ...importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
            ].filter((file) => !groupedFileIds.has(getFileId(file))).length
            : 0;

        return variantGroups.length + (isFlexLikeAdType && fileGroups.length === 0 ? ungroupedCount : defaultOnly) + postsForVariant;
      }

      return ungroupedCount + postsForVariant;
    },
    [
      adType,
      driveFiles,
      dropboxFiles,
      frameioFiles,
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
    ],
  );

  const variantOverviewRows = useMemo(() => {
    const overviewFiles = [
      ...files,
      ...driveFiles.map((file) => ({ ...file, isDrive: true })),
      ...dropboxFiles.map((file) => ({ ...file, isDropbox: true })),
      ...(frameioFiles || []).map((file) => ({ ...file, isFrameio: true })),
      ...importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
    ];
    const fileById = new Map(overviewFiles.map((file) => [String(getFileId(file)), file]));
    const overviewGroups = fileGroups.map((group, index) => ({
      id: Array.isArray(group) ? `group-${index}` : String(group.id),
      index,
      fileIds: getGroupFileIds(group).map(String),
    }));
    const groupedIds = new Set(overviewGroups.flatMap((group) => group.fileIds));
    const totalOverviewMedia = overviewFiles.length + importedPosts.length + selectedIgOrganicPosts.length;

    return variants.map((variant) => {
      const snapshot = getVariantState(variant.id) || {};
      const mediaItems = [];

      if (totalOverviewMedia === 1) {
        const onlyFile = overviewFiles[0] || importedPosts[0] || selectedIgOrganicPosts[0];
        if (onlyFile) mediaItems.push({ label: "Ad 1", files: [onlyFile], isGroup: false });
      } else {
        overviewGroups
          .filter((group) => (groupVariantMap[group.id] || "default") === variant.id)
          .forEach((group) => {
            mediaItems.push({
              label: `Group ${group.index + 1}`,
              files: group.fileIds.map((fileId) => fileById.get(fileId)).filter(Boolean),
              isGroup: true,
            });
          });

        const assignedUngrouped = overviewFiles.filter((file) => {
          const fileId = String(getFileId(file));
          return !groupedIds.has(fileId) && (fileVariantMap[fileId] || "default") === variant.id;
        });
        if ((isCarouselAd || isFlexLikeAdType) && assignedUngrouped.length > 0) {
          mediaItems.push({ label: "Ad", files: assignedUngrouped, isGroup: false });
        } else {
          assignedUngrouped.forEach((file) => mediaItems.push({ label: `Ad ${mediaItems.length + 1}`, files: [file], isGroup: false }));
        }

        importedPosts
          .filter((post) => (postVariantMap[`post:${post.id}`] || "default") === variant.id)
          .forEach((post) => mediaItems.push({ label: `Ad ${mediaItems.length + 1}`, files: [post], isGroup: false }));
        selectedIgOrganicPosts
          .filter((post) => (postVariantMap[`igpost:${post.source_instagram_media_id}`] || "default") === variant.id)
          .forEach((post) => mediaItems.push({ label: `Ad ${mediaItems.length + 1}`, files: [post], isGroup: false }));
      }

      const selectedCampaignIds = Array.isArray(snapshot.selectedCampaign)
        ? snapshot.selectedCampaign
        : snapshot.selectedCampaign
          ? [snapshot.selectedCampaign]
          : [];
      const snapshotAdSets = Array.isArray(snapshot.adSets) ? snapshot.adSets : adSets;
      const campaignNames = selectedCampaignIds.map(
        (campaignId) =>
          campaigns.find((campaign) => String(campaign.id) === String(campaignId))?.name ||
          snapshotAdSets.find((entry) => String(entry.campaignId) === String(campaignId))?.campaignName ||
          campaignId,
      );
      const adSetNames = snapshot.duplicateAdSet
        ? [(snapshot.newAdSetName || "New ad set").trim()]
        : (snapshot.selectedAdSets || []).map(
            (adSetId) => snapshotAdSets.find((entry) => String(entry.id) === String(adSetId))?.name || adSetId,
          );
      const selectedPage = pages.find((page) => String(page.id) === String(snapshot.pageId));
      const selectedInstagram = pages
        .map((page) => page.instagramAccount)
        .find((account) => String(account?.id) === String(snapshot.instagramAccountId));
      const selectedOverviewPartner = availablePartners.find(
        (partner) => String(partner.creatorIgId) === String(snapshot.partnerIgAccountId),
      );

      return {
        id: variant.id,
        name: variant.name,
        campaignNames,
        adSetNames,
        pageName: selectedPage?.name || snapshot.pageId || "—",
        instagramName: selectedInstagram?.username || snapshot.instagramAccountId || "",
        isPartnershipAd: Boolean(snapshot.isPartnershipAd),
        partnerName: snapshot.partnerName
          ? `@${String(snapshot.partnerName).replace(/^@/, "")}`
          : selectedOverviewPartner?.creatorUsername
            ? `@${selectedOverviewPartner.creatorUsername}`
            : snapshot.partnerIgAccountId || "",
        messages: snapshot.messages || [],
        headlines: snapshot.headlines || [],
        descriptions: snapshot.descriptions || [],
        links: (snapshot.link || [])
          .map((value, index) => ({ value, index }))
          .filter((entry) => Boolean(entry.value)),
        cta: snapshot.cta || "LEARN_MORE",
        mediaItems,
      };
    });
  }, [
    adSets,
    availablePartners,
    campaigns,
    driveFiles,
    dropboxFiles,
    fileGroups,
    fileVariantMap,
    files,
    frameioFiles,
    getVariantState,
    groupVariantMap,
    importedFiles,
    importedPosts,
    isCarouselAd,
    isFlexLikeAdType,
    pages,
    postVariantMap,
    selectedIgOrganicPosts,
    variants,
  ]);
  const hasPartnershipVariants = variantOverviewRows.some((row) => row.isPartnershipAd);

  const updateVariantOverviewValue = useCallback(
    (variantId, field, index, value) => {
      const updateIndexedValue = (currentValues = []) => {
        const nextValues = [...currentValues];
        while (nextValues.length <= index) nextValues.push("");
        nextValues[index] = value;
        return nextValues;
      };

      if (variantId === activeVariantId) {
        if (field === "messages") setMessages((current) => updateIndexedValue(current));
        if (field === "headlines") setHeadlines((current) => updateIndexedValue(current));
        if (field === "descriptions") setDescriptions((current) => updateIndexedValue(current));
        if (field === "link") {
          setLink((current) => updateIndexedValue(current));
          setShowCustomLink(true);
          if (index === 0) setCustomLink(value);
        }
        return;
      }

      const currentSnapshot = getVariantState(variantId) || {};
      setVariants((currentVariants) =>
        currentVariants.map((variant) => {
          if (variant.id !== variantId) return variant;

          const nextSnapshot = {
            ...currentSnapshot,
            [field]: updateIndexedValue(currentSnapshot[field]),
          };
          if (field === "link") {
            nextSnapshot.showCustomLink = true;
            if (index === 0) nextSnapshot.customLink = value;
          }

          return { ...variant, snapshot: nextSnapshot };
        }),
      );
    },
    [
      activeVariantId,
      getVariantState,
      setCustomLink,
      setDescriptions,
      setHeadlines,
      setLink,
      setMessages,
      setShowCustomLink,
      setVariants,
    ],
  );

  const captureFormDataAsJob = useCallback(
    (variantId = "default") => {
      const variantState = getVariantState(variantId);
      if (!variantState) return null;

      const variantAdSets = Array.isArray(variantState.adSets) ? variantState.adSets : adSets;
      const variantAdSetName = variantState.duplicateAdSet
        ? (variantState.newAdSetName || "").trim()
        : variantAdSets.find((entry) => String(entry.id) === String((variantState.selectedAdSets || [])[0]))?.name || "";

      const totalMediaCount =
        files.length +
        driveFiles.length +
        dropboxFiles.length +
        (frameioFiles?.length || 0) +
        importedFiles.length +
        importedPosts.length +
        selectedIgOrganicPosts.length;
      const isSingleMediaSplit = totalMediaCount === 1;

      const filterFiles = (items, mapper = (item) => item) =>
        items.filter((item) => {
          if (isSingleMediaSplit) return true;
          const file = mapper(item);
          const fileId = getFileId(file);
          const owningGroup = fileGroups.find((group) => getGroupFileIds(group).includes(fileId));

          if (owningGroup) {
            return (groupVariantMap[owningGroup.id] || "default") === variantId;
          }

          if (isFlexLikeAdType && fileGroups.length > 0) {
            return false;
          }

          if (isCarouselAd || enablePlacementCustomization) {
            return variantId === "default";
          }

          return (fileVariantMap[fileId] || "default") === variantId;
        });

      const variantFiles = filterFiles(files);
      const variantDriveFiles = filterFiles(driveFiles, (file) => ({ ...file, isDrive: true }));
      const variantDropboxFiles = filterFiles(dropboxFiles, (file) => ({ ...file, isDropbox: true }));
      const variantFrameioFiles = filterFiles(frameioFiles || [], (file) => ({ ...file, isFrameio: true }));
      const variantImportedFiles = filterFiles(importedFiles, (file) => ({ ...file, isMetaLibrary: true }));
      const variantFileGroups = fileGroups.filter((group) => (groupVariantMap[group.id] || "default") === variantId);
      const variantImportedPosts = importedPosts.filter(
        (post) => isSingleMediaSplit || (postVariantMap[`post:${post.id}`] || "default") === variantId,
      );
      const variantIgOrganicPosts = selectedIgOrganicPosts.filter(
        (post) => isSingleMediaSplit || (postVariantMap[`igpost:${post.source_instagram_media_id}`] || "default") === variantId,
      );

      const formDescriptions = enablePlacementCustomization
        ? [(variantState.descriptions || [""])[0] || ""]
        : [...(variantState.descriptions || [""])];

      const formData = {
        headlines: [...(variantState.headlines || [""])],
        descriptions: formDescriptions,
        messages: [...(variantState.messages || [""])],
        link: [...(variantState.link || [""])],
        destinationType: variantState.destinationType === "instant_experience" ? "instant_experience" : "website",
        instantExperienceId: variantState.instantExperienceId || "",
        phoneNumber: variantState.phoneNumber || "",
        cta: variantState.cta || "LEARN_MORE",
        files: [...variantFiles],
        driveFiles: [...variantDriveFiles],
        dropboxFiles: [...variantDropboxFiles],
        frameioFiles: [...variantFrameioFiles],
        videoThumbs: { ...videoThumbs },
        thumbnail,
        importedPosts: [...variantImportedPosts],
        importedPostAdNames: { ...importedPostAdNames },
        importedFiles: [...variantImportedFiles],
        selectedIgOrganicPosts: [...variantIgOrganicPosts],
        selectedAdSets: [...(variantState.selectedAdSets || [])],
        duplicateAdSet: variantState.duplicateAdSet || "",
        newAdSetName: variantState.newAdSetName || "",
        pageId: variantState.pageId || "",
        instagramAccountId: variantState.instagramAccountId || "",
        selectedAdAccount: variantState.selectedAdAccount || "",
        selectedCampaign: Array.isArray(variantState.selectedCampaign) ? [...variantState.selectedCampaign] : variantState.selectedCampaign,
        launchPaused: Boolean(variantState.launchPaused),
        discloseAiMedia: Boolean(variantState.discloseAiMedia),
        pixelTrackingOverride: showPixelTrackingOverride
          ? { ...(variantState.pixelTrackingOverride || EMPTY_PIXEL_TRACKING_OVERRIDE) }
          : { ...EMPTY_PIXEL_TRACKING_OVERRIDE },
        adType,
        isCarouselAd,
        enablePlacementCustomization,
        fileGroups: variantFileGroups.map((group) => [...getGroupFileIds(group)]),
        selectedShopDestination: variantState.selectedShopDestination || "",
        selectedShopDestinationType: variantState.selectedShopDestinationType || "",
        selectedShopProductCatalogId: variantState.selectedShopProductCatalogId || "",
        productExtensionProductSetId: variantState.productExtensionProductSetId || "",
        productExtensionProductCatalogId: variantState.productExtensionProductCatalogId || "",
        selectedForm: variantState.selectedForm || null,
        selectedTemplate: variantState.selectedTemplate || "",
        isPartnershipAd: Boolean(variantState.isPartnershipAd),
        partnerIgAccountId: variantState.partnerIgAccountId || "",
        partnerFbPageId: variantState.partnerFbPageId || "",
        partnershipIdentityMode: variantState.partnershipIdentityMode || "dynamic",
        partnershipPrimaryIdentity: variantState.partnershipPrimaryIdentity || "brand",
        adNameFormulaV2: variantState.adNameFormulaV2
          ? {
              ...variantState.adNameFormulaV2,
              selectedTemplate: variantState.selectedTemplate || "",
              adSetNameContext: variantAdSetName,
            }
          : null,
        adValues: variantState.adValues ? JSON.parse(JSON.stringify(variantState.adValues)) : {},
        adScheduleStartTime: variantState.adScheduleStartTime || null,
        adScheduleEndTime: variantState.adScheduleEndTime || null,
        adSets: [...variantAdSets],
        adSetDisplayName: variantState.duplicateAdSet
          ? variantState.newAdSetName || "New Ad Set"
          : (variantState.selectedAdSets || []).length === 1
            ? variantAdSetName || "selected ad set"
            : `${(variantState.selectedAdSets || []).length} adsets`,
      };

      return {
        id: uuidv4(),
        createdAt: Date.now(),
        status: "queued",
        adCount: computeAdCount(formData),
        variantId,
        variantName: variants.find((variant) => variant.id === variantId)?.name || "Default",
        showVariantLabel: false,
        formData,
      };
    },
    [
      adSets,
      adType,
      computeAdCount,
      driveFiles,
      dropboxFiles,
      frameioFiles,
      enablePlacementCustomization,
      fileGroups,
      fileVariantMap,
      files,
      getVariantState,
      groupVariantMap,
      importedFiles,
      importedPosts,
      importedPostAdNames,
      isCarouselAd,
      postVariantMap,
      selectedIgOrganicPosts,
      showPixelTrackingOverride,
      thumbnail,
      variants,
      videoThumbs,
    ],
  );

  const addCompletedJob = useCallback((completedJob) => {
    setCompletedJobs((prev) => {
      const updated = [...prev, completedJob];
      return updated.map((j, i) => (i < updated.length - 3 ? { ...j, formData: null } : j));
    });
  }, []);

  const handleRetryJob = useCallback(
    (job) => {
      const d = job.formData;
      if (!d) return;

      setHeadlines(d.headlines || [""]);
      setDescriptions(d.descriptions || [""]);
      setAddDescriptions((d.descriptions || []).some((description) => description !== ""));
      setMessages(d.messages || [""]);
      setLink(d.link || [""]);
      setDestinationType(d.destinationType === "instant_experience" ? "instant_experience" : "website");
      setInstantExperienceId(d.instantExperienceId || "");
      setPhoneNumber(d.phoneNumber || "");
      setCta(d.cta || "");
      setSelectedAdAccount(d.selectedAdAccount || "");
      setSelectedCampaign(Array.isArray(d.selectedCampaign) ? d.selectedCampaign : []);
      setSelectedAdSets(d.selectedAdSets || []);
      setDuplicateAdSet(d.duplicateAdSet || "");
      setNewAdSetName(d.newAdSetName || "");
      setPageId(d.pageId || "");
      setInstagramAccountId(d.instagramAccountId || "");

      setFiles(d.files || []);
      setDriveFiles(d.driveFiles || []);
      setDropboxFiles(d.dropboxFiles || []);
      setFrameioFiles(d.frameioFiles || []);
      setImportedPosts(d.importedPosts || []);
      setImportedFiles(d.importedFiles || []);
      setSelectedIgOrganicPosts(d.selectedIgOrganicPosts || []);
      setVideoThumbs(d.videoThumbs || {});
      setThumbnail(d.thumbnail || null);

      setVariants([{ id: "default", name: "Default", snapshot: null }]);
      setActiveVariantId("default");
      setFileVariantMap({});
      setGroupVariantMap({});
      setPostVariantMap({});
      setAdType(d.adType || "regular");
      setIsCarouselAd(d.isCarouselAd || false);
      setEnablePlacementCustomization(d.enablePlacementCustomization || false);
      setFileGroups(normalizeFileGroups(d.fileGroups || []));
      setSelectedFiles(new Set());
      setLaunchPaused(d.launchPaused || false);
      setDiscloseAiMedia(Boolean(d.discloseAiMedia));
      setPixelTrackingOverride(d.pixelTrackingOverride || EMPTY_PIXEL_TRACKING_OVERRIDE);

      setSelectedShopDestination(d.selectedShopDestination || "");
      setSelectedShopDestinationType(d.selectedShopDestinationType || "");
      setSelectedShopProductCatalogId(d.selectedShopProductCatalogId || "");
      setProductExtensionProductSetId(d.productExtensionProductSetId || "");
      setProductExtensionProductCatalogId(d.productExtensionProductCatalogId || "");
      setSelectedForm(d.selectedForm || null);
      setSelectedTemplate(d.selectedTemplate || "");
      setIsPartnershipAd(Boolean(d.isPartnershipAd));
      setPartnerIgAccountId(d.partnerIgAccountId || "");
      setPartnerFbPageId(d.partnerFbPageId || "");
      setPartnershipIdentityMode(d.partnershipIdentityMode || "dynamic");
      setPartnershipPrimaryIdentity(d.partnershipPrimaryIdentity || "brand");
      setAdScheduleStartTime(d.adScheduleStartTime || null);
      setAdScheduleEndTime(d.adScheduleEndTime || null);

      if (d.adNameFormulaV2) setAdNameFormulaV2(d.adNameFormulaV2);

      setCompletedJobs((prev) => prev.filter((j) => j.id !== job.id));

      toast.success("Form restored — review and resubmit when ready.");
    },
    [
      setActiveVariantId,
      setAdNameFormulaV2,
      setAdScheduleEndTime,
      setAdScheduleStartTime,
      setAdType,
      setCta,
      setDescriptions,
      setDestinationType,
      setDiscloseAiMedia,
      setDriveFiles,
      setDropboxFiles,
      setFrameioFiles,
      setDuplicateAdSet,
      setEnablePlacementCustomization,
      setFileGroups,
      setFileVariantMap,
      setFiles,
      setGroupVariantMap,
      setHeadlines,
      setImportedFiles,
      setImportedPosts,
      setInstagramAccountId,
      setInstantExperienceId,
      setIsCarouselAd,
      setIsPartnershipAd,
      setLaunchPaused,
      setLink,
      setMessages,
      setNewAdSetName,
      setPageId,
      setPartnerFbPageId,
      setPartnerIgAccountId,
      setPartnershipIdentityMode,
      setPartnershipPrimaryIdentity,
      setPhoneNumber,
      setPixelTrackingOverride,
      setPostVariantMap,
      setSelectedAdAccount,
      setSelectedAdSets,
      setSelectedCampaign,
      setSelectedFiles,
      setSelectedForm,
      setSelectedIgOrganicPosts,
      setSelectedShopDestination,
      setSelectedShopDestinationType,
      setSelectedTemplate,
      setThumbnail,
      setVariants,
      setVideoThumbs,
    ],
  );

  const adLimitWarning = useMemo(() => {
    if (selectedAdSets.length === 0) return null;

    // Calculate how many ads this job will create per ad set
    let newAdsPerAdSet = 0;

    if (importedPosts.length > 0) {
      newAdsPerAdSet = importedPosts.length;
    } else if (isCarouselAd) {
      newAdsPerAdSet = fileGroups.length > 0 ? fileGroups.length : 1;
    } else if (enablePlacementCustomization) {
      const groupedFileIds = new Set(fileGroupsAsArrays.flat());
      const ungroupedCount = [
        ...files,
        ...driveFiles.map((f) => ({ ...f, isDrive: true })),
        ...(dropboxFiles || []).map((f) => ({ ...f, isDropbox: true })),
        ...(frameioFiles || []).map((f) => ({ ...f, isFrameio: true })),
        ...importedFiles.map((f) => ({ ...f, isMetaLibrary: true })),
      ].filter((f) => {
        const id = f.isMetaLibrary
          ? f.type === "image"
            ? f.hash
            : f.id
          : f.isDropbox
            ? f.dropboxId
            : f.isFrameio
              ? f.frameioId
              : f.isDrive
                ? f.id
                : f.uniqueId || f.name;
        return !groupedFileIds.has(id);
      }).length;
      // ungrouped files pair up as placement groups of 2
      newAdsPerAdSet = fileGroups.length + Math.ceil(ungroupedCount / 2);
    } else if (isFlexLikeAdType) {
      newAdsPerAdSet = fileGroups.length > 0 ? fileGroups.length : 1;
    } else if (selectedIgOrganicPosts.length > 0) {
      newAdsPerAdSet = selectedIgOrganicPosts.length;
    } else {
      newAdsPerAdSet = files.length + driveFiles.length + importedFiles.length + (dropboxFiles?.length || 0) + (frameioFiles?.length || 0);
    }

    // Find any ad set that would exceed 50
    const overLimitAdSets = selectedAdSets
      .map((id) => adSets.find((a) => a.id === id))
      .filter((adset) => adset && (adset.totalAds || 0) + newAdsPerAdSet > 50);

    if (overLimitAdSets.length === 0) return null;

    return overLimitAdSets.map((a) => a.name || a.id);
  }, [
    selectedAdSets,
    adSets,
    importedPosts,
    isCarouselAd,
    fileGroups,
    fileGroupsAsArrays,
    enablePlacementCustomization,
    files,
    driveFiles,
    dropboxFiles,
    frameioFiles,
    importedFiles,
    adType,
    isFlexLikeAdType,
    selectedIgOrganicPosts,
  ]);

  // Add this helper function
  // Whatever your uploadChunkWithRetry looks like, add signal:
  async function uploadChunkWithRetry(url, chunk, contentType, partNumber, maxRetries = 3, signal = null) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      try {
        return await axios.put(url, chunk, {
          headers: { "Content-Type": contentType },
          signal, // This makes axios reject immediately on abort
        });
      } catch (error) {
        if (axios.isCancel(error) || error.name === "AbortError" || signal?.aborted) {
          throw new DOMException("Cancelled", "AbortError");
        }
        if (attempt === maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  const uploadToS3 = async (file, onChunkUploaded, uniqueId, maxUploadRetries = 2, signal = null, retryUploadLimit = null) => {
    // Validate inputs
    if (!file) {
      console.error("❌ FATAL: No file provided to uploadToS3");
      throw new Error("No file provided for upload");
    }

    if (!file.name) {
      console.error("❌ FATAL: File has no name property:", file);
      throw new Error("File missing name property");
    }

    if (!file.type) {
      console.error("❌ FATAL: File has no type property:", file);
      throw new Error("File missing type property");
    }

    if (typeof file.size !== "number") {
      console.error("❌ FATAL: File has invalid size:", {
        size: file.size,
        sizeType: typeof file.size,
      });
      throw new Error("File missing or invalid size property");
    }

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    let lastError = null;

    // Detect fastest region once per session; cached after first call.
    const region = await detectFastestS3Region();

    const runUploadAttempt = async (uploadAttempt) => {
      let uploadId = null;
      let s3Key = null;

      try {
        const startPayload = {
          fileName: file.name,
          fileType: file.type,
          region,
        };

        const startResponse = await axios.post(`${API_BASE_URL}/auth/s3/start-upload`, startPayload, { withCredentials: true, signal });

        uploadId = startResponse.data.uploadId;
        s3Key = startResponse.data.key;

        if (!uploadId || !s3Key) {
          console.error("❌ Invalid start-upload response:", startResponse.data);
          throw new Error("Invalid response from start-upload endpoint");
        }

        const urlsPayload = {
          key: s3Key,
          uploadId: uploadId,
          parts: totalChunks,
          region,
        };

        const urlsResponse = await axios.post(`${API_BASE_URL}/auth/s3/get-upload-urls`, urlsPayload, { withCredentials: true, signal });

        const presignedUrls = urlsResponse.data.parts;

        if (!presignedUrls || !Array.isArray(presignedUrls)) {
          console.error("❌ Invalid presigned URLs response:", urlsResponse.data);
          throw new Error("Invalid presigned URLs response");
        }

        let uploadedChunksCount = 0;
        const chunkConcurrency = uploadAttempt > 1 ? 1 : 5;
        const limit = pLimit(chunkConcurrency);

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

              const cleanEtag = etag.replace(/"/g, "");
              return { PartNumber: partNumber, ETag: cleanEtag };
            } catch (chunkError) {
              console.error(`❌ Error uploading chunk ${partNumber}:`, {
                error: chunkError.message,
                status: chunkError.response?.status,
                statusText: chunkError.response?.statusText,
                responseData: chunkError.response?.data,
              });
              throw chunkError;
            }
          });
        });

        const completedParts = await Promise.all(uploadPromises);

        const completePayload = {
          key: s3Key,
          uploadId: uploadId,
          parts: completedParts,
          region,
        };

        let completeResponse;
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            completeResponse = await axios.post(`${API_BASE_URL}/auth/s3/complete-upload`, completePayload, { withCredentials: true, signal });
            break;
          } catch (error) {
            if (attempt === 5) {
              throw error;
            }
            const delay = 2000 * Math.pow(2, attempt - 1);

            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        const result = {
          name: file.name,
          type: file.type,
          size: file.size,
          s3Url: completeResponse.data.publicUrl,
          isS3Upload: true,
          uniqueId: uniqueId,
        };

        return result;
      } catch (error) {
        lastError = error;

        if (axios.isCancel(error) || error.name === "AbortError" || signal?.aborted) {
          if (uploadId && s3Key) {
            try {
              await axios.post(`${API_BASE_URL}/auth/s3/abort-upload`, { key: s3Key, uploadId: uploadId, region }, { withCredentials: true });
            } catch (abortError) {
              console.error("Failed to abort S3 upload:", abortError.message);
            }
          }

          const cancelError = new DOMException(`Upload cancelled for ${file.name}`, "AbortError");
          throw cancelError;
        }

        // Abort the current upload before retrying
        if (uploadId && s3Key) {
          try {
            await axios.post(`${API_BASE_URL}/auth/s3/abort-upload`, { key: s3Key, uploadId: uploadId, region }, { withCredentials: true });
          } catch (abortError) {
            console.error("❌ Failed to abort upload:", abortError.message);
          }
        }

        // If not the last attempt, wait before retrying
        if (uploadAttempt < maxUploadRetries) {
          const delay = 3000 * uploadAttempt;

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };

    // Retry loop for the entire upload process
    for (let uploadAttempt = 1; uploadAttempt <= maxUploadRetries; uploadAttempt++) {
      const uploadResult =
        uploadAttempt > 1 && retryUploadLimit ? await retryUploadLimit(() => runUploadAttempt(uploadAttempt)) : await runUploadAttempt(uploadAttempt);

      if (uploadResult) {
        return uploadResult;
      }
    }

    // All retries exhausted
    console.error("❌ === S3 UPLOAD FAILED AFTER ALL RETRIES ===");
    console.error("❌ Final error details:", {
      fileName: file.name,
      error: lastError?.message,
      status: lastError?.response?.status,
      statusText: lastError?.response?.statusText,
      responseData: lastError?.response?.data,
      stack: lastError?.stack,
    });

    throw new Error(`Failed to upload ${file.name} to S3 after ${maxUploadRetries} attempts: ${lastError?.message}`);
  };

  async function uploadDriveFileToS3(file, maxRetries = 3, signal = null) {
    // supportsAllDrives=true so files living in a Shared Drive can be downloaded too.
    const driveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/upload-from-drive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            driveFileUrl: driveDownloadUrl,
            fileName: file.name,
            mimeType: file.mimeType,
            size: file.size,
          }),
          signal,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "S3 upload failed");

        // Success! Return the result
        return {
          ...file,
          s3Url: data.s3Url,
          isS3Upload: true,
        };
      } catch (error) {
        if (axios.isCancel(error) || error.name === "AbortError" || signal?.aborted) {
          throw new DOMException(`Upload cancelled for ${file.name}`, "AbortError");
        }
        if (attempt === maxRetries) {
          throw new Error(`S3 upload failed after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        // console.log(`Upload attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async function uploadDropboxFileToS3(file, maxRetries = 3, signal = null) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/upload-from-dropbox`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fileId: file.dropboxId,
            fileName: file.name,
            mimeType: file.mimeType || getMimeFromName(file.name),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "S3 upload failed");

        return {
          ...file,
          s3Url: data.s3Url,
          isS3Upload: true,
        };
      } catch (error) {
        if (axios.isCancel(error) || error.name === "AbortError" || signal?.aborted) {
          throw new DOMException(`Upload cancelled for ${file.name}`, "AbortError");
        }

        if (attempt === maxRetries) {
          throw new Error(`Dropbox S3 upload failed after ${maxRetries} attempts: ${error.message}`);
        }
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async function uploadFrameioFileToS3(file, maxRetries = 3, signal = null) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/upload-from-frameio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountId: file.frameioAccountId,
            fileId: file.frameioId,
            fileName: file.name,
            mimeType: file.mimeType || getMimeFromName(file.name),
          }),
          signal,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "S3 upload failed");

        return {
          ...file,
          s3Url: data.s3Url,
          isS3Upload: true,
        };
      } catch (error) {
        if (axios.isCancel(error) || error.name === "AbortError" || signal?.aborted) {
          throw new DOMException(`Upload cancelled for ${file.name}`, "AbortError");
        }
        if (attempt === maxRetries) {
          throw new Error(`Frame.io S3 upload failed after ${maxRetries} attempts: ${error.message}`);
        }
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
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
    { value: "SEE_DETAILS", label: "See Details" },
    { value: "LISTEN_NOW", label: "Listen Now" },
    { value: "WATCH_MORE", label: "Watch More" },
    { value: "GET_QUOTE", label: "Get Quote" },
  ];

  const selectedCtaLabel = ctaOptions.find((option) => option.value === cta)?.label;
  const lowerCtaSearch = ctaSearch.toLowerCase();
  const filteredCtaOptions = ctaSearch ? ctaOptions.filter((option) => option.label.toLowerCase().includes(lowerCtaSearch)) : ctaOptions;

  const handleCtaSelect = (value) => {
    setCta(value);
    setCtaOpen(false);
    setCtaSearch("");
  };

  const availableLinks = adAccountSettings?.links || [];
  const defaultLink = availableLinks.find((l) => l.isDefault) || availableLinks[0];
  const isTemplateLinkSyncUser = String(userId || "") === TEMPLATE_LINK_SYNC_USER_ID;

  useEffect(() => {
    if (!isTemplateLinkSyncUser || !selectedTemplate || !defaultTemplateName || availableLinks.length === 0) return;

    const defaultUrl = defaultLink?.url || "";
    const syncedUrl =
      selectedTemplate === defaultTemplateName ? defaultUrl : availableLinks.find((linkObj) => linkObj?.url && linkObj.url !== defaultUrl)?.url;
    if (!syncedUrl) return;

    setShowCustomLink(false);
    setCustomLink("");
    setLink((prevLinks) => {
      const currentLinks = Array.isArray(prevLinks) && prevLinks.length > 1 ? prevLinks : [prevLinks?.[0] || ""];
      const nextLinks = currentLinks.length > 1 ? currentLinks.map(() => syncedUrl) : [syncedUrl];
      return JSON.stringify(currentLinks) === JSON.stringify(nextLinks) ? prevLinks : nextLinks;
    });
    setLinkCustomStates({});
  }, [availableLinks, defaultLink, defaultTemplateName, isTemplateLinkSyncUser, selectedTemplate, setCustomLink, setLink, setShowCustomLink]);

  const filteredPages = useMemo(
    () => pages.filter((page) => page.name.toLowerCase().includes(pageSearchValue.toLowerCase())),
    [pages, pageSearchValue],
  );

  const filteredInstagramAccounts = useMemo(() => {
    // Flatten each page's primary IG account plus any hardcoded extras
    // (additionalInstagramAccounts). Wrap each as { instagramAccount } so the
    // render loop below can keep reading `item.instagramAccount` unchanged.
    const seen = new Set();
    return pages
      .flatMap((page) => [...(page.instagramAccount ? [page.instagramAccount] : []), ...(page.additionalInstagramAccounts || [])])
      .filter((acct) => {
        if (!acct?.id || seen.has(acct.id)) return false;
        seen.add(acct.id);
        return true;
      })
      .filter((acct) => acct.username?.toLowerCase().includes(instagramSearchValue.toLowerCase()))
      .map((instagramAccount) => ({ instagramAccount }));
  }, [pages, instagramSearchValue]);
  const hasPages = pages.length > 0;
  const hasInstagramAccounts = pages.some((page) => page.instagramAccount || page.additionalInstagramAccounts?.length);

  const refreshPages = async () => {
    setIsLoading(true);
    setIsPagesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/fetch-pages`, {
        credentials: "include",
      });

      const data = await res.json();

      if (data.pages) {
        toast.success("Pages refreshed successfully!");
        setPages(data.pages);

        // ✅ Retain selected page and IG account if still valid
        const updatedPage = data.pages.find((p) => p.id === pageId);
        const updatedInstagram = data.pages
          .flatMap((p) => [...(p.instagramAccount ? [p.instagramAccount] : []), ...(p.additionalInstagramAccounts || [])])
          .find((acct) => acct.id === instagramAccountId);

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

    handleCreateAd(jobToProcess).catch((err) => {
      // Don't treat cancellation as a critical error
      if (err.name === "AbortError" || axios.isCancel(err)) {
        const cancelledJob = {
          id: jobToProcess.id,
          message: "Job cancelled.",
          completedAt: Date.now(),
          status: "cancelled",
          formData: jobToProcess.formData,
        };
        addCompletedJob(cancelledJob);
        setJobQueue((prev) => prev.slice(1));
        setCurrentJob(null);
        setIsProcessingQueue(false);
        setIsCancelling(false); // <-- AND HERE

        return;
      }

      const failedJob = {
        id: jobToProcess.id,
        message: `Job Failed: ${err.message || "An initialization error occurred."}`,
        completedAt: Date.now(),
        status: "error",
        formData: jobToProcess.formData,
      };
      addCompletedJob(failedJob);
      setJobQueue((prev) => prev.slice(1));
      setCurrentJob(null);
      setIsProcessingQueue(false);
      setIsCancelling(false); // <-- HERE
    });
  }, [jobQueue, isProcessingQueue, resetProgress]);

  useEffect(() => {
    if (!isProcessingQueue || !currentJob) {
      return; // Do nothing if a job isn't active
    }

    // Guard clause to ignore stale status after a reset.
    if (status === "idle") {
      return;
    }

    // Only act on the final states reported by the SSE hook
    if (status === "complete" || status === "partial-success" || status === "error" || status === "job-not-found" || status === "cancelled") {
      if (status === "complete") {
        // Fix: Handle multiple adsets properly
        const selectedAdSetIds = currentJob.formData.selectedAdSets;
        let adSetDisplayText;
        if (currentJob.formData.duplicateAdSet) {
          // New adset creation case
          adSetDisplayText = currentJob.formData.newAdSetName || "New Adset";
        } else {
          // Existing adsets case
          const selectedAdSetIds = currentJob.formData.selectedAdSets;
          if (selectedAdSetIds.length === 1) {
            const adSet = adSets.find((a) => a.id === selectedAdSetIds[0]);
            adSetDisplayText = adSet?.name || "selected adset";
          } else {
            adSetDisplayText = `${selectedAdSetIds.length} adsets`;
          }
        }

        const completedJob = {
          id: currentJob.id,
          message: `${currentJob.adCount || 1} Ad${currentJob.adCount !== 1 ? "s" : ""} successfully posted to ${currentJob.formData.adSetDisplayName}`,
          completedAt: Date.now(),
          status: "success",
          selectedAdSets: currentJob.formData.selectedAdSets, // ADD THIS
          selectedAdAccount: currentJob.formData.selectedAdAccount, // ADD THIS
          successfulAdNames: metaData.successfulAdNames || [],
        };
        // setCompletedJobs(prev => [...prev, completedJob]);
        addCompletedJob(completedJob);
      } else if (status === "partial-success") {
        const completedJob = {
          id: currentJob.id,
          message: trackedMessage,
          completedAt: Date.now(),
          status: "partial-success",
          successCount: metaData.successCount,
          failureCount: metaData.failureCount,
          totalCount: metaData.totalCount,
          errorMessages: metaData.errorMessages,
          successfulAdNames: metaData.successfulAdNames || [],
          selectedAdSets: currentJob.formData.selectedAdSets,
          selectedAdAccount: currentJob.formData.selectedAdAccount,
          formData: currentJob.formData,
        };
        addCompletedJob(completedJob);
        toast.warning(trackedMessage);
      } else if (status === "job-not-found") {
        const failedJob = {
          id: currentJob.id,
          message: `Job timed out. Refresh page to try again`,
          completedAt: Date.now(),
          status: "retry",
          jobData: currentJob,
          formData: currentJob.formData,
        };
        addCompletedJob(failedJob);
      } else if (status === "cancelled") {
        if (isInPromisePhase.current) {
          return; // Let the promise phase handle it
        }

        const cancelledJob = {
          id: currentJob.id,
          message: trackedMessage || "Job cancelled. Some Ads might still have been made.",
          completedAt: Date.now(),
          status: "cancelled",
          successCount: metaData.successCount,
          failureCount: metaData.failureCount,
          totalCount: metaData.totalCount,
          errorMessages: metaData.errorMessages,
          successfulAdNames: metaData.successfulAdNames || [],
          selectedAdSets: currentJob.formData.selectedAdSets,
          selectedAdAccount: currentJob.formData.selectedAdAccount,
          formData: currentJob.formData,
        };
        addCompletedJob(cancelledJob);
      } else {
        const requiresMetaAction = metaData.errorMessages?.some((item) => item.errorCode === META_AD_CREATION_ACTION_REQUIRED);
        const failedJob = {
          id: currentJob.id,
          message: requiresMetaAction ? META_ACTION_REQUIRED_MESSAGE : `Job Failed: ${trackedMessage || "An unknown error occurred."}`,
          completedAt: Date.now(),
          status: "error",
          successCount: metaData.successCount,
          failureCount: metaData.failureCount,
          totalCount: metaData.totalCount,
          errorMessages: metaData.errorMessages,
          successfulAdNames: metaData.successfulAdNames || [],
          selectedAdSets: currentJob.formData.selectedAdSets,
          selectedAdAccount: currentJob.formData.selectedAdAccount,
          formData: currentJob.formData,
        };
        addCompletedJob(failedJob);
        toast.error(`Job failed: ${trackedMessage || "An unknown error occurred."}`);
      }

      // The job is finished. Clean up and advance to the next one.
      setShowCompletedView(true);
      setJobQueue((prev) => prev.slice(1));
      setCurrentJob(null);
      setIsProcessingQueue(false);
      setIsCancelling(false);
    }
  }, [status, isProcessingQueue, currentJob]);

  const handleTemplateSelect = useCallback(
    (templateName) => {
      const template = copyTemplates[templateName];
      if (!template) return;

      // Loading a template is an explicit user action. Do not derive the copy from
      // selectedTemplate in an effect: variant hydration restores both the selected
      // template and independently edited copy, and that effect would overwrite the
      // restored edits with the template's saved values.
      setSelectedTemplate(templateName);
      setMessages([...(template.primaryTexts || [""])]);
      setHeadlines([...(template.headlines || [""])]);
      setDescriptions([...(template.descriptions || [""])]);
      setAddDescriptions((template.descriptions || []).some((description) => description !== ""));
    },
    [copyTemplates, setDescriptions, setHeadlines, setMessages, setSelectedTemplate],
  );

  useEffect(() => {
    if (!isCarouselAd) return;
    // Carousel "Primary Text" is a single input, so keep one description value in state.
    if (descriptions.length !== 1) {
      setDescriptions([descriptions[0] || ""]);
    }
  }, [isCarouselAd, descriptions]);

  useEffect(() => {
    if (!isCatalogueAd) return;
    if (messages.length > 1) setMessages([messages[0] || ""]);
    if (headlines.length > 1) setHeadlines([headlines[0] || ""]);
    if (descriptions.length > 1) setDescriptions([descriptions[0] || ""]);
  }, [descriptions, headlines, isCatalogueAd, messages, setDescriptions, setHeadlines, setMessages]);

  // Drive Picker setup
  useEffect(() => {
    // Check Google auth status when component mounts
    const checkGoogleAuth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/google/status`, { withCredentials: true });

        setGoogleAuthStatus({
          checking: false,
          authenticated: response.data.authenticated,
          accessToken: response.data.accessToken,
        });

        // ✅ If just logged in, open picker automatically
        if (response.data.authenticated && window.location.search.includes("googleAuth=success")) {
          openPicker(response.data.accessToken);
          // Clean up the URL so it doesn't stay ?googleAuth=success
          const url = new URL(window.location);
          url.searchParams.delete("googleAuth");
          window.history.replaceState({}, document.title, url.pathname);
        }
      } catch (error) {
        setGoogleAuthStatus({
          checking: false,
          authenticated: false,
          accessToken: null,
        });
      }
    };

    checkGoogleAuth();
  }, []);

  const finalizeCsvDriveGroups = useCallback(
    (fileVariantAssignments, importedFileIds) => {
      if (adType !== "regular") return;

      const importedIds = new Set(importedFileIds || []);
      const fileIdsByVariant = {};
      Object.entries(fileVariantAssignments || {}).forEach(([fileId, variantId]) => {
        if (!importedIds.has(fileId)) return;
        if (!fileIdsByVariant[variantId]) fileIdsByVariant[variantId] = [];
        fileIdsByVariant[variantId].push(fileId);
      });

      const autoGroups = [];
      const groupVariantAssignments = {};
      Object.entries(fileIdsByVariant).forEach(([variantId, fileIds]) => {
        if (fileIds.length < 2) return;
        const groupId = uuidv4();
        autoGroups.push({ id: groupId, fileIds: [...fileIds] });
        if (variantId !== "default") groupVariantAssignments[groupId] = variantId;
      });

      if (autoGroups.length === 0) return;
      setEnablePlacementCustomization(true);
      setFileGroups((prev) => [...prev, ...autoGroups]);
      if (Object.keys(groupVariantAssignments).length > 0) {
        setGroupVariantMap((prev) => ({ ...prev, ...groupVariantAssignments }));
      }
    },
    [adType, setEnablePlacementCustomization, setFileGroups, setGroupVariantMap],
  );

  // 4. Updated createPicker with folder navigation support
  const createPicker = useCallback(
    (token, initialFolderId = null, csvDriveImport = null) => {
      // Folder navigation requires a newly configured DocsView. Fully dispose the
      // previous Picker so it cannot leave a stale, absolutely positioned dialog
      // behind when the replacement is opened.
      disposeDrivePicker();

      const mimeTypes = [
        "application/vnd.google-apps.folder",
        "image/jpeg",
        "image/png",
        "image/gif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
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
        mainView = new google.picker.DocsView().setIncludeFolders(true).setMimeTypes(mimeTypes).setSelectFolderEnabled(false);
      }

      const myFolders = new google.picker.DocsView().setOwnedByMe(true).setIncludeFolders(true).setMimeTypes(mimeTypes).setSelectFolderEnabled(false);

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

      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const pickerWidth = Math.floor(Math.min(1051, Math.max(566, viewportWidth - 32)));
      // Reserve enough space above the dialog for the quick-navigation panel
      // (which is taller when stacked).
      const pickerVerticalReserve = viewportWidth < 640 ? 190 : 152;
      const pickerHeight = Math.floor(Math.min(620, Math.max(350, viewportHeight - pickerVerticalReserve * 2 - 24)));
      setPickerDialogHeight(pickerHeight);
      setShowFolderInput(true);

      const pickerBuilder = new google.picker.PickerBuilder()
        .setSize(pickerWidth, pickerHeight)
        .setOAuthToken(token)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
        .hideTitleBar()
        .setAppId(102886794705)
        .setCallback((data) => {
          if (data.action === "picked") {
            const selected = data.docs.map((doc) => {
              // Safely grab the Picker's thumbnail if it exists
              const thumb = doc.thumbnails && doc.thumbnails.length > 0 ? doc.thumbnails[doc.thumbnails.length - 1].url : null;

              return {
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes,
                accessToken: token,
                pickerThumbnail: thumb, // Save it here
              };
            });

            if (csvDriveImport) {
              const expectedAssignments = csvDriveImport.fileVariantAssignments || {};
              const remainingIds = new Set(csvDriveImport.remainingFileIds || Object.keys(expectedAssignments));
              const matchedSelected = selected.filter((file) => remainingIds.has(file.id));
              const acceptedSelected = filterCatalogueImageFiles(matchedSelected);
              const acceptedById = new Map(acceptedSelected.map((file) => [file.id, file]));
              const acceptedIds = [...acceptedById.keys()];
              const unexpectedCount = selected.length - matchedSelected.length;

              if (acceptedIds.length > 0) {
                setDriveFiles((prev) => {
                  const existingIds = new Set(prev.map((file) => file.id));
                  return [...prev, ...acceptedIds.filter((fileId) => !existingIds.has(fileId)).map((fileId) => acceptedById.get(fileId))];
                });

                const acceptedAssignments = {};
                acceptedIds.forEach((fileId) => {
                  acceptedAssignments[fileId] = expectedAssignments[fileId];
                });
                setFileVariantMap((prev) => ({ ...prev, ...acceptedAssignments }));
              }

              const importedFileIds = [...new Set([...(csvDriveImport.importedFileIds || []), ...acceptedIds])];
              const nextRemainingFileIds = [...remainingIds].filter((fileId) => !acceptedById.has(fileId));

              if (unexpectedCount > 0) {
                toast.warning(
                  `${unexpectedCount} selected file${unexpectedCount !== 1 ? "s were" : " was"} not referenced by the CSV and ${unexpectedCount !== 1 ? "were" : "was"} ignored`,
                );
              }

              if (nextRemainingFileIds.length > 0) {
                const nextPendingImport = {
                  ...csvDriveImport,
                  remainingFileIds: nextRemainingFileIds,
                  importedFileIds,
                };
                pendingCsvDriveImportRef.current = nextPendingImport;
                setPendingCsvDriveImport(nextPendingImport);
                toast.warning(
                  `${nextRemainingFileIds.length} CSV-linked Drive file${nextRemainingFileIds.length !== 1 ? "s were" : " was"} not selected. Open Google Drive again to finish the import.`,
                );
              } else {
                finalizeCsvDriveGroups(expectedAssignments, importedFileIds);
                pendingCsvDriveImportRef.current = null;
                setPendingCsvDriveImport(null);
                toast.success(`Attached ${importedFileIds.length} Drive file${importedFileIds.length !== 1 ? "s" : ""} to the imported variants`);
              }
            } else {
              setDriveFiles((prev) => [...prev, ...filterCatalogueImageFiles(selected)]);
            }
          }

          if (data.action === "picked" || data.action === "cancel") {
            setShowFolderInput(false);
            setFolderLinkValue("");
            // Google has already completed its close action; dispose without
            // asking it to close again and risking a duplicate callback.
            disposeDrivePicker(picker, false);
            if (data.action === "cancel" && csvDriveImport) {
              pendingCsvDriveImportRef.current = csvDriveImport;
              setPendingCsvDriveImport(csvDriveImport);
            }
          }
        });

      // Add main view first if navigating to folder
      if (initialFolderId) {
        pickerBuilder.addView(mainView);
      }

      // Add other views
      pickerBuilder.addView(myFolders).addView(sharedDriveFolders).addView(onlySharedFolders);

      const picker = pickerBuilder.build();
      pickerInstanceRef.current = picker;
      picker.setVisible(true);
    },
    [disposeDrivePicker, filterCatalogueImageFiles, finalizeCsvDriveGroups, setDriveFiles, setFileVariantMap, setFolderLinkValue, setShowFolderInput],
  );

  const handleImportFromFolder = useCallback(async () => {
    if (!googleAuthStatus.accessToken) {
      toast.error("Not authenticated with Google Drive");
      return;
    }

    const link = folderLinkValue || "";

    // CSV imports reuse this same proven folder-navigation input, but keep the
    // pending Drive ID → variant assignments attached to the reopened Picker.
    if (pendingCsvDriveImport) {
      const csvFolderId = extractFolderId(link);
      if (!csvFolderId) {
        toast.error("Invalid Google Drive folder link");
        return;
      }
      createPicker(googleAuthStatus.accessToken, csvFolderId, pendingCsvDriveImport);
      return;
    }

    // 1. Check if the URL is a direct FILE link (matches /file/d/ID)
    const fileMatch = link.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    const fileId = fileMatch ? fileMatch[1] : null;

    if (fileId) {
      // It's a file! Fetch it directly and bypass the Picker
      try {
        // Optional: If you use a toast library like react-hot-toast, you can show a loading state
        // const toastId = toast.loading("Importing file...");

        // supportsAllDrives=true → required for files that live in a Shared Drive,
        // otherwise the raw v3 API returns 404 even when you have access via the Picker.
        // shortcutDetails → so we can detect + resolve shortcuts (which have no downloadable media).
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=id,name,mimeType,size,thumbnailLink,shortcutDetails`,
          { headers: { Authorization: `Bearer ${googleAuthStatus.accessToken}` } },
        );

        if (!response.ok) throw new Error(`Drive fetch failed (${response.status})`);

        let data = await response.json();

        // Resolve shortcuts: a shortcut has no media of its own; its real content lives
        // at shortcutDetails.targetId. The Picker resolves these automatically, the raw API does not.
        if (data.mimeType === "application/vnd.google-apps.shortcut" && data.shortcutDetails?.targetId) {
          const targetRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${data.shortcutDetails.targetId}?supportsAllDrives=true&fields=id,name,mimeType,size,thumbnailLink`,
            { headers: { Authorization: `Bearer ${googleAuthStatus.accessToken}` } },
          );
          if (!targetRes.ok) throw new Error(`Shortcut target fetch failed (${targetRes.status})`);
          data = await targetRes.json();
        }

        // Google-native files (Docs/Sheets/Slides/etc.) can't be downloaded with alt=media;
        // they'd fail later in uploadDriveFileToS3. Reject them up front with a clear message.
        if (data.mimeType?.startsWith("application/vnd.google-apps.")) {
          toast.error(`"${data.name}" is a Google-native file and can't be uploaded. Export it to a normal image/video first.`);
          return;
        }

        // Format the object EXACTLY how your Picker callback formats it
        const newFile = {
          id: data.id,
          name: data.name,
          mimeType: data.mimeType,
          size: parseInt(data.size || "0", 10), // API returns size as string
          accessToken: googleAuthStatus.accessToken,
          pickerThumbnail: data.thumbnailLink || null, // Automatically hooks into our new thumbnail logic!
        };

        const acceptedFiles = filterCatalogueImageFiles([newFile]);
        if (acceptedFiles.length === 0) return;

        setDriveFiles((prev) => [...prev, ...acceptedFiles]);
        setShowFolderInput(false);
        setFolderLinkValue("");
        toast.success(`Successfully imported: ${data.name}`);

        // toast.success("File imported successfully!", { id: toastId });
      } catch (error) {
        toast.error(`Failed to import file: ${error.message}`);
      }
      return; // Stop execution here so we don't open the folder picker
    }

    // 2. If it's NOT a file link, assume it's a FOLDER link
    const folderId = extractFolderId(link);

    if (!folderId) {
      toast.error("Invalid Google Drive link");
      return;
    }

    // Open the picker pointing to the folder
    createPicker(googleAuthStatus.accessToken, folderId);
  }, [
    folderLinkValue,
    googleAuthStatus.accessToken,
    createPicker,
    pendingCsvDriveImport,
    setDriveFiles,
    setShowFolderInput,
    setFolderLinkValue,
    filterCatalogueImageFiles,
  ]);

  const openPicker = useCallback(
    (token) => {
      const csvDriveImport = pendingCsvDriveImportRef.current;
      if (!window.google || !window.google.picker) {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js?onload=onApiLoad";
        document.body.appendChild(script);

        window.onApiLoad = () => {
          window.gapi.load("picker", () => {
            createPicker(token, null, csvDriveImport);
          });
        };
      } else {
        createPicker(token, null, csvDriveImport);
      }
    },
    [createPicker],
  ); // Note: createPicker needs to be memoized too

  const handleDriveClick = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/google/status`, { withCredentials: true });

      if (res.data.authenticated && res.data.accessToken) {
        setGoogleAuthStatus({
          authenticated: true,
          checking: false,
          accessToken: res.data.accessToken,
        });
        openPicker(res.data.accessToken);
        return;
      }
    } catch (err) {
      console.warn("No valid Google session, proceeding to popup login.");
    }

    const authWindow = window.open(`${API_BASE_URL}/auth/google?popup=true`, "_blank", "width=1100,height=750");

    if (!authWindow) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", listener);
      if (!authWindow.closed) authWindow.close();
      // toast.error("Google login timed out.");
    }, 65000);

    const listener = async (event) => {
      if (event.origin !== `${API_BASE_URL}`) return;

      const { type } = event.data || {};
      if (type === "google-auth-success") {
        clearTimeout(timeoutId);
        window.removeEventListener("message", listener);
        authWindow.close();

        try {
          const res = await axios.get(`${API_BASE_URL}/auth/google/status`, { withCredentials: true });
          if (res.data.authenticated && res.data.accessToken) {
            setGoogleAuthStatus({
              authenticated: true,
              checking: false,
              accessToken: res.data.accessToken,
            });
            openPicker(res.data.accessToken);
          } else {
            toast.error("Google authentication failed");
          }
        } catch (err) {
          toast.error("Google authentication failed");
        }
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
    if (document.getElementById("dropboxjs")) return; // Already loaded

    const script = document.createElement("script");
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.id = "dropboxjs";
    script.setAttribute("data-app-key", import.meta.env.VITE_DROPBOX_APP_KEY || "YOUR_DROPBOX_APP_KEY");
    script.async = true;
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById("dropboxjs");
      if (existingScript) existingScript.remove();
    };
  }, []);

  // Backend uses session token for upload — no client-side accessToken needed.
  const openDropboxChooser = useCallback(() => {
    window.Dropbox.choose({
      success: async (selectedFiles) => {
        // Log for debugging
        selectedFiles.forEach((f) => console.log(`File: ${f.name} ID: ${f.id}`));

        const dropboxFilesData = selectedFiles.map((file) => ({
          dropboxId: file.id,
          name: file.name,
          link: file.link,
          directLink: file.link,
          size: file.bytes,
          isDropbox: true,
          mimeType: getMimeFromName(file.name),
        }));

        setDropboxFiles((prev) => [...prev, ...filterCatalogueImageFiles(dropboxFilesData)]);
      },
      cancel: () => {
        console.log("Dropbox picker cancelled");
      },
      linkType: "direct", // Changed to preview (safer default), though 'direct' is fine too
      multiselect: true,
      extensions: [".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mov", ".webm"],
      folderselect: false,
      sizeLimit: 1024 * 1024 * 1024,
    });
  }, [setDropboxFiles, filterCatalogueImageFiles]);

  const handleDropboxClick = useCallback(async () => {
    // Check if Dropbox SDK is loaded
    if (!window.Dropbox) {
      toast.error("Dropbox is still loading. Please try again in a moment.");
      return;
    }

    try {
      const statusRes = await fetch(`${API_BASE_URL}/auth/dropbox/status`, {
        credentials: "include",
      });
      const statusData = await statusRes.json();

      if (statusData.authenticated) {
        openDropboxChooser();
        return;
      }

      // If not authenticated, open Popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(`${API_BASE_URL}/auth/dropbox?popup=true`, "dropbox-auth", `width=${width},height=${height},left=${left},top=${top}`);

      const handleMessage = (event) => {
        if (event.origin !== API_BASE_URL) return;
        if (event.data?.type === "dropbox-auth-success") {
          window.removeEventListener("message", handleMessage);
          toast.success("Dropbox connected! Opening file picker...");
          openDropboxChooser();
        } else if (event.data?.type === "dropbox-auth-error") {
          window.removeEventListener("message", handleMessage);
          toast.error("Failed to connect Dropbox");
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("Error checking Dropbox auth:", error);
      toast.error("Failed to check Dropbox connection");
    }
  }, [openDropboxChooser]);

  const [frameioPickerOpen, setFrameioPickerOpen] = useState(false);

  const launchFrameioAuthPopup = useCallback(() => {
    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindow = window.open(
      `${API_BASE_URL}/auth/frame?popup=true`,
      "frameio-auth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!authWindow) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", listener);
      if (!authWindow.closed) authWindow.close();
    }, 120000);

    const listener = (event) => {
      if (event.origin !== API_BASE_URL) return;
      const { type } = event.data || {};
      if (type === "frameio-auth-success") {
        clearTimeout(timeoutId);
        window.removeEventListener("message", listener);
        authWindow.close();
        setFrameioPickerOpen(true);
        toast.success("Frame.io connected!");
      } else if (type === "frameio-auth-error") {
        clearTimeout(timeoutId);
        window.removeEventListener("message", listener);
        authWindow.close();
        toast.error("Frame.io authentication failed");
      }
    };

    window.addEventListener("message", listener);
  }, []);

  const handleFrameioClick = useCallback(async () => {
    try {
      const statusRes = await fetch(`${API_BASE_URL}/auth/frame/status`, {
        credentials: "include",
      });
      const statusData = await statusRes.json();

      if (statusData.authenticated) {
        setFrameioPickerOpen(true);
        return;
      }
    } catch (err) {
      console.warn("No valid Frame.io session, checking whether to show connect guidance first.");
    }

    setShowFrameioConnectHelp(false);
    setShowFrameioConnectDialog(true);
  }, [launchFrameioAuthPopup]);

  const handleFrameioFilesSelected = useCallback(
    (selected) => {
      // Each item: { frameioId, frameioAccountId, name, mimeType, size, thumbnailUrl, width, height }
      const mapped = selected.map((f) => ({
        frameioId: f.frameioId,
        frameioAccountId: f.frameioAccountId,
        name: f.name,
        mimeType: f.mimeType || getMimeFromName(f.name),
        size: f.size,
        isFrameio: true,
        pickerThumbnail: f.thumbnailUrl || null,
        width: f.width,
        height: f.height,
      }));
      setFrameioFiles((prev) => [...prev, ...filterCatalogueImageFiles(mapped)]);
      setFrameioPickerOpen(false);
    },
    [setFrameioFiles, filterCatalogueImageFiles],
  );

  // Dropzone logic
  const importCsvFile = useCallback(
    async (file) => {
      if (!file || !onImportCsv || isImportingCsv) return;

      setIsImportingCsv(true);
      try {
        const result = await onImportCsv(file);
        if (result?.driveImport?.fileCount > 0) {
          const fileVariantAssignments = result.driveImport.fileVariantAssignments || {};
          const fileIds = Object.keys(fileVariantAssignments);
          const nextPendingCsvDriveImport = {
            ...result.driveImport,
            fileVariantAssignments,
            remainingFileIds: fileIds,
            importedFileIds: [],
          };
          pendingCsvDriveImportRef.current = nextPendingCsvDriveImport;
          setPendingCsvDriveImport(nextPendingCsvDriveImport);
          setShowCsvImportGuide(false);
          await handleDriveClick();
        }
        if (result?.created > 0 && !hasImportedCsv) {
          setHasImportedCsv(true);
          try {
            await saveSettings({ globalSettings: { hasImportedCsv: true } });
            window.dispatchEvent(new Event("globalSettingsUpdated"));
          } catch (err) {
            console.error("Failed to save CSV import status:", err);
          }
        }
      } finally {
        setIsImportingCsv(false);
        setShowCsvImportGuide(false);
      }
    },
    [handleDriveClick, hasImportedCsv, isImportingCsv, onImportCsv, setHasImportedCsv],
  );

  const handleCsvSelection = useCallback(
    (file) => {
      if (!file) return;
      if (pendingCsvDriveImport) {
        toast.error("Finish selecting the Drive files for the current CSV first");
        void handleDriveClick();
        return;
      }
      if (!file.name?.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        toast.error("Please choose a CSV file");
        return;
      }
      if (getCatalogueMediaCount() > 0 || importedPosts.length > 0) {
        toast.error("Remove existing media before importing a CSV");
        return;
      }
      if (!onImportCsv) {
        toast.error("CSV import is not available right now");
        return;
      }

      void importCsvFile(file);
    },
    [getCatalogueMediaCount, handleDriveClick, importCsvFile, importedPosts.length, onImportCsv, pendingCsvDriveImport],
  );

  const handleCsvSourceClick = useCallback(() => {
    if (!isImportingCsv) csvFileInputRef.current?.click();
  }, [isImportingCsv]);

  const handleCsvFilePickerChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      // Allow selecting the same file again after cancelling or completing an import.
      event.target.value = "";
      handleCsvSelection(file);
    },
    [handleCsvSelection],
  );

  const onDrop = useCallback(
    (acceptedFiles) => {
      const csvFiles = acceptedFiles.filter((file) => file.name?.toLowerCase().endsWith(".csv") || file.type === "text/csv");
      const mediaFiles = acceptedFiles.filter((file) => !csvFiles.includes(file));

      if (csvFiles.length > 0) {
        if (csvFiles.length > 1 || mediaFiles.length > 0) {
          toast.error("Choose one CSV by itself, without media files");
          return;
        }
        handleCsvSelection(csvFiles[0]);
        return;
      }

      // 🚫 Filter out .webp and .heic files
      const filteredFiles = mediaFiles.filter((file) => !file.name.toLowerCase().endsWith(".webp") && !file.name.toLowerCase().endsWith(".heic"));

      if (filteredFiles.length < mediaFiles.length) {
        toast.error("WebP and HEIC files are not supported by Facebook");
      }

      const catalogueImageFiles = filterCatalogueImageFiles(filteredFiles);

      setFiles((prev) => [...prev, ...catalogueImageFiles.map(withUniqueId)]);
    },
    [filterCatalogueImageFiles, handleCsvSelection],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: isCatalogueAd
      ? {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "text/csv": [".csv"],
      }
      : undefined,
  });

  const getVideoAspectRatio = async (file) => {
    if (!isVideoFile(file)) {
      return null; // Not a video file
    }

    if (file.width && file.height) {
      return file.width / file.height;
    }

    if (file.isDraftAsset && file.s3Url) {
      return new Promise((resolve) => {
        const video = document.createElement("video");
        let settled = false;
        const finish = (aspectRatio) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          video.removeAttribute("src");
          video.load();
          resolve(aspectRatio);
        };
        const timeout = setTimeout(() => {
          finish(16 / 9);
        }, 10000);
        video.preload = "metadata";
        video.src = file.s3Url;
        video.addEventListener(
          "loadedmetadata",
          () => {
            finish(video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9);
          },
          { once: true },
        );
        video.addEventListener("error", () => finish(16 / 9), { once: true });
      });
    }

    if (file.isFrameio) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/frameio/video-metadata`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountId: file.frameioAccountId,
            fileId: file.frameioId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.width && data.height) return data.width / data.height;
        }
        return 16 / 9;
      } catch (error) {
        console.error("Error getting Frame.io video metadata:", error);
        return 16 / 9;
      }
    }

    if (file.isDropbox) {
      try {
        // We need to call our backend to get the metadata
        const response = await fetch(`${API_BASE_URL}/api/dropbox/video-metadata`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fileId: file.dropboxId,
            fileLink: file.link,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.width && data.height) {
            return data.width / data.height;
          }
        }
        return 16 / 9; // Fallback
      } catch (error) {
        console.error("Error getting Dropbox video metadata:", error);
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
          headers: { Authorization: `Bearer ${file.accessToken}` },
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
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = url;
        video.addEventListener("loadedmetadata", () => {
          const aspectRatio = video.videoWidth / video.videoHeight;
          URL.revokeObjectURL(url);
          resolve(aspectRatio);
        });
        video.addEventListener("error", () => {
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
      return file.pickerThumbnail.replace(/=s\d+$/, "=w400-h300");
    }

    // 2. SAFEST FALLBACK: If Picker didn't have it, fetch from the API
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?fields=thumbnailLink`, {
        headers: { Authorization: `Bearer ${file.accessToken}` },
        signal: signal,
      });

      if (!response.ok) throw new Error("Failed to fetch Drive thumbnail");

      const data = await response.json();
      if (data.thumbnailLink) {
        return data.thumbnailLink.replace(/=s\d+$/, "=w400-h300");
      }

      return "https://api.withblip.com/thumbnail.jpg";
    } catch (err) {
      if (err.name === "AbortError") throw err;
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
      const videoFiles = files.filter((file) => {
        const fileId = getFileId(file);
        return isVideoFile(file) && !file.isDrive && !file.isDropbox && !videoThumbsRef.current[fileId] && !processingRef.current.has(fileId);
      });

      if (videoFiles.length > 0) {
        videoFiles.forEach((file) => processingRef.current.add(getFileId(file)));

        const MAX_CONCURRENT = 2;
        const queue = [...videoFiles];

        const processNext = async () => {
          if (queue.length === 0 || abortController.signal.aborted) return;
          const file = queue.shift();
          const fileId = getFileId(file);

          try {
            const thumb = await generateThumbnail(file);
            if (!abortController.signal.aborted) {
              setVideoThumbs((prev) => ({ ...prev, [fileId]: thumb }));
            }
          } catch (err) {
            console.error(`Thumbnail error for ${file.name}:`, err);
            if (!abortController.signal.aborted) {
              setVideoThumbs((prev) => ({
                ...prev,
                [fileId]: "https://api.withblip.com/thumbnail.jpg",
              }));
            }
          } finally {
            processingRef.current.delete(fileId);
            if (queue.length > 0 && !abortController.signal.aborted) {
              if ("requestIdleCallback" in window) requestIdleCallback(() => processNext(), { timeout: 100 });
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
      const driveFilesNeedingThumbs = driveFiles.filter((file) => {
        const fileId = getFileId(file);
        return isVideoFile(file) && !videoThumbsRef.current[fileId] && !processingRef.current.has(fileId);
      });

      if (driveFilesNeedingThumbs.length > 0 && !abortController.signal.aborted) {
        // Track processing to prevent duplicate fetches
        driveFilesNeedingThumbs.forEach((file) => processingRef.current.add(getFileId(file)));

        const MAX_DRIVE_CONCURRENT = 3; // Fast, but avoids Google API rate limits
        const driveQueue = [...driveFilesNeedingThumbs];

        const processNextDrive = async () => {
          if (driveQueue.length === 0 || abortController.signal.aborted) return;

          const file = driveQueue.shift();
          const fileId = getFileId(file);

          try {
            const thumbUrl = await getDriveVideoThumbnail(file, abortController.signal);

            if (!abortController.signal.aborted) {
              setVideoThumbs((prev) => ({ ...prev, [fileId]: thumbUrl }));
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
      const dropboxFilesNeedingThumbs = dropboxFiles.filter((file) => {
        const fileId = file.dropboxId;

        return !videoThumbsRef.current[fileId] && !processingRef.current.has(fileId);
      });

      if (dropboxFilesNeedingThumbs.length > 0 && !abortController.signal.aborted) {
        // Track by dropboxId
        dropboxFilesNeedingThumbs.forEach((file) => processingRef.current.add(file.dropboxId));

        const BATCH_SIZE = 25;

        for (let i = 0; i < dropboxFilesNeedingThumbs.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) break;

          const batch = dropboxFilesNeedingThumbs.slice(i, i + BATCH_SIZE);

          const filesData = batch.map((f) => ({
            id: f.dropboxId,
            link: f.link, // or f.directLink, depending on your object structure
          }));

          try {
            const response = await fetch(`${API_BASE_URL}/api/dropbox/thumbnails/batch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ files: filesData }),
              signal: abortController.signal,
            });

            if (response.ok) {
              const data = await response.json();

              const newThumbs = {};
              batch.forEach((file) => {
                const dId = file.dropboxId;

                // CRITICAL FIX: Save using the dropboxId as the key.
                // This matches what the UI component looks for.
                if (data.thumbnails && data.thumbnails[dId]) {
                  newThumbs[dId] = data.thumbnails[dId];
                } else {
                  newThumbs[dId] = file.icon || "https://api.withblip.com/thumbnail.jpg";
                }
              });

              setVideoThumbs((prev) => ({ ...prev, ...newThumbs }));
            }
          } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Dropbox batch error:", error);

            // Error handling: Save fallback using dropboxId key
            const failedThumbs = {};
            batch.forEach((f) => {
              failedThumbs[f.dropboxId] = "https://api.withblip.com/thumbnail.jpg";
            });
            setVideoThumbs((prev) => ({ ...prev, ...failedThumbs }));
          } finally {
            // Cleanup using dropboxId key
            batch.forEach((f) => processingRef.current.delete(f.dropboxId));
          }
        }
      }

      // --- 4. FRAME.IO ---
      // Frame.io picker provides pickerThumbnail upfront; just stash it.
      const frameioFilesNeedingThumbs = (frameioFiles || []).filter((file) => {
        const fileId = file.frameioId;
        return !videoThumbsRef.current[fileId] && !processingRef.current.has(fileId);
      });

      if (frameioFilesNeedingThumbs.length > 0 && !abortController.signal.aborted) {
        const newThumbs = {};
        frameioFilesNeedingThumbs.forEach((file) => {
          newThumbs[file.frameioId] = file.pickerThumbnail || "https://api.withblip.com/thumbnail.jpg";
        });
        setVideoThumbs((prev) => ({ ...prev, ...newThumbs }));
      }
    };

    processThumbnails();

    return () => {
      abortController.abort();
      processingRef.current.clear();
    };
  }, [files, driveFiles, dropboxFiles, frameioFiles, generateThumbnail, getDriveVideoThumbnail, setVideoThumbs]);

  const addField = (setter, values) => {
    const maxFields = isCarouselAd ? 10 : 5;
    if (values.length < maxFields) {
      setter([...values, ""]);
    }
  };

  const removeField = (setter, values, index) => {
    if (values.length > 1) {
      setter(values.filter((_, i) => i !== index));
    }
  };

  const updateField = (setter, values, index, newValue) => {
    const newValues = [...values];
    newValues[index] = newValue;
    setter(newValues);
  };

  // Keep isCarouselAd in sync with adType for backward compatibility
  useEffect(() => {
    setIsCarouselAd(adType === "carousel");
  }, [adType, setIsCarouselAd]);

  const campaignSupportsFlexibleAds =
    campaignObjective.length > 0 && campaignObjective.every((obj) => ["OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(obj));

  const getAdSetProductSetId = useCallback(
    (adSetId) => {
      const adset = adSets.find((entry) => entry.id === adSetId);
      return adset?.promoted_object?.product_set_id || null;
    },
    [adSets],
  );

  const hasCatalogueEligibleAdSets = useMemo(() => {
    if (!IS_STAGING) {
      return false;
    }

    if (duplicateAdSet) {
      return Boolean(getAdSetProductSetId(duplicateAdSet));
    }

    if (selectedAdSets.length === 0) {
      return false;
    }

    return selectedAdSets.every((adSetId) => Boolean(getAdSetProductSetId(adSetId)));
  }, [duplicateAdSet, getAdSetProductSetId, selectedAdSets]);

  // For OUTCOME_SALES / OUTCOME_LEADS campaigns, BOOK_NOW must be sent to the server as BOOK_TRAVEL.
  const resolveCtaForServer = (ctaValue) =>
    ctaValue === "BOOK_NOW" &&
      campaignObjective.length > 0 &&
      campaignObjective.every((obj) => obj === "OUTCOME_SALES" || obj === "OUTCOME_LEADS" || obj === "OUTCOME_AWARENESS" || obj === "LINK_CLICKS")
      ? "BOOK_TRAVEL"
      : ctaValue;

  // Reset adType to 'regular' if flexible is selected but the campaign doesn't support it
  useEffect(() => {
    if (adType === "flexible" && !campaignSupportsFlexibleAds) {
      setAdType("regular");
    }
  }, [campaignSupportsFlexibleAds, adType, setAdType]);

  useEffect(() => {
    if (adType === "catalogue" && !hasCatalogueEligibleAdSets) {
      setAdType("regular");
    }
  }, [adType, hasCatalogueEligibleAdSets, setAdType]);

  // Replace the existing function with this
  const computeAdName = useCallback(
    (file, dateTypeInput, iterationIndex) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

      const parts = adOrder
        .map((key) => {
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
        })
        .filter(Boolean);

      const adName = parts.join("_");
      return adName || "Ad Generated Through Blip";
    },
    [adOrder, selectedItems, adValues],
  );

  const formatDate = (formatStr) => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth(); // 0-indexed
    const year = now.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Fallback if user never customized the placeholder
    const fmt = formatStr === "custom" ? "MMDDYYYY" : formatStr.toUpperCase();

    // Order matters — replace longer tokens first to avoid partial matches
    return fmt
      .replace(/YYYY/g, String(year))
      .replace(/YY/g, String(year).slice(-2))
      .replace(/MMM/g, monthNames[month])
      .replace(/MM/g, String(month + 1).padStart(2, "0"))
      .replace(/M/g, String(month + 1))
      .replace(/DD/g, String(day).padStart(2, "0"))
      .replace(/D/g, String(day));
  };

  const computeAdNameFromFormula = useCallback(
    (file, iterationIndex = 0, link = "", formula = null, adType = "") => {
      const formulaToUse = formula || adNameFormulaV2;
      if (!formulaToUse?.rawInput) {
        return computeAdName(file, adValues.dateType, iterationIndex);
      }

      let fileName = "";
      if (file && file.name) {
        fileName = file.name.replace(/\.[^/.]+$/, "");
        if (LOWERCASE_FILE_NAME_FORMULA_USER_IDS.includes(String(userId))) {
          fileName = fileName.toLowerCase();
        }
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
          if (adType === "flexible") adTypeLabel = "FLEX";
          else if (adType === "multi_media") adTypeLabel = "MULTI";
          else if (adType === "catalogue") adTypeLabel = "CAT";
          else if (adType === "carousel") adTypeLabel = "CAR";
          else adTypeLabel = fileType;
        } catch (e) {
          adTypeLabel = "";
        }
      }

      // Legacy formats (backward compat — no migration needed)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
        .replace(/\{\{Ad Type\}\}/gi, adTypeLabel)
        .replace(/\{\{Ad Set Name\}\}/gi, () => {
          if (!showAdSetNameVariable) return "";
          if (Object.prototype.hasOwnProperty.call(formulaToUse, "adSetNameContext")) {
            return formulaToUse.adSetNameContext || "";
          }
          if (duplicateAdSet) return newAdSetName?.trim() || "";
          const selectedAdSet = adSets.find((entry) => String(entry.id) === String(selectedAdSets[0]));
          return selectedAdSet?.name || "";
        });
      const templateNameForFormula = formulaToUse.selectedTemplate || selectedTemplate;
      const templateHashReplacement =
        isTemplateLinkSyncUser && templateNameForFormula && defaultTemplateName
          ? templateNameForFormula === defaultTemplateName
            ? "33"
            : "21"
          : null;
      if (templateHashReplacement) {
        adName = adName.replace(/#/g, templateHashReplacement);
      }
      adName = adName.replace(/\{\{([^:}]+):([^}]+)\}\}/g, (match, category, value) => value);
      adName = adName.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
        // Don't touch built-in variables that weren't already replaced
        // (shouldn't happen, but safety check)
        return "";
      });

      return adName.trim() || "Ad Generated Through Blip";
    },
    [
      adNameFormulaV2,
      adSets,
      adValues.dateType,
      computeAdName,
      defaultTemplateName,
      duplicateAdSet,
      isTemplateLinkSyncUser,
      newAdSetName,
      selectedAdSets,
      selectedTemplate,
      showAdSetNameVariable,
      userId,
    ],
  );

  const adNamePreviewFile = useMemo(() => {
    const directFile = files[0] || driveFiles[0] || dropboxFiles[0] || frameioFiles[0] || importedFiles[0];
    if (directFile) return directFile;

    const existingPost = importedPosts[0];
    if (existingPost) {
      return {
        name: existingPost.ad_name || existingPost.name || "Existing ad",
        type: existingPost.video_id ? "video/mp4" : "image/jpeg",
      };
    }

    const instagramPost = selectedIgOrganicPosts[0];
    if (instagramPost) {
      return {
        name: instagramPost.caption || "Instagram post",
        type: instagramPost.media_type === "VIDEO" ? "video/mp4" : "image/jpeg",
      };
    }

    return null;
  }, [driveFiles, dropboxFiles, files, frameioFiles, importedFiles, importedPosts, selectedIgOrganicPosts]);

  useEffect(() => {
    const computedAdName = computeAdNameFromFormula(adNamePreviewFile, 0, link[0], null, adType);
    setAdName((current) => (current === computedAdName ? current : computedAdName));
  }, [adNamePreviewFile, adType, computeAdNameFromFormula, link, setAdName]);

  useEffect(() => {
    if (!isCarouselAd) return;
    const fileCount = files.length + driveFiles.length + dropboxFiles.length + (frameioFiles?.length || 0) + importedFiles.length;
    const cardCount = enablePlacementCustomization ? Math.floor(fileCount / 2) : fileCount;

    if (applyTextToAllCards && cardCount > 0) {
      const firstMessage = messages[0] || "";
      if (messages.length !== cardCount || messages.some((message) => message !== firstMessage)) {
        setMessages(new Array(cardCount).fill(firstMessage));
      }
    }

    if (applyHeadlinesToAllCards && cardCount > 0) {
      const firstHeadline = headlines[0] || "";
      if (headlines.length !== cardCount || headlines.some((headline) => headline !== firstHeadline)) {
        setHeadlines(new Array(cardCount).fill(firstHeadline));
      }
    }
  }, [
    files.length,
    driveFiles.length,
    dropboxFiles.length,
    frameioFiles?.length,
    importedFiles.length,
    isCarouselAd,
    enablePlacementCustomization,
    applyTextToAllCards,
    applyHeadlinesToAllCards,
    messages,
    headlines,
  ]);

  const duplicateAdSetRequest = async (adSetId, campaignId, adAccountId, adSetName, signal = null) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/duplicate-adset`,
      { adSetId, campaignId, adAccountId, newAdSetName: adSetName ?? newAdSetName },
      { withCredentials: true, signal, timeout: DUPLICATE_AD_SET_TIMEOUT_MS },
    );
    return response.data.copied_adset_id;
  };

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

  const showShopDestinationSelector = hasShopAutomaticAdSets && pageId && selectedAdAccount;
  const showProductExtensionSelector =
    Boolean(adAccountSettings?.creativeEnhancements?.catalogItems) &&
    pageId &&
    selectedAdAccount &&
    campaignObjective.length > 0 &&
    campaignObjective.every((objective) => ["OUTCOME_SALES", "OUTCOME_TRAFFIC"].includes(objective));
  const showPhoneNumberField = areAllAdSetsPhoneCall();
  const supportsInstantExperience =
    INSTANT_EXPERIENCE_USER_IDS.includes(String(userId || "")) &&
    !isCatalogueAd &&
    !showPhoneNumberField &&
    !showShopDestinationSelector &&
    !isDuplicationMode &&
    importedPosts.length === 0 &&
    selectedIgOrganicPosts.length === 0;
  const hasCatalogueInvalidMedia =
    isCatalogueAd &&
    [...files, ...driveFiles, ...dropboxFiles, ...(frameioFiles || []), ...importedFiles].some(
      (file) => isVideoFile(file) || isGifFile(file) || !isImageFile(file),
    );
  const hasCatalogueStaticCardVariableWarning =
    isCatalogueAd && getCatalogueMediaCount() > 0 && [...headlines, ...descriptions].some((value) => /\{\{[^}]+\}\}/.test(value || ""));
  const requiresDestinationValue = importedPosts.length === 0 && !isDuplicationMode && !isCatalogueAd;
  const isMissingDestinationValue =
    requiresDestinationValue &&
    (showPhoneNumberField
      ? !phoneNumber.trim()
      : destinationType === "instant_experience"
        ? !instantExperienceId || instantExperiencesLoading || !instantExperiences.some((experience) => experience.id === instantExperienceId)
        : (!showCustomLink && !link[0]) || (showCustomLink && !customLink.trim()));
  const hasAdNameFormulaConfigured = Boolean(adNameFormulaV2?.rawInput?.trim());

  useEffect(() => {
    if (supportsInstantExperience || destinationType !== "instant_experience") return;
    setDestinationType("website");
    setInstantExperienceId("");
    setInstantExperiences([]);
    setInstantExperiencesError("");
    setLink([""]);
    setCustomLink("");
    setShowCustomLink(false);
  }, [destinationType, setCustomLink, setDestinationType, setInstantExperienceId, setLink, setShowCustomLink, supportsInstantExperience]);

  useEffect(() => {
    if (destinationType !== "instant_experience" || !supportsInstantExperience) {
      setInstantExperiences([]);
      setInstantExperiencesLoading(false);
      setInstantExperiencesError("");
      return undefined;
    }

    if (!pageId) {
      setInstantExperiences([]);
      setInstantExperiencesLoading(false);
      setInstantExperiencesError("Select a Facebook Page first.");
      return undefined;
    }

    const applyExperiences = (experiences) => {
      setInstantExperiences(experiences);
      setInstantExperiencesError(experiences.length === 0 ? "This page has no published Instant Experiences." : "");

      if (!instantExperienceId) return;
      const selectedExperienceExists = experiences.some((experience) => experience.id === instantExperienceId);
      if (selectedExperienceExists) {
        setLink([`https://fb.com/canvas_doc/${instantExperienceId}`]);
      } else {
        setInstantExperienceId("");
        setLink([""]);
      }
    };

    const cachedExperiences = instantExperiencesCacheRef.current.get(pageId);
    if (cachedExperiences) {
      applyExperiences(cachedExperiences);
      setInstantExperiencesLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setInstantExperiences([]);
    setInstantExperiencesLoading(true);
    setInstantExperiencesError("");

    fetch(`${API_BASE_URL}/auth/fetch-instant-experiences?pageId=${encodeURIComponent(pageId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to fetch Instant Experiences");
        return Array.isArray(data.instantExperiences) ? data.instantExperiences : [];
      })
      .then((experiences) => {
        instantExperiencesCacheRef.current.set(pageId, experiences);
        applyExperiences(experiences);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setInstantExperiences([]);
        setInstantExperiencesError(error.message || "Failed to fetch Instant Experiences");
      })
      .finally(() => {
        if (!controller.signal.aborted) setInstantExperiencesLoading(false);
      });

    return () => controller.abort();
  }, [destinationType, instantExperienceId, pageId, setInstantExperienceId, setLink, supportsInstantExperience]);

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

  useEffect(() => {
    if (!showProductExtensionSelector) {
      if (productExtensionProductSetId) setProductExtensionProductSetId("");
      if (productExtensionProductCatalogId) setProductExtensionProductCatalogId("");
    }
  }, [
    productExtensionProductCatalogId,
    productExtensionProductSetId,
    setProductExtensionProductCatalogId,
    setProductExtensionProductSetId,
    showProductExtensionSelector,
  ]);

  const shouldShowLeadFormSelector = useMemo(() => {
    if (destinationType === "instant_experience") return false;

    // Must have selections
    if (selectedCampaign.length === 0 || selectedAdSets.length === 0) {
      return false;
    }

    // All selected campaigns must have LEADS objective
    const allCampaignsAreLeads = selectedCampaign.every((campId) => {
      const campaign = campaigns.find((c) => c.id === campId);
      return campaign?.objective === "OUTCOME_LEADS" || campaign?.objective === "LEADS";
    });

    if (!allCampaignsAreLeads) {
      return false;
    }

    // All selected ad sets must have valid destination types
    const validDestinations = ["WEBSITE_AND_LEAD_FORM", "ON_AD", "LEAD_FORM_MESSENGER"];
    const allAdSetsValid = selectedAdSets.every((adSetId) => {
      const adSet = adSets.find((a) => a.id === adSetId);
      return validDestinations.includes(adSet?.destination_type);
    });

    return allAdSetsValid;
  }, [destinationType, selectedCampaign, selectedAdSets, campaigns, adSets]);

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
        const response = await fetch(`${API_BASE_URL}/auth/fetch-leadgen-forms?pageId=${encodeURIComponent(pageId)}`, { credentials: "include" });
        const data = await response.json();

        if (data.success && data.forms) {
          setLeadgenForms(data.forms);
        } else {
          setLeadgenForms([]);
        }
      } catch (error) {
        console.error("Error fetching leadgen forms:", error);
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
      JSON.stringify(messages.filter((t) => t.trim())) !== JSON.stringify(tpl.primaryTexts || []) ||
      JSON.stringify(headlines.filter((t) => t.trim())) !== JSON.stringify(tpl.headlines || []) ||
      JSON.stringify((descriptions || []).filter((t) => t !== "")) !== JSON.stringify(tpl.descriptions || [])
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
  const hasAnyContent = useMemo(() => messages.some((t) => t.trim()) || headlines.some((t) => t.trim()), [messages, headlines]);

  // Does this exact combo already exist in another template?
  const existingDuplicateTemplate = useMemo(() => {
    const currentPrimary = JSON.stringify(messages.filter((t) => t.trim()).sort());
    const currentHL = JSON.stringify(headlines.filter((t) => t.trim()).sort());
    const currentDescs = JSON.stringify((descriptions || []).filter((t) => t !== "").sort());
    for (const [name, tpl] of Object.entries(copyTemplates)) {
      if (name === selectedTemplate) continue;
      if (
        currentPrimary === JSON.stringify((tpl.primaryTexts || []).filter((t) => t.trim()).sort()) &&
        currentHL === JSON.stringify((tpl.headlines || []).filter((t) => t.trim()).sort()) &&
        currentDescs === JSON.stringify((tpl.descriptions || []).filter((t) => t.trim()).sort())
      )
        return name;
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
        primaryTexts: messages.filter((t) => t.trim()),
        headlines: headlines.filter((t) => t.trim()),
        descriptions: (descriptions || []).filter((t) => t !== ""),
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
        primaryTexts: messages.filter((t) => t.trim()),
        headlines: headlines.filter((t) => t.trim()),
        descriptions: (descriptions || []).filter((t) => t !== ""),
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
      descriptions: findDupes(enablePlacementCustomization ? descriptions.slice(0, 1) : descriptions),
    };
  }, [messages, headlines, descriptions, isCarouselAd, enablePlacementCustomization]);

  const hasDuplicates = useMemo(
    () => duplicateIndices.messages.size > 0 || duplicateIndices.headlines.size > 0 || duplicateIndices.descriptions.size > 0,
    [duplicateIndices],
  );

  const duplicateFileNameWarnings = useMemo(() => {
    const mediaFileEntries = buildMediaFileEntries({
      files,
      driveFiles,
      dropboxFiles,
      frameioFiles,
      importedFiles,
    });
    if (mediaFileEntries.length < 2) return [];

    const fileEntriesById = new Map(mediaFileEntries.map((file) => [String(file.id), file]));

    const groupsToCheck =
      (isCarouselAd || isFlexLikeAdType) && fileGroupsAsArrays.length === 0 ? [mediaFileEntries.map((file) => file.id)] : fileGroupsAsArrays;

    if (groupsToCheck.length === 0) return [];

    return findDuplicateFileNameWarnings(groupsToCheck, fileEntriesById);
  }, [adType, isFlexLikeAdType, driveFiles, dropboxFiles, fileGroupsAsArrays, files, frameioFiles, importedFiles, isCarouselAd]);

  const handleCreateAd = async (jobData) => {
    const abortController = new AbortController();
    const signal = abortController.signal;
    setCurrentAbortController(abortController);

    const throwIfCancelled = () => {
      if (signal.aborted) throw new DOMException("Job cancelled. Some Ads might still have been made.", "AbortError");
    };

    // eslint-disable-next-line prefer-const -- `files` is reassigned below after the resize step
    let {
      // Form content
      headlines,
      descriptions,
      messages,
      link,
      destinationType,
      instantExperienceId,
      cta,

      // Files
      files,
      driveFiles,
      dropboxFiles,
      frameioFiles = [],
      videoThumbs,
      thumbnail,
      importedPosts,
      importedFiles,
      selectedIgOrganicPosts, // ADD THIS

      selectedAdSets,
      duplicateAdSet,
      newAdSetName,
      pageId,
      instagramAccountId,
      selectedAdAccount,
      selectedCampaign,

      // Configuration
      launchPaused,
      discloseAiMedia,
      pixelTrackingOverride,
      adType,
      isCarouselAd,
      enablePlacementCustomization,
      fileGroups,

      // Shop
      selectedShopDestination,
      selectedShopDestinationType,
      productExtensionProductSetId: jobProductExtensionProductSetId,
      selectedForm,
      //partnership ads
      isPartnershipAd,
      partnerIgAccountId,
      partnerFbPageId,
      partnershipIdentityMode,
      partnershipPrimaryIdentity,

      // Other
      adValues,
      adScheduleStartTime,
      adScheduleEndTime,
      phoneNumber,
      adSets,
    } = jobData.formData;

    const isCatalogueJob = adType === "catalogue";
    const getJobAdSetProductSetId = (adSetId) => {
      const adset = (adSets || []).find((entry) => entry.id === adSetId);
      return adset?.promoted_object?.product_set_id || null;
    };
    const hasCatalogueProductSetForJob = duplicateAdSet
      ? Boolean(getJobAdSetProductSetId(duplicateAdSet))
      : selectedAdSets.length > 0 && selectedAdSets.every((adSetId) => Boolean(getJobAdSetProductSetId(adSetId)));

    setIsCreatingAds(true);
    setProgress(0);
    setProgressMessage("Starting ad creation...");

    if (uploadingToS3) {
      setPublishPending(true);
      toast.info("Waiting for video upload to finish...");
      throw new Error("A video upload was still in progress. Please try publishing this job again.");
    }

    if (selectedAdSets.length === 0 && !duplicateAdSet) {
      toast.error("Please select at least one ad set");
      throw new Error("Please select at least one ad set");
    }

    if (
      !isCatalogueJob &&
      files.length === 0 &&
      driveFiles.length === 0 &&
      dropboxFiles.length === 0 &&
      frameioFiles.length === 0 &&
      importedPosts.length === 0 &&
      importedFiles.length === 0 &&
      (!selectedIgOrganicPosts || selectedIgOrganicPosts.length === 0)
    ) {
      toast.error("Please upload at least one file or import from Drive");
      throw new Error("Please upload at least one file or import from Drive");
    }

    if (isCatalogueJob && !hasCatalogueProductSetForJob) {
      toast.error("Catalogue ads require selected ad sets with a product set ID");
      throw new Error("Catalogue ads require selected ad sets with a product set ID");
    }

    if (isCatalogueJob) {
      const catalogueMedia = [...files, ...driveFiles, ...dropboxFiles, ...(frameioFiles || []), ...(importedFiles || [])];
      if (catalogueMedia.some((file) => isVideoFile(file) || isGifFile(file) || !isImageFile(file))) {
        toast.error("Catalogue ads support image files only. Videos and GIFs are not supported.");
        throw new Error("Catalogue ads support image files only. Videos and GIFs are not supported.");
      }
    }

    if (files.some((file) => file.isDraftAsset && file.isMissingDraftAsset)) {
      throw new Error("This draft contains media that was removed after publishing. Remove or replace the unavailable file before publishing again.");
    }

    if (showShopDestinationSelector && !selectedShopDestination) {
      toast.error("Please select a shop destination for shop ads");
      throw new Error("Please select a shop destination for shop ads");
    }
    if (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === "")) {
      toast.error("Please enter a name for the new ad set");
      throw new Error("Please enter a name for the new ad set");
    }

    // Resize any local image whose width or height exceeds Meta's 9000px limit
    // down to half-dimension. Runs sequentially off the main thread (pica uses
    // its own internal worker pool) to keep peak memory low and the UI responsive.
    // Note: Drive/Dropbox/Frame.io files are fetched server-side and never enter
    // the browser, so they require a server-side resize (e.g. sharp) before being
    // forwarded to the Meta API.
    if (files.some((f) => f && typeof f.type === "string" && f.type.startsWith("image/"))) {
      try {
        files = await withTimeout(
          resizeOversizedImages(files, null, signal),
          PRE_JOB_RESIZE_TIMEOUT_MS,
          "Image resizing took too long. Please try again with fewer or smaller images.",
          signal,
        );
      } catch (err) {
        if (err?.name === "AbortError" || err?.name === "TimeoutError") throw err;
        console.error("Image resize failed, falling back to originals:", err);
      }
      throwIfCancelled();
    }

    let aspectRatioMap = {};
    // Replace your existing code with this:
    if (enablePlacementCustomization) {
      setProgressMessage("Analyzing video files...");

      try {
        const allFiles = [...files, ...driveFiles, ...dropboxFiles, ...frameioFiles];
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
                const key = getFileId(file); // ← Use getFileId here too
                return { key, aspectRatio: 16 / 9 }; // Default fallback
              }
            });

            // Wait for batch to complete
            const results = await Promise.all(batchPromises);

            // Add results to map
            results.forEach((result) => {
              if (result) {
                aspectRatioMap[result.key] = result.aspectRatio;
              }
            });

            // Let UI breathe between batches (only if more batches remain)
            if (i + BATCH_SIZE < videoFiles.length) {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        }
      } catch (error) {
        console.error("Error getting video aspect ratios:", error);
        // Continue anyway with defaults
      }

      if (importedFiles && importedFiles.length > 0) {
        importedFiles.forEach((file) => {
          if (file.width && file.height) {
            const aspectRatio = file.width / file.height;
            const key = file.type === "image" ? file.hash : file.id;
            aspectRatioMap[key] = aspectRatio;
          }
        });
      }
    }

    const largeFiles = files.filter((file) => !file.isDraftAsset && isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD);
    const largeDriveFiles = driveFiles.filter((file) => isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD);
    const largeDropboxFiles = dropboxFiles.filter((file) => isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD);
    // Frame.io videos always go to S3 (matches Drive/Dropbox large-video pattern).
    // Frame.io images skip S3 — backend streams them from Frame.io directly.
    const largeFrameioFiles = frameioFiles.filter((file) => isVideoFile(file));

    let restoredDraftAssets = files
      .filter((file) => file.isDraftAsset && file.draftId && file.draftMediaId)
      .map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || file.mimeType || "",
        s3Url: file.s3Url || null,
        draftId: file.draftId,
        draftMediaId: file.draftMediaId,
        draftAdAccountId: file.draftAdAccountId || selectedAdAccount,
        uniqueId: getFileId(file),
      }));
    const s3Results = [];
    const s3DriveResults = [];
    const s3DropboxResults = [];
    const s3FrameioResults = [];

    const totalLargeFiles = largeFiles.length + largeDriveFiles.length + largeDropboxFiles.length + largeFrameioFiles.length;
    if (totalLargeFiles > 0) {
      setUploadingToS3(true);
      setProgressMessage(`Uploading videos...`);

      try {
        // Set up concurrency limiter
        const limit = pLimit(3);
        const localS3RetryLimit = pLimit(1);

        const CHUNK_SIZE = 10 * 1024 * 1024;
        const allFiles = largeFiles; // Or largeFiles + largeDriveFiles if needed

        const totalChunksAllFiles = allFiles.reduce((sum, file) => sum + Math.ceil(file.size / CHUNK_SIZE), 0);
        let uploadedChunks = 0;

        const updateOverallProgress = () => {
          if (signal?.aborted) return; // Don't update progress after cancel
          uploadedChunks += 1;
          const percent = Math.round((uploadedChunks / totalChunksAllFiles) * 100);
          setProgress(percent);
          setProgressMessage("Uploading files for processing...");
        };

        const uploadPromises = largeFiles.map((file) =>
          limit(() => {
            throwIfCancelled();
            return uploadToS3(file, updateOverallProgress, getFileId(file), 2, signal, localS3RetryLimit);
          }),
        );

        const results = await Promise.allSettled(uploadPromises);

        // Process regular file results
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const uploadResult = result.value;
            if (enablePlacementCustomization && aspectRatioMap[getFileId(largeFiles[index])]) {
              uploadResult.aspectRatio = aspectRatioMap[getFileId(largeFiles[index])];
            }
            s3Results.push(uploadResult);
          } else {
            // Don't show error toast if this was a user cancellation
            const isCancellation = result.reason?.name === "AbortError" || axios.isCancel(result.reason) || signal?.aborted;

            if (!isCancellation) {
              toast.error(`Failed to upload ${largeFiles[index].name} due to weak network connection. Reload page to try again`);
            }
            console.error(`❌ Failed to upload ${largeFiles[index].name}:`, result.reason);
          }
        });

        // Upload Drive files with concurrency control
        const driveUploadPromises = largeDriveFiles.map((file) =>
          limit(() => {
            throwIfCancelled();
            return uploadDriveFileToS3(file, 3, signal);
          }),
        );

        const driveResults = await Promise.allSettled(driveUploadPromises);

        // Process Drive file results
        driveResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const uploadResult = result.value; // The complete object is now the result

            // Include aspect ratio if we have it
            if (enablePlacementCustomization && aspectRatioMap[getFileId(largeDriveFiles[index])]) {
              uploadResult.aspectRatio = aspectRatioMap[getFileId(largeDriveFiles[index])];
            }

            s3DriveResults.push(uploadResult);
          } else {
            const isCancellation = result.reason?.name === "AbortError" || axios.isCancel(result.reason) || signal?.aborted;

            if (!isCancellation) {
              toast.error(`Failed to upload Drive video: ${largeDriveFiles[index].name}`);
            }
            console.error("❌ Google Drive to S3 upload failed", result.reason);
          }
        });

        // Upload Dropbox files with concurrency control
        const dropboxUploadPromises = largeDropboxFiles.map((file) =>
          limit(() => {
            throwIfCancelled();
            return uploadDropboxFileToS3(file, 3, signal);
          }),
        );

        const dropboxResults = await Promise.allSettled(dropboxUploadPromises);

        // Process Dropbox file results
        dropboxResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const uploadResult = result.value;
            if (enablePlacementCustomization && aspectRatioMap[getFileId(largeDropboxFiles[index])]) {
              uploadResult.aspectRatio = aspectRatioMap[getFileId(largeDropboxFiles[index])];
            }
            uploadResult.dropboxId = largeDropboxFiles[index].dropboxId; // ✅ Add this if missing
            s3DropboxResults.push(uploadResult);
          } else {
            const isCancellation = result.reason?.name === "AbortError" || axios.isCancel(result.reason) || signal?.aborted;

            if (!isCancellation) {
              toast.error(`Failed to upload Dropbox video: ${largeDriveFiles[index].name}`);
            }
            console.error("❌ Dropbox to S3 upload failed", result.reason);
          }
        });

        // Upload Frame.io files with concurrency control (always uploaded to S3)
        const frameioUploadPromises = largeFrameioFiles.map((file) =>
          limit(() => {
            throwIfCancelled();
            return uploadFrameioFileToS3(file, 3, signal);
          }),
        );

        const frameioResults = await Promise.allSettled(frameioUploadPromises);

        frameioResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const uploadResult = result.value;
            if (enablePlacementCustomization && aspectRatioMap[getFileId(largeFrameioFiles[index])]) {
              uploadResult.aspectRatio = aspectRatioMap[getFileId(largeFrameioFiles[index])];
            }
            uploadResult.frameioId = largeFrameioFiles[index].frameioId;
            s3FrameioResults.push(uploadResult);
          } else {
            const isCancellation = result.reason?.name === "AbortError" || axios.isCancel(result.reason) || signal?.aborted;

            if (!isCancellation) {
              toast.error(`Failed to upload Frame.io file: ${largeFrameioFiles[index].name}`);
            }
            console.error("❌ Frame.io to S3 upload failed", result.reason);
          }
        });

        throwIfCancelled();
        setProgress(100);
        setProgressMessage("File upload complete! Creating ads...");
        // toast.success("Video files uploaded!");
      } finally {
        setUploadingToS3(false);
      }
    }

    const restoredDraftVideos = files.filter((file) => file.isDraftAsset && isVideoFile(file) && file.draftId && file.draftMediaId);
    if (restoredDraftVideos.length > 0) {
      setProgressMessage("Refreshing secure draft media links...");
      const refreshLimit = pLimit(3);
      const refreshedVideos = await Promise.all(
        restoredDraftVideos.map((file) =>
          refreshLimit(async () => {
            throwIfCancelled();
            const freshUrl = await refreshDraftMediaUrl({
              draftId: file.draftId,
              adAccountId: file.draftAdAccountId || selectedAdAccount,
              mediaId: file.draftMediaId,
              signal,
            });
            return {
              name: file.name,
              type: file.type || file.mimeType,
              size: file.size,
              s3Url: freshUrl,
              isS3Upload: true,
              isDraftAsset: true,
              uniqueId: getFileId(file),
              draftId: file.draftId,
              draftMediaId: file.draftMediaId,
              draftAdAccountId: file.draftAdAccountId || selectedAdAccount,
              width: file.width || null,
              height: file.height || null,
              aspectRatio: aspectRatioMap[getFileId(file)] || (file.width && file.height ? file.width / file.height : null) || 16 / 9,
            };
          }),
        ),
      );
      s3Results.push(...refreshedVideos);
      const refreshedUrlByMediaId = new Map(refreshedVideos.map((video) => [video.draftMediaId, video.s3Url]));
      restoredDraftAssets = restoredDraftAssets.map((media) => ({
        ...media,
        s3Url: refreshedUrlByMediaId.get(media.draftMediaId) || media.s3Url,
      }));
    }

    throwIfCancelled(); // ADD THIS LINE
    // 🔧 NOW start the actual job (50-100% progress)
    const frontendJobId = uuidv4();
    currentJobIdRef.current = frontendJobId;
    const smallDriveFiles = driveFiles.filter((file) => !(isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD));

    const smallDropboxFiles = dropboxFiles.filter((file) => !(isVideoFile(file) && file.size > S3_UPLOAD_THRESHOLD));
    // Frame.io images stream as JSON blobs (backend fetches from Frame.io directly)
    const smallFrameioFiles = frameioFiles.filter((file) => !isVideoFile(file));

    // Determine the ad set(s) to use: if "Create New AdSet" is chosen, duplicate it
    let finalAdSetIds = [...selectedAdSets];
    if (duplicateAdSet) {
      try {
        throwIfCancelled();
        const newAdSetId = await duplicateAdSetRequest(duplicateAdSet, selectedCampaign[0], selectedAdAccount, newAdSetName.trim(), signal);
        finalAdSetIds = [newAdSetId];
        jobData.formData.selectedAdSets = [newAdSetId];
        onAdSetCreated?.({
          newAdSetId,
          sourceAdSetId: duplicateAdSet,
          name: newAdSetName.trim(),
          campaignId: selectedCampaign[0],
        });
      } catch (error) {
        if (signal.aborted || error?.name === "AbortError" || axios.isCancel(error)) {
          throw new DOMException("Job cancelled. Some Ads might still have been made.", "AbortError");
        }
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
          const group = getGroupFileIds(fileGroups[i]);
          if (enablePlacementCustomization && (group.length < 4 || group.length > 20 || group.length % 2 !== 0)) {
            toast.error(`Placement carousel group ${i + 1} needs 4–20 assets paired as 9:16 + square/4:5`);
            setIsLoading(false);
            throw new Error(`Placement carousel group ${i + 1} needs 4–20 assets paired as 9:16 + square/4:5`);
          }
          if (!enablePlacementCustomization && group.length < 2) {
            toast.error(`Carousel group ${i + 1} needs at least 2 cards`);
            setIsLoading(false);
            throw new Error(`Carousel group ${i + 1} needs at least 2 cards`);
          }
          if (!enablePlacementCustomization && group.length > 10) {
            toast.error(`Carousel group ${i + 1} can have maximum 10 cards`);
            setIsLoading(false);
            throw new Error(`Carousel group ${i + 1} can have maximum 10 cards`);
          }
        }
      } else {
        const totalFiles = files.length + driveFiles.length + dropboxFiles.length + frameioFiles.length + (importedFiles?.length || 0);
        if (enablePlacementCustomization) {
          toast.error("Group files into paired carousel cards before publishing");
          setIsLoading(false);
          throw new Error("Placement customized carousel ads require grouped square/vertical asset pairs");
        }
        if (totalFiles < 2) {
          toast.error("Carousel ads require at least 2 files");
          setIsLoading(false);
          throw new Error("Carousel ads require at least 2 files");
        }
        if (totalFiles > 10) {
          toast.error("Carousel ads can have maximum 10 cards");
          setIsLoading(false);
          throw new Error("Carousel ads can have maximum 10 cards");
        }
      }
    }

    // Add flex-like ads validation
    if (isFlexLikeAdType) {
      const totalFiles = files.length + driveFiles.length + dropboxFiles.length + frameioFiles.length + (importedFiles?.length || 0);

      // If no groups, validate single ad
      if (fileGroups.length === 0) {
        if (totalFiles > 10) {
          toast.error("This ad type can have maximum 10 files per ad. Use grouping to create multiple ads.");
          setIsLoading(false);
          throw new Error("This ad type can have maximum 10 files per ad. Use grouping to create multiple ads.");
        }
        if (totalFiles < 1) {
          toast.error("This ad type requires at least 1 file");
          setIsLoading(false);
          throw new Error("This ad type requires at least 1 file");
        }
      } else {
        // Validate groups
        const hasInvalidGroup = fileGroups.some((group) => group.length > 10);
        if (hasInvalidGroup) {
          toast.error("Each ad group can have maximum 10 files");
          setIsLoading(false);
          throw new Error("Each ad group can have maximum 10 files");
        }
      }
    }

    /**
     * Pre-compute common values that don't change per iteration
     */
    const preComputeCommonValues = (headlines, descriptions, messages, link) => {
      return {
        headlinesJSON: JSON.stringify(sanitizeMetaAdTextOptions(headlines)),
        descriptionsJSON: JSON.stringify(sanitizeMetaAdTextOptions(descriptions)),
        messagesJSON: JSON.stringify(sanitizeMetaAdTextOptions(messages)),
        linkJSON: JSON.stringify(link),
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
        partnershipPrimaryIdentity,
        adScheduleStartTime,
        adScheduleEndTime,
      },
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
        formData.append("destinationType", destinationType === "instant_experience" ? "instant_experience" : "website");
        if (destinationType === "instant_experience" && instantExperienceId) {
          formData.append("instantExperienceId", instantExperienceId);
        }
      }
      formData.append("cta", resolveCtaForServer(cta));
      formData.append("launchPaused", launchPaused);
      formData.append("discloseAiMedia", String(Boolean(discloseAiMedia)));
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
        if (partnershipIdentityMode === "first_identity_only") {
          formData.append("partnershipIdentityMode", "first_identity_only");
        } else if (partnershipIdentityMode === "both_identities") {
          formData.append("partnershipIdentityMode", "both_identities");
          formData.append("partnershipPrimaryIdentity", partnershipPrimaryIdentity);
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
        smallFrameioFiles = [],
        s3Results,
        s3DriveResults,
        s3DropboxResults,
        s3FrameioResults = [],
        S3_UPLOAD_THRESHOLD,
        getFileId,
        isVideoFile,
        aspectRatioMap,
        importedFiles,
      },
    ) => {
      const groupVideoMetadata = [];

      // Add local files from this group
      group.forEach((fileId) => {
        const file = files.find((f) => getFileId(f) === fileId);
        if (
          file &&
          (!file.isDraftAsset || !isVideoFile(file)) &&
          !file.isDrive &&
          !file.isDropbox &&
          (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD)
        ) {
          formData.append("mediaFiles", file);

          if (isVideoFile(file)) {
            groupVideoMetadata.push({
              fileName: file.name,
              uniqueId: getFileId(file),
              aspectRatio: aspectRatioMap[getFileId(file)] || 16 / 9,
            });
          }
        }
      });

      // Add drive files from this group
      group.forEach((fileId) => {
        const driveFile = smallDriveFiles.find((f) => f.id === fileId);
        if (driveFile) {
          formData.append(
            "driveFiles",
            JSON.stringify({
              id: driveFile.id,
              name: driveFile.name,
              mimeType: driveFile.mimeType,
            }),
          );

          if (isVideoFile(driveFile)) {
            groupVideoMetadata.push({
              driveId: driveFile.id,
              aspectRatio: aspectRatioMap[getFileId(driveFile)] || 16 / 9,
            });
          }
        }
      });

      // Add dropbox files from this group
      group.forEach((fileId) => {
        const dropboxFile = smallDropboxFiles.find((f) => f.dropboxId === fileId);
        if (dropboxFile) {
          formData.append(
            "dropboxFiles",
            JSON.stringify({
              dropboxId: dropboxFile.dropboxId,
              name: dropboxFile.name,
              directLink: dropboxFile.directLink,
              mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name),
            }),
          );

          if (isVideoFile(dropboxFile)) {
            groupVideoMetadata.push({
              dropboxId: dropboxFile.dropboxId,
              aspectRatio: aspectRatioMap[getFileId(dropboxFile)] || 16 / 9,
            });
          }
        }
      });

      // Add Frame.io image files from this group (videos go through s3 below)
      group.forEach((fileId) => {
        const frameioFile = smallFrameioFiles.find((f) => f.frameioId === fileId);
        if (frameioFile) {
          formData.append(
            "frameioFiles",
            JSON.stringify({
              frameioId: frameioFile.frameioId,
              frameioAccountId: frameioFile.frameioAccountId,
              name: frameioFile.name,
              mimeType: frameioFile.mimeType || getMimeFromName(frameioFile.name),
            }),
          );
        }
      });

      // Add ALL S3 files from this group (local, drive, dropbox, frameio videos)
      group.forEach((fileId) => {
        const allS3Results = [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...s3FrameioResults];

        const s3File = allS3Results.find((f) => f.uniqueId === fileId || f.id === fileId || f.dropboxId === fileId || f.frameioId === fileId);

        if (s3File) {
          formData.append("s3VideoUrls", s3File.s3Url);
          formData.append("s3VideoNames", s3File.name);
          groupVideoMetadata.push({
            s3Url: s3File.s3Url,
            aspectRatio: s3File.aspectRatio || 16 / 9,
          });
        }
      });

      // Add meta library files from this group
      group.forEach((fileId) => {
        const metaFile = (importedFiles || []).find((f) => (f.type === "image" && f.hash === fileId) || (f.type === "video" && f.id === fileId));
        if (metaFile) {
          if (metaFile.type === "image") {
            formData.append("metaImageHashes", metaFile.hash);
            formData.append("metaImageNames", metaFile.name);
            formData.append("metaImageWidths", String(metaFile.width || 0));
            formData.append("metaImageHeights", String(metaFile.height || 0));
          } else if (metaFile.type === "video") {
            formData.append("metaVideoIds", metaFile.id);
            formData.append("metaVideoNames", metaFile.name);
            formData.append("metaVideoWidths", String(metaFile.width || 0));
            formData.append("metaVideoHeights", String(metaFile.height || 0));

            groupVideoMetadata.push({
              metaVideoId: metaFile.id,
              aspectRatio: metaFile.width && metaFile.height ? metaFile.width / metaFile.height : 16 / 9,
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
        smallFrameioFiles = [],
        s3Results,
        s3DriveResults,
        s3DropboxResults,
        s3FrameioResults = [],
        S3_UPLOAD_THRESHOLD,
        importedFiles,
      },
    ) => {
      // Add all small local files
      files.forEach((file) => {
        if ((!file.isDraftAsset || !isVideoFile(file)) && (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD)) {
          formData.append("mediaFiles", file);
        }
      });

      // Add all small drive files
      smallDriveFiles.forEach((driveFile) => {
        formData.append(
          "driveFiles",
          JSON.stringify({
            id: driveFile.id,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
          }),
        );
      });

      smallDropboxFiles.forEach((dropboxFile) => {
        formData.append(
          "dropboxFiles",
          JSON.stringify({
            dropboxId: dropboxFile.dropboxId,
            name: dropboxFile.name,
            directLink: dropboxFile.directLink,
            mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name),
          }),
        );
      });

      // Frame.io image files (videos go through s3FrameioResults below)
      smallFrameioFiles.forEach((frameioFile) => {
        formData.append(
          "frameioFiles",
          JSON.stringify({
            frameioId: frameioFile.frameioId,
            frameioAccountId: frameioFile.frameioAccountId,
            name: frameioFile.name,
            mimeType: frameioFile.mimeType || getMimeFromName(frameioFile.name),
          }),
        );
      });

      // Add all large file URLs (S3) — includes Frame.io videos
      [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...s3FrameioResults].forEach((s3File) => {
        formData.append("s3VideoUrls", s3File.s3Url);
        formData.append("s3VideoNames", s3File.name);
      });

      if (importedFiles && importedFiles.length > 0) {
        const metaImages = importedFiles.filter((f) => f.type === "image");
        const metaVideos = importedFiles.filter((f) => f.type === "video");

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

    const appendSingleFrameioFile = (formData, frameioFile) => {
      formData.append("enablePlacementCustomization", false);
      formData.append("frameioFile", "true");
      formData.append("frameioId", frameioFile.frameioId);
      formData.append("frameioAccountId", frameioFile.frameioAccountId);
      formData.append("frameioName", frameioFile.name);
      formData.append("frameioMimeType", frameioFile.mimeType || getMimeFromName(frameioFile.name));
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
      dropboxFiles, // ADD THIS
      frameioFiles,
      s3Results,
      s3DriveResults,
      s3DropboxResults, // ADD THIS
      s3FrameioResults,
      S3_UPLOAD_THRESHOLD,
      importedFiles, // ADD THIS PARAMETER
    ) => {
      const fileOrder = [];
      let fileIndex = 0;

      // Process files in the order they appear in the UI
      files.forEach((file) => {
        const usesS3Url = isVideoFile(file) && (file.isDraftAsset || file.size > S3_UPLOAD_THRESHOLD);
        if (!usesS3Url) {
          fileOrder.push({
            index: fileIndex++,
            type: "local",
            name: file.name,
          });
        } else {
          const fileId = getFileId(file);
          const s3File = s3Results.find((s3f) => s3f.uniqueId === fileId || s3f.name === file.name);
          if (s3File) {
            fileOrder.push({
              index: fileIndex++,
              type: "s3",
              url: s3File.s3Url,
              name: file.name,
            });
          }
        }
      });

      // Process drive files
      driveFiles.forEach((driveFile) => {
        if (!isVideoFile(driveFile) || driveFile.size <= S3_UPLOAD_THRESHOLD) {
          fileOrder.push({
            index: fileIndex++,
            type: "drive",
            id: driveFile.id,
            name: driveFile.name,
          });
        } else {
          const s3DriveFile = s3DriveResults.find((s3f) => s3f.id === driveFile.id);
          if (s3DriveFile) {
            fileOrder.push({
              index: fileIndex++,
              type: "s3",
              url: s3DriveFile.s3Url,
              name: driveFile.name,
              driveId: driveFile.id,
            });
          }
        }
      });

      // Process dropbox files
      dropboxFiles.forEach((dropboxFile) => {
        if (!isVideoFile(dropboxFile) || dropboxFile.size <= S3_UPLOAD_THRESHOLD) {
          fileOrder.push({
            index: fileIndex++,
            type: "dropbox",
            dropboxId: dropboxFile.dropboxId,
            name: dropboxFile.name,
          });
        } else {
          const s3DropboxFile = s3DropboxResults.find((s3f) => s3f.dropboxId === dropboxFile.dropboxId);
          if (s3DropboxFile) {
            fileOrder.push({
              index: fileIndex++,
              type: "s3",
              url: s3DropboxFile.s3Url,
              name: dropboxFile.name,
              dropboxId: dropboxFile.dropboxId,
            });
          }
        }
      });

      // Process frame.io files: videos go through S3, images stream as JSON blobs
      (frameioFiles || []).forEach((frameioFile) => {
        if (isVideoFile(frameioFile)) {
          const s3FrameioFile = (s3FrameioResults || []).find((s3f) => s3f.frameioId === frameioFile.frameioId);
          if (s3FrameioFile) {
            fileOrder.push({
              index: fileIndex++,
              type: "s3",
              url: s3FrameioFile.s3Url,
              name: frameioFile.name,
              frameioId: frameioFile.frameioId,
            });
          }
        } else {
          fileOrder.push({
            index: fileIndex++,
            type: "frameio",
            frameioId: frameioFile.frameioId,
            name: frameioFile.name,
          });
        }
      });

      if (importedFiles && importedFiles.length > 0) {
        importedFiles.forEach((metaFile) => {
          if (metaFile.type === "image") {
            fileOrder.push({
              index: fileIndex++,
              type: "metaImage",
              hash: metaFile.hash,
              name: metaFile.name,
            });
          } else if (metaFile.type === "video") {
            fileOrder.push({
              index: fileIndex++,
              type: "metaVideo",
              id: metaFile.id,
              name: metaFile.name,
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
    const getCarouselPlacementMetadata = (file, fileId, uploadedFile = null) => {
      const aspectRatio = uploadedFile?.aspectRatio || aspectRatioMap[fileId] || (file?.width && file?.height ? file.width / file.height : null);
      return {
        ...(aspectRatio && { aspectRatio }),
        ...(file?.width && { width: file.width }),
        ...(file?.height && { height: file.height }),
      };
    };

    const buildCarouselFileOrderForGroup = (
      group,
      files,
      driveFiles,
      dropboxFiles,
      frameioFiles,
      s3Results,
      s3DriveResults,
      s3DropboxResults,
      s3FrameioResults,
      S3_UPLOAD_THRESHOLD,
      importedFiles,
    ) => {
      const fileOrder = [];
      let fileIndex = 0;

      group.forEach((fileId) => {
        // Check local files
        const localFile = files.find((f) => getFileId(f) === fileId);
        if (localFile) {
          if (isVideoFile(localFile) && (localFile.isDraftAsset || localFile.size > S3_UPLOAD_THRESHOLD)) {
            const s3File = s3Results.find((s3f) => s3f.uniqueId === fileId || s3f.name === localFile.name);
            if (s3File) {
              fileOrder.push({
                index: fileIndex++,
                type: "s3",
                url: s3File.s3Url,
                name: localFile.name,
                ...getCarouselPlacementMetadata(localFile, fileId, s3File),
              });
            }
          } else {
            fileOrder.push({ index: fileIndex++, type: "local", name: localFile.name, ...getCarouselPlacementMetadata(localFile, fileId) });
          }
          return;
        }

        // Check drive files
        const driveFile = driveFiles.find((f) => f.id === fileId);
        if (driveFile) {
          if (isVideoFile(driveFile) && driveFile.size > S3_UPLOAD_THRESHOLD) {
            const s3File = s3DriveResults.find((s3f) => s3f.id === fileId);
            if (s3File) {
              fileOrder.push({
                index: fileIndex++,
                type: "s3",
                url: s3File.s3Url,
                name: driveFile.name,
                driveId: driveFile.id,
                ...getCarouselPlacementMetadata(driveFile, fileId, s3File),
              });
            }
          } else {
            fileOrder.push({
              index: fileIndex++,
              type: "drive",
              id: driveFile.id,
              name: driveFile.name,
              ...getCarouselPlacementMetadata(driveFile, fileId),
            });
          }
          return;
        }

        // Check dropbox files
        const dropboxFile = dropboxFiles.find((f) => f.dropboxId === fileId);
        if (dropboxFile) {
          if (isVideoFile(dropboxFile) && dropboxFile.size > S3_UPLOAD_THRESHOLD) {
            const s3File = s3DropboxResults.find((s3f) => s3f.dropboxId === fileId);
            if (s3File) {
              fileOrder.push({
                index: fileIndex++,
                type: "s3",
                url: s3File.s3Url,
                name: dropboxFile.name,
                dropboxId: dropboxFile.dropboxId,
                ...getCarouselPlacementMetadata(dropboxFile, fileId, s3File),
              });
            }
          } else {
            fileOrder.push({
              index: fileIndex++,
              type: "dropbox",
              dropboxId: dropboxFile.dropboxId,
              name: dropboxFile.name,
              ...getCarouselPlacementMetadata(dropboxFile, fileId),
            });
          }
          return;
        }

        // Check frame.io files: videos via S3, images via JSON blob
        const frameioFile = (frameioFiles || []).find((f) => f.frameioId === fileId);
        if (frameioFile) {
          if (isVideoFile(frameioFile)) {
            const s3File = (s3FrameioResults || []).find((s3f) => s3f.frameioId === fileId);
            if (s3File) {
              fileOrder.push({
                index: fileIndex++,
                type: "s3",
                url: s3File.s3Url,
                name: frameioFile.name,
                frameioId: frameioFile.frameioId,
                ...getCarouselPlacementMetadata(frameioFile, fileId, s3File),
              });
            }
          } else {
            fileOrder.push({
              index: fileIndex++,
              type: "frameio",
              frameioId: frameioFile.frameioId,
              name: frameioFile.name,
              ...getCarouselPlacementMetadata(frameioFile, fileId),
            });
          }
          return;
        }

        // Check S3 results (for files that were already uploaded)
        const allS3 = [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...(s3FrameioResults || [])];
        const s3File = allS3.find((f) => f.uniqueId === fileId || f.id === fileId || f.dropboxId === fileId || f.frameioId === fileId);
        if (s3File) {
          fileOrder.push({
            index: fileIndex++,
            type: "s3",
            url: s3File.s3Url,
            name: s3File.name,
            ...getCarouselPlacementMetadata(s3File, fileId, s3File),
          });
          return;
        }

        // Check meta library files
        if (importedFiles) {
          const metaFile = importedFiles.find((f) => (f.type === "image" && f.hash === fileId) || (f.type === "video" && f.id === fileId));
          if (metaFile) {
            if (metaFile.type === "image") {
              fileOrder.push({
                index: fileIndex++,
                type: "metaImage",
                hash: metaFile.hash,
                name: metaFile.name,
                ...getCarouselPlacementMetadata(metaFile, fileId),
              });
            } else {
              fileOrder.push({
                index: fileIndex++,
                type: "metaVideo",
                id: metaFile.id,
                name: metaFile.name,
                ...getCarouselPlacementMetadata(metaFile, fileId),
              });
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
        smallFrameioFiles = [],
        s3Results,
        s3DriveResults,
        s3DropboxResults,
        s3FrameioResults = [],
        S3_UPLOAD_THRESHOLD,
        importedFiles,
      },
    ) => {
      group.forEach((fileId) => {
        // Local files
        const localFile = files.find((f) => getFileId(f) === fileId);
        if (localFile && !localFile.isDrive && !localFile.isDropbox) {
          if (localFile.isDraftAsset && isVideoFile(localFile)) {
            const s3File = s3Results.find((s3Result) => s3Result.uniqueId === fileId || s3Result.name === localFile.name);
            if (s3File) {
              formData.append("s3VideoUrls", s3File.s3Url);
              formData.append("s3VideoNames", s3File.name);
            }
          } else if (!isVideoFile(localFile) || localFile.size <= S3_UPLOAD_THRESHOLD) {
            formData.append("mediaFiles", localFile);
          }
          return;
        }

        // Drive files
        const driveFile = smallDriveFiles.find((f) => f.id === fileId);
        if (driveFile) {
          formData.append(
            "driveFiles",
            JSON.stringify({
              id: driveFile.id,
              name: driveFile.name,
              mimeType: driveFile.mimeType,
            }),
          );
          return;
        }

        // Dropbox files
        const dropboxFile = smallDropboxFiles.find((f) => f.dropboxId === fileId);
        if (dropboxFile) {
          formData.append(
            "dropboxFiles",
            JSON.stringify({
              dropboxId: dropboxFile.dropboxId,
              name: dropboxFile.name,
              directLink: dropboxFile.directLink,
              mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name),
            }),
          );
          return;
        }

        // Frame.io image files (videos go through s3 below)
        const frameioFile = smallFrameioFiles.find((f) => f.frameioId === fileId);
        if (frameioFile) {
          formData.append(
            "frameioFiles",
            JSON.stringify({
              frameioId: frameioFile.frameioId,
              frameioAccountId: frameioFile.frameioAccountId,
              name: frameioFile.name,
              mimeType: frameioFile.mimeType || getMimeFromName(frameioFile.name),
            }),
          );
          return;
        }

        // S3 files (videos only — local, drive, dropbox, frameio video)
        const allS3 = [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...s3FrameioResults];
        const s3File = allS3.find((f) => f.uniqueId === fileId || f.id === fileId || f.dropboxId === fileId || f.frameioId === fileId);
        if (s3File) {
          formData.append("s3VideoUrls", s3File.s3Url);
          formData.append("s3VideoNames", s3File.name);
          return;
        }

        // Meta library files
        if (importedFiles) {
          const metaFile = importedFiles.find((f) => (f.type === "image" && f.hash === fileId) || (f.type === "video" && f.id === fileId));
          if (metaFile) {
            if (metaFile.type === "image") {
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
        if (signal?.aborted) throw new DOMException("Job cancelled. Some Ads might still have been made.", "AbortError");
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/create-ad`, formData, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
            signal,
          });

          return response;
        } catch (error) {
          if (!error.response || error.code === "ECONNRESET") {
            throw error;
          }

          if (error.response && error.response.status === 400) {
            console.error("Create Ad Logic Error received (not retrying):", error.response.data);
            throw error;
          }

          if (attempt === maxRetries - 1) {
            throw error;
          }

          const delay = baseDelay * Math.pow(1.5, attempt) + Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };

    try {
      const promises = [];
      const promiseMetadata = []; // ADD THIS
      const draftMediaForRequest = (formData) => {
        if (restoredDraftAssets.length === 0) return [];
        const values = [...formData.values()];
        const stringValues = values.filter((value) => typeof value === "string");
        const requestFiles = values.filter((value) => typeof File !== "undefined" && value instanceof File);
        return restoredDraftAssets.filter(
          (media) =>
            requestFiles.some(
              (file) =>
                file.draftMediaId === media.draftMediaId || (file.name === media.name && file.size === media.size && file.type === media.type),
            ) ||
            (media.s3Url && stringValues.some((value) => value.includes(media.s3Url))),
        );
      };
      const queueCreateAdPromise = (formData, metadata = {}) => {
        const selectedPixelTrackingOverride = Object.fromEntries(Object.entries(pixelTrackingOverride || {}).filter(([, value]) => Boolean(value)));
        if (Object.keys(selectedPixelTrackingOverride).length > 0) {
          formData.append("pixelTrackingOverride", JSON.stringify(selectedPixelTrackingOverride));
        }
        if (jobProductExtensionProductSetId && !formData.has("productExtensionProductSetId")) {
          formData.append("productExtensionProductSetId", jobProductExtensionProductSetId);
        }
        // One stable id per ad. Every create-ad request goes through here, so this
        // covers all ad types. The id is fixed at queue time (not per attempt), so a
        // retry — or a re-send of an in-flight request by the network layer — carries
        // the same id and the server can collapse it instead of making a second ad.
        if (!formData.has("clientRequestId")) {
          formData.append("clientRequestId", uuidv4());
        }
        promises.push(createAdApiCall(formData, API_BASE_URL, signal));
        promiseMetadata.push({
          adSetId: formData.get("adSetId"),
          adName: formData.get("adName"),
          ...metadata,
          draftMediaRefs: draftMediaForRequest(formData),
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

      if (isCatalogueJob) {
        const adSetIdsToUse = [...dynamicAdSetIds, ...nonDynamicAdSetIds];
        const catalogueMedia = [
          ...files.map((file) => ({ source: "local", file })),
          ...driveFiles.map((file) => ({ source: "drive", file })),
          ...dropboxFiles.map((file) => ({ source: "dropbox", file })),
          ...(frameioFiles || []).map((file) => ({ source: "frameio", file })),
          ...importedFiles.filter((file) => file.type === "image").map((file) => ({ source: "meta", file })),
        ];
        const catalogueAdsToCreate = catalogueMedia.length > 0 ? catalogueMedia : [null];
        let catalogueAdIndex = 0;

        adSetIdsToUse.forEach((adSetId) => {
          const productSetId = getJobAdSetProductSetId(adSetId) || (duplicateAdSet ? getJobAdSetProductSetId(duplicateAdSet) : null);
          if (!productSetId) {
            return;
          }

          catalogueAdsToCreate.forEach((media) => {
            const formData = new FormData();
            appendCommonFields(formData, {
              adName: computeAdNameFromFormula(media?.file || null, catalogueAdIndex, link[0], jobData.formData.adNameFormulaV2, adType),
              headlinesJSON: commonPrecomputed.headlinesJSON,
              descriptionsJSON: commonPrecomputed.descriptionsJSON,
              messagesJSON: commonPrecomputed.messagesJSON,
              selectedAdAccount,
              adSetId,
              pageId,
              instagramAccountId,
              linkJSON: commonPrecomputed.linkJSON,
              phoneNumber,
              usePhoneNumberField: false,
              cta,
              launchPaused,
              jobId: frontendJobId,
              selectedForm,
              isPartnershipAd,
              partnerIgAccountId,
              partnerFbPageId,
              partnershipIdentityMode,
              partnershipPrimaryIdentity,
              adScheduleStartTime,
              adScheduleEndTime,
            });
            formData.append("adType", "catalogue");
            formData.append("productSetId", productSetId);

            if (media?.source === "local") {
              appendSingleImageFile(formData, { file: media.file, thumbnail: null });
            } else if (media?.source === "drive") {
              appendSingleDriveFile(formData, media.file);
            } else if (media?.source === "dropbox") {
              appendSingleDropboxFile(formData, media.file);
            } else if (media?.source === "frameio") {
              appendSingleFrameioFile(formData, media.file);
            } else if (media?.source === "meta") {
              appendMetaImageFile(formData, media.file);
            }

            queueCreateAdPromise(formData, { fileName: media?.file?.name || "Catalogue Ad" });
            catalogueAdIndex += 1;
          });
        });
      }

      if (importedPosts && importedPosts.length > 0 && !editAdCreativeMode) {
        // For each adset, create ads from each imported post
        const adSetIdsToUse = [...dynamicAdSetIds, ...nonDynamicAdSetIds];
        const jobImportedPostAdNames = jobData.formData.importedPostAdNames || {};
        const resolvePostAdNameForJob = (post, postIndex) => {
          const key = post?.ad_id || post?.post_id || post?.id || "";
          const template = jobImportedPostAdNames[key] !== undefined ? jobImportedPostAdNames[key] : post?.ad_name || "";

          if (template && /\{\{[^}]+\}\}/.test(template)) {
            return computeAdNameFromFormula(
              { name: post.ad_name },
              postIndex,
              link[0],
              { ...(jobData.formData.adNameFormulaV2 || {}), rawInput: template },
              null,
            );
          }
          return template;
        };

        adSetIdsToUse.forEach((adSetId, adSetIndex) => {
          importedPosts.forEach((post, postIndex) => {
            const formData = new FormData();
            // Basic fields
            formData.append("adName", resolvePostAdNameForJob(post, postIndex));
            formData.append("adAccountId", selectedAdAccount);
            formData.append("adSetId", adSetId);
            formData.append("pageId", pageId);
            formData.append("instagramAccountId", instagramAccountId || "");
            formData.append("launchPaused", launchPaused);
            formData.append("discloseAiMedia", String(Boolean(discloseAiMedia)));
            formData.append("jobId", frontendJobId);

            // Send the creative ID for both modes so the backend can create a
            // fresh ad from the existing creative when an ad schedule is set.
            if (post.creative_id) {
              formData.append("creativeId", post.creative_id);
            }

            // POST-SPECIFIC: Send the post ID instead of media
            if (usePostID) {
              // Post ID mode - create ad from post using object_story_id
              formData.append("postId", post.post_id);
              formData.append("adType", "post");
            } else {
              // Duplication mode - use ad copies endpoint
              formData.append("adId", post.ad_id); // ← Changed from post.id to post.ad_id
              formData.append("adType", "duplication");
            }
            if (usePhoneNumberField) {
              formData.append("phoneNumber", phoneNumber);
            } else {
              formData.append("link", JSON.stringify(link));
            }

            if (adScheduleStartTime) formData.append("adScheduleStartTime", adScheduleStartTime);
            if (adScheduleEndTime) formData.append("adScheduleEndTime", adScheduleEndTime);

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
            formData.append("discloseAiMedia", String(Boolean(discloseAiMedia)));
            formData.append("jobId", frontendJobId);
            formData.append("cta", resolveCtaForServer(cta || "LEARN_MORE")); // placeholder CTA
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

      if (!isCatalogueJob && isCarouselAd && dynamicAdSetIds.length === 0) {
        if (selectedAdSets.length === 0 && !duplicateAdSet) {
          toast.error("Please select at least one ad set for carousel");
          throw new Error("Please select at least one ad set for carousel");
        }

        // Determine groups: if user grouped files, use those. Otherwise treat all files as 1 group.
        const carouselGroups = fileGroups && fileGroups.length > 0 ? fileGroups : [null]; // null = all files (backward compat)

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
              frameioFiles,
              s3Results,
              s3DriveResults,
              s3DropboxResults,
              s3FrameioResults,
              S3_UPLOAD_THRESHOLD,
              importedFiles,
            );
          } else {
            // Ungrouped: build order from all files (original behavior)
            groupFileOrder = buildCarouselFileOrder(
              files,
              driveFiles,
              dropboxFiles,
              frameioFiles,
              s3Results,
              s3DriveResults,
              s3DropboxResults,
              s3FrameioResults,
              S3_UPLOAD_THRESHOLD,
              importedFiles,
            );
          }

          if (enablePlacementCustomization && group && groupFileOrder.length !== getGroupFileIds(group).length) {
            throw new Error(`Could not prepare every asset in placement carousel group ${groupIndex + 1}`);
          }

          // Compute ad name for this group
          const firstFile = group
            ? (() => {
              const firstId = group[0];
              return (
                files.find((f) => getFileId(f) === firstId) ||
                driveFiles.find((f) => f.id === firstId) ||
                dropboxFiles.find((f) => f.dropboxId === firstId) ||
                frameioFiles.find((f) => f.frameioId === firstId) ||
                (importedFiles || []).find((f) => (f.type === "image" && f.hash === firstId) || (f.type === "video" && f.id === firstId)) ||
                files[0]
              );
            })()
            : files[0] || driveFiles[0] || dropboxFiles[0] || frameioFiles[0] || (importedFiles?.[0] ? { name: importedFiles[0].name } : null);

          const carouselAdName = computeAdNameFromFormula(firstFile, groupIndex, link[0], jobData.formData.adNameFormulaV2, adType);

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
              partnershipPrimaryIdentity,
              adScheduleStartTime,
              adScheduleEndTime,
            });

            // Carousel-specific fields
            formData.append("isCarouselAd", true);
            formData.append("enablePlacementCustomization", String(enablePlacementCustomization));
            formData.append("fileOrder", JSON.stringify(groupFileOrder));
            if (enablePlacementCustomization) {
              const placementCarouselCards = Array.from({ length: groupFileOrder.length / 2 }, (_, cardIndex) => [cardIndex * 2, cardIndex * 2 + 1]);
              formData.append("placementCarouselCards", JSON.stringify(placementCarouselCards));
            }

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
                smallFrameioFiles,
                s3Results,
                s3DriveResults,
                s3DropboxResults,
                s3FrameioResults,
                S3_UPLOAD_THRESHOLD,
                importedFiles,
              });
            } else {
              // Ungrouped: all files (backward compat)
              files.forEach((file) => {
                if ((!file.isDraftAsset || !isVideoFile(file)) && (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD)) {
                  formData.append("mediaFiles", file);
                }
              });

              smallDriveFiles.forEach((driveFile) => {
                formData.append(
                  "driveFiles",
                  JSON.stringify({
                    id: driveFile.id,
                    name: driveFile.name,
                    mimeType: driveFile.mimeType,
                  }),
                );
              });

              smallDropboxFiles.forEach((dropboxFile) => {
                formData.append(
                  "dropboxFiles",
                  JSON.stringify({
                    dropboxId: dropboxFile.dropboxId,
                    name: dropboxFile.name,
                    directLink: dropboxFile.directLink,
                    mimeType: dropboxFile.mimeType || getMimeFromName(dropboxFile.name),
                  }),
                );
              });

              smallFrameioFiles.forEach((frameioFile) => {
                formData.append(
                  "frameioFiles",
                  JSON.stringify({
                    frameioId: frameioFile.frameioId,
                    frameioAccountId: frameioFile.frameioAccountId,
                    name: frameioFile.name,
                    mimeType: frameioFile.mimeType || getMimeFromName(frameioFile.name),
                  }),
                );
              });

              [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...s3FrameioResults].forEach((s3File) => {
                formData.append("s3VideoUrls", s3File.s3Url);
                formData.append("s3VideoNames", s3File.name);
              });

              if (importedFiles && importedFiles.length > 0) {
                importedFiles
                  .filter((f) => f.type === "image")
                  .forEach((metaFile) => {
                    formData.append("metaImageHashes", metaFile.hash);
                    formData.append("metaImageNames", metaFile.name);
                  });
                importedFiles
                  .filter((f) => f.type === "video")
                  .forEach((metaFile) => {
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
      // SECTION 2: FLEX-LIKE ADS TO NON-DYNAMIC AD SETS
      // ============================================================================
      if (!isCatalogueJob && isFlexLikeAdType && nonDynamicAdSetIds.length > 0) {
        if (fileGroups.length > 0) {
          // GROUPED FLEXIBLE ADS: Create one ad per group per ad set

          // Pre-compute ad names for each group
          const groupAdNames = fileGroups.map((group, groupIndex) => {
            const firstFileId = group[0];
            const firstFile =
              files.find((f) => getFileId(f) === firstFileId) ||
              driveFiles.find((f) => f.id === firstFileId) ||
              dropboxFiles.find((f) => f.dropboxId === firstFileId) || // ADD
              frameioFiles.find((f) => f.frameioId === firstFileId) ||
              (importedFiles || []).find((f) => (f.type === "image" && f.hash === firstFileId) || (f.type === "video" && f.id === firstFileId));

            return computeAdNameFromFormula(
              firstFile || files[0] || driveFiles[0] || dropboxFiles[0] || frameioFiles[0],
              groupIndex,
              link[0],
              jobData.formData.adNameFormulaV2,
              adType,
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
                partnershipPrimaryIdentity,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              // Append flexible ad fields
              appendFlexibleAdFields(formData, {
                adType,
                totalGroups: fileGroups.length,
                currentGroupIndex: groupIndex + 1,
              });

              // Append group media files
              const groupVideoMetadata = appendGroupMediaFiles(formData, group, {
                files,
                smallDriveFiles,
                smallDropboxFiles,
                smallFrameioFiles,
                s3Results,
                s3DriveResults,
                s3DropboxResults,
                s3FrameioResults,
                S3_UPLOAD_THRESHOLD,
                getFileId,
                isVideoFile,
                aspectRatioMap,
                importedFiles,
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
            files[0] || driveFiles[0] || dropboxFiles[0] || frameioFiles[0] || (importedFiles?.[0] ? { name: importedFiles[0].name } : null),
            0,
            link[0],
            jobData.formData.adNameFormulaV2,
            adType,
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
              partnershipPrimaryIdentity,
              adScheduleStartTime,
              adScheduleEndTime,
            });

            // Append flexible ad fields
            appendFlexibleAdFields(formData, { adType });

            // Append all media files
            appendAllMediaFiles(formData, {
              files,
              smallDriveFiles,
              smallDropboxFiles,
              smallFrameioFiles,
              s3Results,
              s3DriveResults,
              s3DropboxResults,
              s3FrameioResults,
              S3_UPLOAD_THRESHOLD,
              importedFiles,
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
      if (!isCatalogueJob && dynamicAdSetIds.length > 0) {
        // Pre-compute ad name for dynamic ads
        const dynamicAdName = computeAdNameFromFormula(
          files[0] || driveFiles[0] || dropboxFiles[0] || frameioFiles[0],
          0,
          link[0],
          jobData.formData.adNameFormulaV2,
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
            partnershipPrimaryIdentity,
            adScheduleStartTime,
            adScheduleEndTime,
          });

          // Append dynamic ad set fields. Multi-media ads intentionally keep the
          // flex-like request shape so the server can build media_sourcing_spec.
          if (adType === "multi_media") {
            appendFlexibleAdFields(formData, { adType });
          } else {
            appendDynamicAdSetFields(formData, { isCarouselAd, thumbnail });
          }

          // Append all media files
          appendAllMediaFiles(formData, {
            files,
            smallDriveFiles,
            smallDropboxFiles,
            smallFrameioFiles,
            s3Results,
            s3DriveResults,
            s3DropboxResults,
            s3FrameioResults,
            S3_UPLOAD_THRESHOLD,
            importedFiles,
          });

          // Append shop destination
          appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);
          queueCreateAdPromise(formData);
        });
      }

      // ============================================================================
      // SECTION 4: NON-DYNAMIC AD SETS (Non-Carousel, Non-Flexible)
      // ============================================================================
      if (!isCatalogueJob && nonDynamicAdSetIds.length > 0 && !isCarouselAd && !isFlexLikeAdType) {
        nonDynamicAdSetIds.forEach((adSetId) => {
          const groupedFileIds = enablePlacementCustomization ? new Set(fileGroups.flat()) : new Set();
          const hasUngroupedFiles =
            files.some(
              (file) =>
                (!file.isDraftAsset || !isVideoFile(file)) &&
                !groupedFileIds.has(getFileId(file)) &&
                (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD),
            ) ||
            smallDriveFiles.some((driveFile) => !groupedFileIds.has(driveFile.id)) ||
            smallDropboxFiles.some((dropboxFile) => !groupedFileIds.has(dropboxFile.dropboxId)) ||
            smallFrameioFiles.some((frameioFile) => !groupedFileIds.has(frameioFile.frameioId)) ||
            [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...s3FrameioResults].some(
              (s3File) =>
                !(
                  groupedFileIds.has(s3File.uniqueId) ||
                  groupedFileIds.has(s3File.id) ||
                  groupedFileIds.has(s3File.dropboxId) ||
                  groupedFileIds.has(s3File.frameioId)
                ),
            ) ||
            (importedFiles &&
              importedFiles.some((f) => {
                const fileId = f.type === "image" ? f.hash : f.id;
                return !groupedFileIds.has(fileId);
              }));

          let localIterationIndex = 0;

          // Process GROUPED files if placement customization is enabled
          if (enablePlacementCustomization && fileGroups.length > 0) {
            // Pre-compute ad names for grouped files
            const groupedAdNames = fileGroups.map((group, groupIndex) => {
              const firstFileId = group[0];

              const firstFileForNaming =
                files.find((f) => getFileId(f) === firstFileId) ||
                smallDriveFiles.find((f) => f.id === firstFileId) ||
                smallDropboxFiles.find((f) => f.dropboxId === firstFileId) ||
                smallFrameioFiles.find((f) => f.frameioId === firstFileId) ||
                [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...s3FrameioResults].find(
                  (f) => f.uniqueId === firstFileId || f.id === firstFileId || f.dropboxId === firstFileId || f.frameioId === firstFileId,
                ) ||
                (importedFiles || []).find((f) => (f.type === "image" && f.hash === firstFileId) || (f.type === "video" && f.id === firstFileId));

              return computeAdNameFromFormula(
                firstFileForNaming || files[0] || driveFiles[0] || dropboxFiles[0] || frameioFiles[0],
                localIterationIndex + groupIndex,
                link[0],
                jobData.formData.adNameFormulaV2,
                adType,
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
                partnershipPrimaryIdentity,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              // Append group media files
              const groupVideoMetadata = appendGroupMediaFiles(formData, group, {
                files,
                smallDriveFiles,
                smallDropboxFiles,
                smallFrameioFiles,
                s3Results,
                s3DriveResults,
                s3DropboxResults,
                s3FrameioResults,
                S3_UPLOAD_THRESHOLD,
                getFileId,
                isVideoFile,
                aspectRatioMap,
                importedFiles,
              });

              // Append placement customization fields
              appendPlacementCustomizationFields(formData, {
                enablePlacementCustomization,
                totalGroups: fileGroups.length,
                currentGroupIndex: groupIndex + 1,
                videoMetadata: groupVideoMetadata,
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
            const ungroupedLocalFiles = files.filter(
              (file) =>
                (!file.isDraftAsset || !isVideoFile(file)) &&
                (!isVideoFile(file) || file.size <= S3_UPLOAD_THRESHOLD) &&
                !groupedFileIds.has(getFileId(file)),
            );
            const ungroupedDriveFiles = smallDriveFiles.filter((driveFile) => !groupedFileIds.has(driveFile.id));
            const ungroupedDropboxFiles = smallDropboxFiles.filter((dropboxFile) => !groupedFileIds.has(dropboxFile.dropboxId));
            const ungroupedFrameioFiles = smallFrameioFiles.filter((frameioFile) => !groupedFileIds.has(frameioFile.frameioId));
            const ungroupedS3Files = [...s3Results, ...s3DriveResults, ...s3DropboxResults, ...s3FrameioResults].filter(
              (s3File) =>
                !(
                  groupedFileIds.has(s3File.uniqueId) ||
                  groupedFileIds.has(s3File.id) ||
                  groupedFileIds.has(s3File.dropboxId) ||
                  groupedFileIds.has(s3File.frameioId)
                ),
            );

            // Pre-compute ad names
            const localFileAdNames = ungroupedLocalFiles.map((file, index) =>
              computeAdNameFromFormula(file, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType),
            );

            localIterationIndex += ungroupedLocalFiles.length;

            const driveFileAdNames = ungroupedDriveFiles.map((driveFile, index) =>
              computeAdNameFromFormula(driveFile, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType),
            );

            localIterationIndex += ungroupedDriveFiles.length;

            const dropboxFileAdNames = ungroupedDropboxFiles.map((dropboxFile, index) =>
              computeAdNameFromFormula(dropboxFile, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType),
            );

            localIterationIndex += ungroupedDropboxFiles.length;

            const frameioFileAdNames = ungroupedFrameioFiles.map((frameioFile, index) =>
              computeAdNameFromFormula(frameioFile, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType),
            );

            localIterationIndex += ungroupedFrameioFiles.length;

            const s3FileAdNames = ungroupedS3Files.map((s3File, index) =>
              computeAdNameFromFormula(s3File, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType),
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
                partnershipPrimaryIdentity,
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
                partnershipPrimaryIdentity,
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
                partnershipPrimaryIdentity,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              appendSingleDropboxFile(formData, dropboxFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: dropboxFile.name });
            });

            // Handle Frame.io image files (videos go through ungroupedS3Files below)
            ungroupedFrameioFiles.forEach((frameioFile, index) => {
              const formData = new FormData();

              appendCommonFields(formData, {
                adName: frameioFileAdNames[index],
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
                partnershipPrimaryIdentity,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              appendSingleFrameioFile(formData, frameioFile);
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: frameioFile.name });
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
                partnershipPrimaryIdentity,
                adScheduleStartTime,
                adScheduleEndTime,
              });

              // Append single S3 file
              appendSingleS3File(formData, s3File);

              // Append shop destination
              appendShopDestination(formData, selectedShopDestination, selectedShopDestinationType, showShopDestinationSelector);

              queueCreateAdPromise(formData, { fileName: s3File.name || s3File.originalName || "S3 Video" });
            });

            // Handle Meta library imported files
            // Handle Meta library imported files - ONLY ungrouped ones
            const metaImages = (importedFiles || []).filter((f) => f.type === "image" && !groupedFileIds.has(f.hash));
            const metaVideos = (importedFiles || []).filter((f) => f.type === "video" && !groupedFileIds.has(f.id));

            // Pre-compute ad names for meta files
            const metaImageAdNames = metaImages.map((file, index) =>
              computeAdNameFromFormula({ name: file.name }, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType),
            );

            localIterationIndex += metaImages.length;

            const metaVideoAdNames = metaVideos.map((file, index) =>
              computeAdNameFromFormula({ name: file.name }, localIterationIndex + index, link[0], jobData.formData.adNameFormulaV2, adType),
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
                partnershipPrimaryIdentity,
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
                partnershipPrimaryIdentity,
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
        throw new Error("All your files failed to upload or import. Please retry; for cloud files, reconnect the source if the issue continues.");
      }

      setLiveProgress({ completed: 0, succeeded: 0, failed: 0, total: promises.length, errors: [] });
      isInPromisePhase.current = true; // ADD THIS

      try {
        setJobId(frontendJobId);
        // Small delay to let SSE connect
        await new Promise((resolve) => setTimeout(resolve, 100));
        // const responses = await Promise.allSettled(trackedPromises); // 🆕 Changed from promises to trackedPromises

        const responses = new Array(promises.length);

        const trackedPromises = promises.map((promise, index) =>
          promise
            .then((result) => {
              // 1. Update Live Counter
              setLiveProgress((prev) => ({
                ...prev,
                completed: prev.completed + 1,
                succeeded: prev.succeeded + 1,
              }));

              // 2. Record Success explicitly
              responses[index] = { status: "fulfilled", value: result };
              return result;
            })
            .catch((error) => {
              // Check if this is a cancellation (frontend abort or backend 499)
              const isCancellation =
                axios.isCancel(error) || error.name === "AbortError" || error.response?.status === 499 || error.response?.data?.cancelled;

              if (isCancellation) {
                setLiveProgress((prev) => ({
                  ...prev,
                  completed: prev.completed + 1,
                  // Don't increment failed — this was user-initiated
                }));
                responses[index] = { status: "cancelled" };
                return null;
              }

              // Real error — existing logic
              // Transport failure (no HTTP response, or connection reset): the
              // request may have reached Meta and created the ad even though we
              // never got a reply. Never auto-retried — tell the user to verify.
              const isConnectionLoss = !error.response || error.code === "ECONNRESET" || error.code === "ERR_NETWORK";

              let errorMsg = "Unknown error";
              if (isConnectionLoss) {
                errorMsg =
                  "Connection to Meta dropped, so this ad couldn't be confirmed. It may still have been created — check Ads Manager for your ad count before retrying.";
              } else if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
              } else if (error.response?.data) {
                errorMsg = error.response.data;
              } else if (error.message) {
                errorMsg = error.message;
              }

              setLiveProgress((prev) => ({
                ...prev,
                completed: prev.completed + 1,
                failed: prev.failed + 1,
                errors: [
                  ...prev.errors,
                  {
                    adName: promiseMetadata[index]?.adName || null,
                    fileName: promiseMetadata[index]?.fileName || null,
                    error: errorMsg,
                  },
                ],
              }));

              responses[index] = { status: "rejected", reason: error };
              return null;
            }),
        );

        // We use Promise.all because we are catching rejections internally in trackedPromises
        await Promise.all(trackedPromises);

        const successCount = responses.filter((r) => r.status === "fulfilled").length;
        const failureCount = responses.filter((r) => r.status === "rejected").length;
        const totalCount = responses.length;
        const successfulAdCountsByAdSet = responses.reduce((acc, response, index) => {
          if (response?.status !== "fulfilled") {
            return acc;
          }

          const adSetId = promiseMetadata[index]?.adSetId;
          if (!adSetId) {
            return acc;
          }

          acc[adSetId] = (acc[adSetId] || 0) + 1;
          return acc;
        }, {});
        const successfulAdNames = responses
          .map((response, index) => ({ response, meta: promiseMetadata[index] }))
          .filter(({ response }) => response?.status === "fulfilled")
          .map(({ meta }) => meta?.adName || meta?.fileName)
          .filter(Boolean);
        responses.forEach((response, index) => {
          if (response?.status !== "fulfilled") return;
          (promiseMetadata[index]?.draftMediaRefs || []).forEach((media) => {
            const cleanupKey = JSON.stringify([media.draftAdAccountId, media.draftId, media.draftMediaId]);
            pendingDraftMediaCleanupRef.current.set(cleanupKey, media);
          });
        });

        if (Object.keys(successfulAdCountsByAdSet).length > 0) {
          onAdSetCountsCreated?.(successfulAdCountsByAdSet);
        }

        const errorMessages = responses
          .map((r, index) => ({ response: r, meta: promiseMetadata[index] }))
          .filter(({ response }) => response.status === "rejected")
          .map(({ response, meta }) => {
            let errorMsg = "Unknown error";
            if (response.reason?.response?.data?.error) {
              errorMsg = response.reason.response.data.error;
            } else if (response.reason?.response?.data) {
              errorMsg = response.reason.response.data;
            } else if (response.reason?.message) {
              errorMsg = response.reason.message;
            }
            return {
              adName: meta?.adName || null,
              fileName: meta?.fileName || null,
              error: errorMsg,
              errorCode: response.reason?.response?.data?.errorCode || null,
            };
          });
        const requiresMetaAction = errorMessages.some((item) => item.errorCode === META_AD_CREATION_ACTION_REQUIRED);

        let jobStatus = "complete";
        let jobMessage = "All ads created successfully!";

        if (signal.aborted) {
          // User cancelled — determine what actually happened
          if (successCount === 0 && failureCount === 0) {
            jobStatus = "cancelled";
            jobMessage = "Job cancelled. Some Ads might still have been made.";
          } else if (successCount === totalCount) {
            // Everything finished before cancel propagated
            jobStatus = "complete";
            jobMessage = `All ${totalCount} ads were created before cancellation took effect.`;
          } else if (successCount > 0) {
            jobStatus = "partial-success";
            jobMessage = `Cancelled. ${successCount} of ${totalCount} ads were already created. This count could be inaccurate.`;
          } else {
            // Only failures and cancellations, no successes
            jobStatus = "cancelled";
            jobMessage = "Job cancelled Some Ads might still have been made..";
          }
        } else {
          // Normal (non-cancelled) completion
          if (failureCount > 0 && successCount > 0) {
            jobStatus = "partial-success";
            jobMessage = requiresMetaAction
              ? META_ACTION_REQUIRED_MESSAGE
              : `${successCount} of ${totalCount} ads created. ${failureCount} failed.`;
          } else if (failureCount === totalCount) {
            jobStatus = "error";
            const firstError = responses.find((r) => r.status === "rejected");
            let errorMsg = "Unknown error";
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
          await axios.post(
            `${API_BASE_URL}/auth/complete-job`,
            {
              jobId: frontendJobId,
              status: jobStatus,
              message: jobMessage,
              successCount,
              failureCount,
              totalCount,
              errorMessages,
              successfulAdNames,
              selectedAdSets,
              selectedAdAccount,
              selectedTemplate,
            },
            {
              withCredentials: true,
              timeout: 5000,
            },
          );
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
            successfulAdNames,
            selectedAdSets: selectedAdSets,
            selectedAdAccount: selectedAdAccount,
            formData: jobData.formData,
          };
          addCompletedJob(cancelledJob);

          // Clean up the queue directly since useEffect might not trigger
          setShowCompletedView(true);
          setJobQueue((prev) => prev.slice(1));
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
      if (error.name === "AbortError" || axios.isCancel(error)) {
        // Notify backend to mark job as cancelled
        try {
          await axios.post(
            `${API_BASE_URL}/auth/cancel-job`,
            { jobId: currentJobIdRef.current || jobId || currentJob?.id },
            { withCredentials: true, timeout: 3000 },
          );
        } catch (e) {
          /* best-effort */
        }
        throw error; // Let the queue starter clear this job if SSE never existed.
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
  };

  const clearQueuedMedia = () => {
    setFiles([]);
    setDriveFiles([]);
    setDropboxFiles([]);
    setFrameioFiles([]);
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

  const handleSaveDraft = async (targetDraft = null, { copyPreviewLink = false } = {}) => {
    const trimmedName = targetDraft?.name || draftName.trim();
    if (!targetDraft && !trimmedName) {
      toast.error("Enter a draft name");
      return;
    }
    if (!selectedAdAccount) {
      toast.error("Select an ad account before saving a draft");
      return;
    }
    // React state does not disable the buttons until the next render. The ref
    // closes the small window where Enter + click or a rapid double-click could
    // start two competing saves.
    if (draftSaveAbortControllerRef.current) return;
    const controller = new AbortController();
    draftSaveAbortControllerRef.current = controller;
    if (copyPreviewLink) setFailedPreviewUrl("");
    setDraftSaveMode(copyPreviewLink ? "preview" : targetDraft ? "update" : "save");
    setSavingDraft(true);
    setDraftSaveProgress({
      value: 0,
      message: copyPreviewLink ? "Preparing preview..." : targetDraft ? `Updating ${targetDraft.name}...` : "Preparing draft...",
    });
    let draftSaved = false;
    let previewCopyFailed = false;
    try {
      const resolvedAdName = computeAdNameFromFormula(adNamePreviewFile, 0, link[0], null, adType);
      const creativeSourceFiles = [
        ...files,
        ...driveFiles.map((file) => ({ ...file, isDrive: true })),
        ...dropboxFiles.map((file) => ({ ...file, isDropbox: true })),
        ...frameioFiles.map((file) => ({ ...file, isFrameio: true })),
        ...importedFiles.map((file) => ({ ...file, isMetaLibrary: true })),
        ...importedPosts
          .filter((post) => post.image_url)
          .map((post) => ({
            ...post,
            name: post.ad_name || post.name || "Existing ad",
            type: "image/jpeg",
            draftKey: `post:${post.id}`,
          })),
        ...selectedIgOrganicPosts
          .filter((post) => post.image_url || post.previewUrl || post.thumbnail_url || post.media_url)
          .map((post) => ({
            ...post,
            name: post.caption || "Instagram post",
            type: "image/jpeg",
            draftKey: `igpost:${post.source_instagram_media_id}`,
          })),
      ];
      const uniqueCreativeSources = Array.from(
        new Map(creativeSourceFiles.map((file) => [String(getDraftCreativeKey(file) || ""), file]).filter(([key]) => key)).entries(),
      );
      const creativeFileByKey = new Map(uniqueCreativeSources);
      const groupedCreativeKeys = new Set(fileGroups.flatMap(getGroupFileIds).map(String));
      const orderedVariants = [
        variants.find((variant) => variant.id === "default"),
        ...variants.filter((variant) => variant.id !== "default"),
      ].filter(Boolean);
      const creativeAdNames = Object.fromEntries(
        orderedVariants.map((variant) => {
          const snapshot = getVariantState(variant.id) || {};
          const names = { groups: {}, files: {} };
          let iterationIndex = 0;
          const formula = {
            ...(snapshot.adNameFormulaV2 || {}),
            selectedTemplate: snapshot.selectedTemplate || "",
            adSetNameContext: snapshot.duplicateAdSet
              ? (snapshot.newAdSetName || "").trim()
              : (snapshot.adSets || adSets).find(
                  (entry) => String(entry.id) === String((snapshot.selectedAdSets || [])[0]),
                )?.name || "",
          };
          const destination = snapshot.link?.[0] || "";

          fileGroups.forEach((group, groupIndex) => {
            const groupKey = Array.isArray(group) || !group?.id ? `group-${groupIndex}` : String(group.id);
            const assignedVariant = Array.isArray(group) || !group?.id ? "default" : groupVariantMap[group.id] || "default";
            if (assignedVariant !== variant.id) return;
            const firstFile = getGroupFileIds(group)
              .map((key) => creativeFileByKey.get(String(key)))
              .find(Boolean);
            names.groups[groupKey] = computeAdNameFromFormula(firstFile, iterationIndex, destination, formula, adType);
            iterationIndex += 1;
          });

          uniqueCreativeSources.forEach(([originalKey, file]) => {
            if (groupedCreativeKeys.has(originalKey)) return;
            const assignmentMap = originalKey.startsWith("post:") || originalKey.startsWith("igpost:") ? postVariantMap : fileVariantMap;
            const assignedVariant = uniqueCreativeSources.length <= 1 ? variant.id : assignmentMap[originalKey] || "default";
            if (assignedVariant !== variant.id) return;
            names.files[originalKey] = computeAdNameFromFormula(file, iterationIndex, destination, formula, adType);
            iterationIndex += 1;
          });
          return [variant.id, names];
        }),
      );
      setAdName((current) => (current === resolvedAdName ? current : resolvedAdName));
      const savedDraft = await onSaveDraft(trimmedName, {
        resolvedAdName,
        creativeAdNames,
        targetDraft,
        signal: controller.signal,
        onProgress: setDraftSaveProgress,
      });
      draftSaved = true;
      if (!targetDraft) setDraftName("");

      if (copyPreviewLink) {
        setDraftSaveProgress({ value: 100, message: "Creating preview link..." });
        const previewUrl = await createDraftShareUrl({
          draftId: savedDraft.id,
          adAccountId: selectedAdAccount,
        });
        try {
          await navigator.clipboard.writeText(previewUrl);
        } catch (copyError) {
          console.warn("Automatic preview link copy failed:", copyError);
          setFailedPreviewUrl(previewUrl);
          previewCopyFailed = true;
        }
      }

      setDraftUpdateMenuOpen(false);
      setDraftMenuOpen(false);
      if (previewCopyFailed) return;
      toast.success(copyPreviewLink ? "Preview link copied" : targetDraft ? `“${targetDraft.name}” updated` : "Draft saved");
    } catch (error) {
      if (controller.signal.aborted) {
        toast.info(targetDraft ? "Draft update cancelled" : "Draft save cancelled");
      } else if (copyPreviewLink && draftSaved) {
        setDraftUpdateMenuOpen(false);
        setDraftMenuOpen(false);
        toast.error(`Draft saved, but the preview link could not be copied${error.message ? `: ${error.message}` : "."}`);
      } else if (error?.name === "AbortError") {
        console.error("Draft save was interrupted without a user cancellation", error);
        toast.error(
          targetDraft
            ? "Draft update was interrupted. Check your connection and try again."
            : "Draft save was interrupted. Check your connection and try again.",
        );
      } else {
        toast.error(error.message || (targetDraft ? "Failed to update draft" : "Failed to save draft"));
      }
    } finally {
      if (draftSaveAbortControllerRef.current === controller) {
        draftSaveAbortControllerRef.current = null;
      }
      setSavingDraft(false);
      setDraftSaveProgress({ value: 0, message: "" });
    }
  };

  const handleRetryPreviewCopy = async () => {
    if (!failedPreviewUrl) return;

    try {
      await navigator.clipboard.writeText(failedPreviewUrl);
      setFailedPreviewUrl("");
      toast.success("Preview link copied");
    } catch (error) {
      toast.error(`Could not copy the preview link${error?.message ? `: ${error.message}` : "."}`);
    }
  };

  const loadDraftUpdateOptions = async () => {
    if (!selectedAdAccount) {
      setDraftUpdateOptions([]);
      return;
    }
    setDraftUpdateOptions([]);
    setLoadingDraftUpdateOptions(true);
    try {
      setDraftUpdateOptions(await listDrafts(selectedAdAccount));
    } catch (error) {
      toast.error(error.message || "Failed to load drafts");
      setDraftUpdateOptions([]);
    } finally {
      setLoadingDraftUpdateOptions(false);
    }
  };

  const handleDraftUpdateMenuChange = (nextOpen) => {
    if (savingDraft) return;
    setDraftUpdateMenuOpen(nextOpen && draftUpdateOptions.length > 0);
  };

  const handleCancelDraftSave = () => {
    if (!draftSaveAbortControllerRef.current) return;
    setDraftSaveProgress((current) => ({ ...current, message: "Cancelling draft save..." }));
    draftSaveAbortControllerRef.current.abort();
  };

  const handleQueueJob = async (e) => {
    e.preventDefault();

    if (isQueueingJobs) {
      return;
    }

    if (
      !isCatalogueAd &&
      files.length === 0 &&
      driveFiles.length === 0 &&
      dropboxFiles.length === 0 &&
      frameioFiles.length === 0 &&
      importedPosts.length === 0 &&
      importedFiles.length === 0 &&
      selectedIgOrganicPosts.length === 0
    ) {
      toast.error("Please upload at least one file");
      return;
    }

    const orderedVariants = [variants.find((variant) => variant.id === "default"), ...variants.filter((variant) => variant.id !== "default")].filter(
      Boolean,
    );

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

      if (!job.formData.pageId && !isDuplicationMode) {
        toast.error(`${variant.name}: please select a Facebook page`);
        return;
      }

      const jobAdSetTimingIssue = getAdSetTimingIssue(job.formData);
      if (jobAdSetTimingIssue) {
        toast.error(`${variant.name}: ${jobAdSetTimingIssue.message}`);
        return;
      }

      newJobs.push(job);
    }

    if (newJobs.length === 0) {
      toast.error("No variants have files assigned. Nothing to publish.");
      return;
    }

    const shouldShowVariantLabel = newJobs.some((job) => job.variantId !== "default");
    const queuedJobs = newJobs.map((job) => ({
      ...job,
      showVariantLabel: shouldShowVariantLabel,
    }));

    setIsQueueingJobs(true);

    try {
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

  const populatedVariantSummaries = variants
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      count: countFilesForVariant(variant.id),
    }))
    .filter((variant) => variant.count > 0);
  const hasConfiguredFormSplits = populatedVariantSummaries.some((variant) => variant.id !== "default");
  const shouldScrollVariantPicker = variants.length > 5;
  const formatQueuedJobLabel = (job, prefix) => {
    const summary = `${job.adCount} ad${job.adCount !== 1 ? "s" : ""} to ${job.formData.adSetDisplayName}`;
    return job.showVariantLabel && job.variantName ? `${prefix} ${job.variantName}: ${summary}` : `${prefix} ${summary}`;
  };

  const isPageMissing = !pageId && !isDuplicationMode;
  const variantsToValidate = populatedVariantSummaries.length > 0 ? populatedVariantSummaries : [{ id: activeVariantId }];
  const adSetTimingIssue = variantsToValidate.reduce((issue, variant) => {
    if (issue) return issue;
    const variantState = getVariantState(variant.id);
    return variantState ? getAdSetTimingIssue(variantState) : null;
  }, null);
  // Missing ad set is pulled out of the bundled blocking flag below so we can
  // surface a dedicated message only when it's the sole remaining issue.
  const isAdSetMissing = variants.length <= 1 && selectedAdSets.length === 0 && !duplicateAdSet;
  const hasPublishBlockingIssueBeforePage =
    variants.length > 1
      ? !isLoggedIn ||
      (!isCatalogueAd &&
        files.length === 0 &&
        driveFiles.length === 0 &&
        dropboxFiles.length === 0 &&
        frameioFiles.length === 0 &&
        importedPosts.length === 0 &&
        importedFiles.length === 0 &&
        selectedIgOrganicPosts.length === 0) ||
      hasCatalogueInvalidMedia ||
      selectedFiles.size > 0 ||
      (!isCarouselAd && hasDuplicates)
      : !isLoggedIn ||
      (!isCatalogueAd &&
        files.length === 0 &&
        driveFiles.length === 0 &&
        dropboxFiles.length === 0 &&
        frameioFiles.length === 0 &&
        importedPosts.length === 0 &&
        importedFiles.length === 0 &&
        selectedIgOrganicPosts.length === 0) ||
      (duplicateAdSet && (!newAdSetName || newAdSetName.trim() === "")) ||
      (adType === "carousel" && files.length + driveFiles.length + importedFiles.length + dropboxFiles.length + frameioFiles.length < 2) ||
      (isFlexLikeAdType &&
        fileGroups.length === 0 &&
        files.length + driveFiles.length + importedFiles.length + dropboxFiles.length + frameioFiles.length > 10) ||
      (isCatalogueAd && !hasCatalogueEligibleAdSets) ||
      hasCatalogueInvalidMedia ||
      (showShopDestinationSelector && !selectedShopDestination) ||
      isMissingDestinationValue ||
      selectedFiles.size > 0 ||
      (shouldShowLeadFormSelector && !selectedForm) ||
      (!isCarouselAd && hasDuplicates);
  const publishDisabled = hasPublishBlockingIssueBeforePage || isAdSetMissing || isPageMissing || Boolean(adSetTimingIssue);

  const showImportedPostMode = isDuplicationMode && importedPosts.length > 0;
  const importedSafeIndex = showImportedPostMode ? Math.min(activeImportedPostIndex, importedPosts.length - 1) : 0;
  const importedActivePost = showImportedPostMode ? importedPosts[importedSafeIndex] : null;
  const importedActiveKey = importedActivePost ? getImportedPostKey(importedActivePost) : "";
  const importedActiveValue = importedActivePost
    ? importedPostAdNames[importedActiveKey] !== undefined
      ? importedPostAdNames[importedActiveKey]
      : importedActivePost.ad_name || ""
    : "";
  const handleImportedPostNameChange = (value) => {
    if (!importedActivePost) return;
    setImportedPostAdNames((prev) => ({ ...prev, [importedActiveKey]: value }));
  };
  const adNameSection = (
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
            className="text-xs gap-1 px-3 pl-2 border-gray-300 rounded-2xl py-4.5 bg-zinc-800 text-white shadow hover:text-white hover:bg-zinc-900"
          >
            <CogIcon className="w-3 h-3 text-white" />
            Set Up Ad Name Formula
          </Button>
        )}
      </Label>

      <ReorderAdNameParts
        formulaInput={showImportedPostMode ? importedActiveValue : adNameFormulaV2?.rawInput || ""}
        onFormulaChange={showImportedPostMode ? handleImportedPostNameChange : (newRawInput) => setAdNameFormulaV2({ rawInput: newRawInput })}
        variant="home"
        customVariables={showImportedPostMode ? [] : adAccountSettings.customVariables || []}
        allowedVariableIds={showImportedPostMode ? ["dateDefault", "dateMonthName", "dateCustom", "iteration"] : null}
        showAdSetNameVariable={!showImportedPostMode && showAdSetNameVariable}
        postSwitcher={
          showImportedPostMode
            ? {
              currentIndex: importedSafeIndex,
              total: importedPosts.length,
              onPrev: () => setActiveImportedPostIndex((prev) => Math.max(0, prev - 1)),
              onNext: () => setActiveImportedPostIndex((prev) => Math.min(importedPosts.length - 1, prev + 1)),
            }
            : null
        }
      />

      {!showImportedPostMode && (
        <div className="mt-1">
          <Label className="text-xs text-gray-500">
            Ad Name Preview:{" "}
            {files.length > 0 ||
              driveFiles.length > 0 ||
              dropboxFiles.length > 0 ||
              frameioFiles.length > 0 ||
              importedFiles.length > 0 ||
              importedPosts.length > 0 ||
              selectedIgOrganicPosts.length > 0
              ? computeAdNameFromFormula(adNamePreviewFile, 0, link[0], null, adType)
              : "Upload a file to see example"}
          </Label>
        </div>
      )}
    </div>
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
                <button onClick={() => setIsJobTrackerExpanded(false)} className="text-gray-500 hover:text-gray-700">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Jobs List */}
              <div className="flex-1 overflow-y-auto">
                {/* Completed Jobs */}

                {completedJobs.map((job) => {
                  const successfulAdNames = Array.isArray(job.successfulAdNames) ? job.successfulAdNames.filter(Boolean) : [];
                  const requiresMetaAction = job.errorMessages?.some((item) => item.errorCode === META_AD_CREATION_ACTION_REQUIRED);

                  return (
                    <div key={job.id} className="p-3.5 border-b border-gray-100">
                      {/* Main job row */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {job.status === "cancelled" ? (
                            <Ban className="w-6 h-6 text-orange-500" />
                          ) : job.status === "error" ? (
                            <CircleX className="w-6 h-6 text-red-500" />
                          ) : job.status === "partial-success" ? (
                            <PartialSuccess className="w-6 h-6" />
                          ) : job.status === "retry" ? (
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                          ) : (
                            <CheckIcon className="w-6 h-6" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p
                            style={{ overflowWrap: "anywhere" }}
                            className={`text-sm break-words ${job.status === "cancelled"
                                ? "text-orange-500"
                                : job.status === "error"
                                  ? "text-red-600"
                                  : job.status === "partial-success"
                                    ? "text-[#F0A000]"
                                    : job.status === "retry"
                                      ? "text-orange-600"
                                      : "text-gray-700"
                              }`}
                          >
                            {job.message}
                          </p>
                          {job.status === "cancelled" && job.totalCount > 0 && job.successCount > 0 && (
                            <div className="flex gap-2 mt-1.5">
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-lg">
                                <CheckIcon className="w-3 h-3 text-green-600" />
                                <span className="text-xs font-medium text-green-700">{job.successCount} created</span>
                              </div>
                              {job.failureCount > 0 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-lg">
                                  <CircleX className="w-3 h-3 text-red-500" />
                                  <span className="text-xs font-medium text-red-600">{job.failureCount} failed</span>
                                </div>
                              )}
                            </div>
                          )}

                          {job.status === "retry" && <span className="block text-xs text-orange-500 mt-1">Reload page to try again.</span>}

                          {(job.status === "error" || job.status === "partial-success") && !job.errorMessages?.length && renderErrorSupportLink()}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {job.status === "retry" && (
                            <button onClick={refreshPage} className="text-orange-600 hover:text-orange-800 p-1 rounded" title="Retry job">
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}

                          {job.selectedAdSets && job.selectedAdSets.length > 0 && job.selectedAdAccount && (
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      const account = adAccounts.find((a) => a.id === job.selectedAdAccount);
                                      const bizId = account?.business_id || "";
                                      const url = `https://adsmanager.facebook.com/adsmanager/manage/adsets/edit/standalone?${job.selectedAdAccount.replace("_", "=")}&selected_adset_ids=${job.selectedAdSets[0]}&business_id=${bizId}&global_scope_id=${bizId}`;
                                      window.open(url, "_blank");
                                    }}
                                    className="cursor-pointer text-gray-500 hover:text-blue-500 transition-colors p-1"
                                    aria-label="View in Ads Manager"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  align="start"
                                  className="max-w-[320px] rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 shadow-lg"
                                >
                                  <div className="space-y-2">
                                    <p className="font-semibold">View Ads Created</p>
                                    {successfulAdNames.length > 0 ? (
                                      <ul className="ml-3 list-disc space-y-1">
                                        {successfulAdNames.map((name, index) => (
                                          <CreatedAdName key={`${name}-${index}`} name={name} />
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-gray-500">Ad names unavailable</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {(job.status === "error" || job.status === "partial-success") && job.formData && (
                            <button
                              onClick={() => handleRetryJob(job)}
                              className="text-gray-500 hover:text-blue-500 transition-colors p-1"
                              title="Restore to form"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setCompletedJobs((prev) => prev.filter((j) => j.id !== job.id))}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Remove job"
                          >
                            <CircleX className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      {requiresMetaAction && (
                        <div className="mt-3 ml-9 space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={() => setShowMetaActionHelp(true)}
                          >
                            How to continue
                          </Button>
                          <Button
                            type="button"
                            className="h-10 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                            onClick={showMessenger}
                          >
                            Chat with Support
                          </Button>
                        </div>
                      )}

                      {/* Error details (moved outside the flex row) */}
                      {(job.status === "partial-success" || job.status === "cancelled") && job.errorMessages?.length > 0 && (
                        <div className="mt-2 ml-9">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-[#FF0000] font-medium">View error details</summary>
                            <div className="mt-2 ml-1 space-y-3">
                              {(() => {
                                const errorGroups = job.errorMessages.reduce((acc, item) => {
                                  const key = item.error;
                                  if (!acc[key]) acc[key] = { error: item.error, failedAds: [] };
                                  if (item.adName || item.fileName) {
                                    acc[key].failedAds.push({ adName: item.adName, fileName: item.fileName });
                                  }
                                  return acc;
                                }, {});

                                return Object.values(errorGroups).map((group, idx) => {
                                  const count = group.failedAds.length || 1;
                                  return (
                                    <div key={idx} className="border-l-2 border-[#FF0000]/40 pl-2">
                                      <div className="text-[#FF0000] font-medium flex items-start gap-1.5">
                                        <span className="flex-1">{group.error}</span>
                                        <span className="shrink-0 px-1.5 rounded bg-[#FF0000]/10 text-[#FF0000]">
                                          {count} {count === 1 ? "ad" : "ads"}
                                        </span>
                                      </div>
                                      {group.failedAds.length > 0 && (
                                        <ul className="mt-1.5 ml-3 list-disc space-y-1">
                                          {group.failedAds.map((failedAd, i) => (
                                            <ErrorFileName key={i} adName={failedAd.adName} fileName={failedAd.fileName} />
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </details>
                          {(job.status === "partial-success" || job.status === "error") && !requiresMetaAction && renderErrorSupportLink()}
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
                      <p className="flex-1 text-sm font-medium text-gray-700 break-all">{formatQueuedJobLabel(currentJob, "Posting")}</p>
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
                              await axios.post(`${API_BASE_URL}/auth/cancel-job`, { jobId: cancelJobId }, { withCredentials: true, timeout: 3000 });
                            } catch (e) {
                              /* best-effort */
                            }
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
                          <summary className="cursor-pointer text-[#FF0000] font-medium">View error details</summary>
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
                                        {count} {count === 1 ? "ad" : "ads"}
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
                    <p className="flex-1 text-sm text-gray-600">{formatQueuedJobLabel(job, "Queued")}</p>
                    <button
                      onClick={() => setJobQueue((prev) => prev.filter((_, i) => i !== (currentJob ? index + 1 : index)))}
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

      <CardHeader>
        <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4 md:gap-2">
          <div className="flex items-center gap-2">
            <ConfigIcon className="w-5 h-5" />
            Select ad preferences
          </div>
          {!(isDuplicationMode || selectedIgOrganicPosts.length > 0) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Label htmlFor="ad-type" className="text-sm whitespace-nowrap">
                Ad Type:
              </Label>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={activeVariantId !== "default" ? "cursor-not-allowed" : ""}>
                      <Select
                        value={adType === "flexible" && !campaignSupportsFlexibleAds ? "regular" : adType}
                        onValueChange={(value) => {
                          if (value === "flexible" && !campaignSupportsFlexibleAds) {
                            setAdType("regular");
                            return;
                          }

                          if (value === "catalogue" && !hasCatalogueEligibleAdSets) {
                            setAdType("regular");
                            return;
                          }

                          if (activeVariantId !== "default") {
                            return;
                          }

                          setAdType(value);

                          // Reset link states when switching away from carousel
                          if (value !== "carousel" && link.length > 1) {
                            setLink([link[0] || ""]);
                            setLinkCustomStates({});
                            setShowCustomLink(false);
                          }

                          // Reset the "apply to all" states and restore from template
                          if (value !== "carousel") {
                            setApplyTextToAllCards(false);
                            setApplyHeadlinesToAllCards(false);

                            if (selectedTemplate && copyTemplates[selectedTemplate]) {
                              const tpl = copyTemplates[selectedTemplate];
                              setMessages(tpl.primaryTexts || [""]);
                              setHeadlines(tpl.headlines || [""]);
                              setDescriptions(tpl.descriptions || [""]);
                              setAddDescriptions((tpl.descriptions || []).some((description) => description !== ""));
                            } else {
                              setAddDescriptions(false);
                              setDescriptions([""]);
                            }
                          }
                        }}
                        disabled={!isLoggedIn || activeVariantId !== "default"}
                      >
                        <SelectTrigger className={cn("w-[180px] h-10 py-2 font-medium", formFieldChrome)}>
                          <SelectValue placeholder="Select ad type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl gap-4">
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

                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem
                                  value="flexible"
                                  onPointerDown={(event) => {
                                    if (!campaignSupportsFlexibleAds) {
                                      event.preventDefault();
                                    }
                                  }}
                                  onSelect={(event) => {
                                    if (!campaignSupportsFlexibleAds) {
                                      event.preventDefault();
                                    }
                                  }}
                                  aria-disabled={!campaignSupportsFlexibleAds}
                                  className={cn(
                                    "rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5",
                                    !campaignSupportsFlexibleAds && "cursor-not-allowed opacity-50",
                                  )}
                                >
                                  Flexible
                                </SelectItem>
                              </TooltipTrigger>
                              {!campaignSupportsFlexibleAds && (
                                <TooltipContent side="right" className="max-w-xs text-xs">
                                  Campaign doesnt support flex ads
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>

                          <SelectItem
                            value="multi_media"
                            className="rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5"
                          >
                            Multi-Media Ad
                          </SelectItem>

                          {hasCatalogueEligibleAdSets && (
                            <SelectItem
                              value="catalogue"
                              className="rounded-xl data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 transition-all my-0.5"
                            >
                              Catalogue
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </span>
                  </TooltipTrigger>
                  {activeVariantId !== "default" && (
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
        <form
          onSubmit={handleQueueJob}
          onKeyDown={(e) => {
            // Prevent Enter from submitting unless it's in a textarea (for line breaks)
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          <div className="space-y-10 overflow-hidden">
            {isDuplicationMode ? (
              <div className="relative space-y-6">
                {adNameSection}
                <PostSelectorInline
                  adAccountId={selectedAdAccount}
                  onImport={setImportedPosts}
                  usePostID={usePostID}
                  setUsePostID={setUsePostID}
                  campaigns={campaigns}
                  selectedAdAccount={selectedAdAccount}
                  importedPosts={importedPosts} // add this
                />
              </div>
            ) : (
              // Show regular form content when toggle is OFF
              <>
                <FacebookReauthDialog
                  open={isLinkPagesOpen}
                  onOpenChange={setIsLinkPagesOpen}
                  redirectState="home"
                  contentClassName="!top-[calc(50%+40px)]"
                />
                <div className="space-y-3">
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
                          isPagesLoading ? "h-3.5 w-3.5 text-gray-300 animate-[spin_3s_linear_infinite]" : "text-gray-500 hover:text-gray-700",
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
                          {pagesLoading || isPagesLoading ? ( // 👈 Show loading state in button
                            <div className="flex items-center gap-2">
                              <Loader className="h-4 w-4 animate-spin" />
                              <span>Loading pages...</span>
                            </div>
                          ) : pageId ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={pages.find((page) => page.id === pageId)?.profilePicture || "https://api.withblip.com/backup_page_image.png"}
                                alt="Page"
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span>{pages.find((page) => page.id === pageId)?.name || pageId}</span>
                            </div>
                          ) : !hasPages ? (
                            <span className="truncate text-gray-500">
                              No pages found.{" "}
                              <span className="text-xs font-medium text-black underline underline-offset-2">Click to link more pages</span>
                            </span>
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
                          <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                            <ScrollArea viewportClassName="max-h-[300px]">
                              {filteredPages.length > 0 ? (
                                <CommandGroup>
                                  {filteredPages.map((page) => (
                                    <CommandItem
                                      key={page.id}
                                      value={page.id}
                                      onSelect={() => {
                                        if (page.id !== pageId) {
                                          setSelectedShopDestination("");
                                          setSelectedShopDestinationType("");
                                          setSelectedShopProductCatalogId("");
                                          setProductExtensionProductSetId("");
                                          setProductExtensionProductCatalogId("");
                                        }
                                        if (destinationType === "instant_experience" && page.id !== pageId) {
                                          setInstantExperienceId("");
                                          setLink([""]);
                                        }
                                        setPageId(page.id);
                                        setOpenPage(false);
                                        if (page.instagramAccount?.id) {
                                          setInstagramAccountId(page.instagramAccount.id);
                                        } else {
                                          setInstagramAccountId(""); // Clear if not available
                                        }
                                        setPartnerIgAccountId("");
                                        setPartnerFbPageId("");
                                      }}
                                      className={cn(
                                        "px-3 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                        "data-[selected=true]:bg-gray-100",
                                        pageId === page.id && "bg-gray-100 rounded-2xl font-semibold",
                                        "hover:bg-gray-100",
                                        "flex items-center gap-2", // 👈 for image + name layout
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
                                  ))}
                                </CommandGroup>
                              ) : (
                                <div className="px-4 py-5 text-center">
                                  <p className="mb-2 text-sm text-gray-500">No pages found.</p>
                                  <Button
                                    type="button"
                                    variant="link"
                                    onClick={handleLinkMorePages}
                                    className="h-auto p-0 text-xs font-medium text-black underline underline-offset-2 hover:text-gray-700"
                                  >
                                    Confirm Blip has access to pages to make ads
                                  </Button>
                                </div>
                              )}
                            </ScrollArea>
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
                        >
                          {instagramAccountId ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.profilePictureUrl ||
                                  "https://api.withblip.com/backup_page_image.png" ||
                                  "/placeholder.svg"
                                }
                                alt="Instagram"
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span>
                                {pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.username || instagramAccountId}
                              </span>
                            </div>
                          ) : !hasInstagramAccounts ? (
                            <span className="truncate text-gray-500">
                              No IG accounts found.{" "}
                              <span className="text-xs font-medium text-black underline underline-offset-2">Click to link more pages</span>
                            </span>
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
                        <Command filter={() => 1} loop={false}>
                          <CommandInput
                            placeholder="Search Instagram usernames..."
                            value={instagramSearchValue}
                            onValueChange={setInstagramSearchValue}
                            className="bg-transparent"
                            wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                          />
                          <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                            <ScrollArea viewportClassName="max-h-[300px]">
                              {filteredInstagramAccounts.length > 0 ? (
                                <CommandGroup>
                                  {filteredInstagramAccounts.map((page) => (
                                    <CommandItem
                                      key={page.instagramAccount.id}
                                      value={page.instagramAccount.id}
                                      onSelect={() => {
                                        setInstagramAccountId(page.instagramAccount.id);
                                        setOpenInstagram(false);
                                      }}
                                      className={cn(
                                        "px-3 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                        instagramAccountId === page.instagramAccount.id && "bg-gray-100 font-semibold",
                                        "hover:bg-gray-100 flex items-center gap-2",
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
                              ) : (
                                <div className="px-4 py-5 text-center">
                                  <p className="mb-2 text-sm text-gray-500">No IG accounts found.</p>
                                  <Button
                                    type="button"
                                    variant="link"
                                    onClick={handleLinkMorePages}
                                    className="h-auto p-0 text-xs font-medium text-black underline underline-offset-2 hover:text-gray-700"
                                  >
                                    Confirm Blip has access to pages to make ads
                                  </Button>
                                </div>
                              )}
                            </ScrollArea>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Partnership Ad Toggle */}
                    <div className="space-y-4 pt-1">
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

                      {!instagramAccountId && <p className="text-xs text-gray-500">Select an Instagram account to fetch linked partners for</p>}

                      {/* Partner Selector (only shown when toggle is ON) */}
                      {isPartnershipAd && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">Select Partner Creator</Label>
                            <RefreshCcw
                              className={cn(
                                "h-4 w-4 cursor-pointer transition-all duration-200",
                                isLoadingPartners ? "text-gray-300 animate-[spin_3s_linear_infinite]" : "text-gray-500 hover:text-gray-700",
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
                                      <span className="text-xs text-gray-400">({selectedPartner.creatorIgId})</span>
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
                                  <CommandInput placeholder="Search partners..." value={partnerSearchValue} onValueChange={setPartnerSearchValue} />
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
                                            "hover:bg-gray-100 flex items-center gap-2",
                                          )}
                                        >
                                          <div className="flex flex-col">
                                            <span>@{partner.creatorUsername ?? "Username not available"}</span>
                                            <span className="text-xs text-gray-400">ID: {partner.creatorIgId}</span>
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
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
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
                                          !partnerFbPageId && partnerIgAccountId && "text-gray-400 cursor-not-allowed",
                                        )}
                                      >
                                        First identity only
                                      </Label>
                                    </div>
                                  </TooltipTrigger>
                                  {!partnerFbPageId && partnerIgAccountId && (
                                    <TooltipContent side="right" className="max-w-xs text-xs">
                                      You can't choose first identity only without an approved Facebook page for the partner
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="both_identities" id="identity-both" />
                                <Label htmlFor="identity-both" className="text-sm font-normal cursor-pointer">
                                  Both identities
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Primary identity picker — only for "Both identities" */}
                          {partnershipIdentityMode === "both_identities" && (
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-600">
                                <span className="inline-flex items-center gap-1">
                                  {renderDiffMark("partnershipPrimaryIdentity")}
                                  <span>Pick Primary Identity</span>
                                </span>
                              </Label>
                              <RadioGroup
                                value={partnershipPrimaryIdentity}
                                onValueChange={setPartnershipPrimaryIdentity}
                                className="flex items-center gap-4"
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="brand" id="primary-brand" />
                                  <Label htmlFor="primary-brand" className="text-sm font-normal cursor-pointer">
                                    {(() => {
                                      const brandUsername = pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount
                                        ?.username;
                                      return brandUsername ? `@${brandUsername}` : "Main brand IG";
                                    })()}
                                  </Label>
                                </div>
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value="partner" id="primary-partner" disabled={!partnerFbPageId} />
                                        <Label
                                          htmlFor="primary-partner"
                                          className={cn("text-sm font-normal cursor-pointer", !partnerFbPageId && "text-gray-400 cursor-not-allowed")}
                                        >
                                          {selectedPartner?.creatorUsername ? `@${selectedPartner.creatorUsername}` : "Partner IG"}
                                        </Label>
                                      </div>
                                    </TooltipTrigger>
                                    {!partnerFbPageId && (
                                      <TooltipContent side="right" className="max-w-xs text-xs">
                                        The partner needs an approved Facebook page to be the primary identity. They'll still appear as the secondary
                                        identity.
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </RadioGroup>
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

                {adNameSection}

                {selectedIgOrganicPosts.length === 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="flex items-center gap-2 mb-0">
                          <TemplateIcon className="w-4 h-4" />
                          Select a Copy Template
                        </Label>

                        {/* No templates + no content → Setup button */}
                        {selectedAdAccount && Object.keys(copyTemplates).length === 0 && !hasAnyContent && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/settings?tab=adaccount&adAccount=${selectedAdAccount}`)}
                            className="text-xs gap-1 px-3 pl-2 border-gray-300 rounded-2xl py-4.5 bg-zinc-800 text-white shadow hover:text-white hover:bg-zinc-900 ml-auto"
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

                      <Popover
                        open={templateDropdownOpen}
                        onOpenChange={(open) => {
                          setTemplateDropdownOpen(open);
                          if (!open) {
                            setTemplateSearch("");
                            setShowSortMenu(false);
                            if (bulkDeleteMode && selectedForDelete.size === 0) {
                              setBulkDeleteMode(false);
                            }
                          }
                        }}
                      >
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
                                    className={`p-1.5 rounded-lg transition-colors ${showSortMenu ? "bg-gray-100" : "hover:bg-gray-100"}`}
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
                                              {sortMode === option.value && <Check className="h-3.5 w-3.5 text-blue-500" />}
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
                                    className={`p-1.5 rounded-lg transition-colors ${bulkDeleteMode ? "bg-red-50 text-red-500" : "hover:bg-gray-100"}`}
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
                                    {bulkDeleteMode ? <X className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5 text-gray-500" />}
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
                                      handleTemplateSelect(tplName);
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
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg shrink-0">Default</span>
                                    )}
                                    {!bulkDeleteMode && tplName === selectedTemplate && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
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
                                    const fileCount =
                                      files.length + driveFiles.length + dropboxFiles.length + importedFiles.length + frameioFiles.length;
                                    const cardCount = enablePlacementCustomization ? Math.floor(fileCount / 2) : fileCount;
                                    if (cardCount > 0) {
                                      setMessages(new Array(cardCount).fill(firstMessage));
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
                            <div key={index} className={`flex items-start gap-2 ${isCarouselAd && applyTextToAllCards && index > 0 ? "hidden" : ""}`}>
                              <div className="flex flex-col w-full">
                                {isCatalogueAd ? (
                                  <CatalogueVariableField
                                    value={value}
                                    onValueChange={(nextValue) => {
                                      updateField(setMessages, messages, index, nextValue);
                                    }}
                                    placeholder="Add text option"
                                    disabled={!isLoggedIn}
                                    multiline
                                    minRows={2}
                                    maxRows={10}
                                    className={`${formTextareaChrome} ${duplicateIndices.messages.has(index) ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : ""
                                      }`}
                                    style={{
                                      scrollbarWidth: "thin",
                                      scrollbarColor: "#c7c7c7 transparent",
                                    }}
                                  />
                                ) : (
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
                                    className={`${formTextareaChrome} ${duplicateIndices.messages.has(index) ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : ""
                                      }`}
                                    style={{
                                      scrollbarWidth: "thin",
                                      scrollbarColor: "#c7c7c7 transparent",
                                    }}
                                  />
                                )}
                                {duplicateIndices.messages.has(index) && (
                                  <p className="text-xs text-red-500 mt-1">Duplicate values can cause errors when making ads</p>
                                )}
                              </div>
                              {!isCatalogueAd && messages.length > 1 && !(isCarouselAd && applyTextToAllCards) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="border border-gray-400 rounded-xl bg-white shadow-xs"
                                  size="icon"
                                  onClick={() => removeField(setMessages, messages, index)}
                                >
                                  <Trash2 className="w-4 h-4 text-gray-600 cursor-pointer hover:text-red-500" />
                                  <span className="sr-only">Remove</span>
                                </Button>
                              )}
                            </div>
                          ))}
                          {!isCatalogueAd && messages.length < (isCarouselAd ? 10 : 5) && !(isCarouselAd && applyTextToAllCards) && (
                            <Button
                              type="button"
                              size="sm"
                              className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                              onClick={() => addField(setMessages, messages)}
                            >
                              <Plus className="mr-2 h-4 w-4 text-white" />
                              {isCarouselAd ? "Add card headline" : "Add text option"}
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
                                  const fileCount =
                                    files.length + driveFiles.length + dropboxFiles.length + importedFiles.length + frameioFiles.length;
                                  const cardCount = enablePlacementCustomization ? Math.floor(fileCount / 2) : fileCount;
                                  if (cardCount > 0) {
                                    setHeadlines(new Array(cardCount).fill(firstHeadline));
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
                          <div
                            key={index}
                            className={`flex items-center gap-2 ${isCarouselAd && applyHeadlinesToAllCards && index > 0 ? "hidden" : ""}`}
                          >
                            <div className="flex flex-col w-full">
                              {isCatalogueAd ? (
                                <CatalogueVariableField
                                  value={value}
                                  onValueChange={(nextValue) => {
                                    updateField(setHeadlines, headlines, index, nextValue);
                                  }}
                                  minRows={1}
                                  maxRows={10}
                                  className={`${formTextareaChrome} ${duplicateIndices.headlines.has(index) ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : ""
                                    }`}
                                  style={{
                                    scrollbarWidth: "thin",
                                    scrollbarColor: "#c7c7c7 transparent",
                                  }}
                                  placeholder="Enter headline"
                                  disabled={!isLoggedIn}
                                  multiline
                                />
                              ) : (
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
                                  className={`${formTextareaChrome} ${duplicateIndices.headlines.has(index) ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : ""
                                    }`}
                                  style={{
                                    scrollbarWidth: "thin",
                                    scrollbarColor: "#c7c7c7 transparent",
                                  }}
                                  placeholder={isCarouselAd ? `Description for card ${index + 1}` : "Enter headline"}
                                  disabled={!isLoggedIn}
                                />
                              )}
                              {duplicateIndices.headlines.has(index) && (
                                <p className="text-xs text-red-500 mt-1">Duplicate values can cause errors when making ads</p>
                              )}
                            </div>
                            {!isCatalogueAd && headlines.length > 1 && !(isCarouselAd && applyHeadlinesToAllCards) && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="border border-gray-400 rounded-xl bg-white shadow-xs"
                                size="icon"
                                onClick={() => removeField(setHeadlines, headlines, index)}
                              >
                                <Trash2 className="w-4 h-4 text-gray-600 cursor-pointer !hover:text-red-500" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            )}
                          </div>
                        ))}
                        {!isCatalogueAd && headlines.length < (isCarouselAd ? 10 : 5) && !(isCarouselAd && applyHeadlinesToAllCards) && (
                          <Button
                            type="button"
                            size="sm"
                            className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                            onClick={() => addField(setHeadlines, headlines)}
                          >
                            <Plus className="mr-2 h-4 w-4 text-white" />
                            {isCarouselAd ? "Add card description" : "Add headline option"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {!isCarouselAd && (
                      <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                          id="addDescriptions"
                          checked={addDescriptions}
                          onCheckedChange={handleAddDescriptionsToggle}
                          className="border-gray-300 w-4 h-4 rounded-md"
                          disabled={!isLoggedIn}
                        />
                        <label htmlFor="addDescriptions" className="text-xs text-gray-600 cursor-pointer">
                          Add Descriptions
                        </label>
                      </div>
                    )}

                    {/* Descriptions Section */}

                    {showDescriptions && (
                      <div className="space-y-2">
                        <Label className="inline-flex items-center gap-1">
                          {renderDiffMark("descriptions")}
                          <span>{isCarouselAd ? "Primary Text" : "Descriptions"}</span>
                        </Label>
                        {hasPlacementCustomizationExtraDescriptions && (
                          <p className="text-xs text-red-500">Placement Customized Ads can only have 1 description field.</p>
                        )}
                        <div className="space-y-3">
                          {isCarouselAd ? (
                            <div className="flex items-center gap-2">
                              <TextareaAutosize
                                value={descriptions[0] || ""}
                                onChange={(e) => setDescriptions([e.target.value])}
                                minRows={2}
                                maxRows={10}
                                className={formTextareaChrome}
                                style={{
                                  scrollbarWidth: "thin",
                                  scrollbarColor: "#c7c7c7 transparent",
                                }}
                                placeholder="Enter primary text"
                                disabled={!isLoggedIn}
                              />
                            </div>
                          ) : (
                            <>
                              {descriptions.map((value, index) => {
                                const isInactivePlacementDescription = isPlacementCustomizedSingleDescription && index > 0;

                                return (
                                  <div key={index} className={`flex items-center gap-2 ${isInactivePlacementDescription ? "opacity-60" : ""}`}>
                                    <div className="flex flex-col w-full">
                                      {isCatalogueAd ? (
                                        <CatalogueVariableField
                                          value={value}
                                          onValueChange={(nextValue) => updateField(setDescriptions, descriptions, index, nextValue)}
                                          minRows={1}
                                          maxRows={10}
                                          className={`${formTextareaChrome} ${duplicateIndices.descriptions.has(index) ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : ""
                                            } ${isInactivePlacementDescription ? "!bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                          style={{
                                            scrollbarWidth: "thin",
                                            scrollbarColor: "#c7c7c7 transparent",
                                          }}
                                          placeholder="Enter description"
                                          disabled={!isLoggedIn || isInactivePlacementDescription}
                                          multiline
                                        />
                                      ) : (
                                        <TextareaAutosize
                                          value={value}
                                          onChange={(e) => updateField(setDescriptions, descriptions, index, e.target.value)}
                                          minRows={1}
                                          maxRows={10}
                                          className={`${formTextareaChrome} ${duplicateIndices.descriptions.has(index) ? "!border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : ""
                                            } ${isInactivePlacementDescription ? "!bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                          style={{
                                            scrollbarWidth: "thin",
                                            scrollbarColor: "#c7c7c7 transparent",
                                          }}
                                          placeholder="Enter description"
                                          disabled={!isLoggedIn || isInactivePlacementDescription}
                                        />
                                      )}
                                      {duplicateIndices.descriptions.has(index) && (
                                        <p className="text-xs text-red-500 mt-1">Duplicate values can cause errors when making ads</p>
                                      )}
                                    </div>
                                    {!isCatalogueAd && descriptions.length > 1 && (
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
                                );
                              })}
                              {!isCatalogueAd &&
                                descriptions.length < 5 &&
                                (isPlacementCustomizedSingleDescription ? (
                                  descriptions.length <= 1 ? (
                                    <TooltipProvider delayDuration={0}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="block w-full">
                                            <Button
                                              type="button"
                                              size="sm"
                                              className="w-full rounded-xl shadow bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-200"
                                              disabled
                                            >
                                              <Plus className="mr-2 h-4 w-4 text-gray-500" />
                                              Add description option
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">
                                          You can't add more than 1 description to placement customized ads.
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="w-full rounded-xl shadow bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-200"
                                      disabled
                                    >
                                      <Plus className="mr-2 h-4 w-4 text-gray-500" />
                                      Add description option
                                    </Button>
                                  )
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
                                    onClick={() => addField(setDescriptions, descriptions)}
                                  >
                                    <Plus className="mr-2 h-4 w-4 text-white" />
                                    Add description option
                                  </Button>
                                ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {hasCatalogueStaticCardVariableWarning && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Catalog variables in the headline or description work on product cards, but they will not resolve on the uploaded static card.
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
                            className={`p-0.5 rounded transition-colors ${activeIgCaptionIndex === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              }`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={activeIgCaptionIndex === selectedIgOrganicPosts.length - 1}
                            onClick={() => setActiveIgCaptionIndex((prev) => prev + 1)}
                            className={`p-0.5 rounded transition-colors ${activeIgCaptionIndex === selectedIgOrganicPosts.length - 1
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              }`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </Label>
                    <TextareaAutosize
                      value={selectedIgOrganicPosts[activeIgCaptionIndex]?.caption || ""}
                      disabled
                      minRows={2}
                      maxRows={10}
                      className="border border-gray-200 shadom-md rounded-xl bg-gray-100 w-full px-3 py-2 text-sm resize-none focus:outline-none text-gray-500 cursor-not-allowed"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#c7c7c7 transparent",
                      }}
                      placeholder="No caption available"
                    />
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-xs text-blue-700">Ad copy will be sourced from the selected Instagram posts.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="flex items-center gap-2">
                        {renderDiffMark(isCatalogueAd ? "link" : showPhoneNumberField ? "phoneNumber" : "link")}
                        {!isCatalogueAd && showPhoneNumberField ? <Phone className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                        {!isCatalogueAd && showPhoneNumberField
                          ? "Phone Number"
                          : destinationType === "instant_experience"
                            ? "Instant Experience"
                            : "Link (URL)"}
                      </Label>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                        {supportsInstantExperience && (
                          <Tabs
                            value={destinationType}
                            onValueChange={(nextDestinationType) => {
                              if (nextDestinationType === destinationType) return;

                              if (nextDestinationType === "instant_experience") {
                                setDestinationType("instant_experience");
                                setInstantExperienceId("");
                                setLink([""]);
                                setCustomLink("");
                                setShowCustomLink(false);
                                return;
                              }

                              setDestinationType("website");
                              setInstantExperienceId("");
                              setLink([""]);
                            }}
                          >
                            <TabsList className="h-8 rounded-xl bg-gray-100 p-0.5">
                              <TabsTrigger value="website" className="h-7 rounded-lg px-2.5 py-1 text-[11px]">
                                Website
                              </TabsTrigger>
                              <TabsTrigger value="instant_experience" className="h-7 rounded-lg px-2.5 py-1 text-[11px]">
                                Instant Experience
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        )}
                        {isCarouselAd && destinationType === "website" && !showPhoneNumberField && !isCatalogueAd && (
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
                      </div>
                    </div>
                    <p className="text-gray-500 text-[12px] font-regular">
                      {!isCatalogueAd && showPhoneNumberField ? (
                        <>
                          This phone number will be used for your call ads. <span className="font-semibold">Please add country code as well</span>
                        </>
                      ) : isCatalogueAd ? (
                        "Optional destination URL for the catalogue creative."
                      ) : destinationType === "instant_experience" ? (
                        "Choose a published Instant Experience connected to the selected Facebook Page."
                      ) : (
                        "Your UTMs will be auto applied from Preferences"
                      )}
                    </p>

                    {isCatalogueAd ? (
                      <Input
                        type="text"
                        value={link[0] || ""}
                        onChange={(event) => {
                          setCustomLink(event.target.value);
                          setLink([event.target.value]);
                        }}
                        className={cn("w-full", formInputChrome)}
                        placeholder="https://example.com"
                        disabled={!isLoggedIn}
                      />
                    ) : showPhoneNumberField ? (
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
                    ) : destinationType === "instant_experience" ? (
                      <div className="space-y-2">
                        <Select
                          value={instantExperienceId || ""}
                          onValueChange={(experienceId) => {
                            setInstantExperienceId(experienceId);
                            setLink([`https://fb.com/canvas_doc/${experienceId}`]);
                          }}
                          disabled={!isLoggedIn || !pageId || instantExperiencesLoading || instantExperiences.length === 0}
                        >
                          <SelectTrigger className={cn("w-full", formFieldChrome)}>
                            <SelectValue
                              placeholder={
                                !pageId
                                  ? "Please select a Facebook Page to fetch related Instant Experiences"
                                  : instantExperiencesLoading
                                    ? "Loading Instant Experiences..."
                                    : instantExperiencesError || "Select an Instant Experience"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto bg-white shadow-lg rounded-xl">
                            {instantExperiences.map((experience) => (
                              <SelectItem
                                key={experience.id}
                                value={experience.id}
                                className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-xl mx-2 my-1"
                              >
                                {experience.name || `Instant Experience ${experience.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg flex-shrink-0">Default</span>
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
                                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>
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
                    <Popover open={ctaOpen} onOpenChange={setCtaOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="cta"
                          disabled={!isLoggedIn}
                          variant="outline"
                          role="combobox"
                          className={cn(formDropdownTriggerChrome, "w-full justify-between px-3 text-sm font-normal")}
                        >
                          <span className={cn("truncate", !selectedCtaLabel && "text-muted-foreground")}>{selectedCtaLabel || "Select a CTA"}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={{
                          minWidth: "var(--radix-popover-trigger-width)",
                          width: "auto",
                        }}
                      >
                        <Command filter={() => 1} loop={false} value="">
                          <CommandInput
                            placeholder="Search CTAs..."
                            value={ctaSearch}
                            onValueChange={setCtaSearch}
                            className="bg-transparent"
                            wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                          />
                          <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                            <ScrollArea viewportClassName="max-h-[350px]">
                              <CommandGroup>
                                {filteredCtaOptions.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleCtaSelect(option.value)}
                                    className={`
                                    px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150
                                    hover:bg-gray-100
                                    ${cta === option.value ? "bg-gray-100 font-semibold" : ""}
                                    `}
                                    data-selected={option.value === cta}
                                  >
                                    {option.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </ScrollArea>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {/* Shop Destination Selector - Only show when needed */}
                  <ShopDestinationSelector
                    pageId={pageId}
                    adAccountId={selectedAdAccount}
                    selectedShopDestination={selectedShopDestination}
                    setSelectedShopDestination={setSelectedShopDestination}
                    selectedShopDestinationType={selectedShopDestinationType}
                    setSelectedShopDestinationType={setSelectedShopDestinationType}
                    selectedProductCatalogId={selectedShopProductCatalogId}
                    setSelectedProductCatalogId={setSelectedShopProductCatalogId}
                    isFieldModified={() =>
                      isFormFieldModified?.([
                        "selectedShopDestination",
                        "selectedShopDestinationType",
                        "selectedShopProductCatalogId",
                      ])
                    }
                    isVisible={showShopDestinationSelector}
                  />
                  <ShopDestinationSelector
                    pageId={pageId}
                    adAccountId={selectedAdAccount}
                    selectedShopDestination={productExtensionProductSetId}
                    setSelectedShopDestination={setProductExtensionProductSetId}
                    setSelectedShopDestinationType={NOOP}
                    selectedProductCatalogId={productExtensionProductCatalogId}
                    setSelectedProductCatalogId={setProductExtensionProductCatalogId}
                    isFieldModified={() =>
                      isFormFieldModified?.(["productExtensionProductCatalogId", "productExtensionProductSetId"])
                    }
                    isVisible={showProductExtensionSelector}
                    allowedTypes={["product_set"]}
                    label="Product Set (Optional)"
                    description={
                      <>
                        <span className="text-gray-400">You are seeing this because the catalog items creative enhancement is enabled.</span> Not
                        selecting a product set here can lead to Meta errors.
                      </>
                    }
                    placeholder="Select product set"
                    searchPlaceholder="Search product sets..."
                    emptyLabel="No product sets available"
                    triggerClassName={formFieldChrome}
                  />
                  {showPixelTrackingOverride && selectedAdAccount && (
                    <div className="pt-5">
                      <PixelTracking
                        pixelTracking={pixelTrackingOverride}
                        setPixelTracking={setPixelTrackingOverride}
                        selectedAdAccount={selectedAdAccount}
                        title="Pixel Tracking"
                        description={null}
                        isModified={isFormFieldModified?.("pixelTrackingOverride")}
                        bare
                      />
                    </div>
                  )}
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
                            const response = await fetch(`${API_BASE_URL}/auth/fetch-leadgen-forms?pageId=${encodeURIComponent(pageId)}`, {
                              credentials: "include",
                            });
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
                        <SelectValue
                          placeholder={loadingForms ? "Loading forms..." : leadgenForms.length === 0 ? "No forms available" : "Select a form"}
                        />
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
                              selectedForm === form.id && "!bg-gray-100 font-semibold rounded-xl",
                            )}
                          >
                            {form.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="block">Upload Media</Label>
                      {isCatalogueAd && (
                        <p className="mt-1 text-xs text-gray-500">Optional: add static images. Each image creates a separate catalogue ad.</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* "Get Top Ads For Flex" — only when the user has chosen the
                          flexible ad type. Opens a modal that fetches the same
                          flex-ad candidates as the analytics dashboard and imports
                          the selected assets directly into importedFiles. */}
                      {adType === "flexible" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (!selectedAdAccount) {
                              toast.error("Please select an ad account first");
                              return;
                            }
                            setFlexAdsImportOpen(true);
                          }}
                          // Purple border + faint purple drop-shadow to match the
                          // BicepsFlexed icon (text-purple-500 == rgb(168, 85, 247)).
                          // Drop-shadow alpha kept at ~0.25 so it reads as a subtle
                          // lift rather than competing with the sibling button.
                          className={cn(
                            "h-9 px-3 flex items-center gap-1.5 text-black bg-white hover:bg-white border !border-purple-500 shadow-[0_1px_4px_0_rgba(168,85,247,0.25)]",
                            formFieldChrome,
                          )}
                        >
                          <BicepsFlexed className="h-4 w-4 text-purple-500" />
                          View Top Creatives for Flexible Ads
                        </Button>
                      )}

                      <Popover open={uploadSourcesOpen} onOpenChange={handleUploadSourcesOpenChange}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            className={cn("h-9 px-3 flex items-center gap-1.5 text-black hover:bg-white border !border-gray-200", formFieldChrome)}
                          >
                            <CloudUpload className="h-4 w-4" />
                            Manage Upload Sources
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="bg-white rounded-xl p-2 w-72 border border-gray-200 shadow-lg">
                          <div className="flex flex-col">
                            {UPLOAD_SOURCE_OPTIONS.map((src) => {
                              const checked = uploadSources.includes(src.id);
                              return (
                                <label key={src.id} className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-100">
                                  <Checkbox checked={checked} onCheckedChange={() => toggleUploadSource(src.id)} />
                                  <img src={src.icon} alt="" className={src.dropdownIconClass || "h-4 w-4 object-contain"} />
                                  <span className="text-sm text-gray-800">{src.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {uploadSources.includes("local") && (
                    <div
                      {...getRootProps()}
                      className={`group cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
                        }`}
                    >
                      <input {...getInputProps()} disabled={!isLoggedIn || isImportingCsv} />
                      <div className="flex flex-col items-center gap-2">
                        {isImportingCsv ? (
                          <Loader className="h-6 w-6 animate-spin text-blue-600" />
                        ) : (
                          <Upload className="h-6 w-6 text-gray-500 group-hover:text-black" />
                        )}
                        {isDragActive ? (
                          <p className="text-sm text-gray-500 group-hover:text-black">Drop files here ...</p>
                        ) : (
                          <p className="text-sm text-gray-500 group-hover:text-black">
                            {isImportingCsv
                              ? "Importing CSV…"
                              : isCatalogueAd
                                ? "Drag & drop one image here, or click to select an image"
                                : "Drag & drop media or one CSV here, or click to select files"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const rowSources = uploadSources.filter((s) => {
                      if (s === "local") return false;
                      if (isCatalogueAd && (s === "instagram" || s === "meta_library")) return false;
                      return true;
                    });
                    if (rowSources.length === 0) return null;
                    const mode = rowSources.length <= 2 ? "full" : rowSources.length === 3 ? "compact" : "icon";

                    const renderButton = (src, onClick, disabled = false) => {
                      const fullLabel = src.fullLabel;
                      const compactLabel = src.compactLabel;
                      const iconImg = <img src={src.icon} alt={src.name} className={src.iconClass || "h-4 w-4 object-contain"} />;
                      return (
                        <Button
                          type="button"
                          onClick={onClick}
                          disabled={disabled}
                          className="w-full bg-black hover:bg-zinc-800 text-white rounded-2xl h-[48px] flex items-center justify-center gap-2 px-3 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100"
                        >
                          {iconImg}
                          {mode === "full" && <span className="truncate">{fullLabel}</span>}
                          {mode === "compact" && <span className="truncate">{compactLabel}</span>}
                        </Button>
                      );
                    };

                    const hasFastUploadSource = rowSources.some((id) => ["drive", "dropbox", "frameio"].includes(id));

                    return (
                      <div className="mb-2 space-y-1">
                        <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFilePickerChange} />
                        <div className="flex gap-2">
                          {rowSources.map((id) => {
                            const src = UPLOAD_SOURCE_OPTIONS.find((o) => o.id === id);
                            if (!src) return null;

                            if (id === "instagram" || id === "meta_library") {
                              return (
                                <div className="flex-1" key={id}>
                                  <MetaMediaLibraryModal
                                    adAccountId={selectedAdAccount}
                                    isLoggedIn={isLoggedIn}
                                    importedFiles={importedFiles}
                                    setImportedFiles={setImportedFiles}
                                    instagramAccountId={instagramAccountId}
                                    selectedIgOrganicPosts={selectedIgOrganicPosts}
                                    setSelectedIgOrganicPosts={setSelectedIgOrganicPosts}
                                    showSourceSwitcher={false}
                                    renderTrigger={(openWithSource) => renderButton(src, () => openWithSource(id))}
                                  />
                                </div>
                              );
                            }

                            const clickHandler =
                              id === "csv"
                                ? handleCsvSourceClick
                                : id === "drive"
                                  ? handleDriveClick
                                  : id === "dropbox"
                                    ? handleDropboxClick
                                    : id === "frameio"
                                      ? handleFrameioClick
                                      : id === "drafts"
                                        ? () => setDraftsModalOpen(true)
                                        : () => { };

                            const draftDisabled = id === "drafts" && !selectedAdAccount;
                            const sourceButton = renderButton(src, clickHandler, draftDisabled);

                            return (
                              <div className="flex-1" key={id}>
                                {draftDisabled ? (
                                  <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="w-full">{sourceButton}</div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs rounded-xl text-xs">
                                        Select an ad account at the top to view drafts.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  sourceButton
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {hasFastUploadSource && (
                          <p className="px-1 text-[11px] leading-tight text-gray-500">Google Drive/Dropbox/Frame files upload 5X faster</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <FrameioPickerModal open={frameioPickerOpen} onOpenChange={setFrameioPickerOpen} onConfirm={handleFrameioFilesSelected} />

                {/* Flex Ads import modal — opened by the "Get Top Ads For Flex"
                    button. mode defaults to 'cpr' since the form doesn't track
                    a CPA/ROAS preference today; the column label adjusts but
                    backend candidate selection is unaffected. */}
                <FlexAdsImportModal
                  open={flexAdsImportOpen}
                  onOpenChange={setFlexAdsImportOpen}
                  adAccountId={selectedAdAccount}
                  conversionEvent={adAccountSettings?.conversionEvent}
                  importedFiles={importedFiles}
                  setImportedFiles={setImportedFiles}
                />

                <DraftsModal
                  open={draftsModalOpen}
                  onOpenChange={setDraftsModalOpen}
                  adAccountId={selectedAdAccount}
                  adAccountName={adAccounts.find((account) => String(account.id) === String(selectedAdAccount))?.name || ""}
                  onRestore={onRestoreDraft}
                />

                {/* Google Picker normally writes absolute top/left coordinates
                    when setVisible runs. Keep this stylesheet mounted before the
                    iframe is created so every launch path is centered from its
                    first painted frame, including CSV/native-file-picker flows. */}
                <style>{`
                  .picker-dialog-bg {
                    position: fixed !important;
                    inset: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                    z-index: 2147483645 !important;
                  }

                  .picker-dialog {
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    right: auto !important;
                    bottom: auto !important;
                    margin: 0 !important;
                    transform: translate(-50%, -50%) !important;
                    z-index: 2147483646 !important;
                  }

                  .picker-dialog,
                  .picker-dialog-content,
                  .picker-frame {
                    border-radius: 16px !important;
                  }

                  .picker-dialog,
                  .picker-dialog-content {
                    overflow: hidden !important;
                  }
                `}</style>

                {showFolderInput && (
                  <div
                    className="fixed left-1/2 z-[2147483647] w-[calc(100vw-1rem)] max-w-[500px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                    style={{
                      // The CSS contract above centers the picker. Anchor this panel's
                      // bottom edge above its calculated top edge and outer frame.
                      bottom: `calc(50% + ${Math.ceil(pickerDialogHeight / 2) + 40}px)`,
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h3 className="min-w-0 truncate font-semibold text-sm">
                          {pendingCsvDriveImport ? "Navigate to Folder" : "Quick Navigate to Folder"}
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowFolderInput(false);
                            setFolderLinkValue("");
                          }}
                          className="h-6 w-6 p-0"
                        ></Button>
                      </div>

                      {pendingCsvDriveImport && (
                        <p className="text-xs leading-relaxed text-gray-600">
                          Enter a link to the folder containing these files and select all and import. Google Drive requires explicit file imports
                          into the app. Or manually navigate to the folder in the picker below and import the files
                        </p>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="text"
                          placeholder={pendingCsvDriveImport ? "Paste the CSV creatives folder link" : "Paste Google Drive folder link here"}
                          value={folderLinkValue}
                          onChange={(e) => setFolderLinkValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleImportFromFolder();
                            }
                          }}
                          className={cn("min-w-0 flex-1 bg-white", formInputChrome)}
                        />
                        <Button
                          type="button"
                          onClick={handleImportFromFolder}
                          disabled={!folderLinkValue}
                          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 sm:w-auto"
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
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1">
            <Popover
              open={draftMenuOpen}
              onOpenChange={(nextOpen) => {
                if (savingDraft && !nextOpen) return;
                setDraftMenuOpen(nextOpen);
                if (!nextOpen) setDraftUpdateMenuOpen(false);
                if (nextOpen && SHOW_DRAFT_UPDATE) loadDraftUpdateOptions();
              }}
            >
              <PopoverAnchor asChild>
                <div className="group flex h-12 w-full overflow-hidden rounded-2xl bg-neutral-950 text-white">
                  <Button
                    type="submit"
                    className="peer h-12 flex-1 rounded-none bg-neutral-950 text-white hover:bg-blue-700 disabled:bg-zinc-400 disabled:text-white disabled:opacity-100 disabled:hover:bg-zinc-400"
                    disabled={publishDisabled || isQueueingJobs}
                  >
                    {isQueueingJobs ? "Publishing Ads..." : "Publish Ads"}
                  </Button>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative flex h-12 w-12 items-center justify-center bg-neutral-950 transition before:pointer-events-none before:absolute before:left-0 before:top-3 before:h-6 before:w-px before:bg-white/25 before:transition-opacity hover:bg-zinc-800 group-hover:before:opacity-0 peer-hover:!bg-blue-700 disabled:opacity-50"
                      disabled={savingDraft || !selectedAdAccount}
                      aria-label="Save as draft"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                </div>
              </PopoverAnchor>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={6}
                avoidCollisions={false}
                className="w-[var(--radix-popover-trigger-width)] rounded-3xl border border-gray-200 bg-gray-100 p-2 shadow-xl"
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSaveDraft();
                      }
                    }}
                    placeholder="Draft name"
                    maxLength={120}
                    className="h-9 min-w-0 flex-1 rounded-xl bg-white px-2.5"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={() => handleSaveDraft()}
                    disabled={savingDraft || !draftName.trim()}
                    className="h-9 shrink-0 rounded-xl bg-black px-3 text-white hover:bg-blue-700"
                  >
                    {savingDraft && draftSaveMode === "save" ? (
                      <>
                        <Loader className="mr-1.5 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1 h-4 w-4" /> Save Draft
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSaveDraft(null, { copyPreviewLink: true })}
                    disabled={savingDraft || !draftName.trim()}
                    className="h-9 shrink-0 rounded-xl bg-blue-600 px-3 text-white hover:bg-blue-700"
                  >
                    {savingDraft && draftSaveMode === "preview" ? (
                      <>
                        <Loader className="mr-1.5 h-4 w-4 animate-spin" /> Copying...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-1 h-4 w-4" /> Copy Preview Link
                      </>
                    )}
                  </Button>
                  {SHOW_DRAFT_UPDATE && !loadingDraftUpdateOptions && draftUpdateOptions.length > 0 && (
                    <Popover open={draftUpdateMenuOpen} onOpenChange={handleDraftUpdateMenuChange}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={savingDraft}
                          className="h-9 shrink-0 rounded-xl border-gray-300 bg-white px-3 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                        >
                          {savingDraft && draftSaveMode === "update" ? (
                            <>
                              <Loader className="mr-1.5 h-4 w-4 animate-spin" /> Updating...
                            </>
                          ) : (
                            "Update"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" sideOffset={6} className="w-72 rounded-2xl border-gray-200 bg-white p-2 shadow-xl">
                        <p className="px-2 pb-1.5 text-xs font-medium text-gray-500">Select a draft to update</p>
                        <ScrollArea className="h-56">
                          {draftUpdateOptions.map((draft) => (
                            <button
                              key={draft.id}
                              type="button"
                              onClick={() => handleSaveDraft(draft)}
                              className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-gray-100"
                            >
                              <span className="block truncate text-sm font-medium text-gray-900">{draft.name}</span>
                            </button>
                          ))}
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                {savingDraft && (
                  <div className="mt-2 rounded-xl bg-white px-2 py-1.5">
                    <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-gray-600">
                      <span className="truncate">{draftSaveProgress.message || "Saving draft..."}</span>
                      <span className="shrink-0 font-medium">{draftSaveProgress.value}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Progress value={draftSaveProgress.value} className="h-1.5 flex-1 bg-gray-200 [&>div]:bg-blue-600" />
                      <button
                        type="button"
                        onClick={handleCancelDraftSave}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        aria-label="Cancel draft save"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {adSetTimingIssue && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">{adSetTimingIssue.message}</div>
            )}

            {variants.length > 1 && hasConfiguredFormSplits && (
              <div className="text-xs text-gray-500 mt-2">
                Publishing {populatedVariantSummaries.length} job{populatedVariantSummaries.length === 1 ? "" : "s"}:{" "}
                {populatedVariantSummaries.map((variant) => `${variant.name} (${variant.count})`).join(" · ")}
              </div>
            )}

            {duplicateFileNameWarnings.map((warning) => (
              <div key={warning.key} className="flex items-start gap-1 p-2 bg-orange-50 border border-orange-200 rounded-xl mt-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span className="text-xs text-orange-700">
                  Group {warning.groupNumber} has 2 files which share the same name {warning.fileName}. This can lead to errors when processing the
                  file by Meta. Consider renaming one of them.
                </span>
              </div>
            ))}

            {!isCarouselAd && hasDuplicates && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Duplicate values found in your text fields — this can lead to errors when making ads. Please remove duplicates before publishing.
              </div>
            )}

            {showShopDestinationSelector && !selectedShopDestination && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">Please select a shop destination</div>
            )}

            {hasCatalogueInvalidMedia && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Catalogue ads support image files only. Remove videos, GIFs, or unsupported files before publishing.
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

            {isCarouselAd &&
              files.length + driveFiles.length + dropboxFiles.length + frameioFiles.length > 0 &&
              files.length + driveFiles.length + dropboxFiles.length + frameioFiles.length < 2 && (
                <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                  Carousel ads require at least 2 files. You have {files.length + driveFiles.length + dropboxFiles.length}.
                </div>
              )}

            {isFlexLikeAdType &&
              fileGroups.length === 0 &&
              files.length + driveFiles.length + importedFiles.length + dropboxFiles.length + frameioFiles.length > 10 && (
                <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                  This ad type can have maximum 10 files per ad. You have{" "}
                  {files.length + driveFiles.length + importedFiles.length + dropboxFiles.length + frameioFiles.length}. Use the group ads button to
                  split them into multiple ads.
                </div>
              )}

            {isMissingDestinationValue && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                {showPhoneNumberField ? "Please provide a phone number" : "Please provide a link URL"}
              </div>
            )}
            {enablePlacementCustomization && !isCarouselAd && !isFlexLikeAdType && selectedFiles && selectedFiles.size > 1 && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                You have ungrouped files for placement customization. Use the group ads button on the top right to group files{" "}
              </div>
            )}

            {shouldShowLeadFormSelector && !selectedForm && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Please select a lead form to publish lead ads
              </div>
            )}

            {!isDuplicationMode && !hasPublishBlockingIssueBeforePage && isPageMissing && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
                Please select a Facebook page to publish ads
              </div>
            )}

            {!hasPublishBlockingIssueBeforePage && !isPageMissing && isAdSetMissing && (
              <div className="text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">Please select an ad set to post to</div>
            )}

            {!isDuplicationMode &&
              !publishDisabled &&
              !hasAdNameFormulaConfigured &&
              adName === "Ad Generated Through Blip" &&
              !(showShopDestinationSelector && !selectedShopDestination) &&
              !(!isCarouselAd && hasDuplicates) &&
              !isMissingDestinationValue &&
              !(shouldShowLeadFormSelector && !selectedForm) && (
                <div className="text-xs text-orange-700 text-left p-2 bg-orange-50 border border-orange-200 rounded-xl">
                  Your ads will be named "Ad Generated Through Blip" since no ad name formula is set.{" "}
                  <button
                    type="button"
                    className="underline decoration-gray-400 text-orange-900 font-medium"
                    onClick={() => document.getElementById("adName")?.scrollIntoView({ behavior: "smooth", block: "center" })}
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
                      !launchPaused ? "bg-green-50 border border-green-300" : "border border-transparent",
                    )}
                  >
                    <RadioGroupItem
                      value="active"
                      id="statusActive"
                      className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500 [&[data-state=checked]_svg_circle]:fill-green-500"
                    />
                    <Label
                      htmlFor="statusActive"
                      className={cn("text-sm font-medium leading-none cursor-pointer", !launchPaused ? "text-green-600" : "text-gray-600")}
                    >
                      Active
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-xl transition-colors duration-150",
                      launchPaused ? "bg-red-50 border border-red-300" : "border border-transparent",
                    )}
                  >
                    <RadioGroupItem
                      value="paused"
                      id="statusPaused"
                      className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-red-500 data-[state=checked]:text-red-500 [&[data-state=checked]_svg_circle]:fill-red-500"
                    />
                    <Label
                      htmlFor="statusPaused"
                      className={cn("text-sm font-medium leading-none cursor-pointer", launchPaused ? "text-red-600" : "text-gray-600")}
                    >
                      Paused
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Schedule — pushed to the right, only for sales/app promo */}
              {canShowAdSchedule && (
                <div className="flex items-center gap-2">
                  <Popover open={showSchedule} onOpenChange={setShowSchedule}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-10 min-w-[128px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium shadow-sm transition-colors",
                          adScheduleStartTime || adScheduleEndTime
                            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {renderDiffMark(["adScheduleStartTime", "adScheduleEndTime"])}
                        <span>Ad Schedule</span>
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="w-[380px] max-w-[92vw] rounded-[21px] border border-gray-200 bg-white p-5 shadow-xl"
                      align="end"
                      sideOffset={10}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-800">Ad Schedule</p>
                          <span className="truncate text-xs font-medium text-gray-400">{userTimeZone}</span>
                        </div>

                        <ScheduleDateTimePicker
                          label="Start Time"
                          value={adScheduleStartTime}
                          minDateTime={scheduleStartMinTime}
                          onChange={(iso) => setAdScheduleStartTime(iso)}
                          onClear={() => setAdScheduleStartTime(null)}
                        />

                        <ScheduleDateTimePicker
                          label="End Time"
                          value={adScheduleEndTime}
                          onChange={(iso) => setAdScheduleEndTime(iso)}
                          onClear={() => setAdScheduleEndTime(null)}
                        />

                        {formatScheduleLabel() && (
                          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                            <p className="text-xs font-medium text-gray-600">{formatScheduleLabel()}</p>

                            {isStartScheduleNotFuture && <p className="text-xs text-amber-700">Start time selected is in the past.</p>}
                          </div>
                        )}

                        {isEndScheduleBeforeStart && (
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
            {canShowAdSchedule && formatScheduleLabel() && (
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

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 rounded-xl transition-colors duration-150">
              <Checkbox
                id="discloseAiMedia"
                checked={discloseAiMedia}
                onCheckedChange={(checked) => setDiscloseAiMedia(Boolean(checked))}
                disabled={!isLoggedIn}
                className="rounded-md focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Label htmlFor="discloseAiMedia" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Disclose AI Media
              </Label>
            </div>

            <div className="flex items-center space-x-2 rounded-xl transition-colors duration-150">
              <Checkbox
                id="preserveMedia"
                checked={preserveMedia}
                onCheckedChange={setPreserveMedia}
                disabled={!isLoggedIn}
                className="rounded-md focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Label htmlFor="preserveMedia" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Don't clear media after publishing ads
              </Label>
            </div>
          </div>
        </form>
      </CardContent>
      {showSaveNewDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ position: "fixed", top: -20, left: 0, right: 0, bottom: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              setShowSaveNewDialog(false);
              setNewTemplateNameInput("");
            }}
            style={{ animation: "templateBtnIn 0.2s ease-out forwards" }}
          />
          {/* Dialog */}
          <div
            className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-[400px] p-6 space-y-4"
            style={{ animation: "templateBtnIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
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
            {copyTemplates[newTemplateNameInput.trim()] && <p className="text-xs text-red-500">A template with this name already exists.</p>}
            <div className="flex justify-end gap-2 pt-2">
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
      {showCsvImportGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35" onClick={() => setShowCsvImportGuide(false)} />
          <div
            className="relative w-[min(34rem,calc(100vw-2rem))] rounded-[28px] border border-gray-200 bg-white p-6 shadow-xl"
            style={{ animation: "templateBtnIn 0.2s ease-out forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close CSV import guide"
              className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
              onClick={() => setShowCsvImportGuide(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src={CsvFileIcon} alt="" className="h-6 w-6 object-contain" />
                <h3 className="pr-10 text-lg font-semibold text-gray-900">Import ad variants from CSV</h3>
              </div>
            </div>

            <div className="mt-4 text-left text-sm leading-6 text-gray-700">
              <ul className="list-disc space-y-2 pl-5">
                <li>Each CSV Row becomes a new form variant.</li>
                <li>
                  Columns Supported: <strong>Campaign Name</strong>, <strong>Ad Set Name</strong>, <strong>Ad Name</strong>,{" "}
                  <strong>Facebook Page</strong>, <strong>URL</strong>, <strong>Google Drive Link</strong>, <strong>Primary Text</strong>,{" "}
                  <strong>Headlines</strong> and <strong>Descriptions</strong> 1 through 5.
                </li>
                <li>Ad Name and Facebook Page are suggested to be setup in preferences.</li>
                <li>All other columns are optional and can be omitted.</li>
                <li>
                  When Drive links are included, keep the creatives in one folder. After the CSV is read, paste that folder link and select all
                  referenced files in Google Drive.
                </li>
                <li>
                  If you're not using google drive then you can leave out that column and manually upload creatives and assign them to variants as
                  well.
                </li>
                <li>Only single image/video ad type is currently supported.</li>
              </ul>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                type="button"
                className="h-12 w-full rounded-2xl bg-gray-100 text-black shadow-none hover:bg-gray-200 hover:text-black"
                onClick={() => void downloadCsvTemplate()}
              >
                Download Template
              </Button>
              <Button
                type="button"
                className="h-12 w-full rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800"
                disabled={isImportingCsv}
                onClick={() => {
                  setShowCsvImportGuide(false);
                  csvFileInputRef.current?.click();
                }}
              >
                {isImportingCsv && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Import CSV
              </Button>
            </div>
          </div>
        </div>
      )}
      {showFrameioConnectDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => {
              setShowFrameioConnectDialog(false);
              setShowFrameioConnectHelp(false);
            }}
          />
          <div
            className="relative w-[min(28rem,calc(100vw-2rem))] rounded-[28px] border border-gray-200 bg-white p-6 shadow-xl"
            style={{ animation: "templateBtnIn 0.2s ease-out forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src={FrameIcon} alt="Frame.io" className="h-7 w-7 rounded-sm object-cover" />
                <h3 className="text-lg font-semibold text-gray-900">Connect Frame IO</h3>
              </div>
              <p className="text-sm text-gray-600">
                Heads up, your Frame.io account needs to be connected to Adobe Authentication for this integratation to work.
              </p>
              <p className="text-sm font-bold text-gray-600">This is mostly an issue for older Frame Accounts.</p>
              <button
                type="button"
                onClick={() => setShowFrameioConnectHelp((prev) => !prev)}
                className="inline-flex w-full items-start justify-start gap-1 text-left text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                What to do if your Frame account is not connected to Adobe / Not sure if it is.
                <ChevronDown className={cn("h-4 w-4 transition-transform", showFrameioConnectHelp && "rotate-180")} />
              </button>
            </div>

            {showFrameioConnectHelp && (
              <div className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                <div className="space-y-2">
                  <p>
                    <span className="mr-1 font-semibold">1.</span>
                    In Frame.io go to{" "}
                    <span className="font-bold">Avatar → Settings → Profile → Authentication → Connect next to Adobe Authentication.</span>
                  </p>
                  <p>
                    <span className="mr-1 font-semibold">2.</span>
                    Your Adobe and Frame emails must match.
                  </p>
                  <p>
                    <span className="mr-1 font-semibold">3.</span>
                    If Connect Option is missing, it could be due to SSO or Google sign-in being enabled. You will have to disbale those.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setShowFrameioConnectDialog(false);
                  setShowFrameioConnectHelp(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setShowFrameioConnectDialog(false);
                  setShowFrameioConnectHelp(false);
                  launchFrameioAuthPopup();
                }}
              >
                Continue to Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
      {failedPreviewUrl && (
        <div
          role="alert"
          className="fixed bottom-6 left-6 z-[10000] w-[min(24rem,calc(100vw-3rem))] rounded-[28px] border border-[#bffdd9] bg-[#edfef3] p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <button
            type="button"
            aria-label="Close preview link copy notification"
            onClick={() => setFailedPreviewUrl("")}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[#bffdd9] bg-[#edfef3] text-[#008a2e] shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008a2e] focus-visible:ring-offset-2"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="text-sm font-medium text-[#008a2e]">Auto link copy failed. Form saved as a draft.</p>
          <Button
            type="button"
            onClick={handleRetryPreviewCopy}
            className="mt-3 h-10 w-full rounded-xl bg-[#008a2e] px-3 text-white hover:bg-[#007526]"
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            Click to Copy link
          </Button>
        </div>
      )}
      {variants.length > 1 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-black bg-black px-2 py-2 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ScrollArea type="always" className={cn("rounded-full", shouldScrollVariantPicker && "w-[34rem] max-w-[calc(100vw-9rem)] pb-2")}>
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
                          isActive ? "bg-zinc-700 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <VariantDot variantId={variant.id} variants={variants} />
                        <span className="whitespace-nowrap">{variant.name}</span>
                        <span className={cn("text-xs whitespace-nowrap", isActive ? "text-white/70" : "text-white/55")}>
                          · {assignedCount} ad{assignedCount !== 1 ? "s" : ""}
                        </span>
                      </button>
                      {variant.id !== "default" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(variant.id)}
                          aria-label={`Delete ${variant.name}`}
                          className="ml-0.5 rounded-full p-1 text-white/60 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
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
              <button
                type="button"
                onClick={handleAddVariant}
                aria-label="Add variant"
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowVariantOverview(true)}
                aria-label="View variant overview"
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteAllVariantsDialog(true)}
                aria-label="Delete all variants"
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
        </div>
      )}
      <Dialog open={showVariantOverview} onOpenChange={setShowVariantOverview}>
        <DialogContent
          disableSlide
          overlayClassName="bg-black/35"
          className="flex h-[min(86vh,900px)] w-[min(96vw,1500px)] max-w-none flex-col gap-0 overflow-hidden rounded-[32px] border-gray-200 bg-white p-0 sm:rounded-[32px]"
        >
          <DialogHeader className="shrink-0 border-b border-gray-200 px-6 py-5 pr-14">
            <DialogTitle>Variant overview</DialogTitle>
            <DialogDescription>Quickly compare targeting, copy, destinations, and assigned creative across every variant.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto bg-gray-50/50">
            <table className={cn("w-full border-separate border-spacing-0 text-left", hasPartnershipVariants ? "min-w-[1280px]" : "min-w-[1120px]")}>
              <thead className="sticky top-0 z-20 bg-gray-100/95 text-[10px] uppercase tracking-wide text-gray-500 backdrop-blur">
                <tr>
                  <th className="sticky left-0 z-30 w-44 border-b border-r border-gray-200 bg-gray-100 px-4 py-3 font-semibold">Variant</th>
                  <th className="w-60 border-b border-gray-200 px-4 py-3 font-semibold">Campaign / Ad set</th>
                  <th className="w-48 border-b border-gray-200 px-4 py-3 font-semibold">Page / Instagram</th>
                  {hasPartnershipVariants && <th className="w-40 border-b border-gray-200 px-4 py-3 font-semibold">Partnership</th>}
                  <th className="w-80 border-b border-gray-200 px-4 py-3 font-semibold">Copy</th>
                  <th className="w-64 border-b border-gray-200 px-4 py-3 font-semibold">Link / CTA</th>
                  <th className="min-w-[320px] border-b border-gray-200 px-4 py-3 font-semibold">Ads / Groups</th>
                </tr>
              </thead>
              <tbody>
                {variantOverviewRows.map((row, rowIndex) => (
                  <tr key={row.id} className="align-top">
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-b border-r border-gray-200 px-4 py-4",
                        rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50",
                      )}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <VariantDot variantId={row.id} variants={variants} />
                        <span>{row.name}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {row.mediaItems.length} ad{row.mediaItems.length !== 1 ? "s" : ""}
                      </p>
                    </td>
                    <td className="border-b border-gray-200 bg-white px-4 py-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Campaign</p>
                          <p className="mt-1 text-xs leading-4 text-gray-800">{row.campaignNames.join(", ") || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Ad set</p>
                          <p className="mt-1 text-xs leading-4 text-gray-800">{row.adSetNames.join(", ") || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-gray-200 bg-white px-4 py-4">
                      <p className="text-xs font-medium text-gray-800">{row.pageName}</p>
                      {row.instagramName && <p className="mt-1 text-[11px] text-gray-500">@{String(row.instagramName).replace(/^@/, "")}</p>}
                    </td>
                    {hasPartnershipVariants && (
                      <td className="border-b border-gray-200 bg-white px-4 py-4">
                        {row.isPartnershipAd ? (
                          <div className="space-y-1">
                            <span className="inline-flex rounded-full bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700">Enabled</span>
                            <p className="break-all text-[11px] leading-4 text-gray-600">{row.partnerName || "Partner selected"}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                    )}
                    <td className="border-b border-gray-200 bg-white px-4 py-4">
                      <div className="space-y-3">
                        <OverviewCopyList
                          label="Primary text"
                          values={row.messages}
                          onEdit={(index, value) => updateVariantOverviewValue(row.id, "messages", index, value)}
                        />
                        <OverviewCopyList
                          label="Headlines"
                          values={row.headlines}
                          onEdit={(index, value) => updateVariantOverviewValue(row.id, "headlines", index, value)}
                        />
                        <OverviewCopyList
                          label="Descriptions"
                          values={row.descriptions}
                          onEdit={(index, value) => updateVariantOverviewValue(row.id, "descriptions", index, value)}
                        />
                        {row.messages.every((value) => !String(value || "").trim()) &&
                          row.headlines.every((value) => !String(value || "").trim()) &&
                          row.descriptions.every((value) => !String(value || "").trim()) && <span className="text-xs text-gray-400">No copy</span>}
                      </div>
                    </td>
                    <td className="border-b border-gray-200 bg-white px-4 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
                        {String(row.cta)
                          .toLowerCase()
                          .split("_")
                          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                          .join(" ")}
                      </span>
                      <div className="mt-2 space-y-1">
                        {row.links.length > 0 ? (
                          row.links.map((linkEntry) => (
                            <div key={`${row.id}-link-${linkEntry.index}`} className="group/overview-value flex items-center gap-1">
                              <p className="max-w-56 flex-1 truncate text-[11px] text-blue-600">
                                {linkEntry.value}
                              </p>
                              <OverviewInlineEditor
                                value={linkEntry.value}
                                onSave={(value) => updateVariantOverviewValue(row.id, "link", linkEntry.index, value)}
                                label="link"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="group/overview-value flex items-center gap-1">
                            <p className="flex-1 text-xs text-gray-400">No link</p>
                            <OverviewInlineEditor
                              value=""
                              onSave={(value) => updateVariantOverviewValue(row.id, "link", 0, value)}
                              label="link"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="h-1 border-b border-gray-200 bg-white px-4 py-4">
                      {row.mediaItems.length > 0 ? (
                        <div className="grid h-full grid-cols-1 items-stretch gap-y-4">
                          {row.mediaItems.map((item, itemIndex) => (
                            <div
                              key={`${row.id}-media-${itemIndex}`}
                              className={cn(
                                "flex h-full min-h-[96px] min-w-0 flex-col",
                                item.isGroup && "rounded-2xl border border-gray-200 bg-gray-50 p-3",
                              )}
                            >
                              <div className={item.isGroup ? "mb-2" : "mb-1.5"}>
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</span>
                              </div>
                              <div
                                className={cn("grid min-h-[72px] flex-1 items-start gap-2", item.files.length === 1 && "h-full")}
                                style={{ gridTemplateColumns: `repeat(${Math.max(item.files.length, 1)}, minmax(0, 1fr))` }}
                              >
                                {item.files.map((file, fileIndex) => (
                                  <VariantOverviewThumbnail
                                    key={`${getFileId(file)}-${fileIndex}`}
                                    file={file}
                                    videoThumbs={videoThumbs}
                                    fitToWidth={item.files.length > 1 || item.isGroup}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No media assigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      {showDeleteAllVariantsDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDeleteAllVariantsDialog(false)} />
          <div
            className="relative w-[min(26rem,calc(100vw-2rem))] rounded-[32px] border border-gray-200 bg-white p-6 shadow-xl"
            style={{ animation: "templateBtnIn 0.2s ease-out forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Delete all variants?</h3>
              <p className="text-sm text-gray-500">This will remove every variant and move all assignments back to Default.</p>
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
      <Dialog open={showMetaActionHelp} onOpenChange={setShowMetaActionHelp}>
        <DialogContent disableSlide className="w-[min(32rem,calc(100vw-2rem))] rounded-[28px] border-gray-200 p-6 sm:rounded-[28px]">
          <DialogHeader>
            <DialogTitle>How to continue ad creation</DialogTitle>
            <DialogDescription>Complete these steps in Meta, then try publishing through Blip again.</DialogDescription>
          </DialogHeader>
          <ol className="ml-5 list-decimal space-y-4 text-sm leading-6 text-gray-700">
            <li>Sometimes Meta’s AI system can falsely flag and stop ads from getting published when made through an app. Here’s how to fix it.</li>
            <li>
              Manually make a campaign → ad set → ad in Ads Manager. Then publish a new ad through Blip in this freshly made ad set. It sends a positive
              signal to Meta to continue ad creation.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
