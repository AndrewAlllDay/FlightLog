import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, X } from 'lucide-react';

export default function ImportCSVModal({ isOpen, onClose, onImport }) {
    const [csvResults, setCsvResults] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            setFileName('');
            setCsvResults(null);
            setError('');
            return;
        }

        setError('');
        setFileName(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            bom: true, // Automatically strips BOM
            complete: (results) => {
                // --- DEBUGGING LOGS START ---
                console.log("--- CSV Import Debug ---");
                console.log("Parser Results:", results);
                console.log("Headers Found:", results.meta.fields);
                // --- DEBUGGING LOGS END ---

                const headers = results.meta.fields;
                if (!results.data.length || !headers.includes('PlayerName') || !headers.includes('CourseName') || !headers.some(h => h.startsWith('Hole'))) {
                    setError('Invalid CSV format. Please use a scorecard export with "PlayerName", "CourseName", and "Hole1..." columns.');
                    setCsvResults(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    setFileName('');
                    return;
                }
                setCsvResults(results);
            },
            error: (err) => {
                setError(`CSV parsing error: ${err.message}`);
                setCsvResults(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setFileName('');
            }
        });
    };

    // This function passes the successfully parsed data to the parent.
    const handleSubmit = () => {
        if (csvResults) {
            onImport(csvResults);
        }
    };

    const handleClose = () => {
        setCsvResults(null);
        setFileName('');
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-bold text-gray-800">Import Scorecard</Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800" aria-label="Close">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="text-sm text-gray-600 mb-4 space-y-1">
                        <p>Upload a scorecard CSV file (e.g., from UDisc).</p>
                        <p>It must contain `PlayerName`, `CourseName`, and `Hole1`, `Hole2`, etc. columns.</p>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload size={32} className="text-gray-500 mb-2" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                                {fileName ? (<p className="text-xs text-blue-600">{fileName}</p>) : (<p className="text-xs text-gray-500">CSV file</p>)}
                            </div>
                            <input id="csv-upload" type="file" className="hidden" accept=".csv, text/csv" onChange={handleFileChange} ref={fileInputRef} />
                        </label>
                    </div>

                    {error && <div className="text-red-600 text-sm mt-4 p-2 bg-red-50 rounded-md">{error}</div>}

                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={handleClose} className="bg-gray-200 px-4 py-2 rounded-md text-gray-800 hover:bg-gray-300">
                            Cancel
                        </button>
                        <button type="button" onClick={handleSubmit} className="!bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!csvResults || !!error}>
                            Process Import
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}