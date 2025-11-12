import { useState } from "react"
import { Button } from "@/components/ui/button"
import HomePopup from '@/assets/HomePopup.webp';
import Home from '@/assets/Home.webp';
import Rocket from '@/assets/rocket.webp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader } from "lucide-react"


export default function OnboardingPopup({ userName, onClose, onGoToSettings, hasSeenSettingsOnboarding, adAccounts, onImport, hasAnySettings }) {

    const [step, setStep] = useState(hasSeenSettingsOnboarding ? "home" : "initial")
    const [selectedAdAccount, setSelectedAdAccount] = useState("")
    const [isImporting, setIsImporting] = useState(false)
    const handleImport = async () => {
        if (!selectedAdAccount) return;

        setIsImporting(true);
        try {
            await onImport(selectedAdAccount);
            onClose();
        } catch (error) {
            console.error("Import failed:", error);
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#FAF9F7] rounded-[24px] shadow-2xl px-8 py-10 w-[520px] relative overflow-hidden text-center">
                <div className="relative w-full transition-all duration-300">
                    {/* INITIAL STEP */}
                    {step === "initial" && (
                        <div key="initial" className="w-full animate-fadeSwap">
                            <div className="text-4xl mb-4">👋</div>
                            <h2 className="text-2xl font-semibold text-[#415363] mb-1">
                                Welcome to Blip, {userName}!
                            </h2>
                            <p className="text-gray-500 mb-10 text-sm">Jump straight into launching ads or set up your ad templates</p>
                            {/* <p className="text-gray-400 text-sm mb-10">It will take a minute and save you hours. We promise.</p> */}
                            <div className="flex justify-center gap-6">


                                <button
                                    onClick={() => setStep("home")}
                                    className="group flex flex-col items-center space-y-3 focus:outline-none"
                                >
                                    <img
                                        src={Home}
                                        alt="Home Icon"
                                        className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105 mb-3"
                                    />
                                    <div className="bg-gradient-to-b from-[#FFC979] to-[#FFA500] text-white text-sm font-medium rounded-full px-4 py-2.5 w-[180px] flex items-center justify-center">
                                        Go to Home
                                    </div>
                                </button>

                                <button
                                    onClick={() => {

                                        onGoToSettings()
                                    }}
                                    className="group flex flex-col items-center space-y-3 focus:outline-none"
                                >
                                    <img
                                        src={Rocket}
                                        alt="Settings Icon"
                                        className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105 mb-3"
                                    />
                                    <div className="bg-gradient-to-b from-[#FF609F] to-[#F72585] text-white text-sm font-medium rounded-full px-4 py-2.5 w-[200px] flex items-center justify-center">
                                        Configure Preferences
                                    </div>
                                    {/* <div className="text-[#FF609F] text-xs font-medium flex items-center justify-center">
                                        (Recommended)
                                    </div> */}
                                </button>


                            </div>
                        </div>
                    )}

                    {/* HOME STEP */}
                    {/* {step === "home" && (
                        <div key="home" className="w-full animate-fadeSwap text-left flex flex-col md:flex-row gap-6 items-stretch">
                            
                            <div className="flex-1 flex flex-col justify-between">
                                
                                <div>
                                    <img
                                        src="https://api.withblip.com/home.webp"
                                        alt="Home Icon"
                                        className="w-14 mb-4"
                                    />
                                    <h2 className="text-[24px] font-semibold text-[#415363] mb-6">Home Page</h2>

                                    <div className="mb-6">
                                        <div className="text-[#ED9C07] text-sm font-semibold rounded-full inline-block py-1">
                                            Step 1
                                        </div>
                                        <p className="text-gray-700 text-sm">
                                            Pick an ad account, campaign, then choose to launch ads in a new or existing adset.
                                        </p>
                                    </div>

                                    <div className="mb-8">
                                        <div className="text-[#ED9C07] text-sm font-semibold rounded-full inline-block py-1">
                                            Step 2
                                        </div>
                                        <p className="text-gray-700 text-sm">
                                            Enter your ad info and queue as many ads as you want without waiting for a job to finish!
                                        </p>
                                    </div>
                                </div>


                                <Button
                                    onClick={onClose}
                                    className="bg-[#F72585] hover:bg-[#e11d74] text-white text-base px-6 py-2 rounded-full mt-4 w-[180px]"
                                >
                                    Start Launching Ads
                                </Button>
                            </div>


                            
                            <div className="flex-1 bg-[#FDCEDF] rounded-2xl overflow-hidden flex items-center justify-center">
                                <img
                                    src={HomePopup}
                                    alt="Preview UI"
                                    className="w-full h-full object-cover "
                                />
                            </div>

                        </div>
                    )} */}

                    {/* HOME STEP */}
                    {step === "home" && (
                        <>
                            {!hasAnySettings ? (
                                // NEW IMPORT LAYOUT
                                <div key="home" className="w-full animate-fadeSwap text-center">
                                    <img
                                        src="https://api.withblip.com/home.webp"
                                        alt="Home Icon"
                                        className="w-20 mx-auto mb-4"
                                    />
                                    <h2 className="text-xl font-semibold text-[#415363] mb-6">
                                        Do you want to import values used in your most recent ad to quick test an ad launch?
                                    </h2>

                                    <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                                        <SelectTrigger className="w-full px-4 py-3 mb-6 rounded-2xl border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#F72585]">
                                            <SelectValue placeholder="Select Ad Account" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white rounded-2xl">
                                            {(adAccounts || []).map(account => (
                                                <SelectItem
                                                    key={account.id}
                                                    value={account.id}
                                                    className="rounded-xl data-[state=checked]:bg-[#FFF5F9] hover:bg-[#FFF5F9]"
                                                >
                                                    {account.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="flex justify-center gap-4">
                                        <Button
                                            onClick={handleImport}
                                            disabled={!selectedAdAccount || isImporting}
                                            className="bg-gradient-to-b from-[#FF609F] to-[#F72585] hover:opacity-90 text-white text-base px-8 py-2.5 rounded-full disabled:opacity-50"
                                        >
                                            Import
                                        </Button>
                                        <Button
                                            onClick={onClose}
                                            disabled={isImporting}
                                            className="bg-[#FAF9F7] border-2 border-[#F72585] text-[#F72585] hover:bg-[#FAF9F7] hover:opacity-80 text-base px-8 py-2.5 rounded-full shadow-none"
                                        >
                                            Skip
                                        </Button>
                                    </div>

                                    {isImporting && (
                                        <div className="flex flex-row items-center justify-center gap-2 mt-4">
                                            <Loader className="w-6 h-6 animate-spin text-[#F72585]" />
                                            <p className="text-sm text-gray-600">Importing data...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // ORIGINAL HOME PAGE LAYOUT
                                <div key="home" className="w-full animate-fadeSwap text-left flex flex-col md:flex-row gap-6 items-stretch">
                                    {/* Left content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <img
                                                src="https://api.withblip.com/home.webp"
                                                alt="Home Icon"
                                                className="w-14 mb-4"
                                            />
                                            <h2 className="text-[24px] font-semibold text-[#415363] mb-6">Home Page</h2>

                                            <div className="mb-6">
                                                <div className="text-[#ED9C07] text-sm font-semibold rounded-full inline-block py-1">
                                                    Step 1
                                                </div>
                                                <p className="text-gray-700 text-sm">
                                                    Pick an ad account, campaign, then choose to launch ads in a new or existing adset.
                                                </p>
                                            </div>

                                            <div className="mb-8">
                                                <div className="text-[#ED9C07] text-sm font-semibold rounded-full inline-block py-1">
                                                    Step 2
                                                </div>
                                                <p className="text-gray-700 text-sm">
                                                    Enter your ad info and queue as many ads as you want without waiting for a job to finish!
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={onClose}
                                            className="bg-[#F72585] hover:bg-[#e11d74] text-white text-base px-6 py-2 rounded-full mt-4 w-[180px]"
                                        >
                                            Start Launching Ads
                                        </Button>
                                    </div>

                                    {/* Right image */}
                                    <div className="flex-1 bg-[#FDCEDF] rounded-2xl overflow-hidden flex items-center justify-center">
                                        <img
                                            src={HomePopup}
                                            alt="Preview UI"
                                            className="w-full h-full object-cover "
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <style>
                    {`
           @keyframes fadeSwap {
                  from { opacity: 0; }
                    to { opacity: 1; }
            }

            .animate-fadeSwap {
              animation: fadeSwap 0.3s ease-out forwards;
            }
          `}
                </style>
            </div>
        </div>
    )
}
