import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { calendarAPI } from '../services/api';
import { Download, Copy, Check, CalendarIcon, X, ExternalLink, RefreshCw } from './CalendarIcons';

const CalendarExportModal = ({ treeId, treeName, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [feedData, setFeedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);

  useEffect(() => {
    if (isOpen && treeId) {
      setLoading(true);
      calendarAPI.getFeedToken(treeId)
        .then(res => setFeedData(res.data))
        .catch(err => console.error('Failed to load calendar feed token:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, treeId]);

  if (!isOpen) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2000);
  };

  const downloadICS = () => {
    const token = localStorage.getItem('access_token');
    const url = calendarAPI.getExportICSUrl(treeId);
    
    // Fetch via blob to include auth header safely
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${treeName.toLowerCase().replace(/\s+/g, '_')}_calendar.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => console.error('ICS download failed:', err));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900/95 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col backdrop-blur-xl">
        {/* Header */}
        <div className="px-6 sm:px-8 py-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <CalendarIcon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-100 tracking-tight">
                {t('calendar.exportTitle', 'Sync & Export Family Calendar')}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                {treeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-4">
              <RefreshCw className="w-10 h-10 animate-spin text-emerald-400" />
              <p className="text-sm font-semibold">{t('calendar.generatingToken', 'Generating secure subscription link...')}</p>
            </div>
          ) : (
            <>
              {/* Live Webcal / iCal Subscription */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-inner">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {t('calendar.liveFeedTitle', 'Live iCal / Webcal Subscription Feed')}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                      {t('calendar.liveFeedDesc', 'Subscribe in Google Calendar, Apple Calendar, or Outlook to keep family birthdays & events updated automatically.')}
                    </p>
                  </div>
                </div>

                {/* HTTPS URL */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    {t('calendar.feedUrlLabel', 'Calendar Feed Subscription URL (HTTPS)')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={feedData?.feed_url || ''}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-300 focus:outline-none shadow-inner"
                    />
                    <button
                      onClick={() => handleCopy(feedData?.feed_url)}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 transition shrink-0 shadow-md shadow-emerald-500/20"
                    >
                      {copiedFeed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedFeed ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}</span>
                    </button>
                  </div>
                </div>

                {/* Webcal Link */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <a
                    href={feedData?.webcal_url}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1.5 font-bold transition underline"
                  >
                    <span>{t('calendar.openWebcal', 'Open directly in Apple / Default Calendar App')}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Instant .ICS File Download */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-100 text-base">
                    {t('calendar.downloadIcsTitle', 'Download .ICS File')}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {t('calendar.downloadIcsDesc', 'Manual import snapshot of all current birthdays, anniversaries, and events.')}
                  </p>
                </div>
                <button
                  onClick={downloadICS}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-black flex items-center space-x-2 transition border border-slate-700/80 shrink-0 shadow-md"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>{t('calendar.downloadIcsBtn', 'Download .ics')}</span>
                </button>
              </div>

              {/* Instructions per Calendar Provider */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  {t('calendar.howToSubscribe', 'How to Add to Your External Calendar')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <div className="font-black text-xs text-amber-400 flex items-center gap-1.5">
                      <span>Google Calendar</span>
                    </div>
                    <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed font-medium">
                      <li>Copy the HTTPS URL above.</li>
                      <li>Open Google Calendar web.</li>
                      <li>Click <b>+</b> next to "Other calendars" &gt; <b>From URL</b>.</li>
                      <li>Paste &amp; click Add Calendar.</li>
                    </ol>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <div className="font-black text-xs text-sky-400 flex items-center gap-1.5">
                      <span>Apple Calendar (iOS / Mac)</span>
                    </div>
                    <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed font-medium">
                      <li>Click "Open directly" link or copy URL.</li>
                      <li>File &gt; New Calendar Subscription on Mac.</li>
                      <li>Or Settings &gt; Calendar &gt; Accounts on iPhone.</li>
                    </ol>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <div className="font-black text-xs text-indigo-400 flex items-center gap-1.5">
                      <span>Outlook / Office 365</span>
                    </div>
                    <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed font-medium">
                      <li>Open Outlook Calendar.</li>
                      <li>Click <b>Add Calendar</b> &gt; <b>Subscribe from web</b>.</li>
                      <li>Paste URL &amp; save.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-5 border-t border-slate-800/80 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black transition"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarExportModal;
