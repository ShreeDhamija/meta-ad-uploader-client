import CopyIcon from "@/assets/icons/copy.svg?react";
import CTAIcon from "@/assets/icons/cta.svg?react";
import FacebookIcon from "@/assets/icons/fb.svg?react";
import TemplateIcon from "@/assets/icons/file.svg?react";
import CampaignIcon from "@/assets/icons/folder.svg?react";
import AdSetIcon from "@/assets/icons/grid.svg?react";
import InstagramIcon from "@/assets/icons/ig.svg?react";
import LabelIcon from "@/assets/icons/label.svg?react";
import LinkIcon from "@/assets/icons/link.svg?react";
import { SavedLinkSelector } from "@/components/settings/LinkParameters";
import { sortTemplates } from "@/components/settings/TemplateLinkSync";
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import usePartnershipAdPartners from "@/lib/usePartnershipAdPartners";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";

// Mirrors the field chrome used by AdCreationForm so the overview reads as part of the form.
const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow";
const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`;
const formDropdownTriggerChrome = `${formFieldChrome} hover:bg-white`;
const formTextareaChrome =
  "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0";
const dropdownContentStyle = {
  minWidth: "var(--radix-popover-trigger-width)",
  width: "max-content",
  maxWidth: "min(calc(100vw - 2rem), 560px)",
};
const FALLBACK_THUMBNAIL = "https://api.withblip.com/thumbnail.jpg";
const FALLBACK_PROFILE_IMAGE = "https://api.withblip.com/backup_page_image.png";
const ADVANTAGE_PLUS_TYPES = ["AUTOMATED_SHOPPING_ADS", "SMART_APP_PROMOTION"];
const MAX_AD_SET_NAME_LENGTH = 400;

function OverviewCombobox({
  options,
  selectedValues,
  multiple = false,
  onSelect,
  triggerLabel,
  searchPlaceholder,
  emptyText,
  disabled = false,
  loading = false,
  loadingLabel,
  grouped = false,
  selectAll = false,
  onSelectAll,
  action,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedValues.map(String)), [selectedValues]);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery));
  const allFilteredSelected = filtered.length > 0 && filtered.every((option) => selected.has(String(option.value)));

  const renderOption = (option) => {
    const isSelected = selected.has(String(option.value));
    return (
      <CommandItem
        key={option.value}
        value={String(option.value)}
        onSelect={() => {
          onSelect(option);
          if (!multiple) setOpen(false);
        }}
        className={cn(
          "m-1 flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 transition-colors duration-150 hover:bg-gray-100",
          isSelected && "bg-gray-100 font-semibold",
        )}
      >
        {multiple && (
          <Checkbox
            checked={isSelected}
            className="pointer-events-none aspect-square h-4 w-4 rounded-[6px] border border-gray-300 bg-white p-0"
          />
        )}
        {option.icon}
        <span className={cn("min-w-0 flex-1 truncate leading-[1.25]", option.muted && "text-gray-400")} title={option.label}>
          {option.label}
        </span>
        {option.meta}
        {!multiple && isSelected && <Check className="h-4 w-4 shrink-0 text-blue-500" />}
      </CommandItem>
    );
  };

  const renderOptions = () => {
    if (!grouped) return filtered.map(renderOption);
    const groups = filtered.reduce((acc, option) => {
      const key = option.group || "";
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push(option);
      return acc;
    }, new Map());
    return [...groups.entries()].map(([groupName, groupOptions]) => (
      <div key={groupName || "ungrouped"}>
        {groups.size > 1 && groupName && (
          <div
            className="pointer-events-none mx-1 mb-1 truncate rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700"
            title={groupName}
          >
            {groupName}
          </div>
        )}
        {groupOptions.map(renderOption)}
      </div>
    ));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full min-w-0 justify-between overflow-hidden whitespace-nowrap", formDropdownTriggerChrome)}
        >
          <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden">
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span className="block flex-1 truncate text-left text-gray-500">{loadingLabel}</span>
              </>
            ) : (
              triggerLabel
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-white shadow-lg rounded-2xl"
        align="start"
        sideOffset={4}
        side="bottom"
        style={dropdownContentStyle}
      >
        <Command shouldFilter={false} loop={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            className="bg-transparent"
            wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
          />
          <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
            {action && (
              <CommandItem
                value="__action__"
                disabled={action.disabled}
                onSelect={() => {
                  if (action.disabled) return;
                  action.onSelect();
                  setOpen(false);
                }}
                className={cn(
                  "m-1 flex h-10 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-md transition-all duration-150",
                  action.disabled ? "cursor-not-allowed !bg-zinc-800 !text-zinc-500" : "cursor-pointer !bg-zinc-700 !text-white hover:!bg-black",
                )}
              >
                {action.label}
                {action.disabled && action.hint && <span className="ml-2 text-xs font-normal text-zinc-400">{action.hint}</span>}
              </CommandItem>
            )}
            <ScrollArea viewportClassName="max-h-[300px] [&>div]:!block">
              {filtered.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-gray-500">{emptyText}</p>
              ) : (
                <>
                  {selectAll && filtered.length > 1 && (
                    <CommandItem
                      value="__select-all__"
                      onSelect={() => onSelectAll?.(filtered, allFilteredSelected)}
                      className={cn(
                        "m-1 flex cursor-pointer items-center gap-2 rounded-2xl bg-gray-100 py-2 text-xs transition-colors duration-150 hover:!bg-gray-100",
                        allFilteredSelected && "font-semibold",
                      )}
                    >
                      <Checkbox
                        checked={allFilteredSelected}
                        className="pointer-events-none aspect-square h-4 w-4 rounded-[6px] border border-gray-300 bg-white p-0"
                      />
                      Select all
                    </CommandItem>
                  )}
                  {renderOptions()}
                </>
              )}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function OverviewThumbnail({ media, fitToWidth }) {
  const [localUrl, setLocalUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState(() => {
    const width = Number(media.file?.width || media.file?.videoWidth);
    const height = Number(media.file?.height || media.file?.videoHeight);
    return width > 0 && height > 0 ? width / height : 1;
  });

  useEffect(() => {
    if (media.src || media.isVideo || typeof File === "undefined" || !(media.file instanceof File)) {
      setLocalUrl("");
      return undefined;
    }
    const nextUrl = URL.createObjectURL(media.file);
    setLocalUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [media.file, media.isVideo, media.src]);

  return (
    <div
      className={cn(
        "relative max-h-[180px] min-h-[72px] min-w-0 justify-self-start overflow-hidden rounded-xl border border-gray-200 bg-gray-100",
        fitToWidth ? "w-full" : "h-full w-auto max-w-full",
      )}
      style={{ aspectRatio }}
    >
      <img
        src={media.src || localUrl || FALLBACK_THUMBNAIL}
        alt={media.name}
        title={media.name}
        className="h-full w-full object-contain"
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) setAspectRatio(naturalWidth / naturalHeight);
        }}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = FALLBACK_THUMBNAIL;
        }}
      />
    </div>
  );
}

function CopyFieldList({ values, multiline, placeholder, onChange }) {
  const entries = values.length > 0 ? values : [""];
  return (
    <div className="space-y-2">
      {entries.map((value, index) =>
        multiline ? (
          <TextareaAutosize
            key={index}
            value={value || ""}
            onChange={(event) => onChange(index, event.target.value)}
            minRows={2}
            maxRows={8}
            placeholder={placeholder}
            className={formTextareaChrome}
          />
        ) : (
          <Input
            key={index}
            value={value || ""}
            onChange={(event) => onChange(index, event.target.value)}
            placeholder={placeholder}
            className={cn("w-full", formInputChrome)}
          />
        ),
      )}
    </div>
  );
}

function ColumnLabel({ icon: Icon, children }) {
  return (
    <Label className="flex items-center gap-2 whitespace-nowrap">
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Label>
  );
}

function FieldLabel({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-gray-500">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </p>
  );
}

function SelectedAccount({ imageUrl, name }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <img src={imageUrl || FALLBACK_PROFILE_IMAGE} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      <span className="truncate">{name}</span>
    </div>
  );
}

function OverviewRadioOption({ id, value, label, disabled = false }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={id} disabled={disabled} />
      <Label htmlFor={id} className={cn("cursor-pointer text-sm font-normal", disabled && "cursor-not-allowed text-gray-400")}>
        {label}
      </Label>
    </div>
  );
}

function PartnershipCell({ row, brandUsername, onFieldsChange }) {
  // Mirrors the native partnership toggle: partners load per brand IG account + page.
  const { partners, isLoading, error } = usePartnershipAdPartners(
    row.isPartnershipAd ? row.instagramAccountId : null,
    row.isPartnershipAd ? row.pageId : null,
  );
  const selectedPartner = partners.find((partner) => partner.creatorIgId === row.partnerIgAccountId);
  const partnerUsername = (selectedPartner?.creatorUsername || row.partnerName || "").replace(/^@/, "");
  const partnerOptions = partners.map((partner) => ({
    value: partner.creatorIgId,
    label: `@${partner.creatorUsername ?? "Username not available"}`,
    partner,
    meta: <span className="ml-2 shrink-0 text-xs font-normal text-gray-400">{partner.creatorIgId}</span>,
  }));
  const partnerHasPage = Boolean(row.partnerFbPageId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-2">
        <Switch
          id={`${row.id}-partnership`}
          checked={row.isPartnershipAd}
          disabled={!row.instagramAccountId}
          onCheckedChange={(checked) =>
            onFieldsChange(
              row.id,
              checked ? { isPartnershipAd: true } : { isPartnershipAd: false, partnerIgAccountId: "", partnerFbPageId: "", partnerName: "" },
            )
          }
        />
        <Label htmlFor={`${row.id}-partnership`} className="cursor-pointer text-sm">
          Add Partnership
        </Label>
      </div>
      {!row.instagramAccountId && <p className="text-xs text-gray-500">Select an Instagram account first</p>}

      {row.isPartnershipAd && (
        <>
          <OverviewCombobox
            options={partnerOptions}
            selectedValues={row.partnerIgAccountId ? [row.partnerIgAccountId] : []}
            onSelect={({ partner }) =>
              onFieldsChange(row.id, {
                partnerIgAccountId: partner.creatorIgId,
                partnerFbPageId: partner.creatorFbPageId,
                partnerName: partner.creatorUsername || partner.creatorName || "",
                ...(!partner.creatorFbPageId && row.partnershipPrimaryIdentity === "partner" ? { partnershipPrimaryIdentity: "brand" } : {}),
              })
            }
            searchPlaceholder="Search partners..."
            emptyText="No partners found."
            loading={isLoading}
            loadingLabel="Loading partners..."
            disabled={partners.length === 0}
            triggerLabel={
              <span className="block flex-1 truncate text-left">
                {partnerUsername ? `@${partnerUsername}` : partners.length === 0 ? "No approved partners found" : "Select a partner creator"}
              </span>
            }
          />
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="space-y-2">
            <FieldLabel>Identities in header</FieldLabel>
            <RadioGroup
              value={row.partnershipIdentityMode}
              onValueChange={(value) => onFieldsChange(row.id, { partnershipIdentityMode: value })}
              className="gap-2 px-1"
            >
              <OverviewRadioOption id={`${row.id}-identity-dynamic`} value="dynamic" label="Dynamic" />
              <OverviewRadioOption
                id={`${row.id}-identity-first`}
                value="first_identity_only"
                label="First identity only"
                disabled={!partnerHasPage && Boolean(row.partnerIgAccountId)}
              />
              <OverviewRadioOption id={`${row.id}-identity-both`} value="both_identities" label="Both identities" />
            </RadioGroup>
          </div>

          {row.partnershipIdentityMode === "both_identities" && (
            <div className="space-y-2">
              <FieldLabel>Primary identity</FieldLabel>
              <RadioGroup
                value={row.partnershipPrimaryIdentity}
                onValueChange={(value) => onFieldsChange(row.id, { partnershipPrimaryIdentity: value })}
                className="gap-2 px-1"
              >
                <OverviewRadioOption
                  id={`${row.id}-primary-brand`}
                  value="brand"
                  label={brandUsername ? `@${brandUsername}` : "Main brand IG"}
                />
                <OverviewRadioOption
                  id={`${row.id}-primary-partner`}
                  value="partner"
                  label={partnerUsername ? `@${partnerUsername}` : "Partner IG"}
                  disabled={!partnerHasPage}
                />
              </RadioGroup>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewAdSetFields({ row, sourceAdSets, onChange }) {
  const sourceOptions = sourceAdSets.map((adSet) => ({
    value: adSet.id,
    label: adSet.name || adSet.id,
    adSet,
    group: `${adSet.campaignName || adSet.campaignId} Ad Sets`,
    muted: adSet.status !== "ACTIVE",
    meta: adSet.status === "ACTIVE" ? <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-green-500" /> : null,
  }));
  const sourceAdSet = sourceAdSets.find((adSet) => adSet.id === row.duplicateAdSet);
  const nameTooLong = row.newAdSetName.length > MAX_AD_SET_NAME_LENGTH;

  return (
    <div className="mt-1.5 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <FieldLabel icon={CopyIcon}>Ad set to duplicate</FieldLabel>
      <OverviewCombobox
        grouped
        options={sourceOptions}
        selectedValues={row.duplicateAdSet ? [row.duplicateAdSet] : []}
        onSelect={({ adSet }) =>
          onChange({ duplicateAdSet: adSet.id, newAdSetName: `${adSet.name || adSet.id}_Copy`, newAdSetSettings: null })
        }
        searchPlaceholder="Search ad set..."
        emptyText="No ad sets found."
        disabled={sourceOptions.length === 0}
        triggerLabel={
          <span className="block flex-1 truncate text-left" title={sourceAdSet?.name}>
            {row.duplicateAdSet ? sourceAdSet?.name || row.duplicateAdSet : "Select existing ad set"}
          </span>
        }
      />
      {row.duplicateAdSet && (
        <>
          <FieldLabel>New ad set name</FieldLabel>
          <Input
            value={row.newAdSetName}
            onChange={(event) => onChange({ newAdSetName: event.target.value })}
            placeholder="Enter new ad set name..."
            aria-invalid={nameTooLong}
            className={cn("w-full", formInputChrome, nameTooLong && "!border-red-500")}
          />
          {nameTooLong && <p className="px-1 text-xs text-red-600">New ad set names must be 400 characters or fewer.</p>}
        </>
      )}
      {row.newAdSetShared && <p className="px-1 text-xs text-gray-500">Shared by every variant launching in 1 new ad set.</p>}
    </div>
  );
}

function LinkCell({ row, availableLinks, onLinkSelect, onLinkInputChange, onCustomLinkChange, onCustomLinkToggle }) {
  const hasSavedLinks = availableLinks.length > 0;
  const defaultUrl = (availableLinks.find((link) => link.isDefault) || availableLinks[0])?.url || "";
  const links = row.links.length > 0 ? row.links : [""];
  // Per-card custom state isn't part of a variant's snapshot (natively it's local form state),
  // so start cards whose link isn't a saved one in custom mode.
  const [customCards, setCustomCards] = useState(
    () => new Set(links.map((value, index) => (value && !availableLinks.some((link) => link.url === value) ? index : null)).filter((index) => index !== null)),
  );

  if (row.destinationType === "instant_experience") {
    return <p className="pt-2.5 text-sm text-gray-500">Instant Experience</p>;
  }

  if (links.length <= 1) {
    const showInput = row.showCustomLink || !hasSavedLinks;
    return (
      <div className="space-y-3">
        {!showInput && (
          <SavedLinkSelector
            links={availableLinks}
            value={links[0] || ""}
            onValueChange={(url) => onLinkSelect(row.id, url, null)}
            className={formFieldChrome}
          />
        )}
        {showInput && (
          <Input
            type="text"
            value={row.customLink}
            onChange={(event) => onCustomLinkChange(row.id, event.target.value)}
            placeholder="https://example.com"
            className={cn("w-full", formInputChrome)}
          />
        )}
        {hasSavedLinks && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id={`${row.id}-custom-link`}
              checked={row.showCustomLink}
              onCheckedChange={(checked) => onCustomLinkToggle(row.id, Boolean(checked))}
              className="h-4 w-4 rounded-md border-gray-300"
            />
            <label htmlFor={`${row.id}-custom-link`} className="cursor-pointer text-xs font-medium text-gray-600">
              Enter custom link
            </label>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {links.map((value, index) => {
        const isCustom = !hasSavedLinks || customCards.has(index);
        return (
          <div key={index} className="space-y-2">
            <p className="px-1 text-xs font-medium text-gray-500">Card {index + 1}</p>
            {isCustom ? (
              <Input
                type="text"
                value={value || ""}
                onChange={(event) => onLinkInputChange(row.id, index, event.target.value)}
                placeholder="https://example.com"
                className={cn("w-full", formInputChrome)}
              />
            ) : (
              <SavedLinkSelector
                links={availableLinks}
                value={value || ""}
                onValueChange={(url) => onLinkSelect(row.id, url, index)}
                className={formFieldChrome}
              />
            )}
            {hasSavedLinks && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  id={`${row.id}-custom-link-${index}`}
                  checked={customCards.has(index)}
                  onCheckedChange={(checked) => {
                    setCustomCards((current) => {
                      const next = new Set(current);
                      if (checked) next.add(index);
                      else next.delete(index);
                      return next;
                    });
                    if (!checked) onLinkSelect(row.id, defaultUrl, index);
                  }}
                  className="h-4 w-4 rounded-md border-gray-300"
                />
                <label htmlFor={`${row.id}-custom-link-${index}`} className="cursor-pointer text-xs font-medium text-gray-600">
                  Use custom link
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VariantOverview({
  rows,
  campaigns,
  pages,
  copyTemplates,
  defaultTemplateName,
  availableLinks,
  ctaOptions,
  uploadSources,
  onUpload,
  customVariables,
  showAdSetNameVariable,
  loadingAdSetVariantIds,
  onCampaignToggle,
  onAdSetsChange,
  onStartNewAdSet,
  onNewAdSetChange,
  onPageSelect,
  onTemplateSelect,
  onLinkSelect,
  onLinkInputChange,
  onCustomLinkChange,
  onCustomLinkToggle,
  onFieldsChange,
  onCopyChange,
}) {
  // Once shown, keep the partnership column even if every variant turns partnership off.
  const hasPartnershipVariants = rows.some((row) => row.isPartnershipAd);
  const [showPartnershipColumn, setShowPartnershipColumn] = useState(hasPartnershipVariants);
  useEffect(() => {
    if (hasPartnershipVariants) setShowPartnershipColumn(true);
  }, [hasPartnershipVariants]);
  const campaignOptions = useMemo(
    () =>
      campaigns.map((campaign) => ({
        value: campaign.id,
        label: campaign.name || campaign.id,
        muted: campaign.status !== "ACTIVE",
        meta: campaign.status === "ACTIVE" ? <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-green-500" /> : null,
      })),
    [campaigns],
  );
  const pageOptions = useMemo(
    () =>
      pages.map((page) => ({
        value: page.id,
        label: page.name,
        page,
        icon: (
          <img
            src={page.profilePicture || "/placeholder.svg"}
            alt=""
            className="h-6 w-6 shrink-0 rounded-full border border-gray-300 object-cover"
          />
        ),
        meta: <span className="ml-2 shrink-0 text-xs font-normal text-gray-400">{page.id}</span>,
      })),
    [pages],
  );
  const templateOptions = useMemo(
    () =>
      sortTemplates(copyTemplates, "default", defaultTemplateName).map(([name]) => ({
        value: name,
        label: name,
        meta:
          name === defaultTemplateName ? (
            <span className="ml-2 shrink-0 rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-normal text-blue-800">Default</span>
          ) : null,
      })),
    [copyTemplates, defaultTemplateName],
  );
  const hasTemplates = templateOptions.length > 0;
  const defaultRow = rows.find((row) => row.id === "default");
  const instagramAccounts = useMemo(() => {
    const seen = new Set();
    return pages
      .flatMap((page) => [...(page.instagramAccount ? [page.instagramAccount] : []), ...(page.additionalInstagramAccounts || [])])
      .filter((account) => {
        if (!account?.id || seen.has(account.id)) return false;
        seen.add(account.id);
        return true;
      });
  }, [pages]);
  const instagramOptions = useMemo(
    () =>
      instagramAccounts.map((account) => ({
        value: account.id,
        label: account.username || account.id,
        icon: (
          <img
            src={account.profilePictureUrl || FALLBACK_PROFILE_IMAGE}
            alt=""
            className="h-6 w-6 shrink-0 rounded-full border border-gray-300 object-cover"
          />
        ),
      })),
    [instagramAccounts],
  );
  const ctaSelectOptions = useMemo(() => ctaOptions.map((option) => ({ value: option.value, label: option.label })), [ctaOptions]);

  // `divider: false` keeps the copy columns (primary text / headlines / descriptions) visually grouped.
  const columns = [
    { key: "variant", label: "Variant", width: 176 },
    { key: "campaignAdSet", label: "Campaign & Ad Set", icon: CampaignIcon, width: 280 },
    { key: "identity", label: "Page & Instagram", icon: FacebookIcon, width: 260 },
    ...(showPartnershipColumn ? [{ key: "partnership", label: "Partnership", icon: Users, width: 260 }] : []),
    { key: "adName", label: "Ad Name", icon: LabelIcon, width: 320 },
    { key: "template", label: "Template", icon: TemplateIcon, width: 240 },
    { key: "messages", label: "Primary Text", width: 340, divider: false },
    { key: "headlines", label: "Headlines", width: 280, divider: false },
    { key: "descriptions", label: "Descriptions", width: 280 },
    { key: "link", label: "Link", icon: LinkIcon, width: 300 },
    { key: "cta", label: "CTA", icon: CTAIcon, width: 220 },
    { key: "media", label: "Ads", width: 340 },
  ];
  const hasDivider = (column, columnIndex) => column.divider !== false && columnIndex < columns.length - 1;

  const renderCell = (row, key) => {
    switch (key) {
      case "campaignAdSet": {
        const selectedCampaigns = campaigns.filter((campaign) => row.campaignIds.includes(campaign.id));
        const adSetOptions = row.adSetOptions.map((adSet) => ({
          value: adSet.id,
          label: adSet.name || adSet.id,
          group: row.campaignIds.length > 1 ? `${adSet.campaignName || adSet.campaignId} Ad Sets` : "",
          muted: adSet.status !== "ACTIVE",
          meta: (
            <span className="ml-2 flex shrink-0 items-center font-normal">
              {adSet.totalAds != null && (
                <span className="mr-1.5 text-xs text-gray-400">
                  ({adSet.totalAds} {adSet.totalAds === 1 ? "Ad" : "Ads"})
                </span>
              )}
              {adSet.status === "ACTIVE" && <span className="h-2 w-2 rounded-full bg-green-500" />}
            </span>
          ),
        }));
        const isLoadingAdSets = loadingAdSetVariantIds.includes(row.id);
        const isAdvantagePlus = campaigns.some(
          (campaign) => row.campaignIds.includes(campaign.id) && ADVANTAGE_PLUS_TYPES.includes(campaign.smart_promotion_type),
        );
        const noAdSets = row.campaignIds.length > 0 && adSetOptions.length === 0;
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <FieldLabel icon={CampaignIcon}>Campaign</FieldLabel>
              <OverviewCombobox
                multiple
                options={campaignOptions}
                selectedValues={row.campaignIds}
                onSelect={(option) => onCampaignToggle(row.id, option.value)}
                searchPlaceholder="Search campaigns..."
                emptyText="No campaigns found."
                disabled={campaigns.length === 0}
                triggerLabel={
                  <span className="block flex-1 truncate text-left" title={selectedCampaigns.length === 1 ? selectedCampaigns[0].name : undefined}>
                    {campaigns.length === 0
                      ? "No campaigns available"
                      : selectedCampaigns.length === 0
                        ? "Select campaigns"
                        : selectedCampaigns.length === 1
                          ? selectedCampaigns[0].name || selectedCampaigns[0].id
                          : `${selectedCampaigns.length} campaigns selected`}
                  </span>
                }
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel icon={AdSetIcon}>Ad Set</FieldLabel>
              <OverviewCombobox
                multiple
                grouped
                selectAll
                options={adSetOptions}
                selectedValues={row.isNewAdSet ? [] : row.adSetIds}
                onSelect={(option) =>
                  onAdSetsChange(
                    row.id,
                    row.adSetIds.includes(option.value) ? row.adSetIds.filter((id) => id !== option.value) : [...row.adSetIds, option.value],
                  )
                }
                onSelectAll={(visibleOptions, allSelected) => {
                  const visibleIds = new Set(visibleOptions.map((option) => option.value));
                  onAdSetsChange(
                    row.id,
                    allSelected ? row.adSetIds.filter((id) => !visibleIds.has(id)) : Array.from(new Set([...row.adSetIds, ...visibleIds])),
                  );
                }}
                searchPlaceholder="Search AdSets..."
                emptyText="No ad sets found."
                loading={isLoadingAdSets}
                loadingLabel="Fetching ad sets..."
                disabled={row.campaignIds.length === 0 || noAdSets}
                action={
                  isAdvantagePlus
                    ? null
                    : {
                      label: "🚀 Launch in a New Ad Set",
                      disabled: row.campaignIds.length !== 1,
                      hint: "(Please select 1 campaign)",
                      onSelect: () => onStartNewAdSet(row.id),
                    }
                }
                triggerLabel={
                  <span className="block flex-1 truncate text-left">
                    {row.isNewAdSet
                      ? "New Ad Set"
                      : row.campaignIds.length === 0
                        ? "Select a campaign first"
                        : noAdSets
                          ? "No ad sets in this campaign"
                          : row.adSetIds.length > 0
                            ? row.adSetIds.length === 1
                              ? row.adSetOptions.find((adSet) => adSet.id === row.adSetIds[0])?.name || "1 AdSet selected"
                              : `${row.adSetIds.length} AdSets selected`
                            : "Select Ad Sets"}
                  </span>
                }
              />
              {row.isNewAdSet && (
                <NewAdSetFields
                  row={row}
                  sourceAdSets={row.newAdSetShared && defaultRow?.adSetOptions.length ? defaultRow.adSetOptions : row.adSetOptions}
                  onChange={(fields) => onNewAdSetChange(row.id, fields)}
                />
              )}
            </div>
          </div>
        );
      }
      case "identity": {
        const selectedPage = pages.find((page) => String(page.id) === String(row.pageId));
        const selectedInstagram = instagramAccounts.find((account) => String(account.id) === String(row.instagramAccountId));
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <FieldLabel icon={FacebookIcon}>Facebook Page</FieldLabel>
              <OverviewCombobox
                options={pageOptions}
                selectedValues={row.pageId ? [row.pageId] : []}
                onSelect={(option) => onPageSelect(row.id, option.page)}
                searchPlaceholder="Search pages..."
                emptyText="No pages found."
                disabled={pages.length === 0}
                triggerLabel={
                  row.pageId ? (
                    <SelectedAccount imageUrl={selectedPage?.profilePicture} name={selectedPage?.name || row.pageId} />
                  ) : (
                    <span className="block flex-1 truncate text-left">Select a Page</span>
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel icon={InstagramIcon}>Instagram</FieldLabel>
              <OverviewCombobox
                options={instagramOptions}
                selectedValues={row.instagramAccountId ? [row.instagramAccountId] : []}
                onSelect={(option) => onFieldsChange(row.id, { instagramAccountId: option.value })}
                searchPlaceholder="Search Instagram usernames..."
                emptyText="No IG accounts found."
                disabled={instagramOptions.length === 0}
                triggerLabel={
                  row.instagramAccountId ? (
                    <SelectedAccount imageUrl={selectedInstagram?.profilePictureUrl} name={selectedInstagram?.username || row.instagramAccountId} />
                  ) : (
                    <span className="block flex-1 truncate text-left">
                      {instagramOptions.length === 0 ? "No IG accounts found" : "Select Instagram Account"}
                    </span>
                  )
                }
              />
            </div>
          </div>
        );
      }
      case "partnership":
        return (
          <PartnershipCell
            row={row}
            brandUsername={instagramAccounts.find((account) => String(account.id) === String(row.instagramAccountId))?.username}
            onFieldsChange={onFieldsChange}
          />
        );
      case "adName":
        return (
          <ReorderAdNameParts
            formulaInput={row.adNameFormula}
            onFormulaChange={(rawInput) => onFieldsChange(row.id, { adNameFormulaV2: { rawInput } })}
            variant="home"
            customVariables={customVariables}
            showAdSetNameVariable={showAdSetNameVariable}
          />
        );
      case "template":
        return (
          <OverviewCombobox
            options={templateOptions}
            selectedValues={row.selectedTemplate ? [row.selectedTemplate] : []}
            onSelect={(option) => onTemplateSelect(row.id, option.value)}
            searchPlaceholder="Search templates..."
            emptyText="No templates found."
            disabled={!hasTemplates}
            triggerLabel={
              <span className="block flex-1 truncate text-left">
                {!hasTemplates ? "No templates available" : row.selectedTemplate || "Choose a Template"}
              </span>
            }
          />
        );
      case "messages":
        return (
          <CopyFieldList
            values={row.messages}
            multiline
            placeholder="Primary text"
            onChange={(index, value) => onCopyChange(row.id, "messages", index, value)}
          />
        );
      case "headlines":
        return (
          <CopyFieldList values={row.headlines} placeholder="Headline" onChange={(index, value) => onCopyChange(row.id, "headlines", index, value)} />
        );
      case "descriptions":
        return (
          <CopyFieldList
            values={row.descriptions}
            placeholder="Description"
            onChange={(index, value) => onCopyChange(row.id, "descriptions", index, value)}
          />
        );
      case "link":
        return (
          <LinkCell
            row={row}
            availableLinks={availableLinks}
            onLinkSelect={onLinkSelect}
            onLinkInputChange={onLinkInputChange}
            onCustomLinkChange={onCustomLinkChange}
            onCustomLinkToggle={onCustomLinkToggle}
          />
        );
      case "cta": {
        const selectedCta = ctaSelectOptions.find((option) => option.value === row.cta);
        return (
          <OverviewCombobox
            options={ctaSelectOptions}
            selectedValues={row.cta ? [row.cta] : []}
            onSelect={(option) => onFieldsChange(row.id, { cta: option.value })}
            searchPlaceholder="Search CTAs..."
            emptyText="No CTAs found."
            disabled={Boolean(row.fixedCtaLabel)}
            triggerLabel={
              <span className={cn("block flex-1 truncate text-left", !row.fixedCtaLabel && !selectedCta && "text-muted-foreground")}>
                {row.fixedCtaLabel || selectedCta?.label || "Select a CTA"}
              </span>
            }
          />
        );
      }
      case "media":
        return (
          <div className="space-y-3">
            {row.mediaItems.length > 0 ? (
              <div className="grid grid-cols-2 items-stretch gap-3">
                {row.mediaItems.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={cn(
                      "flex min-h-[96px] min-w-0 flex-col",
                      item.isGroup && "col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-3",
                    )}
                  >
                    <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</span>
                    <div
                      className={cn("grid min-h-[72px] flex-1 items-start gap-2", item.files.length === 1 && "h-full")}
                      style={{ gridTemplateColumns: `repeat(${Math.max(item.files.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {item.files.map((media, fileIndex) => (
                        <OverviewThumbnail key={`${media.key}-${fileIndex}`} media={media} fitToWidth={item.files.length > 1 || item.isGroup} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pt-2.5 text-sm text-gray-400">No media assigned</p>
            )}
            {uploadSources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {uploadSources.map((source) => (
                  <Button
                    key={source.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    title={`Add media to ${row.name} from ${source.name}`}
                    onClick={() => onUpload(row.id, source.id)}
                    className="h-7 gap-1.5 rounded-xl border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <img src={source.icon} alt="" className={cn("h-3.5 w-3.5 object-contain", source.id === "frameio" && "rounded-sm object-cover")} />
                    {source.compactLabel}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="h-full min-h-0 !bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl">
      <CardContent className="h-full min-h-0 p-0">
        <ScrollArea type="always" className="h-full w-full rounded-3xl" viewportClassName="overscroll-contain pb-3">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                {columns.map((column, columnIndex) => (
                  <th
                    key={column.key}
                    style={{ width: column.width, minWidth: column.width }}
                    className={cn(
                      "sticky top-0 z-20 border-b border-gray-200 bg-white px-3 pb-3 pt-5 align-bottom font-normal",
                      hasDivider(column, columnIndex) && "border-r",
                      columnIndex === 0 && "left-0 z-30 pl-6",
                      columnIndex === columns.length - 1 && "pr-6",
                    )}
                  >
                    <ColumnLabel icon={column.icon}>{column.label}</ColumnLabel>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                      className={cn(
                        "border-b border-gray-200 bg-white px-3 py-4",
                        hasDivider(column, columnIndex) && "border-r",
                        columnIndex === 0 && "sticky left-0 z-10 pl-6",
                        columnIndex === columns.length - 1 && "pr-6",
                      )}
                    >
                      {column.key === "variant" ? (
                        <div className="space-y-1 pt-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                            <span className="truncate">{row.name}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {row.adCount} ad{row.adCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      ) : (
                        renderCell(row, column.key)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
