"use client"

import { useState, useEffect, useCallback } from "react"
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { deleteCopyTemplate } from "@/lib/deleteCopyTemplate"
import { toast } from "sonner"

/**
 * Custom hook to manage templates with proper state handling
 */
export default function useTemplateManager(selectedAdAccount, initialTemplates = {}, initialDefaultName = null) {
    // State
    const [templates, setTemplates] = useState(initialTemplates)
    const [defaultTemplateName, setDefaultTemplateName] = useState(initialDefaultName)
    const [isLoading, setIsLoading] = useState(false)

    // Update state when props change
    useEffect(() => {
        setTemplates(initialTemplates)
    }, [initialTemplates])

    useEffect(() => {
        setDefaultTemplateName(initialDefaultName)
    }, [initialDefaultName])

    // Save template
    const saveTemplate = useCallback(
        async (name, data, setAsDefault = false) => {
            if (!selectedAdAccount || !name) return false

            setIsLoading(true)
            try {
                // Save to backend
                await saveCopyTemplate(selectedAdAccount, name, data, setAsDefault)

                // Update local state
                setTemplates((prev) => ({
                    ...prev,
                    [name]: data,
                }))

                // Update default if needed
                if (setAsDefault) {
                    setDefaultTemplateName(name)
                }

                return true
            } catch (error) {
                console.error("Failed to save template:", error)
                toast.error(`Failed to save template: ${error.message}`)
                return false
            } finally {
                setIsLoading(false)
            }
        },
        [selectedAdAccount],
    )

    // Delete template
    const deleteTemplate = useCallback(
        async (name) => {
            if (!selectedAdAccount || !name) return false

            setIsLoading(true)
            try {
                // Delete from backend
                await deleteCopyTemplate(selectedAdAccount, name)

                // Update local state
                setTemplates((prev) => {
                    const updated = { ...prev }
                    delete updated[name]
                    return updated
                })

                // Clear default if needed
                if (defaultTemplateName === name) {
                    setDefaultTemplateName(null)
                }

                return true
            } catch (error) {
                console.error("Failed to delete template:", error)
                toast.error(`Failed to delete template: ${error.message}`)
                return false
            } finally {
                setIsLoading(false)
            }
        },
        [selectedAdAccount, defaultTemplateName],
    )

    return {
        templates,
        defaultTemplateName,
        isLoading,
        saveTemplate,
        deleteTemplate,
        setAsDefault: (name) => saveTemplate(name, templates[name], true),
    }
}
