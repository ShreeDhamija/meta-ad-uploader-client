// "use client"

// import { useState, useCallback, useEffect } from "react"
// import axios from "axios"
// import { useDropzone } from "react-dropzone"
// import { toast } from "sonner"
// import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import TextareaAutosize from 'react-textarea-autosize'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { Checkbox } from "@/components/ui/checkbox"
// import { ChevronDown, Loader2, Plus, Trash2, Upload } from "lucide-react"
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
// import { ChevronsUpDown } from "lucide-react"
// import { useAuth } from "@/lib/AuthContext"
// import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts";

// const CLIENT_ID = "102886794705-nrf8t8uc78lll08qd9cvq9ckvafk38q9.apps.googleusercontent.com" // replace with your actual client ID
// const API_KEY = "AIzaSyDePb7a1CNxyaNMpLRJ3-R2T2GHtZKbv_g"
// const SCOPES = "https://www.googleapis.com/auth/drive.readonly"

// let pickerApiLoaded = false
// let tokenClient = null

// export default function AdCreationForm({
//   //isLoggedIn,
//   isLoading,
//   setIsLoading,
//   pages,
//   pageId,
//   setPageId,
//   instagramAccountId,
//   setInstagramAccountId,
//   adName,
//   setAdName,
//   adType,
//   setAdType,
//   dateFormat,
//   setDateFormat,
//   includeFileName,
//   setIncludeFileName,
//   adOrder,
//   setAdOrder,
//   customAdName,
//   setCustomAdName,
//   messages,
//   setMessages,
//   headlines,
//   setHeadlines,
//   descriptions,
//   setDescriptions,
//   link,
//   setLink,
//   cta,
//   setCta,
//   thumbnail,
//   setThumbnail,
//   files,
//   setFiles,
//   videoThumbs,
//   setVideoThumbs,
//   selectedAdSets,
//   duplicateAdSet,
//   selectedCampaign,
//   selectedAdAccount,
//   adSets,
//   copyTemplates,
//   defaultTemplateName,
//   selectedTemplate,
//   setSelectedTemplate,
//   driveFiles,
//   setDriveFiles,
// }) {
//   // Local state
//   const [adTypeOpen, setAdTypeOpen] = useState(false)
//   const [dateFormatOpen, setDateFormatOpen] = useState(false)
//   const [openPage, setOpenPage] = useState(false)

//   //  const [adOrder, setAdOrder] = useState(["adType", "dateType", "fileName"]);
//   const [adValues, setAdValues] = useState({
//     adType,
//     dateType: dateFormat,
//     useFileName: includeFileName,
//   });



//   //gogle drive pickers
//   const [accessToken, setAccessToken] = useState(null)
//   const [selectedFiles, setSelectedFiles] = useState([])

//   const [pageSearchValue, setPageSearchValue] = useState("")
//   const [isDuplicating, setIsDuplicating] = useState(false)
//   const { isLoggedIn } = useAuth()
//   //const [instagramAccountId, setInstagramAccountId] = useState("")
//   const [openInstagram, setOpenInstagram] = useState(false)
//   const [instagramSearchValue, setInstagramSearchValue] = useState("")

//   // Formula parts
//   //const formulaParts = [adType, dateFormat, includeFileName ? "File" : ""].filter(Boolean)
//   const formulaParts = adOrder
//     .map((key) => {
//       if (key === "adType") return adType;
//       if (key === "dateType") return dateFormat;
//       if (key === "fileName") return includeFileName ? "File Name" : null;
//     })
//     .filter(Boolean);



//   // CTA options
//   const ctaOptions = [
//     { value: "LEARN_MORE", label: "Learn More" },
//     { value: "SHOP_NOW", label: "Shop Now" },
//     { value: "SIGN_UP", label: "Sign Up" },
//     { value: "SUBSCRIBE", label: "Subscribe" },
//     { value: "GET_OFFER", label: "Get Offer" },
//     { value: "CONTACT_US", label: "Contact Us" },
//     { value: "DOWNLOAD", label: "Download" },
//     { value: "BOOK_NOW", label: "Book Now" },
//     { value: "SEE_MORE", label: "See More" },
//     { value: "APPLY_NOW", label: "Apply Now" },
//   ]

//   // Filtered pages for combobox
//   const filteredPages = pages.filter((page) => page.name.toLowerCase().includes(pageSearchValue.toLowerCase()))
//   const filteredInstagramAccounts = pages
//     .filter((page) => page.instagramAccount)
//     .filter((page) =>
//       page.instagramAccount.username.toLowerCase().includes(instagramSearchValue.toLowerCase())
//     )

//   useEffect(() => {
//     setAdType(adValues.adType);
//     setDateFormat(adValues.dateType);
//     setIncludeFileName(adValues.useFileName);
//   }, [adValues]);

//   useEffect(() => {
//     setAdValues({
//       adType,
//       dateType: dateFormat,
//       useFileName: includeFileName,
//     });
//   }, [adType, dateFormat, includeFileName]);


//   useEffect(() => {
//     const parts = adOrder.map((key) => {
//       if (key === "adType") return adValues.adType;
//       if (key === "dateType") return adValues.dateType;
//       if (key === "fileName") return adValues.useFileName ? "File" : null;
//     }).filter(Boolean);

//     const baseName = parts.join("_");
//     const newAdName = customAdName ? `${baseName}_${customAdName}` : baseName || "Ad Name Formula will be displayed here";

//     setAdName(newAdName);
//   }, [customAdName, adValues, adOrder]);


//   useEffect(() => {
//     if (!selectedTemplate || !copyTemplates[selectedTemplate]) return;
//     const tpl = copyTemplates[selectedTemplate];
//     setMessages(tpl.primaryTexts || [""]);
//     setHeadlines(tpl.headlines || [""]);
//   }, [selectedTemplate, copyTemplates]);




//   // Drive Picker setup
//   useEffect(() => {
//     window.gapi.load("client:picker", async () => {
//       pickerApiLoaded = true
//       await window.gapi.client.init({ apiKey: API_KEY })
//     })

//     tokenClient = window.google.accounts.oauth2.initTokenClient({
//       client_id: CLIENT_ID,
//       scope: SCOPES,
//       callback: (tokenResponse) => {
//         if (tokenResponse.access_token) {
//           setAccessToken(tokenResponse.access_token)
//           openPicker(tokenResponse.access_token)
//         } else {
//           alert("Failed to get access token")
//         }
//       },
//     })
//   }, [])

//   const handleDriveClick = () => {
//     if (!pickerApiLoaded) {
//       alert("Google Picker not ready yet");
//       return;
//     }

//     if (accessToken) {
//       // ✅ Reuse existing token
//       openPicker(accessToken);
//     } else {
//       // 🧠 Only request if no token exists
//       tokenClient.requestAccessToken();
//     }
//   };


//   const openPicker = (token) => {
//     const view = new google.picker.DocsView()

//     const picker = new window.google.picker.PickerBuilder()
//       .addView(view)
//       .setOAuthToken(token)
//       .setDeveloperKey(API_KEY)
//       .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED) // ✅ this!
//       .setCallback((data) => {
//         if (data.action !== "picked") return
//         const selected = data.docs.map((doc) => ({
//           id: doc.id,
//           name: doc.name,
//           mimeType: doc.mimeType,
//           accessToken: token,
//         }))
//         setDriveFiles((prev) => [...prev, ...selected]);
//         setSelectedFiles((prev) => [...prev, ...selected]);
//       })
//       .build()

//     picker.setVisible(true)
//   }


//   // Dropzone logic
//   const onDrop = useCallback(
//     (acceptedFiles) => {
//       console.log("Dropped Files:", acceptedFiles)
//       setFiles((prevFiles) => [...prevFiles, ...acceptedFiles])
//     },
//     [setFiles],
//   )

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     multiple: true,
//   })






//   // Generate thumbnail from video file
//   const generateThumbnail = useCallback((file) => {
//     return new Promise((resolve, reject) => {
//       const url = URL.createObjectURL(file)
//       const video = document.createElement("video")
//       video.preload = "metadata"
//       video.src = url
//       video.muted = true
//       video.playsInline = true
//       video.currentTime = 0.1
//       video.addEventListener("loadeddata", () => {
//         const canvas = document.createElement("canvas")
//         canvas.width = video.videoWidth
//         canvas.height = video.videoHeight
//         const ctx = canvas.getContext("2d")
//         ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
//         const dataURL = canvas.toDataURL()
//         URL.revokeObjectURL(url)
//         resolve(dataURL)
//       })
//       video.addEventListener("error", () => {
//         reject("Error generating thumbnail")
//       })
//     })
//   }, [])

//   // Generate thumbnails for video files
//   useEffect(() => {
//     files.forEach((file) => {
//       if (file.type.startsWith("video/") && !videoThumbs[file.name]) {
//         generateThumbnail(file)
//           .then((thumb) => {
//             setVideoThumbs((prev) => ({ ...prev, [file.name]: thumb }))
//           })
//           .catch((err) => {
//             toast.error(`Thumbnail generation error: ${err}`)
//             console.error("Thumbnail generation error:", err)
//           })
//       }
//     })
//   }, [files, videoThumbs, generateThumbnail, setVideoThumbs])

//   // Functions for managing dynamic input fields
//   const addField = (setter, values) => {
//     if (values.length < 5) {
//       setter([...values, ""])
//     }
//   }

//   const removeField = (setter, values, index) => {
//     if (values.length > 1) {
//       setter(values.filter((_, i) => i !== index))
//     }
//   }

//   const updateField = (setter, values, index, newValue) => {
//     const newValues = [...values]
//     newValues[index] = newValue
//     setter(newValues)
//   }

//   const handleAdTypeClick = (val) => {
//     if (val === adType) {
//       // If clicking the same value, deselect it
//       setAdType("")
//     } else {
//       // Otherwise select the new value
//       setAdType(val)
//     }
//     setAdTypeOpen(false);
//   }

