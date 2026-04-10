"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import YourCopyIcon from "@/assets/icons/copy3.svg?react"
import { Input } from "@/components/ui/input"
import MailIcon from "@/assets/icons/mail.svg?react"
import TeamIcon from "@/assets/icons/Team/Team.svg?react"
import TeamBlackIcon from "@/assets/icons/Team/TeamBlack.svg?react"
import CancelIcon from "@/assets/icons/Team/Cancel.svg?react"
import JoinIcon from "@/assets/icons/Team/Join.svg?react"
import KeyIcon from "@/assets/icons/Team/Key.svg?react"
import LockIcon from "@/assets/icons/Team/Lock.svg?react"
import NameIcon from "@/assets/icons/Team/Name.svg?react"
import DeleteIcon from "@/assets/icons/Team/Delete.svg?react"
import SendIcon from "@/assets/icons/Team/send.svg?react"
import AddIcon from "@/assets/icons/Team/Add.svg?react"
import TrashIcon from "@/assets/icons/Team/Trash.svg?react"
import { Loader, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import useSubscription from "@/lib/useSubscriptionSettings"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"
const primaryButtonClass = "h-[45px] rounded-[20px] bg-[#003CFF] px-4 text-white hover:bg-[#002fd1]"
const cancelButtonClass = "h-[45px] rounded-[20px] border-2 border-[#003CFF] bg-white px-4 text-[#003CFF] hover:text-[#003CFF] hover:bg-white"
const iconInputClass = "h-[50px] rounded-[18px] border border-black/10 bg-white pl-12 text-[14px] font-medium text-[#1f1f1f] placeholder:font-medium placeholder:text-[#444444] focus-visible:ring-0 focus-visible:ring-offset-0"

export default function TeamSettings() {
    const {
        subscriptionData,
        refreshSubscriptionData,
        loading,
        isPaidSubscriber,
    } = useSubscription()

    const [teamMode, setTeamMode] = useState(null)
    const [teamName, setTeamName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [teamData, setTeamData] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false)
    const [isDeletingTeam, setIsDeletingTeam] = useState(false)

    const [inviteEmails, setInviteEmails] = useState([])
    const [currentEmail, setCurrentEmail] = useState("")
    const [isSendingInvites, setIsSendingInvites] = useState(false)
    const [deletingMemberId, setDeletingMemberId] = useState(null)

    useEffect(() => {
        if (subscriptionData.teamId) {
            fetch(`${API_BASE_URL}/api/teams/info`, { credentials: "include" })
                .then((res) => res.json())
                .then((data) => {
                    setTeamData(data)
                    setTeamMode(subscriptionData.isTeamOwner ? "owner" : "member")
                })
                .catch((err) => console.error("Failed to fetch team info:", err))
        }
    }, [subscriptionData.teamId, subscriptionData.isTeamOwner])

    if (loading || (subscriptionData.teamId && !teamData)) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-3">
                    <div className="h-12 w-52 rounded-[20px] bg-gray-200" />
                    <div className="h-12 rounded-[20px] bg-gray-200" />
                    <div className="h-24 rounded-[20px] bg-gray-200" />
                </div>
            </div>
        )
    }

    const handleCreateTeam = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ teamName }),
            })

            if (res.ok) {
                const data = await res.json()
                toast.success("Team created successfully!")
                setTeamData(data)
                setTeamMode("owner")
                setTeamName("")
            } else {
                toast.error("Failed to create team")
            }
        } catch {
            toast.error("Failed to create team")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddEmail = () => {
        const email = currentEmail.trim()
        if (!email) return

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address")
            return
        }

        if (inviteEmails.includes(email)) {
            toast.error("Email already added")
            return
        }

        setInviteEmails((prev) => [...prev, email])
        setCurrentEmail("")
    }

    const handleRemoveEmail = (emailToRemove) => {
        setInviteEmails((prev) => prev.filter((email) => email !== emailToRemove))
    }

    const handleSendInvites = async () => {
        if (inviteEmails.length === 0) {
            toast.error("Please add at least one email")
            return
        }

        setIsSendingInvites(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/send-invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ emails: inviteEmails }),
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(data.message)
                setInviteEmails([])
                setCurrentEmail("")
            } else {
                toast.error(data.error || "Failed to send invites")
            }
        } catch {
            toast.error("Failed to send invites")
        } finally {
            setIsSendingInvites(false)
        }
    }

    const handleDeleteTeam = async () => {
        setIsDeletingTeam(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/delete`, {
                method: "POST",
                credentials: "include",
            })

            if (res.ok) {
                const data = await res.json()
                toast.success(data.message || "Team deleted successfully")
                setTeamData(null)
                setTeamMode(null)
                setShowDeleteTeamDialog(false)
                refreshSubscriptionData()
            } else {
                const error = await res.json()
                toast.error(error.error || "Failed to delete team")
            }
        } catch {
            toast.error("Failed to delete team")
        } finally {
            setIsDeletingTeam(false)
        }
    }

    const handleJoinTeam = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ inviteCode }),
            })

            if (res.ok) {
                const data = await res.json()
                toast.success("Successfully joined team!")
                setTeamData(data)
                setTeamMode("member")
                setInviteCode("")
                refreshSubscriptionData()
                window.location.reload()
            } else {
                toast.error("Invalid invite code")
            }
        } catch {
            toast.error("Failed to join team")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemoveMember = async (memberId) => {
        setDeletingMemberId(memberId)
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/remove-member`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ memberId }),
            })

            if (res.ok) {
                toast.success("Member removed")
                setTeamData((prev) => ({
                    ...prev,
                    members: prev.members.filter((member) => member.id !== memberId),
                }))
            } else {
                toast.error("Failed to remove member")
            }
        } catch {
            toast.error("Failed to remove member")
        } finally {
            setDeletingMemberId(null)
        }
    }

    const wrapperClass = teamMode === "owner" && teamData
        ? "rounded-[28px] border border-black/[0.05] bg-[#f9f9f9] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        : "p-0"

    return (
        <div className="space-y-6">
            <div className={wrapperClass}>
                {!teamMode && (
                    <div className="flex flex-row gap-3">
                        <Button onClick={() => setTeamMode("creating")} className={`w-full ${primaryButtonClass}`}>
                            <TeamIcon className="h-4 w-4" />
                            Start a Team
                        </Button>
                        <Button onClick={() => setTeamMode("joining")} variant="outline" className={`w-full ${cancelButtonClass}`}  >
                            <JoinIcon className="w-4 h-4" />
                            Join a Team
                        </Button>
                    </div>
                )}

                {teamMode === "joining" && (
                    <div className="space-y-3">
                        <div className="relative">
                            <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1f1f1f]" />
                            <Input
                                placeholder="Enter team invite code"
                                className={iconInputClass}
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-row gap-3">
                            <Button disabled={!inviteCode || isLoading} onClick={handleJoinTeam} className={`w-full ${primaryButtonClass}`}>
                                {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <KeyIcon className="h-4 w-4" />}
                                Join Team
                            </Button>
                            <Button variant="outline" className={`w-full ${cancelButtonClass}`} onClick={() => { setTeamMode(null); setInviteCode("") }}>
                                <CancelIcon className="h-4 w-4" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {teamMode === "creating" && (
                    <div className="space-y-3">
                        <div className="relative">
                            <NameIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1f1f1f]" />
                            <Input
                                placeholder="Enter team name"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                className={iconInputClass}
                            />
                        </div>
                        <div className="flex flex-row gap-3">
                            <Button disabled={!teamName || isLoading} onClick={handleCreateTeam} className={`w-full ${primaryButtonClass}`}>
                                {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <TeamIcon className="h-4 w-4" />}
                                Create Team
                            </Button>
                            <Button variant="outline" className={`w-full ${cancelButtonClass}`} onClick={() => { setTeamMode(null); setTeamName("") }}>
                                <CancelIcon className="h-4 w-4" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {teamMode === "member" && teamData && (
                    <div className="rounded-[24px] border border-[#A7F3D0] bg-[#DCFCE7] px-5 py-4 pb-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <p className="text-[16px] font-semibold text-[#166534]">Your Current Team</p>
                                <div className="flex items-center gap-2">
                                    <TeamBlackIcon className="h-5 w-5 flex-shrink-0 text-[#166534]" />
                                    <p className="text-sm font-medium text-[#15803D]">
                                        You&apos;re now a part of <span className="font-extrabold text-[#14532D]">{teamData.teamName || teamData.name}</span>
                                    </p>
                                </div>
                                <p className="text-sm text-[#15803D]/85">
                                    Team created by {teamData.ownerName || "your team owner"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 pt-0.5 text-sm font-semibold text-[#166534]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                                <span>{isPaidSubscriber() ? "SUBSCRIBED" : "TEAM MEMBER"}</span>
                            </div>
                        </div>
                    </div>
                )}

                {teamMode === "owner" && teamData && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-[22px] font-semibold text-black">
                                    <TeamBlackIcon className="h-5 w-5" />
                                    <span>{teamData.teamName || teamData.name}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    Total members: {teamData.members?.length || 0}
                                </p>
                            </div>
                            <Button
                                onClick={() => setShowDeleteTeamDialog(true)}
                                className="h-[45px] rounded-[20px] bg-[#F00D55] px-4 text-white hover:bg-[#cf0b48]"
                            >
                                <DeleteIcon className="h-4 w-4" />
                                Delete Team
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-start gap-3 rounded-2xl bg-[#FFD1AD] px-3 py-1">
                            <span className="text-sm font-medium text-[#BC4500]">
                                Here is your Team ID
                            </span>
                            <div
                                className="flex cursor-pointer items-center gap-2 rounded-[16px] bg-[#FFB47B] px-3 py-2 pr-2"
                                onClick={() => {
                                    navigator.clipboard.writeText(teamData.inviteCode)
                                    toast.success("Copied to clipboard!")
                                }}
                            >
                                <span className="text-sm font-semibold text-[#AB5800]">
                                    {teamData.inviteCode}
                                </span>
                                <YourCopyIcon className="h-4 w-4 text-[#AB5800]" />
                            </div>
                            <span className="text-sm font-medium text-[#BC4500]">
                                Your team will need this to join.
                            </span>
                        </div>

                        <div className="space-y-3 rounded-[24px] bg-white p-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <SendIcon className="h-4 w-4" />
                                <span>Send Email Invites</span>
                            </div>
                            <p className="text-xs leading-5 text-gray-500">
                                Invited members will also get sent the team code and instructions to join. After signing up, they will have to come to the team page and enter the ID to join the team.
                            </p>

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1f1f1f]" />
                                    <Input
                                        placeholder="Enter email ID"
                                        value={currentEmail}
                                        onChange={(e) => setCurrentEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                                        className="h-[45px] rounded-[20px] border border-black/10 bg-white pl-12 text-[14px] font-medium text-[#1f1f1f] placeholder:font-medium placeholder:text-[#444444] focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                                <Button
                                    onClick={handleAddEmail}
                                    variant="outline"
                                    className="h-[45px] rounded-[20px] border-2 border-black bg-white px-6 font-semibold text-black hover:bg-white"
                                >
                                    <AddIcon className="h-4 w-4 text-black" />
                                    Add
                                </Button>
                            </div>

                            {inviteEmails.length > 0 && (
                                <div className="space-y-2">
                                    {inviteEmails.map((email, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="flex-1 rounded-[20px] border border-black/10 bg-white px-4 py-3">
                                                <span className="text-sm font-medium text-[#1f1f1f]">{email}</span>
                                            </div>
                                            <Button
                                                onClick={() => handleRemoveEmail(email)}
                                                className="h-[45px] w-[45px] rounded-[20px] bg-[#F00D55] p-0 text-white hover:bg-[#cf0b48]"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                onClick={handleSendInvites}
                                disabled={inviteEmails.length === 0 || isSendingInvites}
                                className="h-[50px] w-full rounded-[20px] bg-[#003CFF] text-white hover:bg-[#002fd1]"
                            >
                                {isSendingInvites ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Sending Invites...
                                    </>
                                ) : (
                                    <>
                                        <SendIcon className="h-4 w-4" />
                                        {`Send Invites (${inviteEmails.length})`}
                                    </>
                                )}
                            </Button>
                        </div>

                        {teamData.members?.length > 0 && (
                            <div className="space-y-2">
                                {teamData.members.map((member) => (
                                    <div key={member.id} className="flex items-center gap-2">
                                        <div className="flex flex-1 items-center justify-between rounded-[20px] bg-white px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={member.picture || "/default-avatar.png"}
                                                    alt={member.name}
                                                    className="h-8 w-8 rounded-full object-cover"
                                                />
                                                <span className="text-sm font-medium text-[#1f1f1f]">{member.name}</span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleRemoveMember(member.id)}
                                            size="icon"
                                            className="h-[45px] w-[45px] rounded-[20px] bg-[#F00D55] p-0 text-white hover:bg-[#cf0b48]"
                                            disabled={deletingMemberId === member.id}
                                        >
                                            {deletingMemberId === member.id ? (
                                                <Loader className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <TrashIcon className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Dialog open={showDeleteTeamDialog} onOpenChange={setShowDeleteTeamDialog}>
                            <DialogOverlay className="bg-black/50 !-mt-[20px]" />
                            <DialogContent className="sm:max-w-[425px] !rounded-[30px]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-500" />
                                        Delete Team
                                    </DialogTitle>
                                    <DialogDescription className="space-y-3 pt-3">
                                        <p>Are you sure you want to delete this team?</p>
                                        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                                            <p className="text-sm font-medium text-red-800">This action will:</p>
                                            <ul className="ml-4 list-disc text-sm text-red-700">
                                                <li>Remove all {teamData?.members?.length || 0} team members</li>
                                                <li>Cancel their access immediately</li>
                                            </ul>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Your personal subscription will remain active
                                        </p>
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteTeamDialog(false)}
                                        disabled={isDeletingTeam}
                                        className="flex-1 rounded-[20px] border-2 border-[#003CFF] bg-white text-[#003CFF] hover:bg-[#003CFF]/5"
                                    >
                                        <CancelIcon className="h-4 w-4" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleDeleteTeam}
                                        disabled={isDeletingTeam}
                                        className="flex-1 rounded-[20px] bg-[#F00D55] text-white hover:bg-[#cf0b48]"
                                    >
                                        {isDeletingTeam ? (
                                            <>
                                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <DeleteIcon className="h-4 w-4" />
                                                Delete Team
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>
        </div>
    )
}
