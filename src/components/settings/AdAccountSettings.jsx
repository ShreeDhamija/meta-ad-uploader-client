"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown, Loader, CirclePlus } from "lucide-react"
import { useAppData } from "@/lib/AppContext"
import CopyTemplates from "./CopyTemplates"
import PageSelectors from "./PageSelectors"
import LinkParameters from "./LinkParameters"
import DefaultCTA from "./DefaultCTA"
import { toast } from "sonner"
import { saveSettings } from "@/lib/saveSettings"
import useAdAccountSettings from "@/lib/useAdAccountSettings"
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
};


export default function AdAccountSettings({ preselectedAdAccount, onTriggerAdAccountPopup, subscriptionData }) {
  const { adAccounts, pages, adAccountsLoading } = useAppData()
  const [selectedAdAccount, setSelectedAdAccount] = useState(preselectedAdAccount || null)
  const [openAdAccount, setOpenAdAccount] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedPage, setSelectedPage] = useState(null)
  const [selectedInstagram, setSelectedInstagram] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const { settings: adSettings, setSettings: setAdSettings, loading, isFirstEverSave } = useAdAccountSettings(selectedAdAccount)


  const [links, setLinks] = useState([]) // Array of {url, isDefault}
  // const [utmPairs, setUtmPairs] = useState(DEFAULT_UTM_PAIRS)
  const [utmPairs, setUtmPairs] = useState([])

  const [defaultCTA, setDefaultCTA] = useState("Learn More")
  // const [copyTemplates, setCopyTemplates] = useState({})
  const [enhancements, setEnhancements] = useState(DEFAULT_ENHANCEMENTS)
  const [adNameFormulaV2, setAdNameFormulaV2] = useState({ rawInput: "" }) // Add this line
  const [isDirty, setIsDirty] = useState(false)
  const [initialSettings, setInitialSettings] = useState({})
  const [isReauthOpen, setIsReauthOpen] = useState(false)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
  // Add a ref to track template-only updates
  const skipFormResetRef = useRef(false);


  // Create callback to pass to CopyTemplates
  const handleTemplateUpdate = useCallback(() => {
    skipFormResetRef.current = true;
  }, []);


  // Memoized Facebook reauth handler
  const handleFacebookReauth = useCallback(() => {
    setIsReauthOpen(false)
    window.location.href = `${API_BASE_URL}/auth/facebook?state=settings`
  }, [])

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
      adNameFormulaV2?.rawInput !== initialSettings.adNameFormulaV2?.rawInput



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
    selectedAdAccount,
    areUtmPairsEqual
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
      adNameFormulaV2: adSettings.adNameFormulaV2 || { rawInput: "" }
    };
  }, []);

  // Optimized ad account selection handler
  const handleAdAccountSelect = useCallback((accountId) => {
    setSelectedAdAccount(accountId);
    setOpenAdAccount(false);
  }, []);

  // Optimized ad name formula handlers


  const handleFormulaInputChange = useCallback((newRawInput) => {
    setAdNameFormulaV2({
      rawInput: newRawInput
    });
  }, []);

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
      }
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
        adNameFormulaV2: adNameFormulaV2
      };

      setInitialSettings(newInitialSettings);
      setIsDirty(false);
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
    isFirstEverSave
  ]);




  // Effect for dirty state tracking
  useEffect(() => {
    setIsDirty(hasChanges);
  }, [hasChanges]);

  // Effect for loading initial settings
  useEffect(() => {
    if (!selectedAdAccount || !adSettings) return;

    const initial = calculateInitialSettings(adSettings);
    console.log("adSettings.adNameFormulaV2:", adSettings.adNameFormulaV2);

    if (skipFormResetRef.current) {
      skipFormResetRef.current = false;
      setInitialSettings(initial);
      return;
    }


    setSelectedPage(initial.defaultPage);
    setSelectedInstagram(initial.defaultInstagram);
    setLinks(initial.links);
    setUtmPairs(initial.defaultUTMs);
    setDefaultCTA(initial.defaultCTA);
    setEnhancements(initial.creativeEnhancements);
    setAdNameFormulaV2(initial.adNameFormulaV2); // Add this line
    setInitialSettings(initial);
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

            {(subscriptionData.planType === 'brand' || subscriptionData.planType === 'starter') && (
              <Button
                size="sm"
                variant="outline"
                onClick={onTriggerAdAccountPopup}
                className="text-sm rounded-xl border-gray-200 hover:bg-gray-50"
              >
                Change Selected Accounts
              </Button>
            )}

            {/* Inline Add Ad Accounts Button with Dialog */}
            <Dialog open={isReauthOpen} onOpenChange={setIsReauthOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="text-sm text-white bg-blue-500 hover:bg-blue-600 hover:text-white rounded-xl"
                >
                  <CirclePlus className="w-4 h-4 mr-1" />
                  Link New Ad Accounts
                </Button>
              </DialogTrigger>
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
                Ad Naming Convention
              </h3>
            </div>

            <p className="text-xs text-gray-500">
              Type
              <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-sm text-black">
                /
              </span>
              to see list of variables you can use. You can also save custom text.
            </p>

            <ReorderAdNameParts
              formulaInput={adNameFormulaV2?.rawInput || ""}
              onFormulaChange={handleFormulaInputChange}
              variant="default"
            />
          </div>

          <LinkParameters
            links={links}
            setLinks={setLinks}
            utmPairs={utmPairs}
            setUtmPairs={setUtmPairs}
            selectedAdAccount={selectedAdAccount}

          />

          <DefaultCTA defaultCTA={defaultCTA} setDefaultCTA={setDefaultCTA} />

          <CreativeEnhancements enhancements={enhancements} setEnhancements={setEnhancements} />

        </div>
      </fieldset>


      {/* Portal Save Bar */}
      {document.getElementById('settings-save-bar-portal') && createPortal(
        <div
          className={`absolute bottom-0 left-0 w-full z-40 w-full bg-blue-600 text-white transition-transform duration-300 ease-in-out ${hasChanges ? "translate-y-0" : "translate-y-full"
            }`}
        >
          <div className="mx-auto max-w-3xl px-6 py-1.5 flex items-center justify-center gap-4">
            <span className="text-sm font-medium">
              You have unsaved settings
            </span>
            <Button
              onClick={handleSave}
              className="bg-white text-blue-600 hover:bg-white rounded-xl px-6 h-9 text-sm font-semibold shadow-sm"
            >
              {savingSettings ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="block truncate flex-1 text-left text-gray-500">Saving changes...</span>
                </>
              ) : (
                <p className="text-blue-600 hover:text-blue-800"> Save Changes</p>
              )}
            </Button>
          </div>
        </div>,
        document.getElementById('settings-save-bar-portal')
      )}

    </div>
  )
}

