"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { IMPORT_PLATFORMS, type ImportPlatform } from "@/lib/constants";

interface CSVUploaderProps {
  platform: ImportPlatform;
  onFileLoaded: (content: string, fileName: string) => void;
}

export function CSVUploader({ platform, onFileLoaded }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const config = IMPORT_PLATFORMS[platform];

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv") && !file.name.endsWith(".xml")) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileName(file.name);
        onFileLoaded(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      <p className="mb-2 text-[11px] text-cream/30">{config.fileFormat}</p>

      {fileName ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/[0.04] px-4 py-3"
        >
          <CheckCircle size={16} className="text-green-400" />
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-cream">{fileName}</div>
            <div className="text-[10px] text-cream/30">File loaded successfully</div>
          </div>
          <button
            onClick={() => setFileName(null)}
            className="text-cream/25 hover:text-cream/50"
          >
            <X size={14} />
          </button>
        </motion.div>
      ) : (
        <label
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-all"
          style={{
            borderColor: isDragging ? `${config.color}50` : "rgba(255,255,255,0.06)",
            background: isDragging
              ? `${config.color}05`
              : "rgba(18,18,20,0.5)",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload size={24} className="text-cream/20" />
          <div className="text-center">
            <span className="text-[12px] font-medium text-cream/50">
              Drop your CSV file here or{" "}
              <span className="text-gold underline">browse</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-cream/20">
            <FileText size={10} /> .csv files accepted
          </div>
          <input
            type="file"
            accept=".csv,.xml"
            className="sr-only"
            onChange={handleInputChange}
          />
        </label>
      )}
    </div>
  );
}
