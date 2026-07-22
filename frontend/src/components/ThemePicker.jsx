/**
 * components/ThemePicker.jsx
 *
 * Full family identity picker:
 *   - 24 globally-inclusive preset palette tiles grouped by region
 *   - Custom hex color input with auto-palette generation
 *   - Family crest / emblem drag-and-drop upload (2MB max, jpg/png/webp)
 *   - Live preview panel (hero banner + member card sample)
 *   - Save / Reset buttons
 *
 * Props:
 *   tree       — current tree object (from API)
 *   onSave     — async (themePayload, crestFile, crestCaption) => void
 *   readOnly   — if true, shows theme without edit controls (for viewers)
 */

import React, { useState, useCallback, useRef } from 'react';
import { PRESETS_BY_REGION, PRESET_MAP, DEFAULT_PRESET, resolveTheme } from '../data/themePresets';


// ── Helpers ──────────────────────────────────────────────────────────────────

/** Auto-derive mid / light / dark from a single primary hex color */
function autoDerivePalette(hex) {
  // Parse hex to HSL
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  const hsl = (ll) => {
    // Convert HSL back to hex
    const a = s * Math.min(ll, 100 - ll) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color / 100).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  return {
    primary: hex,
    mid:     hsl(Math.min(l + 20, 80)),
    light:   hsl(Math.min(l + 45, 97)),
    dark:    hsl(Math.max(l - 20, 10)),
  };
}

function isValidHex(hex) {
  return /^#([0-9a-fA-F]{6})$/.test(hex);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PresetTile({ preset, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`theme-picker__tile ${selected ? 'theme-picker__tile--selected' : ''}`}
      style={{ '--tile-primary': preset.primary, '--tile-light': preset.light, '--tile-dark': preset.dark }}
      onClick={() => onSelect(preset)}
      title={`${preset.name} — ${preset.vibe}`}
    >
      <div className="theme-picker__tile-swatch">
        <span className="theme-picker__tile-color" style={{ background: preset.dark }} />
        <span className="theme-picker__tile-color" style={{ background: preset.primary }} />
        <span className="theme-picker__tile-color" style={{ background: preset.mid }} />
        <span className="theme-picker__tile-color" style={{ background: preset.light }} />
      </div>
      <span className="theme-picker__tile-name">{preset.name}</span>
      {selected && <span className="theme-picker__tile-check">✓</span>}
    </button>
  );
}

