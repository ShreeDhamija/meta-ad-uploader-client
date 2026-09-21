/* eslint-disable react/prop-types */
import { useState } from "react";
import { ChevronDown, Eye, Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import SavedLinkSelector from "./SavedLinkSelector";
import { validTemplateLinkPairs, sortTemplates } from "./templateLinkUtils";
import useSortPreference from "./useSortPreference";

function TemplateSelector({ templates, value, excluded, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode] = useSortPreference("templateSortMode", "default");
  const entries = sortTemplates(templates, sortMode).filter(([name]) => !excluded.includes(name) && name.toLowerCase().includes(query.toLowerCase().trim()));
  return <Popover open={open} onOpenChange={next => { setOpen(next); setQuery(""); }}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label="Select a template to pair" className="w-full min-w-0 justify-between rounded-2xl border-gray-300 bg-white shadow hover:bg-white"><span className="truncate">{value || "Select a template"}</span><ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[230px] rounded-2xl bg-white p-0 shadow-lg">
      <Command shouldFilter={false} className="rounded-2xl"><CommandInput placeholder="Search templates..." value={query} onValueChange={setQuery} />
        <CommandList className="p-1"><CommandEmpty>No unpaired templates found.</CommandEmpty>
          {entries.map(([name, template]) => <CommandItem key={name} value={name} onSelect={() => { onChange(name); setOpen(false); }} className="m-1 cursor-pointer rounded-xl px-3 py-2 data-[selected=true]:bg-gray-100">
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild>
              <button type="button" aria-label={`Preview ${name}`} className="shrink-0 rounded-md p-1 text-gray-500 hover:text-blue-600" onClick={event => event.stopPropagation()}><Eye className="h-4 w-4" /></button>
            </TooltipTrigger><TooltipContent side="right" className="z-[100] max-h-80 w-80 overflow-y-auto rounded-2xl bg-zinc-800 p-4 text-white">
              <p className="mb-2 font-semibold">Primary text</p>
              {(template.primaryTexts || []).filter(Boolean).map((text, i) => <p key={i} className="mb-2 whitespace-pre-wrap break-words">{text}</p>)}
              <p className="mb-2 mt-3 font-semibold">Headlines</p>
              {(template.headlines || []).filter(Boolean).map((text, i) => <p key={i} className="mb-2 whitespace-pre-wrap break-words">{text}</p>)}
            </TooltipContent></Tooltip></TooltipProvider>
          </CommandItem>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}

export default function TemplateLinkSync({ value, onChange, templates, links }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pairs, setPairs] = useState([]);
  const validPairs = validTemplateLinkPairs(value, templates, links);
  const active = value.enabled && validPairs.length > 0;
  const complete = pairs.every(pair => pair.templateName && pair.url);
  const updatePair = (index, field, next) => setPairs(previous => previous.map((pair, i) => i === index ? { ...pair, [field]: next } : pair));
  return <div className="flex items-center justify-center gap-3 py-0.5">
    <span className="w-10 border-t border-dotted border-gray-300" />
    <Button type="button" variant="outline" size="sm" className={`h-8 rounded-xl bg-white text-xs shadow-xs ${active ? 'border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700' : 'border-blue-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700'}`} onClick={() => { setEnabled(value.enabled); setPairs(validPairs.length ? validPairs.map(pair => ({ ...pair })) : [{ templateName: "", url: "" }]); setOpen(true); }}><Link2 className="mr-1.5 h-3.5 w-3.5" />Sync templates and links</Button>
    <span className="w-10 border-t border-dotted border-gray-300" />
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent disableSlide className="max-w-2xl rounded-3xl bg-white sm:rounded-3xl data-[state=open]:animate-none data-[state=closed]:animate-none" overlayClassName="bg-black/30">
        <DialogHeader><DialogTitle>Sync templates and links</DialogTitle><DialogDescription>Pair each template with one link. Changing either selection in the ad form will select its match.</DialogDescription></DialogHeader>
        <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3"><label htmlFor="template-link-sync-enabled" className="text-sm font-medium">Enable sync</label><Switch id="template-link-sync-enabled" checked={enabled} onCheckedChange={setEnabled} /></div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 px-1 text-xs font-medium text-gray-500"><span>Template</span><span>Link</span><span /></div>
          {pairs.map((pair, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2">
            <TemplateSelector templates={templates} value={pair.templateName} excluded={pairs.filter((_, i) => i !== index).map(item => item.templateName)} onChange={name => updatePair(index, "templateName", name)} />
            <SavedLinkSelector links={links} value={pair.url} onValueChange={url => updatePair(index, "url", url)} />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-gray-500 hover:text-red-500" aria-label={`Remove pairing ${index + 1}`} onClick={() => setPairs(previous => previous.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
        </div>
        <Button type="button" variant="outline" className="rounded-2xl" disabled={!complete || pairs.length >= Object.keys(templates).length || links.length === 0} onClick={() => setPairs(previous => [...previous, { templateName: "", url: "" }])}><Plus className="mr-2 h-4 w-4" />Add pairing</Button>
        <p className="text-xs text-gray-500">Multiple templates can share a link. Selecting a shared link keeps the current template if paired; otherwise, the first template alphabetically is selected.</p>
        <DialogFooter><Button type="button" variant="outline" className="rounded-2xl" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700" disabled={enabled && (!complete || pairs.length === 0)} onClick={() => { onChange({ enabled, pairs: validTemplateLinkPairs({ pairs }, templates, links) }); setOpen(false); }}>Apply</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
