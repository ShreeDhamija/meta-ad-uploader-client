"use client"

import { useEffect, useReducer, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { toast } from "sonner"
import { CirclePlus, CircleCheck, Trash2 } from "lucide-react"
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate } from "@/lib/deleteCopyTemplate"
import { Textarea } from "../ui/textarea"

const initialState = {
  templates: {},
  defaultName: "",
  selectedName: "",
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_ALL":
      return {
        templates: action.payload.templates || {},
        defaultName: action.payload.defaultName || "",
        selectedName:
          action.payload.defaultName && action.payload.templates?.[action.payload.defaultName]
            ? action.payload.defaultName
            : Object.keys(action.payload.templates || {})[0] || "",
      }

    case "SAVE_TEMPLATE":
      return {
        ...state,
        templates: {
          ...state.templates,
          [action.payload.name]: action.payload.data,
        },
        selectedName: action.payload.name,
      }

    case "SET_DEFAULT":
      return {
        ...state,
        defaultName: action.payload,
        selectedName: action.payload,
      }

    case "DELETE_TEMPLATE": {
      const updated = { ...state.templates }
      delete updated[action.payload]

      const keys = Object.keys(updated)

      const fallback =
        state.defaultName && updated[state.defaultName]
          ? state.defaultName
          : keys[0] || ""

      return {
        ...state,
        templates: updated,
        selectedName: fallback,
        defaultName:
          state.defaultName === action.payload
            ? keys[0] || ""
            : state.defaultName,
      }
    }


    case "SELECT_TEMPLATE":
      return {
        ...state,
        selectedName: action.payload,
      }

    default:
      return state
  }
}

export default function CopyTemplates({ selectedAdAccount, adSettings, setAdSettings }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { templates, defaultName, selectedName } = state

  const [templateName, setTemplateName] = useState("")
  const [primaryTexts, setPrimaryTexts] = useState([""])
  const [headlines, setHeadlines] = useState([""])
  const [isProcessing, setIsProcessing] = useState(false)

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
    const t = templates[selectedName]
    if (t) {
      setTemplateName(t.name || "")
      setPrimaryTexts(t.primaryTexts || [""])
      setHeadlines(t.headlines || [""])
    } else {
      // No valid template selected — clear fields
      setTemplateName("")
      setPrimaryTexts([""])
      setHeadlines([""])
    }
  }, [selectedName, templates])


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
      await saveCopyTemplate(selectedAdAccount, templateName, newTemplate)

      dispatch({
        type: "SAVE_TEMPLATE",
        payload: { name: templateName, data: newTemplate },
      })

      toast.success("Template saved")
    } catch (err) {
      toast.error("Failed to save template")
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

      dispatch({ type: "SAVE_TEMPLATE", payload: { name: templateName, data: updatedTemplate } })
      dispatch({ type: "SET_DEFAULT", payload: templateName })

      setAdSettings((prev) => ({
        ...prev,
        defaultTemplateName: templateName,
        copyTemplates: {
          ...prev.copyTemplates,
          [templateName]: updatedTemplate,
        },
      }))

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
            Add up to 5 Primary Texts and Headlines below, <br />Then save as a template to easily add to your ads in
            the future
          </p>
        </div>

        <Select
          value={selectedName}
          onValueChange={(value) => dispatch({ type: "SELECT_TEMPLATE", payload: value })}
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
          disabled={!templateName.trim() || isProcessing}
        >
          {isProcessing ? "Saving..." : "Save Template"}
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
            className={`w-full rounded-xl h-[40px] flex items-center gap-2 transition-colors ${defaultName === templateName
              ? "bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-default"
              : "bg-teal-600 text-white hover:bg-teal-700 hover:text-white cursor-pointer"
              }`}
            onClick={handleSetAsDefault}
            disabled={!templateName.trim() || defaultName === templateName || isProcessing}
          >
            <CircleCheck className="w-4 h-4" />
            {defaultName === templateName ? "Default Template" : "Set as Default Template"}
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
    </div>
  )
}
