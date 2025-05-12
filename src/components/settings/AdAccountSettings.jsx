import { useEffect, useState } from "react"
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
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown } from "lucide-react"
import { useAppData } from "@/lib/AppContext"
import CopyTemplates from "./CopyTemplates"
import PageSelectors from "./PageSelectors"
import LinkParameters from "./LinkParameters"
import DefaultCTA from "./DefaultCTA"
import { toast } from "sonner"
import { saveSettings } from "@/lib/saveSettings"
import useAdAccountSettings from "@/lib/useAdAccountSettings";
import CreativeEnhancements from "./CreativeEnhancements";




export default function AdAccountSettings() {
  const { adAccounts, pages } = useAppData()
  const [selectedAdAccount, setSelectedAdAccount] = useState(null)
  const [openAdAccount, setOpenAdAccount] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedPage, setSelectedPage] = useState(null)
  const [openPageDropdown, setOpenPageDropdown] = useState(false)
  const [selectedInstagram, setSelectedInstagram] = useState(null)
  const [openInstagramDropdown, setOpenInstagramDropdown] = useState(false)
  const defaultPage = pages.find((page) => page.id && page.name)
  const defaultInstagram = pages.find((page) => page.instagramAccount)?.instagramAccount
  const { settings: adSettings, setSettings: setAdSettings } = useAdAccountSettings(selectedAdAccount);
  const [defaultLink, setDefaultLink] = useState("");
  const [utmPairs, setUtmPairs] = useState([]);
  const [defaultCTA, setDefaultCTA] = useState("Learn More");
  const [copyTemplates, setCopyTemplates] = useState({});
  const [enhancements, setEnhancements] = useState({
    overlay: false,
    visual: false,
    text: false,
    cta: false,
    brightness: false,
  });


  // const filteredAccounts = adAccounts.filter((acct) =>
  //   (acct.name?.toLowerCase() || "").includes(searchValue.toLowerCase()) ||
  //   acct.id.toLowerCase().includes(searchValue.toLowerCase())
  // );



  useEffect(() => {
    setSelectedPage(adSettings.defaultPage || null);
    setSelectedInstagram(adSettings.defaultInstagram || null);
    setDefaultLink(adSettings.defaultLink || "");
    setUtmPairs(
      Array.isArray(adSettings.defaultUTMs) && adSettings.defaultUTMs.length > 0
        ? adSettings.defaultUTMs
        : [
          { key: "utm_source", value: "" },
          { key: "utm_medium", value: "" },
          { key: "utm_campaign", value: "" },
          { key: "utm_content", value: "" },
          { key: "utm_term", value: "" }
        ]
    );
    setDefaultCTA(adSettings.defaultCTA || "LEARN_MORE");
    setCopyTemplates(adSettings.copyTemplates || {});
    setEnhancements(adSettings.creativeEnhancements || {
      overlay: false,
      visual: false,
      text: false,
      cta: false,
      brightness: false,
    });


  }, [adSettings]);


  return (
    <div className="space-y-6 w-full max-w-3xl">
      {/* Ad Account Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Select Ad Account</label>
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
                    .filter((acct) =>
                      (acct.name?.toLowerCase() || "").includes(searchValue.toLowerCase()) ||
                      acct.id.toLowerCase().includes(searchValue.toLowerCase())
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


      </div>
      <PageSelectors
        selectedPage={selectedPage}
        setSelectedPage={setSelectedPage}
        selectedInstagram={selectedInstagram}
        setSelectedInstagram={setSelectedInstagram}
      />

      <CopyTemplates
        selectedAdAccount={selectedAdAccount}
        copyTemplates={copyTemplates}
        setCopyTemplates={setCopyTemplates}
        defaultTemplateName={adSettings.defaultTemplateName}
        setDefaultTemplateName={(name) =>
          setAdSettings((prev) => ({ ...prev, defaultTemplateName: name }))
        }
      />

      <LinkParameters
        defaultLink={defaultLink}
        setDefaultLink={setDefaultLink}
        utmPairs={utmPairs}
        setUtmPairs={setUtmPairs}
      />
      <DefaultCTA defaultCTA={defaultCTA} setDefaultCTA={setDefaultCTA} />
      <CreativeEnhancements
        enhancements={enhancements}
        setEnhancements={setEnhancements}
      />

      <div className="pt-2">
        <Button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-[14px] h-[45px]"
          onClick={async () => {
            if (!selectedAdAccount) {
              alert("Select an Ad Account first");
              return;
            }
            const cleanedUTMs = utmPairs.filter(pair => pair.key && pair.value);
            const adAccountSettings = {
              defaultPage: selectedPage,
              defaultInstagram: selectedInstagram,
              defaultLink,
              defaultCTA,
              ...(cleanedUTMs.length > 0 && { defaultUTMs: cleanedUTMs }),
              creativeEnhancements: enhancements
            };

            try {
              await saveSettings({
                adAccountId: selectedAdAccount,
                adAccountSettings
              });
              toast.success("Ad account settings saved!");
            } catch (err) {
              toast.error("Failed to save ad account settings: " + err.message);
            }
          }}
        >
          Save Settings
        </Button>
      </div>
    </div>
  )
}
