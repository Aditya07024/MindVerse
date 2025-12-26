import { FiX, FiFile } from "react-icons/fi";

export default function FilesModal({ files, onClose, onSelect }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded w-[600px] max-h-[80vh] overflow-auto p-4">
        <div className="flex justify-between mb-3">
          <h2 className="text-xl font-bold">All Files</h2>
          <button onClick={onClose}>
            <FiX />
          </button>
        </div>

        {files.length === 0 && <p>No files</p>}

        {files.map((file) => (
          <div
            key={file._id}
            onClick={() => {
              onSelect(file);
              onClose();
            }}
            className="flex items-center gap-3 p-2 border-b cursor-pointer hover:bg-gray-100"
          >
            <FiFile />
            <span className="truncate">{file.filename}</span>
          </div>
        ))}
      </div>
    </div>
  );
}