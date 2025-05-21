"use client"

import { useEffect, useReducer, useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { CirclePlus, CircleCheck, Trash2 } from "lucide-react"
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate } from "@/lib/deleteCopyTemplate"
import { Textarea } from "../ui/textarea"

const initialState = {
  templates: {},
  defaultName: "",
  selectedName: "",
  editingTemplate: null, // Track if we're editing an existing template
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_ALL": {
      const templates = action.payload.templates || {}
      const defaultName = action.payload.defaultName || ""

      const firstTemplate =
        defaultName && templates[defaultName]
          ? defaultName
          : Object.keys(templates)[0] || ""

      return {
        ...state,
        templates,
        defaultName,
        selectedName: firstTemplate,
        editingTemplate: firstTemplate, // ✅ Corrected
      }
    }


    case "SAVE_TEMPLATE": {
      // Create a new templates object with the updated template
      const updatedTemplates = {
        ...state.templates,
        [action.payload.name]: action.payload.data,
      }

      // If we're renaming, remove the old template
      if (action.payload.oldName && action.payload.oldName !== action.payload.name) {
        delete updatedTemplates[action.payload.oldName]
      }

      // Update the default name if needed
      const newDefaultName = state.defaultName === action.payload.oldName ? action.payload.name : state.defaultName

      return {
        ...state,
        templates: updatedTemplates,
        //selectedName: action.payload.name,
        defaultName: newDefaultName,
        editingTemplate: action.payload.name, // Update the editing template to the new name
      }
    }

    case "SET_DEFAULT":
      return {
        ...state,
        defaultName: action.payload,
      }

    case "DELETE_TEMPLATE": {
      const updated = { ...state.templates }
      delete updated[action.payload]

      const keys = Object.keys(updated)

      const fallback = state.defaultName && updated[state.defaultName] ? state.defaultName : keys[0] || ""

      return {
        ...state,
        templates: updated,
        selectedName: fallback,
        defaultName: state.defaultName === action.payload ? keys[0] || "" : state.defaultName,
        editingTemplate: null,
      }
    }

    case "SELECT_TEMPLATE":
      return {
        ...state,
        selectedName: action.payload,
        editingTemplate: action.payload,
      }

    case "NEW_TEMPLATE":
      return {
        ...state,
        selectedName: "",
        editingTemplate: null,
      }

    default:
      return state
  }
}