//   const handleDateFormatClick = (val) => {
//     if (val === dateFormat) {
//       // If clicking the same value, deselect it
//       setDateFormat("")
//     } else {
//       // Otherwise select the new value
//       setDateFormat(val)
//     }
//     setDateFormatOpen(false);
//   }

//   // Helper function to compute a unique ad name for each file
//   const computeAdName = (file) => {
//     const now = new Date()
//     let dateStr = ""
//     // Example: using month names
//     const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
//     const monthName = monthNames[now.getMonth()]

//     if (dateFormat === "MonthDDYYYY") {
//       const day = now.getDate().toString().padStart(2, "0")
//       dateStr = `${monthName}${day}${now.getFullYear()}`
//     } else if (dateFormat === "MonthYYYY") {
//       dateStr = `${monthName}${now.getFullYear()}`
//     }

//     let fileNamePart = ""
//     if (includeFileName) {
//       fileNamePart = file.name.split(".").slice(0, -1).join(".") || file.name
//     }

//     const parts = adOrder.map((key) => {
//       if (key === "adType") return adValues.adType;
//       if (key === "dateType") return dateStr;
//       if (key === "fileName") return fileNamePart;
//     }).filter(Boolean);


//     const computed = parts.join("_")
//     const finalAdName = [computed, customAdName].filter(Boolean).join("_")

//     return finalAdName
//   }

//   const duplicateAdSetRequest = async (adSetId, campaignId, adAccountId) => {
//     const response = await axios.post(
//       "https://meta-ad-uploader-server-production.up.railway.app/auth/duplicate-adset",
//       { adSetId, campaignId, adAccountId },
//       { withCredentials: true },
//     )
//     return response.data.copied_adset_id
//   }

//   const handleCreateAd = async (e) => {
//     e.preventDefault();

//     if (selectedAdSets.length === 0 && !duplicateAdSet) {
//       toast.error("Please select at least one ad set");
//       return;
//     }

//     if (files.length === 0 && driveFiles.length === 0) {
//       toast.error("Please upload at least one file or import from Drive");
//       return;
//     }

//     setIsLoading(true);

//     let finalAdSetIds = [...selectedAdSets];
//     if (duplicateAdSet) {
//       try {
//         const newAdSetId = await duplicateAdSetRequest(duplicateAdSet, selectedCampaign, selectedAdAccount);
//         finalAdSetIds = [newAdSetId];
//       } catch (error) {
//         toast.error("Error duplicating ad set: " + (error.message || "Unknown error"));
//         setIsLoading(false);
//         return;
//       }
//     }

//     const dynamicAdSetIds = [];
//     const nonDynamicAdSetIds = [];
//     finalAdSetIds.forEach((adsetId) => {
//       const adset = adSets.find((a) => a.id === adsetId);
//       if (adset?.is_dynamic_creative) dynamicAdSetIds.push(adsetId);
//       else nonDynamicAdSetIds.push(adsetId);
//     });

//     const submitAd = (file, adSetId, isDynamic, isDrive = false) => {
//       const formData = new FormData();
//       const computedName = computeAdName(file);

//       formData.append("adName", computedName);
//       formData.append("headlines", JSON.stringify(headlines));
//       formData.append("descriptions", JSON.stringify(descriptions));
//       formData.append("messages", JSON.stringify(messages));
//       formData.append("adAccountId", selectedAdAccount);
//       formData.append("adSetId", adSetId);
//       formData.append("pageId", pageId);
//       formData.append("instagramAccountId", instagramAccountId);
//       formData.append("link", link);
//       formData.append("cta", cta);

//       if (isDrive) {
//         formData.append("driveFile", "true");
//         formData.append("driveIds", file.id);
//         formData.append("driveMimeTypes", file.mimeType);
//         formData.append("driveAccessTokens", file.accessToken);
//         formData.append("driveNames", file.name);
//       } else {
//         const field = isDynamic ? "mediaFiles" : "imageFile";
//         formData.append(field, file);
//         if (thumbnail) formData.append("thumbnail", thumbnail);
//       }

//       return axios.post(
//         "https://meta-ad-uploader-server-production.up.railway.app/auth/create-ad",
//         formData,
//         {
//           withCredentials: true,
//           headers: { "Content-Type": "multipart/form-data" },
//         }
//       );
//     };

//     try {
//       const promises = [];

//       // ✅ Add this block first — dynamic ad sets
//       if (dynamicAdSetIds.length > 0) {
//         const allMedia = [...files, ...driveFiles];
//         if (allMedia.length === 0) {
//           toast.error("No media selected for dynamic ad sets");
//           return;
//         }

//         dynamicAdSetIds.forEach((adSetId) => {
//           const formData = new FormData();
//           formData.append("adName", computeAdName(allMedia[0]));
//           formData.append("headlines", JSON.stringify(headlines));
//           formData.append("descriptions", JSON.stringify(descriptions));
//           formData.append("messages", JSON.stringify(messages));
//           formData.append("adAccountId", selectedAdAccount);
//           formData.append("adSetId", adSetId);
//           formData.append("pageId", pageId);
//           formData.append("instagramAccountId", instagramAccountId);
//           formData.append("link", link);
//           formData.append("cta", cta);
//           console.log("📦 LOCAL files in dynamic block:", files);
//           // ✅ Always add local files as mediaFiles
//           files.forEach((file) => {
//             if (file && file.type) {
//               formData.append("mediaFiles", file);
//             } else {
//               console.warn("⚠️ Skipped bad file in dynamic:", file);
//             }
//           });


//           // ✅ Add fallback thumbnail if first file is a video
//           if (files[0]?.type?.startsWith("video/") && thumbnail) {
//             formData.append("thumbnail", thumbnail);
//           }

//           // ✅ Add Drive file metadata if present
//           if (driveFiles.length > 0) {
//             formData.append("driveFile", "true");
//             formData.append("driveFile", "true");
//             formData.append("driveIds", JSON.stringify(driveFiles.map(f => f.id)));
//             formData.append("driveMimeTypes", JSON.stringify(driveFiles.map(f => f.mimeType)));
//             formData.append("driveAccessTokens", JSON.stringify(driveFiles.map(f => f.accessToken)));
//             formData.append("driveNames", JSON.stringify(driveFiles.map(f => f.name)));

//           }
//           for (let [key, value] of formData.entries()) {
//             console.log("🧾", key, value);
//           }

//           promises.push(
//             axios.post("https://meta-ad-uploader-server-production.up.railway.app/auth/create-ad", formData, {
//               withCredentials: true,
//               headers: { "Content-Type": "multipart/form-data" },
//             })
//           );
//         });
//       }


//       // ✅ Then continue with your existing non-dynamic ad logic
//       files.forEach((file) => {
//         nonDynamicAdSetIds.forEach((adSetId) => promises.push(submitAd(file, adSetId, false)));
//       });

//       driveFiles.forEach((file) => {
//         nonDynamicAdSetIds.forEach((adSetId) => promises.push(submitAd(file, adSetId, false, true)));
//       });

//       await Promise.all(promises);
//       toast.success("Ads created successfully!");
//     }
//     catch (error) {
//       const msg = error.response?.data?.error?.message || error.message || "Unknown error";
//       toast.error(`Error uploading ads: ${msg}`);
//       console.error("Upload error:", msg);
//     } finally {
//       setIsLoading(false);
//     }
//   };


//   // Custom radio button component
//   // const CustomRadioButton = ({ value, checked, onChange, label, id }) => {
//   //   return (
//   //     <label
//   //       htmlFor={id}
//   //       className="flex items-center space-x-2 rounded-xl px-2 py-1 hover:bg-gray-100 cursor-pointer"
//   //       onClick={() => onChange(value)}
//   //     >
//   //       <div className="relative flex items-center justify-center">
//   //         <div className={`w-4 h-4 rounded-full border ${checked ? "border-black" : "border-gray-400"} bg-white`}>
//   //           {checked && (
//   //             <div className="absolute inset-0 flex items-center justify-center">
//   //               <div className="w-2 h-2 rounded-full bg-black"></div>
//   //             </div>
//   //           )}
//   //         </div>
//   //         <input
//   //           type="radio"
//   //           id={id}
//   //           value={value}
//   //           checked={checked}
//   //           onChange={() => onChange(value)}
//   //           className="sr-only"
//   //         />
//   //       </div>
//   //       <span className="text-xs">{label}</span>
//   //     </label>
//   //   )
//   // }

//   return (
//     <Card className=" !bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-md">
//       <CardHeader>
//         <CardTitle>Create a New Ad</CardTitle>
//         <CardDescription>Fill in the details to create your ad</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form onSubmit={handleCreateAd} className="space-y-6">
//           <div className="space-y-4">
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <Label>Select a Page</Label>
//               </div>
//               <Popover open={openPage} onOpenChange={setOpenPage}>
//                 <PopoverTrigger asChild>
//                   <Button
//                     variant="outline"
//                     role="combobox"
//                     aria-expanded={openPage}
//                     disabled={!isLoggedIn}
//                     id="page"
//                     className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
//                   >
//                     {pageId ? (
//                       <div className="flex items-center gap-2">
//                         <img
//                           src={
//                             pages.find((page) => page.id === pageId)?.profilePicture ||
//                             "https://meta-ad-uploader-server-production.up.railway.app/backup_page_image.png"
//                           }
//                           alt="Page"
//                           className="w-5 h-5 rounded-full object-cover"
//                         />
//                         <span>{pages.find((page) => page.id === pageId)?.name || pageId}</span>
//                       </div>
//                     ) : (
//                       "Select a Page"
//                     )}

