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

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-2xl mb-4"></div>
                </div>
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
                        {teamMode === 'owner' && teamData
                            ? teamData.teamName || "My Team"
                            : "Your Team"}
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-xs">
                        {teamMode === 'owner' && teamData
                            ? `Total members: ${teamData.members?.length || 0}`
                            : teamMode === 'member' && teamData
                                ? `${teamData.teamName || teamData.name}`
                                : "Join or start a team"}
                    </CardDescription>

                </CardHeader>
                <CardContent>
                    {!teamMode && (
                        <div className="flex flex-row gap-1">
                            <Button disabled={isOnTrial()} onClick={() => setTeamMode('creating')} className="w-full rounded-xl h-12 bg-blue-600">
                                <CreditCard className="w-4 h-4" />
                                {isOnTrial() ? "Upgrade to Pro to Start a Team" : "Start a Team"}
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
                                <div className="flex items-center justify-between pt-3">
                                    <span className="text-sm text-gray-600">Team cost</span>
                                    <span className="text-sm font-bold text-black">
                                        {(teamData.members?.length || 0) > 0 && (
                                            <span className="text-sm text-gray-700">
                                                (500 + {(teamData.members?.length || 0)} × 20 =)&nbsp;
                                            </span>
                                        )}
                                        ${500 + ((teamData.members?.length || 0) * 20)}/month
                                    </span>
                                </div>

                                {/* Delete Team Button */}
                                <div className="pt-3 border-t">
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
                                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
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
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleDeleteTeam}
                                                disabled={isDeletingTeam}
                                                className="flex-1"
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
