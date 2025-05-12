"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { CirclePlus, CircleCheck, Trash2 } from "lucide-react"
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate } from "@/lib/deleteCopyTemplate"
import { Textarea } from "../ui/textarea"
import useAdAccountSettings from "@/lib/useAdAccountSettings";


export default function CopyTemplates({
  selectedAdAccount,
  copyTemplates,
  setCopyTemplates,
  defaultTemplateName,
  setDefaultTemplateName,
  refreshSettings,
}) {
  const [templateName, setTemplateName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("Default Template")
  const [primaryTexts, setPrimaryTexts] = useState([""])
  const [headlines, setHeadlines] = useState([""])
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const { setSettings } = useAdAccountSettings(selectedAdAccount);

  const handleAdd = (setter, state) => {
    if (state.length < 5) setter([...state, ""])
  }

  const handleRemove = (index, setter, state) => {
    const updated = [...state]
    updated.splice(index, 1)
    setter(updated)
  }

  const handleChange = (index, setter, state, value) => {
    const updated = [...state]
    updated[index] = value
    setter(updated)
  }

  const handleSaveTemplate = async () => {
    try {
      const newTemplate = {
        name: templateName,
        primaryTexts,
        headlines,
      }

      await saveCopyTemplate(selectedAdAccount, templateName, newTemplate)

      setCopyTemplates((prev) => ({
        ...prev,
        [templateName]: newTemplate,
      }))
      setSelectedTemplate(templateName)
      toast.success("Template saved")
    } catch (err) {
      toast.error("Failed to save template: " + err.message)
    }
  }

  const handleNewTemplate = () => {
    setTemplateName("")
    setSelectedTemplate("New Template")
    setPrimaryTexts([""])
    setHeadlines([""])
  }

  useEffect(() => {
    if (!copyTemplates || !selectedTemplate) return
    const selected = copyTemplates[selectedTemplate]
    if (selected) {
      setTemplateName(selected.name)
      setPrimaryTexts(selected.primaryTexts || [""])
      setHeadlines(selected.headlines || [""])
    }
  }, [selectedTemplate])

  useEffect(() => {
    if (!selectedAdAccount) return;

    const keys = Object.keys(copyTemplates || {});
    if (keys.length === 0) {
      setSelectedTemplate("");
      setTemplateName("");
      setPrimaryTexts([""]);
      setHeadlines([""]);
      return;
    }

    // ✅ If currently selected template exists, don't override it
    if (selectedTemplate && keys.includes(selectedTemplate)) return;

    // ✅ Select default if available, else first available
    const fallbackTemplateName =
      defaultTemplateName && keys.includes(defaultTemplateName)
        ? defaultTemplateName
        : keys[0];

    const fallbackTemplate = copyTemplates[fallbackTemplateName];

    if (fallbackTemplate) {
      setSelectedTemplate(fallbackTemplateName);
      setTemplateName(fallbackTemplate.name);
      setPrimaryTexts(fallbackTemplate.primaryTexts || [""]);
      setHeadlines(fallbackTemplate.headlines || [""]);
    } else {
      setSelectedTemplate("");
      setTemplateName("");
      setPrimaryTexts([""]);
      setHeadlines([""]);
    }
  }, [selectedAdAccount, copyTemplates, defaultTemplateName]);


  return (
    <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-3 w-full max-w-3xl">
      {/* Title + Dropdown Row */}
      {/* Title + Dropdown Row */}
      <div className="flex items-start justify-between mb-6">
        {/* Title + Description */}
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center gap-2">
            <img
              src="https://meta-ad-uploader-server-production.up.railway.app/icons/template.svg"
              alt=""
              className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60"
            />
            <span className="text-sm font-medium text-zinc-950">Copy Templates</span>
          </div>
          <p className="text-xs text-gray-500 leading-tight">
            Add up to 5 Primary Texts and Headlines below, <br></br>Then save as a template to easily add to your ads in
            the future
          </p>
        </div>
        <Select
          value={Object.keys(copyTemplates).includes(selectedTemplate) ? selectedTemplate : ""}
          onValueChange={setSelectedTemplate}
        >
          <SelectTrigger className="w-[200px] rounded-xl px-3 py-2 text-sm justify-between bg-white">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent className="rounded-xl bg-white max-h-[300px] overflow-y-auto">
            {Object.entries(copyTemplates)
              .sort(([a], [b]) => {
                if (a === defaultTemplateName) return -1
                if (b === defaultTemplateName) return 1
                return 0
              })
              .map(([name]) => (
                <SelectItem
                  key={name}
                  value={name}
                  className="text-sm data-[state=checked]:rounded-lg 
                data-[highlighted]:rounded-lg"
                >
                  {name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Name */}
      <div className="space-y-1">
        <label className="text-[14px] text-gray-600">Template Name</label>
        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Enter Template Name"
          className="rounded-xl bg-white"
        />
      </div>

      {/* Primary Texts */}
      <div className="space-y-2">
        <label className="text-[14px] text-gray-600">Primary Text</label>
        {primaryTexts.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <Textarea
              placeholder="Enter primary text..."
              value={text}
              onChange={(e) => handleChange(i, setPrimaryTexts, primaryTexts, e.target.value)}
              className="rounded-xl bg-white"
            />
            {primaryTexts.length > 1 && (
              <Trash2
                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-red-500"
                onClick={() => handleRemove(i, setPrimaryTexts, primaryTexts)}
              />
            )}
          </div>
        ))}
        {primaryTexts.length < 5 && (
          <Button
            variant="ghost"
            className="bg-zinc-600 border border-gray-200 text-sm text-white w-full rounded-xl shadow-sm hover:bg-black hover:text-white h-[40px]"
            onClick={() => handleAdd(setPrimaryTexts, primaryTexts)}
          >
            + Add new primary text
          </Button>
        )}
      </div>

      {/* Headlines */}
      <div className="space-y-2">
        <label className="text-[14px] text-gray-600">Headline</label>
        {headlines.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Enter headline text..."
              value={text}
              onChange={(e) => handleChange(i, setHeadlines, headlines, e.target.value)}
              className="rounded-xl bg-white"
            />
            {headlines.length > 1 && (
              <Trash2
                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-red-500"
                onClick={() => handleRemove(i, setHeadlines, headlines)}
              />
            )}
          </div>
        ))}
        {headlines.length < 5 && (
          <Button
            variant="ghost"
            className="bg-zinc-600 border border-gray-200 text-sm text-white w-full rounded-xl shadow-sm hover:bg-black hover:text-white h-[40px]"
            onClick={() => handleAdd(setHeadlines, headlines)}
          >
            + Add new headline
          </Button>
        )}
      </div>

      {/* Save Button Row */}
      <div className="space-y-2 pt-2">
        <div>
          <Button
            className="bg-blue-500 text-white w-full rounded-xl hover:bg-blue-600 h-[45px]"
            onClick={handleSaveTemplate}
            disabled={!templateName.trim()}
          >
            Save Template
          </Button>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="w-full rounded-xl h-[40px] bg-zinc-800 hover:bg-black flex hover:text-white items-center gap-2 text-white"
            onClick={handleNewTemplate}
          >
            <CirclePlus className="w-4 h-4 text-white" />
            Add New Template
          </Button>

          <Button
            className={`w-full rounded-xl h-[40px] flex items-center gap-2 transition-colors ${defaultTemplateName === selectedTemplate
              ? "bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-default"
              : "bg-teal-600 text-white hover:bg-teal-700 hover:text-white cursor-pointer"
              }`}
            //disabled={defaultTemplateName === selectedTemplate}
            onClick={async () => {
              if (!templateName.trim() || defaultTemplateName === selectedTemplate) return;

              try {
                const updatedTemplate = {
                  name: templateName,
                  primaryTexts,
                  headlines,
                };

                await saveCopyTemplate(selectedAdAccount, templateName, updatedTemplate, true);
                toast.success("Set as default template");

                // ✅ Crucial step: refresh settings via parent component
                await refreshSettings();

                // Now your parent state is updated globally—no need to set locally here anymore.
                setSelectedTemplate(templateName);
              } catch (err) {
                toast.error("Failed to set default: " + err.message);
              }
            }}


          >
            <CircleCheck className="w-4 h-4" />
            {defaultTemplateName === selectedTemplate ? "Default Template" : "Set as Default Template"}
          </Button>

          <Button
            variant="destructive"
            className="w-full rounded-xl h-[40px] hover:bg-red-600 flex items-center gap-2"
            onClick={async () => {
              try {
                await deleteCopyTemplate(selectedAdAccount, selectedTemplate)
                setCopyTemplates((prev) => {
                  const updated = { ...prev }
                  delete updated[selectedTemplate]
                  return updated
                })
                toast.success("Template deleted")
              } catch (err) {
                toast.error("Failed to delete: " + err.message)
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete Template
          </Button>
        </div>
      </div>
    </div>
  )
}
