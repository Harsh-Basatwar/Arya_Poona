import React, { useState, useRef } from 'react';
import '../styles/PromptSqlInjectionForm.css';

const FileDocIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const FolderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const UploadCloudIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16l-4-4-4 4" />
    <path d="M12 12v9" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    <path d="M16 16l-4-4-4 4" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default function PromptSqlInjectionForm({ onSubmit, loading }) {
  const [apiDoc, setApiDoc] = useState(null);
  const [sopFiles, setSopFiles] = useState([]);
  const [rowsCount, setRowsCount] = useState(5);
  const [dragActiveApi, setDragActiveApi] = useState(false);
  const [dragActiveSop, setDragActiveSop] = useState(false);

  const apiInputRef = useRef(null);
  const sopInputRef = useRef(null);
  const sopFolderRef = useRef(null);

  // ---------- API Doc Drag & Drop ----------
  const handleApiDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveApi(true);
    } else if (e.type === 'dragleave') {
      setDragActiveApi(false);
    }
  };

  const handleApiDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveApi(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setApiDoc(e.dataTransfer.files[0]);
    }
  };

  // ---------- SOP Files Drag & Drop ----------
  const handleSopDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveSop(true);
    } else if (e.type === 'dragleave') {
      setDragActiveSop(false);
    }
  };

  const handleSopDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveSop(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSopFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();

    if (apiDoc) {
      formData.append('api_doc', apiDoc);
    }

    if (sopFiles.length > 0) {
      sopFiles.forEach((file) => {
        formData.append('sop_files', file);
      });
    }

    formData.append('rows', rowsCount);

    onSubmit(formData);
  };

  return (
    <form className="prompt-inj-form" onSubmit={handleSubmit}>
      <div className="prompt-inj-form__header">
        <h3>Prompt SQL Injection Test Configuration</h3>
        <p>
          Configure the automated testing engine (Arya / PFL-ATE) with your target API documentation, policy files, and test parameters.
        </p>
      </div>

      {/* Row 1: API Document Input (Drag & Drop or Pick) */}
      <div className="prompt-inj-form__field">
        <label className="prompt-inj-form__label">
          <FileDocIcon /> API Documentation File <span className="req-star">*</span>
        </label>
        <p className="prompt-inj-form__hint">
          Upload or drag & drop the API documentation file (.docx, .pdf, .txt, .json, .md).
        </p>

        <div
          className={`prompt-inj-dropzone ${dragActiveApi ? 'prompt-inj-dropzone--active' : ''} ${
            apiDoc ? 'prompt-inj-dropzone--has-file' : ''
          }`}
          onDragEnter={handleApiDrag}
          onDragOver={handleApiDrag}
          onDragLeave={handleApiDrag}
          onDrop={handleApiDrop}
          onClick={() => !apiDoc && apiInputRef.current?.click()}
        >
          <input
            ref={apiInputRef}
            type="file"
            accept=".docx,.doc,.pdf,.txt,.md,.json"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && setApiDoc(e.target.files[0])}
          />

          {!apiDoc ? (
            <div className="prompt-inj-dropzone__placeholder">
              <UploadCloudIcon />
              <div className="prompt-inj-dropzone__text">
                <strong>Drag & drop API document here</strong> or <span>browse from PC</span>
              </div>
              <div className="prompt-inj-dropzone__formats">Supports DOCX, PDF, TXT, MD, JSON</div>
            </div>
          ) : (
            <div className="prompt-inj-file-badge">
              <div className="prompt-inj-file-badge__icon">
                <FileDocIcon />
              </div>
              <div className="prompt-inj-file-badge__info">
                <span className="prompt-inj-file-badge__name">{apiDoc.name}</span>
                <span className="prompt-inj-file-badge__size">
                  {(apiDoc.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type="button"
                className="prompt-inj-file-badge__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setApiDoc(null);
                }}
                title="Remove file"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Optional SOP Folder / Files Input (Drag & Drop or Pick) */}
      <div className="prompt-inj-form__field">
        <label className="prompt-inj-form__label">
          <FolderIcon /> Optional SOP Documents / Policy Folder
        </label>
        <p className="prompt-inj-form__hint">
          Drag & drop single or multiple SOP files/folder (.docx, .pdf, .txt) to generate policy-grounded injection prompts.
        </p>

        <div
          className={`prompt-inj-dropzone ${dragActiveSop ? 'prompt-inj-dropzone--active' : ''}`}
          onDragEnter={handleSopDrag}
          onDragOver={handleSopDrag}
          onDragLeave={handleSopDrag}
          onDrop={handleSopDrop}
        >
          <input
            ref={sopInputRef}
            type="file"
            multiple
            accept=".docx,.doc,.pdf,.txt,.md,.json,.csv,.xlsx"
            style={{ display: 'none' }}
            onChange={(e) =>
              e.target.files &&
              setSopFiles((prev) => [...prev, ...Array.from(e.target.files)])
            }
          />
          <input
            ref={sopFolderRef}
            type="file"
            webkitdirectory="true"
            directory="true"
            style={{ display: 'none' }}
            onChange={(e) =>
              e.target.files &&
              setSopFiles((prev) => [...prev, ...Array.from(e.target.files)])
            }
          />

          <div className="prompt-inj-dropzone__placeholder">
            <UploadCloudIcon />
            <div className="prompt-inj-dropzone__text">
              <strong>Drag & drop SOP files/folder here</strong> or choose:
            </div>
            <div className="prompt-inj-btn-group" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => sopInputRef.current?.click()}
              >
                Select Files
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => sopFolderRef.current?.click()}
              >
                Select Folder
              </button>
            </div>
          </div>
        </div>

        {sopFiles.length > 0 && (
          <div className="prompt-inj-file-list">
            <div className="prompt-inj-file-list__header">
              <span>Attached Policy Files ({sopFiles.length})</span>
              <button
                type="button"
                className="btn-link"
                onClick={() => setSopFiles([])}
              >
                Clear all
              </button>
            </div>
            <ul className="prompt-inj-file-list__items">
              {sopFiles.slice(0, 5).map((f, i) => (
                <li key={i} className="prompt-inj-file-list__item">
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                  <button
                    type="button"
                    onClick={() => setSopFiles(sopFiles.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
              {sopFiles.length > 5 && (
                <li className="prompt-inj-file-list__more">
                  + {sopFiles.length - 5} more files selected
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Row 3: Number of Synthetic Rows */}
      <div className="prompt-inj-form__field">
        <label className="prompt-inj-form__label">
          Synthetic Rows Count
        </label>
        <p className="prompt-inj-form__hint">
          Number of synthetic test prompts to generate and evaluate against the target Chatbot API.
        </p>
        <div className="prompt-inj-rows-picker">
          <input
            type="number"
            min="1"
            max="50"
            value={rowsCount}
            onChange={(e) => setRowsCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="prompt-inj-rows-input"
          />
          <div className="prompt-inj-rows-presets">
            {[3, 5, 10, 20].map((n) => (
              <button
                key={n}
                type="button"
                className={`prompt-inj-preset-chip ${rowsCount === n ? 'prompt-inj-preset-chip--active' : ''}`}
                onClick={() => setRowsCount(n)}
              >
                {n} Rows
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Action */}
      <div className="prompt-inj-form__actions">
        <button
          type="submit"
          className="btn btn-primary prompt-inj-submit-btn"
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {loading ? 'Running Engine Assessment...' : 'Run Prompt Injection Assessment'}
        </button>
      </div>
    </form>
  );
}
