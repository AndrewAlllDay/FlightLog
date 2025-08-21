// src/components/Header.jsx

import React from "react";
// ✨ 1. Replaced the `Send` icon with `ClipboardList`
import { ThumbsUp, Settings, Flag, Backpack, Newspaper, ClipboardList } from "lucide-react";
import LogoImage from '../assets/DG Logo.svg';

const Header = ({ onNavigate, onOpenEncouragement, user, canSendEncouragement, currentPage }) => {

    const isNonPlayer = user && user.role === 'non-player';

    const handleNavigate = (page, event) => {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        onNavigate(page);
    };

    const isActive = (pageName) => currentPage === pageName;

    const activeIconColor = 'spec-sec';
    const activeTextColor = 'font-bold spec-sec';
    const inactiveIconColor = 'text-gray-700';
    const inactiveTextColor = 'text-gray-700';

    return (
        <>
            {/* Part 1: The top header */}
            <header className="w-full bg-white shadow-md sticky top-0 z-40">
                <div className="relative flex items-center justify-between px-4 h-20">
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={(e) => handleNavigate(isNonPlayer ? 'send-note' : 'home', e)}
                    >
                        <img
                            src={LogoImage}
                            alt="FlightLog Logo"
                            className="h-24 md:h-20 lg:h-16 w-auto"
                        />
                    </div>
                    {user && (
                        <div
                            className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center p-2 rounded-full cursor-pointer hover:bg-gray-100
                                ${isActive('settings') ? 'bg-gray-200' : ''}`}
                            onClick={(e) => handleNavigate('settings', e)}
                        >
                            <Settings size={24} className={isActive('settings') ? activeIconColor : inactiveIconColor} />
                        </div>
                    )}
                </div>
            </header>

            {/* Part 2: The fixed bottom navigation bar */}
            <div className="fixed bottom-0 left-0 right-0 h-20 z-50" style={{ filter: "drop-shadow(0 -2px 5px rgba(0,0,0,0.1))" }}>
                <nav className="absolute bottom-0 left-0 right-0 bg-white flex w-full justify-between items-center h-16 px-2">

                    {/* --- Left Side Links Group (Takes up 40% of the width) --- */}
                    <div className="flex items-center justify-around w-2/5">
                        {!isNonPlayer && (
                            <div
                                className={`flex flex-col items-center w-20 text-center transition-colors cursor-pointer p-2
                                    ${isActive('in-the-bag') ? activeTextColor : inactiveTextColor}`}
                                onClick={(e) => handleNavigate('in-the-bag', e)}
                            >
                                <Backpack size={20} className={isActive('in-the-bag') ? activeIconColor : inactiveIconColor} />
                                <span className="text-xs mt-1 leading-tight">In The Bag</span>
                            </div>
                        )}
                        <div
                            className={`flex flex-col items-center w-20 text-center transition-colors cursor-pointer p-2
                                ${isActive('media') ? activeTextColor : inactiveTextColor}`}
                            onClick={(e) => handleNavigate('media', e)}
                        >
                            <Newspaper size={20} className={isActive('media') ? activeIconColor : inactiveIconColor} />
                            <span className="text-xs mt-1 leading-tight">Media</span>
                        </div>
                    </div>

                    {/* --- Right Side Links Group (Takes up 40% of the width) --- */}
                    <div className="flex items-center justify-around w-2/5">
                        {/* ✨ 2. This block is now the "Scores" link */}
                        {!isNonPlayer && (
                            <div
                                className={`flex flex-col items-center w-20 text-center transition-colors cursor-pointer p-2
                                    ${isActive('scores') ? activeTextColor : inactiveTextColor}`}
                                onClick={(e) => handleNavigate('scores', e)}
                            >
                                <ClipboardList size={20} className={isActive('scores') ? activeIconColor : inactiveIconColor} />
                                <span className="text-xs mt-1 leading-tight">Scores</span>
                            </div>
                        )}
                        {!isNonPlayer && (
                            <div
                                className="flex flex-col items-center w-20 text-center text-gray-700 hover:text-purple-800 transition-colors cursor-pointer p-2"
                                onClick={onOpenEncouragement}
                            >
                                <ThumbsUp size={20} />
                                <span className="text-xs mt-1 leading-tight">Encourage</span>
                            </div>
                        )}
                    </div>
                </nav>

                {/* --- Center "Bumpout" Button (Sits in the middle 20% gap) --- */}
                {!isNonPlayer && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer bg-white"
                        onClick={(e) => handleNavigate('courses', e)}
                    >
                        <Flag size={32} className={isActive('courses') ? activeIconColor : inactiveIconColor} />
                        <span className={`text-xs mt-1 ${isActive('courses') ? activeTextColor : inactiveTextColor}`}>
                            Courses
                        </span>
                    </div>
                )}
            </div>
        </>
    );
};

export default Header;