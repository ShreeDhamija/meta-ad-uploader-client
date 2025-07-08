"use client"

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
import { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox"
import Groupads from '@/assets/icons/groupads.svg?react';

// Sortable item component
function SortableMediaItem({ file, index, isCarouselAd, videoThumbs, onRemove, isSelected, onSelect, groupNumber, enablePlacementCustomization }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.isDrive ? file.id : file.name });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const fileId = file.isDrive ? file.id : file.name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
    >




      {/* Selection overlay for placement customization - only show when NOT grouped */}
      {enablePlacementCustomization && !groupNumber && (
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
      {enablePlacementCustomization && !groupNumber && (
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
        {(file.type || file.mimeType || "").startsWith("video/") ? (
          file.isDrive ? (
            // Google Drive video - use Drive's thumbnail API
            <img
              src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`}
              alt={file.name}
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://api.withblip.com/thumbnail.jpg";
              }}
            />
          ) : (
            // Local video - use generated thumbnail
            videoThumbs[file.name] ? (
              <img
                src={videoThumbs[file.name] || "https://api.withblip.com/thumbnail.jpg"}
                alt={file.name}
                className="w-full h-auto object-cover"
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
              (file.isDrive || file.id) // Check both isDrive flag and presence of id (Google Drive files have id)
                ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`
                : URL.createObjectURL(file)
            }
            alt={file.name}
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
          className="absolute top-1.5 right-1.5 border border-gray-400 rounded-lg bg-white shadow-sm h-7 w-7 p-3"
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
      <p className="mt-1 ml-1 text-sm truncate">{file.name}</p>
      {isCarouselAd && !enablePlacementCustomization && (
        <span className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 mt-1 block w-fit">
          Card {index + 1}
        </span>
      )}
    </div>
  );
}

export default function MediaPreview({
  files,
  setFiles,
  driveFiles,
  setDriveFiles,
  videoThumbs,
  isCarouselAd,
  enablePlacementCustomization,
  setEnablePlacementCustomization,
  fileGroups,
  setFileGroups
}) {
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const sensors = useSensors(useSensor(PointerSensor));

  const removeFile = (file) => {
    const fileId = file.isDrive ? file.id : file.name;

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

    // Remove from files
    if (file.isDrive) {
      setDriveFiles((prev) => prev.filter((f) => f.id !== file.id))
    } else {
      setFiles((prev) => prev.filter((f) => f.name !== file.name))
    }
  }

  // Add this useEffect or modify setEnablePlacementCustomization call
  const handlePlacementCustomizationChange = (checked) => {
    setEnablePlacementCustomization(checked);
    if (!checked) {
      // Clear all grouping when disabled
      setFileGroups([]);
      setSelectedFiles(new Set());
    }
  };

  const handleFileSelect = (fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };



  const handleGroupAds = () => {
    if (selectedFiles.size >= 2 && selectedFiles.size <= 3) {
      const newGroup = Array.from(selectedFiles);
      setFileGroups(prev => [...prev, newGroup]);

      // Get unique selected file IDs
      const selectedFileIds = Array.from(selectedFiles);

      // Get selected files from both arrays, but ensure no duplicates
      const selectedLocalFiles = files.filter(file => {
        const fileId = file.isDrive ? file.id : file.name;
        return selectedFileIds.includes(fileId);
      });

      const selectedDriveFiles = driveFiles.filter(file => {
        // Only include if not already in selectedLocalFiles
        const alreadyInLocal = selectedLocalFiles.some(localFile =>
          localFile.isDrive && localFile.id === file.id
        );
        return selectedFileIds.includes(file.id) && !alreadyInLocal;
      }).map(file => ({ ...file, isDrive: true }));

      // Get unselected files, avoiding duplicates
      const unselectedLocalFiles = files.filter(file => {
        const fileId = file.isDrive ? file.id : file.name;
        return !selectedFileIds.includes(fileId);
      });

      const unselectedDriveFiles = driveFiles.filter(file => {
        // Only include if not already in unselectedLocalFiles
        const alreadyInLocal = unselectedLocalFiles.some(localFile =>
          localFile.isDrive && localFile.id === file.id
        );
        return !selectedFileIds.includes(file.id) && !alreadyInLocal;
      }).map(file => ({ ...file, isDrive: true }));

      // Combine files: unselected first, then selected (for grouping)
      const allFiles = [
        ...unselectedLocalFiles,
        ...unselectedDriveFiles,
        ...selectedLocalFiles,
        ...selectedDriveFiles
      ];

      // Separate into final arrays - ensuring no duplicates
      const newLocalFiles = [];
      const newDriveFiles = [];
      const seenFiles = new Set();

      allFiles.forEach(file => {
        const uniqueKey = file.isDrive ? file.id : file.name;

        if (!seenFiles.has(uniqueKey)) {
          seenFiles.add(uniqueKey);

          if (file.isDrive) {
            newDriveFiles.push(file);
          } else {
            newLocalFiles.push(file);
          }
        }
      });

      setFiles(newLocalFiles);
      setDriveFiles(newDriveFiles);
      setSelectedFiles(new Set());
    }
  };



  const handleUngroup = (groupIndex) => {
    setFileGroups(prev => prev.filter((_, index) => index !== groupIndex));
  };

  const getFileGroupNumber = (fileId) => {
    for (let i = 0; i < fileGroups.length; i++) {
      if (fileGroups[i].includes(fileId)) {
        return i + 1;
      }
    }
    return null;
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = files.findIndex(file => (file.isDrive ? file.id : file.name) === active.id);
      const newIndex = files.findIndex(file => (file.isDrive ? file.id : file.name) === over.id);

      const newFiles = arrayMove(files, oldIndex, newIndex);
      setFiles(newFiles);
    }
  };

  const canGroupFiles = selectedFiles.size >= 2 && selectedFiles.size <= 3;

  const preload = new Image();


  return (
    <>
      {files.length > 0 ? (
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
            const droppedFiles = Array.from(e.dataTransfer.files);
            setFiles(prev => [...prev, ...droppedFiles]);
          }}
        >
          <CardHeader className="flex flex-row justify-between items-start flex-nowrap w-full">
            <div className="flex flex-col items-start">
              <CardTitle className="text-left">Uploads Preview</CardTitle>
              <CardDescription className="text-left">
                {`${files.length} file${files.length > 1 ? "s" : ""} selected`}
                {isCarouselAd && !enablePlacementCustomization && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Drag to change order of carousel cards
                  </span>
                )}
                {enablePlacementCustomization && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Select 2-3 files to group for placement customization
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex gap-2">
              {enablePlacementCustomization && (
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
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setFiles([]);
                  setDriveFiles([]);
                  setSelectedFiles(new Set());
                  setFileGroups([]);
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl mt-0"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>


          {/* Placement Customization Checkbox - only show when carousel is disabled */}
          {!isCarouselAd && (
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
                  Group media for same ad
                </label>
              </div>
              {/* {enablePlacementCustomization && (
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Requires 2-3 images with different aspect ratios per group
                </p>
              )} */}
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
                items={files.map(file => file.isDrive ? file.id : file.name)}
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
                          let file = files.find(f => (f.isDrive ? f.id : f.name) === fileId);
                          if (!file) {
                            file = driveFiles.find(f => f.id === fileId);
                            if (file) {
                              file.isDrive = true; // Ensure isDrive flag is set
                            }
                          }
                          if (!file) {
                            console.warn(`File not found for ID: ${fileId}`);
                            return null;
                          }
                          const index = files.findIndex(f => (f.isDrive ? f.id : f.name) === fileId);
                          return file ? (
                            <SortableMediaItem
                              key={fileId}
                              file={file}
                              index={index}
                              isCarouselAd={isCarouselAd}
                              videoThumbs={videoThumbs}
                              onRemove={() => removeFile(file)}
                              isSelected={false} // Never selected when grouped
                              onSelect={handleFileSelect}
                              groupNumber={groupIndex + 1}
                              enablePlacementCustomization={enablePlacementCustomization}
                            />
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Ungrouped files */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-6" style={{ padding: '6px', }}>
                    {files
                      .filter(file => !fileGroups.some(group => group.includes(file.isDrive ? file.id : file.name)))
                      .map((file, index) => {
                        const fileId = file.isDrive ? file.id : file.name;
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
                          />
                        );
                      })}
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
              const droppedFiles = Array.from(e.dataTransfer.files);
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
                  className="w-[204px] h-[260px] max-w-xs mx-auto"
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