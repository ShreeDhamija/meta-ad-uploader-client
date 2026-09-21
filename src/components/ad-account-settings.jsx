"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, Check, ChevronsUpDown, RefreshCcw, X, CircleX, Loader, AlertTriangle, Ban, Pencil, CircleDollarSign, CalendarClock, Crosshair } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAuth } from "@/lib/AuthContext"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ScheduleDateTimePicker from "@/components/ui/ScheduleDateTimePicker"
import CogIcon from '@/assets/icons/cog.svg?react';
import AdAccountIcon from '@/assets/icons/adaccount.svg?react';
import CampaignIcon from '@/assets/icons/folder.svg?react';
import AdSetIcon from '@/assets/icons/grid.svg?react';
import CheckBlackIcon from '@/assets/icons/CheckBlack.svg?react';
import CopyIcon from '@/assets/icons/copy.svg?react';
import { useNavigate } from "react-router-dom"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
import { useAppData } from "@/lib/AppContext"


// Country IDs and display names from the supplied Meta targeting-search response.
const META_COUNTRIES = [{ "value": "AD", "label": "Andorra" }, { "value": "AE", "label": "United Arab Emirates" }, { "value": "AF", "label": "Afghanistan" }, { "value": "AG", "label": "Antigua" }, { "value": "AI", "label": "Anguilla" }, { "value": "AL", "label": "Albania" }, { "value": "AM", "label": "Armenia" }, { "value": "AN", "label": "Netherlands Antilles" }, { "value": "AO", "label": "Angola" }, { "value": "AQ", "label": "Antarctica" }, { "value": "AR", "label": "Argentina" }, { "value": "AS", "label": "American Samoa" }, { "value": "AT", "label": "Austria" }, { "value": "AU", "label": "Australia" }, { "value": "AW", "label": "Aruba" }, { "value": "AX", "label": "Åland Islands" }, { "value": "AZ", "label": "Azerbaijan" }, { "value": "BA", "label": "Bosnia and Herzegovina" }, { "value": "BB", "label": "Barbados" }, { "value": "BD", "label": "Bangladesh" }, { "value": "BE", "label": "Belgium" }, { "value": "BF", "label": "Burkina Faso" }, { "value": "BG", "label": "Bulgaria" }, { "value": "BH", "label": "Bahrain" }, { "value": "BI", "label": "Burundi" }, { "value": "BJ", "label": "Benin" }, { "value": "BL", "label": "Saint Barthélemy" }, { "value": "BM", "label": "Bermuda" }, { "value": "BN", "label": "Brunei" }, { "value": "BO", "label": "Bolivia" }, { "value": "BQ", "label": "Bonaire, Sint Eustatius and Saba" }, { "value": "BR", "label": "Brazil" }, { "value": "BS", "label": "The Bahamas" }, { "value": "BT", "label": "Bhutan" }, { "value": "BV", "label": "Bouvet Island" }, { "value": "BW", "label": "Botswana" }, { "value": "BY", "label": "Belarus" }, { "value": "BZ", "label": "Belize" }, { "value": "CA", "label": "Canada" }, { "value": "CC", "label": "Cocos (Keeling) Islands" }, { "value": "CD", "label": "Democratic Republic of the Congo" }, { "value": "CF", "label": "Central African Republic" }, { "value": "CG", "label": "Republic of the Congo" }, { "value": "CH", "label": "Switzerland" }, { "value": "CI", "label": "Côte d'Ivoire" }, { "value": "CK", "label": "Cook Islands" }, { "value": "CL", "label": "Chile" }, { "value": "CM", "label": "Cameroon" }, { "value": "CN", "label": "China" }, { "value": "CO", "label": "Colombia" }, { "value": "CR", "label": "Costa Rica" }, { "value": "CV", "label": "Cape Verde" }, { "value": "CW", "label": "Curaçao" }, { "value": "CX", "label": "Christmas Island" }, { "value": "CY", "label": "Cyprus" }, { "value": "CZ", "label": "Czech Republic" }, { "value": "DE", "label": "Germany" }, { "value": "DJ", "label": "Djibouti" }, { "value": "DK", "label": "Denmark" }, { "value": "DM", "label": "Dominica" }, { "value": "DO", "label": "Dominican Republic" }, { "value": "DZ", "label": "Algeria" }, { "value": "EC", "label": "Ecuador" }, { "value": "EE", "label": "Estonia" }, { "value": "EG", "label": "Egypt" }, { "value": "EH", "label": "Western Sahara" }, { "value": "ER", "label": "Eritrea" }, { "value": "ES", "label": "Spain" }, { "value": "ET", "label": "Ethiopia" }, { "value": "FI", "label": "Finland" }, { "value": "FJ", "label": "Fiji" }, { "value": "FK", "label": "Falkland Islands" }, { "value": "FM", "label": "Federated States of Micronesia" }, { "value": "FO", "label": "Faroe Islands" }, { "value": "FR", "label": "France" }, { "value": "GA", "label": "Gabon" }, { "value": "GB", "label": "United Kingdom" }, { "value": "GD", "label": "Grenada" }, { "value": "GE", "label": "Georgia" }, { "value": "GF", "label": "French Guiana" }, { "value": "GG", "label": "Guernsey" }, { "value": "GH", "label": "Ghana" }, { "value": "GI", "label": "Gibraltar" }, { "value": "GL", "label": "Greenland" }, { "value": "GM", "label": "The Gambia" }, { "value": "GN", "label": "Guinea" }, { "value": "GP", "label": "Guadeloupe" }, { "value": "GQ", "label": "Equatorial Guinea" }, { "value": "GR", "label": "Greece" }, { "value": "GS", "label": "South Georgia and the South Sandwich Islands" }, { "value": "GT", "label": "Guatemala" }, { "value": "GU", "label": "Guam" }, { "value": "GW", "label": "Guinea-Bissau" }, { "value": "GY", "label": "Guyana" }, { "value": "HK", "label": "Hong Kong" }, { "value": "HM", "label": "Heard Island and McDonald Islands" }, { "value": "HN", "label": "Honduras" }, { "value": "HR", "label": "Croatia" }, { "value": "HT", "label": "Haiti" }, { "value": "HU", "label": "Hungary" }, { "value": "ID", "label": "Indonesia" }, { "value": "IE", "label": "Ireland" }, { "value": "IL", "label": "Israel" }, { "value": "IM", "label": "Isle of Man" }, { "value": "IN", "label": "India" }, { "value": "IO", "label": "British Indian Ocean Territory" }, { "value": "IQ", "label": "Iraq" }, { "value": "IS", "label": "Iceland" }, { "value": "IT", "label": "Italy" }, { "value": "JE", "label": "Jersey" }, { "value": "JM", "label": "Jamaica" }, { "value": "JO", "label": "Jordan" }, { "value": "JP", "label": "Japan" }, { "value": "KE", "label": "Kenya" }, { "value": "KG", "label": "Kyrgyzstan" }, { "value": "KH", "label": "Cambodia" }, { "value": "KI", "label": "Kiribati" }, { "value": "KM", "label": "Comoros" }, { "value": "KN", "label": "Saint Kitts and Nevis" }, { "value": "KR", "label": "South Korea" }, { "value": "KW", "label": "Kuwait" }, { "value": "KY", "label": "Cayman Islands" }, { "value": "KZ", "label": "Kazakhstan" }, { "value": "LA", "label": "Laos" }, { "value": "LB", "label": "Lebanon" }, { "value": "LC", "label": "St. Lucia" }, { "value": "LI", "label": "Liechtenstein" }, { "value": "LK", "label": "Sri Lanka" }, { "value": "LR", "label": "Liberia" }, { "value": "LS", "label": "Lesotho" }, { "value": "LT", "label": "Lithuania" }, { "value": "LU", "label": "Luxembourg" }, { "value": "LV", "label": "Latvia" }, { "value": "LY", "label": "Libya" }, { "value": "MA", "label": "Morocco" }, { "value": "MC", "label": "Monaco" }, { "value": "MD", "label": "Moldova" }, { "value": "ME", "label": "Montenegro" }, { "value": "MF", "label": "Saint Martin" }, { "value": "MG", "label": "Madagascar" }, { "value": "MH", "label": "Marshall Islands" }, { "value": "MK", "label": "Macedonia" }, { "value": "ML", "label": "Mali" }, { "value": "MM", "label": "Myanmar (Burma)" }, { "value": "MN", "label": "Mongolia" }, { "value": "MO", "label": "Macau" }, { "value": "MP", "label": "Northern Mariana Islands" }, { "value": "MQ", "label": "Martinique" }, { "value": "MR", "label": "Mauritania" }, { "value": "MS", "label": "Montserrat" }, { "value": "MT", "label": "Malta" }, { "value": "MU", "label": "Mauritius" }, { "value": "MV", "label": "Maldives" }, { "value": "MW", "label": "Malawi" }, { "value": "MX", "label": "Mexico" }, { "value": "MY", "label": "Malaysia" }, { "value": "MZ", "label": "Mozambique" }, { "value": "NA", "label": "Namibia" }, { "value": "NC", "label": "New Caledonia" }, { "value": "NE", "label": "Niger" }, { "value": "NF", "label": "Norfolk Island" }, { "value": "NG", "label": "Nigeria" }, { "value": "NI", "label": "Nicaragua" }, { "value": "NL", "label": "Netherlands" }, { "value": "NO", "label": "Norway" }, { "value": "NP", "label": "Nepal" }, { "value": "NR", "label": "Nauru" }, { "value": "NU", "label": "Niue" }, { "value": "NZ", "label": "New Zealand" }, { "value": "OM", "label": "Oman" }, { "value": "PA", "label": "Panama" }, { "value": "PE", "label": "Peru" }, { "value": "PF", "label": "French Polynesia" }, { "value": "PG", "label": "Papua New Guinea" }, { "value": "PH", "label": "Philippines" }, { "value": "PK", "label": "Pakistan" }, { "value": "PL", "label": "Poland" }, { "value": "PM", "label": "Saint Pierre and Miquelon" }, { "value": "PN", "label": "Pitcairn" }, { "value": "PR", "label": "Puerto Rico" }, { "value": "PS", "label": "Palestine" }, { "value": "PT", "label": "Portugal" }, { "value": "PW", "label": "Palau" }, { "value": "PY", "label": "Paraguay" }, { "value": "QA", "label": "Qatar" }, { "value": "RE", "label": "Réunion" }, { "value": "RO", "label": "Romania" }, { "value": "RS", "label": "Serbia" }, { "value": "RU", "label": "Russia" }, { "value": "RW", "label": "Rwanda" }, { "value": "SA", "label": "Saudi Arabia" }, { "value": "SB", "label": "Solomon Islands" }, { "value": "SC", "label": "Seychelles" }, { "value": "SE", "label": "Sweden" }, { "value": "SG", "label": "Singapore" }, { "value": "SH", "label": "Saint Helena" }, { "value": "SI", "label": "Slovenia" }, { "value": "SJ", "label": "Svalbard and Jan Mayen" }, { "value": "SK", "label": "Slovakia" }, { "value": "SL", "label": "Sierra Leone" }, { "value": "SM", "label": "San Marino" }, { "value": "SN", "label": "Senegal" }, { "value": "SO", "label": "Somalia" }, { "value": "SR", "label": "Suriname" }, { "value": "SS", "label": "South Sudan" }, { "value": "ST", "label": "São Tomé and Príncipe" }, { "value": "SV", "label": "El Salvador" }, { "value": "SX", "label": "Sint Maarten" }, { "value": "SY", "label": "Syria" }, { "value": "SZ", "label": "Eswatini" }, { "value": "TC", "label": "Turks and Caicos Islands" }, { "value": "TD", "label": "Chad" }, { "value": "TF", "label": "French Southern Territories" }, { "value": "TG", "label": "Togo" }, { "value": "TH", "label": "Thailand" }, { "value": "TJ", "label": "Tajikistan" }, { "value": "TK", "label": "Tokelau" }, { "value": "TL", "label": "Timor-Leste" }, { "value": "TM", "label": "Turkmenistan" }, { "value": "TN", "label": "Tunisia" }, { "value": "TO", "label": "Tonga" }, { "value": "TR", "label": "Türkiye" }, { "value": "TT", "label": "Trinidad and Tobago" }, { "value": "TV", "label": "Tuvalu" }, { "value": "TW", "label": "Taiwan" }, { "value": "TZ", "label": "Tanzania" }, { "value": "UA", "label": "Ukraine" }, { "value": "UG", "label": "Uganda" }, { "value": "UM", "label": "United States Minor Outlying Islands" }, { "value": "US", "label": "United States" }, { "value": "UY", "label": "Uruguay" }, { "value": "UZ", "label": "Uzbekistan" }, { "value": "VA", "label": "Vatican City" }, { "value": "VC", "label": "Saint Vincent and the Grenadines" }, { "value": "VE", "label": "Venezuela" }, { "value": "VG", "label": "British Virgin Islands" }, { "value": "VI", "label": "US Virgin Islands" }, { "value": "VN", "label": "Vietnam" }, { "value": "VU", "label": "Vanuatu" }, { "value": "WF", "label": "Wallis and Futuna" }, { "value": "WS", "label": "Samoa" }, { "value": "XK", "label": "Kosovo" }, { "value": "YE", "label": "Yemen" }, { "value": "YT", "label": "Mayotte" }, { "value": "ZA", "label": "South Africa" }, { "value": "ZM", "label": "Zambia" }, { "value": "ZW", "label": "Zimbabwe" }];

