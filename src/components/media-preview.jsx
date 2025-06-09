"use client"

import { Trash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'

export default function MediaPreview({ files, setFiles, setDriveFiles, videoThumbs }) {
  const removeFile = (file) => {
    if (file.isDrive) {
      setDriveFiles((prev) => prev.filter((f) => f.id !== file.id))
    } else {
      setFiles((prev) => prev.filter((f) => f.name !== file.name))
    }
  }

  const preload = new Image();
  preload.src = "https://meta-ad-uploader-server-production.up.railway.app/bg.png";

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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {files.map((file) => (
                <div key={file.isDrive ? file.id : file.name} className="relative group">
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
                            e.target.src = "https://meta-ad-uploader-server-production.up.railway.app/thumbnail.jpg";
                          }}
                        />
                      ) : (
                        // Local video - use generated thumbnail
                        videoThumbs[file.name] ? (
                          <img
                            src={videoThumbs[file.name] || "https://meta-ad-uploader-server-production.up.railway.app/thumbnail.jpg"}
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
                          e.target.src = "https://meta-ad-uploader-server-production.up.railway.app/thumbnail.jpg";
                        }}
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 border border-gray-400 rounded-xl bg-white shadow-sm"
                      style={{ opacity: 1, backgroundColor: "white" }}
                      onClick={() => removeFile(file)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                  <p className="mt-1 text-sm truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="sticky top-4 w-full mx-auto  shadow-sm">
          <img
            src="https://meta-ad-uploader-server-production.up.railway.app/bg.png"
            alt="No uploads"
            className="w-full object-contain"
          />
        </div>
      )}
    </>
  )
}