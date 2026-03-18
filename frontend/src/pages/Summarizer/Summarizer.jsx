import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiUpload, FiFolder } from "react-icons/fi";

import SmartPDFViewer from "../../components/SmartPDFViewer";
import FilesModal from "./FilesModal";
import Window from "../../components/DraggableComponents/Window";
import Loading from "../../components/Loading/Loading";

import {
  generateSummary,
  extractTextOnly,
  getSummaryByFileId,
} from "../../utils/summaryApi";
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
        ocrPending: true,
        text: null,
        summary: null,
      },
    ]);
    // Kick off OCR extraction in background if not already present
    (async () => {
      try {
        const res = await getSummaryByFileId(file._id);
        const doc = res?.data;
        if (doc && doc.text) {
          // already has OCR text — keep saved summary in its own window
          // Do NOT attach `summary` to the PDF window so both PDF and
          // summary can be visible simultaneously.
          updateWindow(file._id, { ocrPending: false, text: doc.text });

          // If summary already saved, cache it for quick access; otherwise
          // start background summary generation and save result to DB.
          if (doc.summary) {
            setSummaryData((prev) => ({ ...prev, [file._id]: doc.summary }));
          } else {
            // mark pending and run generation in background (non-blocking)
            updateWindow(file._id, { summaryPending: true });
            (async () => {
              try {
                const gen = await generateSummary(file._id);
                setSummaryData((prev) => ({
                  ...prev,
                  [file._id]: gen.summary,
                }));
              } catch (err) {
                console.error("Background summary failed", err);
              } finally {
                updateWindow(file._id, { summaryPending: false });
              }
            })();
          }
        } else {
          // start extraction in background
          updateWindow(file._id, { ocrPending: true });
          const ex = await extractTextOnly({
            fileId: file._id,
            fileUrl: file.fileUrl,
            userId,
          });
          updateWindow(file._id, { ocrPending: false, text: ex.text });

          // Kick off background summary generation if extracted text is long enough
          if (ex?.text && ex.text.length >= 200) {
            updateWindow(file._id, { summaryPending: true });
            (async () => {
              try {
                const gen = await generateSummary(file.file._id || file._id);
                setSummaryData((prev) => ({
                  ...prev,
                  [file._id]: gen.summary,
                }));
              } catch (err) {
                console.error("Background summary failed", err);
              } finally {
                updateWindow(file._id, { summaryPending: false });
              }
            })();
          }
        }
      } catch (err) {
        console.error("Background OCR failed", err);
        updateWindow(file._id, { ocrPending: false });
      }
    })();
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
  const handleAction = async (type, fileOrData, winId) => {
    // generate summary inside an existing window
    if (type === "generateSummary") {
      // fileOrData may be window data or a file object
      const data = fileOrData || {};
      const file = data.file || data;
      const summaryId = `summary-${file._id}`;

      // open a separate summary window (or reuse if exists)
      if (!windows.some((w) => w.id === summaryId)) {
        setWindows((prev) => [
          ...prev,
          {
            id: summaryId,
            title: `Summary - ${file.filename}`,
            file,
            type: "summary",
            position: data.position
              ? { x: data.position.x + 30, y: data.position.y + 30 }
              : { x: 140, y: 140 },
            size: { width: 520, height: 420 },
            layout: "normal",
            summaryLoading: true,
            summary: null,
            text: null,
          },
        ]);
      } else {
        updateWindow(summaryId, { summaryLoading: true });
      }

      try {
        // check if summary already saved
        const saved = await getSummaryByFileId(file._id);
        const doc = saved?.data;
        if (doc && doc.summary) {
          updateWindow(summaryId, {
            summary: doc.summary,
            text: doc.text,
            summaryLoading: false,
            showSummary: true,
          });
          setSummaryData((prev) => ({ ...prev, [file._id]: doc.summary }));
          return;
        }

        // if OCR text exists but is too short, inform user
        if (doc && doc.text && doc.text.length < 200) {
          updateWindow(summaryId, {
            summaryLoading: false,
            summary: "Extracted text is too short to summarize.",
          });
          toast.error("Extracted text is too short to summarize.");
          return;
        }

        // otherwise request generation (this will run OCR if needed)
        const res = await generateSummary(file._id);
        updateWindow(summaryId, {
          summary: res.summary,
          text: res.text,
          summaryLoading: false,
          showSummary: true,
        });
        setSummaryData((prev) => ({ ...prev, [file._id]: res.summary }));
      } catch (err) {
        console.error(err);
        updateWindow(summaryId, { summaryLoading: false });
        toast.error(
          err?.response?.data?.message || "Failed to generate summary"
        );
      }
      return;
    }

    // For other actions (notes, quiz), fileOrData is the file
    const file = fileOrData;

    const id = `${type}-${file._id}`;

    if (windows.some((w) => w.id === id)) return;

    // 👉 QUIZ OPENS IN NEW TAB
    if (type === "quiz") {
      window.open(`/quiz?fileId=${file._id}`, "_blank");
      return;
    }

    // 👉 SUMMARY / NOTES (open a new helper window)
    setWindows((prev) => [
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
        setSummaryData((prev) => ({ ...prev, [file._id]: res.summary }));
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
      await saveFileUrlToDatabase(userId, file.name, url, file.type, file.size);

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
          <input
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />
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

              {win.summaryLoading ? (
                <p className="animate-pulse text-gray-500">
                  Generating summary...
                </p>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {win.summary ||
                    summaryData[win.file._id] ||
                    "No summary generated yet."}
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

          {!win.type &&
            (win.file.fileType.startsWith("image/") ? (
              <img
                src={win.file.fileUrl}
                className="w-full h-full object-contain"
              />
            ) : win.showSummary || win.summary ? (
              <div className="p-4 text-gray-800 dark:text-white h-full overflow-auto">
                <h2 className="text-lg font-bold mb-3">📄 Summary</h2>
                {win.summaryLoading ? (
                  <p className="animate-pulse text-gray-500">
                    Generating summary...
                  </p>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {win.summary || "No summary generated yet."}
                  </p>
                )}
              </div>
            ) : (
              <SmartPDFViewer
                fileUrl={win.file.fileUrl}
                fileId={win.file._id}
              />
            ))}
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
