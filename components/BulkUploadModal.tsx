import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { BulkUploadResult } from '@/type/form';

interface BulkUploadModalProps {
  onClose: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [resetExisting, setResetExisting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('resetExisting', resetExisting.toString());

      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.results);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = (): void => {
    const csv = 'name,email,role\nJohn Doe,john@example.com,EMPLOYEE\nJane Smith,jane@example.com,MANAGER';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-800 dark:text-white uppercase">Bulk User Upload</h2>
            <p className="text-sm font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Upload CSV file to create multiple users</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Download Template */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 uppercase text-xs tracking-widest">CSV Template Required</h3>
                <p className="text-sm text-indigo-700/80 dark:text-indigo-400/80 mt-1 font-medium">
                  Ensure your file follows the required column format.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-black underline underline-offset-4 uppercase tracking-tighter"
                >
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Source CSV File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-10 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 bg-gray-50/50 dark:bg-slate-800/20 transition-all"
            >
              <Upload className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-4 group-hover:scale-110 group-hover:text-indigo-500 transition-all" />
              {file ? (
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{file.name}</p>
                  <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 mt-2 uppercase">
                    {(file.size / 1024).toFixed(2)} KB • READY TO SYNC
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-slate-400">Click or drag to upload CSV</p>
                  <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 mt-2 uppercase tracking-widest">Required Format: name, email, role</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Reset Option */}
          <div className="flex items-start gap-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-5">
            <div className="pt-0.5">
              <input
                type="checkbox"
                id="resetExisting"
                checked={resetExisting}
                onChange={(e) => setResetExisting(e.target.checked)}
                className="w-5 h-5 text-indigo-600 dark:text-indigo-500 rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <label htmlFor="resetExisting" className="flex-1 cursor-pointer">
              <div className="font-bold text-orange-900 dark:text-orange-300 uppercase text-xs tracking-widest">Reset Existing Users</div>
              <p className="text-sm text-orange-700/80 dark:text-orange-400/80 mt-1 font-medium leading-relaxed">
                Existing users will receive new auto-generated credentials via email.
              </p>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
              <p className="text-sm font-bold text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Results Sections */}
          {result && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              {/* Success Result */}
              {result.success.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-xs font-black text-green-900 dark:text-green-300 uppercase tracking-widest">
                        {result.success.length} Accounts Synchronized
                      </h3>
                      <div className="mt-3 max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                        {result.success.map((email, idx) => (
                          <p key={idx} className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                            <span className="w-1 h-1 bg-green-400 rounded-full" /> {email}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset Result */}
              {result.reset.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest">
                        {result.reset.length} Credentials Reset
                      </h3>
                      <div className="mt-3 max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                        {result.reset.map((email, idx) => (
                          <p key={idx} className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                             <span className="w-1 h-1 bg-blue-400 rounded-full" /> {email}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed Result */}
              {result.failed.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-xs font-black text-red-900 dark:text-red-300 uppercase tracking-widest">
                        {result.failed.length} Sync Failures
                      </h3>
                      <div className="mt-3 max-h-32 overflow-y-auto custom-scrollbar space-y-2">
                        {result.failed.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-bold text-red-800 dark:text-red-400">{item.email}</span>
                            <p className="text-xs text-red-600 dark:text-red-500/80 font-medium">Error: {item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex gap-4 transition-colors">
          <button
            onClick={onClose}
            className="px-8 py-4 font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 dark:shadow-none disabled:bg-indigo-400 disabled:scale-95 active:scale-[0.98]"
          >
            {isUploading ? 'Synchronizing...' : 'Upload and Sync Team'}
          </button>
        </div>
      </div>
    </div>
  );
};