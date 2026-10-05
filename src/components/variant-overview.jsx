import CTAIcon from "@/assets/icons/cta.svg?react";
import FacebookIcon from "@/assets/icons/fb.svg?react";
import TemplateIcon from "@/assets/icons/file.svg?react";
import CampaignIcon from "@/assets/icons/folder.svg?react";
import AdSetIcon from "@/assets/icons/grid.svg?react";
import LabelIcon from "@/assets/icons/label.svg?react";
import LinkIcon from "@/assets/icons/link.svg?react";
import { SavedLinkSelector } from "@/components/settings/LinkParameters";
import { sortTemplates } from "@/components/settings/TemplateLinkSync";
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, ChevronsUpDown, Loader, Pencil } from "lucide-react";
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

const formatCta = (cta) =>
  String(cta || "LEARN_MORE")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

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

export default function VariantOverview({
  rows,
  campaigns,
  pages,
  copyTemplates,
  defaultTemplateName,
  availableLinks,
  customVariables,
  showAdSetNameVariable,
  loadingAdSetVariantIds,
  onCampaignToggle,
  onAdSetsChange,
  onPageSelect,
  onTemplateSelect,
  onLinkSelect,
  onLinkInputChange,
  onAdNameChange,
  onCopyChange,
  onEditVariant,
  onClose,
}) {
  const hasPartnershipVariants = rows.some((row) => row.isPartnershipAd);
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

  const columns = [
    { key: "variant", label: "Variant", width: 176 },
    { key: "campaign", label: "Campaign", icon: CampaignIcon, width: 260 },
    { key: "adSet", label: "Ad Set", icon: AdSetIcon, width: 260 },
    { key: "page", label: "Page", icon: FacebookIcon, width: 240 },
    ...(hasPartnershipVariants ? [{ key: "partnership", label: "Partnership", width: 180 }] : []),
    { key: "adName", label: "Ad Name", icon: LabelIcon, width: 320 },
    { key: "template", label: "Template", icon: TemplateIcon, width: 240 },
    { key: "messages", label: "Primary Text", width: 340 },
    { key: "headlines", label: "Headlines", width: 280 },
    { key: "descriptions", label: "Descriptions", width: 280 },
    { key: "link", label: "Link", icon: LinkIcon, width: 300 },
    { key: "cta", label: "CTA", icon: CTAIcon, width: 140 },
    { key: "media", label: "Ads", width: 340 },
  ];

  const renderCell = (row, key) => {
    switch (key) {
      case "campaign": {
        const selectedCampaigns = campaigns.filter((campaign) => row.campaignIds.includes(campaign.id));
        return (
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
        );
      }
      case "adSet": {
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
        const isLoading = loadingAdSetVariantIds.includes(row.id);
        const noAdSets = row.campaignIds.length > 0 && adSetOptions.length === 0;
        return (
          <div className="space-y-1.5">
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
              loading={isLoading}
              loadingLabel="Fetching ad sets..."
              disabled={row.adSetsLocked || row.campaignIds.length === 0 || noAdSets}
              triggerLabel={
                <span className={cn("block flex-1 truncate text-left", row.adSetsLocked && "text-gray-400")}>
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
              <p className="truncate px-1 text-xs text-gray-500" title={row.newAdSetName}>
                {row.newAdSetName || "Unnamed ad set"}
                {row.adSetsLocked && " · shared with Default"}
              </p>
            )}
          </div>
        );
      }
      case "page": {
        const selectedPage = pages.find((page) => String(page.id) === String(row.pageId));
        return (
          <div className="space-y-1.5">
            <OverviewCombobox
              options={pageOptions}
              selectedValues={row.pageId ? [row.pageId] : []}
              onSelect={(option) => onPageSelect(row.id, option.page)}
              searchPlaceholder="Search pages..."
              emptyText="No pages found."
              disabled={pages.length === 0}
              triggerLabel={
                selectedPage || row.pageId ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={selectedPage?.profilePicture || "https://api.withblip.com/backup_page_image.png"}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-full object-cover"
                    />
                    <span className="truncate">{selectedPage?.name || row.pageId}</span>
                  </div>
                ) : (
                  <span className="block flex-1 truncate text-left">Select a Page</span>
                )
              }
            />
            {row.instagramName && <p className="truncate px-1 text-xs text-gray-500">@{String(row.instagramName).replace(/^@/, "")}</p>}
          </div>
        );
      }
      case "partnership":
        return row.isPartnershipAd ? (
          <div className="space-y-1 pt-2">
            <span className="inline-flex rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">Enabled</span>
            <p className="break-all text-xs text-gray-600">{row.partnerName || "Partner selected"}</p>
          </div>
        ) : (
          <p className="pt-2.5 text-sm text-gray-400">None</p>
        );
      case "adName":
        return (
          <ReorderAdNameParts
            formulaInput={row.adNameFormula}
            onFormulaChange={(rawInput) => onAdNameChange(row.id, rawInput)}
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
      case "link": {
        if (row.destinationType === "instant_experience") {
          return <p className="pt-2.5 text-sm text-gray-500">Instant Experience</p>;
        }
        const links = row.links.length > 0 ? row.links : [""];
        const isPerCard = links.length > 1;
        return (
          <div className="space-y-2">
            {links.map((value, index) => (
              <div key={index} className="space-y-1">
                {isPerCard && <p className="px-1 text-xs font-medium text-gray-500">Card {index + 1}</p>}
                {availableLinks.length > 0 ? (
                  <SavedLinkSelector
                    links={availableLinks}
                    value={value || ""}
                    onValueChange={(url) => onLinkSelect(row.id, url, isPerCard ? index : null)}
                    className={formFieldChrome}
                  />
                ) : (
                  <Input
                    type="text"
                    value={value || ""}
                    onChange={(event) => onLinkInputChange(row.id, index, event.target.value)}
                    placeholder="https://example.com"
                    className={cn("w-full", formInputChrome)}
                  />
                )}
              </div>
            ))}
          </div>
        );
      }
      case "cta":
        return (
          <span className="mt-1.5 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{formatCta(row.cta)}</span>
        );
      case "media":
        return row.mediaItems.length > 0 ? (
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
        );
      default:
        return null;
    }
  };

  return (
    <Card className="!bg-white border border-gray-300 max-w-[calc(100vw-1rem)] shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Variant Overview</CardTitle>
          <CardDescription>Compare and edit every variant side by side. Changes apply to each variant directly.</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="shrink-0 gap-1.5 rounded-2xl border-gray-300 bg-white py-4.5 shadow hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to editor
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-6">
        <ScrollArea type="always" className="w-full" viewportClassName="max-h-[calc(100vh-15rem)] pb-3">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                {columns.map((column, columnIndex) => (
                  <th
                    key={column.key}
                    style={{ width: column.width, minWidth: column.width }}
                    className={cn(
                      "sticky top-0 z-20 border-b border-gray-200 bg-white px-3 pb-3 align-bottom font-normal",
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
                            {row.isActive && " · Editing"}
                          </p>
                          <button
                            type="button"
                            onClick={() => onEditVariant(row.id)}
                            className="mt-1 inline-flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-blue-600 shadow-none hover:text-blue-700 hover:underline"
                          >
                            <Pencil className="h-3 w-3" />
                            Open in editor
                          </button>
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
