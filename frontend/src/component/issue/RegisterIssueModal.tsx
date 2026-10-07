import React, { useState } from 'react';
import { api } from '../../services/api.js';

interface RegisterIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdIssue: any) => void;
}

export const RegisterIssueModal: React.FC<RegisterIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ id: string; title: string } | null>(null);

  if (!isOpen) return null;

  // Handle Geolocation Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationSuccess(true);
        setDetectingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setErrorMessage('Unable to retrieve your location. Please enter your address manually.');
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Clear Geolocation
  const handleClearLocation = () => {
    setLatitude('');
    setLongitude('');
    setLocationSuccess(false);
  };

  // Handle File Selection (max 5 files)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const combined = [...files, ...selected].slice(0, 5);
    setFiles(combined);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide both an issue title and description.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('issue_title', title.trim());
      formData.append('issue_description', description.trim());
      if (address.trim()) formData.append('address', address.trim());
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      formData.append('annonymous', String(isAnonymous));

      // Append files for Cloudinary upload
      files.forEach((file) => {
        formData.append('issue_proof', file);
      });

      const response = await api.post('/api/v1/issue/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const created = response.data.data.issue;
      setSuccessInfo({ id: created.id, title: created.issue_title });

      if (onSuccess) {
        onSuccess(created);
      }

      // Reset form after short delay
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setAddress('');
        setLatitude('');
        setLongitude('');
        setFiles([]);
        setIsAnonymous(false);
        setSuccessInfo(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to register issue:', err);
      const msg =
        err.response?.data?.message ||
        'Failed to submit the grievance. Please check your network and try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Register Civic Grievance
              </h2>
              <p className="text-xs text-slate-500">
                Log a verified issue directly into our municipal database
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Success Notification */}
          {successInfo && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold">Grievance Registered Successfully!</span>
                <span className="text-[11px] text-emerald-700">
                  Tracking ID: <span className="font-mono font-bold">{successInfo.id}</span>
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <svg className="w-4 h-4 text-red-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Grievance Details */}
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Major water pipeline leakage causing waterlogging on Main Road"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description of the Issue <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide accurate details: What is happening? How long has it persisted? Any immediate safety hazards?"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 2: Location & GPS Detection */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Location Details
              </span>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/70 rounded-lg transition-colors cursor-pointer"
              >
                <svg className={`w-3.5 h-3.5 ${detectingLocation ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M2 12h20" />
                </svg>
                <span>{detectingLocation ? 'Locating...' : 'Detect GPS Coordinates'}</span>
              </button>
            </div>

            <div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, colony, landmark, or ward number"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {(latitude || longitude) && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    Captured Coordinates: <strong className="font-mono text-slate-800">{latitude}, {longitude}</strong>
                  </span>
                  {locationSuccess && (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Auto-Detected
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0"
                  title="Remove captured GPS coordinates"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>Remove GPS</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Media Evidence / Cloudinary Upload */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Upload Photo / Video Proof (Max 5 files)
              </label>
              
            </div>

            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors bg-white hover:bg-slate-50/50 cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="image/*,video/mp4,application/pdf"
                onChange={handleFileChange}
                disabled={files.length >= 5}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Click or drag & drop images or files here
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                PNG, JPG, WEBP, PDF, or MP4 up to 15MB each
              </p>
            </div>

            {/* Attached files list */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800"
                  >
                    <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Anonymous Checkbox */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            <input
              type="checkbox"
              id="anonymous-toggle"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="anonymous-toggle" className="text-xs text-slate-700 cursor-pointer select-none">
              <strong className="font-semibold text-slate-900">Submit as Anonymous:</strong> Hide my personal name and identity from public civic resolution records.
            </label>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !!successInfo}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                    <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" />
                  </svg>
                  <span>Uploading & Registering...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span>Submit Issue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterIssueModal;
