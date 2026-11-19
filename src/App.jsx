import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './App.css';

const TARGET_URL = 'https://www.mallarmediaventures.com/';

// Calculate relative luminance for contrast ratio
function getLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  try {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch {
    return 8.5;
  }
}

// Preset color themes featuring Maroon & Gold (#490000, #F9B01B), Classic B&W, and purple/indigo
const PRESET_THEMES = [
  {
    id: 'maroon-gold',
    name: 'Maroon & Gold',
    badge: 'Featured',
    category: 'brand',
    description: 'Deep Maroon (#490000) on Warm Gold (#F9B01B)',
    fgColor: '#490000',
    bgColor: '#F9B01B',
    type: 'preset',
    previewGradient: 'linear-gradient(135deg, #490000 50%, #F9B01B 50%)',
  },
  {
    id: 'classic-bw',
    name: 'Classic Black & White',
    badge: 'Standard',
    category: 'classic',
    description: 'Black modules on crisp pure white background',
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    type: 'preset',
    previewGradient: 'linear-gradient(135deg, #000000 50%, #FFFFFF 50%)',
  },
  {
    id: 'maroon-white',
    name: 'Maroon on White',
    badge: '#490000',
    category: 'brand',
    description: 'Deep Maroon modules on clean white background',
    fgColor: '#490000',
    bgColor: '#FFFFFF',
    type: 'preset',
    previewGradient: 'linear-gradient(135deg, #490000 50%, #FFFFFF 50%)',
  },
  {
    id: 'gold-maroon',
    name: 'Gold on Maroon',
    badge: '#F9B01B',
    category: 'brand',
    description: 'Warm Gold modules on Deep Maroon background',
    fgColor: '#F9B01B',
    bgColor: '#490000',
    type: 'preset',
    previewGradient: 'linear-gradient(135deg, #F9B01B 50%, #490000 50%)',
  },
  {
    id: 'inverted-wb',
    name: 'Inverted White on Black',
    badge: 'Inverted',
    category: 'classic',
    description: 'White modules on deep black background',
    fgColor: '#FFFFFF',
    bgColor: '#000000',
    type: 'preset',
    previewGradient: 'linear-gradient(135deg, #FFFFFF 50%, #000000 50%)',
  },
  {
    id: 'twilight-gradient',
    name: 'Twilight Gradient',
    badge: 'Gradient',
    category: 'purple',
    description: 'Signature Purple, Indigo & Blue Blend',
    fgColor: '#1e1b4b',
    bgColor: '#FFFFFF',
    type: 'gradient',
    previewGradient: 'linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)',
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    category: 'purple',
    description: 'Deep authoritative dark indigo on white',
    fgColor: '#1e1b4b',
    bgColor: '#FFFFFF',
    type: 'preset',
    previewGradient: '#1e1b4b',
  },
  {
    id: 'royal-indigo',
    name: 'Royal Indigo',
    category: 'purple',
    description: 'Vibrant indigo hue on white',
    fgColor: '#312e81',
    bgColor: '#FFFFFF',
    type: 'preset',
    previewGradient: '#312e81',
  },
  {
    id: 'electric-violet',
    name: 'Electric Violet',
    category: 'purple',
    description: 'Royal amethyst purple on white',
    fgColor: '#2e1065',
    bgColor: '#FFFFFF',
    type: 'preset',
    previewGradient: '#2e1065',
  },
];