//                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent
//                   className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
//                   align="start"
//                   sideOffset={4}
//                   side="bottom"
//                   avoidCollisions={false}
//                   style={{
//                     minWidth: "var(--radix-popover-trigger-width)",
//                     width: "auto",
//                     maxWidth: "none",
//                   }}
//                 >
//                   <Command filter={() => 1} loop={false} defaultValue={pageId}>
//                     <CommandInput
//                       placeholder="Search pages..."
//                       value={pageSearchValue}
//                       onValueChange={setPageSearchValue}
//                     />
//                     <CommandEmpty>No page found.</CommandEmpty>
//                     <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
//                       <CommandGroup>
//                         {filteredPages.length > 0 ? (
//                           filteredPages.map((page) => (
//                             <CommandItem
//                               key={page.id}
//                               value={page.id}
//                               onSelect={() => {
//                                 setPageId(page.id)
//                                 setOpenPage(false)
//                                 if (page.instagramAccount?.id) {
//                                   setInstagramAccountId(page.instagramAccount.id)
//                                 } else {
//                                   setInstagramAccountId("") // Clear if not available
//                                 }
//                               }}
//                               className={cn(
//                                 "px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
//                                 "data-[selected=true]:bg-gray-100",
//                                 pageId === page.id && "bg-gray-100 rounded-xl font-semibold",
//                                 "hover:bg-gray-100",
//                                 "flex items-center gap-2" // 👈 for image + name layout
//                               )}
//                               data-selected={page.id === pageId}
//                             >

//                               <img
//                                 src={page.profilePicture}
//                                 alt={`${page.name} profile`}
//                                 className="w-6 h-6 rounded-full object-cover border border-gray-300"
//                               />
//                               <span className="truncate">{page.name}</span>
//                             </CommandItem>

//                           ))
//                         ) : (
//                           <CommandItem disabled className="opacity-50 cursor-not-allowed">
//                             No page found.
//                           </CommandItem>
//                         )}
//                       </CommandGroup>
//                     </CommandList>
//                   </Command>
//                 </PopoverContent>
//               </Popover>
//             </div>

//             <div className="space-y-2">
//               <Label>Select Instagram Account</Label>
//               <Popover open={openInstagram} onOpenChange={setOpenInstagram}>
//                 <PopoverTrigger asChild>
//                   <Button
//                     variant="outline"
//                     role="combobox"
//                     aria-expanded={openInstagram}
//                     className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
//                     disabled={filteredInstagramAccounts.length === 0}
//                   >
//                     {instagramAccountId ? (
//                       <div className="flex items-center gap-2">
//                         <img
//                           src={
//                             pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.profilePictureUrl ||
//                             "https://meta-ad-uploader-server-production.up.railway.app/backup_page_image.png"
//                           }
//                           alt="Instagram"
//                           className="w-5 h-5 rounded-full object-cover"
//                         />
//                         <span>
//                           {pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.username || instagramAccountId}
//                         </span>
//                       </div>
//                     ) : (
//                       "Select Instagram Account"
//                     )}

//                     <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent
//                   className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
//                   align="start"
//                   sideOffset={4}
//                   side="bottom"
//                   avoidCollisions={false}
//                   style={{
//                     minWidth: "var(--radix-popover-trigger-width)",
//                     width: "auto",
//                     maxWidth: "none"
//                   }}
//                 >
//                   <Command loop={false}>
//                     <CommandInput
//                       placeholder="Search Instagram usernames..."
//                       value={instagramSearchValue}
//                       onValueChange={setInstagramSearchValue}
//                     />
//                     <CommandEmpty>No Instagram accounts found.</CommandEmpty>
//                     <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
//                       <CommandGroup>
//                         {filteredInstagramAccounts.map((page) => (
//                           <CommandItem
//                             key={page.instagramAccount.id}
//                             value={page.instagramAccount.id}
//                             onSelect={() => {
//                               setInstagramAccountId(page.instagramAccount.id)
//                               setOpenInstagram(false)
//                             }}
//                             className={cn(
//                               "px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
//                               instagramAccountId === page.instagramAccount.id && "bg-gray-100 font-semibold",
//                               "hover:bg-gray-100 flex items-center gap-2"
//                             )}
//                           >
//                             <img
//                               src={page.instagramAccount.profilePictureUrl || "https://meta-ad-uploader-server-production.up.railway.app/backup_page_image.png"}
//                               alt={`${page.instagramAccount.username} profile`}
//                               className="w-6 h-6 rounded-full object-cover border border-gray-300"
//                             />
//                             <span>{page.instagramAccount.username}</span>
//                           </CommandItem>
//                         ))}
//                       </CommandGroup>
//                     </CommandList>
//                   </Command>
//                 </PopoverContent>
//               </Popover>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="adName">Ad Name (Internal Name)</Label>
//               <br />
//               <Label className="text-gray-500 text-[12px] leading-5 font-normal">
//                 You can generate an ad name from the properties below or enter custom text
//               </Label>

//               <div className="flex flex-wrap items-center gap-2">
//               </div>
//               <ReorderAdNameParts
//                 order={adOrder}
//                 setOrder={setAdOrder}
//                 values={adValues}
//                 setValues={setAdValues}
//                 variant="home"
//               />

//               <div className="flex items-center w-full border border-gray-400 rounded-xl bg-white px-1 py-2 shadow h-[35px]">
//                 {formulaParts.length > 0 ? (
//                   <div className="flex items-center">
//                     {formulaParts.map((part, index) => (
//                       <div key={index} className="flex items-center">
//                         <span className="bg-gray-200 text-xs px-2 py-1 rounded-[8px]">{part}</span>
//                         {index < formulaParts.length - 1 && <span className="text-sm text-gray-500 mx-1">_</span>}
//                       </div>
//                     ))}

//                   </div>
//                 ) : (
//                   <span className="text-gray-400 text-sm"> </span>
//                 )}

//                 <input
//                   type="text"
//                   value={customAdName}
//                   onChange={(e) => setCustomAdName(e.target.value)}
//                   placeholder="Enter custom text..."
//                   className={`flex-1 border-0 outline-none bg-transparent text-sm ${formulaParts.length > 0 ? "ml-1" : "ml-1"}`}
//                 />
//               </div>


//             </div>

//             <div className="space-y-2">
//               <Label>Select Copy Template</Label>
//               <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
//                 <SelectTrigger className="border border-gray-400 rounded-xl bg-white shadow">
//                   <SelectValue placeholder="Choose a Template" />
//                 </SelectTrigger>
//                 <SelectContent className="bg-white shadow-lg rounded-xl max-h-full p-0 pr-2">
//                   {Object.entries(copyTemplates)
//                     .sort(([a], [b]) => {
//                       if (a === defaultTemplateName) return -1;
//                       if (b === defaultTemplateName) return 1;
//                       return a.localeCompare(b);
//                     })
//                     .map(([templateName]) => (
//                       <SelectItem
//                         key={templateName}
//                         value={templateName}
//                         className="text-sm px-4 py-2 rounded-xl hover:bg-gray-100"
//                       >
//                         {templateName}
//                       </SelectItem>
//                     ))}
//                 </SelectContent>
//               </Select>
//             </div>



//             <div className="space-y-6">
//               {/* Primary text Section */}
//               <div className="space-y-2">
//                 <Label>Primary Text</Label>
//                 <div className="space-y-3">
//                   {messages.map((value, index) => (
//                     <div key={index} className="flex items-start gap-2">
//                       <TextareaAutosize
//                         value={value}
//                         onChange={(e) => updateField(setMessages, messages, index, e.target.value)}
//                         placeholder="Add text option"
//                         disabled={!isLoggedIn}
//                         minRows={2}
//                         maxRows={10}
//                         className="border border-gray-400 rounded-xl bg-white shadow w-full px-3 py-2 text-sm resize-none focus:outline-none"
//                       />
//                       {messages.length > 1 && (
//                         <Button
//                           type="button"
//                           variant="ghost"
//                           className="border border-gray-400 rounded-xl bg-white shadow-sm"
//                           size="icon"
//                           onClick={() => removeField(setMessages, messages, index)}
//                         >
//                           <Trash2
//                             className="w-4 h-4 text-gray-600 cursor-pointer hover:text-red-500" />
//                           <span className="sr-only">Remove</span>
//                         </Button>
//                       )}
//                     </div>
//                   ))}
//                   {messages.length < 5 && (
//                     <Button
//                       type="button"
//                       size="sm"
//                       className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
//                       onClick={() => addField(setMessages, messages)}
//                     >
//                       <Plus className="mr-2 h-4 w-4 text-white" />
//                       Add text option
//                     </Button>
//                   )}
//                 </div>
//               </div>

//               {/* Headlines Section */}
//               <div className="space-y-2">
//                 <Label>Headlines</Label>
//                 <div className="space-y-3">
//                   {headlines.map((value, index) => (
//                     <div key={index} className="flex items-center gap-2">
//                       <Input
//                         value={value}
//                         onChange={(e) => updateField(setHeadlines, headlines, index, e.target.value)}
//                         className="border border-gray-400 rounded-xl bg-white shadow"
//                         placeholder="Enter headline"
//                         disabled={!isLoggedIn}
//                       />
//                       {headlines.length > 1 && (
//                         <Button
//                           type="button"
//                           variant="ghost"
//                           className="border border-gray-400 rounded-xl bg-white shadow-sm"
//                           size="icon"
//                           onClick={() => removeField(setHeadlines, headlines, index)}
//                         >
//                           <Trash2
//                             className="w-4 h-4 text-gray-600 cursor-pointer !hover:text-red-500" />
//                           <span className="sr-only">Remove</span>
//                         </Button>
//                       )}
//                     </div>
//                   ))}
//                   {headlines.length < 5 && (
//                     <Button
//                       type="button"
//                       size="sm"
//                       className=" w-full rounded-xl shadow bg-zinc-600 hover:bg-black text-white"
//                       onClick={() => addField(setHeadlines, headlines)}
//                     >
//                       <Plus className="mr-2 h-4 w-4 text-white" />
//                       Add headline option
//                     </Button>
//                   )}
//                 </div>
//               </div>