// Add constant
const ADVANTAGE_PLUS_TYPES = ["AUTOMATED_SHOPPING_ADS", "SMART_APP_PROMOTION"];
const DROPDOWN_MAX_WIDTH = "min(calc(100vw - 2rem), 850px)";
const dropdownContentStyle = {
  minWidth: "var(--radix-popover-trigger-width)",
  width: "max-content",
  maxWidth: DROPDOWN_MAX_WIDTH,
};

function SettingsMultiSelect({ label, options, value, onChange, placeholder, flags = false, allLabel, checkboxes = false }) {
  const [open, setOpen] = useState(false);
  const allSelected = Boolean(allLabel) && (value.length === 0 || options.every((option) => value.includes(option.value)));
  const selectedValues = allSelected ? [] : value;
  const flag = (code) => flags && /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0))) + " " : "";
  const selected = value.map((id) => options.find((option) => option.value === id)?.label || "Unavailable audience");
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open}
            className="h-11 w-full justify-between rounded-2xl bg-white py-2 hover:!bg-white text-left font-normal">
            <span className="truncate">{allSelected ? allLabel : selected.length ? selected.join(", ") : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto max-w-[min(calc(100vw-2rem),850px)] p-0 bg-white shadow-lg rounded-2xl"
          align="start" sideOffset={4} side="bottom" avoidCollisions={false} style={dropdownContentStyle}>
          <Command loop={false} className="rounded-2xl bg-white">
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`}
              className="bg-transparent" wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]" />
            <CommandList className="max-h-none overflow-hidden rounded-2xl px-2" selectOnFocus={false}>
              <CommandEmpty>No results found.</CommandEmpty>
              <ScrollArea viewportClassName="max-h-[500px] [&>div]:!block">
                <CommandGroup>
                  {allLabel && <CommandItem value={allLabel} className={cn(
                    "py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                    allSelected ? "bg-gray-100 hover:!bg-gray-100 font-semibold" : "hover:!bg-gray-200",
                  )} onSelect={() => onChange([])}>
                    <span>{allLabel}</span>
                  </CommandItem>}
                  {options.map((option) => (
                    <CommandItem key={option.value} value={`${option.label} ${option.value}`} className={cn(
                      "py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                      selectedValues.includes(option.value) ? "bg-gray-100 hover:!bg-gray-100 font-semibold" : "hover:!bg-gray-200",
                    )}
                      onSelect={() => onChange(selectedValues.includes(option.value) ? selectedValues.filter((id) => id !== option.value) : [...selectedValues, option.value])}>
                      {checkboxes && <Checkbox
                        checked={selectedValues.includes(option.value)}
                        onCheckedChange={(checked) => onChange(checked ? [...selectedValues, option.value] : selectedValues.filter((id) => id !== option.value))}
                        onClick={(event) => event.stopPropagation()}
                        tabIndex={-1}
                        aria-label={option.label}
                        className="h-4 w-4 rounded-[6px] border-gray-300 bg-white p-0 data-[state=checked]:bg-black data-[state=checked]:text-white"
                      />}
                      <span className={flags ? "flex-1" : undefined}>{flag(option.value)}{option.label}</span>
                      {flags && <Check className={cn("ml-auto h-4 w-4 shrink-0", selectedValues.includes(option.value) ? "opacity-100" : "opacity-0")} />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const DETAILED_TARGETING_FIELDS = ["interests", "behaviors", "work_employers", "work_positions", "education_schools", "education_majors", "family_statuses", "life_events", "industries", "income", "generation", "home_ownership", "home_type", "home_value", "household_composition", "moms", "net_worth", "office_type", "politics", "ethnic_affinity", "education_statuses", "relationship_statuses", "college_years", "interested_in"];
const GEO_TARGETING_FIELDS = ["countries", "regions", "cities", "zips", "geo_markets", "electoral_districts", "neighborhoods", "subcities", "subneighborhoods", "metro_areas", "large_geo_areas", "medium_geo_areas", "small_geo_areas"];
const TARGETING_CATEGORIES = { interest: "Interest", behavior: "Behavior", demographic: "Demographic", location: "Location", locale: "Language", employer: "Employer", job_title: "Job title", school: "School", education_major: "Education major", custom_audience: "Custom audience", lookalike: "Lookalike" };
const detailedCategory = (field) => ({ interests: "interest", behaviors: "behavior", work_employers: "employer", work_positions: "job_title", education_schools: "school", education_majors: "education_major" })[field] || "demographic";
const targetingOption = (field, value, placement, category, name) => {
  const id = String(value?.id ?? value?.key ?? value);
  return { ...(typeof value === "object" ? value : {}), key: `${category}:${field}:${id}`, category, id,
    name: name || value?.name || `Saved ${TARGETING_CATEGORIES[category]?.toLowerCase() || "selection"}`,
    targeting: { placement, field, value } };
};

const targetingIdentity = ({ targeting: { placement, field, value } }) => `${placement}:${field}:${value?.id ?? value?.key ?? value}`;

function TargetingPicker({ label = "Search targeting", adAccountId, value, onToggle, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [searched, setSearched] = useState(false);
  const requestRef = useRef(null);
  const searchRowRef = useRef(null);
  const resultsRef = useRef(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!open || disabled) { requestRef.current?.abort(); setLoading(false); }
  }, [open, disabled]);
  const search = async () => {
    if (disabled || loading || query.replace(/\s/gu, "").length < 3) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setOpen(true);
    setLoading(true);
    setError("");
    setWarnings([]);
    setSearched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/meta/ad-accounts/${encodeURIComponent(adAccountId)}/targeting-search?${new URLSearchParams({ q: query.trim(), limit: "25" })}`, { credentials: "include", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not search targeting.");
      if (!controller.signal.aborted) { setResults(data.data || []); setWarnings(data.warnings || []); }
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  const displayedOptions = [...new Map([...value, ...results].map((option) => [targetingIdentity(option), option])).values()];
  const toggle = onToggle;
  const audienceSize = (size) => size == null ? "Not provided" : Number(size).toLocaleString();
  return <div className="space-y-2">
    <Label>{label}</Label>
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={searchRowRef} className="flex items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input value={query} disabled={disabled} maxLength={100} placeholder="Search interests, behaviors, locations..." aria-label={`Search ${label.toLowerCase()}`}
              aria-expanded={open && !disabled} aria-haspopup="listbox"
              onFocus={() => { if (searched || value.length) setOpen(true); }}
              onChange={(event) => {
                requestRef.current?.abort(); setLoading(false); setQuery(event.target.value); setResults([]); setError(""); setWarnings([]); setSearched(false); setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); search(); }
                if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
                if (event.key === "ArrowDown" && (searched || value.length)) {
                  event.preventDefault(); setOpen(true); requestAnimationFrame(() => resultsRef.current?.focus());
                }
              }}
              className="h-11 rounded-[20px] border-gray-200 bg-gray-50 pl-9" />
          </div>
          <Button type="button" size="sm" disabled={disabled || loading || query.replace(/\s/gu, "").length < 3} onClick={search}
            className="h-11 shrink-0 rounded-[20px] px-4">Search</Button>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-auto p-0 bg-white shadow-lg rounded-2xl" style={{ minWidth: "var(--radix-popover-trigger-width)", width: "max(var(--radix-popover-trigger-width), min(480px, calc(100vw - 2rem)))", maxWidth: "calc(100vw - 2rem)" }} align="start" side="bottom" sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => { if (searchRowRef.current?.contains(event.target)) event.preventDefault(); }}>
        <Command ref={resultsRef} tabIndex={-1} shouldFilter={false} loop={false} className="rounded-2xl bg-white">
          <CommandList className="max-h-none overflow-hidden rounded-2xl px-2" selectOnFocus={false}>
            {loading ? <p role="status" className="p-3 text-sm text-gray-500">Searching...</p>
              : error ? <p role="alert" className="p-3 text-sm text-red-600">{error}</p>
                : (!searched || !results.length) && <p className="p-3 text-sm text-gray-500">{searched ? "No targeting options found." : "Type at least 3 characters, then press Enter or Search."}</p>}
            {warnings.length > 0 && <p role="status" className="px-3 pb-2 text-xs text-amber-700">Some results may be missing: {warnings.map(({ source, message }) => `${TARGETING_CATEGORIES[source] || source}: ${message}`).join("; ")}</p>}
            <ScrollArea viewportClassName="max-h-[380px] [&>div]:!block">
              <CommandGroup>
                {displayedOptions.map((interest) => {
                  const selected = value.some((option) => targetingIdentity(option) === targetingIdentity(interest));
                  return <CommandItem key={interest.key} value={interest.key} onSelect={() => toggle(interest)}
                    className={cn("items-start py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150", selected ? "bg-gray-100 hover:!bg-gray-100" : "hover:!bg-gray-200")}>
                    <Checkbox checked={selected} onCheckedChange={() => toggle(interest)} onClick={(event) => event.stopPropagation()} tabIndex={-1} aria-label={interest.name}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-[6px] border-gray-300 bg-white p-0 data-[state=checked]:bg-black data-[state=checked]:text-white" />
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{interest.name}</p>
                      <p className="text-xs text-gray-600">{TARGETING_CATEGORIES[interest.category]}{interest.path?.length ? ` · ${interest.path.join(" › ")}` : ""}</p>
                      {interest.description?.trim() && <p className="text-xs text-gray-500 line-clamp-2" title={interest.description}>{interest.description}</p>}
                      {interest.topic && <p className="text-xs text-gray-600">Topic: {interest.topic}</p>}
                      {(interest.audience_size_lower_bound != null || interest.audience_size_upper_bound != null) && <p className="text-xs text-gray-600">Audience: {audienceSize(interest.audience_size_lower_bound)} – {audienceSize(interest.audience_size_upper_bound)}</p>}
                      {interest.deliveryStatus && <p className="text-xs text-gray-500">{interest.deliveryStatus}</p>}
                    </div>
                  </CommandItem>;
                })}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {value.length > 0 && <div className="flex flex-wrap gap-1.5">{value.map((interest) => <button key={interest.key} type="button" disabled={disabled}
      onClick={() => toggle(interest)} aria-label={`Remove ${interest.name}`}
      className="inline-flex max-w-full items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-50">
      <span className="truncate">{interest.name}</span><X className="h-3 w-3 shrink-0" />
    </button>)}</div>}
  </div>;
}

