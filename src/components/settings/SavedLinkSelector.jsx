/* eslint-disable react/prop-types */
import { useState } from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { sortLinks } from "./templateLinkUtils";
import useSortPreference from "./useSortPreference";

export function LinkLabel({ link }) {
  return <TooltipProvider delayDuration={250}><Tooltip>
    <TooltipTrigger asChild>
      <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {link.title?.trim() && <span className="max-w-[50%] shrink-0 truncate font-semibold text-zinc-900">{link.title.trim()}</span>}
        <span className="truncate font-normal text-gray-600">{link.url}</span>
      </span>
    </TooltipTrigger>
    <TooltipContent className="z-[100] max-w-sm break-all rounded-xl bg-zinc-800 px-3 py-2 text-white">{link.url}</TooltipContent>
  </Tooltip></TooltipProvider>;
}

export function LinkSortMenu({ mode, onChange }) {
  return <DropdownMenu><DropdownMenuTrigger asChild>
    <Button type="button" variant="ghost" size="icon" aria-label="Sort links" className="h-8 w-8 shrink-0 rounded-xl"><ArrowUpDown className="h-3.5 w-3.5 text-gray-500" /></Button>
  </DropdownMenuTrigger><DropdownMenuContent align="end" className="z-[100] rounded-xl bg-white">
    {[['alphabetical', 'Alphabetical (A–Z)'], ['created', 'Date created (oldest first)'], ['newest', 'Date created (newest first)']].map(([value, label]) =>
      <DropdownMenuItem key={value} onSelect={() => onChange(value)} className="gap-3 rounded-lg">{label}{mode === value && <Check className="ml-auto h-3.5 w-3.5 text-blue-500" />}</DropdownMenuItem>)}
  </DropdownMenuContent></DropdownMenu>;
}

export default function SavedLinkSelector({ links, value, onValueChange, disabled, className = "", label = "Select a link" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useSortPreference("linkSortMode", "created");
  const selected = links.find(link => link.url === value);
  const filtered = sortLinks(links, mode).filter(link => `${link.title || ""} ${link.url}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <Popover open={open} onOpenChange={next => { setOpen(next); setQuery(""); }}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={label} disabled={disabled} className={`w-full min-w-0 justify-between rounded-2xl border-gray-300 bg-white shadow hover:bg-white ${className}`}>
      {selected ? <LinkLabel link={selected} /> : <span className="truncate font-normal">{value || label}</span>}
      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[250px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-0 shadow-lg">
      <Command shouldFilter={false} className="rounded-2xl">
        <div className="flex items-center pr-2"><CommandInput wrapperClassName="min-w-0 flex-1" placeholder="Search links or titles..." value={query} onValueChange={setQuery} /><LinkSortMenu mode={mode} onChange={setMode} /></div>
        <CommandList className="p-1"><CommandEmpty>No links found.</CommandEmpty>
          {filtered.map(link => <CommandItem key={link.url} value={link.url} onSelect={() => { onValueChange(link.url); setOpen(false); }} className="m-1 cursor-pointer rounded-xl px-3 py-2 data-[selected=true]:bg-gray-100">
            <LinkLabel link={link} />
            {link.isDefault && <span className="shrink-0 rounded-lg bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Default</span>}
            {value === link.url && <Check className="h-4 w-4 shrink-0 text-blue-500" />}
          </CommandItem>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
