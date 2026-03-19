import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Send, Settings, Check, Loader2, Image as ImageIcon, Trash2, Database, MessageSquare, Gamepad2, Link } from 'lucide-react';

export default function App() {
  const [gasUrlQa, setGasUrlQa] = useState('');
  const [gasUrlGame, setGasUrlGame] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const [activeTab, setActiveTab] = useState('qa');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const fileInputRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  
  const [qaCount, setQaCount] = useState(null);
  const [gameCount, setGameCount] = useState(null);

  const [extractedQA, setExtractedQA] = useState({ question: '', answer: '', source: '' });
  const [extractedGame, setExtractedGame] = useState({
    gameId: '', nameTw: '', nameCn: '', nameEn: '', abbreviation: '',
    historyText: '', historyUrl: '', manualText: '', manualUrl: '', notes: ''
  });

  const [hasExtracted, setHasExtracted] = useState(false);

  useEffect(() => {
    const savedUrlQa = localStorage.getItem('gasUrlQa');
    const savedUrlGame = localStorage.getItem('gasUrlGame');
    if (savedUrlQa) setGasUrlQa(savedUrlQa);
    if (savedUrlGame) setGasUrlGame(savedUrlGame);
    if (!savedUrlQa || !savedUrlGame) setShowSettings(true);
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [gasUrlQa, gasUrlGame]);

  const fetchCounts = () => {
    if (gasUrlQa) {
      fetch(gasUrlQa)
        .then(res => res.json())
        .then(data => { if (data.status === 'success') setQaCount(data.count); })
        .catch(err => console.error("取得問題數量失敗:", err));
    }
    if (gasUrlGame) {
      fetch(gasUrlGame)
        .then(res => res.json())
        .then(data => { if (data.status === 'success') setGameCount(data.count); })
        .catch(err => console.error("取得遊戲數量失敗:", err));
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('gasUrlQa', gasUrlQa);
    localStorage.setItem('gasUrlGame', gasUrlGame);
    setShowSettings(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => setImageBase64(reader.result);
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const clearInput = () => {
    setInputText(''); setImageFile(null); setImageBase64(''); setHasExtracted(false); setSaveStatus(null);
    setExtractedQA({ question: '', answer: '', source: '' });
    setExtractedGame({ gameId: '', nameTw: '', nameCn: '', nameEn: '', abbreviation: '', historyText: '', historyUrl: '', manualText: '', manualUrl: '', notes: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTabChange = (tab) => {
    if (tab !== activeTab) { setActiveTab(tab); clearInput(); }
  };

  const processWithAI = async () => {
    if (!inputText && !imageBase64) { alert('請輸入文字或上傳截圖'); return; }

    setIsProcessing(true);
    setSaveStatus(null);

    try {
      const parts = [];
      let promptText = "";
      let responseSchema = {};

      if (activeTab === 'qa') {
        promptText = `請分析這段文字或圖片，提取：1.問題 (question) 2.答案 (answer) 3.來源 (source，若無填'未提供')`;
        responseSchema = {
          type: "OBJECT",
          properties: { question: { type: "STRING" }, answer: { type: "STRING" }, source: { type: "STRING" } },
          required: ["question", "answer", "source"]
        };
      } else {
        promptText = `請分析提取遊戲資訊：gameId, nameTw, nameCn, nameEn, abbreviation, historyText, historyUrl, manualText, manualUrl, notes。規則：缺少的中文名稱請進行繁簡互換，英文請由中文翻譯補上。`;
        responseSchema = {
          type: "OBJECT",
          properties: {
            gameId: { type: "STRING" }, nameTw: { type: "STRING" }, nameCn: { type: "STRING" }, nameEn: { type: "STRING" },
            abbreviation: { type: "STRING" }, historyText: { type: "STRING" }, historyUrl: { type: "STRING" },
            manualText: { type: "STRING" }, manualUrl: { type: "STRING" }, notes: { type: "STRING" }
          },
          required: ["gameId", "nameTw", "nameCn", "nameEn", "abbreviation", "historyText", "historyUrl", "manualText", "manualUrl", "notes"]
        };
      }
      
      parts.push({ text: promptText });
      if (inputText) parts.push({ text: `使用者提供的文字內容：\n${inputText}` });
      if (imageBase64) {
        const base64Data = imageBase64.split(',')[1];
        const mimeType = imageBase64.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0];
        parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
      }

      const url = `/proxy`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema }
        })
      });

      const result = await response.json();
      if (result.candidates && result.candidates[0].content.parts[0].text) {
        const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
        if (activeTab === 'qa') setExtractedQA(jsonResponse);
        else setExtractedGame({ ...extractedGame, ...jsonResponse });
        setHasExtracted(true);
      } else {
        throw new Error(result.error?.message || "無法解析回傳結果");
      }
    } catch (error) {
      console.error("AI 處理錯誤:", error);
      alert("AI 處理過程中發生錯誤: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToGoogleSheet = async () => {
    const targetUrl = activeTab === 'qa' ? gasUrlQa : gasUrlGame;
    if (!targetUrl) { alert(`請先設定 GAS URL！`); setShowSettings(true); return; }

    setIsSaving(true);
    setSaveStatus(null);

    const payloadData = activeTab === 'qa' ? extractedQA : {
      ...extractedGame,
      historyLink: extractedGame.historyUrl ? `=HYPERLINK("${extractedGame.historyUrl}", "${extractedGame.historyText || '歷程連結'}")` : extractedGame.historyText,
      manualLink: extractedGame.manualUrl ? `=HYPERLINK("${extractedGame.manualUrl}", "${extractedGame.manualText || '說明頁連結'}")` : extractedGame.manualText,
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: activeTab, data: payloadData })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setSaveStatus('success');
        if (activeTab === 'qa') setQaCount(prev => prev !== null ? prev + 1 : 1);
        if (activeTab === 'game') setGameCount(prev => prev !== null ? prev + 1 : 1);
        setTimeout(() => clearInput(), 2000);
      } else throw new Error(result.message);
    } catch (error) {
      console.error("儲存失敗:", error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* 背景效果 */}
      <div className="stars-bg"></div>
      <div className="grid-overlay"></div>

      {/* 導覽列 */}
      <header className="glass-header">
        <a href="https://alnx-dashboard.pages.dev/" className="logo-link">
          <span className="logo-text">ALN-<span className="accent">X</span></span>
        </a>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="app-container">
        {/* 頁面標題 */}
        <section className="page-hero">
          <h1>KB 知識庫更新小幫手</h1>
          <p>上傳截圖或貼上文字，AI 自動解析並歸檔至 Google Sheet</p>
        </section>

        {/* 設定面板 */}
        {showSettings && (
          <div className="settings-panel">
            <h2>
              <Database size={18} style={{ color: 'var(--accent-primary)' }} />
              GOOGLE SHEET 資料庫設定
            </h2>
            <div className="settings-group space-y-md">
              <div>
                <label className="field-label">1. 「問題總攬」 API URL</label>
                <input
                  type="text" value={gasUrlQa} onChange={(e) => setGasUrlQa(e.target.value)}
                  placeholder="貼上 Web App URL..."
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">2. 「遊戲資訊」 API URL</label>
                <input
                  type="text" value={gasUrlGame} onChange={(e) => setGasUrlGame(e.target.value)}
                  placeholder="貼上 Web App URL..."
                  className="field-input"
                />
              </div>
            </div>
            <button onClick={handleSaveSettings} className="btn-settings-save">
              儲存並套用設定
            </button>
          </div>
        )}

        {/* 分類 Tabs */}
        <div className="tab-bar">
          <button
            onClick={() => handleTabChange('qa')}
            className={`tab-btn ${activeTab === 'qa' ? 'active-qa' : ''}`}
          >
            <MessageSquare size={18} />
            問題總攬
            {qaCount !== null && <span className="tab-count">({qaCount})</span>}
          </button>
          <button
            onClick={() => handleTabChange('game')}
            className={`tab-btn ${activeTab === 'game' ? 'active-game' : ''}`}
          >
            <Gamepad2 size={18} />
            遊戲資訊
            {gameCount !== null && <span className="tab-count">({gameCount})</span>}
          </button>
        </div>

        {/* 兩欄主體 */}
        <div className="two-col">
          {/* 左側：輸入面板 */}
          <div className="glass-panel">
            <h2 className="panel-title">
              <Upload size={18} className="icon" />
              <span className="step-num">STEP 1</span>
              提供資料來源
            </h2>

            <div className="input-section space-y-lg">
              <div>
                <label>貼上對話或遊戲文字</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="在此貼上文字，或 Ctrl+V 貼上截圖..."
                  className="text-input"
                />
              </div>

              <div>
                <div className="upload-label-row">
                  <label style={{ marginBottom: 0 }}>或上傳截圖</label>
                  {imageBase64 && (
                    <span className="upload-loaded">
                      <Check size={14} /> 已載入
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative', marginTop: '8px' }}>
                  <label className="upload-area">
                    {imageBase64 ? (
                      <img src={imageBase64} alt="Preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <ImageIcon />
                        <p>點擊或拖曳圖片</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  {imageBase64 && (
                    <button
                      onClick={(e) => { e.preventDefault(); clearInput(); }}
                      className="btn-delete-image"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={processWithAI}
                disabled={isProcessing || (!inputText && !imageBase64)}
                className="btn-primary"
              >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                {isProcessing ? 'AI 分析中...' : '開始萃取資訊'}
              </button>
            </div>
          </div>

          {/* 右側：結果面板 */}
          <div className="glass-panel result-panel">
            <h2 className="panel-title">
              <Check size={18} className="icon" />
              <span className="step-num">STEP 2</span>
              確認與修改
            </h2>

            {hasExtracted ? (
              <div className="result-fields">
                {activeTab === 'qa' ? (
                  <div className="space-y-md">
                    <div className="result-field">
                      <label>問題 (QUESTION)</label>
                      <textarea
                        value={extractedQA.question}
                        onChange={(e) => setExtractedQA({...extractedQA, question: e.target.value})}
                        className="result-input"
                        rows="2"
                      />
                    </div>
                    <div className="result-field">
                      <label>答案 (ANSWER)</label>
                      <textarea
                        value={extractedQA.answer}
                        onChange={(e) => setExtractedQA({...extractedQA, answer: e.target.value})}
                        className="result-input answer-field"
                      />
                    </div>
                    <div className="result-field">
                      <label>來源 (SOURCE)</label>
                      <input
                        type="text"
                        value={extractedQA.source}
                        onChange={(e) => setExtractedQA({...extractedQA, source: e.target.value})}
                        className="result-input"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="game-fields-grid">
                    <div className="result-field">
                      <label>遊戲 ID</label>
                      <input type="text" value={extractedGame.gameId} onChange={(e) => setExtractedGame({...extractedGame, gameId: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field">
                      <label>英文縮寫</label>
                      <input type="text" value={extractedGame.abbreviation} onChange={(e) => setExtractedGame({...extractedGame, abbreviation: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field full-width">
                      <label>遊戲名稱 (繁體)</label>
                      <input type="text" value={extractedGame.nameTw} onChange={(e) => setExtractedGame({...extractedGame, nameTw: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field">
                      <label>名稱 (簡體)</label>
                      <input type="text" value={extractedGame.nameCn} onChange={(e) => setExtractedGame({...extractedGame, nameCn: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field">
                      <label>名稱 (英文)</label>
                      <input type="text" value={extractedGame.nameEn} onChange={(e) => setExtractedGame({...extractedGame, nameEn: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field">
                      <label>歷程文字</label>
                      <input type="text" value={extractedGame.historyText} onChange={(e) => setExtractedGame({...extractedGame, historyText: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field">
                      <label>歷程網址 <Link size={10} className="link-icon" /></label>
                      <input type="text" value={extractedGame.historyUrl} onChange={(e) => setExtractedGame({...extractedGame, historyUrl: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field">
                      <label>說明文字</label>
                      <input type="text" value={extractedGame.manualText} onChange={(e) => setExtractedGame({...extractedGame, manualText: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field">
                      <label>說明網址 <Link size={10} className="link-icon" /></label>
                      <input type="text" value={extractedGame.manualUrl} onChange={(e) => setExtractedGame({...extractedGame, manualUrl: e.target.value})} className="result-input" />
                    </div>
                    <div className="result-field full-width">
                      <label>備註</label>
                      <input type="text" value={extractedGame.notes} onChange={(e) => setExtractedGame({...extractedGame, notes: e.target.value})} className="result-input" />
                    </div>
                  </div>
                )}

                <div className="action-row">
                  <button onClick={clearInput} disabled={isSaving} className="btn-clear">
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={saveToGoogleSheet}
                    disabled={isSaving}
                    className="btn-primary btn-save"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    累積至「{activeTab === 'qa' ? '問題總攬' : '遊戲資訊'}」
                  </button>
                </div>

                {saveStatus === 'success' && (
                  <div className="status-msg success">
                    <Check size={18} /> 寫入成功！
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="status-msg error">
                    儲存失敗，請檢查網路或 GAS 設定。
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <FileText />
                </div>
                <p className="empty-title">等待 AI 分析結果</p>
                <p className="empty-sub">請在左側提供資料並開始萃取</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="glass-footer">
        <p>&copy; 2026 ALN-X Ecosystem. Powered by Advanced Agentic Coding.</p>
      </footer>
    </>
  );
}