export default function CopyTemplates({ selectedAdAccount, adSettings, setAdSettings }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const justSavedRef = useRef(false)
  const { templates, defaultName, selectedName, editingTemplate } = state
  const [templateName, setTemplateName] = useState("")
  const [primaryTexts, setPrimaryTexts] = useState([""])
  const [headlines, setHeadlines] = useState([""])
  const [isProcessing, setIsProcessing] = useState(false)
  const isEditingDefault = defaultName === editingTemplate
  const nameAlreadyExists =
    templateName.trim() &&
    templateName !== editingTemplate &&
    Object.keys(templates).includes(templateName)
  const currentTemplate = templates[editingTemplate] || {}
  const templateChanged =
    templateName !== currentTemplate.name ||
    JSON.stringify(primaryTexts) !== JSON.stringify(currentTemplate.primaryTexts || []) ||
    JSON.stringify(headlines) !== JSON.stringify(currentTemplate.headlines || [])
  const [showImportPopup, setShowImportPopup] = useState(false)
  const [recentAds, setRecentAds] = useState([])

  useEffect(() => {
    if (!showImportPopup || !selectedAdAccount) return;

    fetch(`https://meta-ad-uploader-server-production.up.railway.app/auth/fetch-recent-copy?adAccountId=${selectedAdAccount}`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.ads) setRecentAds(data.ads);
        else throw new Error("No data");
      })
      .catch(err => {
        console.error("Error fetching ad copy:", err);
        toast.error("Failed to load recent ad copy");
      });
  }, [showImportPopup]);


  useEffect(() => {
    if (!selectedAdAccount || !adSettings) return

    dispatch({
      type: "SET_ALL",
      payload: {
        templates: adSettings.copyTemplates || {},
        defaultName: adSettings.defaultTemplateName || "",
      },
    })
  }, [selectedAdAccount, adSettings])

  useEffect(() => {
    if (justSavedRef.current) {
      // Skip this render cycle
      justSavedRef.current = false
      return
    }

    if (selectedName && templates[selectedName]) {
      const t = templates[selectedName]
      setTemplateName(t.name || "")
      setPrimaryTexts(t.primaryTexts || [""])
      setHeadlines(t.headlines || [""])
    } else if (editingTemplate === null) {
      setTemplateName("")
      setPrimaryTexts([""])
      setHeadlines([""])
    }
  }, [selectedName, templates, editingTemplate])


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

  const handleNewTemplate = () => {
    dispatch({ type: "NEW_TEMPLATE" })
    setTemplateName("")
    setPrimaryTexts([""])
    setHeadlines([""])
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required")
      return
    }

    const newTemplate = {
      name: templateName,
      primaryTexts,
      headlines,
    }

    setIsProcessing(true)
    try {
      // Check if we're editing an existing template
      const isEditing = editingTemplate !== null && editingTemplate !== ""
      const isRenaming = isEditing && editingTemplate !== templateName

      // Determine if this template should be the default
      const shouldBeDefault = isRenaming && editingTemplate === defaultName

      // Save the template with the new name
      await saveCopyTemplate(selectedAdAccount, templateName, newTemplate, shouldBeDefault)

      // If we're renaming, delete the old template
      if (isRenaming) {
        await deleteCopyTemplate(selectedAdAccount, editingTemplate)
      }

      // Update parent component state
      setAdSettings((prev) => {
        const updatedCopyTemplates = { ...prev.copyTemplates }

        // Add the new template
        updatedCopyTemplates[templateName] = newTemplate

        // Remove the old template if renaming
        if (isRenaming) {
          delete updatedCopyTemplates[editingTemplate]
        }

        // Update default template name if needed
        const updatedDefaultTemplateName = shouldBeDefault ? templateName : prev.defaultTemplateName

        return {
          ...prev,
          copyTemplates: updatedCopyTemplates,
          defaultTemplateName: updatedDefaultTemplateName,
        }
      })

      // Update local state
      dispatch({
        type: "SAVE_TEMPLATE",
        payload: {
          name: templateName,
          data: newTemplate,
          oldName: isEditing ? editingTemplate : null,
        },
      })
      justSavedRef.current = true
      setTimeout(() => {
        dispatch({ type: "SELECT_TEMPLATE", payload: templateName })
      }, 0)

      toast.success(isRenaming ? "Template renamed" : isEditing ? "Template updated" : "Template saved")
    } catch (err) {
      toast.error("Failed to save template")
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSetAsDefault = async () => {
    if (!templateName.trim() || defaultName === templateName) return

    const updatedTemplate = {
      name: templateName,
      primaryTexts,
      headlines,
    }

    setIsProcessing(true)
    try {
      await saveCopyTemplate(selectedAdAccount, templateName, updatedTemplate, true)

      // Update parent component state
      setAdSettings((prev) => ({
        ...prev,
        defaultTemplateName: templateName,
        copyTemplates: {
          ...prev.copyTemplates,
          [templateName]: updatedTemplate,
        },
      }))

      // Update local state
      dispatch({ type: "SET_DEFAULT", payload: templateName })

      toast.success("Set as default template")
    } catch (err) {
      toast.error("Failed to set default template")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedName) return

    setIsProcessing(true)
    try {
      await deleteCopyTemplate(selectedAdAccount, selectedName)

      // Update parent component state
      setAdSettings((prev) => {
        const updatedCopyTemplates = { ...prev.copyTemplates }
        delete updatedCopyTemplates[selectedName]

        // If we're deleting the default template, find a new default
        const updatedDefaultTemplateName =
          prev.defaultTemplateName === selectedName
            ? Object.keys(updatedCopyTemplates)[0] || ""
            : prev.defaultTemplateName

        return {
          ...prev,
          copyTemplates: updatedCopyTemplates,
          defaultTemplateName: updatedDefaultTemplateName,
        }
      })

      // Update local state
      dispatch({ type: "DELETE_TEMPLATE", payload: selectedName })

      toast.success("Template deleted")
    } catch (err) {
      toast.error("Failed to delete template")
    } finally {
      setIsProcessing(false)
    }
  }

  const availableTemplates = Object.entries(templates).sort(([a], [b]) => {
    if (a === defaultName) return -1
    if (b === defaultName) return 1
    return 0
  })

  return (
    <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-3 w-full max-w-3xl">
      <div className="flex items-start justify-between mb-6">
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
            Add up to 5 Primary Texts and Headlines below, <br />
            Then save as a template to easily add to your ads in the future
          </p>
        </div>

        <Select value={selectedName} onValueChange={(value) => dispatch({ type: "SELECT_TEMPLATE", payload: value })}>
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
                {name} {name === defaultName ? "(Default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[14px] text-gray-600">Primary Text</label>
          <Button
            variant="ghost"
            className="text-xs rounded-lg px-3 py-1 bg-zinc-800 text-white hover:bg-black"
            onClick={() => setShowImportPopup(true)}
          >
            Import Copy
          </Button>
        </div>

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

      <div className="space-y-2 pt-2">
        <Button
          className="bg-blue-500 text-white w-full rounded-xl hover:bg-blue-600 h-[45px]"
          onClick={handleSaveTemplate}
          disabled={!templateName.trim() || isProcessing || nameAlreadyExists || !templateChanged}

        >
          {nameAlreadyExists
            ? "This template name already exists"
            : isProcessing
              ? "Saving..."
              : "Save Template"}
        </Button>


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
            className={`w-full rounded-xl h-[40px] flex items-center gap-2 transition-colors ${isEditingDefault
              ? "bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-default"
              : "bg-teal-600 text-white hover:bg-teal-700 hover:text-white cursor-pointer"
              }`}
            onClick={handleSetAsDefault}
            disabled={!templateName.trim() || isEditingDefault || isProcessing}
          >
            <CircleCheck className="w-4 h-4" />
            {isEditingDefault ? "Default Template" : "Set as Default Template"}
          </Button>


          <Button
            variant="destructive"
            className="w-full rounded-xl h-[40px] hover:bg-red-600 flex items-center gap-2"
            onClick={handleDeleteTemplate}
            disabled={!selectedName || isProcessing}
          >
            <Trash2 className="w-4 h-4" />
            Delete Template
          </Button>
        </div>
      </div>
      {showImportPopup && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-h-[80vh] overflow-y-auto w-[450px] space-y-6 shadow-xl relative">
            <h2 className="text-md font-semibold">Recently Created Ad Copy</h2>
            <Button
              className="absolute top-4 right-4 bg-red-600 text-white hover:bg-red-700 px-2 py-1 rounded"
              onClick={() => setShowImportPopup(false)}
            >
              Close
            </Button>

            {recentAds.map((ad, index) => (
              <div key={index} className="border-t pt-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-800">{ad.adName || `Ad ${index + 1}`}</h3>

                {ad.primaryTexts.slice(0, 5).map((text, i) => (
                  <div key={`pt-${i}`} className="text-sm text-gray-700">
                    <strong>Primary text {i + 1}:</strong> {text}
                  </div>
                ))}
                {ad.headlines.slice(0, 5).map((text, i) => (
                  <div key={`hl-${i}`} className="text-sm text-gray-700">
                    <strong>Headline {i + 1}:</strong> {text}
                  </div>
                ))}

                <Button
                  className="mt-2 text-sm bg-black text-white rounded-lg px-3 py-1 hover:bg-gray-900"
                  onClick={() => {
                    setPrimaryTexts(ad.primaryTexts.slice(0, 5));
                    setHeadlines(ad.headlines.slice(0, 5));
                    setShowImportPopup(false);
                  }}
                >
                  Import
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>

  )
}