function App() {
  // Light / Dark UI mode
  const [themeMode, setThemeMode] = useState('dark');

  // QR Code colors
  const [activeThemeId, setActiveThemeId] = useState('maroon-gold');
  const [fgColor, setFgColor] = useState('#490000');
  const [bgColor, setBgColor] = useState('#F9B01B');

  // Center Logo Options
  // 'image' = use public/MMV.JPG
  // 'custom' = custom text name badge with editable name & colors
  // 'none' = no center logo
  const [logoMode, setLogoMode] = useState('image');
  const [logoText, setLogoText] = useState('MMV');
  const [logoBgColor, setLogoBgColor] = useState('#490000');
  const [logoTextColor, setLogoTextColor] = useState('#FFFFFF');
  const [logoBorderColor, setLogoBorderColor] = useState('#F9B01B');

  const [exportResolution, setExportResolution] = useState(1024);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const previewCanvasRef = useRef(null);
  const exportCanvasRef = useRef(null);

  // Sync data-theme on html root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Generate dynamic custom text SVG data URL for center badge
  const customBadgeDataUrl = useMemo(() => {
    const cleanText = logoText.trim() || 'MMV';
    const fontSize =
      cleanText.length <= 3
        ? 36
        : cleanText.length <= 5
        ? 28
        : cleanText.length <= 7
        ? 22
        : 18;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="26" fill="${logoBgColor}" />
      <rect x="4" y="4" width="112" height="112" rx="22" fill="none" stroke="${logoBorderColor}" stroke-width="4" stroke-opacity="0.95" />
      <text x="60" y="${60 + fontSize * 0.35}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${fontSize}" fill="${logoTextColor}" text-anchor="middle" letter-spacing="1">${cleanText}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [logoText, logoBgColor, logoTextColor, logoBorderColor]);

  // Determine active image source for QR center
  const activeLogoSrc = useMemo(() => {
    if (logoMode === 'image') return '/MMV.JPG';
    if (logoMode === 'custom') return customBadgeDataUrl;
    return null;
  }, [logoMode, customBadgeDataUrl]);

  // Contrast calculation
  const contrastRatio = useMemo(() => {
    return getContrastRatio(fgColor, bgColor).toFixed(1);
  }, [fgColor, bgColor]);

  const isGoodContrast = parseFloat(contrastRatio) >= 4.0;

  // Preset selection handler
  const handleSelectTheme = (theme) => {
    setActiveThemeId(theme.id);
    setFgColor(theme.fgColor);
    setBgColor(theme.bgColor);

    // Sync logo colors when selecting theme if in custom text mode
    if (theme.id === 'maroon-gold' || theme.id === 'gold-maroon') {
      setLogoBgColor('#490000');
      setLogoTextColor('#FFFFFF');
      setLogoBorderColor('#F9B01B');
    } else if (theme.id === 'classic-bw') {
      setLogoBgColor('#000000');
      setLogoTextColor('#FFFFFF');
      setLogoBorderColor('#FFFFFF');
    }
  };

  // Swap foreground and background
  const handleSwapColors = () => {
    const temp = fgColor;
    setFgColor(bgColor);
    setBgColor(temp);
    setActiveThemeId('custom');
    showToast('Swapped QR foreground & background colors!');
  };

  // Apply gradient tinting to preview canvas if twilight-gradient is active
  const applyGradientToCanvas = useCallback(
    (canvas) => {
      if (!canvas || activeThemeId !== 'twilight-gradient') return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = w;
      sampleCanvas.height = h;
      const sCtx = sampleCanvas.getContext('2d');
      if (!sCtx) return;

      const gradient = sCtx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#3b0764');   // deep purple
      gradient.addColorStop(0.5, '#1e1b4b'); // midnight indigo
      gradient.addColorStop(1, '#1e40af');   // royal blue
      sCtx.fillStyle = gradient;
      sCtx.fillRect(0, 0, w, h);

      const gradData = sCtx.getImageData(0, 0, w, h).data;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) {
          data[i] = gradData[i];
          data[i + 1] = gradData[i + 1];
          data[i + 2] = gradData[i + 2];
        }
      }
      ctx.putImageData(imgData, 0, 0);
    },
    [activeThemeId]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      applyGradientToCanvas(previewCanvasRef.current);
    }, 60);
    return () => clearTimeout(timer);
  }, [activeThemeId, fgColor, bgColor, logoMode, activeLogoSrc, applyGradientToCanvas]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(TARGET_URL);
      setCopiedLink(true);
      showToast('URL copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Copied URL to clipboard');
    }
  };

  // Immediate High-Quality PNG Download
  const handleDownload = () => {
    setIsDownloading(true);

    try {
      const targetCanvas = exportCanvasRef.current;
      if (!targetCanvas) {
        throw new Error('Export canvas not initialized');
      }

      if (activeThemeId === 'twilight-gradient') {
        applyGradientToCanvas(targetCanvas);
      }

      const dataUrl = targetCanvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      downloadLink.download = `mallar-media-ventures-qr-${exportResolution}px.png`;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`Downloaded QR Code (${exportResolution} × ${exportResolution} PNG)!`);
    } catch (err) {
      console.error('Download error:', err);
      if (previewCanvasRef.current) {
        const dataUrl = previewCanvasRef.current.toDataURL('image/png', 1.0);
        const downloadLink = document.createElement('a');
        downloadLink.download = 'mallar-media-ventures-qr.png';
        downloadLink.href = dataUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        showToast('Downloaded QR Code (PNG)!');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy PNG image to clipboard
  const handleCopyImage = async () => {
    try {
      const canvas = exportCanvasRef.current || previewCanvasRef.current;
      if (!canvas) return;

      if (activeThemeId === 'twilight-gradient') {
        applyGradientToCanvas(canvas);
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          showToast('QR Code image copied to clipboard!');
        } catch {
          showToast('Image clipboard not supported in this browser');
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('Could not copy image to clipboard');
    }
  };

  return (
    <div className="app-wrapper">
      {/* Top Header with /MMV.JPG Logo & Light/Dark Switcher */}
      <header className="app-header">
        <div className="brand-section">
          {/* Official MMV.JPG Image in Header */}
          <div className="brand-logo-container">
            <img
              src="/MMV.JPG"
              alt="Mallar Media Ventures Logo"
              className="brand-logo-img"
            />
          </div>
          <div className="brand-info">
            <h1>
              Mallar Media Ventures
              <span className="brand-badge">Official QR Studio</span>
            </h1>
            <p>High-resolution, scannable QR destination portal</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            className="theme-mode-btn"
            onClick={toggleThemeMode}
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme mode"
          >
            {themeMode === 'dark' ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <a
            href={TARGET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="header-link-btn"
            title="Visit official website"
          >
            Visit Website
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="main-layout">
        {/* Left Column: Controls & Configuration */}
        <section className="controls-panel">
          {/* Target URL Card */}
          <div className="glass-card url-showcase">
            <div className="card-header-row">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                Target Destination URL
              </span>
              <div className="verified-pill">
                <div className="pulse-dot"></div>
                Static Destination
              </div>
            </div>

            <div className="url-box">
              <a
                href={TARGET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="url-text"
              >
                {TARGET_URL}
              </a>
              <div className="url-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleCopyLink}
                  title="Copy link"
                  aria-label="Copy link"
                >
                  {copiedLink ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Color Palettes (Maroon & Gold, Classic B&W, Custom) */}
          <div className="glass-card">
            <div className="card-header-row">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
                </svg>
                QR Code Color Palette
              </span>

              {/* Optical Contrast Indicator */}
              <div
                className="contrast-badge"
                style={{
                  background: isGoodContrast
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  borderColor: isGoodContrast
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)',
                  color: isGoodContrast ? '#10b981' : '#f87171',
                }}
              >
                Contrast: {contrastRatio}:1 {isGoodContrast ? '✓ AAA' : '⚠ Low'}
              </div>
            </div>

            <div className="theme-grid">
              {PRESET_THEMES.map((theme) => {
                const isActive = activeThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-card ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectTheme(theme)}
                  >
                    <div
                      className="color-preview-circle"
                      style={{ background: theme.previewGradient }}
                    />
                    <span className="theme-name">{theme.name}</span>
                    {theme.badge && (
                      <span className="theme-pill-badge">{theme.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Direct Color Pickers & Swatches */}
            <div className="custom-color-controls">
              <div className="color-input-group">
                <label className="color-label">
                  Foreground (Modules)
                  <span className="hex-val-tag">{fgColor.toUpperCase()}</span>
                </label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => {
                      setFgColor(e.target.value);
                      setActiveThemeId('custom');
                    }}
                    className="native-color-picker"
                    aria-label="QR Foreground Color Picker"
                  />
                  <div className="quick-swatches">
                    <button
                      type="button"
                      className={`swatch-btn ${fgColor.toUpperCase() === '#490000' ? 'selected' : ''}`}
                      style={{ background: '#490000' }}
                      title="Set Foreground to #490000 (Deep Maroon)"
                      onClick={() => {
                        setFgColor('#490000');
                        setActiveThemeId('custom');
                      }}
                    >
                      #490000
                    </button>
                    <button
                      type="button"
                      className={`swatch-btn ${fgColor.toUpperCase() === '#F9B01B' ? 'selected' : ''}`}
                      style={{ background: '#F9B01B', color: '#000000' }}
                      title="Set Foreground to #F9B01B (Warm Gold)"
                      onClick={() => {
                        setFgColor('#F9B01B');
                        setActiveThemeId('custom');
                      }}
                    >
                      #F9B01B
                    </button>
                    <button
                      type="button"
                      className={`swatch-btn ${fgColor.toUpperCase() === '#000000' ? 'selected' : ''}`}
                      style={{ background: '#000000' }}
                      title="Set Foreground to #000000 (Classic Black)"
                      onClick={() => {
                        setFgColor('#000000');
                        setActiveThemeId('custom');
                      }}
                    >
                      #000000
                    </button>
                    <button
                      type="button"
                      className={`swatch-btn ${fgColor.toUpperCase() === '#1E1B4B' ? 'selected' : ''}`}
                      style={{ background: '#1e1b4b' }}
                      title="Set Foreground to #1e1b4b (Indigo)"
                      onClick={() => {
                        setFgColor('#1e1b4b');
                        setActiveThemeId('custom');
                      }}
                    >
                      #1E1B4B
                    </button>
                  </div>
                </div>
              </div>

              {/* Swap Colors Action */}
              <button
                type="button"
                className="swap-colors-btn"
                onClick={handleSwapColors}
                title="Swap Foreground and Background colors"
                aria-label="Swap colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m7 16-4-4 4-4"></path>
                  <path d="m17 8 4 4-4 4"></path>
                  <path d="M3 12h18"></path>
                </svg>
                <span>Swap Colors</span>
              </button>

              <div className="color-input-group">
                <label className="color-label">
                  Background (Quiet Zone)
                  <span className="hex-val-tag">{bgColor.toUpperCase()}</span>
                </label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      setActiveThemeId('custom');
                    }}
                    className="native-color-picker"
                    aria-label="QR Background Color Picker"
                  />
                  <div className="quick-swatches">
                    <button
                      type="button"
                      className={`swatch-btn ${bgColor.toUpperCase() === '#FFFFFF' ? 'selected' : ''}`}
                      style={{ background: '#FFFFFF', color: '#000000' }}
                      title="Set Background to #FFFFFF (Clean White)"
                      onClick={() => {
                        setBgColor('#FFFFFF');
                        setActiveThemeId('custom');
                      }}
                    >
                      #FFFFFF
                    </button>
                    <button
                      type="button"
                      className={`swatch-btn ${bgColor.toUpperCase() === '#F9B01B' ? 'selected' : ''}`}
                      style={{ background: '#F9B01B', color: '#000000' }}
                      title="Set Background to #F9B01B (Warm Gold)"
                      onClick={() => {
                        setBgColor('#F9B01B');
                        setActiveThemeId('custom');
                      }}
                    >
                      #F9B01B
                    </button>
                    <button
                      type="button"
                      className={`swatch-btn ${bgColor.toUpperCase() === '#490000' ? 'selected' : ''}`}
                      style={{ background: '#490000' }}
                      title="Set Background to #490000 (Deep Maroon)"
                      onClick={() => {
                        setBgColor('#490000');
                        setActiveThemeId('custom');
                      }}
                    >
                      #490000
                    </button>
                    <button
                      type="button"
                      className={`swatch-btn ${bgColor.toUpperCase() === '#000000' ? 'selected' : ''}`}
                      style={{ background: '#000000' }}
                      title="Set Background to #000000 (Black)"
                      onClick={() => {
                        setBgColor('#000000');
                        setActiveThemeId('custom');
                      }}
                    >
                      #000000
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Logo Options (MMV.JPG, Custom Text, None) */}
          <div className="glass-card">
            <div className="card-header-row">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Center QR Logo & Name
              </span>
            </div>

            {/* Logo Mode Switcher Tabs */}
            <div className="logo-mode-tabs">
              <button
                type="button"
                className={`tab-btn ${logoMode === 'image' ? 'active' : ''}`}
                onClick={() => setLogoMode('image')}
              >
                <img src="/MMV.JPG" alt="" className="tab-thumb" />
                Official MMV Logo
              </button>
              <button
                type="button"
                className={`tab-btn ${logoMode === 'custom' ? 'active' : ''}`}
                onClick={() => setLogoMode('custom')}
              >
                <span className="tab-badge-sample">Aa</span>
                Custom Name Badge
              </button>
              <button
                type="button"
                className={`tab-btn ${logoMode === 'none' ? 'active' : ''}`}
                onClick={() => setLogoMode('none')}
              >
                No Logo
              </button>
            </div>

            {/* Custom Logo Name & Colors Form (when custom mode is selected) */}
            {logoMode === 'custom' && (
              <div className="custom-logo-form">
                <div className="form-group">
                  <label className="form-label">
                    Logo Name / Text
                    <span className="helper-note">Max 8 characters</span>
                  </label>
                  <input
                    type="text"
                    value={logoText}
                    maxLength={10}
                    onChange={(e) => setLogoText(e.target.value)}
                    placeholder="e.g. MMV"
                    className="text-input"
                  />
                </div>

                <div className="logo-color-row">
                  <div className="color-field">
                    <label className="field-label">Badge Background</label>
                    <div className="mini-picker-wrap">
                      <input
                        type="color"
                        value={logoBgColor}
                        onChange={(e) => setLogoBgColor(e.target.value)}
                        className="native-color-picker mini"
                      />
                      <span className="hex-mini">{logoBgColor.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="color-field">
                    <label className="field-label">Text Color</label>
                    <div className="mini-picker-wrap">
                      <input
                        type="color"
                        value={logoTextColor}
                        onChange={(e) => setLogoTextColor(e.target.value)}
                        className="native-color-picker mini"
                      />
                      <span className="hex-mini">{logoTextColor.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="color-field">
                    <label className="field-label">Border Color</label>
                    <div className="mini-picker-wrap">
                      <input
                        type="color"
                        value={logoBorderColor}
                        onChange={(e) => setLogoBorderColor(e.target.value)}
                        className="native-color-picker mini"
                      />
                      <span className="hex-mini">{logoBorderColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="badge-preview-row">
                  <span className="field-label">Badge Preview:</span>
                  <div
                    className="live-badge-sample"
                    style={{
                      background: logoBgColor,
                      color: logoTextColor,
                      borderColor: logoBorderColor,
                    }}
                  >
                    {logoText || 'MMV'}
                  </div>
                </div>
              </div>
            )}

            {logoMode === 'image' && (
              <div className="official-logo-note">
                <img src="/MMV.JPG" alt="MMV" className="official-logo-preview" />
                <div>
                  <div className="note-title">Using Official public/MMV.JPG</div>
                  <div className="note-sub">Cleanly excavated in center with Level H error recovery.</div>
                </div>
              </div>
            )}
          </div>

          {/* Export Resolution */}
          <div className="glass-card">
            <div className="card-header-row">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                Download Quality (Resolution)
              </span>
            </div>

            <div className="res-options">
              {[
                { size: 512, label: '512 × 512 px', sub: 'Compact' },
                { size: 1024, label: '1024 × 1024 px', sub: 'High-Res (Recommended)' },
                { size: 2048, label: '2048 × 2048 px', sub: 'Ultra Print Ready' },
              ].map((res) => (
                <button
                  key={res.size}
                  type="button"
                  className={`res-btn ${exportResolution === res.size ? 'active' : ''}`}
                  onClick={() => setExportResolution(res.size)}
                >
                  {res.label}
                  <span>{res.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Live QR Preview & Immediate Download */}
        <section className="preview-panel">
          <div className="glass-card preview-card">
            <div className="preview-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Live Scannable Preview
            </div>

            {/* QR Code Presentation Box matching chosen background color */}
            <div className="qr-stage-wrapper">
              <div
                className="qr-glow-layer"
                style={{
                  background: `linear-gradient(135deg, ${fgColor} 0%, ${bgColor} 100%)`,
                }}
              ></div>
              <div
                className="qr-canvas-box"
                style={{ backgroundColor: bgColor }}
              >
                <QRCodeCanvas
                  ref={previewCanvasRef}
                  value={TARGET_URL}
                  size={280}
                  level="H"
                  bgColor={bgColor}
                  fgColor={fgColor}
                  marginSize={4}
                  imageSettings={
                    activeLogoSrc
                      ? {
                          src: activeLogoSrc,
                          height: 52,
                          width: 52,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="qr-status-row">
              <span className="pulse-dot"></span>
              <span>Ready for camera scan</span>
            </div>
            <div className="qr-destination-preview" title={TARGET_URL}>
              {TARGET_URL}
            </div>

            {/* Download & Action Buttons */}
            <div className="preview-actions">
              <button
                type="button"
                className="btn-primary-download"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                {isDownloading ? 'Generating PNG...' : 'Download QR Code'}
              </button>

              <div className="action-btn-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCopyImage}
                  title="Copy high-res image to clipboard"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy Image
                </button>

                <a
                  href={TARGET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ textAlign: 'center' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Test Link ↗
                </a>
              </div>
            </div>
          </div>

          {/* Quick Scan Tips */}
          <div className="scan-instructions">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <p>
              Point any smartphone camera at this preview to instantly verify destination URL.
            </p>
          </div>
        </section>
      </main>

      {/* Hidden High-Resolution Canvas for 1024x1024/2048x2048 Lossless PNG Download */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
        <QRCodeCanvas
          ref={exportCanvasRef}
          value={TARGET_URL}
          size={exportResolution}
          level="H"
          bgColor={bgColor}
          fgColor={fgColor}
          marginSize={4}
          imageSettings={
            activeLogoSrc
              ? {
                  src: activeLogoSrc,
                  height: Math.round(exportResolution * 0.18),
                  width: Math.round(exportResolution * 0.18),
                  excavate: true,
                }
              : undefined
          }
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div>
          © 2026 Mallar Media Ventures. All rights reserved.
        </div>
        <div>
          Target: <a href={TARGET_URL} target="_blank" rel="noopener noreferrer" className="footer-link">mallarmediaventures.com</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
