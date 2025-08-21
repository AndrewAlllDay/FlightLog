import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Settings, ThumbsUp, Flag, Backpack, Newspaper, ClipboardList } from "lucide-react";
import LogoImage from '../assets/DG Logo.svg';

const GooeyNav = ({ items, currentPage, onNavigate }) => {
    const initialIndex = useMemo(() => {
        const index = items.findIndex(item => item.pageName === currentPage);
        return index > -1 ? index : 2;
    }, [currentPage, items]);

    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const menuRef = useRef(null);
    const itemsRef = useRef([]);
    const [borderStyle, setBorderStyle] = useState({});
    // ✨ State to track if the window is being resized
    const [isResizing, setIsResizing] = useState(false);
    const resizeTimeoutRef = useRef(null);

    const updateBorderPosition = useCallback(() => {
        const activeItem = itemsRef.current[activeIndex];
        const menu = menuRef.current;
        if (activeItem && menu) {
            const itemRect = activeItem.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const borderLeft = itemRect.left - menuRect.left;
            const itemCenter = borderLeft + (itemRect.width / 2);
            const baseFontSize = parseFloat(getComputedStyle(menu).fontSize) || 12;
            const borderWidthInPx = 10.9 * baseFontSize;
            const left = Math.floor(itemCenter - (borderWidthInPx / 2));
            setBorderStyle({ transform: `translate3d(${left}px, 0, 0)` });
        }
    }, [activeIndex]);

    useEffect(() => {
        const newIndex = items.findIndex(item => item.pageName === currentPage);
        if (newIndex > -1 && newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    }, [currentPage, items, activeIndex]);

    // ✨ This effect now handles resize events to make the border movement instant
    useEffect(() => {
        const handleResize = () => {
            setIsResizing(true);
            updateBorderPosition();
            clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = setTimeout(() => {
                setIsResizing(false);
            }, 100); // Stop resizing state 100ms after the last resize event
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateBorderPosition]);

    // Effect to position the border on initial load and when active index changes
    useEffect(() => {
        updateBorderPosition();
    }, [updateBorderPosition]);

    const handleClick = (index, item) => {
        if (item.action) {
            item.action();
        } else {
            setActiveIndex(index);
            onNavigate(item.pageName);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 z-50 flex items-center justify-center bg-white" style={{ filter: "drop-shadow(0 -2px 5px rgba(0,0,0,0.07))" }}>
            <div className="absolute w-0 h-0">
                <svg>
                    <clipPath id="menu" clipPathUnits="objectBoundingBox" transform="scale(0.0049285362247413 0.021978021978022)">
                        <path d="M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7 c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5 c9.2,3.6,17.6,4.2,23.3,4H6.7z" />
                    </clipPath>
                </svg>
            </div>

            <menu ref={menuRef} className="relative grid grid-cols-5 w-full max-w-md items-stretch text-[12px]">
                {items.map((item, index) => {
                    const IconComponent = item.icon;
                    const isActive = index === activeIndex;
                    return (
                        <button
                            key={item.pageName}
                            ref={el => itemsRef.current[index] = el}
                            onClick={() => handleClick(index, item)}
                            data-active={isActive}
                            className="group relative flex h-full flex-col cursor-pointer rad-0 !bg-white justify-center items-center focus:outline-none [-webkit-tap-highlight-color:transparent]"
                            title={item.label}
                        >
                            {/* ✨ This wrapper now handles the animation, leaving the button static */}
                            <div className="flex flex-col items-center justify-center transition-transform duration-700 group-data-[active=true]:translate-y-[-0.6em]">
                                <div className={`w-[2.4em] h-[2.4em] fill-transparent stroke-[1.5pt] flex items-center justify-center transition-colors duration-500 text-gray-700 group-data-[active=true]:text-[#FC9215]`}>
                                    <IconComponent size={item.size} stroke="currentColor" />
                                </div>
                                <span className={`text-xs transition-colors duration-500 group-data-[active=true]:font-bold group-data-[active=true]:text-[#FC9215] text-gray-600`}>
                                    {item.label}
                                </span>
                            </div>
                        </button>
                    );
                })}
                <div
                    // ✨ Transition duration is now conditional to be instant during resize
                    className={`absolute left-0 bottom-[90%] w-[10.9em] h-[2.4em] bg-white transition-transform ${isResizing ? 'duration-0' : 'duration-700'}`}
                    style={{ ...borderStyle, clipPath: 'url(#menu)' }}
                ></div>
            </menu>
        </div>
    );
};


const Header = React.memo(({ onNavigate, onOpenEncouragement, user, currentPage }) => {
    const isNonPlayer = useMemo(() => user?.role === 'non-player', [user]);

    const navItems = useMemo(() => {
        const allItems = [
            { pageName: 'in-the-bag', icon: Backpack, label: 'Bag', size: 20, playerOnly: true },
            { pageName: 'media', icon: Newspaper, label: 'Media', size: 20, playerOnly: false },
            { pageName: 'courses', icon: Flag, label: 'Courses', size: 20, playerOnly: true },
            { pageName: 'scores', icon: ClipboardList, label: 'Scores', size: 20, playerOnly: true },
            { pageName: 'encourage', icon: ThumbsUp, label: 'Encourage', size: 20, playerOnly: true, action: onOpenEncouragement },
        ];
        return allItems.filter(item => !item.playerOnly || !isNonPlayer);
    }, [isNonPlayer, onOpenEncouragement]);

    return (
        <>
            <header className="w-full bg-white shadow-md sticky top-0 z-40">
                <div className="relative flex items-center justify-between px-4 h-20">
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => onNavigate(isNonPlayer ? 'send-note' : 'home')}
                    >
                        <img src={LogoImage} alt="FlightLog Logo" className="h-24 md:h-20 lg:h-16 w-auto" />
                    </div>
                    {user && (
                        <button
                            className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center p-2 rounded-full cursor-pointer !bg-transparent focus:outline-none [-webkit-tap-highlight-color:transparent] ${currentPage === 'settings' ? 'bg-gray-200' : ''}`}
                            onClick={() => onNavigate('settings')}
                            aria-label="Settings"
                        >
                            <Settings size={24} className={currentPage === 'settings' ? 'spec-sec' : 'text-gray-700'} />
                        </button>
                    )}
                </div>
            </header>

            <GooeyNav
                items={navItems}
                currentPage={currentPage}
                onNavigate={onNavigate}
                onOpenEncouragement={onOpenEncouragement}
            />
        </>
    );
});

export default Header;