// src/components/settings/PageSelectors.jsx

import { useState } from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown, RefreshCcw } from "lucide-react"
import { useAppData } from "@/lib/AppContext"
import { toast } from "sonner";


export default function PageSelectors({
  selectedPage,
  setSelectedPage,
  selectedInstagram,
  setSelectedInstagram,

}) {
  const { pages, setPages } = useAppData()

  //  const [selectedPage, setSelectedPage] = useState(null)
  const [openPageDropdown, setOpenPageDropdown] = useState(false)

  //const [selectedInstagram, setSelectedInstagram] = useState(null)
  const [openInstagramDropdown, setOpenInstagramDropdown] = useState(false)
  const [pageSearch, setPageSearch] = useState("")
  const [instagramSearch, setInstagramSearch] = useState("")


  const refreshPages = async () => {
    try {
      const res = await fetch("https://api.withblip.com/auth/fetch-pages", {
        credentials: "include"
      });

      const data = await res.json();

      if (data.pages) {
        setPages(data.pages);

        const updatedPage = data.pages.find(p => p.id === selectedPage?.id);
        const updatedInstagram = data.pages
          .find(p => p.instagramAccount?.id === selectedInstagram?.id)
          ?.instagramAccount;

        if (updatedPage) setSelectedPage(updatedPage);
        else setSelectedPage(null);

        if (updatedInstagram) setSelectedInstagram(updatedInstagram);
        else setSelectedInstagram(null);

        toast.success("Pages refreshed successfully!");
      } else {
        toast.error("No pages returned.");
      }
    } catch (err) {
      toast.error(`Failed to fetch pages: ${err.message || "Unknown error"}`);
      console.error("Failed to fetch pages:", err);
    }
  };


  return (
    <div className="bg-[#f5f5f5] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <img
            src="https://api.withblip.com/icons/meta.svg"
            alt="Default FB Page Icon"
            className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60"
          />
          <label className="text-sm text-zinc-950 block font-medium">
            Default Linked Facebook and Instagram page
          </label>
        </div>
        <RefreshCcw
          className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
          onClick={refreshPages}
        />
      </div>


      <div className="space-y-4">
        {/* Facebook Page Dropdown */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Facebook Page</label>
          <Popover open={openPageDropdown} onOpenChange={setOpenPageDropdown}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between border border-gray-300 rounded-xl bg-white shadow-sm flex items-center hover:bg-white pl-3"
              >
                <div className="flex items-center gap-2">
                  {selectedPage?.name && (
                    <img
                      src={
                        selectedPage.profilePicture ||
                        "https://api.withblip.com/backup_page_image.png"
                      }
                      alt="Page"
                      className="w-5 h-5 rounded-full object-cover border border-gray-300"
                    />
                  )}
                  <span>{selectedPage?.name || "Select Facebook Page"}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-[--radix-popover-trigger-width] p-0 rounded-xl bg-white" align="start">
              <Command filter={() => 1} loop={false}>
                <CommandInput
                  placeholder="Search pages..."
                  value={pageSearch}
                  onValueChange={setPageSearch}
                  className="bg-white"
                />
                <CommandList className="max-h-[300px] overflow-y-auto rounded-xl">
                  {pages
                    .filter((page) =>
                      (page.name?.toLowerCase() || "").includes(pageSearch.toLowerCase())
                    )
                    .map((page) => (
                      <CommandItem
                        key={page.id}
                        value={page.id}
                        onSelect={() => {
                          setSelectedPage(page)
                          setOpenPageDropdown(false)
                          if (page.instagramAccount?.id) {
                            setSelectedInstagram(page.instagramAccount)
                          } else {
                            setSelectedInstagram(null)
                          }
                        }}
                        className="px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150 hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={page.profilePicture}
                            alt={page.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span>{page.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

        </div>

        {/* Instagram Dropdown */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Instagram Account</label>
          <Popover open={openInstagramDropdown} onOpenChange={setOpenInstagramDropdown}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between border border-gray-300 rounded-xl bg-white shadow-sm flex items-center hover:bg-white pl-3"
              >
                <div className="flex items-center gap-2">
                  {selectedInstagram?.profilePictureUrl && (
                    <img
                      src={
                        selectedInstagram.profilePictureUrl ||
                        "https://api.withblip.com/backup_page_image.png"
                      }
                      alt={`${selectedInstagram?.username || "Instagram"} profile`}
                      className="w-6 h-6 rounded-full object-cover border border-gray-300"
                    />
                  )}
                  <span>{selectedInstagram?.username || "Select Instagram Account"}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-[--radix-popover-trigger-width] p-0 rounded-xl bg-white" align="start">
              <Command filter={() => 1} loop={false}>
                <CommandInput
                  placeholder="Search IG accounts..."
                  value={instagramSearch}
                  onValueChange={setInstagramSearch}
                  className="bg-white"
                />
                <CommandList className="max-h-[300px] overflow-y-auto rounded-xl">
                  {pages
                    .filter((p) =>
                      p.instagramAccount?.username
                        ?.toLowerCase()
                        .includes(instagramSearch.toLowerCase())
                    )
                    .map((page) => (
                      <CommandItem
                        key={page.instagramAccount.id}
                        value={page.instagramAccount.id}
                        onSelect={() => {
                          setSelectedInstagram(page.instagramAccount)
                          setOpenInstagramDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150 hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              page.instagramAccount.profilePictureUrl ||
                              "https://api.withblip.com/backup_page_image.png"
                            }
                            alt={page.instagramAccount.username}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span>{page.instagramAccount.username}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

        </div>
      </div>
    </div>
  )
}
