"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
import YourCopyIcon from '@/assets/icons/copy2.svg?react';
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, Loader, Trash2, AlertTriangle } from "lucide-react"
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


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function TeamSettings() {
    const {
        subscriptionData,
        hasActiveAccess,
        refreshSubscriptionData,
        isOnTrial,
        loading,
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

            fetch(`${API_BASE_URL}/api/teams/info`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    setTeamData(data)
                    setTeamMode(subscriptionData.isTeamOwner ? 'owner' : 'member')
                })
                .catch(err => console.error('Failed to fetch team info:', err))
        } else {

        }
    }, [subscriptionData.teamId, subscriptionData.isTeamOwner])



    if (loading || (subscriptionData.teamId && !teamData)) {
        return (
            <div className="space-y-6">
                <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
                    <CardHeader>
                        <div className="animate-pulse space-y-2">
                            <div className="h-6 bg-gray-200 rounded w-32"></div>
                            <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="animate-pulse space-y-3">
                            <div className="flex gap-1">
                                <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
                                <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
                            </div>
                            <div className="h-12 bg-gray-200 rounded-xl"></div>
                            <div className="h-20 bg-gray-200 rounded-xl"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const handleCreateTeam = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ teamName })
            })
            if (res.ok) {
                const data = await res.json()
                toast.success("Team created successfully!")
                setTeamData(data)
                setTeamMode('owner')
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
        const email = currentEmail.trim();
        if (!email) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        // Check for duplicates
        if (inviteEmails.includes(email)) {
            toast.error("Email already added");
            return;
        }

        setInviteEmails(prev => [...prev, email]);
        setCurrentEmail("");

    }

    const handleRemoveEmail = (emailToRemove) => {
        setInviteEmails(prev => prev.filter(email => email !== emailToRemove));
    }

    const handleSendInvites = async () => {
        if (inviteEmails.length === 0) {
            toast.error("Please add at least one email");
            return;
        }

        setIsSendingInvites(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/send-invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ emails: inviteEmails })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setInviteEmails([]); // Clear the list after sending
                setCurrentEmail(""); // Clear current input

            } else {
                toast.error(data.error || "Failed to send invites");
            }
        } catch {
            toast.error("Failed to send invites");
        } finally {
            setIsSendingInvites(false);
        }
    }


    const handleDeleteTeam = async () => {
        setIsDeletingTeam(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/delete`, {
                method: 'POST',
                credentials: 'include',
            })

            if (res.ok) {
                const data = await res.json()
                toast.success(data.message || "Team deleted successfully")

                // Reset state
                setTeamData(null)
                setTeamMode(null)
                setShowDeleteTeamDialog(false)

                // Refresh subscription data to update UI
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ inviteCode })
            })
            if (res.ok) {
                const data = await res.json()
                toast.success("Successfully joined team!")
                setTeamData(data)
                setTeamMode('member')
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ memberId })
            })
            if (res.ok) {
                toast.success("Member removed")
                setTeamData(prev => ({
                    ...prev,
                    members: prev.members.filter(m => m.id !== memberId)
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

    return (


        <div className="space-y-6">
            <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        {teamData
                            ? teamData.teamName || teamData.name || "Your Team"
                            : "Your Team"}
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-xs">
                        {teamMode === 'owner' && teamData
                            ? `Total members: ${teamData.members?.length || 0}`
                            : teamMode === 'member' && teamData
                                ? `Team Created By: ${teamData.ownerName || 'Team Created By'}`
                                : "Join or start a team"}
                    </CardDescription>

                </CardHeader>
                <CardContent>
                    {!teamMode && (
                        <div className="flex flex-row gap-1">
                            <Button disabled={!hasActiveAccess()} onClick={() => setTeamMode('creating')} className="w-full rounded-xl h-12 bg-blue-600">
                                <CreditCard className="w-4 h-4" />
                                {hasActiveAccess() ? "Subscribe to Start a Team" : "Start a Team"}
                            </Button>
                            <Button onClick={() => setTeamMode('joining')} variant="outline" className="w-full rounded-xl h-12">
                                <Users className="w-4 h-4" />
                                Join a Team
                            </Button>
                        </div>
                    )}

                    {
                        teamMode === 'joining' && (
                            <div className="space-y-3">
                                <Input placeholder="Enter team invite code" className="rounded-xl"
                                    value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                                <div className="flex flex-row gap-1">
                                    <Button disabled={!inviteCode || isLoading} onClick={handleJoinTeam} className=" text-sm rounded-xl bg-blue-600 w-32">
                                        {isLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                                        Join Team
                                    </Button>
                                    <Button variant="outline" className="rounded-xl bg-white w-32 text-gray-900 text-xs" onClick={() => { setTeamMode(null); setInviteCode("") }}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )
                    }

                    {teamMode === 'creating' && (
                        <div className="space-y-3">
                            <Input placeholder="Enter team name" value={teamName}
                                onChange={(e) => setTeamName(e.target.value)} className="rounded-xl" />
                            <div className="flex flex-row gap-1">
                                <Button disabled={!teamName || isLoading} onClick={handleCreateTeam} className="rounded-xl bg-blue-600 w-32 text-sm">
                                    {isLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Team
                                </Button>
                                <Button variant="outline" className="rounded-xl bg-white w-32 text-gray-900 text-xs " onClick={() => { setTeamMode(null); setTeamName("") }}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {
                        teamMode === 'owner' && teamData && (
                            <div className="space-y-3">
                                <div
                                    className="flex items-center justify-start gap-3 px-3 py-1 rounded-xl border border-[#F3A9FF] bg-[#FFE0EF]"
                                >
                                    <span className="text-sm font-medium text-[#B2038C]">
                                        Here is your Team ID
                                    </span>

                                    <div
                                        className="flex items-center gap-2 px-3 py-1 pr-2 rounded-lg cursor-pointer bg-[#FFB2F6]"
                                        onClick={() => {
                                            navigator.clipboard.writeText(teamData.inviteCode)
                                            toast.success("Copied to clipboard!")
                                        }}
                                    >
                                        <span className="text-sm font-semibold text-[#67008F]">
                                            {teamData.inviteCode}
                                        </span>
                                        <YourCopyIcon className="w-4 h-4 text-[#67008F]" />
                                        <span className="text-sm font-semibold text-[#67008F]">

                                        </span>
                                    </div>

                                    <span className="text-sm font-medium text-[#B2038C]">
                                        Share it only with your team!
                                    </span>
                                </div>


                                {/* NEW: Email invite section */}
                                <div className="space-y-3 p-4 rounded-xl bg-white border">
                                    <h4 className="text-sm font-medium text-gray-900">Send Email Invites</h4>

                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Enter email address"
                                            value={currentEmail}
                                            onChange={(e) => setCurrentEmail(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                                            className="rounded-xl bg-white"
                                        />
                                        <Button
                                            onClick={handleAddEmail}
                                            variant="outline"
                                            className="rounded-xl px-4 hover:bg-white"
                                        >
                                            Add
                                        </Button>
                                    </div>

                                    {/* Email list */}
                                    {inviteEmails.length > 0 && (
                                        <div className="space-y-2">
                                            {inviteEmails.map((email, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-white border">
                                                    <span className="text-sm">{email}</span>
                                                    <Button
                                                        onClick={() => handleRemoveEmail(email)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                    >
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSendInvites}
                                        disabled={inviteEmails.length === 0 || isSendingInvites}
                                        className="w-full rounded-xl bg-blue-600"
                                    >
                                        {isSendingInvites ? (
                                            <>
                                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                Sending Invites...
                                            </>
                                        ) : (
                                            `Send Invites (${inviteEmails.length})`
                                        )}
                                    </Button>

                                    <p className="text-xs text-gray-500 text-center">
                                        Invited members will receive an email with your team code and instructions to join.
                                    </p>
                                </div>


                                {/* Member list */}
                                {teamData.members?.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {teamData.members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={member.picture || '/default-avatar.png'}
                                                        alt={member.name}
                                                        className="w-7 h-8 rounded-full"
                                                    />
                                                    <span className="text-sm font-medium">{member.name}</span>
                                                </div>
                                                <Button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    disabled={deletingMemberId === member.id}
                                                >
                                                    {deletingMemberId === member.id ? (
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Team cost row */}
                                {/* <div className="flex items-center justify-between pt-3">
                                    <span className="text-sm text-gray-600">Team cost</span>
                                    <span className="text-sm font-bold text-black">
                                        {(teamData.members?.length || 0) > 0 && (
                                            <span className="text-sm text-gray-700">
                                                (500 + {(teamData.members?.length || 0)} × 20 =)&nbsp;
                                            </span>
                                        )}
                                        ${500 + ((teamData.members?.length || 0) * 20)}/month
                                    </span>
                                </div> */}

                                {/* Delete Team Button */}
                                <div className="pt-3">
                                    <Button
                                        onClick={() => setShowDeleteTeamDialog(true)}
                                        variant="destructive"
                                        className="w-full rounded-xl h-10"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Team
                                    </Button>
                                </div>

                                {/* Delete Team Confirmation Dialog */}
                                <Dialog open={showDeleteTeamDialog} onOpenChange={setShowDeleteTeamDialog}>
                                    <DialogOverlay className="bg-black/50 !-mt-[20px]" />
                                    <DialogContent className="sm:max-w-[425px] !rounded-[30px]">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                                Delete Team
                                            </DialogTitle>
                                            <DialogDescription className="space-y-3 pt-3">
                                                <p>Are you sure you want to delete this team?</p>
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                                                    <p className="text-sm font-medium text-red-800">This action will:</p>
                                                    <ul className="text-sm text-red-700 ml-4 list-disc">
                                                        <li>Remove all {teamData?.members?.length || 0} team members</li>
                                                        <li>Cancel their access immediately</li>
                                                        <li>Remove ${(teamData?.members?.length || 0) * 20}/month in seat charges</li>
                                                    </ul>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    Your personal subscription will remain active at $500/month.
                                                </p>
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowDeleteTeamDialog(false)}
                                                disabled={isDeletingTeam}
                                                className="flex-1 rounded-xl"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleDeleteTeam}
                                                disabled={isDeletingTeam}
                                                className="flex-1 rounded-xl"
                                            >
                                                {isDeletingTeam ? (
                                                    <>
                                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    'Delete Team'
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>


                            </div >
                        )
                    }


                </CardContent >
            </Card >
        </div >
    )
}
