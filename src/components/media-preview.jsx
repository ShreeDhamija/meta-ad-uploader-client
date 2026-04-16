"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, GripVertical, Loader2, Rocket, Trash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import RocketImg from '@/assets/rocketpreview.webp';
import Uploadimg from '@/assets/upload.webp';
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Groupads from '@/assets/icons/groupads.svg?react';
import { v4 as uuidv4 } from 'uuid';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const IS_STAGING = import.meta.env.VITE_APP_ENV === "staging";

function withUniqueId(file) {
  if (file.isDrive || file.isDropbox) return file; // Drive/Dropbox already have unique id
  if (file.uniqueId) return file; // already tagged
  file.uniqueId = `${file.name}-${file.lastModified || Date.now()}-${uuidv4()}`;
  return file;
}

// Helper function to get unique file ID
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

const VARIANT_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const getGroupFileIds = (group) => Array.isArray(group) ? group : (group?.fileIds || []);

const createFileGroup = (fileIds) => ({
  id: uuidv4(),
  fileIds: [...fileIds],
});

function VariantDot({ variantId, variants }) {
  const idx = variants.findIndex((variant) => variant.id === variantId);
  const color = VARIANT_COLORS[Math.max(0, idx) % VARIANT_COLORS.length];

  return <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: color }} />;
}

