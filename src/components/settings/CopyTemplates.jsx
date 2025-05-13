"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { CirclePlus, CircleCheck, Trash2 } from "lucide-react"
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate } from "@/lib/deleteCopyTemplate"
import { Textarea } from "../ui/textarea"

// Debug helper function
const logState = (action, data) => {
  console.log(`[${new Date().toISOString()}] ${action}:`, data)
}

export default function CopyTemplates({
  selectedAdAccount,
  copyTemplates,
  setCopyTemplates,
  defaultTemplateName,
  setDefaultTemplateName,
}) {
  // Refs to track state changes
  const copyTemplatesRef = useRef(copyTemplates)
  const defaultTemplateNameRef = useRef(defaultTemplateName)

  // Local state
  const [templateName, setTemplateName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [primaryTexts, setPrimaryTexts] = useState([""])
  const [headlines, setHeadlines] = useState([""])
  const [isProcessing, setIsProcessing] = useState(false)

  // Update refs when props change
  useEffect(() => {
    copyTemplatesRef.current = copyTemplates
    logState("copyTemplates updated", copyTemplates)
  }, [copyTemplates])

  useEffect(() => {
    defaultTemplateNameRef.current = defaultTemplateName
    logState("defaultTemplateName updated", defaultTemplateName)
  }, [defaultTemplateName])

  // Helper functions
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

  // Load template data when selection changes
  useEffect(() => {
    logState("selectedTemplate changed", selectedTemplate)

    if (!copyTemplates || !selectedTemplate) return

    const selected = copyTemplates[selectedTemplate]
    if (selected) {
      logState("Loading template data", selected)
      setTemplateName(selected.name)
      setPrimaryTexts(selected.primaryTexts || [""])
      setHeadlines(selected.headlines || [""])
    }
  }, [selectedTemplate, copyTemplates])

  // Initialize template selection when ad account changes or templates load
  useEffect(() => {
    if (!selectedAdAccount) return

    logState("Initializing templates", {
      copyTemplates,
      defaultTemplateName,
      selectedTemplate,
    })

    const keys = Object.keys(copyTemplates || {})
    if (keys.length === 0) {
      setSelectedTemplate("")
      setTemplateName("")
      setPrimaryTexts([""])
      setHeadlines([""])
      return
    }

    // Only change selection if current selection is invalid
    if (selectedTemplate && keys.includes(selectedTemplate)) {
      logState("Keeping current selection", selectedTemplate)
      return
    }

    // Select default template or first available
    const initialTemplateName =
      defaultTemplateName && keys.includes(defaultTemplateName) ? defaultTemplateName : keys[0]

    const selected = copyTemplates[initialTemplateName]
    if (selected) {
      logState("Setting initial template", initialTemplateName)
      setSelectedTemplate(initialTemplateName)
      setTemplateName(selected.name)
      setPrimaryTexts(selected.primaryTexts || [""])
      setHeadlines(selected.headlines || [""])
    }
  }, [selectedAdAccount, copyTemplates, defaultTemplateName, selectedTemplate])

  // Create a new template
  const handleNewTemplate = () => {
    logState("Creating new template", null)
    setTemplateName("")
    setPrimaryTexts([""])
    setHeadlines([""])
    // Don't change selectedTemplate yet - wait until save
  }

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required")
      return
    }

    setIsProcessing(true)
    logState("Saving template", { templateName, primaryTexts, headlines })

    try {
      const newTemplate = {
        name: templateName,
        primaryTexts,
        headlines,
      }

      // Save to backend
      await saveCopyTemplate(selectedAdAccount, templateName, newTemplate)

      // Update local state in parent component
      setCopyTemplates((prev) => {
        const updated = {
          ...prev,
          [templateName]: newTemplate,
        }
        logState("Updated copyTemplates after save", updated)
        return updated
      })

      // Update selection after save
      setSelectedTemplate(templateName)
      toast.success("Template saved")
    } catch (err) {
      toast.error("Failed to save template: " + err.message)
      logState("Save template error", err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Set template as default
  const handleSetAsDefault = async () => {
    if (!templateName.trim() || defaultTemplateName === templateName) return

    setIsProcessing(true)
    logState("Setting as default", { templateName, currentDefault: defaultTemplateName })

    try {
      const updatedTemplate = {
        name: templateName,
        primaryTexts,
        headlines,
      }

      // Save to backend with default flag
      await saveCopyTemplate(selectedAdAccount, templateName, updatedTemplate, true)

      // Important: Update parent state in a single operation
      // to avoid race conditions
      setCopyTemplates((prev) => {
        const updated = {
          ...prev,
          [templateName]: updatedTemplate,
        }

        // Update default template name AFTER updating templates
        setTimeout(() => {
          logState("Setting default template name", templateName)
          setDefaultTemplateName(templateName)
        }, 0)

        return updated
      })

      toast.success("Set as default template")
    } catch (err) {
      toast.error("Failed to set default: " + err.message)
      logState("Set default error", err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return

    setIsProcessing(true)
    logState("Deleting template", selectedTemplate)

    try {
      await deleteCopyTemplate(selectedAdAccount, selectedTemplate)

      setCopyTemplates((prev) => {
        const updated = { ...prev }
        delete updated[selectedTemplate]
        logState("Updated copyTemplates after delete", updated)
        return updated
      })

      // Clear selection if we deleted the selected template
      setSelectedTemplate("")
      setTemplateName("")
      setPrimaryTexts([""])
      setHeadlines([""])

      toast.success("Template deleted")
    } catch (err) {
      toast.error("Failed to delete: " + err.message)
      logState("Delete template error", err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Get available templates for dropdown
  const availableTemplates = Object.entries(copyTemplates || {}).sort(([a], [b]) => {
    if (a === defaultTemplateName) return -1
    if (b === defaultTemplateName) return 1
    return 0
  })

  return (
    <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-3 w-full max-w-3xl">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-100 p-2 text-xs rounded mb-2 overflow-auto max-h-20">
          <div>Selected: {selectedTemplate || "none"}</div>
          <div>Default: {defaultTemplateName || "none"}</div>
          <div>Available: {Object.keys(copyTemplates || {}).join(", ") || "none"}</div>
        </div>
      )}

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

        {/* Dropdown */}
        <Select
          value={selectedTemplate}
          onValueChange={(value) => {
            logState("Template selected from dropdown", value)
            setSelectedTemplate(value)
          }}
        >
          <SelectTrigger className="w-[200px] rounded-xl px-3 py-2 text-sm justify-between bg-white">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent className="rounded-xl bg-white max-h-[300px] overflow-y-auto">
            {availableTemplates.map(([name]) => (
              <SelectItem
                key={name}
                value={name}
                className="text-sm data-[state=checked]:rounded-lg data-[highlighted]:rounded-lg"
              >
                {name} {name === defaultTemplateName ? "(Default)" : ""}
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
          disabled={isProcessing}
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
              disabled={isProcessing}
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
            disabled={isProcessing}
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
              disabled={isProcessing}
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
            disabled={isProcessing}
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
            disabled={!templateName.trim() || isProcessing}
          >
            {isProcessing ? "Saving..." : "Save Template"}
          </Button>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="w-full rounded-xl h-[40px] bg-zinc-800 hover:bg-black flex hover:text-white items-center gap-2 text-white"
            onClick={handleNewTemplate}
            disabled={isProcessing}
          >
            <CirclePlus className="w-4 h-4 text-white" />
            Add New Template
          </Button>

          <Button
            className={`w-full rounded-xl h-[40px] flex items-center gap-2 transition-colors ${defaultTemplateName === templateName
              ? "bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-default"
              : "bg-teal-600 text-white hover:bg-teal-700 hover:text-white cursor-pointer"
              }`}
            onClick={handleSetAsDefault}
            disabled={!templateName.trim() || defaultTemplateName === templateName || isProcessing}
          >
            <CircleCheck className="w-4 h-4" />
            {defaultTemplateName === templateName ? "Default Template" : "Set as Default Template"}
          </Button>

          <Button
            variant="destructive"
            className="w-full rounded-xl h-[40px] hover:bg-red-600 flex items-center gap-2"
            onClick={handleDeleteTemplate}
            disabled={!selectedTemplate || isProcessing}
          >
            <Trash2 className="w-4 h-4" />
            Delete Template
          </Button>
        </div>
      </div>
    </div>
  )
}
