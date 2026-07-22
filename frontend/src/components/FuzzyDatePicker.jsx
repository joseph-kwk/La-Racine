/**
 * components/FuzzyDatePicker.jsx
 *
 * A reusable date picker that supports three precision modes:
 *   - "full"     → Day / Month / Year (standard calendar input)
 *   - "year"     → Year only (e.g. "1945")
 *   - "estimate" → Free-text estimate (e.g. "Around 1920s", "Early 1800s")
 *
 * The component outputs a fuzzyDate object:
 *   { precision, date, display_text, bce }
 *
 * The parent must POST this to /api/fuzzy-dates/ and use the returned ID
 * as birth_date or death_date on the FamilyMember.
 */

import React, { useState } from 'react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const PRECISION_OPTIONS = [
  { value: 'full',     label: '📅 Full date',    hint: 'Day, month and year' },
  { value: 'year',     label: '🗓️ Year only',    hint: 'Only the year is known' },
  { value: 'estimate', label: '〜 Estimate',      hint: 'Approximate or uncertain' },
];

/**
 * @param {string}   label        — field label, e.g. "Date of Birth"
 * @param {object}   value        — current fuzzyDate value { precision, date, display_text, bce }
 * @param {function} onChange     — called with updated fuzzyDate object
 * @param {boolean}  allowBCE     — show BCE toggle (for very historical trees)
 * @param {boolean}  required     — make field required
 */
export default function FuzzyDatePicker({ label, value = {}, onChange, allowBCE = false, required = false }) {
  const [precision, setPrecision] = useState(value.precision || 'full');
  const [estimate, setEstimate] = useState(value.display_text || '');
  const [bce, setBce]     = useState(value.bce || false);

  // Parse initial full date
  const initDate = value.date || '';
  const [initYear, initMonth, initDay] = initDate ? initDate.split('-') : ['', '', ''];

  const [dayVal, setDayVal]     = useState(initDay || '');
  const [monthVal, setMonthVal] = useState(initMonth ? parseInt(initMonth, 10).toString() : '');
  const [yearVal, setYearVal]   = useState(initYear || '');

  const emit = ({ prec = precision, d = dayVal, m = monthVal, y = yearVal, est = estimate, isBce = bce }) => {
    let date = null;
    let display_text = null;

    if (prec === 'full' && y && m && d) {
      date = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (prec === 'year' && y) {
      date = `${y.padStart(4, '0')}-01-01`;
      display_text = isBce ? `${y} BC` : y;
    } else if (prec === 'estimate') {
      display_text = est;
    }

    onChange({ precision: prec, date, display_text, bce: isBce });
  };

  const handlePrecision = (p) => {
    setPrecision(p);
    emit({ prec: p });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 250 }, (_, i) => currentYear - i);
  const days  = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="fuzzy-date-picker">
      <div className="fuzzy-date-picker__label-row">
        <label className="form-label">
          {label}
          {required && <span className="fuzzy-date-picker__required"> *</span>}
        </label>
      </div>

      {/* Precision selector */}
      <div className="fuzzy-date-picker__modes">
        {PRECISION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`fuzzy-date-picker__mode-btn ${precision === opt.value ? 'fuzzy-date-picker__mode-btn--active' : ''}`}
            onClick={() => handlePrecision(opt.value)}
            title={opt.hint}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Full date */}
      {precision === 'full' && (
        <div className="fuzzy-date-picker__fields">
          <select
            className="form-input fuzzy-date-picker__select"
            value={monthVal}
            onChange={(e) => { setMonthVal(e.target.value); emit({ m: e.target.value }); }}
            required={required}
            aria-label="Month"
          >
            <option value="">Month</option>
            {MONTHS.map((mo, i) => (
              <option key={i} value={i + 1}>{mo}</option>
            ))}
          </select>

          <select
            className="form-input fuzzy-date-picker__select fuzzy-date-picker__select--sm"
            value={dayVal}
            onChange={(e) => { setDayVal(e.target.value); emit({ d: e.target.value }); }}
            aria-label="Day"
          >
            <option value="">Day</option>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="form-input fuzzy-date-picker__select"
            value={yearVal}
            onChange={(e) => { setYearVal(e.target.value); emit({ y: e.target.value }); }}
            required={required}
            aria-label="Year"
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* Year only */}
      {precision === 'year' && (
        <div className="fuzzy-date-picker__fields">
          <select
            className="form-input fuzzy-date-picker__select"
            value={yearVal}
            onChange={(e) => { setYearVal(e.target.value); emit({ y: e.target.value }); }}
            required={required}
            aria-label="Year"
          >
            <option value="">Select year</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {allowBCE && (
            <label className="fuzzy-date-picker__bce-label">
              <input
                type="checkbox"
                checked={bce}
                onChange={(e) => { setBce(e.target.checked); emit({ isBce: e.target.checked }); }}
              />
              <span>BCE (before common era)</span>
            </label>
          )}
        </div>
      )}

      {/* Estimate / free text */}
      {precision === 'estimate' && (
        <div className="fuzzy-date-picker__fields">
          <input
            type="text"
            className="form-input"
            placeholder='e.g. "Around 1920s", "Early 1800s", "circa 1955"'
            value={estimate}
            onChange={(e) => { setEstimate(e.target.value); emit({ est: e.target.value }); }}
            required={required}
          />
          <p className="fuzzy-date-picker__hint">
            💡 Use this when the exact date is uncertain or unknown.
          </p>
        </div>
      )}
    </div>
  );
}