export function getAdSetAdvancedSettingsError(settings) {
  const { defaults, changes = {} } = settings || {};
  if (!defaults) return null;
  const validAmount = (value, decimals) => new RegExp(`^\\d+${decimals ? `(?:\\.\\d{1,${decimals}})?` : ""}$`).test(String(value)) && Number(value) > 0 && Number.isSafeInteger(Math.round(Number(value) * 10 ** decimals));
  if (changes.bidValue !== undefined) {
    const control = defaults.bidControl;
    if (!control?.editable || changes.bidStrategy !== control.strategy) return "The bidding setup changed. Reopen Edit setup before publishing.";
    if (!validAmount(changes.bidValue, control.roas ? 4 : defaults.budget.decimals)) return `Enter a valid ${control.label.toLowerCase()} in Edit setup to publish.`;
    if (control.roas && (Number(changes.bidValue) < 0.01 || Number(changes.bidValue) > 1000)) return "Target ROAS must be between 0.01 and 1000.";
  }
  if (changes.spendLimits) {
    if (defaults.budget.level !== "campaign") return "Ad set spend limits require a campaign budget.";
    if (changes.spendLimitBudgetMode !== defaults.budget.mode) return "The campaign budget type changed. Reopen Edit setup.";
    const limits = { ...defaults.spendLimits, ...changes.spendLimits };
    for (const limit of Object.values(changes.spendLimits)) {
      if (!["currency", "percentage"].includes(limit.unit)) return "Select a valid spend-limit unit.";
      if (limit.value === "") continue;
      if (limit.unit === "percentage") {
        if (!/^\d+$/.test(String(limit.value)) || Number(limit.value) < 1 || Number(limit.value) > 100) return "Spend percentages must be whole numbers from 1 to 100, or empty for no limit.";
      } else if (!validAmount(limit.value, defaults.budget.decimals)) return `Enter a positive ${defaults.budget.currency} spend limit with at most ${defaults.budget.decimals} decimal places, or leave it empty for no limit.`;
    }
    const toCurrency = (limit) => limit?.unit === "percentage" ? Number(limit.value) * Number(defaults.budget.amount) / 100 : Number(limit?.value || 0);
    const min = toCurrency(limits.min);
    const max = toCurrency(limits.max);
    if (min > Number(defaults.budget.amount) || max > Number(defaults.budget.amount)) return "Spend limits cannot exceed the campaign budget.";
    if (min && max && min >= max) return "Minimum spend must be lower than the maximum spend limit.";
  }
  const available = defaults.minimumSpendAvailability;
  const minimum = changes.spendLimits?.min ?? defaults.spendLimits?.min;
  if (available && minimum?.value !== "" && minimum?.value != null) {
    const exceeds = minimum.unit === "percentage"
      ? Number(minimum.value) > available.maxPercentage
      : Number(minimum.value) > Number(available.remainingAmount);
    if (exceeds) return `Minimum spend exceeds the campaign's remaining minimum-spend allocation. Use at most ${available.maxPercentage}% or ${defaults.budget.currency} ${available.remainingAmount}, or clear the minimum.`;
  }
  return null;
}

