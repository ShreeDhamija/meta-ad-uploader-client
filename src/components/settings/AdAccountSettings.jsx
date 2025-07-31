"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
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

// Constants moved outside component to prevent recreation
const DEFAULT_UTM_PAIRS = [
  { key: "utm_source", value: "facebook" },
  { key: "utm_medium", value: "paid" },
  { key: "utm_campaign", value: "{{campaign.name}}" },
  { key: "utm_content", value: "{{ad.name}}" },
  { key: "utm_term", value: "{{adset.name}}" },
];

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

const DEFAULT_AD_NAME_FORMULA = {
  order: ["adType", "dateType", "fileName", "iteration"],
  selected: [],
  values: {
    dateType: "MonthYYYY",
    customTexts: {}
  }
};

export default function AdAccountSettings({ preselectedAdAccount }) {
  const { adAccounts, pages } = useAppData()
  const [selectedAdAccount, setSelectedAdAccount] = useState(preselectedAdAccount || null)
  const [openAdAccount, setOpenAdAccount] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedPage, setSelectedPage] = useState(null)
  const [selectedInstagram, setSelectedInstagram] = useState(null)

  const { settings: adSettings, setSettings: setAdSettings, loading } = useAdAccountSettings(selectedAdAccount)

  const [links, setLinks] = useState([]) // Array of {url, isDefault}
  const [utmPairs, setUtmPairs] = useState(DEFAULT_UTM_PAIRS)
  const [defaultCTA, setDefaultCTA] = useState("Learn More")
  const [copyTemplates, setCopyTemplates] = useState({})
  const [enhancements, setEnhancements] = useState(DEFAULT_ENHANCEMENTS)
  const [adNameFormula, setAdNameFormula] = useState(DEFAULT_AD_NAME_FORMULA)
  const [isDirty, setIsDirty] = useState(false)
  const [initialSettings, setInitialSettings] = useState({})
  const [mainButtonVisible, setMainButtonVisible] = useState(false)
  const [showFloatingButton, setShowFloatingButton] = useState(false)
  const [animateClass, setAnimateClass] = useState("")
  const [isReauthOpen, setIsReauthOpen] = useState(false)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';



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
      JSON.stringify(adNameFormula) !== JSON.stringify(initialSettings.adNameFormula)
    );
  }, [
    selectedPage,
    selectedInstagram,
    links,
    defaultCTA,
    utmPairs,
    enhancements,
    adNameFormula,
    initialSettings,
    selectedAdAccount,
    areUtmPairsEqual
  ]);

  // Memoized initial settings calculation
  const calculateInitialSettings = useCallback((adSettings) => {
    const utms = Array.isArray(adSettings.defaultUTMs) && adSettings.defaultUTMs.length > 0
      ? adSettings.defaultUTMs
      : DEFAULT_UTM_PAIRS;

    const formula = adSettings.adNameFormula || {};

    return {
      defaultPage: adSettings.defaultPage || null,
      defaultInstagram: adSettings.defaultInstagram || null,
      links: adSettings.links || [],
      defaultCTA: adSettings.defaultCTA || "LEARN_MORE",
      defaultUTMs: utms,
      creativeEnhancements: adSettings.creativeEnhancements || DEFAULT_ENHANCEMENTS,
      adNameFormula: {
        order: formula.order || DEFAULT_AD_NAME_FORMULA.order,
        selected: formula.selected || DEFAULT_AD_NAME_FORMULA.selected,
        values: {
          dateType: formula.values?.dateType || DEFAULT_AD_NAME_FORMULA.values.dateType,
          customTexts: formula.values?.customTexts || DEFAULT_AD_NAME_FORMULA.values.customTexts
        }
      }
    };
  }, []);

  // Optimized ad account selection handler
  const handleAdAccountSelect = useCallback((accountId) => {
    setSelectedAdAccount(accountId);
    setOpenAdAccount(false);
  }, []);

  // Optimized ad name formula handlers
  const handleOrderUpdate = useCallback((orderUpdater) => {
    setAdNameFormula((currentFormula) => {
      const newOrder = typeof orderUpdater === 'function'
        ? orderUpdater(currentFormula.order)
        : orderUpdater;
      return { ...currentFormula, order: newOrder };
    });
  }, []);

  const handleValuesUpdate = useCallback((valuesUpdater) => {
    setAdNameFormula((currentFormula) => {
      const newValues = typeof valuesUpdater === 'function'
        ? valuesUpdater(currentFormula.values)
        : valuesUpdater;
      return { ...currentFormula, values: newValues };
    });
  }, []);

  const handleItemToggle = useCallback((item) => {
    setAdNameFormula(prev => ({
      ...prev,
      selected: prev.selected.includes(item)
        ? prev.selected.filter(i => i !== item)
        : [...prev.selected, item]
    }));
  }, []);

  // Optimized save handler
  const handleSave = useCallback(async () => {
    if (!selectedAdAccount) {
      alert("Select an Ad Account first");
      return;
    }

    // Reorganize formula
    const reorganizedFormula = {
      ...adNameFormula,
      order: [
        ...adNameFormula.order.filter(item => adNameFormula.selected.includes(item)),
        ...adNameFormula.order.filter(item => !adNameFormula.selected.includes(item))
      ]
    };

    const adAccountSettings = {
      defaultPage: selectedPage,
      defaultInstagram: selectedInstagram,
      links: links,
      defaultCTA,
      defaultUTMs: utmPairs,
      creativeEnhancements: enhancements,
      adNameFormula: reorganizedFormula
    };

    try {
      await saveSettings({
        adAccountId: selectedAdAccount,
        adAccountSettings,
      });

      setAdNameFormula(reorganizedFormula);
      toast.success("Updates saved!");

      const newInitialSettings = {
        defaultPage: selectedPage,
        defaultInstagram: selectedInstagram,
        links: links,
        defaultCTA,
        defaultUTMs: utmPairs,
        creativeEnhancements: enhancements,
        adNameFormula: reorganizedFormula
      };

      setInitialSettings(newInitialSettings);
      setIsDirty(false);
    } catch (err) {
      toast.error("Failed to save ad account settings: " + err.message);
    }
  }, [
    selectedAdAccount,
    adNameFormula,
    selectedPage,
    selectedInstagram,
    links,
    defaultCTA,
    utmPairs,
    enhancements
  ]);

  // Effect for floating button animation
  useEffect(() => {
    if (hasChanges && !mainButtonVisible) {
      setShowFloatingButton(true);
      setAnimateClass("floating-save-button-enter");
    } else if (showFloatingButton) {
      setAnimateClass("floating-save-button-exit");
      const timeoutId = setTimeout(() => setShowFloatingButton(false), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [hasChanges, mainButtonVisible, showFloatingButton]);

  // Auto-save links with debounce
  useEffect(() => {
    if (hasChanges && selectedAdAccount && initialSettings && Object.keys(initialSettings).length > 0) {
      const linksChanged = JSON.stringify(links) !== JSON.stringify(initialSettings.links);

      if (linksChanged) {

        handleSave();
        // toast.success("Links auto-saved!");


        return () => clearTimeout(timeoutId);
      }
    }
  }, [links]);


  // Effect for intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMainButtonVisible(entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    const mainSaveButton = document.getElementById("main-save-button");
    if (mainSaveButton) observer.observe(mainSaveButton);

    return () => {
      if (mainSaveButton) observer.unobserve(mainSaveButton);
    };
  }, []);

  // Effect for dirty state tracking
  useEffect(() => {
    setIsDirty(hasChanges);
  }, [hasChanges]);

  // Effect for loading initial settings
  useEffect(() => {
    if (!selectedAdAccount || !adSettings) return;

    const initial = calculateInitialSettings(adSettings);

    setSelectedPage(initial.defaultPage);
    setSelectedInstagram(initial.defaultInstagram);
    setLinks(initial.links);
    setUtmPairs(initial.defaultUTMs);
    setDefaultCTA(initial.defaultCTA);
    setEnhancements(initial.creativeEnhancements);
    setAdNameFormula(initial.adNameFormula);
    setInitialSettings(initial);
  }, [adSettings, selectedAdAccount, calculateInitialSettings]);

  return (
    <div className="space-y-6 w-full max-w-3xl">
      {/* Ad Account Dropdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-md font-medium text-gray-800">Select Ad Account</label>

          {/* Inline Add Ad Accounts Button with Dialog */}
          <Dialog open={isReauthOpen} onOpenChange={setIsReauthOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="text-sm text-white bg-blue-500 hover:bg-blue-600 hover:text-white rounded-xl"
              >
                <CirclePlus className="w-4 h-4 mr-1" />
                Add New Ad Accounts
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
                  <h3 className="text-sm font-semibold">Add New Ad Accounts</h3>
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
          />

          {/* Ad Naming Convention */}
          <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <LabelIcon alt="Ad Name Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
              <h3 className="font-medium text-[14px] text-zinc-950">
                Ad Name Formula
              </h3>
            </div>

            <p className="text-xs text-black text-gray-500">
              You can generate an ad name formula by selecting and re-ordering the properties below.
            </p>

            <ReorderAdNameParts
              order={adNameFormula.order}
              setOrder={handleOrderUpdate}
              values={adNameFormula.values}
              setValues={handleValuesUpdate}
              selectedItems={adNameFormula.selected}
              onItemToggle={handleItemToggle}
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

          <div className="pt-2">
            <Button
              id="main-save-button"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-[14px] h-[45px]"
              onClick={handleSave}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </fieldset>

      {showFloatingButton && (
        <div
          className={`fixed bottom-6 right-6 z-50 ${animateClass}`}
          style={{
            width: "300px",
            height: "50px",
            display: showFloatingButton || animateClass === "floating-save-button-exit" ? "block" : "none",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0px 4px 14px rgba(0,0,0,0.15)",
            padding: "4px",
          }}
        >
          <Button
            className="w-full h-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-xl"
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </div>
      )}
    </div>
  )
}