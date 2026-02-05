import React from 'react';
import { X, MessageCircle } from 'lucide-react';
import Rocket2 from '@/assets/rocket2.webp';
import { useState } from "react"

const TrialExpiredPopup = ({ onClose, onUpgrade, joinTeam, onChatWithUs, canExtendTrial, onExtendTrial }) => {

    const [extending, setExtending] = useState(false);


    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleExtendTrial = async () => {
        setExtending(true);
        await onExtendTrial();
        setExtending(false);
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
            <div className="bg-white rounded-3xl p-8 w-[500px] mx-4 relative shadow-2xl">

                {/* Rocket Image */}
                <div className="flex justify-center mb-6 mt-4">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center">
                        <img src={Rocket2} />
                    </div>
                </div>
                <div className='flex flex-col'>
                    {/* Subtext */}
                    <p className="text-gray-500 text-center text-sm">
                        We hope you've found using Blip helpful!
                    </p>

                    {/* Heading */}
                    <p className="text-3xl font-bold text-gray-800 text-center mb-4 leading-tight">
                        Your Trial Has Expired
                    </p>
                </div>
                {/* Upgrade Button */}
                <div className="flex justify-center mb-4">

                    <button
                        onClick={onUpgrade}
                        className="w-[300px] bg-[#F72585] text-white font-bold py-4 px-8 rounded-3xl text-xl"
                    >
                        Upgrade To Pro
                    </button>
                </div>
                <div className="flex justify-center mb-4">

                    <button
                        onClick={joinTeam}
                        className="w-[300px] bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-4 px-8 rounded-3xl text-xl"
                    >
                        Join a Team
                    </button>
                </div>

                {canExtendTrial && (
                    <>
                        <p className="text-gray-500 text-center mb-2 text-sm">
                            Didn't get a chance to try Blip properly?
                        </p>
                        <div className="flex justify-center mb-4">
                            <button
                                onClick={handleExtendTrial}
                                disabled={extending}
                                className="w-[300px] bg-white border-2 border-zinc-300 hover:border-zinc-400 text-zinc-700 font-bold py-4 px-8 rounded-3xl text-xl transition-colors disabled:opacity-50"
                            >
                                {extending ? 'Extending...' : 'Extend Your Trial'}
                            </button>
                        </div>
                    </>
                )}

                {/* Need Help Label */}
                <p className="text-gray-500 text-center mb-2 text-sm">
                    Need Help?
                </p>

                {/* Chat With Us Button */}
                <div className="flex justify-center">
                    <button
                        onClick={onChatWithUs}
                        className="w-[170px] bg-black hover:bg-gray-800 text-white font-medium py-3 px-2 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <MessageCircle size={16} />
                        Chat With Us
                    </button>

                </div>
                <p className="text-gray-400 text-center text-xs mt-4">
                    If you're part of a team, ask your team lead to subscribe. <br></br>It will grant access to the whole team
                </p>
            </div>
        </div >
    );
};

export default TrialExpiredPopup;