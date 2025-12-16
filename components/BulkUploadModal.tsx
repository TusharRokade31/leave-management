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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Bulk User Upload</h2>
            <p className="text-sm text-gray-600 mt-1">Upload CSV file to create multiple users</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Download Template */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">CSV Template</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Download the template to see the required format
                </p>
                <button
                  onClick={downloadTemplate}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">Click to upload CSV file</p>
                  <p className="text-xs text-gray-500 mt-1">Format: name, email, role</p>
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
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <input
              type="checkbox"
              id="resetExisting"
              checked={resetExisting}
              onChange={(e) => setResetExisting(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="resetExisting" className="flex-1 cursor-pointer">
              <div className="font-medium text-gray-900">Reset Existing Users</div>
              <p className="text-sm text-gray-600 mt-1">
                If checked, existing users will have their passwords reset and receive new credentials via email
              </p>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Success */}
              {result.success.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-green-900">
                        {result.success.length} users created successfully
                      </h3>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {result.success.map((email, idx) => (
                          <p key={idx} className="text-sm text-green-700">
                            ✓ {email}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset */}
              {result.reset.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-900">
                        {result.reset.length} users reset
                      </h3>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {result.reset.map((email, idx) => (
                          <p key={idx} className="text-sm text-blue-700">
                            ↻ {email}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed */}
              {result.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-red-900">
                        {result.failed.length} users failed
                      </h3>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {result.failed.map((item, idx) => (
                          <p key={idx} className="text-sm text-red-700">
                            ✗ {item.email}: {item.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload and Create Users'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};