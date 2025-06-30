import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import { createClient } from "@supabase/supabase-js";

import pdfWorker from "pdfjs-dist/build/pdf.worker?worker";
pdfjsLib.GlobalWorkerOptions.workerPort = new pdfWorker();

const supabase = createClient(
  "https://cassouhzovotgdhzssqg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhc3NvdWh6b3ZvdGdkaHpzc3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMTg5MjYsImV4cCI6MjA2NDY5NDkyNn0.dNg51Yn9aplsyAP9kvsEQOTHWb64edsAk5OqiynEZlk"
);

const App = () => {
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    setProcessing(true);

    const worker = await createWorker(
      {
        langPath: "https://tessdata.projectnaptha.com/4.0.0_best",
      },
      (m) => console.log("📦 Tesseract message:", m)
    );

    await worker.loadLanguage("ocrb");
    await worker.initialize("ocrb");

    for (const file of acceptedFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 3.0 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;

          const imageDataUrl = canvas.toDataURL();

          let rawResult;
          try {
            rawResult = await worker.recognize(imageDataUrl);
            console.log(`✅ OCR result for ${file.name} page ${pageNum}:`, rawResult);
          } catch (err) {
            console.error("❌ Tesseract recognize() failed:", err);
            continue;
          }

          const text = rawResult?.data?.text;
          if (typeof text !== "string") {
            console.warn("⚠️ No valid text output on page", pageNum);
            continue;
          }

          // Show OCR result visibly
          const box = document.createElement("div");
          box.innerText = `--- PAGE ${pageNum} OCR OUTPUT ---\n\n${text}`;
          box.style.whiteSpace = "pre-wrap";
          box.style.border = "1px solid #999";
          box.style.margin = "1rem 0";
          box.style.padding = "1rem";
          box.style.fontSize = "12px";
          document.body.appendChild(box);
        }
      } catch (err) {
        console.error("❌ Failed to read/process PDF:", err);
      }
    }

    await worker.terminate();
    setProcessing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [] },
  });

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">OCR Debugger</h1>
      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-xl p-10 text-center transition ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-gray-600">
          {isDragActive
            ? "Drop the PDF here..."
            : "Drag & drop a PDF here to debug OCR output"}
        </p>
      </div>

      {processing && <p className="mt-4 text-yellow-600">Processing PDF…</p>}
    </div>
  );
};

export default App;