function NewAdSetSettingsEditor({ adSetId, campaignId, adAccountId, value, onChange, disabled }) {
  const [expanded, setExpanded] = useState(Boolean(value));
  const [selectedTargetingGroup, setSelectedTargetingGroup] = useState(null);
  const reduceMotion = useReducedMotion();
  const settingsRequestRef = useRef(null);
  const latestSettingsRef = useRef(value);
  latestSettingsRef.current = value;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const defaults = value?.defaults;
  useEffect(() => {
    if (!expanded || (defaults && Object.prototype.hasOwnProperty.call(defaults, "spendLimits") && Object.prototype.hasOwnProperty.call(defaults, "minimumSpendAvailability") && defaults.interestsResolved) || disabled) return;
    const controller = new AbortController();
    settingsRequestRef.current = controller;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ adSetId, campaignId, adAccountId });
    fetch(`${API_BASE_URL}/auth/adset-copy-settings?${params}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load ad set settings.");
        if (!controller.signal.aborted) onChange({ sourceAdSetId: adSetId, campaignId, adAccountId, defaults: { ...data, spendLimits: data.spendLimits ?? null, minimumSpendAvailability: data.minimumSpendAvailability ?? null, interestsResolved: true }, changes: latestSettingsRef.current?.changes || {} });
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => {
      controller.abort();
      if (settingsRequestRef.current === controller) settingsRequestRef.current = null;
    };
  }, [expanded, defaults, disabled, adSetId, campaignId, adAccountId, onChange, reload]);

  const changes = value?.changes || {};
  const targeting = defaults?.targeting || {};
  const field = (key, fallback) => changes[key] ?? fallback;
  const update = (key, next) => onChange({ ...value, changes: { ...changes, [key]: next } });
  const audiences = [...new Map([...(targeting.excluded_custom_audiences || []), ...(targeting.custom_audiences || []), ...(targeting.flexible_spec || []).flatMap((group) => group.custom_audiences || []), ...(defaults?.audiences || []), ...Object.values(value?.targetingLabels || {}).filter((option) => ["custom_audience", "lookalike"].includes(option.category))]
    .map((audience) => [audience.id, { value: audience.id, label: audience.name || "Unavailable audience" }])).values()];
  const countryOptions = [...META_COUNTRIES];
  for (const code of targeting.geo_locations?.countries || []) {
    if (!countryOptions.some((option) => option.value === code)) {
      let name = "Unavailable country";
      try { name = new Intl.DisplayNames(["en"], { type: "region" }).of(code); } catch { /* Keep an existing country removable. */ }
      countryOptions.push({ value: code, label: name });
    }
  }
  const minAge = field("ageMin", targeting.age_min ?? targeting.age_range?.[0] ?? 18);
  const maxAge = field("ageMax", targeting.age_max ?? targeting.age_range?.[1] ?? 65);
  const advantageAudience = Number(targeting.targeting_automation?.advantage_audience) === 1;
  const ageError = advantageAudience
    ? "Advantage+ audience requires a minimum age from 18 to 25 and a maximum age of 65."
    : "Use whole ages from 13 to 65, with minimum age no higher than maximum age.";
  const ageInvalid = [minAge, maxAge].some((age) => age === "" || !Number.isInteger(Number(age)) || age < 13 || age > 65) || Number(minAge) > Number(maxAge)
    || (advantageAudience && (Number(minAge) < 18 || Number(minAge) > 25 || Number(maxAge) !== 65));
  // Validate on blur so typing a two-digit age is not blocked by its first digit.
  const validateAge = (key) => {
    const age = Number(key === "ageMin" ? minAge : maxAge);
    const lower = advantageAudience ? (key === "ageMin" ? 18 : 65) : 13;
    const upper = advantageAudience && key === "ageMin" ? 25 : 65;
    if (!Number.isInteger(age) || age < lower || age > upper || Number(minAge) > Number(maxAge)) {
      toast.error(ageError);
      const sourceAge = Number(key === "ageMin" ? targeting.age_min ?? 18 : targeting.age_max ?? 65);
      update(key, String(Math.min(upper, Math.max(lower, sourceAge))));
    }
  };
  const advancedError = getAdSetAdvancedSettingsError(value);
  const spendLimits = { ...defaults?.spendLimits, ...changes.spendLimits };
  const spendUnits = [...new Set(Object.values(spendLimits).filter((limit) => limit.value !== "").map((limit) => limit.unit))];
  const spendUnit = spendUnits.length > 1 ? "mixed" : spendUnits[0] || Object.values(changes.spendLimits || {})[0]?.unit || "currency";
  const updateSpendLimit = (side, limit) => onChange({ ...value, changes: {
    ...changes, spendLimits: { ...changes.spendLimits, [side]: limit }, spendLimitBudgetMode: defaults.budget.mode,
  } });
  const changeSpendUnit = (unit) => {
    const converted = Object.fromEntries(["min", "max"].map((side) => {
      const limit = spendLimits[side];
      let amount = limit?.value || "";
      if (amount !== "" && limit.unit !== unit) {
        const campaignBudget = Number(defaults.budget.amount);
        const convertedAmount = unit === "percentage" ? Number(amount) / campaignBudget * 100 : Number(amount) / 100 * campaignBudget;
        amount = String(Number(convertedAmount.toFixed(unit === "percentage" ? 2 : defaults.budget.decimals)));
      }
      return [side, { unit, value: amount }];
    }));
    onChange({ ...value, changes: { ...changes, spendLimits: converted, spendLimitBudgetMode: defaults.budget.mode } });
  };

  const includedAudienceIds = [...new Set([
    ...field("includedAudienceIds", (targeting.custom_audiences || []).map(({ id }) => id)),
    ...(targeting.flexible_spec || []).flatMap((group, index) => changes.targetingGroups?.[index]?.includedAudienceIds ?? (group.custom_audiences || []).map(({ id }) => id)),
  ])];
  const updateIncludedAudiences = (next, targetingLabels = value?.targetingLabels) => {
    const added = next.filter((id) => !includedAudienceIds.includes(id));
    const rootIds = field("includedAudienceIds", (targeting.custom_audiences || []).map(({ id }) => id));
    const groupIds = (targeting.flexible_spec || []).map((group, index) => changes.targetingGroups?.[index]?.includedAudienceIds ?? (group.custom_audiences || []).map(({ id }) => id));
    const sourceRootIds = (targeting.custom_audiences || []).map(({ id }) => id);
    const sourceGroupIds = (targeting.flexible_spec || []).map((group) => (group.custom_audiences || []).map(({ id }) => id));
    const destination = sourceRootIds.length || rootIds.length ? -1 : sourceGroupIds.findIndex((ids) => ids.length);
    const additionsFor = (index) => added.filter((id) => {
      const originalGroup = sourceGroupIds.findIndex((ids) => ids.includes(id));
      return (sourceRootIds.includes(id) ? -1 : originalGroup !== -1 ? originalGroup : destination) === index;
    });
    const nextChanges = { ...changes, targetingGroups: { ...changes.targetingGroups } };
    const rootNext = [...rootIds.filter((id) => next.includes(id)), ...additionsFor(-1)];
    if (JSON.stringify(rootNext) !== JSON.stringify(rootIds)) nextChanges.includedAudienceIds = rootNext;
    groupIds.forEach((ids, index) => {
      const groupNext = [...ids.filter((id) => next.includes(id)), ...additionsFor(index)];
      if (JSON.stringify(groupNext) !== JSON.stringify(ids)) nextChanges.targetingGroups[index] = { ...nextChanges.targetingGroups[index], includedAudienceIds: groupNext };
    });
    if (!Object.keys(nextChanges.targetingGroups).length) delete nextChanges.targetingGroups;
    onChange({ ...value, targetingLabels, changes: nextChanges });
  };
  const targetingGroupIndexes = [...new Set([...(targeting.flexible_spec || []).map((_, index) => String(index)), ...Object.keys(changes.targetingGroups || {})])].sort((a, b) => Number(a) - Number(b));
  const detailedValues = (index) => {
    const source = index === "root" ? targeting : targeting.flexible_spec?.[Number(index)] || {};
    const edit = index === "root" ? changes : changes.targetingGroups?.[index] || {};
    return { ...source, ...(edit.interests !== undefined ? { interests: edit.interests } : {}), ...edit.detailedTargeting };
  };
  const hasRootTargeting = DETAILED_TARGETING_FIELDS.some((field) => detailedValues("root")[field]?.length);
  const groupChoices = [...(hasRootTargeting || !targetingGroupIndexes.length ? ["root"] : []), ...targetingGroupIndexes];
  const activeTargetingGroup = groupChoices.includes(selectedTargetingGroup) ? selectedTargetingGroup : groupChoices[0];
  const resolvedOption = (option) => ({ ...option, ...value?.targetingLabels?.[option.key], targeting: option.targeting });
  const selectedTargeting = DETAILED_TARGETING_FIELDS.flatMap((field) => (detailedValues(activeTargetingGroup)[field] || []).map((item) =>
    resolvedOption(targetingOption(field, item, "detailed_targeting", detailedCategory(field)))));
  for (const fieldName of GEO_TARGETING_FIELDS) {
    const items = fieldName === "countries" ? field("countries", targeting.geo_locations?.countries || []) : changes.locations?.[fieldName] ?? targeting.geo_locations?.[fieldName] ?? [];
    for (const item of items) selectedTargeting.push(resolvedOption(targetingOption(fieldName, item, "geo_locations", "location", fieldName === "countries" ? countryOptions.find(({ value }) => value === item)?.label : undefined)));
  }
  for (const item of changes.locales ?? targeting.locales ?? []) selectedTargeting.push(resolvedOption(targetingOption("locales", item, "locales", "locale")));
  for (const id of includedAudienceIds) {
    const known = Object.values(value?.targetingLabels || {}).find((item) => ["custom_audience", "lookalike"].includes(item.category) && item.id === id);
    selectedTargeting.push(known || targetingOption("custom_audiences", { id }, "custom_audience", "custom_audience", audiences.find(({ value }) => value === id)?.label));
  }
  const toggleTargeting = (option) => {
    const { placement, field: fieldName, value: item } = option.targeting;
    const targetingLabels = { ...value?.targetingLabels, [option.key]: option };
    if (placement === "custom_audience") {
      updateIncludedAudiences(includedAudienceIds.includes(option.id) ? includedAudienceIds.filter((id) => id !== option.id) : [...includedAudienceIds, option.id], targetingLabels);
      return;
    }
    const nextChanges = { ...changes };
    const identity = (entry) => String(entry?.id ?? entry?.key ?? entry);
    const toggle = (items) => items.some((entry) => identity(entry) === identity(item)) ? items.filter((entry) => identity(entry) !== identity(item)) : [...items, item];
    if (placement === "detailed_targeting") {
      const next = toggle(detailedValues(activeTargetingGroup)[fieldName] || []);
      if (next.length > 1000) { toast.error("Select up to 1,000 values per targeting field."); return; }
      if (activeTargetingGroup === "root") {
        nextChanges.detailedTargeting = { ...changes.detailedTargeting, [fieldName]: next };
        if (fieldName === "interests") delete nextChanges.interests;
      } else {
        const edit = { ...changes.targetingGroups?.[activeTargetingGroup] };
        edit.detailedTargeting = { ...edit.detailedTargeting, [fieldName]: next };
        if (fieldName === "interests") delete edit.interests;
        nextChanges.targetingGroups = { ...changes.targetingGroups, [activeTargetingGroup]: edit };
      }
    } else if (placement === "locales") nextChanges.locales = toggle(changes.locales ?? targeting.locales ?? []);
    else if (placement === "geo_locations") {
      if (fieldName === "countries") nextChanges.countries = toggle(field("countries", targeting.geo_locations?.countries || []));
      else nextChanges.locations = { ...changes.locations, [fieldName]: toggle(changes.locations?.[fieldName] ?? targeting.geo_locations?.[fieldName] ?? []) };
    }
    onChange({ ...value, targetingLabels, changes: nextChanges });
  };
  const addTargetingGroup = () => {
    const index = targetingGroupIndexes.length ? Number(targetingGroupIndexes.at(-1)) + 1 : 0;
    if (index + (hasRootTargeting ? 1 : 0) >= 25) { toast.error("Use at most 25 targeting groups."); return; }
    onChange({ ...value, changes: { ...changes, ...(hasRootTargeting ? { groupRootTargeting: true } : {}), targetingGroups: { ...changes.targetingGroups, [index]: { detailedTargeting: {} } } } });
    setSelectedTargetingGroup(String(index));
  };
  const startTime = field("startTime", defaults?.startTime || "");
  const endTime = field("endTime", defaults?.endTime || "");
  return (
    <fieldset disabled={disabled} className="mt-2 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={disabled} aria-expanded={expanded} onClick={() => setExpanded(true)}
          title="Edit setup"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black disabled:opacity-50">
          <CogIcon className="h-3.5 w-3.5" /> Edit setup
        </button>
        {expanded && <div className="flex items-center gap-3">
          <button type="button" disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
            onClick={() => { settingsRequestRef.current?.abort(); onChange(null); setExpanded(false); setError(""); setLoading(false); }}>
            <CircleX className="h-3.5 w-3.5" aria-hidden="true" />Discard
          </button>
          <button type="button" disabled={disabled || !defaults}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black disabled:opacity-50"
            onClick={() => { setSelectedTargetingGroup(null); onChange({ ...value, targetingLabels: {}, changes: {} }); }}>
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />Reset
          </button>
        </div>}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div key="ad-set-setup" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeInOut" }} className="overflow-hidden">
            <div className="mt-3 space-y-5 rounded-2xl border border-gray-200 bg-white p-4">
              {loading && <p role="status" className="flex items-center gap-2 text-sm text-gray-500"><Loader className="h-4 w-4 animate-spin" />Loading ad set settings...</p>}
              {error && <div role="alert" className="text-sm text-red-600">{error} <button type="button" className="underline" onClick={() => setReload(reload + 1)}>Retry</button></div>}
              {defaults && <>
                <section className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold"><CircleDollarSign className="h-4 w-4 shrink-0" aria-hidden="true" />Budget</h4>
                  {defaults.budget.level === "campaign" ? (
                    <p className="text-sm font-medium">{defaults.budget.mode === "lifetime" ? "Lifetime" : "Daily"} budget is set on campaign level</p>
                  ) : <>
                    <Label htmlFor="new-adset-budget">{defaults.budget.mode === "lifetime" ? "Lifetime" : "Daily"} budget ({defaults.budget.currency})</Label>
                    <Input id="new-adset-budget" type="number" min={defaults.budget.decimals ? "0.01" : "1"} step={defaults.budget.decimals ? "0.01" : "1"}
                      value={field("budgetAmount", defaults.budget.amount)}
                      onChange={(event) => update("budgetAmount", event.target.value)} className="border-gray-400 rounded-2xl" />
                  </>}
                  {defaults.bidControl && <div className="space-y-2 pt-2">
                    <Label htmlFor="new-adset-bid">{defaults.bidControl.label} ({defaults.bidControl.roas ? "×" : defaults.budget.currency})</Label>
                    <Input id="new-adset-bid" type="text" inputMode="decimal"
                      value={field("bidValue", defaults.bidControl.value)} disabled={!defaults.bidControl.editable}
                      onChange={(event) => onChange({ ...value, changes: { ...changes, bidValue: event.target.value, bidStrategy: defaults.bidControl.strategy } })}
                      onBlur={() => { if (advancedError) toast.error(advancedError); }} className="border-gray-400 rounded-2xl" />
                    {!defaults.bidControl.editable && <p className="text-xs text-gray-500">This control cannot be edited with the current campaign and optimization setup.</p>}
                  </div>}
                  {defaults.budget.level === "campaign" && defaults.spendLimits && <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{defaults.budget.mode === "daily" ? "Daily" : "Lifetime"} ad set spend limits</p>
                      <Select value={spendUnit} disabled={disabled} onValueChange={changeSpendUnit}>
                        <SelectTrigger aria-label="Ad set spend limits unit" className="h-9 w-24 shrink-0 rounded-xl bg-white py-2"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl bg-white shadow-lg">
                          <SelectItem value="currency" className="rounded-xl">{defaults.budget.currency}</SelectItem>
                          <SelectItem value="percentage" className="rounded-xl">%</SelectItem>
                          {spendUnit === "mixed" && <SelectItem value="mixed" disabled className="rounded-xl">Mixed</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    {[["min", "Minimum spend target"], ["max", "Maximum spend limit"]].map(([side, label]) => {
                      const limit = spendLimits[side];
                      const unit = spendUnit === "mixed" ? limit.unit : spendUnit;
                      return <div key={side} className="space-y-2">
                        <Label htmlFor={`new-adset-spend-${side}`}>{label}{spendUnit === "mixed" ? ` (${unit === "percentage" ? "%" : defaults.budget.currency})` : ""}</Label>
                        <div className="flex items-center gap-2">
                          <Input id={`new-adset-spend-${side}`} type="text" inputMode={unit === "percentage" ? "numeric" : "decimal"} value={limit.value}
                            placeholder="No limit" className="min-w-0 rounded-2xl border-gray-400"
                            onChange={(event) => updateSpendLimit(side, { unit, value: event.target.value })}
                            onBlur={() => { if (advancedError) toast.error(advancedError); }} />
                          {limit.value !== "" && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} title="Clear limit"
                            className="shrink-0 text-gray-500 hover:text-black" onClick={() => updateSpendLimit(side, { unit, value: "" })}>
                            <CircleX className="h-4 w-4" />
                          </button>}
                        </div>
                      </div>;
                    })}
                    {defaults.minimumSpendAvailability && <p className="text-xs text-gray-500">
                      Available for this ad set’s minimum: {defaults.minimumSpendAvailability.maxPercentage}% or {defaults.budget.currency} {defaults.minimumSpendAvailability.remainingAmount}.
                      {defaults.minimumSpendAvailability.missingAbsoluteAmounts > 0 && " Some existing absolute minimums were not returned; Meta will validate the final limit."}
                    </p>}
                    <p className="text-xs text-gray-500">Leave empty for no limit. Switching units converts using the current campaign budget. Percentages must be whole numbers.</p>
                  </div>}
                  {advancedError && <p role="alert" className="text-xs text-red-600">{advancedError}</p>}

                </section>
                <section className="space-y-3 border-t pt-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />Schedule</h4>
                  <p className="text-xs text-gray-500">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}. {defaults.timezone && `Ad account: ${defaults.timezone}.`}</p>
                  <ScheduleDateTimePicker label="Start time" value={startTime || null} onChange={(time) => update("startTime", time)} onClear={() => update("startTime", "")} />
                  {(!startTime || Date.parse(startTime) <= Date.now()) && <p className="text-xs text-gray-500">The new ad set will start when launched unless you choose a future start time.</p>}
                  <ScheduleDateTimePicker label={defaults.budget.mode === "lifetime" ? "End time (required)" : "End time (optional)"} value={endTime || null}
                    minDateTime={startTime && Date.parse(startTime) > Date.now() ? startTime : null}
                    onChange={(time) => update("endTime", time)} onClear={() => update("endTime", "")} />
                  {endTime && Date.parse(endTime) <= Date.now() && <p className="text-xs text-amber-700">The source ad set has ended. Choose a new end time{defaults.budget.mode === "daily" ? " or clear it for ongoing delivery" : ""}.</p>}
                  {defaults.hasRecurringSchedule && <p className="text-xs text-gray-500">The source’s recurring delivery hours will be retained.</p>}
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold"><Crosshair className="h-4 w-4 shrink-0" aria-hidden="true" />Targeting</h4>
                  {defaults.specialAdCategories.filter((category) => category !== "NONE").length > 0 && <p className="text-xs text-amber-700">This campaign has special ad categories. Meta may restrict age, gender, and location targeting.</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="new-adset-age-min">Minimum age</Label><Input id="new-adset-age-min" type="number" min={advantageAudience ? 18 : 13} max={advantageAudience ? 25 : 65} step="1" value={minAge} onChange={(event) => update("ageMin", event.target.value)} onBlur={() => validateAge("ageMin")} /></div>
                    <div className="space-y-2"><Label htmlFor="new-adset-age-max">Maximum age</Label><Input id="new-adset-age-max" type="number" min={advantageAudience ? 65 : 13} max="65" step="1" value={maxAge} onChange={(event) => update("ageMax", event.target.value)} onBlur={() => validateAge("ageMax")} /></div>
                  </div>
                  {ageInvalid && <p role="alert" className="text-xs text-red-600">{ageError}</p>}
                  <SettingsMultiSelect label="Gender" options={[{ value: 1, label: "Men" }, { value: 2, label: "Women" }]} value={field("genders", targeting.genders || [])} onChange={(next) => update("genders", next.length === 2 ? [] : next)} placeholder="Both" allLabel="Both" />
                  <SettingsMultiSelect label="Countries" options={countryOptions} value={field("countries", targeting.geo_locations?.countries || [])} onChange={(next) => update("countries", next)} placeholder="No country selection" flags />
                  {Object.keys(targeting.geo_locations || {}).some((key) => !["countries", "location_types"].includes(key)) && <p className="text-xs text-gray-500">Other source locations are retained. Use targeting search below to edit supported locations.</p>}
                  <SettingsMultiSelect label="Included audiences" options={audiences} value={includedAudienceIds} onChange={updateIncludedAudiences} placeholder="No included audiences" checkboxes />
                  <SettingsMultiSelect label="Excluded audiences" options={audiences} value={field("excludedAudienceIds", (targeting.excluded_custom_audiences || []).map((audience) => audience.id))} onChange={(next) => update("excludedAudienceIds", next)} placeholder="No excluded audiences" checkboxes />
                  {defaults.interestDetailsUnavailable && <p className="text-xs text-gray-500">Some interest details could not be loaded. Existing selections are still shown and can be removed.</p>}
                  <div className="flex items-center justify-between gap-2">
                    {groupChoices.length > 1 ? <Select value={activeTargetingGroup} onValueChange={setSelectedTargetingGroup} disabled={disabled}>
                      <SelectTrigger aria-label="Detailed targeting group" className="h-9 w-auto min-w-0 rounded-xl bg-white py-2"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl bg-white shadow-lg">{groupChoices.map((index, order) => <SelectItem key={index} value={index} className="rounded-xl">{`Group ${order + 1}${order ? " · AND" : ""}`}</SelectItem>)}</SelectContent>
                    </Select> : <Label>Detailed targeting</Label>}
                    <button type="button" className="text-xs text-gray-600 underline" onClick={addTargetingGroup}>Narrow further (AND)</button>
                  </div>
                  <TargetingPicker adAccountId={adAccountId} value={selectedTargeting} onToggle={toggleTargeting} disabled={disabled} />
                  <p className="text-xs text-gray-500">Detailed targeting selections within a group are alternatives; separate groups must also match. Locations and languages apply across groups. Existing audiences retain their source grouping.</p>

                </section>
              </>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
}

export default function AdAccountSettings({

  isLoading,
  setIsLoading,
  isLoadingAdSets,
  adAccounts,
  setAdAccounts,
  selectedAdAccount,
  setSelectedAdAccount,
  adAccountsLoading,
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
  shareNewAdSet = true,
  setShareNewAdSet,
  newAdSetName,
  setNewAdSetName,
  newAdSetSettings,
  setNewAdSetSettings,
  showDuplicateCampaignBlock,
  setShowDuplicateCampaignBlock,
  duplicateCampaign,
  setDuplicateCampaign,
  newCampaignName,
  setNewCampaignName,
  documentExists,
  refreshAdSets,
  sortAdSets,
  sortCampaigns,
  useExistingPosts,
  setUseExistingPosts,
  usePostID,
  importedPosts = [],
  editAdCreativeMode,
  enterEditAdCreativeMode,
  exitEditAdCreativeMode,
  isFormFieldModified,
  variants = [],
  activeVariantId = 'default'

}) {
  const isSplitAdDataEnabled = variants.length > 1;
  const sharedAdSetLocked = shareNewAdSet && isSplitAdDataEnabled && showDuplicateBlock && activeVariantId !== "default";
  const renderDiffMark = (fieldKeys) => (
    isFormFieldModified?.(fieldKeys) ? <span className="text-red-500 font-semibold">*</span> : null
  );
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
  const [isLoadingAdSetsLocal, setIsLoadingAdSetsLocal] = useState(false);
  const [isLoadingEditCreative, setIsLoadingEditCreative] = useState(false);
  const [campaignCopyErrors, setCampaignCopyErrors] = useState(null);
  const [showCampaignCopyErrors, setShowCampaignCopyErrors] = useState(false);
  const visibleCampaignCopyErrors = campaignCopyErrors?.adAccountId === selectedAdAccount && selectedCampaign.includes(campaignCopyErrors.campaignId)
    ? campaignCopyErrors.failures : [];
  const groupedCampaignCopyErrors = useMemo(() => {
    const groups = new Map();
    for (const failure of campaignCopyErrors?.failures || []) {
      const message = failure.error?.trim() || "Failed to copy ad set";
      if (!groups.has(message)) groups.set(message, []);
      groups.get(message).push(failure);
    }
    return [...groups.entries()];
  }, [campaignCopyErrors]);
  const { refetchAdAccounts } = useAppData()

  const handleEditCreativeClick = useCallback(async () => {
    if (editAdCreativeMode) {
      exitEditAdCreativeMode();
      return;
    }

    setIsLoadingEditCreative(true);
    try {
      await enterEditAdCreativeMode();
    } finally {
      setIsLoadingEditCreative(false);
    }
  }, [editAdCreativeMode, enterEditAdCreativeMode, exitEditAdCreativeMode]);



  const selectedCampaignData = useMemo(() =>
    campaigns.filter(c => selectedCampaign.includes(c.id)),
    [campaigns, selectedCampaign]
  );

  useEffect(() => {
    if (campaigns.length === 0) return;
    const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
    const validCampaigns = selectedCampaign.filter((id) => campaignIds.has(id));
    if (validCampaigns.length === selectedCampaign.length) return;
    setSelectedCampaign(validCampaigns);
    setSelectedAdSets([]);
    setAdSets([]);
    setCampaignObjective(validCampaigns.map((id) => campaigns.find((campaign) => campaign.id === id)?.objective).filter(Boolean));
  }, [campaigns, selectedCampaign, setAdSets, setCampaignObjective, setSelectedAdSets, setSelectedCampaign]);

  useEffect(() => {
    if (adSets.length === 0 && selectedCampaign.length > 0) return;
    const adSetIds = new Set(adSets.map((adSet) => adSet.id));
    setSelectedAdSets((prev) => prev.every((id) => adSetIds.has(id)) ? prev : prev.filter((id) => adSetIds.has(id)));
  }, [adSets, selectedCampaign.length, setSelectedAdSets]);

  const selectedDuplicateCampaignData = useMemo(
    () => campaigns.find((campaign) => campaign.id === duplicateCampaign) || null,
    [campaigns, duplicateCampaign]
  );

  const isAdvantagePlusCampaign = useMemo(() =>
    selectedCampaignData.some((campaign) =>
      ADVANTAGE_PLUS_TYPES.includes(campaign.smart_promotion_type)
    ),
    [selectedCampaignData]
  );

  const isDuplicateCampaignDeprecated = useMemo(() =>
    ADVANTAGE_PLUS_TYPES.includes(selectedDuplicateCampaignData?.smart_promotion_type),
    [selectedDuplicateCampaignData]
  );
  const isAdSetSelectionBlockedByCampaignCreation = showDuplicateCampaignBlock;


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

  const visibleAdSetIds = useMemo(
    () => filteredAdSets.map((adset) => adset.id),
    [filteredAdSets]
  );

  const selectedVisibleAdSetCount = useMemo(
    () => visibleAdSetIds.filter((id) => selectedAdSets.includes(id)).length,
    [visibleAdSetIds, selectedAdSets]
  );

  const areAllVisibleAdSetsSelected =
    visibleAdSetIds.length > 0 && selectedVisibleAdSetCount === visibleAdSetIds.length;





  const handleAdAccountChange = useCallback(async (value) => {
    const adAccountId = value
    setSelectedAdAccount(adAccountId)
    setCampaigns([])
    setAdSets([])
    setSelectedCampaign([])
    setSelectedAdSets([])

    // Clear duplicate ad set state
    setShowDuplicateBlock(false)
    setDuplicateAdSet("")
    setNewAdSetName("")

    // Clear duplicate campaign state
    setShowDuplicateCampaignBlock(false)
    setDuplicateCampaign("")
    setNewCampaignName("")

    // Clear campaign objective
    setCampaignObjective([])

    if (!adAccountId) return

    setIsAdAccountChanging(true);
    setIsLoadingCampaigns(true);
    setIsLoading(true)

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${adAccountId}`,
          { credentials: "include" },
        )
        const data = await res.json()
        if (data.campaigns) {
          const sortedCampaigns = sortCampaigns(data.campaigns);
          setCampaigns(sortedCampaigns);
        }
        break; // Success - exit the retry loop
      } catch (err) {
        if (attempt === maxRetries) {
          // Last attempt failed
          toast.error(`Failed to fetch campaigns: ${err.message || "Unknown error occurred"}`)
          console.error("Failed to fetch campaigns:", err)
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    setIsLoading(false)
    setIsAdAccountChanging(false);
    setIsLoadingCampaigns(false);

  }, [])

  const handleCampaignChange = useCallback(async (campaignId) => {
    // Toggle campaign selection
    const currentCampaigns = selectedCampaign.filter((id) => campaigns.some((campaign) => campaign.id === id));
    const isSelected = currentCampaigns.includes(campaignId);
    let newSelectedCampaigns;

    if (isSelected) {
      newSelectedCampaigns = currentCampaigns.filter(id => id !== campaignId);
    } else {
      newSelectedCampaigns = [...currentCampaigns, campaignId];
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
    // setIsLoading(true);
    setIsLoadingAdSetsLocal(true);

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
      // setIsLoading(false);
      setIsLoadingAdSetsLocal(false);

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

  const handleSelectAllVisibleAdSets = useCallback(() => {
    if (visibleAdSetIds.length === 0) return;

    if (areAllVisibleAdSetsSelected) {
      const visibleIds = new Set(visibleAdSetIds);
      setSelectedAdSets((prev) => prev.filter((id) => !visibleIds.has(id)));
      return;
    }

    setSelectedAdSets((prev) => Array.from(new Set([...prev, ...visibleAdSetIds])));
    if (showDuplicateBlock) {
      setShowDuplicateBlock(false);
      setDuplicateAdSet("");
      setNewAdSetName("");
    }
  }, [
    areAllVisibleAdSetsSelected,
    setDuplicateAdSet,
    setNewAdSetName,
    setSelectedAdSets,
    setShowDuplicateBlock,
    showDuplicateBlock,
    visibleAdSetIds,
  ]);




  const refreshAdAccounts = async () => {
    try {
      await refetchAdAccounts()
      toast.success("Ad accounts refreshed successfully!")
    } catch (err) {
      toast.error(`Failed to fetch ad accounts: ${err.message || "Unknown error"}`)
    }
  }


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
        toast.error("No campaigns found.");
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

    if (isDuplicateCampaignDeprecated) {
      toast.error("Facebook has deprecated Advantage+ Shopping Campaigns and Advantage+ App Campaigns, so they can't be duplicated anymore.");
      return;
    }

    setCampaignCopyErrors(null);
    setShowCampaignCopyErrors(false);
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
        if (data.failed_adsets?.length) {
          setCampaignCopyErrors({ adAccountId: selectedAdAccount, campaignId: data.copied_campaign_id, failures: data.failed_adsets });
          toast.warning("Campaign created, but some ad sets could not be copied.");
        } else {
          toast.success("Campaign duplicated successfully!");
        }

        // Reset the duplicate campaign block
        setShowDuplicateCampaignBlock(false);
        setDuplicateCampaign("");
        setNewCampaignName("");


        await refreshCampaigns();
        setSelectedCampaign([data.copied_campaign_id]);
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
  }, [duplicateCampaign, isDuplicateCampaignDeprecated, newCampaignName, refreshCampaigns, selectedAdAccount, setAdSets, setDuplicateCampaign, setIsLoading, setNewCampaignName, setSelectedAdSets, setSelectedCampaign, setShowDuplicateCampaignBlock, sortAdSets]);


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

    <Card className="!bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CogIcon className="w-5 h-5" />
            Ad Account Configuration
          </div>
        </CardTitle>
        <CardDescription>Select your ad account, campaign and ad set</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="adAccount" className="flex items-center gap-2">
                {renderDiffMark("selectedAdAccount")}
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
            {(() => {
              const isAdAccountLocked = variants.length > 1 && activeVariantId !== 'default';
              const triggerButton = (
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={!isLoggedIn || isLoading || isAdAccountLocked}
                  className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white"
                >
                  {selectedAdAccount
                    ? adAccounts.find((acct) => acct.id === selectedAdAccount)?.name || selectedAdAccount
                    : "Select an Ad Account"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              );

              if (isAdAccountLocked) {
                return (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block w-full">{triggerButton}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ad account can only be changed from the default variant.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return (
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    {triggerButton}
                  </PopoverTrigger>
                  <PopoverContent
                    className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                    align="start"
                    sideOffset={4}
                    side="bottom"
                    avoidCollisions={false}
                    style={{
                      minWidth: "var(--radix-popover-trigger-width)",
                      width: "auto",
                      maxWidth: "var(--radix-popover-trigger-width)",

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
                        className="bg-transparent"
                        wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                      />
                      {/* <CommandEmpty>No ad account found.</CommandEmpty> */}
                      <CommandList className="max-h-[500px] overflow-y-auto rounded-2xl custom-scrollbar" selectOnFocus={false}>
                        {(isLoadingAdAccounts || adAccountsLoading) ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-500">
                            <Loader className="h-4 w-4 animate-spin" />
                            Fetching ad accounts...
                          </div>
                        ) : (
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
                                    "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                    "data-[selected=true]:bg-gray-100",
                                    selectedAdAccount === acct.id && "bg-gray-100 rounded-2xl font-semibold",
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
                        )}
                      </CommandList>
                    </Command>

                  </PopoverContent>
                </Popover>
              );
            })()}
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
                {renderDiffMark("selectedCampaign")}
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
                  disabled={!isLoggedIn || !selectedAdAccount || isLoadingCampaigns || (selectedAdAccount && campaigns.length === 0)}
                  className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow overflow-hidden whitespace-nowrap hover:!bg-white"
                >
                  <div className="w-full overflow-hidden flex items-center gap-2">
                    {isLoadingCampaigns ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span className="block truncate flex-1 text-left text-gray-500">Fetching campaigns...</span>
                      </>
                    ) : (
                      <span
                        className="block truncate flex-1 text-left"
                        title={
                          selectedCampaignData.length === 1
                            ? selectedCampaignData[0].name
                            : undefined
                        }
                      >
                        {selectedAdAccount && campaigns.length === 0
                          ? "No campaigns exist in this ad account. Try selecting a different account."
                          : selectedCampaignData.length === 0
                            ? "Select campaigns"
                            : selectedCampaignData.length === 1
                              ? selectedCampaignData[0].name || selectedCampaignData[0].id
                              : `${selectedCampaignData.length} campaigns selected`}
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto max-w-[min(calc(100vw-2rem),850px)] p-0 bg-white shadow-lg rounded-2xl"
                align="start"
                sideOffset={4}
                side="bottom"
                avoidCollisions={false}
                style={dropdownContentStyle}
              >
                <Command loop={false}>
                  <CommandInput
                    placeholder="Search campaigns..."
                    value={campaignSearchValue}
                    onValueChange={setCampaignSearchValue}
                    className="bg-transparent"
                    wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                  />
                  <CommandEmpty>No campaigns exist in this ad account. Try selecting a different account.</CommandEmpty>
                  <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                    <ScrollArea viewportClassName="max-h-[500px]">
                      <CommandGroup>
                        {filteredCampaigns.map((camp) => {
                          const isSelected = selectedCampaign.includes(camp.id);
                          return (
                            <CommandItem
                              key={camp.id}
                              value={camp.name || camp.id}
                              onSelect={() => handleCampaignChange(camp.id)}
                              className="px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150"
                            >
                              <div className="flex items-center gap-2 w-full min-w-0">
                                <Checkbox
                                  id={`campaign-${camp.id}`}
                                  checked={isSelected}
                                  className="p-0 w-4 h-4 aspect-square bg-white border border-gray-300 rounded-[6px]"
                                >
                                  <Checkbox.Indicator>
                                    <Check className="w-3 h-3 text-green-500" />
                                  </Checkbox.Indicator>
                                </Checkbox>
                                <Label className={cn("min-w-0 flex-1 cursor-pointer flex items-center justify-between", camp.status !== "ACTIVE" && "text-gray-400")}>
                                  <span className="min-w-0 truncate leading-[1.25]" title={camp.name || camp.id}>{camp.name || camp.id}</span>
                                  {camp.status === "ACTIVE" && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                                  )}
                                </Label>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </ScrollArea>
                  </CommandList>
                  {/* Launch in a New Campaign Button */}
                  <div className="p-2 border-t border-gray-200">
                    <Button
                      onClick={() => {
                        setShowDuplicateCampaignBlock(true);
                        setSelectedAdSets([]);
                        setShowDuplicateBlock(false);
                        setDuplicateAdSet("");
                        setNewAdSetName("");
                        setOpenCampaign(false);
                        setOpenAdSet(false);
                      }}
                      // className="w-full justify-start text-left font-normal bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl"
                      className={`
h-10 w-full px-4 py-3 m-1 rounded-2xl 
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
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 relative mt-2">
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
                    {renderDiffMark("duplicateCampaign")}
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
                        className="w-full justify-between border border-gray-400 rounded-2xl bg-white shadow overflow-hidden whitespace-nowrap hover:!bg-white"
                      >
                        <div className="w-full overflow-hidden">
                          <span
                            className="block truncate flex-1 text-left"
                            title={
                              duplicateCampaign
                                ? campaigns.find((campaign) => campaign.id === duplicateCampaign)?.name || duplicateCampaign
                                : undefined
                            }
                          >
                            {duplicateCampaign
                              ? campaigns.find((campaign) => campaign.id === duplicateCampaign)?.name || duplicateCampaign
                              : "Select campaign to duplicate"}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto max-w-[min(calc(100vw-2rem),850px)] p-0 bg-white shadow-lg rounded-2xl"
                      align="start"
                      sideOffset={4}
                      side="bottom"
                      avoidCollisions={false}
                      style={dropdownContentStyle}
                    >
                      <Command loop={false}>
                        <CommandInput
                          placeholder="Search campaign..."
                          value={duplicateCampaignSearchValue}
                          onValueChange={setDuplicateCampaignSearchValue}
                          className="bg-transparent"
                          wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                        />
                        <CommandEmpty>No campaigns exist in this ad account. Try selecting a different account.</CommandEmpty>
                        <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                          <ScrollArea viewportClassName="max-h-[500px]">
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
                                      setNewCampaignName(`${campaign.name || campaign.id}_Copy`);
                                      setOpenDuplicateCampaign(false);
                                    }}
                                    className={cn(
                                      "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                      campaign.status !== "ACTIVE" && "text-gray-400"
                                    )}
                                  >
                                    <div className="flex justify-between items-center w-full min-w-0">
                                      <span className="min-w-0 truncate" title={campaign.name || campaign.id}>{campaign.name || campaign.id}</span>
                                      {campaign.status === "ACTIVE" && (
                                        <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </ScrollArea>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* New Campaign Name Input */}
                  {duplicateCampaign && (
                    <div className="space-y-2" style={{ marginTop: '8px' }}>
                      <Label htmlFor="newCampaignName" className="inline-flex items-center gap-1">
                        {renderDiffMark("newCampaignName")}
                        <span>New campaign name</span>
                      </Label>
                      <Input
                        id="newCampaignName"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        placeholder="Enter new campaign name..."
                        className="border border-gray-400 rounded-2xl bg-white shadow"
                        disabled={!isLoggedIn}
                      />

                      {/* Duplicate Button */}

                      <Button
                        onClick={duplicateCampaignFunction}
                        disabled={!isLoggedIn || !duplicateCampaign || isLoading || isDuplicateCampaignDeprecated}
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
                      {isDuplicateCampaignDeprecated && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            Facebook has deprecated Advantage+ Shopping Campaigns and Advantage+ App Campaigns so they can&apos;t be duplicated anymore.
                          </span>
                        </div>
                      )}
                      {variants && variants.length > 1 && (
                        <Label className="text-gray-500 text-[12px] font-regular block mt-2">
                          You only need to create the campaign in the default variant.
                        </Label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {visibleCampaignCopyErrors.length > 0 && <>
            <div role="alert" className="flex items-center gap-2 text-xs text-red-600 text-left p-2 bg-red-50 border border-red-200 rounded-xl">
              <span className="min-w-0 flex-1">
                {visibleCampaignCopyErrors.length} ad {visibleCampaignCopyErrors.length === 1 ? "set didn’t" : "sets didn’t"} get copied due to errors.{" "}
                <button type="button" className="underline underline-offset-2" onClick={() => setShowCampaignCopyErrors(true)}>View errors</button>
              </span>
              <button type="button" aria-label="Dismiss campaign copy errors" className="shrink-0 hover:text-red-800"
                onClick={() => { setCampaignCopyErrors(null); setShowCampaignCopyErrors(false); }}>
                <CircleX className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <Dialog open={showCampaignCopyErrors} onOpenChange={setShowCampaignCopyErrors}>
              <DialogContent disableSlide overlayClassName="bg-black/35"
                className="w-[min(36rem,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto rounded-[28px] border-gray-200 bg-white p-6 shadow-xl sm:rounded-[28px]">
                <DialogHeader className="pr-6">
                  <DialogTitle>Ad sets that couldn’t be copied</DialogTitle>
                  <DialogDescription>The campaign was created. These ad sets could not be added to it.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {groupedCampaignCopyErrors.map(([message, failures]) => (
                    <div key={message} className="space-y-3 rounded-2xl border border-gray-200 p-4">
                      <ul className="space-y-1 text-sm font-medium text-gray-900">
                        {failures.map((failure) => <li key={failure.id} className="break-words">{failure.name || failure.id}</li>)}
                      </ul>
                      <p className="whitespace-pre-wrap break-words text-sm text-red-600">{message}</p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </>}

          <div className="space-y-2 ">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {renderDiffMark(["selectedAdSets", "duplicateAdSet", "newAdSetName"])}
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
            <Popover
              open={isAdSetSelectionBlockedByCampaignCreation ? false : openAdSet}
              onOpenChange={(nextOpen) => {
                if (!isAdSetSelectionBlockedByCampaignCreation) setOpenAdSet(nextOpen)
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openAdSet}
                  disabled={isAdSetSelectionBlockedByCampaignCreation || !isLoggedIn || selectedCampaign.length === 0 || isLoadingAdSetsLocal || (selectedCampaign.length > 0 && adSets.length === 0)}
                  className={cn(
                    "w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white",
                    isAdSetSelectionBlockedByCampaignCreation && "cursor-not-allowed bg-gray-50 text-gray-400 hover:bg-gray-50"
                  )}
                >
                  <div className="w-full overflow-hidden flex items-center gap-2">
                    {isAdSetSelectionBlockedByCampaignCreation ? (
                      <span className="block truncate flex-1 text-left text-gray-400">
                        Finish Creating Campaign to select an ad set
                      </span>
                    ) : isLoadingAdSetsLocal ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span className="block truncate flex-1 text-left text-gray-500">Fetching ad sets...</span>
                      </>
                    ) : (
                      <span className="block truncate flex-1 text-left">
                        {showDuplicateBlock
                          ? "New Ad Set"
                          : selectedCampaign.length > 0 && adSets.length === 0
                            ? "No ad sets exist in this campaign. Select a different campaign"
                            : selectedAdSets.length > 0
                              ? `${selectedAdSets.length} AdSet${selectedAdSets.length > 1 ? "s" : ""} selected`
                              : "Select Ad Sets"}
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto max-w-[min(calc(100vw-2rem),850px)] p-0 bg-white shadow-lg rounded-2xl"
                align="start"
                sideOffset={4}
                side="bottom"
                avoidCollisions={false}
                style={dropdownContentStyle}
              >
                <Command loop={false}>
                  <CommandInput
                    placeholder="Search AdSets..."
                    value={adSetSearchValue}
                    onValueChange={setAdSetSearchValue}
                    className="bg-transparent"
                    wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                  />
                  <CommandEmpty>No ad sets exist in this campaign. Select a different campaign</CommandEmpty>
                  <CommandList className="max-h-none overflow-hidden rounded-2xl px-2" selectOnFocus={false}>
                    {/* Kept outside the ScrollArea so the scrollbar doesn't overlap it */}
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
                          h-10 w-full px-4 py-3 m-1 rounded-2xl
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
                    <ScrollArea viewportClassName="max-h-[500px] [&>div]:!block">
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

                            return (
                              <>
                                {filteredAdSets.length > 1 && (
                                  <CommandItem
                                    key="select-all-visible-adsets"
                                    value="select-all-visible-adsets"
                                    forceMount
                                    onSelect={handleSelectAllVisibleAdSets}
                                    className={cn(
                                      "py-2 cursor-pointer m-1 rounded-2xl bg-gray-100 text-xs transition-colors duration-150 hover:!bg-gray-100",
                                      areAllVisibleAdSetsSelected && "font-semibold",
                                    )}
                                  >
                                    <div className="flex items-center space-x-2 w-full min-w-0">
                                      <Checkbox
                                        id="select-all-visible-adsets"
                                        checked={areAllVisibleAdSetsSelected}
                                        className="p-0 w-4 h-4 aspect-square bg-white border border-gray-300 rounded-[6px]"
                                      >
                                        <Checkbox.Indicator>
                                          <Check className="w-3 h-3 text-green-500" />
                                        </Checkbox.Indicator>
                                      </Checkbox>
                                      <Label className="min-w-0 flex-1 cursor-pointer flex items-center justify-between text-xs">
                                        <span className="min-w-0 truncate leading-[1.25]">Select all</span>
                                      </Label>
                                    </div>
                                  </CommandItem>
                                )}
                                {Object.entries(groupedByCampaign).map(([campaignId, campaignAdSets]) => {
                                  const campaignName = campaignAdSets[0]?.campaignName || campaignId;

                                  return (
                                    <div key={campaignId}>
                                      {/* Campaign separator */}
                                      {selectedCampaign.length >= 2 && (
                                        <div
                                          className="px-4 py-2 mx-1 mb-1 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg pointer-events-none truncate"
                                          title={`${campaignName} Ad Sets`}
                                        >
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
                                              "py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                              isSelected ? "bg-gray-100 hover:!bg-gray-100 font-semibold" : "hover:!bg-gray-200",
                                            )}
                                          >
                                            <div className="flex items-center space-x-2 w-full min-w-0">
                                              <Checkbox
                                                id={`adset-${adset.id}`}
                                                checked={isSelected}
                                                className="p-0 w-4 h-4 aspect-square bg-white border border-gray-300 rounded-[6px]"
                                              >
                                                <Checkbox.Indicator>
                                                  <Check className="w-3 h-3 text-green-500" />
                                                </Checkbox.Indicator>
                                              </Checkbox>
                                              <Label className={cn("min-w-0 flex-1 cursor-pointer flex items-center justify-between", adset.status !== "ACTIVE" && "text-gray-400")}>
                                                <span className="min-w-0 truncate leading-[1.25]" title={adset.name || adset.id}>{adset.name || adset.id}</span>
                                                <span className="ml-2 flex shrink-0 items-center">
                                                  {adset.totalAds != null && (
                                                    <span className="text-xs text-gray-400 mr-1.5">({adset.totalAds} {adset.totalAds === 1 ? 'Ad' : 'Ads'})</span>
                                                  )}
                                                  {adset.status === "ACTIVE" && (
                                                    <span className="ml-0 w-2 h-2 rounded-full bg-green-500" />
                                                  )}
                                                </span>
                                              </Label>
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()
                        ) : (
                          <CommandItem disabled className="opacity-50 cursor-not-allowed">
                            No AdSets found.
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </ScrollArea>
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
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 relative mt-2">
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
                    {renderDiffMark("duplicateAdSet")}
                    <CopyIcon className="w-4 h-4" />
                    Select an ad set shell to duplicate
                  </Label>
                  <Label className="text-gray-500 text-[12px] font-regular">
                    {sharedAdSetLocked ? "The source ad set is shared. Change it in Default." : "We’ll copy the ad set settings. You can edit them below."}
                  </Label>

                  <Popover open={!sharedAdSetLocked && openDuplicateAdSet} onOpenChange={(open) => setOpenDuplicateAdSet(sharedAdSetLocked ? false : open)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDuplicateAdSet}
                        disabled={!isLoggedIn || adSets.length === 0 || sharedAdSetLocked}
                        className="h-11 w-full justify-between border border-gray-300 rounded-2xl py-2 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white"
                      >
                        <div className="w-full overflow-hidden">
                          <span
                            className="block truncate flex-1 text-left"
                            title={
                              duplicateAdSet
                                ? adSets.find((adset) => adset.id === duplicateAdSet)?.name || duplicateAdSet
                                : undefined
                            }
                          >
                            {duplicateAdSet
                              ? adSets.find((adset) => adset.id === duplicateAdSet)?.name || duplicateAdSet
                              : "Select existing ad set"}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto max-w-[min(calc(100vw-2rem),850px)] p-0 bg-white shadow-lg rounded-2xl"
                      align="start"
                      sideOffset={4}
                      side="bottom"
                      avoidCollisions={false}
                      style={dropdownContentStyle}
                    >
                      <Command loop={false}>
                        <CommandInput
                          placeholder="Search ad set..."
                          value={duplicateAdSetSearchValue}
                          onValueChange={setDuplicateAdSetSearchValue}
                          className="bg-transparent"
                          wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                        />
                        <CommandEmpty>No ad sets exist in this campaign. Select a different campaign</CommandEmpty>
                        <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                          <ScrollArea viewportClassName="max-h-[500px]">
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
                                          <div
                                            className="px-4 py-2 mx-1 mb-1 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg pointer-events-none truncate"
                                            title={`${campaignName} Ad Sets`}
                                          >
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
                                                if (sharedAdSetLocked) return;
                                                setDuplicateAdSet(adset.id)
                                                setNewAdSetName(`${adset.name || adset.id}_Copy`)
                                                setOpenDuplicateAdSet(false)
                                              }}
                                              className={cn(
                                                "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                                adset.status !== "ACTIVE" && "text-gray-400"
                                              )}
                                            >
                                              <div className="flex justify-between items-center w-full min-w-0">
                                                <span className="min-w-0 truncate" title={adset.name || adset.id}>{adset.name || adset.id}</span>
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
                          </ScrollArea>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {/* New Ad Set Name Input */}
                  {duplicateAdSet && (
                    <>
                      <div className="space-y-2" style={{ marginTop: '8px' }}>
                        <Label htmlFor="newAdSetName" className="inline-flex items-center gap-1">
                          {renderDiffMark("newAdSetName")}
                          <span>New ad set name</span>
                        </Label>
                        <Input
                          id="newAdSetName"
                          aria-invalid={(newAdSetName || "").length > 400}
                          aria-describedby={(newAdSetName || "").length > 400 ? "new-ad-set-name-error" : undefined}
                          value={newAdSetName}
                          onChange={(e) => setNewAdSetName(e.target.value)}
                          placeholder="Enter new ad set name..."
                          className={`border border-gray-400 rounded-2xl bg-white shadow ${(newAdSetName || "").length > 400 ? "!border-red-500" : ""}`}
                          disabled={!isLoggedIn || sharedAdSetLocked}
                        />
                        {(newAdSetName || "").length > 400 && (
                          <p id="new-ad-set-name-error" className="text-xs text-red-600">New ad set names must be 400 characters or fewer.</p>
                        )}
                        {sharedAdSetLocked && <p className="text-xs text-gray-500">Name and setup are shared. Edit them in Default.</p>}
                      </div>
                      <NewAdSetSettingsEditor
                        key={`${activeVariantId}:${selectedAdAccount}:${selectedCampaign[0]}:${duplicateAdSet}`}
                        adSetId={duplicateAdSet} campaignId={selectedCampaign[0]} adAccountId={selectedAdAccount}
                        value={newAdSetSettings?.sourceAdSetId === duplicateAdSet && newAdSetSettings?.campaignId === selectedCampaign[0] && newAdSetSettings?.adAccountId === selectedAdAccount ? newAdSetSettings : null}
                        onChange={setNewAdSetSettings} disabled={!isLoggedIn || !selectedCampaign[0] || sharedAdSetLocked}
                      />
                      {isSplitAdDataEnabled && (
                        <div className="space-y-1.5 mt-3">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={activeVariantId !== "default" ? "cursor-not-allowed" : ""}
                                  tabIndex={activeVariantId !== "default" ? 0 : undefined}>
                                  <RadioGroup orientation="horizontal" value={shareNewAdSet ? "shared" : "separate"}
                                    onValueChange={(value) => { if (activeVariantId === "default") setShareNewAdSet(value === "shared"); }}
                                    disabled={!isLoggedIn || activeVariantId !== "default"}
                                    aria-label="New ad set launch mode" aria-describedby="share-new-ad-set-help"
                                    className={`flex flex-nowrap items-start gap-4 ${activeVariantId !== "default" ? "pointer-events-none opacity-50" : ""}`}>
                                    <div className="flex flex-1 items-start gap-2">
                                      <RadioGroupItem id="shared-new-ad-set" value="shared" className="mt-0.5 shrink-0" />
                                      <Label htmlFor="shared-new-ad-set" className="text-xs leading-5 font-normal">Launch all in 1 new ad set</Label>
                                    </div>
                                    <div className="flex flex-1 items-start gap-2">
                                      <RadioGroupItem id="separate-new-ad-sets" value="separate" className="mt-0.5 shrink-0" />
                                      <Label htmlFor="separate-new-ad-sets" className="text-xs leading-5 font-normal">Create new ad set in each variant</Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              </TooltipTrigger>
                              {activeVariantId !== "default" && <TooltipContent>Change this value in Default first.</TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                          <p id="share-new-ad-set-help" className="text-xs text-gray-500">
                            You’re seeing this because Split Ad Data is enabled. {shareNewAdSet
                              ? "All variants will launch in 1 new ad set."
                              : "Each new variant creates its own ad set, using its own name and setup."}
                          </p>
                        </div>
                      )}
                    </>
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
                      className="inline-flex items-center gap-2 bg-white rounded-2xl border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <button
                        type="button"
                        aria-label={`Remove ${adset ? adset.name : id}`}
                        onClick={() => handleAdSetCheckboxChange(id, false)}
                        className="flex h-4 w-4 items-center justify-center"
                      >
                        <CheckBlackIcon className="w-4.5 h-4.5" />
                      </button>
                      <span className="text-gray-800 text-xs break-all">{adset ? adset.name : id}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Duplicate Existing ads</label>
              <Switch
                checked={useExistingPosts}
                onCheckedChange={setUseExistingPosts}
              />
              {useExistingPosts && !usePostID && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleEditCreativeClick}
                  disabled={isLoadingEditCreative || (!editAdCreativeMode && importedPosts.length === 0)}
                  className={`ml-auto px-3 rounded-[14px] disabled:opacity-50 disabled:cursor-not-allowed ${editAdCreativeMode
                    ? "border border-red-500 text-red-600 hover:text-red-600 hover:bg-red-50"
                    : "border border-gray-300 text-black hover:text-black"}`}
                >
                  {isLoadingEditCreative ? (
                    <Loader className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : editAdCreativeMode ? (
                    <Ban className="h-3.5 w-3.5 mr-1 text-red-600" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                  )}
                  {isLoadingEditCreative ? "Loading..." : editAdCreativeMode ? "Disable Ad Creative Editing" : "Edit Ad Creative While Duplicating"}
                </Button>
              )}
            </div>
            {editAdCreativeMode && (
              <p className="text-xs text-gray-500 mt-1">Ad Media will be duplicated with the creative details you fill below</p>
            )}
            {useExistingPosts && !selectedAdAccount && (
              <p className="text-xs text-amber-600 mt-1">Select an ad account to fetch ads</p>
            )}
          </div>

        </div>
      </CardContent>
    </Card >
  )
}
