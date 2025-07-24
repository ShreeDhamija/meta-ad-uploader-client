"use client"

import React, { useEffect, useReducer, useState, useRef, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { CirclePlus, CircleCheck, Trash2, Download } from 'lucide-react'
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate } from "@/lib/deleteCopyTemplate"
import TextareaAutosize from 'react-textarea-autosize'
import { RotateLoader } from "react-spinners"





// Custom SelectItem component with delete button
const SelectItemWithDelete = React.memo(({ value, name, isDefault, onDelete }) => {
  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    onDelete(name)
  }, [onDelete, name])

  return (
    <SelectItem
      value={value}
      className="text-sm data-[state=checked]:rounded-lg data-[highlighted]:rounded-lg pr-8 relative"
    >
      <span className="flex-1 pointer-events-none">
        {name} {isDefault ? "(Default)" : ""}
      </span>
      {/* <Trash2
        tabIndex={-1}
        className="w-4 h-4 text-gray-400 hover:text-red-500 absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer z-10 pointer-events-auto"
        onMouseDown={handleDeleteClick}
      /> */}
    </SelectItem>
  )
})


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
  const isEditingDefault = useMemo(() =>
    defaultName === editingTemplate, [defaultName, editingTemplate]
  )
  const nameAlreadyExists = useMemo(() =>
    templateName.trim() &&
    templateName !== editingTemplate &&
    Object.keys(templates).includes(templateName),
    [templateName, editingTemplate, templates]
  )

  const currentTemplate = useMemo(() =>
    templates[editingTemplate] || {}, [templates, editingTemplate]
  )

  const templateChanged = useMemo(() =>
    templateName !== currentTemplate.name ||
    JSON.stringify(primaryTexts) !== JSON.stringify(currentTemplate.primaryTexts || []) ||
    JSON.stringify(headlines) !== JSON.stringify(currentTemplate.headlines || []),
    [templateName, currentTemplate.name, primaryTexts, currentTemplate.primaryTexts, headlines, currentTemplate.headlines]
  )

  const [showImportPopup, setShowImportPopup] = useState(false)
  const [recentAds, setRecentAds] = useState([])
  const [isFetchingCopy, setIsFetchingCopy] = useState(false)

  useEffect(() => {
    const allTrashIcons = document.querySelectorAll('[data-lucide="trash-2"]');
    console.log('=== TRASH ICON AUDIT ===');
    console.log('Total Trash2 icons found:', allTrashIcons.length);

    allTrashIcons.forEach((icon, index) => {
      const rect = icon.getBoundingClientRect();
      const parent = icon.closest('[role="option"], .primary-text-item, .headline-item');
      console.log(`Icon ${index}:`, {
        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        isVisible: rect.width > 0 && rect.height > 0,
        parentContext: parent ? parent.className : 'NO PARENT CONTEXT',
        innerHTML: icon.parentElement?.innerHTML?.substring(0, 100)
      });
    });
  }, [templates, primaryTexts, headlines]);


  useEffect(() => {
    if (!showImportPopup || !selectedAdAccount) return;

    setIsFetchingCopy(true)
    fetch(`https://api.withblip.com/auth/fetch-recent-copy?adAccountId=${selectedAdAccount}`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.primaryTexts || data.headlines) {
          setRecentAds({
            primaryTexts: data.primaryTexts || [],
            headlines: data.headlines || []
          });
        } else {
          throw new Error("No data");
        }
      })
      .catch(err => {
        console.error("Error fetching ad copy:", err);
        toast.error("Failed to load recent ad copy");
      })
      .finally(() => setIsFetchingCopy(false))
  }, [showImportPopup]);


  useEffect(() => {
    if (!selectedAdAccount || !adSettings) return



    const templates = adSettings.copyTemplates || {};
    const defaultName = adSettings.defaultTemplateName || "";
    const firstTemplate =
      defaultName && templates[defaultName]
        ? defaultName
        : Object.keys(templates)[0] || "";

    dispatch({
      type: "SET_ALL",
      payload: {
        templates: adSettings.copyTemplates || {},
        defaultName: adSettings.defaultTemplateName || "",
      },
    });

    if (!firstTemplate) {
      setTemplateName("");
      setPrimaryTexts([""]);
      setHeadlines([""]);
    }
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


  const handleAdd = useCallback((setter, state) => {
    if (state.length < 5) setter([...state, ""])
  }, [])

  const handleRemove = useCallback((index, setter, state) => {
    const updated = [...state]
    updated.splice(index, 1)
    setter(updated)
  }, [])

  const handleChange = useCallback((index, setter, state, value) => {
    const updated = [...state]
    updated[index] = value
    setter(updated)
  }, [])

  // 2. IMPORTANT: Memoize template operations
  const handleNewTemplate = useCallback(() => {
    dispatch({ type: "NEW_TEMPLATE" })
    setTemplateName("")
    setPrimaryTexts([""])
    setHeadlines([""])
  }, [])


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


  const handleDeleteTemplate = useCallback(async (templateName) => {
    if (!templateName) return

    setIsProcessing(true)
    try {
      await deleteCopyTemplate(selectedAdAccount, templateName)

      setAdSettings((prev) => {
        const updatedCopyTemplates = { ...prev.copyTemplates }
        delete updatedCopyTemplates[templateName]

        const updatedDefaultTemplateName =
          prev.defaultTemplateName === templateName
            ? Object.keys(updatedCopyTemplates)[0] || ""
            : prev.defaultTemplateName

        return {
          ...prev,
          copyTemplates: updatedCopyTemplates,
          defaultTemplateName: updatedDefaultTemplateName,
        }
      })

      dispatch({ type: "DELETE_TEMPLATE", payload: templateName })
      toast.success("Template deleted")
    } catch (err) {
      toast.error("Failed to delete template")
    } finally {
      setIsProcessing(false)
    }
  }, [selectedAdAccount, setAdSettings])

  const availableTemplates = useMemo(() =>
    Object.entries(templates).sort(([a], [b]) => {
      if (a === defaultName) return -1
      if (b === defaultName) return 1
      return 0
    }), [templates, defaultName]
  )

  const createPrimaryTextImportHandler = useCallback((text) => () => {
    const currentTexts = [...primaryTexts];
    const emptyIndex = currentTexts.findIndex(t => t === "");
    let importedToIndex;

    if (emptyIndex !== -1) {
      currentTexts[emptyIndex] = text;
      importedToIndex = emptyIndex;
    } else if (currentTexts.length < 5) {
      currentTexts.push(text);
      importedToIndex = currentTexts.length - 1;
    } else {
      currentTexts[currentTexts.length - 1] = text;
      importedToIndex = currentTexts.length - 1;
    }

    setPrimaryTexts(currentTexts);
    toast.success(`Imported text into Primary Text ${importedToIndex + 1}`);
  }, [primaryTexts])

  const createHeadlineImportHandler = useCallback((text) => () => {
    const currentHeadlines = [...headlines];
    const emptyIndex = currentHeadlines.findIndex(t => t === "");
    let importedToIndex;

    if (emptyIndex !== -1) {
      currentHeadlines[emptyIndex] = text;
      importedToIndex = emptyIndex;
    } else if (currentHeadlines.length < 5) {
      currentHeadlines.push(text);
      importedToIndex = currentHeadlines.length - 1;
    } else {
      currentHeadlines[currentHeadlines.length - 1] = text;
      importedToIndex = currentHeadlines.length - 1;
    }

    setHeadlines(currentHeadlines);
    toast.success(`Imported text into Headline ${importedToIndex + 1}`);
  }, [headlines])

  return (
    <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-3 w-full max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center gap-2">
            <img
              src="https://unpkg.com/@mynaui/icons/icons/file-text.svg"
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
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="flex items-center text-xs rounded-xl px-3 py-1 bg-zinc-800 text-white hover:text-white hover:bg-black"
            onClick={() => setShowImportPopup(true)}
          >
            <Download className="w-4 h-4" />
            Import Copy
          </Button>
        </div>
      </div>

      {/* New row with template dropdown and set as default button */}
      <div className="flex items-center gap-3 mb-4 transition-all duration-300">
        <Select
          value={selectedName}
          onValueChange={(value) => dispatch({ type: "SELECT_TEMPLATE", payload: value })}
          disabled={availableTemplates.length === 0}
        >
          <SelectTrigger className="flex-1 rounded-xl px-3 py-2 text-sm justify-between bg-white disabled:opacity-50 disabled:cursor-not-allowed">
            <SelectValue placeholder={availableTemplates.length === 0 ? "No templates exist" : "Select a template"} />
          </SelectTrigger>
          <SelectContent className="rounded-xl bg-white max-h-[300px] overflow-y-auto">
            {availableTemplates.map(([name]) => (
              <SelectItemWithDelete
                key={name}
                value={name}
                name={name}
                isDefault={name === defaultName}
                onDelete={handleDeleteTemplate}
              />
            ))}
          </SelectContent>
        </Select>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${editingTemplate ? 'w-[250px] opacity-100' : 'w-0 opacity-0'
          }`}>
          <Button
            className={`w-[250px] rounded-xl h-[35px] flex items-center gap-2 transition-colors whitespace-nowrap ${isEditingDefault
              ? "bg-green-600 text-white hover:bg-green-600 hover:text-white cursor-default"
              : "bg-teal-600 text-white hover:bg-teal-700 hover:text-white cursor-pointer"
              }`}
            onClick={handleSetAsDefault}
            disabled={!templateName.trim() || isEditingDefault || isProcessing}
          >
            <CircleCheck className="w-4 h-4" />
            {isEditingDefault ? "Default Template" : "Set as Default Template"}
          </Button>
        </div>
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
        <label className="text-[14px] text-gray-700">Primary Text</label>
        {primaryTexts.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextareaAutosize
              placeholder={`Enter Primary Text ${i + 1}`}
              value={text}
              onChange={(e) => handleChange(i, setPrimaryTexts, primaryTexts, e.target.value)}
              className="rounded-xl bg-white px-3 py-2 w-full text-sm resize-none focus:outline-none"
              minRows={2}
              maxRows={10}
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
        <label className="text-[14px] text-gray-700">Headline</label>
        {headlines.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder={`Enter Headline ${i + 1}`}
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

        {/* Bottom row with remaining two buttons split 50/50 */}
        <div className="flex gap-4">
          {availableTemplates.length > 0 && (
            <Button
              variant="outline"
              className="w-full rounded-xl h-[40px] bg-zinc-800 hover:bg-black flex hover:text-white items-center gap-2 text-white transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-2"
              onClick={handleNewTemplate}
              disabled={isProcessing}
            >
              <CirclePlus className="w-4 h-4 text-white" />
              Add New Template
            </Button>
          )}
        </div>
      </div>

      {showImportPopup && (
        <div
          className="fixed inset-0 !z-[9999] bg-black bg-opacity-30 flex justify-center items-center"
          style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}
        >
          <div className="bg-white rounded-2xl max-h-[80vh] w-[750px] shadow-xl relative border border-gray-200 overflow-hidden">
            <div className="max-h-[80vh] overflow-y-auto import-popup-scroll">
              {/* Header row: title + close - make this sticky */}
              <div className={`sticky top-0 bg-white z-10 px-6 py-3 border-b border-gray-200`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-zinc-900">Recently Created Ad Copy</h2>
                  <Button
                    className="bg-red-600 text-white rounded-xl px-3 py-1 hover:bg-red-700 text-sm flex items-center gap-1"
                    onClick={() => setShowImportPopup(false)}
                  >
                    <CirclePlus className="w-4 h-4 transform rotate-45" />
                    Close
                  </Button>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4 space-y-6">
                {isFetchingCopy ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <RotateLoader size={6} margin={-16} color="#adadad" />
                    <span className="text-sm text-gray-600">Loading text copy...</span>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Primary Texts Section */}
                    {recentAds.primaryTexts?.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-md font-bold text-zinc-800">Primary Texts</h3>

                        <div className="border bg-gray-50 border-gray-200 rounded-2xl p-2 space-y-2">
                          {recentAds.primaryTexts.map((text, index) => (
                            <div key={index} className="rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-medium text-gray-500">
                                  Primary Text {index + 1}
                                </div>
                                <Button
                                  className="flex items-center text-xs rounded-xl px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 shrink-0"
                                  onClick={createPrimaryTextImportHandler(text)}
                                >
                                  <Download className="w-3 h-3" />
                                  Import
                                </Button>
                              </div>
                              <div className="bg-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-line">
                                {text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Headlines Section */}
                    {recentAds.headlines?.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-md font-bold text-zinc-800">Headlines</h3>

                        <div className="border bg-gray-50 border-gray-200 rounded-2xl p-2 space-y-2">
                          {recentAds.headlines.map((text, index) => (
                            <div key={index} className="rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-medium text-gray-500">
                                  Headline {index + 1}
                                </div>
                                <Button
                                  className="flex items-center text-xs rounded-xl px-2 py-1 bg-green-600 text-white hover:bg-green-700 shrink-0"
                                  onClick={createHeadlineImportHandler(text)}
                                >
                                  <Download className="w-3 h-3" />
                                  Import
                                </Button>
                              </div>
                              <div className="bg-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-line">
                                {text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No data message */}
                    {(!recentAds.primaryTexts?.length && !recentAds.headlines?.length) && (
                      <div className="text-center py-10 text-gray-500">
                        No recent ad copy found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}