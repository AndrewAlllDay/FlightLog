import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export default function SelectCourseTypeModal({ isOpen, onClose, onSubmit }) {
    const [classification, setClassification] = useState('park_style');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(classification);
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                    <Dialog.Title className="text-xl font-bold text-gray-800 mb-4">Select Course Style</Dialog.Title>
                    <p className="text-gray-700 mb-6">Please select a style for the new course.</p>
                    <form onSubmit={handleSubmit}>
                        <select
                            value={classification}
                            onChange={(e) => setClassification(e.target.value)}
                            className="w-full border rounded px-3 py-2 mb-6 bg-white"
                            required
                        >
                            <option value="park_style">Park Style</option>
                            <option value="wooded">Wooded</option>
                            <option value="open_bomber">Open Bomber</option>
                        </select>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="!bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                            >
                                Create Course
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}