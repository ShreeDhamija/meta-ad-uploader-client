import { useEffect, useState } from "react"
import PropTypes from "prop-types"
import { Check, ChevronDown, Loader } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Profile picture that never renders as a broken image: the server sends a
// freshly resolved Graph URL (same approach as the header), and if that still
// fails to load we fall back to the member's initials.
export function MemberAvatar({ src, name, className = "h-8 w-8" }) {
    const [failed, setFailed] = useState(!src)

    useEffect(() => {
        setFailed(!src)
    }, [src])

    if (failed) {
        const initials = (name || "?")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "?"
        return (
            <div
                className={`${className} flex flex-shrink-0 items-center justify-center rounded-full bg-[#E5ECFF] text-[11px] font-semibold text-[#003CFF]`}
                aria-label={name}
            >
                {initials}
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`${className} flex-shrink-0 rounded-full object-cover`}
        />
    )
}

MemberAvatar.propTypes = {
    src: PropTypes.string,
    name: PropTypes.string,
    className: PropTypes.string,
}

function RadioMark({ checked }) {
    return (
        <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-[#003CFF]" : "border-gray-400"}`}>
            {checked && <span className="h-2 w-2 rounded-full bg-[#003CFF]" />}
        </span>
    )
}

RadioMark.propTypes = { checked: PropTypes.bool }

function CheckMark({ checked }) {
    return (
        <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border-2 ${checked ? "border-[#003CFF] bg-[#003CFF]" : "border-gray-400 bg-white"}`}>
            {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </span>
    )
}

CheckMark.propTypes = { checked: PropTypes.bool }

/**
 * Permissions dropdown for one row of the team list (team owner only).
 * `isOwnerRow` → the owner always keeps invite + billing, so only the sync
 * source radio is selectable. A member who pays for the team keeps billing.
 */
export function MemberPermissionsMenu({ permissions, isOwnerRow, saving, onChange }) {
    const isSyncSource = !!permissions?.isSyncSource
    const canInvite = isOwnerRow || !!permissions?.canInviteMembers
    const canBill = isOwnerRow || !!permissions?.canManageBilling
    const billingLocked = isOwnerRow || !!permissions?.isBillingOwner

    // Keep the menu open while toggling so several permissions can be set at once
    const keepOpen = (handler) => (event) => {
        event.preventDefault()
        if (!saving) handler()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-[14px] border border-black/10 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none"
                >
                    {saving && <Loader className="h-3.5 w-3.5 animate-spin" />}
                    Permissions
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-72 rounded-2xl bg-white p-2"
                style={{ backgroundColor: "#ffffff" }}
            >
                <DropdownMenuItem
                    onSelect={keepOpen(() => {
                        if (!isSyncSource) onChange({ syncSource: true })
                    })}
                    className="cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 focus:bg-neutral-100"
                >
                    <RadioMark checked={isSyncSource} />
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-900">Ad Account Sync Source</p>
                        <p className="text-xs leading-4 text-gray-500">
                            This user&apos;s ad account preferences will be inherited by all team members if team sync is turned on
                        </p>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-gray-100" />

                <DropdownMenuItem
                    disabled={isOwnerRow}
                    onSelect={keepOpen(() => onChange({ canInviteMembers: !canInvite }))}
                    className="cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 focus:bg-neutral-100"
                >
                    <CheckMark checked={canInvite} />
                    <p className="text-sm font-medium text-gray-900">Invite More Team Members</p>
                </DropdownMenuItem>

                <DropdownMenuItem
                    disabled={billingLocked}
                    onSelect={keepOpen(() => onChange({ canManageBilling: !canBill }))}
                    className="cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 focus:bg-neutral-100"
                >
                    <CheckMark checked={canBill} />
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-900">Handle Billing</p>
                        {!isOwnerRow && permissions?.isBillingOwner && (
                            <p className="text-xs leading-4 text-gray-500">Pays for the team&apos;s subscription</p>
                        )}
                    </div>
                </DropdownMenuItem>

                {isOwnerRow && (
                    <p className="px-3 pb-1 pt-1.5 text-[11px] leading-4 text-gray-400">
                        As the team owner you can always invite members and handle billing.
                    </p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

MemberPermissionsMenu.propTypes = {
    permissions: PropTypes.shape({
        canInviteMembers: PropTypes.bool,
        canManageBilling: PropTypes.bool,
        isSyncSource: PropTypes.bool,
        isBillingOwner: PropTypes.bool,
    }),
    isOwnerRow: PropTypes.bool,
    saving: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
}