//               {/* Descriptions Section */}
//               {/* <div className="space-y-2">
//                 <Label>Descriptions</Label>
//                 <div className="space-y-3">
//                   {descriptions.map((value, index) => (
//                     <div key={index} className="flex items-start gap-2">
//                       <Textarea
//                         value={value}
//                         className="border border-gray-400 rounded-xl bg-white shadow"
//                         onChange={(e) => updateField(setDescriptions, descriptions, index, e.target.value)}
//                         placeholder="Enter description"
//                         disabled={!isLoggedIn}
//                       />
//                       {descriptions.length > 1 && (
//                         <Button
//                           type="button"
//                           variant="ghost"
//                           className="border border-gray-400 rounded-xl bg-white shadow-sm"
//                           size="icon"
//                           onClick={() => removeField(setDescriptions, descriptions, index)}
//                         >
//                           <Trash2 className="h-4 w-4" />
//                           <span className="sr-only">Remove</span>
//                         </Button>
//                       )}
//                     </div>
//                   ))}
//                   {descriptions.length < 5 && (
//                     <Button
//                       type="button"
//                       variant="outline"
//                       size="sm"
//                       className=" w-full border border-gray-200 rounded-xl shadow"
//                       onClick={() => addField(setDescriptions, descriptions)}
//                     >
//                       <Plus className="mr-2 h-4 w-4" />
//                       Add Description
//                     </Button>
//                   )}
//                 </div>
//               </div> */}
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="Link (URL)">Link (URL)</Label>
//               <p className="text-gray-500 text-[12px] font-regular">
//                 Your UTMs will be auto applied from your Configuration Settings
//               </p>
//               <Input
//                 id="link"
//                 type="url"
//                 value={link}
//                 className="border border-gray-400 rounded-xl bg-white shadow"
//                 onChange={(e) => setLink(e.target.value)}
//                 placeholder="https://example.com"
//                 disabled={!isLoggedIn}
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="cta">Call-to-Action (CTA)</Label>
//               <Select disabled={!isLoggedIn} value={cta} onValueChange={setCta}>
//                 <SelectTrigger id="cta" className="border border-gray-400 rounded-xl bg-white shadow">
//                   <SelectValue placeholder="Select a CTA" />
//                 </SelectTrigger>
//                 <SelectContent className="bg-white shadow-lg rounded-xl max-h-full p-0 pr-2">
//                   {ctaOptions.map((option) => (
//                     <SelectItem
//                       key={option.value}
//                       value={option.value}
//                       className={cn(
//                         "w-full text-left",
//                         "px-4 py-2 m-1 rounded-xl", // padding and spacing
//                         "transition-colors duration-150",
//                         "hover:bg-gray-100 hover:rounded-xl",
//                         "data-[state=selected]:!bg-gray-100 data-[state=selected]:rounded-xl",
//                         "data-[highlighted]:!bg-gray-100 data-[highlighted]:rounded-xl",
//                         cta === option.value && "!bg-gray-100 font-semibold rounded-xl"
//                       )}
//                     >
//                       {option.label}
//                     </SelectItem>

//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="thumbnail">Thumbnail - Optional(Only for videos)</Label>
//               <div className="flex items-center space-x-2">
//                 {/* Custom button for file input */}
//                 <label
//                   htmlFor="thumbnail"
//                   className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-400 rounded-xl bg-white shadow hover:bg-gray-100 text-xs"
//                 >
//                   Choose File
//                 </label>
//                 {/* Hidden file input */}
//                 <input
//                   id="thumbnail"
//                   type="file"
//                   className="hidden"
//                   onChange={(e) => setThumbnail(e.target.files[0])}
//                   disabled={!isLoggedIn}
//                 />
//                 {/* Display uploaded file name and trash button if a file is selected */}
//                 {thumbnail && (
//                   <div className="flex items-center space-x-1">
//                     <span className="text-sm">{thumbnail.name}</span>
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       className="border border-gray-400 rounded-xl bg-white shadow-sm"
//                       size="icon"
//                       onClick={() => setThumbnail(null)}
//                     >
//                       <Trash2 className="h-4 w-4" />
//                       <span className="sr-only">Remove thumbnail</span>
//                     </Button>
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div className="space-y-2">
//               <Label className="block">Upload Media</Label>
//               <Label className="text-gray-500 text-[12px] font-regular">All media will be posted as a new ad set unless posting to a dynamic ad set</Label>
//               <div
//                 {...getRootProps()}
//                 className={`group cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
//                   }`}
//               >
//                 <input {...getInputProps()} disabled={!isLoggedIn} />
//                 <div className="flex flex-col items-center gap-2">
//                   <Upload className="h-6 w-6 text-gray-500 group-hover:text-black" />
//                   {isDragActive ? (
//                     <p className="text-sm text-gray-500 group-hover:text-black">Drop files here ...</p>
//                   ) : (
//                     <p className="text-sm text-gray-500 group-hover:text-black">
//                       Drag & drop files here, or click to select files
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div>
//             <Button type="button" onClick={handleDriveClick} className="w-full bg-blue-600 text-white rounded-xl">
//               Import from Google Drive
//             </Button>

//             {selectedFiles.length > 0 && (
//               <ul className="list-disc text-sm text-gray-700 mt-2 list-inside">
//                 {selectedFiles.map((f) => (
//                   <li key={f.id}>{f.name}</li>
//                 ))}
//               </ul>
//             )}
//           </div>
//           <Button
//             type="submit"
//             className="w-full h-12 bg-neutral-950 hover:bg-blue-700 text-white rounded-xl"
//             disabled={
//               !isLoggedIn || (selectedAdSets.length === 0 && !duplicateAdSet) || (files.length === 0 && driveFiles.length === 0) || isLoading
//             }
//           >
//             {isLoading ? (
//               <>
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 Publishing Ads...
//               </>
//             ) : (
//               "Publish Ads"
//             )}
//           </Button>
//         </form>
//       </CardContent>
//     </Card >
//   )
// }

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const session = require('express-session');
const dotenvResult = require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = express();
const { db } = require("./firebase");
const {
  createOrUpdateUser,
  getUserByFacebookId,
  saveGlobalSettings,
  saveAdAccountSettings,
  getGlobalSettings,
  getAdAccountSettings,
  deleteCopyTemplate,
} = require("./firebaseController");
const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');
const crypto = require('crypto');

app.use(cors({
  origin: [
    'https://www.withblip.com'
  ],
  credentials: true
}));



app.options("*", cors({
  origin: 'https://www.withblip.com',
  credentials: true
}));

app.use(express.json());
app.set('trust proxy', 1);
app.use(express.static('public'));


const STATIC_LOGIN = {
  username: "metatest",
  password: "password", // ideally use env variable
};

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('ready', () => {
  console.log('✅ Redis client is ready');
});

redisClient.connect();
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none'
  }
}));


function buildCreativeEnhancementsConfig(firestoreSettings = {}) {
  return {
    image_brightness_and_contrast: {
      enroll_status: firestoreSettings.brightness ? "OPT_IN" : "OPT_OUT"
    },
    enhance_CTA: {
      enroll_status: firestoreSettings.cta ? "OPT_IN" : "OPT_OUT"
    },
    image_templates: {
      enroll_status: firestoreSettings.overlay ? "OPT_IN" : "OPT_OUT"
    },
    text_optimizations: {
      enroll_status: firestoreSettings.text ? "OPT_IN" : "OPT_OUT"
    },
    image_touchups: {
      enroll_status: firestoreSettings.visual ? "OPT_IN" : "OPT_OUT"
    },
    video_auto_crop: {
      enroll_status: firestoreSettings.visual ? "OPT_IN" : "OPT_OUT"
    }
  }
}

async function retryWithBackoff(fn, maxAttempts = 3, initialDelay = 1000) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      const fbErr = err.response?.data?.error;
      const isTransient = fbErr?.is_transient || fbErr?.code === 2;

      if (!isTransient || attempt === maxAttempts - 1) {
        throw err;
      }

      const delay = initialDelay * Math.pow(2, attempt); // exponential backoff
      console.warn(`⚠️ Transient error (attempt ${attempt + 1}), retrying in ${delay}ms`);
      await new Promise((res) => setTimeout(res, delay));
      attempt++;
    }
  }
}



// Multer disk storage
const uploadDir = path.join('/data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// In-memory user storage (use a database in production)
let userData = {};

/**
 * Step 1: Facebook Login - Redirect to Facebook OAuth
 */

app.get('/auth/facebook', (req, res) => {
  const clientId = process.env.META_APP_ID; // add this to your .env file
  const redirectUri = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=https://meta-ad-uploader-server-production.up.railway.app/auth/callback&scope=ads_read,ads_management,business_management,pages_show_list,email,pages_read_engagement,instagram_basic,pages_manage_ads&auth_type=rerequest&response_type=code`;
  res.redirect(redirectUri);
});




app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  try {


    // 1. Exchange for short-lived token
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: 'https://meta-ad-uploader-server-production.up.railway.app/auth/callback',
        code: code
      }
    });

    const { access_token: shortLivedToken } = tokenResponse.data;


    // 2. Exchange for long-lived token
    const longLivedResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });

    const { access_token: longLivedToken } = longLivedResponse.data;
    //console.log("✅ Long-lived token received");
    console.log("🔑 New long-lived token from Facebook login:", longLivedToken);


    // 3. Store token in session
    req.session.accessToken = longLivedToken;

    const meResponse = await axios.get('https://graph.facebook.com/v21.0/me', {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,email,picture'
      }
    });

    const { id: facebookId, name, email, picture } = meResponse.data;

    req.session.user = {
      name,
      facebookId,
      email,
      profilePicUrl: picture?.data?.url || ""
    };

    //console.log("📦 Session about to be saved:", req.session);

    // 4. Save session before redirect
    req.session.save(async (err) => {
      if (err) {
        console.error("❌ Session save failed:", err);
        return res.status(500).send("Session save error");
      }

      //      console.log("✅ Session saved successfully");

      // 5. Update Firestore
      await createOrUpdateUser({
        facebookId,
        name,
        email,
        picture,
        accessToken: longLivedToken
      });

      // 6. Redirect
      res.redirect('https://www.withblip.com/?loggedIn=true');
    });

  } catch (error) {
    console.error('OAuth Callback Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to complete Facebook Login' });
  }
});


