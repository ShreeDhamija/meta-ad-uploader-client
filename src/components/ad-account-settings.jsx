"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, ChevronsUpDown, RefreshCcw, X, Loader, AlertTriangle } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAuth } from "@/lib/AuthContext"
import { Input } from "@/components/ui/input"
import CogIcon from '@/assets/icons/cog.svg?react';
import AdAccountIcon from '@/assets/icons/adaccount.svg?react';
import CampaignIcon from '@/assets/icons/folder.svg?react';
import AdSetIcon from '@/assets/icons/grid.svg?react';
import CopyIcon from '@/assets/icons/copy.svg?react';
import { useNavigate } from "react-router-dom"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


// Add constant
const ADVANTAGE_PLUS_TYPES = ["AUTOMATED_SHOPPING_ADS", "SMART_APP_PROMOTION"];

export default function AdAccountSettings({

  isLoading,
  setIsLoading,
  isLoadingAdSets,
  adAccounts,
  setAdAccounts,
  selectedAdAccount,
  setSelectedAdAccount,
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
  campaignObjective,
  setCampaignObjective,
  newAdSetName,
  setNewAdSetName,
  showDuplicateCampaignBlock,
  setShowDuplicateCampaignBlock,
  duplicateCampaign,
  setDuplicateCampaign,
  newCampaignName,
  setNewCampaignName,
  documentExists,
  refreshAdSets,
  sortAdSets,
  sortCampaigns

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
  const [openDuplicateCampaign, setOpenDuplicateCampaign] = useState(false)
  const [duplicateCampaignSearchValue, setDuplicateCampaignSearchValue] = useState("")
  const [isAdAccountChanging, setIsAdAccountChanging] = useState(false);
  const navigate = useNavigate()
  const [isLoadingAdAccounts, setIsLoadingAdAccounts] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);



  const selectedCampaignData = useMemo(() =>
    campaigns.filter(c => selectedCampaign.includes(c.id)),
    [campaigns, selectedCampaign]
  );

  const isAdvantagePlusCampaign = useMemo(() =>
    ADVANTAGE_PLUS_TYPES.includes(selectedCampaignData?.smart_promotion_type),
    [selectedCampaignData?.smart_promotion_type]
  );


  const filteredAccounts = useMemo(() =>
    adAccounts.filter((acct) =>
      (acct.name?.toLowerCase() || acct.id.toLowerCase()).includes(searchValue.toLowerCase())
    ),
    [adAccounts, searchValue]
  );

  const filteredCampaigns = useMemo(() =>
    campaigns.filter((camp) =>
      (camp.name?.toLowerCase() || camp.id.toLowerCase()).includes(campaignSearchValue.toLowerCase())
    ),
    [campaigns, campaignSearchValue]
  );

  const filteredAdSets = useMemo(() =>
    adSets.filter((adset) =>
      (adset.name || adset.id).toLowerCase().includes(adSetSearchValue.toLowerCase())
    ),
    [adSets, adSetSearchValue]
  );


  const handleAdAccountChange = useCallback(async (value) => {
    const adAccountId = value
    setSelectedAdAccount(adAccountId)
    setCampaigns([])
    setAdSets([])
    // setSelectedCampaign("")
    setSelectedCampaign([])
    setSelectedAdSets([])
    if (!adAccountId) return

    setIsAdAccountChanging(true);
    setIsLoading(true)
    try {
      const res = await fetch(
        `${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${adAccountId}`,
        { credentials: "include" },
      )
      const data = await res.json()
      if (data.campaigns) {
        const priority = {
          ACTIVE: 1,
          PAUSED: 2,
        }

        const sortedCampaigns = sortCampaigns(data.campaigns);
        setCampaigns(sortedCampaigns);



      }
    } catch (err) {
      toast.error(`Failed to fetch campaigns: ${err.message || "Unknown error occurred"}`)
      console.error("Failed to fetch campaigns:", err)
    } finally {
      setIsLoading(false)
      setIsAdAccountChanging(false);
    }
  });


  const handleCampaignChange = useCallback(async (campaignId) => {
    // Toggle campaign selection
    const isSelected = selectedCampaign.includes(campaignId);
    let newSelectedCampaigns;

    if (isSelected) {
      newSelectedCampaigns = selectedCampaign.filter(id => id !== campaignId);
    } else {
      newSelectedCampaigns = [...selectedCampaign, campaignId];
    }

    setSelectedCampaign(newSelectedCampaigns);
    setSelectedAdSets([]);
    setShowDuplicateBlock(false);
    setDuplicateAdSet("");
    setNewAdSetName("");
    setShowDuplicateCampaignBlock(false);
    setDuplicateCampaign("");
    setNewCampaignName("");

    if (newSelectedCampaigns.length === 0) {
      setCampaignObjective([]);
      setAdSets([]);
      return;
    }

    // Update campaign objectives
    const objectives = newSelectedCampaigns.map(id => {
      const campaign = campaigns.find(c => c.id === id);
      return campaign?.objective || "";
    }).filter(Boolean);
    setCampaignObjective(objectives);

    // Fetch adsets from all selected campaigns
    setIsLoading(true);
    try {
      const adSetPromises = newSelectedCampaigns.map(id =>
        fetch(`${API_BASE_URL}/auth/fetch-adsets?campaignId=${id}`, {
          credentials: "include"
        }).then(res => res.json())
      );

      const results = await Promise.all(adSetPromises);

      // Combine adsets from all campaigns with campaign info
      const allAdSets = results.flatMap((data, index) => {
        if (data.adSets) {
          return data.adSets.map(adset => ({
            ...adset,
            campaignId: newSelectedCampaigns[index],
            campaignName: campaigns.find(c => c.id === newSelectedCampaigns[index])?.name
          }));
        }
        return [];
      });

      setAdSets(sortAdSets(allAdSets));
    } catch (err) {
      toast.error(`Failed to fetch ad sets: ${err.message || "Unknown error occurred"}`);
      console.error("Failed to fetch ad sets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCampaign, campaigns, sortAdSets]);

  const handleAdSetCheckboxChange = useCallback((adsetId, checked) => {
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
  });

  // Refresh functions
  const refreshAdAccounts = useCallback(async () => {
    setIsLoading(true)
    setIsLoadingAdAccounts(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/fetch-ad-accounts`, {
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
      setIsLoadingAdAccounts(false)
    }
  });

  const refreshCampaigns = useCallback(async () => {
    if (!selectedAdAccount) return;
    setIsLoading(true);
    setIsLoadingCampaigns(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${selectedAdAccount}`,
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
      setIsLoadingCampaigns(false);

    }
  });



  const duplicateCampaignFunction = useCallback(async () => {
    if (!duplicateCampaign || !selectedAdAccount) {
      toast.error("Please select a campaign to duplicate");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/duplicate-campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          campaignId: duplicateCampaign,
          adAccountId: selectedAdAccount,
          newCampaignName: newCampaignName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Campaign duplicated successfully!");

        // Reset the duplicate campaign block
        setShowDuplicateCampaignBlock(false);
        setDuplicateCampaign("");
        setNewCampaignName("");

        // Refresh campaigns to show the new one
        await refreshCampaigns();

        // Select the newly created campaign
        setSelectedCampaign([data.copied_campaign_id]);
        // Clear ad sets since we're switching to a new campaign
        setAdSets([]);
        setSelectedAdSets([]);

        // Fetch ad sets for the new campaign
        try {
          const res = await fetch(
            `${API_BASE_URL}/auth/fetch-adsets?campaignId=${data.copied_campaign_id}`,
            { credentials: "include" },
          );
          const adsetData = await res.json();
          if (adsetData.adSets) {
            setAdSets(sortAdSets(adsetData.adSets));
          }
        } catch (adsetErr) {
          console.error("Failed to fetch ad sets for new campaign:", adsetErr);
          // Don't show error toast here as the main operation succeeded
        }

      } else {
        toast.error(data.error || "Failed to duplicate campaign");
      }
    } catch (error) {
      console.error("Error duplicating campaign:", error);
      toast.error("Failed to duplicate campaign");
    } finally {
      setIsLoading(false);
    }
  });

  // Auto-populate new ad set name when duplicate ad set is selected
  useEffect(() => {
    if (duplicateAdSet) {
      const selectedAdSet = adSets.find((adset) => adset.id === duplicateAdSet)
      if (selectedAdSet) {
        setNewAdSetName(selectedAdSet.name + "_Copy")
      }
    } else {
      setNewAdSetName("")
    }
  }, [duplicateAdSet, adSets, setNewAdSetName])

  // Auto-populate new campaign name when duplicate campaign is selected
  useEffect(() => {
    if (duplicateCampaign) {
      const selectedCampaign = campaigns.find((campaign) => campaign.id === duplicateCampaign);
      if (selectedCampaign) {
        setNewCampaignName(selectedCampaign.name + "_Copy");
      }
    } else {
      setNewCampaignName("");
    }
  }, [duplicateCampaign, campaigns]);

  const selectedDynamicAdSets = useMemo(() =>
    selectedAdSets
      .map(id => adSets.find(a => a.id === id))
      .filter(adset => adset?.is_dynamic_creative),
    [selectedAdSets, adSets]
  );

  // Add this useEffect hook after your existing useEffect hooks

  useEffect(() => {
    // Auto-select ad account if only one exists and none is currently selected
    if (adAccounts.length === 1 && !selectedAdAccount && !isLoading) {
      const singleAdAccount = adAccounts[0];
      handleAdAccountChange(singleAdAccount.id);
    }
  }, [adAccounts, selectedAdAccount, isLoading, handleAdAccountChange]);


  return (

    <Card className="!bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CogIcon className="w-5 h-5" />
          Ad Account Configuration</CardTitle>
        <CardDescription>Select your ad account, campaign and ad set</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="adAccount" className="flex items-center gap-2">
                <AdAccountIcon className="w-4 h-4" />
                Ad Account</Label>
              <RefreshCcw
                className={cn(
                  "h-4 w-4 cursor-pointer transition-all duration-200",
                  isLoadingAdAccounts
                    ? "h-3.5 w-3.5 text-gray-300 animate-[spin_3s_linear_infinite]"
                    : "text-gray-500 hover:text-gray-700"
                )}
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
            {selectedAdAccount && isAdAccountChanging && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <Loader className="h-3 w-3 animate-spin" />
                Loading Ad Account Preferences...
              </div>
            )}

            {selectedAdAccount && !documentExists && (
              <div className="flex items-center gap-1 p-1 pl-2 bg-orange-50 border border-orange-200 rounded-2xl">
                <CogIcon className="w-4 h-4 text-orange-700" />
                <Label className="text-xs text-orange-700 flex-1">
                  Add default settings for this account to speed up your workflow
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/settings?tab=adaccount&adAccount=${selectedAdAccount}`)}
                  className="text-xs px-3 py-0.25 border-orange-300 text-orange-700 bg-orange-300 rounded-xl hover:text-orange-800 hover:bg-orange-400"
                >
                  Add Settings
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="campaign" className="flex items-center gap-2">
                <CampaignIcon className="w-4 h-4" />
                Select a Campaign to launch Ads in
              </Label>
              <RefreshCcw
                className={cn(
                  "h-4 w-4 cursor-pointer transition-all duration-200",
                  isLoadingCampaigns
                    ? "h-3.5 w-3.5 text-gray-300 animate-[spin_3s_linear_infinite]"
                    : "text-gray-500 hover:text-gray-700"
                )}
                onClick={refreshCampaigns}
              />
            </div>

            {/* Campaign Dropdown - REPLACE THE ENTIRE POPOVER SECTION */}
            <Popover open={openCampaign} onOpenChange={setOpenCampaign}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCampaign}
                  disabled={!isLoggedIn || campaigns.length === 0 || isLoadingCampaigns}
                  className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow overflow-hidden whitespace-nowrap hover:!bg-white"
                >
                  <div className="w-full overflow-hidden">
                    <span className="block truncate flex-1 text-left">
                      {selectedCampaign.length === 0
                        ? "Select campaigns"
                        : selectedCampaign.length === 1
                          ? campaigns.find((c) => c.id === selectedCampaign[0])?.name || selectedCampaign[0]
                          : `${selectedCampaign.length} campaigns selected`}
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
                    placeholder="Search campaigns..."
                    value={campaignSearchValue}
                    onValueChange={setCampaignSearchValue}
                  />
                  <CommandEmpty>No campaigns found.</CommandEmpty>
                  <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                    <CommandGroup>
                      {filteredCampaigns.map((camp) => {
                        const isSelected = selectedCampaign.includes(camp.id);
                        return (
                          <CommandItem
                            key={camp.id}
                            value={camp.name || camp.id}
                            onSelect={() => handleCampaignChange(camp.id)}
                            className="px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Checkbox
                                id={`campaign-${camp.id}`}
                                checked={isSelected}
                                className="p-0 w-4 h-4 aspect-square bg-white border border-gray-300 rounded-[6px]"
                              >
                                <Checkbox.Indicator>
                                  <Check className="w-3 h-3 text-green-500" />
                                </Checkbox.Indicator>
                              </Checkbox>
                              <Label className={cn("flex-1 cursor-pointer flex items-center justify-between", camp.status !== "ACTIVE" && "text-gray-400")}>
                                <span className="truncate leading-[1.25]">{camp.name || camp.id}</span>
                                {camp.status === "ACTIVE" && (
                                  <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                                )}
                              </Label>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                  {/* Launch in a New Campaign Button */}
                  <div className="p-2 border-t border-gray-200">
                    <Button
                      onClick={() => {
                        setShowDuplicateCampaignBlock(true);
                        setOpenCampaign(false);
                      }}
                      // className="w-full justify-start text-left font-normal bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl"
                      className={`
h-10 w-full px-4 py-3 m-1 rounded-xl 
!bg-zinc-700 !text-white shadow-md 
flex items-center justify-center 
text-sm font-semibold cursor-pointer 
transition-all duration-150 hover:!bg-black
       `}
                      variant="outline"
                    >
                      <CampaignIcon className="mr-2 h-4 w-4" />
                      Launch in a New Campaign
                    </Button>
                  </div>
                </Command>
              </PopoverContent>
            </Popover>

            {showDuplicateCampaignBlock && (
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateCampaignBlock(false)
                    setDuplicateCampaign("")
                    setNewCampaignName("")
                  }}
                  className="absolute top-2 right-2 p-0.5 rounded-full !bg-white border border-gray-200 hover:bg-gray-50"
                  aria-label="Close duplicate campaign selection"
                >
                  <X className="h-3 w-3 text-gray-700" />
                </button>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="duplicateCampaign" className="flex items-center gap-2">
                    <CopyIcon className="w-4 h-4" />
                    Select a campaign to duplicate
                  </Label>
                  <Label className="text-gray-500 text-[12px] font-regular">We'll copy the campaign and all its ad sets</Label>

                  <Popover open={openDuplicateCampaign} onOpenChange={setOpenDuplicateCampaign}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDuplicateCampaign}
                        disabled={!isLoggedIn || campaigns.length === 0}
                        className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow overflow-hidden whitespace-nowrap hover:!bg-white"
                      >
                        <div className="w-full overflow-hidden">
                          <span className="block truncate flex-1 text-left">
                            {duplicateCampaign
                              ? campaigns.find((campaign) => campaign.id === duplicateCampaign)?.name || duplicateCampaign
                              : "Select campaign to duplicate"}
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
                          placeholder="Search campaign..."
                          value={duplicateCampaignSearchValue}
                          onValueChange={setDuplicateCampaignSearchValue}
                        />
                        <CommandEmpty>No campaigns found.</CommandEmpty>
                        <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                          <CommandGroup>
                            {campaigns
                              .filter((campaign) =>
                                (campaign.name || campaign.id).toLowerCase().includes(duplicateCampaignSearchValue.toLowerCase())
                              )
                              .map((campaign) => (
                                <CommandItem
                                  key={campaign.id}
                                  value={campaign.name || campaign.id}
                                  onSelect={() => {
                                    setDuplicateCampaign(campaign.id);
                                    setOpenDuplicateCampaign(false);
                                  }}
                                  className={cn(
                                    "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                    campaign.status !== "ACTIVE" && "text-gray-400"
                                  )}
                                >
                                  <div className="flex justify-between items-center w-full truncate">
                                    <span className="truncate">{campaign.name || campaign.id}</span>
                                    {campaign.status === "ACTIVE" && (
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

                  {/* New Campaign Name Input */}
                  {duplicateCampaign && (
                    <div className="space-y-2" style={{ marginTop: '20px' }}>
                      <Label htmlFor="newCampaignName" className="block">
                        New campaign name
                      </Label>
                      <Label className="text-gray-500 text-[12px] font-regular">
                        Enter a custom name for the new campaign
                      </Label>
                      <Input
                        id="newCampaignName"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        placeholder="Enter new campaign name..."
                        className="border border-gray-400 rounded-xl bg-white shadow"
                        disabled={!isLoggedIn}
                      />

                      {/* Duplicate Button */}

                      <Button
                        onClick={duplicateCampaignFunction}
                        disabled={!isLoggedIn || !duplicateCampaign || isLoading}
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin" />
                            Duplicating...
                          </div>
                        ) : (
                          "Create Campaign"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 ">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <AdSetIcon className="w-4 h-4" />
                Launch in a new or existing ad set
              </Label>
              <RefreshCcw
                className={cn(
                  "h-4 w-4 cursor-pointer transition-all duration-200",
                  isLoadingAdSets
                    ? "h-3.5 w-3.5 text-gray-300 animate-[spin_3s_linear_infinite]"
                    : "text-gray-500 hover:text-gray-700"
                )}
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
                          disabled={selectedCampaign.length !== 1}
                          onSelect={() => {
                            if (selectedCampaign.length === 1) {
                              setShowDuplicateBlock(true)
                              setSelectedAdSets([])
                              setOpenAdSet(false)
                            }
                          }}
                          className={`
                          h-10 w-full px-4 py-3 m-1 rounded-xl 
                          ${selectedCampaign.length !== 1 ? '!bg-zinc-800 !text-zinc-500' : '!bg-zinc-700 !text-white'}
                          shadow-md 
                          flex items-center justify-center 
                          text-sm font-semibold 
                          ${selectedCampaign.length !== 1 ? 'cursor-not-allowed' : 'cursor-pointer'}
                          transition-all duration-150 
                          ${selectedCampaign.length === 1 ? 'hover:!bg-black' : ''}
                        `}
                        >
                          🚀 Launch in a New Ad Set
                          {selectedCampaign.length !== 1 && (
                            <span className="ml-2 text-xs text-zinc-400">
                              (Please select 1 campaign)
                            </span>
                          )}
                        </CommandItem>
                      )}
                    </CommandGroup>
                    <CommandGroup heading="Launch in an existing ad set">
                      {filteredAdSets.length > 0 ? (
                        (() => {
                          // Group adsets by campaign
                          const groupedByCampaign = filteredAdSets.reduce((acc, adset) => {
                            const campaignId = adset.campaignId || 'unknown';
                            if (!acc[campaignId]) {
                              acc[campaignId] = [];
                            }
                            acc[campaignId].push(adset);
                            return acc;
                          }, {});

                          return Object.entries(groupedByCampaign).map(([campaignId, campaignAdSets]) => {
                            const campaignName = campaignAdSets[0]?.campaignName || campaignId;

                            return (
                              <div key={campaignId}>
                                {/* Campaign separator */}
                                {selectedCampaign.length >= 2 && (
                                  <div className="px-4 py-2 mx-1 mb-1 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg pointer-events-none">
                                    {campaignName} Ad Sets
                                  </div>
                                )}
                                {/* Adsets for this campaign */}
                                {campaignAdSets.map((adset) => {
                                  const isSelected = selectedAdSets.includes(adset.id);
                                  return (
                                    <CommandItem
                                      key={adset.id}
                                      value={adset.name || adset.id}
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
                                  );
                                })}
                              </div>
                            );
                          });
                        })()
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
            {selectedDynamicAdSets.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-900 text-xs flex items-start">
                {" "}
                {/* Changed items-center to items-start */}
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-700" /> {/* Icon is now a direct sibling */}
                <span className="break-all">
                  {" "}
                  {/* This span now only contains the text content */}
                  Dynamic Creative Ad Set{selectedDynamicAdSets.length > 1 ? "s " : " "}
                  <span className="font-semibold break-all">{selectedDynamicAdSets.map((a) => a?.name || a?.id).join(", ")}</span>
                  {" cannot have more than 1 ad."}
                </span>
              </div>
            )}

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
                    <CopyIcon className="w-4 h-4" />
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
                            {filteredAdSets.length > 0 ? (
                              (() => {
                                // Group adsets by campaign
                                const groupedByCampaign = filteredAdSets.reduce((acc, adset) => {
                                  const campaignId = adset.campaignId || 'unknown';
                                  if (!acc[campaignId]) {
                                    acc[campaignId] = [];
                                  }
                                  acc[campaignId].push(adset);
                                  return acc;
                                }, {});

                                return Object.entries(groupedByCampaign).map(([campaignId, campaignAdSets]) => {
                                  const campaignName = campaignAdSets[0]?.campaignName || campaignId;

                                  return (
                                    <div key={campaignId}>
                                      {/* Campaign separator */}
                                      {selectedCampaign.length >= 2 && (
                                        <div className="px-4 py-2 mx-1 mb-1 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg pointer-events-none">
                                          {campaignName} Ad Sets
                                        </div>
                                      )}
                                      {/* Adsets for this campaign */}
                                      {campaignAdSets.map((adset) => {
                                        // const isSelected = selectedAdSets.includes(adset.id);
                                        return (
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
                                        );
                                      })}
                                    </div>
                                  );
                                });
                              })()
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
    </Card >
  )
}