function LivePreview({ theme, crestUrl, treeName }) {
  const gradient = `linear-gradient(135deg, ${theme.dark} 0%, ${theme.primary} 100%)`;
  return (
    <div className="theme-picker__preview">
      {/* Mini hero banner */}
      <div className="theme-picker__preview-hero" style={{ background: gradient }}>
        {crestUrl && (
          <img
            src={crestUrl}
            alt="Family crest"
            className="theme-picker__preview-crest"
          />
        )}
        <div className="theme-picker__preview-hero-text">
          <div className="theme-picker__preview-tree-name">{treeName || 'Your Family Tree'}</div>
          <div className="theme-picker__preview-dates" style={{ color: theme.mid }}>
            Member since 2024
          </div>
        </div>
      </div>
      {/* Mini member card */}
      <div className="theme-picker__preview-card" style={{ borderLeftColor: theme.primary }}>
        <div className="theme-picker__preview-avatar" style={{ background: gradient }}>👤</div>
        <div>
          <div className="theme-picker__preview-card-name">Jean Kasongo</div>
          <div className="theme-picker__preview-card-meta" style={{ color: theme.primary }}>
            🍼 1952 — Present · 72 years old
          </div>
          <div className="theme-picker__preview-card-location">📍 Kinshasa, DRC</div>
        </div>
      </div>
      {/* Accent samples */}
      <div className="theme-picker__preview-accents">
        <span className="theme-picker__preview-badge" style={{ background: theme.light, color: theme.dark }}>
          👑 Owner
        </span>
        <span className="theme-picker__preview-badge" style={{ background: theme.primary, color: 'white' }}>
          + Add Member
        </span>
        <span className="theme-picker__preview-badge" style={{ background: theme.mid, color: theme.dark }}>
          🌳 Tree View
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const ThemePicker = ({ tree, onSave, readOnly = false }) => {
  const currentTheme = resolveTheme(tree);

  const [selectedSlug, setSelectedSlug] = useState(tree?.theme_preset || 'emerald_root');
  const [customHex, setCustomHex]       = useState('');
  const [useCustom, setUseCustom]       = useState(false);
  const [activeTheme, setActiveTheme]   = useState(currentTheme);

  const [crestFile, setCrestFile]         = useState(null);
  const [crestPreviewUrl, setCrestPreviewUrl] = useState(
    tree?.crest_image || null
  );
  const [crestCaption, setCrestCaption]   = useState(tree?.crest_caption || '');
  const [dragOver, setDragOver]           = useState(false);

  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  const fileInputRef = useRef();

  const applyPreset = (preset) => {
    setSelectedSlug(preset.slug);
    setUseCustom(false);
    setCustomHex('');
    setActiveTheme(preset);
  };

  const applyCustomHex = (hex) => {
    setCustomHex(hex);
    if (isValidHex(hex)) {
      setUseCustom(true);
      setSelectedSlug('custom');
      setActiveTheme(autoDerivePalette(hex));
    }
  };

  const handleCrestFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Crest must be a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Crest image must be 2MB or smaller.');
      return;
    }
    setError('');
    setCrestFile(file);
    setCrestPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleCrestFile(e.dataTransfer.files[0]);
  }, []);

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    setError('');
    try {
      const themePayload = useCustom
        ? { theme_preset: '', ...activeTheme }
        : { theme_preset: selectedSlug, theme_primary: '', theme_mid: '', theme_light: '', theme_dark: '' };

      await onSave(themePayload, crestFile, crestCaption);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save theme.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const def = PRESET_MAP['emerald_root'];
    setSelectedSlug('emerald_root');
    setUseCustom(false);
    setCustomHex('');
    setActiveTheme(def);
  };

  return (
    <div className="theme-picker">
      {/* ── Live Preview ── */}
      <div className="theme-picker__preview-section">
        <h3 className="theme-picker__subsection-title">👁️ Live Preview</h3>
        <LivePreview
          theme={activeTheme}
          crestUrl={crestPreviewUrl}
          treeName={tree?.name}
        />
      </div>

      {/* ── Palette Grid ── */}
      <div className="theme-picker__palette-section">
        <h3 className="theme-picker__subsection-title">🎨 Choose a Palette</h3>
        <p className="theme-picker__palette-hint">
          Every family in the world should feel at home. Choose colors that represent your heritage.
        </p>

        {PRESETS_BY_REGION.map(({ region, palettes }) => (
          <div key={region} className="theme-picker__region">
            <h4 className="theme-picker__region-title">{region}</h4>
            <div className="theme-picker__tiles">
              {palettes.map(preset => (
                <PresetTile
                  key={preset.slug}
                  preset={preset}
                  selected={!useCustom && selectedSlug === preset.slug}
                  onSelect={applyPreset}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Custom Hex ── */}
      {!readOnly && (
        <div className="theme-picker__custom-section">
          <h3 className="theme-picker__subsection-title">✏️ Custom Color</h3>
          <p className="theme-picker__palette-hint">
            Have a specific color in mind? Enter a hex code — the full palette will be auto-generated.
          </p>
          <div className="theme-picker__custom-row">
            <input
              type="color"
              className="theme-picker__color-wheel"
              value={isValidHex(customHex) ? customHex : '#15803d'}
              onChange={(e) => applyCustomHex(e.target.value)}
            />
            <input
              type="text"
              className="form-input theme-picker__hex-input"
              placeholder="#15803d"
              value={customHex}
              maxLength={7}
              onChange={(e) => applyCustomHex(e.target.value)}
            />
            {useCustom && (
              <div className="theme-picker__custom-swatches">
                {['dark', 'primary', 'mid', 'light'].map(k => (
                  <span
                    key={k}
                    className="theme-picker__custom-swatch"
                    style={{ background: activeTheme[k] }}
                    title={`${k}: ${activeTheme[k]}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Family Crest ── */}
      <div className="theme-picker__crest-section">
        <h3 className="theme-picker__subsection-title">🛡️ Family Crest or Emblem</h3>
        <p className="theme-picker__palette-hint">
          Upload your family's crest, coat of arms, clan totem, or any emblem that represents your lineage.
          Displayed in your tree header for all members to see.
        </p>

        {!readOnly && (
          <div
            className={`theme-picker__crest-dropzone ${dragOver ? 'theme-picker__crest-dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {crestPreviewUrl ? (
              <div className="theme-picker__crest-preview-wrap">
                <img src={crestPreviewUrl} alt="Family crest preview" className="theme-picker__crest-preview-img" />
                <button
                  type="button"
                  className="theme-picker__crest-remove"
                  onClick={(e) => { e.stopPropagation(); setCrestFile(null); setCrestPreviewUrl(null); }}
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="theme-picker__crest-placeholder">
                <span className="theme-picker__crest-icon">🛡️</span>
                <p>Drag & drop an image here, or <strong>click to browse</strong></p>
                <p className="theme-picker__crest-limits">JPG, PNG or WebP · Max 2MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => handleCrestFile(e.target.files[0])}
            />
          </div>
        )}

        {crestPreviewUrl && readOnly && (
          <img src={crestPreviewUrl} alt="Family crest" className="theme-picker__crest-readonly-img" />
        )}

        {!readOnly && (
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Family Motto or Crest Description <span className="add-member__optional">(optional)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder='e.g. "Fortis et Fidelis" or "Tree of Life"'
              value={crestCaption}
              onChange={(e) => setCrestCaption(e.target.value)}
              maxLength={255}
            />
          </div>
        )}

        {crestCaption && readOnly && (
          <p className="theme-picker__crest-caption-display">✦ {crestCaption}</p>
        )}
      </div>

      {/* ── Error + Actions ── */}
      {error && <div className="add-member__error">{error}</div>}

      {!readOnly && (
        <div className="theme-picker__actions">
          <button type="button" className="btn btn--ghost" onClick={handleReset}>
            Reset to Default
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save Theme'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemePicker;