function VariantAssignmentPopover({
  assignedVariantId,
  variants,
  onAssignVariant,
  triggerClassName = "",
  sideOffset = 6,
}) {
  const activeVariantName = variants.find((variant) => variant.id === assignedVariantId)?.name || 'Default';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-900 shadow-sm transition hover:bg-white ${triggerClassName}`.trim()}
          onClick={(e) => e.stopPropagation()}
        >
          <VariantDot variantId={assignedVariantId} variants={variants} />
          <span className="whitespace-nowrap">{activeVariantName}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={sideOffset}
        className="w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
        style={{ minWidth: 'var(--radix-popover-trigger-width)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onAssignVariant(variant.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-gray-100"
          >
            <VariantDot variantId={variant.id} variants={variants} />
            <span className="whitespace-nowrap">{variant.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Sortable item component
const SortableMediaItem = React.memo(function SortableMediaItem({
  file,
  index,
  isCarouselAd,
  videoThumbs,
  onRemove,
  isSelected,
  onSelect,
  groupNumber,
  enablePlacementCustomization,
  adType,
  cardIndex,
  dimmed,
  showVariantDropdown,
  assignedVariantId,
  variants,
  onAssignVariant
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: file.isMetaLibrary
      ? (file.type === 'image' ? file.hash : file.id)
      : file.isDropbox
        ? file.dropboxId
        : (file.isDrive ? file.id : file.uniqueId || file.name)
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const fileId = file.isMetaLibrary
    ? (file.type === 'image' ? file.hash : file.id)
    : file.isDropbox
      ? file.dropboxId
      : (file.isDrive ? file.id : file.uniqueId || file.name);

  const isSelectable = (enablePlacementCustomization || adType === 'flexible' || isCarouselAd) && groupNumber == null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelectable ? 'cursor-pointer' : ''}`}
      onClick={isSelectable ? () => onSelect(fileId) : undefined}
    >
      {/* Selection background for placement customization - only show when NOT grouped */}
      {isSelectable && (
        <div
          className={`absolute rounded-2xl border-2 transition-all pointer-events-none ${isSelected
            ? 'bg-blue-100 border-blue-300'
            : 'border-transparent bg-transparent'
            }`}
          style={{
            zIndex: 0,
            top: '-6px',
            left: '-6px',
            right: '-6px',
            bottom: '-10px'
          }}
        />
      )}

      {/* Selection checkbox for placement customization - only show when NOT grouped */}
      {isSelectable && (
        <div
          className={`absolute z-20 ${isCarouselAd ? 'top-2 right-2' : 'top-1 left-1'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(fileId)}
            className="bg-white border-gray-300 rounded-md"
          />
        </div>
      )}

      <div className="relative z-10">
        {/* {isCarouselAd && !enablePlacementCustomization && ( */}
        <div className={`transition-opacity ${dimmed ? 'opacity-30' : (isDragging ? 'opacity-50' : 'opacity-100')}`}>
          {isCarouselAd && (
            <Button
              type="button"
              ref={setActivatorNodeRef}
              {...listeners}
              variant="ghost"
              size="icon"
              className="absolute top-1.5 left-1.5 border border-gray-400 rounded-md bg-white shadow-xs w-4.5 h-4.5 z-10 cursor-move touch-none"
              style={{ opacity: 1, backgroundColor: "white" }}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-2 w-2 text-gray-600" />
            </Button>
          )}

          <div className="relative overflow-hidden rounded-xl shadow-lg border border-gray-200">
            {file.isMetaLibrary ? (
              // Meta library file
              <img
                src={
                  file.type === "image"
                    ? file.url
                    : file.thumbnail_url || "https://api.withblip.com/thumbnail.jpg"
                }
                alt={file.name}
                title={file.name}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://api.withblip.com/thumbnail.jpg";
                }}
              />
            ) : isVideoFile(file) ? (
              file.isDrive ? (
                // Google Drive video - use Drive's thumbnail API
                <img
                  src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`}
                  alt={file.name}
                  title={file.name}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://api.withblip.com/thumbnail.jpg";
                  }}
                />
              ) : file.isDropbox ? (
                // Dropbox video - use icon or fallback thumbnail
                <img
                  src={videoThumbs[getFileId(file)] || "https://api.withblip.com/thumbnail.jpg"}
                  alt={file.name}
                  title={file.name}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://api.withblip.com/thumbnail.jpg";
                  }}
                />
              ) : (
                // Local video - use generated thumbnail
                videoThumbs[getFileId(file)] ? (
                  <img
                    src={videoThumbs[getFileId(file)] || "https://api.withblip.com/thumbnail.jpg"}
                    alt={file.name}
                    title={file.name}
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://api.withblip.com/thumbnail.jpg";
                    }}
                    onLoad={(e) => {
                      // Check if image actually rendered
                      if (e.target.naturalWidth === 0) {
                        e.target.src = "https://api.withblip.com/thumbnail.jpg";
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <span className="ml-2 text-sm text-gray-500">Generating...</span>
                  </div>
                )
              )
            ) : (
              // Image files
              <img
                src={
                  file.isDrive
                    ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`
                    : file.isDropbox
                      ? (videoThumbs[getFileId(file)] || file.directLink || file.icon)
                      : URL.createObjectURL(file)
                }
                alt={file.name}
                title={file.name}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://api.withblip.com/thumbnail.jpg";
                }}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              className={`absolute border rounded-lg bg-white shadow-xs z-30 ${isCarouselAd
                ? 'bottom-16 right-1.5 border-gray-300 h-6 w-6 p-2'
                : 'top-1.5 right-1.5 border-gray-400 h-7 w-7 p-3'
                }`}
              style={{ opacity: 0.9, backgroundColor: "white" }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash className={isCarouselAd ? 'h-1.5 w-1.5' : 'h-2 w-2'} />
              <span className="sr-only">Remove</span>
            </Button>
            {showVariantDropdown && (
              <div className="absolute bottom-2 left-2 z-30">
                <VariantAssignmentPopover
                  assignedVariantId={assignedVariantId}
                  variants={variants}
                  onAssignVariant={onAssignVariant}
                />
              </div>
            )}
          </div>
          <p className="mt-1 ml-1 text-sm truncate" title={file.name} > {file.name} </p>

          {isCarouselAd && (
            <span className="text-[10px] px-2 py-1 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 mt-1 block w-fit">
              Card {(cardIndex !== undefined ? cardIndex : index) + 1}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default function MediaPreview({
  files,
  setFiles,
  importedPosts,
  setImportedPosts,
  driveFiles,
  setDriveFiles,
  dropboxFiles,
  setDropboxFiles,
  importedFiles,
  setImportedFiles,
  videoThumbs,
  isCarouselAd,
  adType,
  enablePlacementCustomization,
  setEnablePlacementCustomization,
  fileGroups,
  setFileGroups,
  selectedAdSets,
  adSets,
  duplicateAdSet,
  selectedFiles,
  setSelectedFiles,
  selectedIgOrganicPosts = [],
  setSelectedIgOrganicPosts,
  variants,
  activeVariantId,
  handleAddVariant,
  handleDeleteAllVariants,
  fileVariantMap,
  setFileVariantMap,
  groupVariantMap,
  setGroupVariantMap,
  hasSeenPowerupPopup,
  setShowPowerupPopup,
  isLaunchingMedia = false
}) {
  // const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isAIGrouping, setIsAIGrouping] = useState(false);
  const [isFlexAutoGrouping, setIsFlexAutoGrouping] = useState(false);
  const [showDisableVariantsDialog, setShowDisableVariantsDialog] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));
  const hideUngroupedVariantDropdowns = isCarouselAd || enablePlacementCustomization;

  const groupedFileIds = useMemo(
    () => new Set(fileGroups.flatMap((group) => getGroupFileIds(group))),
    [fileGroups]
  );

  // Memoized computations
  const ungroupedFiles = useMemo(() => {
    const ungroupedLocalFiles = files.filter(file =>
      !groupedFileIds.has(file.isDrive ? file.id : file.uniqueId || file.name)
    );

    // Ungrouped Dropbox files
    const ungroupedDropboxFiles = (dropboxFiles || [])
      .map(file => ({ ...file, isDropbox: true }))
      .filter(file => !groupedFileIds.has(file.dropboxId));

    const ungroupedImportedFiles = importedFiles
      .map(file => ({
        ...file,
        isMetaLibrary: true,
        name: file.name,
      }))
      .filter(file => !groupedFileIds.has(file.type === 'image' ? file.hash : file.id));

    return [...ungroupedLocalFiles, ...ungroupedDropboxFiles, ...ungroupedImportedFiles];
  }, [files, dropboxFiles, importedFiles, groupedFileIds]);

  // const totalFileCount = useMemo(() => {
  //   return files.filter(f => !f.isDrive).length + driveFiles.length + (dropboxFiles?.length || 0) + importedFiles.length;
  // }, [files, driveFiles, dropboxFiles, importedFiles]);

  const totalFileCount = useMemo(() => {
    return files.filter(f => !f.isDrive).length + driveFiles.length + (dropboxFiles?.length || 0) + importedFiles.length + importedPosts.length + selectedIgOrganicPosts.length;
  }, [files, driveFiles, dropboxFiles, importedFiles, importedPosts, selectedIgOrganicPosts]);

  const canGroupFiles = useMemo(() => {
    const maxGroupSize = (adType === 'flexible' || isCarouselAd) ? 10 : 3;
    if (selectedFiles.size >= 2 && selectedFiles.size <= maxGroupSize) return true;
    // Exactly 2 total files and fewer than 2 selected — allow one-click grouping
    if (enablePlacementCustomization && totalFileCount === 2 && ungroupedFiles.length === 2 && selectedFiles.size === 0) return true;
    return false;
  }, [selectedFiles.size, adType, isCarouselAd, enablePlacementCustomization, totalFileCount, ungroupedFiles.length]);



  const canAIGroup = useMemo(() => {
    const allFiles = [
      ...files,
      ...driveFiles.filter(df => !files.some(f => f.isDrive && f.id === df.id)).map(f => ({ ...f, isDrive: true })),
      ...(dropboxFiles || []).map(f => ({ ...f, isDropbox: true })),
    ];
    const imageFiles = allFiles.filter(file => !isVideoFile(file));
    return imageFiles.length >= 2;
  }, [files, driveFiles, dropboxFiles]);

  const compressAndConvertToBase64 = async (file) => {
    return new Promise(async (resolve, reject) => {
      // 1. Determine if we need to fetch via Proxy
      let blobToProcess = file;

      if (file.isDrive || file.isDropbox) {
        try {
          const provider = file.isDrive ? 'google' : 'dropbox';
          // Dropbox IDs usually start with 'id:', ensuring we pass the ID correctly
          // const fileId = file.id;
          const fileId = file.isDrive ? file.id : file.dropboxId;
          // Fetch from YOUR backend
          const res = await fetch(`${API_BASE_URL}/api/proxy/cloud-image?fileId=${encodeURIComponent(fileId)}&provider=${provider}`, {
            credentials: 'include', // Important to send session cookies for auth
          });

          if (!res.ok) {
            throw new Error(`Failed to fetch cloud image: ${res.statusText}`);
          }

          blobToProcess = await res.blob();
        } catch (err) {
          console.error("Error fetching cloud file:", err);
          return reject(err);
        }
      }

      // 2. Standard Canvas Resizing Logic (Same as before)
      const reader = new FileReader();
      const img = new Image();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const maxDim = 1024; // Increased slightly for better AI analysis
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          } else if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64
          const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          resolve(base64);
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));

      // Read the blob (either local file or downloaded blob)
      reader.readAsDataURL(blobToProcess);
    });
  };


  const getAspectRatio = async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (Math.abs(ratio - 1) < 0.1) resolve('square');
        else if (ratio < 0.7) resolve('vertical');
        else resolve('other');
      };
      img.onerror = () => resolve('other'); // Fallback on error

      if (file.isDrive) {
        img.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;
      } else if (file.isDropbox) {
        img.src = file.icon || file.directLink;
      } else {
        img.src = URL.createObjectURL(file);
      }
    });
  };

  const hasAnyDynamicCreativeAdSets = useMemo(() => {
    if (selectedAdSets.length > 0) {
      return selectedAdSets
        .map(id => adSets.find(a => a.id === id))
        .some(adset => adset && adset.is_dynamic_creative);
    }
    if (duplicateAdSet) {
      const originalAdset = adSets.find(a => a.id === duplicateAdSet);
      return originalAdset && originalAdset.is_dynamic_creative;
    }
    return false;
  }, [selectedAdSets, adSets, duplicateAdSet]);

  const showPlacementCustomizationRow = !isCarouselAd &&
    adType !== 'flexible' &&
    importedPosts.length === 0 &&
    selectedIgOrganicPosts.length === 0;
  const showVariantSetupButton = IS_STAGING;
  const variantSetupLabel = variants.length === 1 ? 'Split Ad Data' : 'Disable Split';






  // Event handlers with useCallback
  const removeFile = useCallback((file) => {
    const fileId = getFileId(file);

    // Remove from selection
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });

    // Remove from groups
    setFileGroups(prev => prev
      .map(group => ({
        ...group,
        fileIds: getGroupFileIds(group).filter(id => id !== fileId)
      }))
      .filter(group => group.fileIds.length > 0)
    );

    // Remove from appropriate state
    if (file.isMetaLibrary) {
      setImportedFiles(prev => prev.filter(f =>
        file.type === 'image' ? f.hash !== file.hash : f.id !== file.id
      ));
    } else if (file.isDropbox) {
      setDropboxFiles(prev => prev.filter(f => f.dropboxId !== file.dropboxId));
    } else if (file.isDrive) {
      setDriveFiles(prev => prev.filter(f => f.id !== file.id));
    } else {
      setFiles(prev => prev.filter(f => (f.uniqueId || f.name) !== (file.uniqueId || file.name)));
    }
  }, [setSelectedFiles, setFileGroups, setDropboxFiles, setDriveFiles, setFiles, setImportedFiles]);





  const handlePlacementCustomizationChange = useCallback((checked) => {
    const hasAssignments = Object.keys(fileVariantMap).length > 0 || Object.keys(groupVariantMap).length > 0;

    if (checked !== enablePlacementCustomization && variants.length > 1 && hasAssignments) {
      const confirmed = window.confirm('Changing placement customization will clear all variant media assignments. Continue?');
      if (!confirmed) return;
      setFileVariantMap({});
      setGroupVariantMap({});
    }

    setEnablePlacementCustomization(checked);
    if (!checked) {
      // Clear all grouping when disabled
      setFileGroups([]);
      setSelectedFiles(new Set());
    }
  }, [enablePlacementCustomization, fileVariantMap, groupVariantMap, setEnablePlacementCustomization, setFileGroups, setFileVariantMap, setGroupVariantMap, setSelectedFiles, variants.length]);

  // Auto-disable placement customization when a dynamic ad set is selected
  useEffect(() => {
    if (hasAnyDynamicCreativeAdSets && enablePlacementCustomization) {
      setEnablePlacementCustomization(false);
      setFileGroups([]);
      setSelectedFiles(new Set());
    }
  }, [hasAnyDynamicCreativeAdSets]);

  const handleFileSelect = useCallback((fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, [setSelectedFiles]);

  const handleGroupAds = useCallback(() => {
    if (adType === 'flexible' || isCarouselAd) {
      if (selectedFiles.size > 10) {
        alert(isCarouselAd ? "Carousel ads can have maximum 10 cards" : "Flexible ad groups can contain maximum 10 files");
        return;
      }
      if (isCarouselAd && selectedFiles.size < 2) {
        alert("Carousel ads need at least 2 cards");
        return;
      }

      const newGroup = Array.from(selectedFiles);
      setFileGroups(prev => [...prev, createFileGroup(newGroup)]);
      setSelectedFiles(new Set());
      return;
    }

    // Auto-group when exactly 2 total files exist and not enough are selected
    if (enablePlacementCustomization && totalFileCount === 2 && ungroupedFiles.length === 2 && selectedFiles.size === 0) {
      const newGroup = ungroupedFiles.map(f => getFileId(f));
      setFileGroups(prev => [...prev, createFileGroup(newGroup)]);
      setSelectedFiles(new Set());
      return;
    }

    if (selectedFiles.size >= 2 && selectedFiles.size <= 3) {
      const newGroup = Array.from(selectedFiles);
      setFileGroups(prev => [...prev, createFileGroup(newGroup)]);

      const selectedFileIds = Array.from(selectedFiles);

      // Get selected files from all arrays
      const selectedLocalFiles = files.filter(file => {
        const fileId = file.isDrive ? file.id : (file.uniqueId || file.name);
        return selectedFileIds.includes(fileId);
      });

      const selectedDriveFiles = driveFiles.filter(file => {
        const alreadyInLocal = selectedLocalFiles.some(localFile =>
          localFile.isDrive && localFile.id === file.id
        );
        return selectedFileIds.includes(file.id) && !alreadyInLocal;
      }).map(file => ({ ...file, isDrive: true }));

      const selectedDropboxFiles = (dropboxFiles || []).filter(file => {
        return selectedFileIds.includes(file.dropboxId);
      }).map(file => ({ ...file, isDropbox: true }));

      const selectedMetaFiles = importedFiles.filter(file => {
        const fileId = file.type === 'image' ? file.hash : file.id;
        return selectedFileIds.includes(fileId);
      }).map(file => ({ ...file, isMetaLibrary: true }));

      // Get unselected files
      const unselectedLocalFiles = files.filter(file => {
        const fileId = file.isDrive ? file.id : file.uniqueId || file.name;
        return !selectedFileIds.includes(fileId);
      });

      const unselectedDriveFiles = driveFiles.filter(file => {
        const alreadyInLocal = unselectedLocalFiles.some(localFile =>
          localFile.isDrive && localFile.id === file.id
        );
        return !selectedFileIds.includes(file.id) && !alreadyInLocal;
      }).map(file => ({ ...file, isDrive: true }));

      const unselectedDropboxFiles = (dropboxFiles || []).filter(file => {
        return !selectedFileIds.includes(file.dropboxId);
      }).map(file => ({ ...file, isDropbox: true }));

      const unselectedMetaFiles = importedFiles.filter(file => {
        const fileId = file.type === 'image' ? file.hash : file.id;
        return !selectedFileIds.includes(fileId);
      }).map(file => ({ ...file, isMetaLibrary: true }));

      // Combine files: unselected first, then selected
      const allLocalFiles = [...unselectedLocalFiles, ...selectedLocalFiles];
      const allDriveFiles = [...unselectedDriveFiles, ...selectedDriveFiles];
      const allDropboxFiles = [...unselectedDropboxFiles, ...selectedDropboxFiles];
      const allMetaFiles = [...unselectedMetaFiles, ...selectedMetaFiles];

      // Remove duplicates and set state
      const seenFiles = new Set();
      const newLocalFiles = [];
      const newDriveFiles = [];
      const newDropboxFiles = [];

      [...allLocalFiles, ...allDriveFiles, ...allDropboxFiles].forEach(file => {
        const uniqueKey = file.isDropbox ? file.dropboxId : (file.isDrive ? file.id : file.uniqueId || file.name);
        if (!seenFiles.has(uniqueKey)) {
          seenFiles.add(uniqueKey);
          if (file.isDropbox) {
            newDropboxFiles.push(file);
          } else if (file.isDrive) {
            newDriveFiles.push(file);
          } else {
            newLocalFiles.push(file);
          }
        }
      });

      setFiles(newLocalFiles);
      setDriveFiles(newDriveFiles);
      setDropboxFiles(newDropboxFiles);
      setImportedFiles(allMetaFiles.filter((file, index, self) =>
        index === self.findIndex(f =>
          (f.type === 'image' ? f.hash : f.id) === (file.type === 'image' ? file.hash : file.id)
        )
      ));
      setSelectedFiles(new Set());
    }
  }, [selectedFiles, setFileGroups, files, driveFiles, dropboxFiles, importedFiles, setFiles, setDriveFiles, setDropboxFiles, setImportedFiles, setSelectedFiles, adType, enablePlacementCustomization, isCarouselAd, totalFileCount, ungroupedFiles]);



  // const handleAIGroup = useCallback(async () => {
  //   try {
  //     setIsAIGrouping(true);

  //     // Combine all file sources (same pattern used by handleFlexibleAutoGroup)
  //     const allFiles = [
  //       ...files,
  //       ...driveFiles.filter(df => !files.some(f => f.isDrive && f.id === df.id)).map(f => ({ ...f, isDrive: true })),
  //       ...(dropboxFiles || []).map(f => ({ ...f, isDropbox: true })),
  //     ];

  //     // Only process image files
  //     const imageFiles = allFiles.filter(file => !isVideoFile(file));

  //     const processedImages = await Promise.all(
  //       imageFiles.map(async (file, index) => {
  //         const base64 = await compressAndConvertToBase64(file);
  //         const aspectRatio = await getAspectRatio(file);

  //         return {
  //           base64,
  //           mimeType: file.type || file.mimeType || 'image/jpeg',
  //           aspectRatio,
  //           index,
  //           fileId: getFileId(file)
  //         };
  //       })
  //     );

  //     const response = await fetch(`${API_BASE_URL}/api/grouping/group-images`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       credentials: 'include',
  //       body: JSON.stringify({ images: processedImages })
  //     });

  //     const responseText = await response.text();

  //     if (!response.ok) {
  //       throw new Error(`Grouping failed: ${responseText}`);
  //     }

  //     const result = JSON.parse(responseText);

  //     // Convert AI indices to actual fileIds using imageFiles (not files)
  //     const newGroups = result.groups.map(indexGroup =>
  //       indexGroup.map(idx => {
  //         const file = imageFiles[idx];
  //         return getFileId(file);
  //       })
  //     );

  //     setFileGroups(newGroups);
  //     setSelectedFiles(new Set());
  //   } catch (error) {
  //     console.error('AI grouping error:', error);
  //     alert(`Failed to group images: ${error.message}`);
  //   } finally {
  //     setIsAIGrouping(false);
  //   }
  // }, [files, driveFiles, dropboxFiles, setFileGroups, setSelectedFiles]);

  const handleAIGroup = useCallback(async () => {
    try {
      setIsAIGrouping(true);

      const allFiles = [
        ...files,
        ...driveFiles.filter(df => !files.some(f => f.isDrive && f.id === df.id)).map(f => ({ ...f, isDrive: true })),
        ...(dropboxFiles || []).map(f => ({ ...f, isDropbox: true })),
      ];

      const imageFiles = allFiles.filter(file => !isVideoFile(file));

      // --- NEW CONCURRENCY BATCHING LOGIC ---
      const processedImages = [];
      const CONCURRENCY_LIMIT = 5; // Process 5 images at a time to prevent browser freeze

      for (let i = 0; i < imageFiles.length; i += CONCURRENCY_LIMIT) {
        const batch = imageFiles.slice(i, i + CONCURRENCY_LIMIT);

        const batchResults = await Promise.all(
          batch.map(async (file, batchIndex) => {
            const actualIndex = i + batchIndex; // Maintain correct 0-49 index for the AI
            const base64 = await compressAndConvertToBase64(file); // Kept at 1024px for text
            const aspectRatio = await getAspectRatio(file);

            return {
              base64,
              mimeType: file.type || file.mimeType || 'image/jpeg',
              aspectRatio,
              index: actualIndex,
              fileId: getFileId(file)
            };
          })
        );

        processedImages.push(...batchResults);
      }
      // --------------------------------------

      const response = await fetch(`${API_BASE_URL}/api/grouping/group-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ images: processedImages }) // All 50 sent together
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Grouping failed: ${responseText}`);
      }

      const result = JSON.parse(responseText);

      const newGroups = result.groups.map(indexGroup =>
        createFileGroup(indexGroup.map(idx => {
          const file = imageFiles[idx];
          return getFileId(file);
        }))
      );

      setFileGroups(newGroups);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('AI grouping error:', error);
      alert(`Failed to group images: ${error.message}`);
    } finally {
      setIsAIGrouping(false);
    }
  }, [files, driveFiles, dropboxFiles, setFileGroups, setSelectedFiles]);



  const handleFlexibleAutoGroup = useCallback(async () => {
    setIsFlexAutoGrouping(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Combine all file sources
    const allFiles = [
      ...files,
      ...driveFiles.filter(df => !files.some(f => f.isDrive && f.id === df.id)),
      ...(dropboxFiles || []).map(f => ({ ...f, isDropbox: true })),
      ...importedFiles.map(f => ({ ...f, isMetaLibrary: true }))
    ];

    const newGroups = [];
    for (let i = 0; i < allFiles.length; i += 10) {
      const group = allFiles
        .slice(i, i + 10)
        .map(file => {
          if (file.isMetaLibrary) return file.type === 'image' ? file.hash : file.id;
          if (file.isDropbox) return file.dropboxId;
          return getFileId(file);
        });
      newGroups.push(createFileGroup(group));
    }

    setFileGroups(newGroups);
    setSelectedFiles(new Set());
    setIsFlexAutoGrouping(false);
  }, [files, driveFiles, dropboxFiles, importedFiles, setFileGroups, setSelectedFiles]);





  const handleUngroup = useCallback((groupId) => {
    setFileGroups(prev => prev.filter((group) => group.id !== groupId));
  }, [setFileGroups]);


  const handleGroupDragEnd = useCallback((groupId, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFileGroups(prev => {
      const newGroups = [...prev];
      const groupIndex = newGroups.findIndex((group) => group.id === groupId);
      if (groupIndex === -1) return prev;
      const group = [...getGroupFileIds(newGroups[groupIndex])];
      const oldIdx = group.indexOf(String(active.id));
      const newIdx = group.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return prev;
      newGroups[groupIndex] = { ...newGroups[groupIndex], fileIds: arrayMove(group, oldIdx, newIdx) };
      return newGroups;
    });
  }, [setFileGroups]);


  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Combine all files in current order
    const allFiles = [
      ...files,
      ...driveFiles.filter(df => !files.some(f => f.isDrive && f.id === df.id)),
      ...(dropboxFiles || []).map(f => ({ ...f, isDropbox: true })),
      ...importedFiles.map(f => ({ ...f, isMetaLibrary: true }))
    ];

    const getFileKey = (file) => {
      if (file.isMetaLibrary) return file.type === 'image' ? file.hash : file.id;
      if (file.isDropbox) return file.dropboxId;
      return file.isDrive ? file.id : file.uniqueId || file.name;
    };

    const oldIndex = allFiles.findIndex(file => getFileKey(file) === active.id);
    const newIndex = allFiles.findIndex(file => getFileKey(file) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newAllFiles = arrayMove(allFiles, oldIndex, newIndex);
      setFiles(newAllFiles.filter(f => !f.isDrive && !f.isDropbox && !f.isMetaLibrary));
      setDriveFiles(newAllFiles.filter(f => f.isDrive));
      setDropboxFiles(newAllFiles.filter(f => f.isDropbox));
      setImportedFiles(newAllFiles.filter(f => f.isMetaLibrary).map(f => {
        const { isMetaLibrary, ...rest } = f;
        return rest;
      }));
    }
  }, [files, driveFiles, dropboxFiles, importedFiles, setFiles, setDriveFiles, setDropboxFiles, setImportedFiles]);

  const assignFileToVariant = useCallback((fileId, variantId) => {
    setFileVariantMap((prev) => {
      if (variantId === 'default') {
        const next = { ...prev };
        delete next[fileId];
        return next;
      }

      return { ...prev, [fileId]: variantId };
    });
  }, [setFileVariantMap]);

  const assignGroupToVariant = useCallback((groupId, variantId) => {
    setGroupVariantMap((prev) => {
      if (variantId === 'default') {
        const next = { ...prev };
        delete next[groupId];
        return next;
      }

      return { ...prev, [groupId]: variantId };
    });
  }, [setGroupVariantMap]);

  const findFileById = useCallback((fileId) => {
    let file = files.find((entry) => getFileId(entry) === fileId);
    if (file) return file;

    file = driveFiles.find((entry) => entry.id === fileId);
    if (file) return { ...file, isDrive: true };

    file = (dropboxFiles || []).find((entry) => entry.dropboxId === fileId);
    if (file) return { ...file, isDropbox: true };

    file = importedFiles.find((entry) => getFileId({ ...entry, isMetaLibrary: true }) === fileId);
    if (file) return { ...file, isMetaLibrary: true, name: file.name };

    return null;
  }, [driveFiles, dropboxFiles, files, importedFiles]);
  return (
    <>
      {(files.length > 0 || driveFiles.length > 0 || (dropboxFiles?.length || 0) > 0 || importedPosts.length > 0 || importedFiles.length > 0 || selectedIgOrganicPosts.length > 0) ? (
        <>
          <style>{`
            @keyframes mediaPreviewSlingshot {
              0% {
                transform: translate3d(0, 0, 0) scale(1);
                opacity: 1;
              }
              20% {
                transform: translate3d(0, 6px, 0) scale(0.995);
                opacity: 1;
              }
              58% {
                transform: translate3d(0, -18px, 0) scale(1);
                opacity: 1;
              }
              100% {
                transform: translate3d(0, -105%, 0) scale(0.97);
                opacity: 0;
              }
            }

            .media-preview-launch-item {
              animation: mediaPreviewSlingshot 560ms cubic-bezier(0.22, 0.7, 0.2, 1) forwards;
              will-change: transform, opacity;
              transform-origin: center bottom;
              pointer-events: none;
            }

            @media (prefers-reduced-motion: reduce) {
              .media-preview-launch-item {
                animation-duration: 180ms;
              }
            }
          `}</style>
          <Card
            className="flex flex-col sticky top-4 w-full border border-gray-300 !bg-white rounded-3xl"
            style={{ height: "calc(100vh - 140px)" }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // const droppedFiles = Array.from(e.dataTransfer.files);
              const droppedFiles = Array.from(e.dataTransfer.files).map(withUniqueId);
              setFiles(prev => [...prev, ...droppedFiles]);
            }}
          >
            <CardHeader className="flex flex-row justify-between items-start flex-nowrap w-full">
              <div className="flex flex-col items-start">
                <CardTitle className="text-left">Uploads Preview</CardTitle>
                <CardDescription className="text-left">
                  {`${files.filter(f => !f.isDrive).length + driveFiles.length + (dropboxFiles?.length || 0) + importedFiles.length + importedPosts.length + selectedIgOrganicPosts.length} file${(files.filter(f => !f.isDrive).length + driveFiles.length + (dropboxFiles?.length || 0) + importedFiles.length + importedPosts.length + selectedIgOrganicPosts.length) > 1 ? "s" : ""} selected`}
                  {isCarouselAd && (
                    <span className="block text-xs text-gray-500 mt-1">
                      {fileGroups.length > 0
                        ? 'Drag to reorder cards within each carousel group. Select files to create new groups.'
                        : 'Select files to group into separate carousel ads, or drag to reorder cards'
                      }
                    </span>
                  )}
                </CardDescription>
              </div>

              <div className="flex gap-2">
                {showVariantSetupButton && !showPlacementCustomizationRow && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (variants.length === 1) {
                        if (!hasSeenPowerupPopup) {
                          setShowPowerupPopup(true);
                        }
                        handleAddVariant();
                      } else {
                        setShowDisableVariantsDialog(true);
                      }
                    }}
                    className="rounded-xl bg-white"
                  >
                    {variantSetupLabel}
                  </Button>
                )}

                {(enablePlacementCustomization || adType === 'flexible' || isCarouselAd) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGroupAds}
                      disabled={!canGroupFiles}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 rounded-xl"
                    >
                      <Groupads />
                      Group Ads
                    </Button>

                    {adType !== 'flexible' && !isCarouselAd && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAIGroup}
                        disabled={!canAIGroup || isAIGrouping}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 rounded-xl hover:text-purple-800"
                      >
                        {isAIGrouping ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Grouping...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 mr-2" />
                            AI Auto Group
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}

                {adType === 'flexible' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFlexibleAutoGroup}
                    disabled={isFlexAutoGrouping}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 rounded-xl hover:text-purple-800"
                  >
                    {isFlexAutoGrouping ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Grouping...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Auto Group
                      </>
                    )}
                  </Button>
                )}


                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setFiles([]);
                    setDriveFiles([]);
                    setDropboxFiles([]);
                    setSelectedFiles(new Set());
                    setFileGroups([]);
                    setImportedPosts([]);
                    setImportedFiles([]);
                    setSelectedIgOrganicPosts([]);
                    setFileVariantMap({});
                    setGroupVariantMap({});
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl mt-0"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>

            {/* Placement Customization Checkbox - only show when carousel is disabled */}
            {showPlacementCustomizationRow && (
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="placementCustomization"
                      checked={enablePlacementCustomization}
                      onCheckedChange={handlePlacementCustomizationChange}
                      disabled={hasAnyDynamicCreativeAdSets}
                      className="border-gray-400 rounded-md"
                    />
                    <label
                      htmlFor="placementCustomization"
                      className={`text-sm font-medium leading-none ${hasAnyDynamicCreativeAdSets ? 'cursor-not-allowed opacity-50' : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'}`}
                    >
                      Enable placement customization
                      {hasAnyDynamicCreativeAdSets && (
                        <span className="text-xs text-gray-400 ml-1">(not available for dynamic creative ad sets)</span>
                      )}
                    </label>
                  </div>
                  {showVariantSetupButton && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (variants.length === 1) {
                          if (!hasSeenPowerupPopup) {
                            setShowPowerupPopup(true);
                          }
                          handleAddVariant();
                        } else {
                          setShowDisableVariantsDialog(true);
                        }
                      }}
                      className="rounded-xl bg-white"
                    >
                      {variantSetupLabel}
                    </Button>
                  )}
                </div>
                {enablePlacementCustomization && (
                  <span className="block text-xs text-gray-500 mt-1">
                    AI Auto Group only works for images
                  </span>
                )}
              </div>
            )}

            <CardContent
              className={`flex-1 overflow-y-auto min-h-0 pr-2 ${isLaunchingMedia ? 'pointer-events-none' : ''}`}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 transparent'
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={isCarouselAd ? handleDragEnd : () => { }}
              >
                <SortableContext
                  items={[
                    ...files.map(file => file.isDrive ? file.id : file.uniqueId || file.name),
                    ...(dropboxFiles || []).map(file => file.dropboxId),
                    ...importedFiles.map(file => file.type === 'image' ? file.hash : file.id)
                  ]}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {fileGroups.map((group, groupIndex) => {
                      const isGroupDimmed = activeVariantId !== 'default' && (groupVariantMap[group.id] || 'default') !== activeVariantId;

                      return (
                        <div
                          key={group.id || `group-${groupIndex}`}
                          className={`relative ${isLaunchingMedia && !isGroupDimmed ? 'media-preview-launch-item' : ''}`}
                        >
                          {/* Shared group background */}
                          <div
                            className={`absolute inset-0 -z-10 rounded-2xl border-2 transition-opacity ${isGroupDimmed ? 'opacity-30' : 'opacity-100'} ${groupIndex % 2 === 0
                              ? 'bg-blue-100 border-blue-300'
                              : 'bg-orange-100 border-orange-300'
                              }`}
                            style={{ margin: '0px' }}
                          />

                          {/* Ungroup button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUngroup(group.id)}
                            className="absolute top-2 right-2 z-20 bg-white hover:bg-red-50 text-red-700 border-red-200 rounded-xl text-xs px-2 py-1"
                          >
                            Ungroup
                          </Button>
                          {variants.length > 1 && (
                            <div className="absolute bottom-2 left-2 z-20">
                              <VariantAssignmentPopover
                                assignedVariantId={groupVariantMap[group.id] || 'default'}
                                variants={variants}
                                onAssignVariant={(variantId) => assignGroupToVariant(group.id, variantId)}
                              />
                            </div>
                          )}
                          {/* Group label */}
                          <div className={`absolute bottom-2 right-2 z-20 text-white text-xs px-2 py-1 rounded-xl font-semibold transition-opacity ${isGroupDimmed ? 'opacity-30' : 'opacity-100'} ${groupIndex % 2 === 0
                            ? 'bg-blue-500'
                            : 'bg-orange-500'
                            }`}>
                            {isCarouselAd ? `Carousel Ad ${groupIndex + 1}` : `Group ${groupIndex + 1}`}
                          </div>

                          {isCarouselAd ? (
                            /* Per-group DndContext for carousel reordering */
                            <div className={`transition-opacity ${isGroupDimmed ? 'opacity-30' : 'opacity-100'}`}>
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(event) => handleGroupDragEnd(group.id, event)}
                              >
                                <SortableContext
                                  items={getGroupFileIds(group)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3">
                                    {getGroupFileIds(group).map((fileId, cardIdx) => {
                                      const file = findFileById(fileId);
                                      if (!file) {
                                        console.warn(`File not found for ID: ${fileId}`);
                                        return null;
                                      }
                                      return (
                                        <SortableMediaItem
                                          key={fileId}
                                          file={file}
                                          index={cardIdx}
                                          cardIndex={cardIdx}
                                          isCarouselAd={isCarouselAd}
                                          videoThumbs={videoThumbs}
                                          onRemove={() => removeFile(file)}
                                          isSelected={false}
                                          onSelect={handleFileSelect}
                                          groupNumber={groupIndex + 1}
                                          enablePlacementCustomization={enablePlacementCustomization}
                                          adType={adType}
                                          dimmed={false}
                                          showVariantDropdown={false}
                                          assignedVariantId={groupVariantMap[group.id] || 'default'}
                                          variants={variants}
                                          onAssignVariant={() => { }}
                                        />
                                      );
                                    })}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            </div>
                          ) : (
                            /* Original non-DnD group rendering for placement customization / flexible */
                            <div className={`grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 transition-opacity ${isGroupDimmed ? 'opacity-30' : 'opacity-100'}`}>
                              {getGroupFileIds(group).map((fileId) => {
                                const file = findFileById(fileId);
                                if (!file) {
                                  console.warn(`File not found for ID: ${fileId}`);
                                  return null;
                                }
                                const index = files.findIndex(f => (f.isDrive ? f.id : (f.uniqueId || f.name)) === fileId);
                                return file ? (
                                  <SortableMediaItem
                                    key={fileId}
                                    file={file}
                                    index={index}
                                    isCarouselAd={isCarouselAd}
                                    videoThumbs={videoThumbs}
                                    onRemove={() => removeFile(file)}
                                    isSelected={false}
                                    onSelect={handleFileSelect}
                                    groupNumber={groupIndex + 1}
                                    enablePlacementCustomization={enablePlacementCustomization}
                                    adType={adType}
                                    dimmed={false}
                                    showVariantDropdown={false}
                                    assignedVariantId={groupVariantMap[group.id] || 'default'}
                                    variants={variants}
                                    onAssignVariant={() => { }}
                                  />
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Ungrouped files */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6" style={{ padding: '6px', }}>
                      {ungroupedFiles.map((file, index) => {
                        const fileId = getFileId(file);  // ✅ Use the helper that handles all file types
                        const assignedVariantId = fileVariantMap[fileId] || 'default';
                        const isDimmed = activeVariantId !== 'default' && assignedVariantId !== activeVariantId;
                        const showVariantDropdown = variants.length > 1 && !hideUngroupedVariantDropdowns && !(adType === 'flexible' && fileGroups.length > 0);
                        return (
                          <div
                            key={fileId}
                            className={isLaunchingMedia && !isDimmed ? 'media-preview-launch-item' : ''}
                          >
                            <SortableMediaItem
                              file={file}
                              index={index}
                              cardIndex={index}
                              isCarouselAd={isCarouselAd}
                              videoThumbs={videoThumbs}
                              onRemove={() => removeFile(file)}
                              isSelected={selectedFiles.has(fileId)}
                              onSelect={handleFileSelect}
                              groupNumber={null}
                              enablePlacementCustomization={enablePlacementCustomization}
                              adType={adType}
                              dimmed={isDimmed}
                              showVariantDropdown={showVariantDropdown}
                              assignedVariantId={assignedVariantId}
                              variants={variants}
                              onAssignVariant={(variantId) => assignFileToVariant(fileId, variantId)}
                            />
                          </div>
                        );
                      })}

                      {importedPosts.map((post, index) => (
                        <div
                          key={post.id}
                          className={`relative group ${isLaunchingMedia && activeVariantId === 'default' ? 'media-preview-launch-item' : ''}`}
                          title={post.ad_name}
                          style={{
                            opacity: activeVariantId !== 'default' ? 0.3 : 1,
                            transition: 'opacity 150ms'
                          }}
                        >
                          <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
                            <img
                              src={post.image_url || "https://api.withblip.com/thumbnail.jpg"}
                              alt="Post"
                              className="w-full h-auto object-cover"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              className="absolute top-1.5 right-1.5 border border-gray-400 rounded-lg bg-white shadow-xs h-7 w-7 p-3 z-30"
                              style={{ opacity: 0.9, backgroundColor: "white" }}
                              onClick={() => setImportedPosts(prev => prev.filter(p => p.id !== post.id))}
                            >
                              <Trash className="h-2 w-2" />
                            </Button>
                          </div>
                          {/* post_id below the image card */}
                          <p className="mt-1 ml-1 text-xs font-mono text-gray-700 truncate max-w-full">
                            {post.ad_name}
                          </p>
                        </div>
                      ))}

                      {selectedIgOrganicPosts.map((post, index) => (
                        <div
                          key={`ig-${post.source_instagram_media_id}`}
                          className={`relative group ${isLaunchingMedia && activeVariantId === 'default' ? 'media-preview-launch-item' : ''}`}
                          title={post.ad_name}
                          style={{
                            opacity: activeVariantId !== 'default' ? 0.3 : 1,
                            transition: 'opacity 150ms'
                          }}
                        >
                          <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
                            <img
                              src={post.previewUrl || "https://api.withblip.com/thumbnail.jpg"}
                              alt={post.ad_name}
                              className="w-full h-auto object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://api.withblip.com/thumbnail.jpg";
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              className="absolute top-1.5 right-1.5 border border-gray-400 rounded-lg bg-white shadow-xs h-7 w-7 p-3 z-30"
                              style={{ opacity: 0.9, backgroundColor: "white" }}
                              onClick={() => setSelectedIgOrganicPosts(prev => prev.filter(p => p.source_instagram_media_id !== post.source_instagram_media_id))}
                            >
                              <Trash className="h-2 w-2" />
                            </Button>
                          </div>

                        </div>
                      ))}


                    </div>
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
          {showDisableVariantsDialog && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => setShowDisableVariantsDialog(false)}
              />
              <div
                className="relative w-[min(26rem,calc(100vw-2rem))] rounded-[32px] border border-gray-200 bg-white p-6 shadow-xl"
                style={{ animation: 'templateBtnIn 0.2s ease-out forwards' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Disable variants?</h3>
                  <p className="text-sm text-gray-500">
                    This will remove all variants and move every assignment back to Default.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowDisableVariantsDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full rounded-xl"
                    onClick={() => {
                      setShowDisableVariantsDialog(false);
                      handleDeleteAllVariants();
                    }}
                  >
                    Disable Variants
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className="sticky top-4 w-full mx-auto"
          style={{ height: "calc(100vh - 140px)" }}
        >
          <div
            className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-3xl border border-gray-200 shadow-md"
            style={{
              backgroundColor: '#ffffff',
              backgroundImage: `repeating-linear-gradient(
                135deg,
                transparent,
                transparent 5px,
                rgba(125, 125, 125, 0.2) 5px,
                rgba(125, 125, 125, 0.2) 6px
              )`
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const droppedFiles = Array.from(e.dataTransfer.files).map(withUniqueId);
              setFiles(prev => [...prev, ...droppedFiles]);
            }}
          >
            <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full mx-4 text-center min-h-[500px] border border-gray-100 flex flex-col justify-center">
              {/* UPLOAD Text */}
              <div className="mb-8">
                <img
                  src={Uploadimg}
                  alt="Upload illustration"
                  className="w-24 h-5 mx-auto"
                />
              </div>

              {/* Your server image */}
              <div className="mb-8">
                <img
                  src={RocketImg}
                  alt="Upload illustration"
                  className="w-[204px] h-[350px] max-w-xs mx-auto"
                />
              </div>

              {/* Text */}
              <div className="space-y-1">
                <h3 className="text-md font-semibold text-gray-800">
                  Media Previews Will Appear Here
                </h3>
                <p className="text-xs text-gray-400">
                  You can drag and drop to upload files
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
