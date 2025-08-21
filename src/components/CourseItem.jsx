// src/components/CourseItem.jsx

import React, { useState, useEffect } from 'react';
import { Trash, ChevronRight, Trees, TreePine, Wind } from 'lucide-react'; // Corrected imports

export default function CourseItem({
    course,
    onClick,
    onDelete,
    swipedCourseId,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}) {
    const { id, name, tournamentName, classification } = course;

    const isSwiped = swipedCourseId === id;

    const deleteButtonWidthClass = 'w-28';
    const swipeDistance = '-80px';

    const openDuration = '300ms';
    const closeDuration = '300ms';

    const [currentTransform, setCurrentTransform] = useState(isSwiped ? `translateX(${swipeDistance})` : 'translateX(0)');

    useEffect(() => {
        if (isSwiped) {
            setCurrentTransform(`translateX(${swipeDistance})`);
        } else {
            const timeoutId = setTimeout(() => {
                setCurrentTransform('translateX(0)');
            }, 10);

            return () => clearTimeout(timeoutId);
        }
    }, [isSwiped, swipeDistance]);

    // --- Function to get the appropriate icon ---
    const getClassificationIcon = (courseClassification) => {
        switch (courseClassification) {
            case 'wooded':
                return <Trees size={20} className="text-green-700 dark:text-green-400 mr-2" />; // Changed from Forest to Trees
            case 'park_style':
                return <TreePine size={20} className="text-lime-600 dark:text-lime-300 mr-2" />;
            case 'open_bomber':
                return <Wind size={20} className="text-blue-600 dark:text-blue-300 mr-2" />;
            default:
                return null;
        }
    };

    return (
        <li className="relative h-30 select-none touch-pan-y mb-2 overflow-hidden">

            {/* DELETE BUTTON */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                }}
                className={`absolute right-0 top-0 bottom-0 ${deleteButtonWidthClass} !bg-red-600 text-white flex items-center justify-center z-10 rounded-r-lg`}
                aria-label={`Delete ${name}`}
            >
                <Trash className='ml-5' size={24} />
            </button>

            {/* MAIN COURSE CONTENT DIV */}
            <div
                id={`course-${id}`}
                className={`
                    absolute inset-0
                    bg-white dark:bg-gray-800
                    border border-gray-200 dark:border-gray-700
                    rounded-lg
                    shadow-sm
                    z-20
                    flex items-center justify-between
                    px-4
                    cursor-pointer
                    transition-transform ease-in-out
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    hover:shadow-md
                    active:bg-gray-100 dark:active:bg-gray-600
                    transform
                `}
                style={{
                    transitionDuration: isSwiped ? openDuration : closeDuration,
                    transform: currentTransform,
                }}
                onClick={() => onClick(course)}
                onTouchStart={(e) => onTouchStart(e, id)}
                onTouchMove={(e) => onTouchMove(e, id)}
                onTouchEnd={() => onTouchEnd(id)}
            >
                <div className="flex items-center">
                    {getClassificationIcon(classification)}
                    <div>
                        <p className="text-lg text-gray-800 dark:text-white">
                            <span className='font-bold'>{name}</span>
                        </p>
                        {tournamentName && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                                {tournamentName}
                            </p>
                        )}
                    </div>
                </div>
                <div className="ml-auto text-gray-400 dark:text-gray-500">
                    <ChevronRight size={20} />
                </div>
            </div>
        </li>
    );
}