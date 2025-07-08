// "use client"

// import { Rocket, Trash } from 'lucide-react'
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Loader2 } from 'lucide-react'
// import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
// import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
// import { useSortable } from '@dnd-kit/sortable';
// import { GripVertical } from 'lucide-react';
// import RocketImg from '@/assets/rocketpreview.webp';
// import Uploadimg from '@/assets/upload.webp';

// // Sortable item component
// function SortableMediaItem({ file, index, isCarouselAd, videoThumbs, onRemove }) {
//   const {
//     attributes,
//     listeners,
//     setActivatorNodeRef,
//     setNodeRef,
//     transform,
//     transition,
//     isDragging,
//   } = useSortable({ id: file.isDrive ? file.id : file.name });

//   const style = {
//     transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
//     transition,
//     zIndex: isDragging ? 1000 : 'auto',
//   };

//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//       className={`relative group ${isDragging ? 'opacity-50' : ''}`}
//     >
//       {isCarouselAd && (
//         <Button
//           ref={setActivatorNodeRef}
//           {...listeners}
//           variant="ghost"
//           size="icon"
//           className="absolute top-1.5 left-1.5 border border-gray-400 rounded-lg bg-white shadow-sm w-6 h-6 z-10 cursor-move"
//           style={{ opacity: 1, backgroundColor: "white" }}
//         >
//           <GripVertical className="h-3 w-3 text-gray-600" />
//         </Button>
//       )}
//       <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
//         {(file.type || file.mimeType || "").startsWith("video/") ? (
//           file.isDrive ? (
//             // Google Drive video - use Drive's thumbnail API
//             <img
//               src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`}
//               alt={file.name}
//               className="w-full h-auto object-cover"
//               onError={(e) => {
//                 e.target.onerror = null;
//                 e.target.src = "https://api.withblip.com/thumbnail.jpg";
//               }}
//             />
//           ) : (
//             // Local video - use generated thumbnail
//             videoThumbs[file.name] ? (
//               <img
//                 src={videoThumbs[file.name] || "https://api.withblip.com/thumbnail.jpg"}
//                 alt={file.name}
//                 className="w-full h-auto object-cover"
//               />
//             ) : (
//               <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
//                 <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
//                 <span className="ml-2 text-sm text-gray-500">Generating...</span>
//               </div>
//             )
//           )
//         ) : (
//           // Image files
//           <img
//             src={
//               file.isDrive
//                 ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`
//                 : URL.createObjectURL(file)
//             }
//             alt={file.name}
//             className="w-full h-auto object-cover"
//             onError={(e) => {
//               e.target.onerror = null;
//               e.target.src = "https://api.withblip.com/thumbnail.jpg";
//             }}
//           />
//         )}
//         <Button
//           type="button"
//           variant="ghost"
//           className="absolute top-1.5 right-1.5 border border-gray-400 rounded-lg bg-white shadow-sm h-7 w-7 p-3"
//           style={{ opacity: 0.9, backgroundColor: "white" }}
//           onClick={(e) => {
//             e.stopPropagation();
//             onRemove();
//           }}
//         >
//           <Trash className="h-2 w-2" />
//           <span className="sr-only">Remove</span>
//         </Button>
//       </div>
//       <p className="mt-1 text-sm truncate">{file.name}</p>
//       {isCarouselAd && (
//         <span className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 mt-1 block w-fit">
//           Card {index + 1}
//         </span>
//       )}
//     </div>
//   );
// }

// export default function MediaPreview({ files, setFiles, setDriveFiles, videoThumbs, isCarouselAd, enablePlacementCustomization, setEnablePlacementCustomization }) {
//   const sensors = useSensors(useSensor(PointerSensor))

//   const removeFile = (file) => {
//     if (file.isDrive) {
//       setDriveFiles((prev) => prev.filter((f) => f.id !== file.id))
//     } else {
//       setFiles((prev) => prev.filter((f) => f.name !== file.name))
//     }
//   }

//   const handleDragEnd = (event) => {
//     const { active, over } = event;

//     if (active.id !== over?.id) {
//       const oldIndex = files.findIndex(file => (file.isDrive ? file.id : file.name) === active.id);
//       const newIndex = files.findIndex(file => (file.isDrive ? file.id : file.name) === over.id);

//       const newFiles = arrayMove(files, oldIndex, newIndex);
//       setFiles(newFiles);
//     }
//   };

//   const preload = new Image();
//   preload.src = "https://api.withblip.com/bg.png";

//   return (
//     <>
//       {files.length > 0 ? (
//         <Card
//           className="flex flex-col sticky top-4 w-full border border-gray-300 !bg-white rounded-2xl"
//           style={{ height: "calc(100vh - 140px)" }}
//           onDragOver={(e) => {
//             e.preventDefault();
//             e.stopPropagation();
//           }}
//           onDragEnter={(e) => {
//             e.preventDefault();
//             e.stopPropagation();
//           }}
//           onDrop={(e) => {
//             e.preventDefault();
//             e.stopPropagation();
//             const droppedFiles = Array.from(e.dataTransfer.files);
//             setFiles(prev => [...prev, ...droppedFiles]);
//           }}
//         >
//           <CardHeader className="flex flex-row justify-between items-start flex-nowrap w-full">
//             <div className="flex flex-col items-start">
//               <CardTitle className="text-left">Uploads Preview</CardTitle>
//               <CardDescription className="text-left">
//                 {`${files.length} file${files.length > 1 ? "s" : ""} selected`}
//                 {isCarouselAd && (
//                   <span className="block text-xs text-gray-500 mt-1">
//                     Drag to change order of carousel cards
//                   </span>
//                 )}
//               </CardDescription>
//             </div>
//             <Button
//               variant="destructive"
//               size="sm"
//               onClick={() => {
//                 setFiles([]);
//                 setDriveFiles([]);
//               }}
//               className="bg-red-500 hover:bg-red-600 text-white rounded-xl mt-0"
//             >
//               Clear All
//             </Button>
//           </CardHeader>

