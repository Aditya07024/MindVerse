import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiUpload, FiFolder } from "react-icons/fi";

import SmartPDFViewer from "../../components/SmartPDFViewer";
import FilesModal from "./FilesModal";
import Window from "../../components/DraggableComponents/Window";
import Loading from "../../components/Loading/Loading";

import { generateSummary } from "../../utils/summaryApi";
import {
  uploadToCloudinary,
  saveFileUrlToDatabase,
  getUserFiles,
} from "../../utils/cloudinaryUpload";

export default function Summarizer() {
  const userId = JSON.parse(localStorage.getItem("user"))?._id;

  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [windows, setWindows] = useState([]);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [summaryData, setSummaryData] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  /* ================== FETCH FILES ================== */
  useEffect(() => {
    if (!userId) return;

    getUserFiles(userId)
      .then((res) => setFiles(res.data || []))
      .finally(() => setLoading(false));
  }, [userId]);

  /* ================== KEYBOARD SHORTCUT ================== */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        setShowFilesModal(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ================== WINDOW MANAGEMENT ================== */

  const openFileWindow = (file) => {
    if (windows.some((w) => w.id === file._id)) return;

    setWindows((prev) => [
      ...prev,
      {
        id: file._id,
        title: file.filename,
        file,
        layout: "normal",
        position: { x: 100 + prev.length * 40, y: 80 },
        size: { width: 600, height: 500 },
      },
    ]);
  };

  const closeWindow = (id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWindow = (id, updates) => {
    if (id === "SPLIT_HORIZONTAL") return applySplit();
    if (id === "GRID_ALL") return applyGrid();

    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  const applySplit = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    setWindows((prev) =>
      prev.map((win, i) => ({
        ...win,
        layout: "split",
        position: { x: i % 2 === 0 ? 0 : w / 2, y: 0 },
        size: { width: w / 2, height: h },
      }))
    );
  };

  const applyGrid = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    setWindows((prev) =>
      prev.map((win, i) => ({
        ...win,
        layout: "grid",
        position: {
          x: (i % 2) * (w / 2),
          y: Math.floor(i / 2) * (h / 2),
        },
        size: { width: w / 2, height: h / 2 },
      }))
    );
  };
const handleAction = async (type, file) => {
  const id = `${type}-${file._id}`;

  if (windows.some(w => w.id === id)) return;

  // 👉 QUIZ OPENS IN NEW TAB
  if (type === "quiz") {
    window.open(`/quiz?fileId=${file._id}`, "_blank");
    return;
  }

  // 👉 SUMMARY / NOTES
  setWindows(prev => [
    ...prev,
    {
      id,
      title: `${type.toUpperCase()} - ${file.filename}`,
      file,
      type,
      position: { x: 120, y: 120 },
      size: { width: 520, height: 420 },
      layout: "normal",
    },
  ]);

  if (type === "summary") {
    setSummaryLoading(true);
    try {
      const res = await generateSummary(file._id);
      setSummaryData(prev => ({
        ...prev,
        [file._id]: res.summary,
      }));
    } catch (err) {
      toast.error("Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  }
};
  /* ================== UPLOAD ================== */

  const handleUpload = async () => {
    if (!file) return toast.error("Select a file");

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await saveFileUrlToDatabase(
        userId,
        file.name,
        url,
        file.type,
        file.size
      );

      toast.success("Uploaded");
      setFile(null);

      const res = await getUserFiles(userId);
      setFiles(res.data || []);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-gray-100 p-6">

      {/* HEADER */}
      <div className="flex gap-4 mb-4 ml-10">
        <h1 className="text-3xl font-bold">Smart Summarizer</h1>

        <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
          <FiUpload />
          Upload
          <input type="file" hidden onChange={(e) => setFile(e.target.files[0])} />
        </label>

        <button
          onClick={() => setShowFilesModal(true)}
          className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded"
        >
          <FiFolder /> All Files
        </button>
      </div>

      {file && (
        <div className="bg-white p-3 mb-3 flex justify-between rounded">
          <span>{file.name}</span>
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-4 py-1 rounded"
          >
            {uploading ? "Uploading..." : "Confirm"}
          </button>
        </div>
      )}

      {/* WINDOWS */}
      {windows.map((win) => (
        <Window
  key={win.id}
  data={win}
  onClose={closeWindow}
  onUpdate={updateWindow}
  onAction={handleAction}
>
          {win.type === "summary" && (
  <div className="p-4 text-gray-800 dark:text-white h-full overflow-auto">
    <h2 className="text-lg font-bold mb-3">📄 Summary</h2>

    {summaryLoading ? (
      <p className="animate-pulse text-gray-500">Generating summary...</p>
    ) : (
      <p className="whitespace-pre-wrap leading-relaxed">
        {summaryData[win.file._id] || "No summary generated yet."}
      </p>
    )}
  </div>
)}

{win.type === "notes" && (
  <div className="p-4 text-gray-800 dark:text-white">
    <h2 className="text-lg font-bold mb-2">Notes</h2>
    <textarea
      className="w-full h-[250px] p-2 border rounded"
      placeholder="Write your notes here..."
    />
  </div>
)}

{!win.type && (
  win.file.fileType.startsWith("image/") ? (
    <img
      src={win.file.fileUrl}
      className="w-full h-full object-contain"
    />
  ) : (
    <SmartPDFViewer
      fileUrl={win.file.fileUrl}
      fileId={win.file._id}
    />
  )
)}
        </Window>
      ))}

      {showFilesModal && (
        <FilesModal
          files={files}
          onClose={() => setShowFilesModal(false)}
          onSelect={openFileWindow}
        />
      )}
    </div>
  );
}