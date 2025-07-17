"use client"

import { useEffect, useState } from "react"
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

export default function AdAccountSettings({ preselectedAdAccount }) {
  const { adAccounts, pages } = useAppData()
  const [selectedAdAccount, setSelectedAdAccount] = useState(preselectedAdAccount || null)
  const [openAdAccount, setOpenAdAccount] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedPage, setSelectedPage] = useState(null)
  //const [openPageDropdown, setOpenPageDropdown] = useState(false)
  const [selectedInstagram, setSelectedInstagram] = useState(null)
  //const [openInstagramDropdown, setOpenInstagramDropdown] = useState(false)
  const defaultPage = pages.find((page) => page.id && page.name)
  const defaultInstagram = pages.find((page) => page.instagramAccount)?.instagramAccount
  const { settings: adSettings, setSettings: setAdSettings, loading } = useAdAccountSettings(selectedAdAccount)
  const [defaultLink, setDefaultLink] = useState("")
  const [utmPairs, setUtmPairs] = useState([
    { key: "utm_source", value: "Value 1" },
    { key: "utm_medium", value: "Value 2" },
    { key: "utm_campaign", value: "Value 3" },
    { key: "utm_content", value: "Value 4" },
    { key: "utm_term", value: "Value 5" },
  ])

  const [defaultCTA, setDefaultCTA] = useState("Learn More")
  const [copyTemplates, setCopyTemplates] = useState({})
  const [enhancements, setEnhancements] = useState({
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
  })

  const [adNameFormula, setAdNameFormula] = useState({
    order: ["adType", "dateType", "fileName", "iteration"],
    selected: [],
    values: {
      dateType: "MonthYYYY",
      customTexts: {}
    }
  })

  const [isDirty, setIsDirty] = useState(false)
  const [initialSettings, setInitialSettings] = useState({})
  const [mainButtonVisible, setMainButtonVisible] = useState(false)
  const [showFloatingButton, setShowFloatingButton] = useState(false)
  const [animateClass, setAnimateClass] = useState("")
  const [isReauthOpen, setIsReauthOpen] = useState(false)

  const handleFacebookReauth = () => {
    setIsReauthOpen(false)
    window.location.href = "https://api.withblip.com/auth/facebook?state=settings"

  }


  useEffect(() => {
    if (isDirty && !mainButtonVisible) {
      setShowFloatingButton(true)
      setAnimateClass("floating-save-button-enter")
    } else if (showFloatingButton) {
      setAnimateClass("floating-save-button-exit")
      setTimeout(() => setShowFloatingButton(false), 300) // match exit duration
    }
  }, [isDirty, mainButtonVisible])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMainButtonVisible(entry.isIntersecting)
      },
      { threshold: 0.5 }, // adjust if needed
    )

    const mainSaveButton = document.getElementById("main-save-button")
    if (mainSaveButton) observer.observe(mainSaveButton)

    return () => {
      if (mainSaveButton) observer.unobserve(mainSaveButton)
    }
  }, [])

  useEffect(() => {
    if (!selectedAdAccount) return

    // Helper function to compare arrays of objects
    const normalize = (pairs) =>
      pairs
        .map(p => ({ key: String(p.key || ""), value: String(p.value || "") }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(p => `${p.key}:${p.value}`)
        .join("|")

    const areUtmPairsEqual = (pairs1, pairs2) =>
      normalize(pairs1) === normalize(pairs2)


    const hasChanges =
      selectedPage?.id !== initialSettings.defaultPage?.id ||
      selectedInstagram?.id !== initialSettings.defaultInstagram?.id ||
      defaultLink !== initialSettings.defaultLink ||
      defaultCTA !== initialSettings.defaultCTA ||
      !areUtmPairsEqual(utmPairs, initialSettings.defaultUTMs) ||
      JSON.stringify(enhancements) !== JSON.stringify(initialSettings.creativeEnhancements) ||
      JSON.stringify(adNameFormula) !== JSON.stringify(initialSettings.adNameFormula)  // ADD THIS LINE


    setIsDirty(hasChanges)
  }, [
    selectedPage,
    selectedInstagram,
    defaultLink,
    defaultCTA,
    utmPairs,
    enhancements,
    initialSettings,
    selectedAdAccount,
    adNameFormula  // ADD THIS TO DEPENDENCIES

  ])

  useEffect(() => {
    if (!selectedAdAccount) return

    const utms =
      Array.isArray(adSettings.defaultUTMs) && adSettings.defaultUTMs.length > 0
        ? adSettings.defaultUTMs
        : [
          { key: "utm_source", value: "facebook" },
          { key: "utm_medium", value: "paid" },
          { key: "utm_campaign", value: "{{campaign.name}}" },
          { key: "utm_content", value: "{{ad.name}}" },
          { key: "utm_term", value: "{{adset.name}}" },
        ]

    const formula = adSettings.adNameFormula || {};
    const initial = {
      defaultPage: adSettings.defaultPage || null,
      defaultInstagram: adSettings.defaultInstagram || null,
      defaultLink: adSettings.defaultLink || "",
      defaultCTA: adSettings.defaultCTA || "LEARN_MORE",
      defaultUTMs: utms,
      creativeEnhancements: adSettings.creativeEnhancements || {
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
      },
      adNameFormula: {
        order: formula.order || ["adType", "dateType", "fileName", "iteration"],
        selected: formula.selected || [],
        values: {
          dateType: formula.values?.dateType || "MonthYYYY",  // <-- Note the ?. here
          customTexts: formula.values?.customTexts || {}
        }
      }
    }

    setSelectedPage(initial.defaultPage)
    setSelectedInstagram(initial.defaultInstagram)
    setDefaultLink(initial.defaultLink)
    setUtmPairs(utms) // ⬅ override placeholder with real/default values
    setDefaultCTA(initial.defaultCTA)
    setEnhancements(initial.creativeEnhancements)
    setAdNameFormula({
      order: initial.adNameFormula.order || ["adType", "dateType", "fileName", "iteration"],
      selected: initial.adNameFormula.selected || [],
      values: {
        dateType: initial.adNameFormula.values?.dateType || "MonthYYYY",
        customTexts: initial.adNameFormula.values?.customTexts || {}
      }
    });
    // ADD THIS LINE
    setInitialSettings(initial)
  }, [adSettings, selectedAdAccount])


  return (
    <div className="space-y-6 w-full max-w-3xl">
      {/* Ad Account Dropdown */}
      <div className="space-y-2">
        {/* <label className="text-md font-medium text-gray-800">Select Ad Account</label>
        <p className="text-sm text-gray-500">Select an ad account to configure settings</p> */}
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
              <div className="text-left space-y-4 p-6 !rounded-xl" >
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
                  {adAccounts
                    .filter(
                      (acct) =>
                        (acct.name?.toLowerCase() || "").includes(searchValue.toLowerCase()) ||
                        acct.id.toLowerCase().includes(searchValue.toLowerCase()),
                    )
                    .map((acct) => (
                      <CommandItem
                        key={acct.id}
                        value={acct.id}
                        onSelect={() => {
                          setSelectedAdAccount(acct.id)
                          setOpenAdAccount(false)
                        }}
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

          <CopyTemplates selectedAdAccount={selectedAdAccount} adSettings={adSettings} setAdSettings={setAdSettings} />

          {/* Ad Naming Convention */}
          <div className="bg-[#f7f7f7] rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2">
              <img src="https://unpkg.com/@mynaui/icons/icons/label.svg" alt="Ad Name Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
              <h3 className="font-medium text-[14px] text-zinc-950">
                Ad Name Formula
              </h3>
            </div>

            <p className="text-xs text-black text-gray-500">
              You can generate an ad name formula by selecting and re-ordering the properties below.
            </p>

            <ReorderAdNameParts
              order={adNameFormula.order}
              setOrder={(newOrder) => setAdNameFormula(prev => ({ ...prev, order: newOrder }))}
              values={adNameFormula.values}
              setValues={(newValues) => setAdNameFormula(prev => ({ ...prev, values: newValues }))}
              selectedItems={adNameFormula.selected}
              onItemToggle={(item) => {
                setAdNameFormula(prev => ({
                  ...prev,
                  selected: prev.selected.includes(item)
                    ? prev.selected.filter(i => i !== item)
                    : [...prev.selected, item]
                }))
              }}
              variant="default"
            />
          </div>

          <LinkParameters
            defaultLink={defaultLink}
            setDefaultLink={setDefaultLink}
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
              onClick={async () => {
                if (!selectedAdAccount) {
                  alert("Select an Ad Account first")
                  return
                }
                //const cleanedUTMs = utmPairs.filter((pair) => pair.key && pair.value)
                const adAccountSettings = {
                  defaultPage: selectedPage,
                  defaultInstagram: selectedInstagram,
                  defaultLink,
                  defaultCTA,
                  defaultUTMs: utmPairs, // ✅ always include full list, even blank ones
                  creativeEnhancements: enhancements,
                  adNameFormula: adNameFormula // Add this line

                }

                try {
                  await saveSettings({
                    adAccountId: selectedAdAccount,
                    adAccountSettings,
                  })
                  toast.success("Ad account settings saved!")
                } catch (err) {
                  toast.error("Failed to save ad account settings: " + err.message)
                }
              }}
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
            //style={{ borderRadius: "12px" }}
            onClick={async () => {
              if (!selectedAdAccount) return
              //const cleanedUTMs = utmPairs.filter((pair) => pair.key && pair.value)
              const adAccountSettings = {
                defaultPage: selectedPage,
                defaultInstagram: selectedInstagram,
                defaultLink,
                defaultCTA,
                defaultUTMs: utmPairs, // ✅ always include full list, even blank ones
                creativeEnhancements: enhancements,
                adNameFormula: adNameFormula // Add this line

              }

              try {
                await saveSettings({
                  adAccountId: selectedAdAccount,
                  adAccountSettings,
                })
                toast.success("Ad account settings saved!")
                setInitialSettings(adAccountSettings)
                setIsDirty(false)
              } catch (err) {
                toast.error("Failed to save ad account settings: " + err.message)
              }
            }}
          >
            Save Settings
          </Button>
        </div>
      )}
    </div>
  )
}
