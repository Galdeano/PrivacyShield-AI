import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  Sparkles, 
  Undo2, 
  Globe2, 
  FileText, 
  AlertCircle,
  RotateCcw,
  Edit2,
  CheckCircle2,
  XCircle,
  Scissors,
  Settings,
  CreditCard,
  Building,
  User,
  MapPin,
  Mail,
  X,
  Download,
  Languages,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { translations } from './i18n';

const API_BASE = 'http://127.0.0.1:8765';

const LANG_LABELS = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
};

const FLAG_EMOJIS = {
  en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', es: '🇪🇸', it: '🇮🇹',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('anonymize');
  
  // Internationalization & NLP language
  const [guiLang, setGuiLang] = useState('fr');
  const [nlpLang, setNlpLang] = useState('fr');
  const t = translations[guiLang] || translations.en;

  // NLP model management (v1.3)
  const [availableModels, setAvailableModels] = useState([]);
  const [installingLang, setInstallingLang] = useState(null); // lang code being downloaded
  const [installMessage, setInstallMessage] = useState(null); // { type: 'success'|'error', text }

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/models`);
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data.models || []);
      }
    } catch (e) {}
  }, []);

  const handleInstallModel = async (langCode) => {
    setInstallingLang(langCode);
    setInstallMessage(null);
    try {
      const res = await fetch(`${API_BASE}/models/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: langCode })
      });
      if (res.ok) {
        await fetchModels();
        setInstallMessage({ type: 'success', text: t.modelInstallSuccess });
      } else {
        setInstallMessage({ type: 'error', text: t.modelInstallError });
      }
    } catch (e) {
      setInstallMessage({ type: 'error', text: t.modelInstallError });
    } finally {
      setInstallingLang(null);
    }
  };

  // Active categories in settings
  const [activeCategories, setActiveCategories] = useState([
    'identity',
    'organization',
    'address',
    'contact',
    'finance'
  ]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [inputText, setInputText] = useState('');
  const [anonymizedText, setAnonymizedText] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [restoredText, setRestoredText] = useState('');
  const [restoredItems, setRestoredItems] = useState([]);

  // Session entity mappings: array of { id, text, entity_type, placeholder, active }
  const [entities, setEntities] = useState([]);
  
  // Hovered entity text for Highlight Sync in input textarea
  const [hoveredEntityText, setHoveredEntityText] = useState(null);

  // Custom entity input
  const [manualText, setManualText] = useState('');
  const [manualType, setManualType] = useState('CUSTOM');

  // Inline Editing State for entity boundaries in mapping table
  const [editingEntityId, setEditingEntityId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');

  // Floating Context Menu state for text selection
  const [selectedText, setSelectedText] = useState('');
  const [contextMenuPos, setContextMenuPos] = useState(null);
  
  const textareaRef = useRef(null);
  const backdropRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [copiedState, setCopiedState] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Sync scroll between textarea and underlying highlight backdrop
  const handleScroll = (e) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.target.scrollTop;
      backdropRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Check backend health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
          setEngineReady(true);
          fetchModels();
        }
      } catch (e) {
        setEngineReady(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  // Handle text selection in input textarea
  const handleSelectText = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = textarea.value.substring(start, end).trim();

    if (sel && sel.length > 1) {
      setSelectedText(sel);
      const rect = textarea.getBoundingClientRect();
      setContextMenuPos({
        x: Math.min(rect.right - 220, Math.max(rect.left + 20, (e.clientX || rect.left + 150))),
        y: Math.max(rect.top, (e.clientY || rect.top + 60) - 45)
      });
    } else {
      setContextMenuPos(null);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('#selection-context-menu')) {
        setContextMenuPos(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const handleAddSelectionAsEntity = (entityType) => {
    if (!selectedText) return;
    const count = entities.filter(item => item.entity_type === entityType).length + 1;
    const newEnt = {
      id: `manual_sel_${Date.now()}`,
      text: selectedText,
      entity_type: entityType,
      placeholder: `[${entityType}_${count}]`,
      active: true,
      score: 1.0
    };
    setEntities(prev => {
      const filtered = prev.filter(e => e.text.toLowerCase() !== selectedText.toLowerCase());
      return [...filtered, newEnt];
    });
    setStatusMessage(`+ "${selectedText}" [${entityType}_${count}]`);
    setContextMenuPos(null);
    setSelectedText('');
  };

  // Analyze text for entities
  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setStatusMessage('Analyzing text with local NLP engine...');
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText, 
          language: nlpLang,
          categories: activeCategories
        })
      });
      const data = await res.json();
      if (data.entities) {
        const existingTexts = new Set(entities.map(e => e.text.toLowerCase()));
        const newEntities = data.entities.map(e => ({
          ...e,
          active: true
        })).filter(e => !existingTexts.has(e.text.toLowerCase()));

        setEntities(prev => [...prev, ...newEntities]);
        setStatusMessage(`Detected ${data.entities.length} item(s). Review table.`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Error connecting to local NLP engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveMappings = () => {
    const map = {};
    entities.forEach(e => {
      if (e.active && e.text.trim()) {
        map[e.text.trim()] = e.placeholder.trim();
      }
    });
    return map;
  };

  const handleAnonymize = async () => {
    if (!inputText.trim()) return;
    const mappings = getActiveMappings();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/anonymize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, mappings })
      });
      const data = await res.json();
      if (data.anonymized_text) {
        setAnonymizedText(data.anonymized_text);
        setStatusMessage('Text successfully anonymized! Ready to copy.');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to anonymize text.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeanonymize = async () => {
    if (!aiResponseText.trim()) return;
    const mappings = getActiveMappings();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/deanonymize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiResponseText, mappings })
      });
      const data = await res.json();
      if (data.restored_text !== undefined) {
        setRestoredText(data.restored_text);
        setRestoredItems(data.restored_items || []);
        setStatusMessage(`Restored ${data.restored_items?.length || 0} sensitive token(s)!`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to restore values.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedState(type);
    setTimeout(() => setCopiedState(null), 2000);
  };

  const toggleEntityActive = (id) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const removeEntity = (id) => {
    setEntities(prev => prev.filter(e => e.id !== id));
  };

  const updatePlaceholder = (id, newPl) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, placeholder: newPl } : e));
  };

  const startEditingEntity = (entity) => {
    setEditingEntityId(entity.id);
    setEditingTextValue(entity.text);
  };

  const saveEditingEntity = (id) => {
    if (!editingTextValue.trim()) return;
    setEntities(prev => prev.map(e => e.id === id ? { ...e, text: editingTextValue.trim() } : e));
    setEditingEntityId(null);
    setStatusMessage('Entity text boundary updated.');
  };

  const cancelEditingEntity = () => {
    setEditingEntityId(null);
    setEditingTextValue('');
  };

  const quickTrimPrefix = (id) => {
    setEntities(prev => prev.map(e => {
      if (e.id === id) {
        const cleaned = e.text.replace(/^(?:M\.|Mme|Mlle|Mr\.|Mr|Mrs\.|Mrs|Ms\.|Dr\.|Monsieur|Madame|Docteur)\s+/i, '');
        return { ...e, text: cleaned };
      }
      return e;
    }));
    setStatusMessage('Trimmed honorific prefix.');
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    const prefix = manualType;
    const count = entities.filter(item => item.entity_type === prefix).length + 1;
    const newEnt = {
      id: `manual_${Date.now()}`,
      text: manualText.trim(),
      entity_type: prefix,
      placeholder: `[${prefix}_${count}]`,
      active: true,
      score: 1.0
    };
    setEntities(prev => [...prev, newEnt]);
    setManualText('');
  };

  const handleClearSession = () => {
    setEntities([]);
    setInputText('');
    setAnonymizedText('');
    setAiResponseText('');
    setRestoredText('');
    setRestoredItems([]);
    setHoveredEntityText(null);
    setStatusMessage('Active session cleared.');
  };

  const toggleCategory = (cat) => {
    setActiveCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'PERSON': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ORGANIZATION':
      case 'COMPANY': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ADDRESS':
      case 'LOCATION': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'EMAIL_ADDRESS':
      case 'EMAIL': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'PHONE_NUMBER':
      case 'PHONE': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'SIRET':
      case 'IBAN_CODE':
      case 'CREDIT_CARD':
      case 'NIR':
      case 'VAT_ID': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Helper to render text with highlighted entity spans in the backdrop
  const renderHighlightedBackdrop = () => {
    if (!inputText) return null;
    if (!hoveredEntityText) {
      return <span>{inputText}</span>;
    }

    // Escape regex characters from hoveredEntityText
    const escaped = hoveredEntityText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = inputText.split(regex);

    return parts.map((part, i) => {
      if (part.toLowerCase() === hoveredEntityText.toLowerCase()) {
        return (
          <mark 
            key={i} 
            className="bg-cyan-500/35 text-transparent rounded px-0.5 border border-cyan-400 animate-pulse shadow-sm shadow-cyan-500/50">
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 select-text relative">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              {t.appTitle}
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">v1.2</span>
            </h1>
            <p className="text-xs text-slate-400">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Engine Status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${engineReady ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-medium">
              {engineReady ? t.engineActive : t.engineConnecting}
            </span>
          </div>

          {/* Quick GUI Language Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <Globe2 className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <button 
              onClick={() => { setGuiLang('fr'); setNlpLang('fr'); }} 
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${guiLang === 'fr' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              FR
            </button>
            <button 
              onClick={() => { setGuiLang('en'); setNlpLang('en'); }} 
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${guiLang === 'en' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              EN
            </button>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => { setIsSettingsOpen(true); fetchModels(); }}
            title="Settings & Categories"
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition cursor-pointer">
            <Settings className="w-4 h-4" />
          </button>

          {/* Clear Session */}
          <button 
            onClick={handleClearSession}
            title="Reset active substitutions and clear text"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-rose-400 transition text-xs font-medium cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" />
            {t.newSession}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Steps & Workflows */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex gap-2 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl max-w-md">
            <button
              onClick={() => setActiveTab('anonymize')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeTab === 'anonymize' 
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              <ShieldCheck className="w-4 h-4" />
              {t.tabAnonymize}
            </button>
            <button
              onClick={() => setActiveTab('deanonymize')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeTab === 'deanonymize' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              <ArrowRightLeft className="w-4 h-4" />
              {t.tabDeanonymize}
            </button>
          </div>

          {/* TAB 1: ANONYMIZE */}
          {activeTab === 'anonymize' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    {t.originalTextLabel}
                    <span className="text-xs text-slate-500 font-normal">
                      {t.selectionTip}
                    </span>
                  </label>
                  <span className="text-xs text-slate-500">{inputText.length} {t.charCount}</span>
                </div>

                {/* Textarea with synchronized Highlight Backdrop */}
                <div className="relative w-full h-44 rounded-xl border border-slate-800 overflow-hidden bg-slate-900/90 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition">
                  {/* Backdrop layer for synced highlights */}
                  <div
                    ref={backdropRef}
                    aria-hidden="true"
                    className="absolute inset-0 p-3.5 text-sm font-mono whitespace-pre-wrap break-words overflow-y-auto pointer-events-none select-none text-transparent z-0">
                    {renderHighlightedBackdrop()}
                  </div>

                  {/* Foreground editable textarea */}
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onScroll={handleScroll}
                    onMouseUp={handleSelectText}
                    onKeyUp={handleSelectText}
                    placeholder={t.placeholderInput}
                    className="relative z-10 w-full h-full p-3.5 text-sm font-mono text-slate-200 bg-transparent placeholder-slate-600 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={!inputText.trim() || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition cursor-pointer">
                    <Sparkles className="w-4 h-4" />
                    {t.autoDetectBtn}
                  </button>
                  <button
                    onClick={handleAnonymize}
                    disabled={!inputText.trim() || isLoading}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer">
                    <Lock className="w-4 h-4" />
                    {t.anonymizeBtn}
                  </button>
                </div>
              </div>

              {/* Anonymized Output Preview */}
              {anonymizedText && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      {t.anonymizedOutputLabel}
                    </label>
                    <button
                      onClick={() => handleCopy(anonymizedText, 'anon')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold transition cursor-pointer">
                      {copiedState === 'anon' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedState === 'anon' ? t.copied : t.copyAnonymized}
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={anonymizedText}
                      className="w-full h-36 bg-slate-900/60 border border-emerald-900/40 rounded-xl p-3.5 text-sm font-mono text-emerald-300/90 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEANONYMIZE */}
          {activeTab === 'deanonymize' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    {t.aiResponseLabel}
                  </label>
                  <span className="text-xs text-slate-500">{aiResponseText.length} {t.charCount}</span>
                </div>
                <textarea
                  value={aiResponseText}
                  onChange={(e) => setAiResponseText(e.target.value)}
                  placeholder={t.aiResponsePlaceholder}
                  className="w-full h-36 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition"
                />
                <button
                  onClick={handleDeanonymize}
                  disabled={!aiResponseText.trim() || isLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-600/20 transition cursor-pointer">
                  <Undo2 className="w-4 h-4" />
                  {t.restoreBtn}
                </button>
              </div>

              {/* Restored Output */}
              {restoredText && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t.restoredOutputLabel}
                    </label>
                    <button
                      onClick={() => handleCopy(restoredText, 'restored')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 rounded-lg text-xs font-semibold transition cursor-pointer">
                      {copiedState === 'restored' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedState === 'restored' ? t.copied : t.copyRestored}
                    </button>
                  </div>
                  
                  {restoredItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-1">
                      {restoredItems.map((item, idx) => (
                        <span key={idx} className="text-xs px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-1.5">
                          <span className="font-mono text-slate-400">{item.placeholder}</span>
                          <span className="text-slate-500">→</span>
                          <span className="font-semibold text-emerald-200">{item.original}</span>
                          {item.count > 1 && <span className="text-[10px] bg-emerald-900 px-1 rounded text-emerald-400">×{item.count}</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  <textarea
                    readOnly
                    value={restoredText}
                    className="w-full h-44 bg-slate-900/60 border border-cyan-900/40 rounded-xl p-3.5 text-sm font-mono text-cyan-200/90 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Active Mapping Vault */}
        <div className="w-96 border-l border-slate-800 bg-slate-900/40 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                {t.vaultTitle}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {entities.filter(e => e.active).length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">{t.vaultSubtitle}</p>
            </div>
            {entities.length > 0 && (
              <button
                onClick={() => setEntities([])}
                className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
                title="Clear all mappings">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mapping List with Hover Sync */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {entities.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                <AlertCircle className="w-6 h-6 text-slate-600" />
                <p className="text-xs">{t.noEntities}</p>
                <p className="text-[11px] text-slate-600">{t.noEntitiesSub}</p>
              </div>
            ) : (
              entities.map((item) => (
                <div 
                  key={item.id} 
                  onMouseEnter={() => setHoveredEntityText(item.text)}
                  onMouseLeave={() => setHoveredEntityText(null)}
                  className={`p-3 rounded-xl border transition space-y-2 ${
                    hoveredEntityText === item.text 
                      ? 'ring-2 ring-cyan-500 bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : item.active 
                        ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600' 
                        : 'bg-slate-950/40 border-slate-800/40 opacity-50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${getBadgeColor(item.entity_type)}`}>
                      {item.entity_type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.text.match(/^(?:M\.|Mme|Mlle|Mr\.|Mr|Mrs\.|Mrs|Ms\.|Dr\.|Monsieur|Madame|Docteur)\s+/i) && (
                        <button
                          onClick={() => quickTrimPrefix(item.id)}
                          title="Trim honorific prefix"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] flex items-center gap-1 transition cursor-pointer">
                          <Scissors className="w-3 h-3" />
                          {t.trimPrefix}
                        </button>
                      )}

                      <button
                        onClick={() => startEditingEntity(item)}
                        title="Edit entity word boundaries"
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => toggleEntityActive(item.id)}
                        className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                        title={item.active ? 'Exclude from anonymization' : 'Include in anonymization'}
                      />
                      <button
                        onClick={() => removeEntity(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {editingEntityId === item.id ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <input
                          type="text"
                          value={editingTextValue}
                          onChange={(e) => setEditingTextValue(e.target.value)}
                          className="flex-1 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEditingEntity(item.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                          title="Save entity text">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditingEntity}
                          className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                          title="Cancel">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-200 break-words flex items-center justify-between group">
                        <span>{item.text}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                      <span>{t.replacesWith}</span>
                      <input
                        type="text"
                        value={item.placeholder}
                        onChange={(e) => updatePlaceholder(item.id, e.target.value)}
                        className="flex-1 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Manual Entity Form */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/70">
            <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              {t.addCustomTitle}
            </h3>
            <form onSubmit={handleAddManual} className="space-y-2">
              <input
                type="text"
                placeholder={t.textToReplace}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500">
                  <option value="PERSON">PERSON</option>
                  <option value="COMPANY">COMPANY</option>
                  <option value="ADDRESS">ADDRESS</option>
                  <option value="EMAIL">EMAIL</option>
                  <option value="PHONE">PHONE</option>
                  <option value="SIRET">SIRET / SIREN</option>
                  <option value="IBAN">IBAN</option>
                  <option value="NIR">NIR (Secu)</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
                <button
                  type="submit"
                  disabled={!manualText.trim()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer">
                  {t.addBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">{t.settingsTitle}</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Languages */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t.guiLangLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGuiLang('fr')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                      guiLang === 'fr' 
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}>
                    Français (FR)
                  </button>
                  <button
                    onClick={() => setGuiLang('en')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                      guiLang === 'en' 
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}>
                    English (EN)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t.nlpLangLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableModels.filter(m => m.installed).map(model => (
                    <button
                      key={model.code}
                      onClick={() => setNlpLang(model.code)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                        nlpLang === model.code 
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}>
                      <span>{FLAG_EMOJIS[model.code] || '🌐'}</span>
                      {LANG_LABELS[model.code] || model.code.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 block">
                {t.categoriesTitle}
              </label>

              <div className="space-y-2">
                {[
                  { id: 'identity', label: t.catIdentity, icon: User },
                  { id: 'organization', label: t.catOrganization, icon: Building },
                  { id: 'address', label: t.catAddress, icon: MapPin },
                  { id: 'contact', label: t.catContact, icon: Mail },
                  { id: 'finance', label: t.catFinance, icon: CreditCard }
                ].map((item) => {
                  const Icon = item.icon;
                  const isChecked = activeCategories.includes(item.id);
                  return (
                    <label 
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-medium text-slate-200">{item.label}</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(item.id)}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* NLP Language Model Manager (v1.3) */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">{t.nlpModelsTitle}</p>
                  <p className="text-[11px] text-slate-500">{t.nlpModelsSubtitle}</p>
                </div>
              </div>

              {installMessage && (
                <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                  installMessage.type === 'success' 
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}>
                  {installMessage.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {installMessage.text}
                </div>
              )}

              <div className="space-y-2">
                {availableModels.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Loading model list...</p>
                ) : (
                  availableModels.map((model) => (
                    <div key={model.code} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{FLAG_EMOJIS[model.code] || '🌐'}</span>
                        <div>
                          <p className="text-xs font-medium text-slate-200">{LANG_LABELS[model.code] || model.code.toUpperCase()}</p>
                          <p className="text-[10px] font-mono text-slate-500">{model.name}</p>
                        </div>
                      </div>
                      {model.installed ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          {t.modelInstalled}
                        </div>
                      ) : installingLang === model.code ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-[10px] font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {t.modelDownloading}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInstallModel(model.code)}
                          disabled={installingLang !== null}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-300 text-[10px] font-semibold transition cursor-pointer disabled:opacity-40">
                          <Download className="w-3 h-3" />
                          {t.modelDownload}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer">
              {t.saveSettings}
            </button>
          </div>
        </div>
      )}

      {/* Floating Selection Context Menu for Textarea */}
      {contextMenuPos && selectedText && (
        <div 
          id="selection-context-menu"
          style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
          className="fixed z-50 flex items-center gap-1 p-1 bg-slate-900/95 border border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[11px] font-mono text-cyan-300 max-w-[120px] truncate border-r border-slate-800">
            "{selectedText}"
          </div>
          <button 
            onClick={() => handleAddSelectionAsEntity('PERSON')}
            className="px-2 py-1 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium transition cursor-pointer">
            Person
          </button>
          <button 
            onClick={() => handleAddSelectionAsEntity('COMPANY')}
            className="px-2 py-1 hover:bg-amber-600/20 text-amber-400 rounded-lg text-xs font-medium transition cursor-pointer">
            Company
          </button>
          <button 
            onClick={() => handleAddSelectionAsEntity('ADDRESS')}
            className="px-2 py-1 hover:bg-emerald-600/20 text-emerald-400 rounded-lg text-xs font-medium transition cursor-pointer">
            Address
          </button>
          <button 
            onClick={() => handleAddSelectionAsEntity('CUSTOM')}
            className="px-2 py-1 hover:bg-purple-600/20 text-purple-400 rounded-lg text-xs font-medium transition cursor-pointer">
            Custom
          </button>
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="px-6 py-2 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <span>{statusMessage || t.statusReady}</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
          <span>Port: 8765</span>
          <span>NLP: {nlpLang.toUpperCase()}</span>
          <span>GUI: {guiLang.toUpperCase()}</span>
        </div>
      </footer>
    </div>
  );
}
