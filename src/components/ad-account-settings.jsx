"use client"

import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, ChevronsUpDown, RefreshCcw, X } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAuth } from "@/lib/AuthContext"
import { useEffect } from "react"
import { Input } from "@/components/ui/input"




export default function AdAccountSettings({
  //isLoggedIn,
  isLoading,
  setIsLoading,
  adAccounts,
  setAdAccounts,
  selectedAdAccount,
  setSelectedAdAccount,
  //setAdSetDestinationType,
  campaigns,
  setCampaigns,
  selectedCampaign,
  setSelectedCampaign,
  adSets,
  setAdSets,
  selectedAdSets,
  setSelectedAdSets,
  showDuplicateBlock,
  setShowDuplicateBlock,
  duplicateAdSet,
  setDuplicateAdSet,
  setCampaignObjective,
  newAdSetName,
  setNewAdSetName,
}) {
  // Local state for comboboxes
  const { isLoggedIn } = useAuth()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [openCampaign, setOpenCampaign] = useState(false)
  const [campaignSearchValue, setCampaignSearchValue] = useState("")
  const [adSetSearchValue, setAdSetSearchValue] = useState("")
  const [openAdSet, setOpenAdSet] = useState(false)
  const [openDuplicateAdSet, setOpenDuplicateAdSet] = useState(false)
  const [duplicateAdSetSearchValue, setDuplicateAdSetSearchValue] = useState("")
  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);
  //console.log("🔍 selectedCampaignData", selectedCampaignData);

  const isAdvantagePlusCampaign = ["AUTOMATED_SHOPPING_ADS", "SMART_APP_PROMOTION"].includes(
    selectedCampaignData?.smart_promotion_type
  );
  //console.log("🛑 isAdvantagePlusCampaign:", isAdvantagePlusCampaign);


  const sortCampaigns = (campaigns) => {
    const priority = { ACTIVE: 1, PAUSED: 2 };

    return [...campaigns].sort((a, b) => {
      const aPriority = priority[a.status] || 3;
      const bPriority = priority[b.status] || 3;

      if (aPriority !== bPriority) return aPriority - bPriority;

      if (a.status === "ACTIVE" && b.status === "ACTIVE") {
        const parseSpend = (camp) => {
          const spend = parseFloat(camp.spend);
          const safeSpend = isNaN(spend) ? 0 : spend;
          return safeSpend;
        };

        const aSpend = parseSpend(a);
        const bSpend = parseSpend(b);
        return bSpend - aSpend;
      }

      return 0;
    });
  };

  const sortAdSets = (adSets) => {
    const priority = { ACTIVE: 1, PAUSED: 2 };
    return [...adSets].sort((a, b) => {
      const aPriority = priority[a.status] || 3;
      const bPriority = priority[b.status] || 3;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aSpend = parseFloat(a.spend || 0);
      const bSpend = parseFloat(b.spend || 0);
      return bSpend - aSpend;
    });
  };




  const handleAdAccountChange = async (value) => {
    const adAccountId = value
    setSelectedAdAccount(adAccountId)
    setCampaigns([])
    setAdSets([])
    setSelectedCampaign("")
    setSelectedAdSets([])
    if (!adAccountId) return

    setIsLoading(true)
    try {
      const res = await fetch(
        `https://api.withblip.com/auth/fetch-campaigns?adAccountId=${adAccountId}`,
        { credentials: "include" },
      )
      const data = await res.json()
      if (data.campaigns) {
        const priority = {
          ACTIVE: 1,
          PAUSED: 2,
        }

        const sortedCampaigns = sortCampaigns(data.campaigns);
        //console.log("📦 Fetched campaigns from server:", data.campaigns);
        setCampaigns(sortedCampaigns);
        //console.log("🧠 setCampaigns with:", sortedCampaigns);


      }
    } catch (err) {
      toast.error(`Failed to fetch campaigns: ${err.message || "Unknown error occurred"}`)
      console.error("Failed to fetch campaigns:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCampaignChange = async (value) => {
    const campaignId = value
    setSelectedCampaign(campaignId)
    setAdSets([])
    setSelectedAdSets([])
    setShowDuplicateBlock(false)
    setDuplicateAdSet("")
    setNewAdSetName("") // Add this line
    if (!campaignId) {
      setCampaignObjective("")
      return
    }

    const selectedCampaignObj = campaigns.find((camp) => camp.id === campaignId)
    if (selectedCampaignObj) {
      setCampaignObjective(selectedCampaignObj.objective)
    } else {
      setCampaignObjective("")
    }

    setIsLoading(true)
    try {
      const res = await fetch(
        `https://api.withblip.com/auth/fetch-adsets?campaignId=${campaignId}`,
        { credentials: "include" },
      )
      const data = await res.json()
      if (data.adSets) {
        setAdSets(sortAdSets(data.adSets))
      }
    } catch (err) {
      toast.error(`Failed to fetch ad sets: ${err.message || "Unknown error occurred"}`)
      console.error("Failed to fetch ad sets:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdSetCheckboxChange = (adsetId, checked) => {
    if (checked) {
      setSelectedAdSets((prev) => [...prev, adsetId])
      // If selecting an ad set, we should hide the duplicate block
      if (showDuplicateBlock) {
        setShowDuplicateBlock(false)
        setDuplicateAdSet("")
        setNewAdSetName("") // Add this line
      }
    } else {
      setSelectedAdSets((prev) => prev.filter((id) => id !== adsetId))
    }
  }

  // Refresh functions
  const refreshAdAccounts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("https://api.withblip.com/auth/fetch-ad-accounts", {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success && data.adAccounts) {
        setAdAccounts(data.adAccounts)
        toast.success("Ad accounts refreshed successfully!")
      }
    } catch (err) {
      toast.error(`Failed to fetch ad accounts: ${err.message || "Unknown error"}`)
      console.error("Failed to fetch ad accounts:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCampaigns = async () => {
    if (!selectedAdAccount) return;
    setIsLoading(true);

    try {
      const res = await fetch(
        `https://api.withblip.com/auth/fetch-campaigns?adAccountId=${selectedAdAccount}`,
        { credentials: "include" }
      );

      const data = await res.json();

      if (data.campaigns) {
        setCampaigns(sortCampaigns(data.campaigns));
        toast.success("Campaigns refreshed successfully!");
      } else {
        toast.error("No campaigns returned.");
      }
    } catch (err) {
      toast.error(`Failed to fetch campaigns: ${err.message || "Unknown error"}`);
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const refreshAdSets = async () => {
    if (!selectedCampaign) return
    setIsLoading(true)
    try {
      const res = await fetch(
        `https://api.withblip.com/auth/fetch-adsets?campaignId=${selectedCampaign}`,
        { credentials: "include" },
      )
      const data = await res.json()
      if (data.adSets) {
        setAdSets(sortAdSets(data.adSets))
        toast.success("Ad Sets refreshed successfully!")
      }
    } catch (err) {
      toast.error(`Failed to fetch ad sets: ${err.message || "Unknown error"}`)
      console.error("Failed to fetch ad sets:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered data for comboboxes
  const filteredAccounts = adAccounts.filter((acct) =>
    (acct.name?.toLowerCase() || acct.id.toLowerCase()).includes(searchValue.toLowerCase()),
  )

  const filteredCampaigns = campaigns.filter((camp) =>
    (camp.name?.toLowerCase() || camp.id.toLowerCase()).includes(campaignSearchValue.toLowerCase()),
  )

  const filteredAdSets = adSets.filter((adset) =>
    (adset.name || adset.id).toLowerCase().includes(adSetSearchValue.toLowerCase()),
  )



  // Auto-populate new ad set name when duplicate ad set is selected
  useEffect(() => {
    if (duplicateAdSet) {
      const selectedAdSet = adSets.find((adset) => adset.id === duplicateAdSet)
      if (selectedAdSet) {
        setNewAdSetName(selectedAdSet.name + "_02")
      }
    } else {
      setNewAdSetName("")
    }
  }, [duplicateAdSet, adSets, setNewAdSetName])

  return (
    <Card className="!bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img src="https://unpkg.com/@mynaui/icons/icons/cog-four.svg" className="w-5 h-5" />
          Ad Account Configuration</CardTitle>
        <CardDescription>Select your ad account, campaign and ad set</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="adAccount" className="flex items-center gap-2">
                <img src="https://unpkg.com/@mynaui/icons/icons/user-circle.svg" className="w-4 h-4" />
                Ad Account</Label>
              <RefreshCcw
                className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={refreshAdAccounts}
              />
            </div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={!isLoggedIn || isLoading}
                  className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white"
                >
                  {selectedAdAccount
                    ? adAccounts.find((acct) => acct.id === selectedAdAccount)?.name || selectedAdAccount
                    : "Select an Ad Account"}
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
                  maxWidth: "none",
                }}
              >
                <Command
                  filter={(value, search) => {
                    return 1
                  }}
                  loop={false}
                  defaultValue={selectedAdAccount}
                >
                  <CommandInput
                    placeholder="Search ad accounts..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandEmpty>No ad account found.</CommandEmpty>
                  <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                    <CommandGroup>
                      {filteredAccounts.length > 0 ? (
                        filteredAccounts.map((acct) => (
                          <CommandItem
                            key={acct.id}
                            value={acct.id}
                            onSelect={() => {
                              handleAdAccountChange(acct.id)
                              setOpen(false)
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                              "data-[selected=true]:bg-gray-100",
                              selectedAdAccount === acct.id && "bg-gray-100 rounded-xl font-semibold",
                              "hover:bg-gray-100",
                            )}
                            data-selected={acct.id === selectedAdAccount}
                          >
                            {acct.name || acct.id}
                          </CommandItem>
                        ))
                      ) : (
                        <CommandItem disabled className="opacity-50 cursor-not-allowed">
                          No ad account found.
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>

              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="campaign" className="flex items-center gap-2">
                <img src="https://unpkg.com/@mynaui/icons/icons/folder.svg" className="w-4 h-4" />
                Select a Campaign to launch Ads in
              </Label>
              <RefreshCcw
                className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={refreshCampaigns}
              />
            </div>
            <Popover open={openCampaign} onOpenChange={setOpenCampaign}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCampaign}
                  disabled={!isLoggedIn || !selectedAdAccount || isLoading}
                  id="campaign"
                  className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white "
                >
                  {selectedCampaign
                    ? campaigns.find((camp) => camp.id === selectedCampaign)?.name || selectedCampaign
                    : "Select a Campaign"}
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
                  maxWidth: "none",
                }}
              >
                <Command filter={() => 1} loop={false} defaultValue={selectedCampaign}>
                  <CommandInput
                    placeholder="Search campaigns..."
                    value={campaignSearchValue}
                    onValueChange={setCampaignSearchValue}
                  />
                  <CommandEmpty>No campaign found.</CommandEmpty>
                  <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar pb-1" selectOnFocus={false}>
                    <CommandGroup>
                      {filteredCampaigns.length > 0 ? (
                        filteredCampaigns.map((camp) => (
                          <CommandItem
                            key={camp.id}
                            value={camp.id}
                            onSelect={() => {
                              handleCampaignChange(camp.id)
                              setOpenCampaign(false)
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                              "data-[selected=true]:bg-gray-100",
                              selectedCampaign === camp.id && "bg-gray-100 rounded-xl font-semibold",
                              "hover:bg-gray-100",
                              "flex justify-between items-center"
                            )}
                            data-selected={camp.id === selectedCampaign}
                          >
                            <span className={camp.status !== "ACTIVE" ? "text-gray-400" : ""}>
                              {camp.name || camp.id}
                            </span>
                            {camp.status === "ACTIVE" && (
                              <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                            )}
                          </CommandItem>
                        ))
                      ) : (
                        <CommandItem disabled className="opacity-50 cursor-not-allowed">
                          No campaign found.
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 ">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <img src="https://unpkg.com/@mynaui/icons/icons/grid.svg" className="w-4 h-4" />
                Launch in a new or existing ad set
              </Label>
              <RefreshCcw
                className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={refreshAdSets}
              />
            </div>
            <Popover open={openAdSet} onOpenChange={setOpenAdSet}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openAdSet}
                  disabled={!isLoggedIn || adSets.length === 0}
                  className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white"
                >
                  {showDuplicateBlock
                    ? "New Ad Set"
                    : selectedAdSets.length > 0
                      ? `${selectedAdSets.length} AdSet${selectedAdSets.length > 1 ? "s" : ""} selected`
                      : "Select Ad Sets"}

                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
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
                  maxWidth: "none",
                }}
              >
                <Command loop={false}>
                  <CommandInput
                    placeholder="Search AdSets..."
                    value={adSetSearchValue}
                    onValueChange={setAdSetSearchValue}
                  />
                  <CommandEmpty>No ad sets found.</CommandEmpty>
                  <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar px-2" selectOnFocus={false}>
                    <CommandGroup>
                      {!isAdvantagePlusCampaign && (
                        <CommandItem
                          key="create-new-adset"
                          value="create-new-adset"
                          onSelect={() => {
                            setShowDuplicateBlock(true)
                            setSelectedAdSets([]) // Clear any selected ad sets when choosing to create a new one
                            setOpenAdSet(false)
                          }}
                          className={`
                            h-10 w-full px-4 py-3 m-1 rounded-xl 
                            !bg-zinc-700 !text-white shadow-md 
                            flex items-center justify-center 
                            text-sm font-semibold cursor-pointer 
                            transition-all duration-150 hover:!bg-black
                          `}
                        >
                          🚀 Launch in a New Ad Set
                        </CommandItem>
                      )}
                    </CommandGroup>
                    <CommandGroup heading="Launch in an existing ad set">
                      {filteredAdSets.length > 0 ? (
                        filteredAdSets.map((adset) => {
                          const isSelected = selectedAdSets.includes(adset.id)
                          return (
                            <CommandItem
                              key={adset.id}
                              value={adset.name || adset.id} // Helps with filtering
                              onSelect={() => handleAdSetCheckboxChange(adset.id, !isSelected)}
                              className={cn(
                                "py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                isSelected ? "bg-gray-100 hover:!bg-gray-100 font-semibold" : "hover:!bg-gray-200",
                              )}
                            >
                              <div className="flex items-center space-x-2 w-full">
                                <Checkbox
                                  id={`adset-${adset.id}`}
                                  checked={isSelected}
                                  className="p-0 w-4 h-4 aspect-square bg-white border border-gray-300 rounded-[6px]"
                                >
                                  <Checkbox.Indicator>
                                    <Check className="w-3 h-3 text-green-500" />
                                  </Checkbox.Indicator>
                                </Checkbox>
                                <Label className={cn("flex-1 cursor-pointer flex items-center justify-between", adset.status !== "ACTIVE" && "text-gray-400")}>
                                  <span className="truncate leading-[1.25]">{adset.name || adset.id}</span>
                                  {adset.status === "ACTIVE" && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                                  )}
                                </Label>

                              </div>
                            </CommandItem>
                          )
                        })
                      ) : (
                        <CommandItem disabled className="opacity-50 cursor-not-allowed">
                          No AdSets found.
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {showDuplicateBlock && (
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateBlock(false)
                    setDuplicateAdSet("")
                    setNewAdSetName("") // Add this line
                  }}
                  className="absolute top-2 right-2 p-0.5 rounded-full !bg-white border border-gray-200 hover:bg-gray-50"
                  aria-label="Close duplicate ad set selection"
                >
                  <X className="h-3 w-3 text-gray-700" />
                </button>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="duplicateAdSet" className="flex items-center gap-2" >
                    <img src="https://unpkg.com/@mynaui/icons/icons/copy.svg" className="w-4 h-4" />
                    Select an ad set shell to duplicate
                  </Label>
                  <Label className="text-gray-500 text-[12px] font-regular">We’ll retain all targeting settings and replace the creative</Label>

                  <Popover open={openDuplicateAdSet} onOpenChange={setOpenDuplicateAdSet}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDuplicateAdSet}
                        disabled={!isLoggedIn || adSets.length === 0}
                        className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow overflow-hidden whitespace-nowrap hover:!bg-white"
                      >
                        <div className="w-full overflow-hidden">
                          <span className="block truncate flex-1 text-left">
                            {duplicateAdSet
                              ? adSets.find((adset) => adset.id === duplicateAdSet)?.name || duplicateAdSet
                              : "Select existing ad set"}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
                      align="start"
                      sideOffset={4}
                      side="bottom"
                      avoidCollisions={false}
                      style={{
                        minWidth: "var(--radix-popover-trigger-width)",
                        width: "auto",
                        maxWidth: "none",
                      }}
                    >
                      <Command loop={false}>
                        <CommandInput
                          placeholder="Search ad set..."
                          value={duplicateAdSetSearchValue}
                          onValueChange={setDuplicateAdSetSearchValue}
                        />
                        <CommandEmpty>No ad sets found.</CommandEmpty>
                        <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                          <CommandGroup>
                            {adSets
                              .filter((adset) =>
                                (adset.name || adset.id).toLowerCase().includes(duplicateAdSetSearchValue.toLowerCase())
                              )
                              .map((adset) => (
                                <CommandItem
                                  key={adset.id}
                                  value={adset.name || adset.id}
                                  onSelect={() => {
                                    setDuplicateAdSet(adset.id)
                                    setOpenDuplicateAdSet(false)
                                  }}
                                  className={cn(
                                    "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                    adset.status !== "ACTIVE" && "text-gray-400"
                                  )}
                                >
                                  <div className="flex justify-between items-center w-full truncate">
                                    <span className="truncate">{adset.name || adset.id}</span>
                                    {adset.status === "ACTIVE" && (
                                      <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>

                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {/* New Ad Set Name Input */}
                  {duplicateAdSet && (
                    <div className="space-y-2" style={{ marginTop: '20px' }}>
                      <Label htmlFor="newAdSetName" className="block">
                        New ad set name
                      </Label>
                      <Label className="text-gray-500 text-[12px] font-regular">
                        Enter a custom name for the duplicated ad set
                      </Label>
                      <Input
                        id="newAdSetName"
                        value={newAdSetName}
                        onChange={(e) => setNewAdSetName(e.target.value)}
                        placeholder="Enter new ad set name..."
                        className="border border-gray-400 rounded-xl bg-white shadow"
                        disabled={!isLoggedIn}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedAdSets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAdSets.map((id) => {
                  const adset = adSets.find((a) => a.id === id)
                  return (
                    <label
                      key={id}
                      className="inline-flex items-center gap-2 bg-white rounded-xl border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <Checkbox
                        id={`selected-adset-${id}`}
                        checked={true}
                        onCheckedChange={() => handleAdSetCheckboxChange(id, false)}
                        className="w-4 h-4 p-0 bg-white border border-gray-300 rounded-xl"
                      >
                        <Checkbox.Indicator className="flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-500" />
                        </Checkbox.Indicator>
                      </Checkbox>
                      <span className="text-gray-800 text-xs">{adset ? adset.name : id}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