//           <CardContent className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
//             {/* Rest of your CardContent remains the same */}
//             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isCarouselAd ? handleDragEnd : () => { }}>
//               <SortableContext items={files.map(file => file.isDrive ? file.id : file.name)} strategy={verticalListSortingStrategy}>
//                 <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
//                   {files.map((file, index) => (
//                     <SortableMediaItem
//                       key={file.isDrive ? file.id : file.name}
//                       file={file}
//                       index={index}
//                       isCarouselAd={isCarouselAd}
//                       videoThumbs={videoThumbs}
//                       onRemove={() => removeFile(file)}
//                     />
//                   ))}
//                 </div>
//               </SortableContext>
//             </DndContext>
//           </CardContent>
//         </Card>
//       ) : (
//         <div
//           className="sticky top-4 w-full mx-auto"
//           style={{ height: "calc(100vh - 140px)" }}
//         >
//           <div
//             className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-2xl border border-gray-200 shadow-md"
//             style={{
//               backgroundColor: '#ffffff',
//               backgroundImage: `repeating-linear-gradient(
//                 135deg,
//                 transparent,
//                 transparent 5px,
//                 rgba(125, 125, 125, 0.2) 5px,
//                 rgba(125, 125, 125, 0.2) 6px
//               )`
//             }}
//             onDragOver={(e) => {
//               e.preventDefault();
//               e.stopPropagation();
//             }}
//             onDragEnter={(e) => {
//               e.preventDefault();
//               e.stopPropagation();
//             }}
//             onDrop={(e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               // Add your file drop handling logic here
//               const droppedFiles = Array.from(e.dataTransfer.files);
//               setFiles(prev => [...prev, ...droppedFiles]);
//             }}
//           >
//             <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full mx-4 text-center min-h-[500px] border border-gray-100 flex flex-col justify-center">
//               {/* UPLOAD Text */}
//               <div className="mb-8">
//                 <img
//                   src={Uploadimg}
//                   alt="Upload illustration"
//                   className="w-24 h-5 mx-auto"
//                 />
//               </div>

//               {/* Your server image */}
//               <div className="mb-8">
//                 <img
//                   src={RocketImg}
//                   alt="Upload illustration"
//                   className="w-[204px] h-[260px] max-w-xs mx-auto"
//                 />
//               </div>

//               {/* Text */}
//               <div className="space-y-1">
//                 <h3 className="text-md font-semibold text-gray-800">
//                   Media Previews Will Appear Here
//                 </h3>
//                 <p className="text-xs text-gray-400">
//                   You can drag and drop to upload files
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   )
// }


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
          className={`absolute inset-0 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-200 bg-opacity-50 border-2 border-blue-500' : 'hover:bg-gray-100 hover:bg-opacity-30'
            }`}
          onClick={() => onSelect(fileId)}
          style={{ zIndex: 5 }}
        />
      )}

      {/* Group number badge */}
      {groupNumber && (
        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-md font-semibold z-20">
          Group {groupNumber}
        </div>
      )}


      {/* Selection checkbox for placement customization - only show when NOT grouped */}
      {enablePlacementCustomization && !groupNumber && (
        <div className="absolute top-2 left-2 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(fileId)}
            className="bg-white border-gray-300"
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
              file.isDrive
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
      <p className="mt-1 text-sm truncate">{file.name}</p>
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
  setDriveFiles,
  videoThumbs,
  isCarouselAd,
  enablePlacementCustomization,
  setEnablePlacementCustomization
}) {
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [fileGroups, setFileGroups] = useState([]);
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

      // Reposition grouped files to be together
      const selectedFileObjects = files.filter(file =>
        selectedFiles.has(file.isDrive ? file.id : file.name)
      );
      const unselectedFileObjects = files.filter(file =>
        !selectedFiles.has(file.isDrive ? file.id : file.name)
      );

      // Move selected files to the end, grouped together
      setFiles([...unselectedFileObjects, ...selectedFileObjects]);
      setSelectedFiles(new Set()); // Clear selection
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
  preload.src = "https://api.withblip.com/bg.png";

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
                  <Users className="h-4 w-4 mr-2" />
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
                />
                <label
                  htmlFor="placementCustomization"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable placement customization (use different images for different placements)
                </label>
              </div>
              {enablePlacementCustomization && (
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Requires 2-3 images with different aspect ratios per group
                </p>
              )}
            </div>
          )}

          <CardContent className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
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
                      <div className="absolute inset-0 bg-blue-100 border-2 border-blue-300 rounded-xl -z-10" style={{ margin: '-8px' }} />

                      {/* Ungroup button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUngroup(groupIndex)}
                        className="absolute top-2 right-2 z-20 bg-white hover:bg-red-50 text-red-600 border-red-200 rounded-lg text-xs px-2 py-1"
                      >
                        Ungroup
                      </Button>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-2">
                        {group.map(fileId => {
                          const file = files.find(f => (f.isDrive ? f.id : f.name) === fileId);
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
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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