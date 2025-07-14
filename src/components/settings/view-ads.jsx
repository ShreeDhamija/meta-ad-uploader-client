import { useState, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RefreshCcw } from "lucide-react";




export default function ViewAds() {
    const [adAccounts, setAdAccounts] = useState([]);
    const [selectedAdAccountId, setSelectedAdAccountId] = useState("");
    const [previews, setPreviews] = useState([]);
    const [loadingPreviews, setLoadingPreviews] = useState(false);
    const [loadedPreviews, setLoadedPreviews] = useState({});


    useEffect(() => {
        async function fetchAdAccounts() {
            try {
                const response = await fetch("https://api.withblip.com/auth/fetch-ad-accounts", {
                    method: "GET",
                    credentials: "include"
                });
                const data = await response.json();
                if (data.adAccounts) {
                    setAdAccounts(data.adAccounts.reverse());
                    if (data.adAccounts.length > 0) {
                        setSelectedAdAccountId(data.adAccounts[0].id);
                    }
                } else {
                    console.error("No ad accounts found");
                }
            } catch (error) {
                console.error("Failed to fetch ad accounts:", error);
            }
        }

        fetchAdAccounts();
    }, []);

    useEffect(() => {
        if (!selectedAdAccountId) return;
        fetchPreviewsForAccount(selectedAdAccountId);
    }, [selectedAdAccountId]);

    async function fetchPreviewsForAccount(accountId) {
        setLoadingPreviews(true);
        try {
            const response = await fetch(`https://api.withblip.com/auth/generate-ad-preview?adAccountId=${accountId}`, {
                method: "GET",
                credentials: "include"
            });
            const data = await response.json();
            if (data.previews) {
                setPreviews(data.previews);
            }
        } catch (error) {
            console.error("Failed to fetch previews:", error);
        } finally {
            setLoadingPreviews(false);
        }
    }

    function handleRefresh() {
        if (!selectedAdAccountId) return;
        fetchPreviewsForAccount(selectedAdAccountId);
    }

    return (
        <div>
            <h2 className="text-lg font-semibold mb-4">Recent Ad Previews (Last 1 Hour)</h2>

            <div className="flex items-end mb-6 gap-4">
                <div className="flex-1">
                    <label className="block mb-2 text-sm font-medium text-gray-700">Select Ad Account:</label>
                    <Select value={selectedAdAccountId} onValueChange={(value) => setSelectedAdAccountId(value)}>
                        <SelectTrigger className="w-full rounded-xl">
                            <SelectValue placeholder="Select Ad Account" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl">
                            {adAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id} className="rounded-lg">
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={loadingPreviews}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-sm border border-gray-300 transition text-sm"
                >
                    <RefreshCcw className="w-4 h-4" />
                    {loadingPreviews ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {loadingPreviews ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="w-full bg-gray-200 animate-pulse rounded-xl"
                            style={{ height: "400px" }}
                        ></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {previews.length === 0 ? (
                        <p>No previews found in the last hour for this account.</p>
                    ) : (
                        previews.map((preview) => (
                            <div key={preview.creativeId} className="border rounded-xl overflow-hidden shadow-md w-full" style={{ height: "650px" }}>
                                <iframe
                                    src={extractPreviewUrl(preview.previewHtml)}
                                    title={`Ad Preview ${preview.adId}`}
                                    className="w-full h-full"
                                    style={{ border: "none", backgroundColor: "black" }}
                                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                ></iframe>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// Helper function
function extractPreviewUrl(iframeHtml) {
    const match = iframeHtml.match(/src="([^"]+)"/);
    if (match && match[1]) {
        return match[1].replace(/&amp;/g, "&");
    }
    return "";
}
