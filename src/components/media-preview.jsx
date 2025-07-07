// "use client"

// import { Trash } from 'lucide-react'
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Loader2 } from 'lucide-react'

// export default function MediaPreview({ files, setFiles, setDriveFiles, videoThumbs, isCarouselAd }) {
//   const removeFile = (file) => {
//     if (file.isDrive) {
//       setDriveFiles((prev) => prev.filter((f) => f.id !== file.id))
//     } else {
//       setFiles((prev) => prev.filter((f) => f.name !== file.name))
//     }
//   }

//   const preload = new Image();
//   preload.src = "https://api.withblip.com/bg.png";

//   return (
//     <>
//       {files.length > 0 ? (
//         <Card
//           className="flex flex-col sticky top-4 w-full border border-gray-300 !bg-white"
//           style={{ height: "calc(100vh - 50px)" }}
//         >
//           <CardHeader className="flex flex-row justify-between items-center flex-nowrap w-full">
//             <div className="flex flex-col items-start">
//               <CardTitle className="text-left">Uploads Preview</CardTitle>
//               <CardDescription className="text-left">
//                 {`${files.length} file${files.length > 1 ? "s" : ""} selected`}
//               </CardDescription>
//             </div>
//             <Button
//               variant="destructive"
//               size="sm"
//               onClick={() => {
//                 setFiles([]);
//                 setDriveFiles([]);
//               }}
//               className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
//             >
//               Clear All
//             </Button>
//           </CardHeader>

//           <CardContent className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
//             <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
//               {files.map((file, index) => (
//                 <div key={file.isDrive ? file.id : file.name} className="relative group">
//                   <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
//                     {(file.type || file.mimeType || "").startsWith("video/") ? (
//                       file.isDrive ? (
//                         // Google Drive video - use Drive's thumbnail API
//                         <img
//                           src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`}
//                           alt={file.name}
//                           className="w-full h-auto object-cover"
//                           onError={(e) => {
//                             e.target.onerror = null;
//                             e.target.src = "https://api.withblip.com/thumbnail.jpg";
//                           }}
//                         />
//                       ) : (
//                         // Local video - use generated thumbnail
//                         videoThumbs[file.name] ? (
//                           <img
//                             src={videoThumbs[file.name] || "https://api.withblip.com/thumbnail.jpg"}
//                             alt={file.name}
//                             className="w-full h-auto object-cover"
//                           />
//                         ) : (
//                           <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
//                             <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
//                             <span className="ml-2 text-sm text-gray-500">Generating...</span>
//                           </div>
//                         )
//                       )
//                     ) : (
//                       // Image files
//                       <img
//                         src={
//                           file.isDrive
//                             ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`
//                             : URL.createObjectURL(file)
//                         }
//                         alt={file.name}
//                         className="w-full h-auto object-cover"
//                         onError={(e) => {
//                           e.target.onerror = null;
//                           e.target.src = "https://api.withblip.com/thumbnail.jpg";
//                         }}
//                       />
//                     )}
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       size="icon"
//                       className="absolute top-2 right-2 border border-gray-400 rounded-xl bg-white shadow-sm"
//                       style={{ opacity: 1, backgroundColor: "white" }}
//                       onClick={() => removeFile(file)}
//                     >
//                       <Trash className="h-4 w-4" />
//                       <span className="sr-only">Remove</span>
//                     </Button>
//                   </div>
//                   <div className="flex items-center justify-between mt-1">
//                     <p className="text-sm truncate">{file.name}</p>
//                     {isCarouselAd && (
//                       <span className="text-xs px-2 py-1 border border-gray-300 rounded bg-gray-100 ml-2 flex-shrink-0 rounded-lg text-gray-700 block w-fit">
//                         Card {index + 1}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       ) : (
//         <div className="sticky top-4 w-full mx-auto shadow-sm">
//           <img
//             src="https://api.withblip.com/bg.png"
//             alt="No uploads"
//             className="w-full object-contain"
//           />
//         </div>
//       )}
//     </>
//   )
// }

"use client"

import { Trash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item component
function SortableMediaItem({ file, index, isCarouselAd, videoThumbs, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: file.isDrive ? file.id : file.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group cursor-move">
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
          size="icon"
          className="absolute top-2 right-2 border border-gray-400 rounded-xl bg-white shadow-sm"
          style={{ opacity: 1, backgroundColor: "white" }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
      <p className="mt-1 text-sm truncate">{file.name}</p>
      {isCarouselAd && (
        <span className="text-xs px-2 py-1 border border-gray-300 rounded bg-gray-100 ml-2 flex-shrink-0 rounded-lg text-gray-700 block w-fit">
          Card {index + 1}
        </span>
      )}
    </div>
  );
}

export default function MediaPreview({ files, setFiles, setDriveFiles, videoThumbs, isCarouselAd }) {
  const removeFile = (file) => {
    if (file.isDrive) {
      setDriveFiles((prev) => prev.filter((f) => f.id !== file.id))
    } else {
      setFiles((prev) => prev.filter((f) => f.name !== file.name))
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
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
          style={{ height: "calc(100vh - 50px)" }}
        >
          <CardHeader className="flex flex-row justify-between items-center flex-nowrap w-full">
            <div className="flex flex-col items-start">
              <CardTitle className="text-left">Uploads Preview</CardTitle>
              <CardDescription className="text-left">
                {`${files.length} file${files.length > 1 ? "s" : ""} selected`}
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setFiles([]);
                setDriveFiles([]);
              }}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Clear All
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
        <div className="sticky top-4 w-full mx-auto shadow-sm">
          <img
            src="https://api.withblip.com/bg.png"
            alt="No uploads"
            className="w-full object-contain"
          />
        </div>
      )}
    </>
  )
}