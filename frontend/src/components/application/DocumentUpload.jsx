import { useCallback, useRef, useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { DOCUMENT_TYPE_LABELS } from '@/utils/constants';
import {
  Upload, X, FileText, CheckCircle2, XCircle,
  Image as ImageIcon, AlertCircle
} from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const DocumentUpload = ({
  documents = [],
  onUpload,
  onRemove,
  readOnly = false,
}) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Chỉ chấp nhận file hình ảnh hoặc PDF';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File quá lớn (tối đa 5MB)';
    }
    return null;
  };

  const handleFiles = useCallback(async (files) => {
    const fileList = Array.from(files);
    const newErrors = {};

    for (const file of fileList) {
      const err = validateFile(file);
      if (err) {
        newErrors[file.name] = err;
        continue;
      }
      if (!readOnly) {
        setUploading(true);
        try {
          await onUpload?.(file);
        } catch (e) {
          newErrors[file.name] = e?.message || 'Upload thất bại';
        }
      }
    }

    setErrors(newErrors);
    setUploading(false);
  }, [onUpload, readOnly]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return ImageIcon;
    return FileText;
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      {!readOnly && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">
            Kéo thả file hoặc click để chọn
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Chấp nhận: JPG, PNG, GIF, PDF (tối đa 5MB)
          </p>
          {uploading && (
            <p className="text-xs text-primary mt-2 animate-pulse">Đang tải lên...</p>
          )}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => {
            const FileIcon = getFileIcon(doc.type || doc.url);
            return (
              <div
                key={doc._id || doc.id || index}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {doc.name || doc.originalName || `Tài liệu ${index + 1}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.typeLabel && (
                      <Badge variant="secondary" className="text-[10px]">
                        {DOCUMENT_TYPE_LABELS[doc.typeLabel] || doc.typeLabel}
                      </Badge>
                    )}
                    {doc.size && (
                      <span className="text-xs text-muted-foreground">
                        {formatSize(doc.size)}
                      </span>
                    )}
                    {doc.verified === true && (
                      <span className="flex items-center gap-0.5 text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã xác minh
                      </span>
                    )}
                    {doc.verified === false && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600">
                        <XCircle className="w-3 h-3" />
                        Chưa xác minh
                      </span>
                    )}
                  </div>
                </div>
                {!readOnly && onRemove && (
                  <button
                    onClick={() => onRemove(doc)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Xóa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="space-y-1">
          {Object.entries(errors).map(([name, msg]) => (
            <div key={name} className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>{name}</strong>: {msg}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
