import React from 'react';
import { X, MessageCircle } from 'lucide-react';
import Rocket2 from '@/assets/rocket2.webp';

const TrialExpiredPopup = ({ onClose, onUpgrade, onChatWithUs }) => {
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-3xl p-8 w-[500px] mx-4 relative shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 size-6 border border-2 border-red-500 rounded-full flex items-center justify-center text-red-500  transition-colors"
                >
                    <X size={15} />
                </button>

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
                        className="w-[300px] bg-[#F72585] text-white font-bold py-4 px-8 rounded-full text-xl"
                    >
                        Upgrade To Pro
                    </button>
                </div>
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