app.get("/auth/me", async (req, res) => {
  const sessionUser = req.session.user
  if (!sessionUser) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {
    const userData = await getUserByFacebookId(sessionUser.facebookId)

    if (!userData) {
      return res.status(401).json({ error: "User not found in database" })
    }

    return res.json({
      user: {
        name: userData.name,
        email: userData.email,
        preferences: userData.preferences || {},
        hasCompletedSignup: userData.hasCompletedSignup,
        profilePicUrl: userData.picture?.data?.url || "",
      },
    })
  } catch (err) {
    console.error("Error in /auth/me:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
})



app.get('/auth/fetch-ad-accounts', async (req, res) => {
  const token = req.session.accessToken;
  console.log("Session token used to fetch ad accounts:", req.session.accessToken);
  if (!token) return res.status(401).json({ error: 'User not authenticated' });
  try {
    const adAccountsResponse = await axios.get('https://graph.facebook.com/v21.0/me/adaccounts', {
      params: {
        access_token: token,
        fields: 'id,account_id,name'
      }
    });
    const adAccounts = adAccountsResponse.data.data;
    userData.adAccounts = adAccounts;
    res.json({ success: true, adAccounts });
  } catch (error) {
    console.error('Fetch Ad Accounts Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch ad accounts' });
  }
});


/**
 * Fetch Campaigns for a given Ad Account
 */
app.get('/auth/fetch-campaigns', async (req, res) => {
  const { adAccountId } = req.query;
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: 'User not authenticated' });
  if (!adAccountId) return res.status(400).json({ error: 'Missing adAccountId parameter' });
  try {
    const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns`;
    const campaignsResponse = await axios.get(campaignsUrl, {
      params: {
        access_token: token,
        fields: 'id,name,status,insights.date_preset(last_7d){spend},smart_promotion_type',

      }
    });


    const campaigns = campaignsResponse.data.data.map(camp => {
      const spend = parseFloat(camp.insights?.data?.[0]?.spend || "0");
      return { ...camp, spend };
    });


    res.json({ campaigns });
  } catch (error) {
    console.error('Fetch Campaigns Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * Fetch Ad Sets for a given Campaign
 */
app.get('/auth/fetch-adsets', async (req, res) => {
  const { campaignId } = req.query;
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: 'User not authenticated' });
  if (!campaignId) return res.status(400).json({ error: 'Missing campaignId parameter' });
  try {
    const adSetsUrl = `https://graph.facebook.com/v21.0/${campaignId}/adsets`;
    const adSetsResponse = await axios.get(adSetsUrl, {
      params: {
        access_token: token,
        fields: 'id,name,status,is_dynamic_creative,effective_status,insights.date_preset(last_7d){spend}'
      }
    });
    const adSets = adSetsResponse.data.data.map(adset => {
      const spend = parseFloat(adset.insights?.data?.[0]?.spend || "0");
      return { ...adset, spend };
    });
    res.json({ adSets });

  } catch (error) {
    console.error('Fetch Ad Sets Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch ad sets' });
  }
});

app.post('/auth/duplicate-adset', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: 'User not authenticated' });
  const { adSetId, campaignId, adAccountId } = req.body;
  if (!adSetId || !campaignId || !adAccountId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  try {
    const copyUrl = `https://graph.facebook.com/v21.0/${adSetId}/copies`;
    const params = {
      campaign_id: campaignId,
      rename_options: JSON.stringify({ rename_suffix: '_02' }),
      access_token: token,
    };
    const copyResponse = await axios.post(copyUrl, null, { params });
    return res.json(copyResponse.data);
  } catch (error) {
    console.error('Duplicate adSet error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to duplicate adSet' });
  }
});

