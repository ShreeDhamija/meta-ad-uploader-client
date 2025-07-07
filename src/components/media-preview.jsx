"use client"

import { Rocket, Trash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import RocketImg from '@/assets/rocketpreview.webp';
import Uploadimg from '@/assets/upload.webp';

// Sortable item component
function SortableMediaItem({ file, index, isCarouselAd, videoThumbs, onRemove }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
    >
      {isCarouselAd && (
        <Button
          ref={setActivatorNodeRef}
          {...listeners}
          variant="ghost"
          size="icon"
          className="absolute top-1 left-1 border border-gray-400 rounded-lg bg-white shadow-sm w-6 h-6 z-10 cursor-move"
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
          className="absolute top-1 right-1 border border-gray-400 rounded-xl bg-white shadow-sm h-5 w-5 p-2"
          style={{ opacity: 1, backgroundColor: "white" }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash className="h-3 w-3" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
      <p className="mt-1 text-sm truncate">{file.name}</p>
      {isCarouselAd && (
        <span className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 mt-1 block w-fit">
          Card {index + 1}
        </span>
      )}
    </div>
  );
}

export default function MediaPreview({ files, setFiles, setDriveFiles, videoThumbs, isCarouselAd }) {
  const sensors = useSensors(useSensor(PointerSensor))

  const removeFile = (file) => {
    if (file.isDrive) {
      setDriveFiles((prev) => prev.filter((f) => f.id !== file.id))
    } else {
      setFiles((prev) => prev.filter((f) => f.name !== file.name))
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = files.findIndex(file => (file.isDrive ? file.id : file.name) === active.id);
      const newIndex = files.findIndex(file => (file.isDrive ? file.id : file.name) === over.id);

      const newFiles = arrayMove(files, oldIndex, newIndex);
      setFiles(newFiles);
    }
  };

  const preload = new Image();
  preload.src = "https://api.withblip.com/bg.png";

  return (
    <>
      {files.length > 0 ? (
        <Card
          className="flex flex-col sticky top-4 w-full border border-gray-300 !bg-white"
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
                {isCarouselAd && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Drag to change order of carousel cards
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setFiles([]);
                setDriveFiles([]);
              }}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl mt-0"
            >
              Clear All
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {/* Rest of your CardContent remains the same */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isCarouselAd ? handleDragEnd : () => { }}>
              <SortableContext items={files.map(file => file.isDrive ? file.id : file.name)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {files.map((file, index) => (
                    <SortableMediaItem
                      key={file.isDrive ? file.id : file.name}
                      file={file}
                      index={index}
                      isCarouselAd={isCarouselAd}
                      videoThumbs={videoThumbs}
                      onRemove={() => removeFile(file)}
                    />
                  ))}
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
              // Add your file drop handling logic here
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
                  className="w-[220px] h-[280px] max-w-xs mx-auto"
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