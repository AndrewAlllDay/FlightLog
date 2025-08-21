// src/components/AddHoleModal.jsx

import React from 'react';
import AddHoleForm from './AddHoleForm';

export default function AddHoleModal({ isOpen, onClose, onAddHole, discs }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-semibold mb-4 dark:text-white">Add New Hole</h3>
                <AddHoleForm
                    onAddHole={(number, par, distance, note, discId) => { // <--- Add 'distance' here
                        onAddHole(number, par, distance, note, discId);   // <--- And pass it here
                        onClose(); // Close modal after adding
                    }}
                    onCancel={onClose}
                    discs={discs}
                />
            </div>
        </div>
    );
}