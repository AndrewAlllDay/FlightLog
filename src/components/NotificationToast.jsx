// src/components/NotificationToast.jsx
import React, { useEffect, useState } from 'react'; // Corrected import syntax here
import { X } from 'lucide-react';

const NotificationToast = ({ note, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    console.log("DEBUG NotificationToast: Prop 'note' received:", note);
    console.log("DEBUG NotificationToast: Current isVisible state (before useEffect):", isVisible);

    useEffect(() => {
        if (note) {
            console.log("DEBUG NotificationToast: Setting isVisible to true due to new 'note' prop.");
            setIsVisible(true);
        } else {
            console.log("DEBUG NotificationToast: Setting isVisible to false as 'note' prop is null/undefined.");
            setIsVisible(false);
        }
    }, [note]);

    const handleClose = () => {
        console.log("DEBUG NotificationToast: Close button clicked. Setting isVisible to false.");
        setIsVisible(false);
        if (onClose) {
            console.log("DEBUG NotificationToast: Calling parent's onClose handler.");
            onClose();
        }
    };

    console.log("DEBUG NotificationToast: Render condition check - isVisible:", isVisible, "note:", note, "Result:", !isVisible || !note ? "NOT RENDERING" : "RENDERING");

    if (!isVisible || !note) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1001] bg-blue-600 text-white py-8 px-4 rounded-lg shadow-xl flex items-start space-x-3 w-[90%] max-w-lg transition-transform duration-300 ease-out transform opacity-100">
            <div className="flex-grow">
                <p className="font-semibold text-lg mb-1">New Encouragement!</p>
                <p className="text-md">From: {note.senderDisplayName || 'Someone'}</p>
                <p className="text-lg mt-1">{note.noteText}</p>
            </div>
            <button
                onClick={handleClose}
                className="text-black hover:text-gray-200 focus:outline-none p-1 -mt-5 -mr-1 rounded-full hover:bg-blue-700 transition-colors"
                aria-label="Dismiss notification"
            >
                <X size={20} />
            </button>
        </div>
    );
};

export default NotificationToast;
