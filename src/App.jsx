import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';

export default function App() {
  const [palletIds, setPalletIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const extractPalletIDs = async (file) => {
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        tessedit_char_whitelist: '0123456789',
        logger: m => console.log(m),
      });

      // Match 18-digit numbers
      const matches = text.match(/\b\d{18}\b/g) || [];
      return matches;
    } catch (err) {
      setError('Failed to extract text from image.');
      return [];
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setProcessing(true);
    setPalletIds([]);
    setError(null);

    let allIds = [];

    for (const file of acceptedFiles) {
      const ids = await extractPalletIDs(file);
      allIds.push(...ids);
    }

    const uniqueSorted = [...new Set(allIds)].sort();
    setPalletIds(uniqueSorted);
    setProcessing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div {...getRootProps()} className="border-4 border-dashed border-gray-400 rounded-lg p-10 text-center bg-white shadow-md cursor-pointer">
        <input {...getInputProps()} />
        {
          isDragActive
            ? <p className="text-gray-600">Drop the image here...</p>
            : <p className="text-gray-600">Drag & drop image(s) here to extract Appelt IDs</p>
        }
      </div>

      {processing && <p className="mt-4 text-blue-500">Processing image(s)...</p>}
      {error && <p className="mt-4 text-red-500">{error}</p>}

      {palletIds.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Extracted Pallet IDs:</h2>
          <ul className="list-disc list-inside space-y-1">
            {palletIds.map((id, index) => (
              <li key={index} className="text-gray-800">{id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
