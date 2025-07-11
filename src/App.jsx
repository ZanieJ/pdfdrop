import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?worker";

// Fix for pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Regex to extract pallet IDs with or without (00)
const extractPalletIds = (text) => {
  const regex = /\(00\)?(\d{18})|\b\d{18}\b/g;
  return [...text.matchAll(regex)].map((m) => m[1] || m[0]);
};

const App = () => {
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    console.log("📂 Files dropped:", acceptedFiles);
    setProcessing(true);
    let allResults = [];

    for (const file of acceptedFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          console.log("📄 Page:", pageNum);
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;

          // OCR
          const worker = await createWorker({
            logger: (m) => console.log("🔍 OCR:", m),
          });
          await worker.loadLanguage("eng");
          await worker.initialize("eng");

          const {
            data: { text: ocrText },
          } = await worker.recognize(canvas);
          await worker.terminate();

          const ocrIds = extractPalletIds(ocrText);
          console.log("📦 OCR IDs:", ocrIds);

          // PDF embedded text (for tables)
          const textContent = await page.getTextContent();
          const pdfText = textContent.items.map((item) => item.str).join(" ");
          const tableIds = extractPalletIds(pdfText);
          console.log("📊 Table IDs:", tableIds);

          const combined = [...new Set([...ocrIds, ...tableIds])];

          combined.forEach((id) => {
            allResults.push({
              pallet_id: id,
              document_name: file.name,
              page_number: pageNum,
            });
          });
        }
      } catch (err) {
        console.error("❌ Error:", err);
        alert("Error reading PDF: " + err.message);
      }
    }

    setResults(allResults);
    setProcessing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [] },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pallet ID Extractor</h1>

      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-xl p-8 text-center ${
          isDragActive ? "border-blue-500 bg-blue-100" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-gray-700">
          {isDragActive
            ? "Drop your PDF here..."
            : "Drag and drop a PDF document here"}
        </p>
      </div>

      {processing && <p className="mt-4 text-yellow-600">Processing...</p>}

      {results.length > 0 && (
        <div className="mt-6">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Pallet ID</th>
                <th className="border px-2 py-1">Document</th>
                <th className="border px-2 py-1">Page</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{r.pallet_id}</td>
                  <td className="border px-2 py-1">{r.document_name}</td>
                  <td className="border px-2 py-1">{r.page_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default App;