app.get('/auth/fetch-pages', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: 'User not authenticated' });

  try {
    const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        access_token: token,
        fields: 'id,name,access_token'
      }
    });

    const pages = pagesResponse.data.data;

    // 🔄 Fetch profile pictures using /{pageId}/picture?redirect=false
    const pagesWithPictures = await Promise.all(
      pages.map(async (page) => {
        let profilePicture = null
        let instagramAccount = null

        try {
          // ✅ 1. Fetch Page Profile Picture
          const picRes = await axios.get(`https://graph.facebook.com/v21.0/${page.id}/picture`, {
            params: {
              access_token: page.access_token,
              redirect: false,
            },
          })
          profilePicture = picRes.data?.data?.url || "https://meta-ad-uploader-server-production.up.railway.app/backup_page_image.png"
        } catch (err) {
          console.warn(`Failed to fetch profile picture for page ${page.id}:`, err.message)
        }

        try {
          // ✅ 2. Fetch Connected Instagram Business Account
          const igRes = await axios.get(`https://graph.facebook.com/v22.0/${page.id}`, {
            params: {
              access_token: page.access_token,
              fields: "instagram_business_account"
            },
          })

          const igAccountId = igRes.data?.instagram_business_account?.id;

          if (igAccountId) {
            // ✅ 3. Optionally fetch IG account details (username, profile pic)
            try {
              const igDetailsRes = await axios.get(`https://graph.facebook.com/v22.0/${igAccountId}`, {
                params: {
                  access_token: page.access_token,
                  fields: 'username,profile_picture_url',
                },
              })


              instagramAccount = {
                id: igAccountId,
                username: igDetailsRes.data?.username || null,
                profilePictureUrl: igDetailsRes.data?.profile_picture_url || null,
              }

            } catch (err) {
              console.error(` Failed to fetch IG details for IG ID ${igAccountId} (page ${page.id}):`)

              if (err.response) {
                // The API responded with an error (not 2xx)
                console.error("Response status:", err.response.status)
                console.error("Response data:", err.response.data)
              } else if (err.request) {
                // No response was received
                console.error("No response received:", err.request)
              } else {
                // Something else happened setting up the request
                console.error("Error message:", err.message)
              }
            }


          }
          else {


          }
        } catch (err) {
          console.error(`Failed to fetch IG account for page ${page.id}:`, err.message)
        }

        return {
          ...page,
          profilePicture,
          instagramAccount, // ✅ sent to frontend
        }
      })
    )


    res.json({ success: true, pages: pagesWithPictures });

  } catch (error) {
    console.error('Error fetching pages:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});


app.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Helper: Poll video processing status
async function waitForVideoProcessing(videoId, token) {
  const maxWaitTime = 300000; // 5 minutes
  const pollInterval = 5000;  // 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const videoStatusUrl = `https://graph.facebook.com/v21.0/${videoId}`;
    const statusResponse = await axios.get(videoStatusUrl, {
      params: {
        access_token: token,
        fields: 'status'
      }
    });
    const videoStatus = statusResponse.data.status && statusResponse.data.status.video_status;
    if (videoStatus === 'ready') return;
    if (videoStatus === 'failed') throw new Error('Video processing failed');
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  throw new Error('Video processing timed out');
}


//url tag builder
function buildUrlTagsFromPairs(utmPairs) {
  return utmPairs
    .filter(p => p.key && p.value)
    .map(p => `${p.key}=${p.value}`)
    .join("&");
}

//helper functions
function cleanupUploadedFiles(files) {
  if (!files) return;
  Object.values(files).flat().forEach(file => {
    fs.unlink(file.path, err => {
      if (err) console.error("Failed to clean up file:", file.path, err.message);
    });
  });
}

// Helper: Build video creative payload
function buildVideoCreativePayload({ adName, adSetId, pageId, videoId, cta, link, headlines, messagesArray, descriptionsArray, thumbnailHash, thumbnailUrl, useDynamicCreative, instagramAccountId, urlTags, creativeEnhancements }) {
  if (useDynamicCreative) {
    return {
      name: adName,
      adset_id: adSetId,
      creative: {
        object_story_spec: {
          page_id: pageId,
          ...(instagramAccountId && { instagram_user_id: instagramAccountId }),
        },
        ...(urlTags && { url_tags: urlTags }),
        asset_feed_spec: {
          videos: [{
            video_id: videoId,
            ...(thumbnailHash
              ? { thumbnail_hash: thumbnailHash }
              : { image_url: thumbnailUrl }
            )
          }],
          titles: headlines.map(text => ({ text })),
          bodies: messagesArray.map(text => ({ text })),
          descriptions: descriptionsArray.map(text => ({ text })),
          ad_formats: ["SINGLE_VIDEO"],
          call_to_action_types: [cta],
          link_urls: [{ website_url: link }]
        },
        degrees_of_freedom_spec: {
          creative_features_spec: buildCreativeEnhancementsConfig(creativeEnhancements)

        }
      },
      status: 'ACTIVE'
    };
  } else {
    return {
      name: adName,
      adset_id: adSetId,
      creative: {
        object_story_spec: {
          page_id: pageId,
          ...(instagramAccountId && { instagram_user_id: instagramAccountId }),
          video_data: {
            video_id: videoId,
            call_to_action: { type: cta, value: { link } },
            message: messagesArray[0],
            title: headlines[0],
            link_description: descriptionsArray[0],
            ...(thumbnailHash
              ? { image_hash: thumbnailHash }
              : { image_url: thumbnailUrl }
            )
          }
        },
        ...(urlTags && { url_tags: urlTags }),
        degrees_of_freedom_spec: {
          creative_features_spec: buildCreativeEnhancementsConfig(creativeEnhancements)

        }
      },
      status: 'ACTIVE'
    };
  }
}

// Helper: Build image creative payload
function buildImageCreativePayload({ adName, adSetId, pageId, imageHash, cta, link, headlines, messagesArray, descriptionsArray, useDynamicCreative, instagramAccountId, urlTags, creativeEnhancements }) {
  if (useDynamicCreative) {
    return {
      name: adName,
      adset_id: adSetId,
      creative: {
        object_story_spec: {
          page_id: pageId,
          ...(instagramAccountId && { instagram_user_id: instagramAccountId })
        },
        ...(urlTags && { url_tags: urlTags }),
        asset_feed_spec: {
          images: [{ hash: imageHash }],
          titles: headlines.map(text => ({ text })),
          bodies: messagesArray.map(text => ({ text })),
          descriptions: descriptionsArray.map(text => ({ text })),
          ad_formats: ["SINGLE_IMAGE"],
          call_to_action_types: [cta],
          link_urls: [{ website_url: link }]
        },
        degrees_of_freedom_spec: {
          creative_features_spec: buildCreativeEnhancementsConfig(creativeEnhancements)

        }
      },
      status: 'ACTIVE'
    };
  } else {
    const finalPayload = {
      name: adName,
      adset_id: adSetId,
      creative: {
        object_story_spec: {
          page_id: pageId,
          ...(instagramAccountId && { instagram_user_id: instagramAccountId }),
          link_data: {
            name: headlines[0],
            description: descriptionsArray[0],
            call_to_action: { type: cta, value: { link } },
            message: messagesArray[0],
            link: link,
            caption: link,
            image_hash: imageHash,
          },
        },
        ...(urlTags && { url_tags: urlTags }),
        degrees_of_freedom_spec: {
          creative_features_spec: buildCreativeEnhancementsConfig(creativeEnhancements)

        },
      },
      status: "ACTIVE",
    };
    return finalPayload;

  }
}



async function handleVideoAd(req, token, adAccountId, adSetId, pageId, adName, cta, link, headlines, messagesArray, descriptionsArray, useDynamicCreative, instagramAccountId, urlTags, creativeEnhancements) {
  const file = req.files.imageFile?.[0];
  if (!file) throw new Error('Video file is required');

  const uploadVideoUrl = `https://graph.facebook.com/v21.0/${adAccountId}/advideos`;
  const videoFormData = new FormData();
  videoFormData.append('access_token', token);
  videoFormData.append('source', fs.createReadStream(file.path), {
    filename: file.originalname,
    contentType: file.mimetype
  });

  const videoUploadResponse = await axios.post(uploadVideoUrl, videoFormData, {
    headers: videoFormData.getHeaders()
  });

  const videoId = videoUploadResponse.data.id;

  if (useDynamicCreative) {
    await waitForVideoProcessing(videoId, token);
  }

  // Handle thumbnail
  const thumbnailFile = req.files.thumbnail?.[0];


  let thumbnailHash = null;
  let thumbnailUrl = null;

  if (thumbnailFile) {
    const thumbFormData = new FormData();
    thumbFormData.append('access_token', token);
    thumbFormData.append('file', fs.createReadStream(thumbnailFile.path), {
      filename: thumbnailFile.originalname,
      contentType: thumbnailFile.mimetype
    });

    const thumbUploadUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adimages`;
    const thumbUploadResponse = await axios.post(thumbUploadUrl, thumbFormData, {
      headers: thumbFormData.getHeaders()
    });

    const imagesInfo = thumbUploadResponse.data.images;
    const key = Object.keys(imagesInfo)[0];
    thumbnailHash = imagesInfo[key].hash;

    await fs.promises.unlink(thumbnailFile.path).catch(err => console.error("Error deleting thumbnail file:", err));
  }

  else {
    thumbnailUrl = "https://meta-ad-uploader-server-production.up.railway.app/thumbnail.jpg";
  }

  const creativePayload = buildVideoCreativePayload({
    adName,
    adSetId,
    pageId,
    videoId,
    cta,
    link,
    headlines,
    messagesArray,
    descriptionsArray,
    thumbnailHash,
    thumbnailUrl,
    useDynamicCreative,
    instagramAccountId,
    urlTags,
    creativeEnhancements
  });

  const createAdUrl = `https://graph.facebook.com/v22.0/${adAccountId}/ads`;
  const createAdResponse = await retryWithBackoff(() =>
    axios.post(createAdUrl, creativePayload, {
      params: { access_token: token }
    })
  );


  await fs.promises.unlink(file.path).catch(err => console.error("Error deleting video file:", err));
  return createAdResponse.data;
}



// Helper: Handle Image Ad Creation
async function handleImageAd(req, token, adAccountId, adSetId, pageId, adName, cta, link, headlines, messagesArray, descriptionsArray, useDynamicCreative, instagramAccountId, urlTags, creativeEnhancements) {
  const file = req.files.imageFile && req.files.imageFile[0];
  const uploadUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adimages`;

  const formData = new FormData();
  formData.append('access_token', token);
  formData.append('file', fs.createReadStream(file.path), {
    filename: file.originalname,
    contentType: file.mimetype
  });
  const uploadResponse = await axios.post(uploadUrl, formData, {
    headers: formData.getHeaders()
  });
  const imagesInfo = uploadResponse.data.images;
  const filenameKey = Object.keys(imagesInfo)[0];
  const imageHash = imagesInfo[filenameKey].hash;

  const creativePayload = buildImageCreativePayload({
    adName,
    adSetId,
    pageId,
    imageHash,
    cta,
    link,
    headlines,
    messagesArray,
    descriptionsArray,
    useDynamicCreative,
    instagramAccountId,
    urlTags,
    creativeEnhancements
  });
  const createAdUrl = `https://graph.facebook.com/v22.0/${adAccountId}/ads`;
  const createAdResponse = await retryWithBackoff(() =>
    axios.post(createAdUrl, creativePayload, {
      params: { access_token: token }
    })
  );


  fs.unlink(file.path, err => {
    if (err) console.error("Error deleting image file:", err);
    else console.log("Image file deleted:", file.path);
  });

  return createAdResponse.data;
}

/**
 * (NEW) Create an Ad in a given Ad Set
 */
// app.post(
//   '/auth/create-ad',
//   upload.fields([
//     { name: 'mediaFiles', maxCount: 10 },      // For dynamic creative (multiple files)
//     { name: 'thumbnails', maxCount: 1 },        // For dynamic creative video thumbnails
//     { name: 'imageFile', maxCount: 1 },          // For non-dynamic creative (single file)
//     { name: 'thumbnail', maxCount: 1 }           // For non-dynamic creative video thumbnail
//   ]),
//   async (req, res) => {
//     const token = req.session.accessToken;
//     if (!token) return res.status(401).json({ error: 'User not authenticated' });

//     try {
//       // Extract basic fields and parse creative text fields.
//       const { adName, adSetId, pageId, link, cta, adAccountId, instagramAccountId } = req.body;

//       if (!adAccountId) return res.status(400).json({ error: 'Missing adAccountId' });

//       const parseField = (field, fallback) => {
//         try { return JSON.parse(field); } catch (e) { return fallback ? [fallback] : []; }
//       };
//       const headlines = parseField(req.body.headlines, req.body.headline);
//       const descriptionsArray = parseField(req.body.descriptions, req.body.description);
//       const messagesArray = parseField(req.body.messages, req.body.message);

//       // Fetch the ad set info to determine dynamic creative.
//       const adSetInfoUrl = `https://graph.facebook.com/v21.0/${adSetId}`;
//       const adSetInfoResponse = await axios.get(adSetInfoUrl, {
//         params: { access_token: token, fields: 'is_dynamic_creative' }
//       });
//       const adSetDynamicCreative = adSetInfoResponse.data.is_dynamic_creative;
//       // const useDynamicCreative =
//       //   headlines.length > 1 ||
//       //   descriptionsArray.length > 1 ||
//       //   messagesArray.length > 1 ||
//       //   adSetDynamicCreative;

//       const useDynamicCreative = adSetDynamicCreative;

//       const adAccountSettings = await getAdAccountSettings(req.session.user.facebookId, adAccountId);

//       const creativeEnhancements = adAccountSettings?.creativeEnhancements || {};
//       const utmPairs = adAccountSettings?.defaultUTMs || [];
//       const urlTags = buildUrlTagsFromPairs(utmPairs);



//       let result;
//       // For dynamic ad creative, use the aggregated media fields.
//       if (useDynamicCreative) {
//         // Expect the aggregated files to be in req.files.mediaFiles
//         const mediaFiles = req.files.mediaFiles;
//         if (!mediaFiles || mediaFiles.length === 0) {
//           return res.status(400).json({ error: 'No media files received for dynamic creative' });
//         }
//         // Decide if these are videos or images (assumes all files are of the same type)
//         if (mediaFiles[0].mimetype.startsWith('video/')) {
//           result = await handleDynamicVideoAd(
//             req,
//             token,
//             adAccountId,
//             adSetId,
//             pageId,
//             adName,
//             cta,
//             link,
//             headlines,
//             messagesArray,
//             descriptionsArray,
//             instagramAccountId,
//             urlTags,
//             creativeEnhancements
//           );
//         } else {
//           result = await handleDynamicImageAd(
//             req,
//             token,
//             adAccountId,
//             adSetId,
//             pageId,
//             adName,
//             cta,
//             link,
//             headlines,
//             messagesArray,
//             descriptionsArray,
//             instagramAccountId,
//             urlTags,
//             creativeEnhancements
//           );
//         }
//       } else {
//         // Non-dynamic creative: use the original single file fields.
//         const file = req.files.imageFile && req.files.imageFile[0];
//         if (!file) return res.status(400).json({ error: 'No image file received' });
//         if (file.mimetype.startsWith('video/')) {
//           result = await handleVideoAd(
//             req,
//             token,
//             adAccountId,
//             adSetId,
//             pageId,
//             adName,
//             cta,
//             link,
//             headlines,
//             messagesArray,
//             descriptionsArray,
//             useDynamicCreative,
//             instagramAccountId,
//             urlTags,
//             creativeEnhancements
//           );
//         } else {
//           result = await handleImageAd(
//             req,
//             token,
//             adAccountId,
//             adSetId,
//             pageId,
//             adName,
//             cta,
//             link,
//             headlines,
//             messagesArray,
//             descriptionsArray,
//             useDynamicCreative,
//             instagramAccountId,
//             urlTags,
//             creativeEnhancements
//           );
//         }
//       }
//       return res.json(result);
//     } catch (error) {
//       console.error('Create Ad Error:', error.response?.data || error.message);
//       cleanupUploadedFiles(req.files); // 🧼 cleanup
//       const fbErrorMsg = error.response?.data?.error?.error_user_msg || error.message || 'Failed to create ad';
//       return res.status(400).send(fbErrorMsg);
//     }
//   }
// );

app.post(
  '/auth/create-ad',
  upload.fields([
    { name: 'mediaFiles', maxCount: 10 },
    { name: 'thumbnails', maxCount: 1 },
    { name: 'imageFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    const token = req.session.accessToken;
    if (!token) return res.status(401).json({ error: 'User not authenticated' });

    try {
      const {
        adName,
        adSetId,
        pageId,
        link,
        cta,
        adAccountId,
        instagramAccountId,
        driveFile,
        driveId,
        driveAccessToken,
        driveMimeType,
        driveName,
      } = req.body;

      if (!adAccountId) return res.status(400).json({ error: 'Missing adAccountId' });

      const parseField = (field, fallback) => {
        try {
          return JSON.parse(field);
        } catch (e) {
          return fallback ? [fallback] : [];
        }
      };
      const headlines = parseField(req.body.headlines, req.body.headline);
      const descriptionsArray = parseField(req.body.descriptions, req.body.description);
      const messagesArray = parseField(req.body.messages, req.body.message);

      // Inject a file from Drive into req.files if needed
      if (driveFile === 'true' && driveId && driveAccessToken) {
        const fileRes = await axios({
          url: `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media`,
          method: 'GET',
          responseType: 'stream',
          headers: { Authorization: `Bearer ${driveAccessToken}` },
        });

        const tempDir = path.resolve(__dirname, 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const extension = driveMimeType.startsWith('video/') ? '.mp4' : '.jpg';
        const tempPath = path.join(tempDir, `${uuidv4()}-${driveName}${extension}`);
        const writer = fs.createWriteStream(tempPath);
        fileRes.data.pipe(writer);
        await new Promise((res) => writer.on('finish', res));

        const fakeFile = {
          path: tempPath,
          mimetype: driveMimeType,
          originalname: driveName,
          filename: path.basename(tempPath),
        };

        // Add to correct field in req.files
        req.files = req.files || {};
        const isDynamic = await axios
          .get(`https://graph.facebook.com/v21.0/${adSetId}`, {
            params: { access_token: token, fields: 'is_dynamic_creative' },
          })
          .then((r) => r.data.is_dynamic_creative);

        const fieldName = isDynamic ? 'mediaFiles' : 'imageFile';
        req.files[fieldName] = req.files[fieldName] || [];
        req.files[fieldName].push(fakeFile);
      }

      // Fetch ad set info again for dynamic logic
      const adSetInfoResponse = await axios.get(
        `https://graph.facebook.com/v21.0/${adSetId}`,
        {
          params: { access_token: token, fields: 'is_dynamic_creative' },
        }
      );
      const adSetDynamicCreative = adSetInfoResponse.data.is_dynamic_creative;
      const useDynamicCreative = adSetDynamicCreative;

      const adAccountSettings = await getAdAccountSettings(req.session.user.facebookId, adAccountId);
      const creativeEnhancements = adAccountSettings?.creativeEnhancements || {};
      const utmPairs = adAccountSettings?.defaultUTMs || [];
      const urlTags = buildUrlTagsFromPairs(utmPairs);

      let result;

      if (useDynamicCreative) {
        const mediaFiles = req.files.mediaFiles;
        if (!mediaFiles || mediaFiles.length === 0) {
          return res.status(400).json({ error: 'No media files received for dynamic creative' });
        }
        if (mediaFiles[0].mimetype.startsWith('video/')) {
          result = await handleDynamicVideoAd(
            req, token, adAccountId, adSetId, pageId, adName, cta, link,
            headlines, messagesArray, descriptionsArray,
            instagramAccountId, urlTags, creativeEnhancements
          );
        } else {
          result = await handleDynamicImageAd(
            req, token, adAccountId, adSetId, pageId, adName, cta, link,
            headlines, messagesArray, descriptionsArray,
            instagramAccountId, urlTags, creativeEnhancements
          );
        }
      } else {
        const file = req.files.imageFile && req.files.imageFile[0];
        if (!file) return res.status(400).json({ error: 'No image file received' });

        if (file.mimetype.startsWith('video/')) {
          result = await handleVideoAd(
            req, token, adAccountId, adSetId, pageId, adName, cta, link,
            headlines, messagesArray, descriptionsArray,
            false, instagramAccountId, urlTags, creativeEnhancements
          );
        } else {
          result = await handleImageAd(
            req, token, adAccountId, adSetId, pageId, adName, cta, link,
            headlines, messagesArray, descriptionsArray,
            false, instagramAccountId, urlTags, creativeEnhancements
          );
        }
      }

      return res.json(result);
    } catch (error) {
      console.error('Create Ad Error:', error.response?.data || error.message);
      cleanupUploadedFiles(req.files);
      const fbErrorMsg = error.response?.data?.error?.error_user_msg || error.message || 'Failed to create ad';
      return res.status(400).send(fbErrorMsg);
    }
  }
);


app.get('/auth/generate-ad-preview', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: 'User not authenticated' });

  const { adAccountId } = req.query;
  if (!adAccountId) return res.status(400).json({ error: 'Missing adAccountId' });

  try {
    const recentAds = await fetchRecentAds(adAccountId, token);
    //console.log(`🆕 Found ${recentAds.length} recent ads created in last 5 minutes`);
    recentAds.forEach(ad => {
      //console.log(`- Ad ID: ${ad.id}, Creative ID: ${ad.creative?.id || 'No creative'}`);
    });


    if (!recentAds.length) {
      return res.status(404).json({ error: "No recent ads found" });
    }

    const previews = [];

    for (const ad of recentAds) {
      if (!ad.creative?.id) {
        console.warn(`Ad ${ad.id} has no creative linked, skipping.`);
        continue;
      }

      try {
        const previewUrl = `https://graph.facebook.com/v22.0/${ad.creative.id}/previews`;
        //console.log(`📡 Making internal call to: ${previewUrl} with adAccountId=${adAccountId}`);
        const previewResponse = await axios.get(previewUrl, {
          params: {
            access_token: token,
            ad_format: 'MOBILE_FEED_STANDARD'
          }
        });

        const previewData = previewResponse.data.data?.[0];
        // console.log(`✅ Successfully fetched preview for Ad ID: ${ad.id}`);
        if (previewData) {
          // 🖼 Extract preview URL from previewData
          const match = previewData.body.match(/src="([^"]+)"/);
          if (match && match[1]) {
            const rawUrl = match[1];
            const cleanUrl = rawUrl.replace(/&amp;/g, "&");
            console.log(`🌐 Preview URL: ${cleanUrl}`);
          } else {
            console.warn(`⚠️ Could not extract preview URL for Ad ID ${ad.id}`);
          }

          previews.push({
            adId: ad.id,
            creativeId: ad.creative.id,
            previewHtml: previewData.body, // iframe HTML
          });
        }

      } catch (previewError) {
        console.error(`Preview generation failed for creative ${ad.creative.id}:`, previewError.response?.data || previewError.message);
        // Continue to next ad even if this preview fails
      }
    }

    res.json({ previews });
  } catch (error) {
    console.error('Generate Preview Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate previews' });
  }
});

app.get("/auth/fetch-recent-copy", async (req, res) => {
  const token = req.session.accessToken;
  const { adAccountId } = req.query;

  if (!token) return res.status(401).json({ error: "Not authenticated" });
  if (!adAccountId) return res.status(400).json({ error: "Missing adAccountId" });

  try {
    const url = `https://graph.facebook.com/v22.0/${adAccountId}/ads`;
    const response = await axios.get(url, {
      params: {
        access_token: token,
        fields: 'name,creative{asset_feed_spec}',
        limit: 5,
        sort: 'created_time_desc',
      },
    });

    const formattedAds = (response.data.data || [])
      .map(ad => {
        const spec = ad.creative?.asset_feed_spec;
        if (!spec) return null;

        return {
          adName: ad.name,
          primaryTexts: spec.bodies?.map(b => b.text) || [],
          headlines: spec.titles?.map(t => t.text) || [],
        };
      })
      .filter(Boolean);

    res.json({ ads: formattedAds });
  } catch (err) {
    console.error("Fetch recent copy error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch recent ad copy" });
  }
});






