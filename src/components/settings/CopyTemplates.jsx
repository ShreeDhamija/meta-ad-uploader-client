"use client"

import React, { useEffect, useReducer, useState, useRef, useCallback, useMemo } from "react"
import { useBlocker } from "react-router";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { CirclePlus, CircleCheck, Trash2, Download, X, Loader } from 'lucide-react'
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate } from "@/lib/deleteCopyTemplate"
import TextareaAutosize from 'react-textarea-autosize'
import { RotateLoader } from "react-spinners"
import TemplateIcon from '@/assets/icons/template.svg?react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay
} from "@/components/ui/dialog";


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';



// Custom SelectItem component with delete button
const SelectItemWithDelete = React.memo(({ value, name, isDefault, onDelete }) => {
  const handleDeleteClick = useCallback(
    (e) => {
      e.stopPropagation()
      e.preventDefault()
      onDelete(name)
    },
    [onDelete, name],
  )

  return (
    <SelectItem
      value={value}
      className="text-sm data-[state=checked]:rounded-lg data-[highlighted]:rounded-lg group cursor-pointer pr-8"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center justify-between w-full">
          <span className="text-sm truncate">
            {name}
          </span>
          {isDefault && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
              Default
            </span>
          )}
        </div>
        <button
          type="button"
          className="absolute right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 rounded flex-shrink-0 data-[state=checked]:hidden"
          onMouseDown={handleDeleteClick}
          onClick={handleDeleteClick}
        >
          <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
        </button>
      </div>
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

export default function CopyTemplates({ selectedAdAccount, adSettings, setAdSettings, onTemplateUpdate }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const justSavedRef = useRef(false)
  const { templates, defaultName, selectedName, editingTemplate } = state
  const [templateName, setTemplateName] = useState("")
  const [primaryTexts, setPrimaryTexts] = useState(["", "", "", "", ""])
  const [headlines, setHeadlines] = useState(["", "", "", "", ""])
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


  const templateChanged = useMemo(() => {
    // Brand new template → trigger warning as soon as any field has content
    if (!currentTemplate?.id && !currentTemplate?.name) {
      return !!(
        templateName.trim() ||
        primaryTexts.some(text => text.trim()) ||
        headlines.some(text => text.trim())
      );
    }

    // Existing template → check for actual changes
    return (
      templateName !== currentTemplate.name ||
      JSON.stringify(primaryTexts) !== JSON.stringify(currentTemplate.primaryTexts || []) ||
      JSON.stringify(headlines) !== JSON.stringify(currentTemplate.headlines || [])
    );
  }, [
    templateName,
    currentTemplate,
    primaryTexts,
    headlines
  ]);

  const blocker = useBlocker(() => templateChanged);

  useEffect(() => {
    const handler = (e) => {
      if (templateChanged) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires this
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [templateChanged]);



  const [showImportPopup, setShowImportPopup] = useState(false)
  const [recentAds, setRecentAds] = useState([])
  const [isFetchingCopy, setIsFetchingCopy] = useState(false)
  const [previouslyFetched, setPreviouslyFetched] = useState({
    primaryTexts: [],
    headlines: []
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Add this to your existing state declarations
  const [paginationCursor, setPaginationCursor] = useState(null);


  // useEffect(() => {
  //   if (!showImportPopup || !selectedAdAccount) return;

  //   setIsFetchingCopy(true);
  //   // fetch(`${API_BASE_URL}/auth/fetch-recent-copy?adAccountId=${selectedAdAccount}`, {
  //   //   credentials: "include"
  //   // })
  //   fetch(`${API_BASE_URL}/auth/fetch-recent-copy`, {
  //     method: "POST",
  //     credentials: "include",
  //     headers: {
  //       "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify({
  //       adAccountId: selectedAdAccount
  //     })
  //   })
  //     .then(res => res.json())
  //     .then(data => {
  //       if (data.primaryTexts || data.headlines) {
  //         // Initial load - replace results
  //         setRecentAds({
  //           primaryTexts: data.primaryTexts || [],
  //           headlines: data.headlines || []
  //         });

  //         // Reset previously fetched tracker
  //         setPreviouslyFetched({
  //           primaryTexts: data.primaryTexts || [],
  //           headlines: data.headlines || []
  //         });
  //       } else {
  //         throw new Error("No data");
  //       }
  //     })
  //     .catch(err => {
  //       console.error("Error fetching ad copy:", err);
  //       toast.error("Failed to load recent ad copy");
  //     })
  //     .finally(() => {
  //       setIsFetchingCopy(false);
  //     });
  // }, [showImportPopup, selectedAdAccount]); // ← Clean dependencies

  useEffect(() => {
    if (!showImportPopup || !selectedAdAccount) return;

    setIsFetchingCopy(true);
    // Reset pagination cursor on initial fetch
    setPaginationCursor(null);

    fetch(`${API_BASE_URL}/auth/fetch-recent-copy`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adAccountId: selectedAdAccount,
        excludePrimaryTexts: [],
        excludeHeadlines: [],
        after: null // Initial fetch
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.primaryTexts || data.headlines) {
          setRecentAds({
            primaryTexts: data.primaryTexts || [],
            headlines: data.headlines || []
          });

          setPreviouslyFetched({
            primaryTexts: data.primaryTexts || [],
            headlines: data.headlines || []
          });

          // Store pagination cursor
          setPaginationCursor(data.nextCursor);
        } else {
          throw new Error("No data");
        }
      })
      .catch(err => {
        console.error("Error fetching ad copy:", err);
        toast.error("Failed to load recent ad copy");
      })
      .finally(() => {
        setIsFetchingCopy(false);
      });
  }, [showImportPopup, selectedAdAccount]);


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
      setPrimaryTexts(["", "", "", "", ""]);  // Changed from [""]
      setHeadlines(["", "", "", "", ""]);      // Changed from [""]
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
      setPrimaryTexts(["", "", "", "", ""])  // Changed from [""]
      setHeadlines(["", "", "", "", ""])      // Changed from [""]
    }
  }, [selectedName, templates, editingTemplate])



  const handleLoadMore = useCallback(async () => {
    if (!paginationCursor) {
      toast.info("No more copy available");
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/fetch-recent-copy`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adAccountId: selectedAdAccount,
          excludePrimaryTexts: previouslyFetched.primaryTexts,
          excludeHeadlines: previouslyFetched.headlines,
          after: paginationCursor // Use stored cursor
        })
      });

      const data = await response.json();

      const newPrimaryCount = data.primaryTexts?.length || 0;
      const newHeadlineCount = data.headlines?.length || 0;
      const hasNewCopy = newPrimaryCount > 0 || newHeadlineCount > 0;

      if (hasNewCopy) {
        setRecentAds(prev => ({
          primaryTexts: [...(prev.primaryTexts || []), ...(data.primaryTexts || [])],
          headlines: [...(prev.headlines || []), ...(data.headlines || [])]
        }));

        setPreviouslyFetched(prev => ({
          primaryTexts: [...prev.primaryTexts, ...(data.primaryTexts || [])],
          headlines: [...prev.headlines, ...(data.headlines || [])]
        }));

        // Update pagination cursor
        setPaginationCursor(data.nextCursor);
      } else {
        toast.info("No more unique copy found");
      }

    } catch (err) {
      console.error("Error loading more:", err);
      toast.error("Failed to load more copy");
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedAdAccount, previouslyFetched, paginationCursor]);


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
    setPrimaryTexts(["", "", "", "", ""])  // Changed from [""]
    setHeadlines(["", "", "", "", ""])      // Changed from [""]
  }, [])


  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required")
      return
    }

    const filteredPrimaryTexts = primaryTexts.filter(text => text.trim() !== "");
    const filteredHeadlines = headlines.filter(text => text.trim() !== "");

    const newTemplate = {
      name: templateName,
      primaryTexts: filteredPrimaryTexts,  // Changed from primaryTexts
      headlines: filteredHeadlines,        // Changed from headlines
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

      onTemplateUpdate();
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

    const filteredPrimaryTexts = primaryTexts.filter(text => text.trim() !== "");
    const filteredHeadlines = headlines.filter(text => text.trim() !== "");


    const updatedTemplate = {
      name: templateName,
      primaryTexts: filteredPrimaryTexts,  // Changed from primaryTexts
      headlines: filteredHeadlines,        // Changed from headlines
    }


    setIsProcessing(true)
    try {
      await saveCopyTemplate(selectedAdAccount, templateName, updatedTemplate, true)
      onTemplateUpdate();
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

      onTemplateUpdate();
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

  // Helper function to normalize text for comparison (removes extra whitespace, case insensitive)
  const normalizeText = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');

  // Check if text exists in current template
  const textExistsInTemplate = (text, templateTexts) => {
    const normalizedText = normalizeText(text);
    return templateTexts.some(templateText =>
      normalizeText(templateText) === normalizedText
    );
  };

  return (
    <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-3 w-full max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center gap-2">
            <TemplateIcon
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
            Import Recently Used Copy
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
          <SelectContent className="rounded-xl bg-white max-h-[300px] overflow-y-auto relative">
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
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl px-3 whitespace-nowrap"
          disabled={!templateName.trim() || isEditingDefault || isProcessing}
          onClick={handleSetAsDefault}
        >
          Set as Default
        </Button>
      </div>

      <div className="space-y-1">
        <label className="text-[14px] text-gray-600">Template Name</label>
        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Enter template name (e.g. Evergreen, Sale copy, etc.)"
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
              : !templateName.trim() && (primaryTexts.some(t => t.trim()) || headlines.some(t => t.trim()))
                ? "Enter Template Name to Save"
                : "Save Template"
          }

        </Button>
        {templateChanged && !nameAlreadyExists && (
          <p className="text-xs text-red-500 bg-red-200 rounded-xl border border-bg-100 text-left mt-1 p-2">
            *You have unsaved changes
          </p>
        )}


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
          className="fixed inset-0 !z-[9999] bg-black bg-opacity-30 flex justify-center items-start pt-48"
          style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}
          onClick={() => setShowImportPopup(false)} // Add this line
        >
          <div className="bg-white rounded-2xl max-h-[80vh] w-[750px] shadow-xl relative border border-gray-200 overflow-hidden self-start transition-all duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-y-auto import-popup-scroll transition-all duration-300 ease-in-out">
              <div className="px-6 pb-6 pt-4">
                {isFetchingCopy ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <RotateLoader size={6} margin={-16} color="#adadad" />
                    <span className="text-sm text-gray-600">Loading text copy...</span>
                  </div>
                ) : (
                  <Tabs defaultValue="primary-texts" className="w-full">
                    <div className="flex items-center justify-between mb-4 w-full">
                      <TabsList className="flex h-10 items-center justify-start rounded-full bg-muted p-1 text-muted-foreground w-fit">
                        <TabsTrigger
                          value="primary-texts"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                        >
                          Primary Texts ({recentAds.primaryTexts?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger
                          value="headlines"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                        >
                          Headlines ({recentAds.headlines?.length || 0})
                        </TabsTrigger>
                      </TabsList>
                      <Button
                        className="bg-red-600 hover:bg-red-700 !shadow-none rounded-xl"
                        onClick={() => setShowImportPopup(false)}
                      >
                        <CirclePlus className="w-4 h-4 rotate-45 text-white" />
                        <p className="text-white">Close</p>

                      </Button>
                    </div>

                    <TabsContent value="primary-texts" className="space-y-4">
                      {recentAds.primaryTexts?.length > 0 ? (
                        <div className="border bg-gray-50 border-gray-200 rounded-2xl p-2 space-y-2">
                          {recentAds.primaryTexts.map((text, index) => (
                            <div key={index} className="rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-medium text-gray-500">
                                  Primary Text {index + 1}
                                </div>
                                <Button
                                  className={`flex items-center text-xs rounded-xl px-2 py-1 shrink-0 ${textExistsInTemplate(text, primaryTexts)
                                    ? 'bg-white text-black cursor-not-allowed border border-gray-300 !shadow-none'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  onClick={textExistsInTemplate(text, primaryTexts) ? undefined : createPrimaryTextImportHandler(text)}
                                  disabled={textExistsInTemplate(text, primaryTexts)}
                                >
                                  {/* <Download className="w-3 h-3" /> */}
                                  {textExistsInTemplate(text, primaryTexts) ? 'Exists' : 'Import'}
                                </Button>
                              </div>
                              <div className="bg-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-line">
                                {text}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-gray-500">
                          No primary texts found
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="headlines" className="space-y-4">
                      {recentAds.headlines?.length > 0 ? (
                        <div className="border bg-gray-50 border-gray-200 rounded-2xl p-2 space-y-2">
                          {recentAds.headlines.map((text, index) => (
                            <div key={index} className="rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-medium text-gray-500">
                                  Headline {index + 1}
                                </div>
                                <Button
                                  className={`flex items-center text-xs rounded-xl px-2 py-1 shrink-0 ${textExistsInTemplate(text, headlines)
                                    ? 'bg-white text-black cursor-not-allowed border border-gray-300 !shadow-none'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  onClick={textExistsInTemplate(text, headlines) ? undefined : createHeadlineImportHandler(text)}
                                  disabled={textExistsInTemplate(text, headlines)}
                                >
                                  {/* <Download className="w-3 h-3" /> */}
                                  {textExistsInTemplate(text, headlines) ? 'Exists' : 'Import'}
                                </Button>
                              </div>
                              <div className="bg-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-line">
                                {text}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-gray-500">
                          No headlines found
                        </div>
                      )}
                    </TabsContent>
                    <div className="text-center pt-4 mt-4">
                      <Button
                        className="bg-gray-700 text-white hover:bg-gray-900 rounded-xl w-full"
                        onClick={handleLoadMore}
                        disabled={isFetchingCopy || isLoadingMore}
                      >
                        {isFetchingCopy || isLoadingMore ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin mr-2" />
                            Loading More Copy...
                          </>
                        ) : (
                          'Load More Copy'
                        )}
                      </Button>
                    </div>
                  </Tabs>

                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {blocker.state === "blocked" && (
        <Dialog className="rounded-xl" open onOpenChange={() => blocker.reset()}>
          <DialogOverlay className="bg-black/20 fixed inset-[-20px]" />
          <DialogContent className="rounded-[20px]">
            <DialogHeader>
              <DialogTitle>Unsaved Template Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes in your template. What would you like to do?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                className="bg-blue-500 text-white !rounded-xl"
                onClick={async () => {
                  await handleSaveTemplate();
                  blocker.proceed();
                }}
              >
                Save & Continue
              </Button>
              <Button
                className="!rounded-xl"
                variant="outline"
                onClick={() => blocker.proceed()}
              >
                Continue Without Saving
              </Button>
              <Button variant="ghost" onClick={() => blocker.reset()}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

