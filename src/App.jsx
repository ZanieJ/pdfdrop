import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cassouhzovotgdhzssqg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhc3NvdWh6b3ZvdGdkaHpzc3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMTg5MjYsImV4cCI6MjA2NDY5NDkyNn0.dNg51Yn9aplsyAP9kvsEQOTHWb64edsAk5OqiynEZlk"
);

const App = () => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const palletIds = input.split(/\r?\n/).map(id => id.trim()).filter(Boolean);
    if (palletIds.length === 0) return;

    const { data, error } = await supabase
      .from("NDAs")
      .select("pallet_id, document_name, page_number")
      .in("pallet_id", palletIds);

    if (error) {
      alert("Error fetching data: " + error.message);
    } else {
      setResults(data);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔍 Pallet ID Lookup</h1>
      <textarea
        className="w-full h-40 p-2 border rounded mb-4"
        placeholder="Paste one pallet ID per line..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      ></textarea>
      <button
        onClick={handleSearch}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Search
      </button>

      {loading && <p className="mt-4 text-yellow-600">Searching...</p>}

      {results.length > 0 && (
        <table className="table-auto w-full border mt-6 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Pallet ID</th>
              <th className="border px-2 py-1">Document Name</th>
              <th className="border px-2 py-1">Page Number</th>
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
      )}
    </div>
  );
};

export default App;
