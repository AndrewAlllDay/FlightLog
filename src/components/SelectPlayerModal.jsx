import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export default function SelectPlayerModal({ isOpen, onClose, onSelect, players }) {
    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                    <Dialog.Title className="text-xl font-bold text-gray-800 mb-4">Select Your Scorecard</Dialog.Title>

                    <p className="text-gray-700 mb-6">We couldn't automatically match your display name. Please select your name from the list below to import your scores.</p>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {players.map(player => (
                            <button
                                key={player}
                                onClick={() => onSelect(player)}
                                className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-md transition-colors"
                            >
                                {player}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            onClick={onClose}
                            className="bg-gray-200 px-4 py-2 rounded-md text-gray-800 hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}