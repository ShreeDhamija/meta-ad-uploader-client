"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronsUpDown, Loader, CirclePlus, Info, RefreshCw, ChevronDown, CircleX } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useAppData } from "@/lib/AppContext"
import CopyTemplates from "./CopyTemplates"
import PageSelectors from "./PageSelectors"
import LinkParameters from "./LinkParameters"
import MultiAdvertiserAds from "./MultiAdvertiserAds"
import DefaultCTA from "./DefaultCTA"
import { toast } from "sonner"
import { saveSettings } from "@/lib/saveSettings"
import useAdAccountSettings from "@/lib/useAdAccountSettings"
import useTeamSync from "@/lib/useTeamSync"
import CreativeEnhancements from "./CreativeEnhancements"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import LabelIcon from '@/assets/icons/label.svg?react';
import confetti from 'canvas-confetti'
import { createPortal } from "react-dom"


// Constants moved outside component to prevent recreation

const DEFAULT_ENHANCEMENTS = {
  overlay: false,
  visual: false,
  text: false,
  cta: false,
  brightness: false,
  comments: false,
  backgroundGen: false,
  expandImage: false,
  catalogItems: false,
  textGeneration: false,
  translate: false,
  reveal: false,
  summary: false,
  animation: false,
};

// Single cache key for draft settings
const DRAFT_CACHE_KEY = 'adAccountSettings_draft';


