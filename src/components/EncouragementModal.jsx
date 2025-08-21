import React, { useEffect, useRef } from 'react';

// Encouragement phrases
const phrases = [
    "<span class='font-bold'>Breathe</span> - deep breath before every shot, and practice good breathing throughout the round.",
    "<span class='font-bold'>Commit</span> - Focus on a spot, trust your disc and line choice.",
    "<span class='font-bold'>Reset</span> - No matter the outcome of the shot, come back to emotional zero every time. Treat each shot as its own tournament. Talk about the good shots as much as the bad ones.",
    "<span class='font-bold'>Attitude</span> - People will remember you for how you acted on the course, not the way you played.",
];

export default function EncouragementModal({ isOpen, onClose }) {
    const modalRef = useRef(null);

    // Effect for handling click outside and Escape key
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target) && event.target.classList.contains('modal-overlay')) {
                onClose();
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
            document.addEventListener('keydown', handleEscapeKey);
            // Haptic feedback (moved from original app.js)
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null; // Don't render anything if modal is not open

    // Pick a random phrase when the modal opens
    const randomIndex = Math.floor(Math.random() * phrases.length);
    const currentEncouragement = phrases[randomIndex];

    return (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] backdrop-blur-sm opacity-100 transition-opacity duration-300">
            <div
                ref={modalRef}
                className="relative bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center flex flex-col items-center justify-center min-h-[250px] encourage-modal-content-animate"
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-4 text-gray-400 text-3xl font-bold transition-colors hover:text-gray-700 focus:outline-none"
                    aria-label="Close"
                >
                    &times;
                </button>

                <div
                    id="modalEncouragementText"
                    className="text-2xl font-normal text-blue-700 pt-5 my-5 leading-tight opacity-100 transition-opacity duration-400"
                    dangerouslySetInnerHTML={{ __html: currentEncouragement }}
                ></div>

                <div id="breathingInstructionText" className="text-lg text-gray-600 mt-2 opacity-100">
                    Take a deep breath.
                </div>

                <div
                    id="breathingCircle"
                    // Changed bg-green-500 to bg-blue-500
                    className="w-24 h-24 bg-blue-500 rounded-full mx-auto my-7 shadow-md opacity-70 encourage-breathing-circle"
                ></div>
            </div>
        </div>
    );
}