//fireBase routes
app.post("/settings/save", async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) return res.status(401).json({ error: "Not authenticated" });

  const { facebookId } = sessionUser;
  const { globalSettings, adAccountSettings, adAccountId } = req.body;

  try {
    if (globalSettings) {
      await saveGlobalSettings(facebookId, globalSettings);
    }
    if (adAccountSettings && adAccountId) {
      await saveAdAccountSettings(facebookId, adAccountId, adAccountSettings);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Settings save error:", err);
    return res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/settings/delete-template", async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) return res.status(401).json({ error: "Not authenticated" });

  const { adAccountId, templateName } = req.body;

  if (!adAccountId || !templateName) {
    return res.status(400).json({ error: "Missing adAccountId or templateName" });
  }

  try {
    await deleteCopyTemplate(sessionUser.facebookId, adAccountId, templateName);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete template error:", err);
    return res.status(500).json({ error: "Failed to delete template" });
  }
});


app.post("/auth/manual-login", async (req, res) => {
  const { username, password } = req.body;
  if (username !== STATIC_LOGIN.username || password !== STATIC_LOGIN.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  try {
    // Retrieve your Facebook-linked user
    const facebookId = "10236978990363167"; // replace with the actual Facebook ID in Firestore
    const userData = await getUserByFacebookId(facebookId);

    if (!userData) return res.status(404).json({ error: "User not found" });

    req.session.user = {
      name: userData.name,
      email: userData.email,
      facebookId,
      profilePicUrl: userData.picture?.data?.url || "",
    };
    req.session.accessToken = userData.accessToken;

    return res.json({ success: true });
  } catch (err) {
    console.error("Manual login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/meta-data-deletion', express.urlencoded({ extended: true }), (req, res) => {
  const signedRequest = req.body.signed_request;
  if (!signedRequest) {
    return res.status(400).json({ error: 'Missing signed_request' });
  }

  const [encodedSig, encodedPayload] = signedRequest.split('.');
  const sig = Buffer.from(encodedSig, 'base64');
  const payload = Buffer.from(encodedPayload, 'base64').toString();
  const data = JSON.parse(payload);

  const expectedSig = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(encodedPayload)
    .digest();

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const confirmationCode = crypto.randomUUID();

  // Optionally delete the user's data from Firestore:
  // await deleteUserData(data.user_id)

  return res.json({
    url: "https://withblip.com",
    confirmation_code: confirmationCode
  });
});


app.get("/settings/global", async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) return res.status(401).json({ error: "Not authenticated" });

  try {
    const settings = await getGlobalSettings(sessionUser.facebookId);
    res.json({ settings });
  } catch (err) {
    console.error("Global settings fetch error:", err);
    res.status(500).json({ error: "Failed to fetch global settings" });
  }
});


app.get("/settings/ad-account", async (req, res) => {
  const sessionUser = req.session.user;
  const { adAccountId } = req.query;
  if (!sessionUser) return res.status(401).json({ error: "Not authenticated" });
  if (!adAccountId) return res.status(400).json({ error: "Missing adAccountId" });

  try {
    const settings = await getAdAccountSettings(sessionUser.facebookId, adAccountId);
    const accessToken = req.session.accessToken;

    // ✅ Fresh fetch for FB Page picture
    if (settings?.defaultPage?.id) {
      try {
        const picRes = await axios.get(`https://graph.facebook.com/v21.0/${settings.defaultPage.id}/picture`, {
          params: {
            access_token: accessToken,
            redirect: false,
          },
        });
        settings.defaultPage.profilePicture = picRes.data?.data?.url || null;
      } catch (err) {
        console.warn("Failed to refresh FB page picture:", err.message);
      }
    }

    // ✅ Fresh fetch for IG profile picture
    if (settings?.defaultInstagram?.id) {
      try {
        const igRes = await axios.get(`https://graph.facebook.com/v22.0/${settings.defaultInstagram.id}`, {
          params: {
            access_token: accessToken,
            fields: 'username,profile_picture_url',
          },
        });
        settings.defaultInstagram.profilePictureUrl = igRes.data?.profile_picture_url || null;
      } catch (err) {
        console.warn("Failed to refresh IG profile picture:", err.message);
      }
    }

    res.json({ settings });
  } catch (err) {
    console.error("Ad account settings fetch error:", err);
    res.status(500).json({ error: "Failed to fetch ad account settings" });
  }
});


//to fetch ad previews
async function fetchRecentAds(adAccountId, token) {
  const url = `https://graph.facebook.com/v22.0/${adAccountId}/ads`;

  const fiveMinutesAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000); // 5 minutes ago, in Unix seconds

  const response = await axios.get(url, {
    params: {
      access_token: token,
      fields: 'id,creative,created_time',
      limit: 10,
      filtering: JSON.stringify([
        {
          field: "created_time",
          operator: "GREATER_THAN",
          value: fiveMinutesAgo
        }
      ])
    }
  });

  return response.data.data || [];
}


