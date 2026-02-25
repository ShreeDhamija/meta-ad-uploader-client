"use client"

import React, { useState, useMemo, useCallback } from 'react';
import { Rocket, Trash, Users } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import RocketImg from '@/assets/rocketpreview.webp';
import Uploadimg from '@/assets/upload.webp';
import { Checkbox } from "@/components/ui/checkbox"
import Groupads from '@/assets/icons/groupads.svg?react';
import { v4 as uuidv4 } from 'uuid';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

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

// Sortable item component
const SortableMediaItem = React.memo(function SortableMediaItem({
  file, index, isCarouselAd, videoThumbs, onRemove, isSelected, onSelect, groupNumber, enablePlacementCustomization, adType
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Selection overlay for placement customization - only show when NOT grouped */}
      {(enablePlacementCustomization || adType === 'flexible') && (
        <div
          className={`absolute rounded-2xl cursor-pointer transition-all ${isSelected ? 'bg-blue-200 bg-opacity-20 border-2 border-blue-300' : ' '
            }`}
          onClick={() => onSelect(fileId)}
          style={{
            zIndex: 5,
            top: '-6px',
            left: '-6px',
            right: '-6px',
            bottom: '-10px'
          }}
        />
      )}

      {/* Selection checkbox for placement customization - only show when NOT grouped */}
      {(enablePlacementCustomization || adType === 'flexible') && (
        <div className="absolute top-2 left-2 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(fileId)}
            className="bg-white border-gray-300 rounded-md"
          />
        </div>
      )}

      {isCarouselAd && !enablePlacementCustomization && (
        <Button
          ref={setActivatorNodeRef}
          {...listeners}
          variant="ghost"
          size="icon"
          className="absolute top-1.5 left-1.5 border border-gray-400 rounded-lg bg-white shadow-sm w-6 h-6 z-10 cursor-move"
          style={{ opacity: 1, backgroundColor: "white" }}
        >
          <GripVertical className="h-3 w-3 text-gray-600" />
        </Button>
      )}

      <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
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
                  ? (file.directLink || file.icon)
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
          className="absolute top-1.5 right-1.5 border border-gray-400 rounded-lg bg-white shadow-sm h-7 w-7 p-3 z-30"
          style={{ opacity: 0.9, backgroundColor: "white" }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash className="h-2 w-2" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
      <p className="mt-1 ml-1 text-sm truncate" title={file.name} > {file.name} </p>

      {isCarouselAd && !enablePlacementCustomization && (
        <span className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 mt-1 block w-fit">
          Card {index + 1}
        </span>
      )}
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
  setSelectedIgOrganicPosts
}) {
  // const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isAIGrouping, setIsAIGrouping] = useState(false);
  const [isFlexAutoGrouping, setIsFlexAutoGrouping] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  // Memoized computations
  const canGroupFiles = useMemo(() => {
    const maxGroupSize = adType === 'flexible' ? 10 : 3;
    return selectedFiles.size >= 2 && selectedFiles.size <= maxGroupSize;
  }, [selectedFiles.size, adType]);

  const canAIGroup = useMemo(() => {
    const imageFiles = files.filter(file => !isVideoFile(file));
    return imageFiles.length >= 2;
  }, [files]);



  // Add these before your component or import from a utils file
  const compressAndConvertToBase64 = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const img = new Image();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 768px)
          const maxDim = 768;
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

          // Convert to base64 (remove data URL prefix)
          const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          resolve(base64);
        };
        img.src = e.target.result;
      };

      if (file.isDrive) {
        // For Drive files, fetch the thumbnail
        fetch(`https://drive.google.com/thumbnail?id=${file.id}&sz=w768`)
          .then(res => res.blob())
          .then(blob => reader.readAsDataURL(blob));
      } else if (file.isDropbox) {
        // For Dropbox files, use the icon or direct link
        fetch(file.icon || file.directLink)
          .then(res => res.blob())
          .then(blob => reader.readAsDataURL(blob));
      } else {
        reader.readAsDataURL(file);
      }
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

  const hasOnlyNonDynamicCreativeAdSets = useMemo(() => {
    // Check if we have selected non-dynamic adsets
    if (selectedAdSets.length > 0) {
      return selectedAdSets
        .map(id => adSets.find(a => a.id === id))
        .every(adset => adset && !adset.is_dynamic_creative);
    }

    // Check if we're duplicating a non-dynamic adset
    if (duplicateAdSet) {
      const originalAdset = adSets.find(a => a.id === duplicateAdSet);
      return originalAdset && !originalAdset.is_dynamic_creative;
    }

    return false;
  }, [selectedAdSets, adSets, duplicateAdSet]);

  const ungroupedFiles = useMemo(() => {
    const groupedFileIds = new Set(fileGroups.flat());

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
  }, [files, dropboxFiles, importedFiles, fileGroups]);




  // Event handlers with useCallback
  const removeFile = useCallback((file) => {
    const fileId = file.isMetaLibrary
      ? (file.type === 'image' ? file.hash : file.id)
      : file.isDropbox
        ? file.dropboxId
        : (file.isDrive ? file.id : file.uniqueId || file.name);

    // Remove from selection
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });

    // Remove from groups
    setFileGroups(prev => prev.map(group =>
      group.filter(id => id !== fileId)
    ).filter(group => group.length > 0));

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
    setEnablePlacementCustomization(checked);
    if (!checked) {
      // Clear all grouping when disabled
      setFileGroups([]);
      setSelectedFiles(new Set());
    }
  }, [setEnablePlacementCustomization, setFileGroups, setSelectedFiles]);

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
    if (adType === 'flexible') {
      if (selectedFiles.size > 10) {
        alert("Flexible ad groups can contain maximum 10 files");
        return;
      }

      const newGroup = Array.from(selectedFiles);
      setFileGroups(prev => [...prev, newGroup]);
      setSelectedFiles(new Set());
      return;
    }

    if (selectedFiles.size >= 2 && selectedFiles.size <= 3) {
      const newGroup = Array.from(selectedFiles);
      setFileGroups(prev => [...prev, newGroup]);

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
  }, [selectedFiles, setFileGroups, files, driveFiles, dropboxFiles, importedFiles, setFiles, setDriveFiles, setDropboxFiles, setImportedFiles, setSelectedFiles, adType]);




  const handleAIGroup = useCallback(async () => {
    try {
      setIsAIGrouping(true);

      const processedImages = await Promise.all(
        files.map(async (file, index) => {
          const base64 = await compressAndConvertToBase64(file);
          const aspectRatio = await getAspectRatio(file);


          return {
            base64,
            mimeType: file.type || 'image/jpeg',
            aspectRatio,
            index,
            fileId: file.isDrive ? file.id : (file.uniqueId || file.name)
          };
        })
      );



      const response = await fetch(`${API_BASE_URL}/api/grouping/group-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add credentials if needed
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ images: processedImages })
      });


      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Grouping failed: ${responseText}`);
      }

      const result = JSON.parse(responseText);

      // Convert AI indices to actual fileIds
      const newGroups = result.groups.map(indexGroup =>
        indexGroup.map(idx => {
          const file = files[idx];
          return file.isDrive ? file.id : file.uniqueId || file.name;
        })
      );

      // Apply to UI
      setFileGroups(newGroups);
      setSelectedFiles(new Set()); // clear any manual selection


      // Rest of your code...
    } catch (error) {
      console.error('AI grouping error:', error);
      alert(`Failed to group images: ${error.message}`);
    } finally {
      setIsAIGrouping(false);
    }
  }, [files, setFileGroups, setSelectedFiles]);




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
      newGroups.push(group);
    }

    setFileGroups(newGroups);
    setSelectedFiles(new Set());
    setIsFlexAutoGrouping(false);
  }, [files, driveFiles, dropboxFiles, importedFiles, setFileGroups, setSelectedFiles]);





  const handleUngroup = useCallback((groupIndex) => {
    setFileGroups(prev => prev.filter((_, index) => index !== groupIndex));
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


  const preload = new Image();

  return (
    <>
      {(files.length > 0 || driveFiles.length > 0 || (dropboxFiles?.length || 0) > 0 || importedPosts.length > 0 || importedFiles.length > 0 || selectedIgOrganicPosts.length > 0) ? (
        <Card
          className="flex flex-col sticky top-4 w-full border border-gray-300 !bg-white rounded-2xl"
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
                {`${files.filter(f => !f.isDrive).length + driveFiles.length + (dropboxFiles?.length || 0) + importedFiles.length + importedPosts.length} file${(files.filter(f => !f.isDrive).length + driveFiles.length + (dropboxFiles?.length || 0) + importedFiles.length + importedPosts.length) > 1 ? "s" : ""} selected`}
                {isCarouselAd && !enablePlacementCustomization && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Drag to change order of carousel cards
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex gap-2">

              {(enablePlacementCustomization || adType === 'flexible') && (
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

                  {adType !== 'flexible' && (
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
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl mt-0"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>

          {/* Placement Customization Checkbox - only show when carousel is disabled */}
          {!isCarouselAd && hasOnlyNonDynamicCreativeAdSets && (adType !== 'flexible') && (
            <div className="px-6 pb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="placementCustomization"
                  checked={enablePlacementCustomization}
                  onCheckedChange={handlePlacementCustomizationChange}
                  className="border-gray-400 rounded-md"
                />
                <label
                  htmlFor="placementCustomization"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Group media for placement customized ad.
                </label>
              </div>
              {enablePlacementCustomization && (
                <span className="block text-xs text-gray-500 mt-1">
                  AI Auto Group only works for images
                </span>
              )}
            </div>
          )}

          <CardContent
            className="flex-1 overflow-y-auto min-h-0 pr-2"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E0 transparent'
            }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={isCarouselAd && !enablePlacementCustomization ? handleDragEnd : () => { }}
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
                  {fileGroups.map((group, groupIndex) => (
                    <div key={`group-${groupIndex}`} className="relative">
                      {/* Shared group background */}
                      <div
                        className={`absolute inset-0 border-2 rounded-2xl -z-10 ${groupIndex % 2 === 0
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-orange-100 border-orange-300'
                          }`}
                        style={{ margin: '0px' }}
                      />

                      {/* Ungroup button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUngroup(groupIndex)}
                        className="absolute top-2 right-2 z-20 bg-white hover:bg-red-50 text-red-700 border-red-200 rounded-xl text-xs px-2 py-1"
                      >
                        Ungroup
                      </Button>
                      {/* Add this new group label */}
                      <div className={`absolute bottom-2 right-2 z-20 text-white text-xs px-2 py-1 rounded-xl font-semibold ${groupIndex % 2 === 0
                        ? 'bg-blue-500'
                        : 'bg-orange-500'
                        }`}>
                        Group {groupIndex + 1}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3">
                        {group.map(fileId => {
                          let file = files.find(f => (f.isDrive ? f.id : (f.uniqueId || f.name)) === fileId);
                          if (!file) {
                            file = driveFiles.find(f => f.id === fileId);
                            if (file) {
                              file = { ...file, isDrive: true };
                            }
                          }
                          // Check Dropbox files
                          if (!file) {
                            file = (dropboxFiles || []).find(f => f.dropboxId === fileId);
                            if (file) {
                              file = { ...file, isDropbox: true };
                            }
                          }
                          if (!file) {
                            const metaFile = importedFiles.find(f =>
                              (f.type === 'image' ? f.hash : f.id) === fileId
                            );
                            if (metaFile) {
                              file = { ...metaFile, isMetaLibrary: true, name: metaFile.name };
                            }
                          }
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
                            />
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Ungrouped files */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-6" style={{ padding: '6px', }}>
                    {ungroupedFiles.map((file, index) => {
                      const fileId = getFileId(file);  // ✅ Use the helper that handles all file types
                      return (
                        <SortableMediaItem
                          key={fileId}
                          file={file}
                          index={index}
                          isCarouselAd={isCarouselAd}
                          videoThumbs={videoThumbs}
                          onRemove={() => removeFile(file)}
                          isSelected={selectedFiles.has(fileId)}
                          onSelect={handleFileSelect}
                          groupNumber={null}
                          enablePlacementCustomization={enablePlacementCustomization}
                          adType={adType}

                        />
                      );
                    })}

                    {importedPosts.map((post) => (
                      <div key={post.id} className="relative group" title={post.ad_name}>
                        <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
                          <img
                            src={post.image_url || "https://api.withblip.com/thumbnail.jpg"}
                            alt="Post"
                            className="w-full h-auto object-cover"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="absolute top-1.5 right-1.5 border border-gray-400 rounded-lg bg-white shadow-sm h-7 w-7 p-3 z-30"
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

                    {selectedIgOrganicPosts.map((post) => (
                      <div key={`ig-${post.source_instagram_media_id}`} className="relative group" title={post.ad_name}>
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
                            className="absolute top-1.5 right-1.5 border border-gray-400 rounded-lg bg-white shadow-sm h-7 w-7 p-3 z-30"
                            style={{ opacity: 0.9, backgroundColor: "white" }}
                            onClick={() => setSelectedIgOrganicPosts(prev => prev.filter(p => p.source_instagram_media_id !== post.source_instagram_media_id))}
                          >
                            <Trash className="h-2 w-2" />
                          </Button>
                        </div>
                        <p className="mt-1 ml-1 text-xs font-mono text-gray-700 truncate max-w-full">
                          {post.ad_name}
                        </p>
                      </div>
                    ))}


                  </div>
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      ) : (
        <div
          className="sticky top-4 w-full mx-auto"
          style={{ height: "calc(100vh - 140px)" }}
        >
          <div
            className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-2xl border border-gray-200 shadow-md"
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