export default function AdAccountSettings({ preselectedAdAccount, onTriggerAdAccountPopup, subscriptionData }) {
  const { adAccounts, pages, adAccountsLoading } = useAppData()
  const [selectedAdAccount, setSelectedAdAccount] = useState(() => {
    // If there's a preselected account, use that
    if (preselectedAdAccount) return preselectedAdAccount;

    // Otherwise, check for cached draft and auto-select that account
    try {
      const cachedDraft = localStorage.getItem(DRAFT_CACHE_KEY);
      if (cachedDraft) {
        const draft = JSON.parse(cachedDraft);
        const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent && draft.adAccountId) {
          return draft.adAccountId;
        }
      }
    } catch (e) {
      console.error('Failed to read cached draft:', e);
    }

    return null;
  });
  const [openAdAccount, setOpenAdAccount] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedPage, setSelectedPage] = useState(null)
  const [multiAdvertiserAds, setMultiAdvertiserAds] = useState(false)
  const [selectedInstagram, setSelectedInstagram] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const { settings: adSettings, setSettings: setAdSettings, loading, isFirstEverSave } = useAdAccountSettings(selectedAdAccount)
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false)
  const [syncConfirmAction, setSyncConfirmAction] = useState(null)
  const {
    loading: syncLoading,
    toggling: syncToggling,
    inTeam,
    syncEnabled,
    isOwner,
    teamName,
    enableSync,
    disableSync,
    refetch: refetchSync,
  } = useTeamSync()

  const [links, setLinks] = useState([]) // Array of {url, isDefault}
  // const [utmPairs, setUtmPairs] = useState(DEFAULT_UTM_PAIRS)
  const [utmPairs, setUtmPairs] = useState([])
  const [displayLink, setDisplayLink] = useState("")
  const [defaultCTA, setDefaultCTA] = useState("Learn More")
  // const [copyTemplates, setCopyTemplates] = useState({})
  const [enhancements, setEnhancements] = useState(DEFAULT_ENHANCEMENTS)
  const [adNameFormulaV2, setAdNameFormulaV2] = useState({ rawInput: "" }) // Add this line
  const [customVariables, setCustomVariables] = useState([])
  const [isDirty, setIsDirty] = useState(false)
  const [initialSettings, setInitialSettings] = useState({})
  const [isReauthOpen, setIsReauthOpen] = useState(false)


  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
  // Add a ref to track template-only updates
  const skipFormResetRef = useRef(false);
  // Ref to track if we've already restored from cache for this account
  const cacheRestoredRef = useRef(false);


  // Create callback to pass to CopyTemplates
  const handleTemplateUpdate = useCallback(() => {
    skipFormResetRef.current = true;
  }, []);


  // Memoized Facebook reauth handler
  const handleFacebookReauth = useCallback(() => {
    setIsReauthOpen(false)
    window.location.href = `${API_BASE_URL}/auth/facebook?state=settings`
  }, [])


  const handleSyncToggle = useCallback(() => {
    if (!isOwner) {
      toast.info("Only the team owner can change sync settings.")
      return
    }
    setSyncConfirmAction(syncEnabled ? "disable" : "enable")
    setSyncConfirmOpen(true)
  }, [isOwner, syncEnabled])

  const handleSyncConfirm = useCallback(async () => {
    setSyncConfirmOpen(false)
    let result
    if (syncConfirmAction === "enable") {
      result = await enableSync()
      if (result.success) {
        toast.success(
          result.seededCount > 0
            ? `Sync enabled! ${result.seededCount} ad account settings synced.`
            : "Sync enabled! Settings will be shared when anyone saves next."
        )
      }
    } else {
      result = await disableSync()
      if (result.success) {
        toast.success("Sync disabled. Each member will use their own settings.")
      }
    }
    if (!result?.success) {
      toast.error(result?.error || "Something went wrong.")
    }
    // Re-trigger settings fetch
    if (selectedAdAccount) {
      const current = selectedAdAccount
      setSelectedAdAccount(null)
      setTimeout(() => setSelectedAdAccount(current), 50)
    }
  }, [syncConfirmAction, enableSync, disableSync, selectedAdAccount])



  // Memoized filtered ad accounts for dropdown
  const filteredAdAccounts = useMemo(() => {
    if (!searchValue) return adAccounts;

    const lowerSearchValue = searchValue.toLowerCase();
    return adAccounts.filter(
      (acct) =>
        (acct.name?.toLowerCase() || "").includes(lowerSearchValue) ||
        acct.id.toLowerCase().includes(lowerSearchValue),
    );
  }, [adAccounts, searchValue]);

  // Memoized selected ad account display name
  const selectedAdAccountName = useMemo(() => {
    if (!selectedAdAccount) return "Select an Ad Account";
    return adAccounts.find((acct) => acct.id === selectedAdAccount)?.name || selectedAdAccount;
  }, [selectedAdAccount, adAccounts]);

  // Memoized UTM comparison function
  const areUtmPairsEqual = useCallback((pairs1, pairs2) => {
    const normalize = (pairs) =>
      pairs
        .map(p => ({ key: String(p.key || ""), value: String(p.value || "") }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(p => `${p.key}:${p.value}`)
        .join("|");

    return normalize(pairs1) === normalize(pairs2);
  }, []);

  // Memoized change detection
  const hasChanges = useMemo(() => {
    if (!selectedAdAccount || !Object.keys(initialSettings).length) return false;

    return (
      selectedPage?.id !== initialSettings.defaultPage?.id ||
      selectedInstagram?.id !== initialSettings.defaultInstagram?.id ||
      JSON.stringify(links) !== JSON.stringify(initialSettings.links) ||
      defaultCTA !== initialSettings.defaultCTA ||
      !areUtmPairsEqual(utmPairs, initialSettings.defaultUTMs) ||
      JSON.stringify(enhancements) !== JSON.stringify(initialSettings.creativeEnhancements) ||
      adNameFormulaV2?.rawInput !== initialSettings.adNameFormulaV2?.rawInput ||
      multiAdvertiserAds !== initialSettings.multiAdvertiserAds ||
      displayLink !== initialSettings.displayLink
    );
  }, [
    selectedPage,
    selectedInstagram,
    links,
    defaultCTA,
    utmPairs,
    enhancements,
    adNameFormulaV2,  // Add to dependencies
    initialSettings,
    multiAdvertiserAds,  // ADD THIS
    selectedAdAccount,
    areUtmPairsEqual,
    displayLink


  ]);

  // Memoized initial settings calculation
  const calculateInitialSettings = useCallback((adSettings) => {
    const utms = Array.isArray(adSettings.defaultUTMs) && adSettings.defaultUTMs.length > 0
      ? adSettings.defaultUTMs
      : [];




    return {
      defaultPage: adSettings.defaultPage || null,
      defaultInstagram: adSettings.defaultInstagram || null,
      links: adSettings.links || [],
      defaultCTA: adSettings.defaultCTA || "LEARN_MORE",
      defaultUTMs: utms,
      creativeEnhancements: adSettings.creativeEnhancements || DEFAULT_ENHANCEMENTS,
      adNameFormulaV2: adSettings.adNameFormulaV2 || { rawInput: "" },
      multiAdvertiserAds: adSettings.multiAdvertiserAds || false,
      customVariables: adSettings.customVariables || [],
      displayLink: adSettings.displayLink || "",


    };
  }, []);

  // Optimized ad account selection handler
  const handleAdAccountSelect = useCallback((accountId) => {
    // If switching to a different account, clear cache and reset form state
    if (selectedAdAccount && accountId !== selectedAdAccount) {
      localStorage.removeItem(DRAFT_CACHE_KEY);

      // Reset form state immediately to prevent showing stale values
      setSelectedPage(null);
      setSelectedInstagram(null);
      setLinks([]);
      setUtmPairs([]);
      setDefaultCTA("LEARN_MORE");
      setEnhancements(DEFAULT_ENHANCEMENTS);
      setAdNameFormulaV2({ rawInput: "" });
      setMultiAdvertiserAds(false);
      setCustomVariables([]);  // ← ADD THIS
      setInitialSettings({});
      setDisplayLink("");

    }

    // Reset cache restored flag when switching accounts
    cacheRestoredRef.current = false;
    setSelectedAdAccount(accountId);
    setOpenAdAccount(false);
  }, [selectedAdAccount]);

  // Optimized ad name formula handlers


  const handleFormulaInputChange = useCallback((newRawInput) => {
    setAdNameFormulaV2({
      rawInput: newRawInput
    });
  }, []);

  // Dismiss handler - resets all fields to initial values and clears cache
  const handleDismiss = useCallback(() => {
    setSelectedPage(initialSettings.defaultPage);
    setSelectedInstagram(initialSettings.defaultInstagram);
    setLinks(initialSettings.links);
    setUtmPairs(initialSettings.defaultUTMs);
    setDefaultCTA(initialSettings.defaultCTA);
    setEnhancements(initialSettings.creativeEnhancements);
    setAdNameFormulaV2(initialSettings.adNameFormulaV2);
    setMultiAdvertiserAds(initialSettings.multiAdvertiserAds);
    setCustomVariables(initialSettings.customVariables);
    setDisplayLink(initialSettings.displayLink);


    // Clear the cached draft
    localStorage.removeItem(DRAFT_CACHE_KEY);
  }, [initialSettings]);

  // Optimized save handler
  const handleSave = useCallback(async () => {

    setSavingSettings(true);
    if (!selectedAdAccount) {
      alert("Select an Ad Account first");
      return;
    }

    // 1. Construct settings object directly from state variables
    const adAccountSettings = {
      defaultPage: selectedPage,
      defaultInstagram: selectedInstagram,
      links: links,
      defaultCTA,
      defaultUTMs: utmPairs, // <--- Direct state reference
      creativeEnhancements: enhancements,
      adNameFormulaV2: {
        rawInput: adNameFormulaV2?.rawInput || ""
      },
      multiAdvertiserAds: multiAdvertiserAds,
      customVariables: customVariables,
      displayLink: displayLink,


    };

    try {
      await saveSettings({
        adAccountId: selectedAdAccount,
        adAccountSettings,
      });

      toast.success("Updates saved!");


      if (isFirstEverSave) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
      }

      // 2. Update Initial Settings to match current state
      const newInitialSettings = {
        defaultPage: selectedPage,
        defaultInstagram: selectedInstagram,
        links: links,
        defaultCTA,
        defaultUTMs: utmPairs, // <--- Direct state reference
        creativeEnhancements: enhancements,
        adNameFormulaV2: adNameFormulaV2,
        multiAdvertiserAds: multiAdvertiserAds,
        customVariables: customVariables,
        displayLink: displayLink,


      };

      setInitialSettings(newInitialSettings);
      setIsDirty(false);

      // Clear cached draft after successful save
      localStorage.removeItem(DRAFT_CACHE_KEY);
    } catch (err) {
      toast.error("Failed to save settings: " + err.message);
    }
    finally {
      setSavingSettings(false);
    }
  }, [
    selectedAdAccount,
    selectedPage,
    selectedInstagram,
    links,
    defaultCTA,
    utmPairs,
    enhancements,
    adNameFormulaV2,
    multiAdvertiserAds,
    isFirstEverSave,
    customVariables,
    displayLink
  ]);


  const handleCustomVariablesSave = useCallback(async (newVariables) => {
    setCustomVariables(newVariables);

    if (!selectedAdAccount) return;

    try {
      await saveSettings({
        adAccountId: selectedAdAccount,
        adAccountSettings: {
          customVariables: newVariables,
        },
        merge: true,  // see note below
      });
      toast.success("Custom variables saved!");

      // Update initialSettings so hasChanges doesn't flag this as dirty
      setInitialSettings(prev => ({
        ...prev,
        customVariables: newVariables,
      }));
    } catch (err) {
      toast.error("Failed to save custom variables: " + err.message);
    }
  }, [selectedAdAccount]);




  // Effect for dirty state tracking
  useEffect(() => {
    setIsDirty(hasChanges);
  }, [hasChanges]);

  // Effect to save draft to localStorage when there are unsaved changes
  // Effect to save/clear draft in localStorage based on unsaved changes
  useEffect(() => {
    if (!selectedAdAccount) return;

    if (!Object.keys(initialSettings).length) return;


    if (hasChanges) {
      // Save draft when there are unsaved changes
      const draft = {
        adAccountId: selectedAdAccount,
        selectedPage,
        selectedInstagram,
        links,
        utmPairs,
        defaultCTA,
        enhancements,
        adNameFormulaV2,
        multiAdvertiserAds,
        customVariables,
        displayLink,     // ← ADD THIS
        timestamp: Date.now()
      };

      localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(draft));
    } else {
      // Clear cache if no unsaved changes (and cache was for this account)
      try {
        const cached = localStorage.getItem(DRAFT_CACHE_KEY);
        if (cached) {
          const draft = JSON.parse(cached);
          if (draft.adAccountId === selectedAdAccount) {
            localStorage.removeItem(DRAFT_CACHE_KEY);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [selectedAdAccount, hasChanges, selectedPage, selectedInstagram, links, utmPairs, defaultCTA, enhancements, adNameFormulaV2, multiAdvertiserAds, customVariables, displayLink]);



  // Effect for loading initial settings (with cache restoration)
  useEffect(() => {
    if (!selectedAdAccount || !adSettings) return;

    const initial = calculateInitialSettings(adSettings);
    console.log("adSettings.adNameFormulaV2:", adSettings.adNameFormulaV2);

    if (skipFormResetRef.current) {
      skipFormResetRef.current = false;
      setInitialSettings(initial);
      return;
    }

    // If cache was already restored, only update initialSettings (for hasChanges comparison)
    // but don't overwrite the form values
    if (cacheRestoredRef.current) {
      setInitialSettings(initial);
      return;
    }

    // Try to restore from cache
    try {
      const cachedDraft = localStorage.getItem(DRAFT_CACHE_KEY);

      if (cachedDraft) {
        const draft = JSON.parse(cachedDraft);
        const isForCurrentAccount = draft.adAccountId === selectedAdAccount;
        const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;

        if (isForCurrentAccount && isRecent) {
          setSelectedPage(draft.selectedPage);
          setSelectedInstagram(draft.selectedInstagram);
          setLinks(draft.links);
          setUtmPairs(draft.utmPairs);
          setDefaultCTA(draft.defaultCTA);
          setEnhancements(draft.enhancements);
          setAdNameFormulaV2(draft.adNameFormulaV2);
          setMultiAdvertiserAds(draft.multiAdvertiserAds);
          setCustomVariables(draft.customVariables || []);
          setDisplayLink(draft.displayLink || "");
          setInitialSettings(initial);
          cacheRestoredRef.current = true;
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached draft:', e);
    }

    // No valid cache, use server values
    setSelectedPage(initial.defaultPage);
    setSelectedInstagram(initial.defaultInstagram);
    setLinks(initial.links);
    setUtmPairs(initial.defaultUTMs);
    setDefaultCTA(initial.defaultCTA);
    setEnhancements(initial.creativeEnhancements);
    setAdNameFormulaV2(initial.adNameFormulaV2);
    setInitialSettings(initial);
    setMultiAdvertiserAds(initial.multiAdvertiserAds);
    setCustomVariables(initial.customVariables || []);  // ← ADD THIS
    setDisplayLink(initial.displayLink || "");

  }, [adSettings, selectedAdAccount, calculateInitialSettings]);


  // Add this effect after the existing useEffect hooks

  useEffect(() => {
    // Only check if we have a selected account and the adAccounts array has been populated
    if (selectedAdAccount && adAccounts.length > 0) {
      const accountStillExists = adAccounts.some(acc => acc.id === selectedAdAccount);
      if (!accountStillExists) {
        setSelectedAdAccount(null);
      }
    }
  }, [adAccounts]); // Only depend on adAccounts, not selectedAdAccount


  return (
    <div className="space-y-6 w-full max-w-3xl">
      {/* Ad Account Dropdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-md font-medium text-gray-800">Select Ad Account</label>
          <div className="flex items-center gap-2">

            {/* Team sync button — owners always see, members only when synced */}
            {!syncLoading && inTeam && (isOwner || syncEnabled) && (
              syncEnabled ? (
                isOwner ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncToggle}
                    disabled={syncToggling}
                    className="text-sm rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncToggling ? "animate-spin" : ""}`} />
                    Disable Settings Sync With Team
                  </Button>
                ) : null
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncToggle}
                  disabled={syncToggling || !isOwner}
                  className="text-sm rounded-xl border-gray-200 hover:bg-gray-50"
                >
                  {syncToggling ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CircleX className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Sync Settings with Team
                </Button>
              )
            )}

            {/* Dropdown: Edit Active Accounts */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-sm rounded-xl border-gray-200 hover:bg-gray-50"
                >
                  Edit Active Accounts
                  <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl bg-white">
                <DropdownMenuItem
                  onClick={() => setIsReauthOpen(true)}
                  className="cursor-pointer rounded-lg text-blue-600 hover:text-blue-600"
                >
                  <CirclePlus className="w-4 h-4 mr-2 text-blue-600" />
                  Link New Ad Accounts
                </DropdownMenuItem>
                {(subscriptionData.planType === 'brand' || subscriptionData.planType === 'starter') && (
                  <DropdownMenuItem
                    onClick={onTriggerAdAccountPopup}
                    className="cursor-pointer rounded-lg"
                  >
                    Change Selected Accounts in Plan
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reauth dialog (opened from dropdown) */}
            <Dialog open={isReauthOpen} onOpenChange={setIsReauthOpen}>
              <DialogOverlay className="bg-black/20" />
              <DialogContent className="sm:max-w-md !rounded-xl">
                <div className="text-left space-y-4 p-6 !rounded-xl">
                  <div className="space-y-2">
                    <img
                      src="https://api.withblip.com/logo.webp"
                      alt="Logo"
                      className="w-12 h-12 rounded-md mb-4"
                    />
                    <h3 className="text-sm font-semibold">Link New Ad Accounts</h3>
                  </div>

                  <div className="space-y-3 text-sm text-gray-600">
                    <p>1. You will have to reauthenticate to add new ad accounts</p>
                    <p>2. Click on "Edit previous settings" in the Login dialog to add new business portfolios</p>
                  </div>

                  <Button
                    onClick={handleFacebookReauth}
                    className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[40px]"
                  >
                    <img
                      src="https://api.withblip.com/facebooklogo.png"
                      alt="Facebook"
                      className="w-5 h-5"
                    />
                    Login with Facebook
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Popover open={openAdAccount} onOpenChange={setOpenAdAccount}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between rounded-xl bg-white shadow-sm hover:bg-white"
            >
              {selectedAdAccountName}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
            align="start"
            sideOffset={4}
          >
            <Command filter={() => 1} loop={false} value="">
              <CommandInput
                placeholder="Search ad accounts..."
                value={searchValue}
                onValueChange={setSearchValue}
                className="bg-white"
              />
              <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                {adAccountsLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-500">
                    <Loader className="h-4 w-4 animate-spin" />
                    Fetching ad accounts...
                  </div>
                ) : (

                  <CommandGroup>
                    {filteredAdAccounts.map((acct) => (
                      <CommandItem
                        key={acct.id}
                        value={acct.id}
                        onSelect={handleAdAccountSelect}
                        className={`
                        px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150
                        hover:bg-gray-100
                        ${selectedAdAccount === acct.id ? "bg-gray-100 font-semibold" : ""}
                        `}
                        data-selected={acct.id === selectedAdAccount}
                      >
                        {acct.name || acct.id}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {!syncLoading && inTeam && syncEnabled && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <RefreshCw className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-gray-500">Settings are in sync. Changes apply to all team members</span>
          </div>
        )}


        {selectedAdAccount && loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
            <Loader className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        )}
      </div>

      <fieldset disabled={!selectedAdAccount || loading}>
        <div className={!selectedAdAccount || loading ? "opacity-70 cursor-not-allowed space-y-6" : "space-y-6"}>
          <PageSelectors
            selectedPage={selectedPage}
            setSelectedPage={setSelectedPage}
            selectedInstagram={selectedInstagram}
            setSelectedInstagram={setSelectedInstagram}
          />

          <CopyTemplates
            selectedAdAccount={selectedAdAccount}
            adSettings={adSettings}
            setAdSettings={setAdSettings}
            onTemplateUpdate={handleTemplateUpdate}

          />

          {/* Ad Naming Convention */}
          <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <LabelIcon alt="Ad Name Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
              <h3 className="font-medium text-[14px] text-zinc-950">
                Set up your default ad naming conventions
              </h3>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="end"
                    className="max-w-xs p-3 text-xs leading-relaxed rounded-2xl bg-zinc-800 text-white border-black"
                  >
                    <p className="font-medium mb-1.5">Select the Custom Date option & replace 'custom' with any combination of the tokens below.</p>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                      <span className="font-semibold">D</span><span className="text-gray-400">Day (1–31)</span>
                      <span className="font-semibold">DD</span><span className="text-gray-400">Day, zero-padded (01–31)</span>
                      <span className="font-semibold">M</span><span className="text-gray-400">Month (1–12)</span>
                      <span className="font-semibold">MM</span><span className="text-gray-400">Month, zero-padded (01–12)</span>
                      <span className="font-semibold">MMM</span><span className="text-gray-400">Month name (Jan, Feb…)</span>
                      <span className="font-semibold">YY</span><span className="text-gray-400">Year, 2-digit (25)</span>
                      <span className="font-semibold">YYYY</span><span className="text-gray-400">Year, 4-digit (2025)</span>
                    </div>
                    <p className="text-gray-400 mt-2">Use any separator: <span className="font-mono">/ - . _</span> or space</p>
                    <p className="mt-1.5 text-gray-400 italic">{"Example: {{Date(DD-MMM-YYYY)}} → 05-Mar-2025"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <ReorderAdNameParts
              formulaInput={adNameFormulaV2?.rawInput || ""}
              onFormulaChange={handleFormulaInputChange}
              variant="default"
              customVariables={customVariables}
              onCustomVariablesChange={handleCustomVariablesSave}
              hideInfoTooltip
            />
          </div>

          <LinkParameters
            links={links}
            setLinks={setLinks}
            utmPairs={utmPairs}
            setUtmPairs={setUtmPairs}
            selectedAdAccount={selectedAdAccount}
            displayLink={displayLink}
            setDisplayLink={setDisplayLink}
          />

          <DefaultCTA defaultCTA={defaultCTA} setDefaultCTA={setDefaultCTA} />

          <CreativeEnhancements enhancements={enhancements} setEnhancements={setEnhancements} />
          <MultiAdvertiserAds enabled={multiAdvertiserAds} setEnabled={setMultiAdvertiserAds} />


        </div>
      </fieldset>


      {/* Portal Save Bar */}
      {document.getElementById('settings-save-bar-portal') && createPortal(
        <div
          className={`absolute bottom-0 left-0 w-full z-40 w-full bg-blue-600 text-white transition-transform duration-300 ease-in-out ${hasChanges ? "translate-y-0" : "translate-y-full"
            }`}
        >
          <div className="mx-auto max-w-3xl px-6 py-1.5 flex flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSave}
                className="bg-white text-blue-600 hover:bg-white rounded-xl px-6 h-9 text-sm font-semibold shadow-sm"
              >
                {savingSettings ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span className="block truncate flex-1 text-left">Saving changes...</span>
                  </>
                ) : (
                  <p className="text-blue-600 hover:text-blue-600">Save Changes</p>
                )}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="text-white hover:bg-blue-700 hover:text-white rounded-xl px-4 h-9 text-sm font-medium"
              >
                Dismiss changes
              </Button>
            </div>

          </div>
        </div>,
        document.getElementById('settings-save-bar-portal')
      )}

      {/* Sync confirmation dialog */}
      <Dialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <DialogOverlay className="bg-black/20" />
        <DialogContent className="sm:max-w-md !rounded-xl">
          <div className="text-left space-y-4 p-6">
            <h3 className="text-sm font-semibold">
              {syncConfirmAction === "enable" ? "Enable team sync?" : "Disable team sync?"}
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              {syncConfirmAction === "enable" ? (
                <>
                  <p>This will share your ad account settings and copy templates with all team members. Your current settings will be used as the starting point.</p>
                  <p>Any team member will be able to edit settings, and changes will be visible to everyone.</p>
                </>
              ) : (
                <p>Each team member will return to using their own personal settings. Their current settings (copied from the shared ones) will be preserved.</p>
              )}
            </div>
            <div className="flex gap-2 pt-2 w-full">
              <Button variant="outline" onClick={() => setSyncConfirmOpen(false)} className="rounded-xl flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSyncConfirm}
                className={`rounded-xl flex-1 ${syncConfirmAction === "enable" ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-800 text-white"}`}
              >
                {syncConfirmAction === "enable" ? "Enable sync" : "Disable sync"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )

}