// Helper: Process multiple images for dynamic creative.
async function handleDynamicImageAd(req, token, adAccountId, adSetId, pageId, adName, cta, link, headlines, messagesArray, descriptionsArray, instagramAccountId, urlTags, creativeEnhancements) {
  const mediaFiles = req.files.mediaFiles;
  let imageHashes = [];
  for (const file of mediaFiles) {
    const uploadUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adimages`;
    const formData = new FormData();
    formData.append('access_token', token);
    formData.append('file', fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype
    });
    const uploadResponse = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders()
    });
    const imagesInfo = uploadResponse.data.images;
    const key = Object.keys(imagesInfo)[0];
    imageHashes.push({ hash: imagesInfo[key].hash });
    await fs.promises.unlink(file.path).catch(err => console.error("Error deleting image file:", err));
  }
  const assetFeedSpec = {
    images: imageHashes,
    titles: headlines.map(text => ({ text })),
    bodies: messagesArray.map(text => ({ text })),
    descriptions: descriptionsArray.map(text => ({ text })),
    ad_formats: ["SINGLE_IMAGE"],
    call_to_action_types: [cta],
    link_urls: [{ website_url: link }]
  };
  const creativePayload = {
    name: adName,
    adset_id: adSetId,
    creative: {
      object_story_spec: {
        page_id: pageId,
        ...(instagramAccountId && { instagram_user_id: instagramAccountId })
      },
      ...(urlTags && { url_tags: urlTags }),
      asset_feed_spec: assetFeedSpec,
      degrees_of_freedom_spec: {
        creative_features_spec: buildCreativeEnhancementsConfig(creativeEnhancements)

      }
    },
    status: 'ACTIVE'
  };

  const createAdUrl = `https://graph.facebook.com/v22.0/${adAccountId}/ads`;
  const createAdResponse = await retryWithBackoff(() =>
    axios.post(createAdUrl, creativePayload, {
      params: { access_token: token }
    })
  );

  return createAdResponse.data;
}


async function handleDynamicVideoAd(req, token, adAccountId, adSetId, pageId, adName, cta, link, headlines, messagesArray, descriptionsArray, instagramAccountId, urlTags, creativeEnhancements) {
  const mediaFiles = req.files.mediaFiles;
  const thumbFile = req.files.thumbnail?.[0];
  const fallbackThumbnailUrl = "https://meta-ad-uploader-server-production.up.railway.app/thumbnail.jpg";

  const videoAssets = [];

  for (let i = 0; i < mediaFiles.length; i++) {
    const file = mediaFiles[i];

    // Upload video
    const uploadVideoUrl = `https://graph.facebook.com/v21.0/${adAccountId}/advideos`;
    const videoFormData = new FormData();
    videoFormData.append('access_token', token);
    videoFormData.append('source', fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype
    });

    const videoUploadResponse = await axios.post(uploadVideoUrl, videoFormData, {
      headers: videoFormData.getHeaders()
    });

    const videoId = videoUploadResponse.data.id;
    await waitForVideoProcessing(videoId, token);

    let thumbnailSource = {};

    if (thumbFile) {
      const thumbFormData = new FormData();
      thumbFormData.append('access_token', token);
      thumbFormData.append('file', fs.createReadStream(thumbFile.path), {
        filename: thumbFile.originalname,
        contentType: thumbFile.mimetype
      });

      const thumbUploadUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adimages`;
      const thumbUploadResponse = await axios.post(thumbUploadUrl, thumbFormData, {
        headers: thumbFormData.getHeaders()
      });

      const imagesInfo = thumbUploadResponse.data.images;
      const key = Object.keys(imagesInfo)[0];
      thumbnailSource = { thumbnail_hash: imagesInfo[key].hash };
    }


    else {
      thumbnailSource = { thumbnail_url: fallbackThumbnailUrl };
    }

    videoAssets.push({
      video_id: videoId,
      ...thumbnailSource
    });

    await fs.promises.unlink(file.path).catch(err => console.error("Error deleting video file:", err));
  }

  if (thumbFile) {
    await fs.promises.unlink(thumbFile.path).catch(err => console.error("Error deleting thumbnail file:", err));
  }

  const assetFeedSpec = {
    videos: videoAssets,
    titles: headlines.map(text => ({ text })),
    bodies: messagesArray.map(text => ({ text })),
    descriptions: descriptionsArray.map(text => ({ text })),
    ad_formats: ["SINGLE_VIDEO"],
    call_to_action_types: [cta],
    link_urls: [{ website_url: link }]
  };

  const creativePayload = {
    name: adName,
    adset_id: adSetId,
    creative: {
      object_story_spec: {
        page_id: pageId,
        ...(instagramAccountId && { instagram_user_id: instagramAccountId })
      },
      ...(urlTags && { url_tags: urlTags }),
      asset_feed_spec: assetFeedSpec,
      degrees_of_freedom_spec: {
        creative_features_spec: buildCreativeEnhancementsConfig(creativeEnhancements)

      }
    },
    status: 'ACTIVE'
  };

  const createAdUrl = `https://graph.facebook.com/v22.0/${adAccountId}/ads`;
  const createAdResponse = await axios.post(createAdUrl, creativePayload, { params: { access_token: token } });
  return createAdResponse.data;
}



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  try {
    await redisClient.quit();
    console.log('Redis client disconnected');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});