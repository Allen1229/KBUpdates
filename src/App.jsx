import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Send, Settings, Check, Loader2, Image as ImageIcon, Trash2, Database, MessageSquare, Gamepad2, Link, LogIn, User, Key } from 'lucide-react';


export default function App() {
  const [gasUrlQa, setGasUrlQa] = useState('');
  const [gasUrlGame, setGasUrlGame] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const [activeTab, setActiveTab] = useState('qa'); // 'qa' 或 'game'
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

  const theme = activeTab === 'qa' ? {
    text: 'text-indigo-600', textLight: 'text-indigo-500', bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-700', bgLightHover: 'hover:bg-indigo-50', borderHover: 'hover:border-indigo-400',
    ring: 'focus:ring-indigo-500', disabledBg: 'disabled:bg-indigo-400'
  } : {
    text: 'text-amber-600', textLight: 'text-amber-500', bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-700', bgLightHover: 'hover:bg-amber-50', borderHover: 'hover:border-amber-400',
    ring: 'focus:ring-amber-500', disabledBg: 'disabled:bg-amber-400'
  };

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

      // 使用我們剛建立的 Cloudflare Pages Function 中轉站 (相對路徑即可)
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${theme.text} transition-colors duration-300`}>
              <Database className="w-6 h-6" /> 金銀島知識庫更新小幫手
            </h1>
            <p className="text-slate-500 text-sm mt-1">上傳截圖或貼上文字，AI 自動解析並歸檔至 Google Sheet</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200`}
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fade-in space-y-8 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${theme.bg}`}></div>
            
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700 mb-6">
              <Database className="w-6 h-6 text-emerald-500" /> Google Sheet 資料庫設定
            </h2>
            
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. 「問題總攬」 API URL</label>
                <input 
                  type="text" value={gasUrlQa} onChange={(e) => setGasUrlQa(e.target.value)}
                  placeholder="貼上 Web App URL..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. 「遊戲資訊」 API URL</label>
                <input 
                  type="text" value={gasUrlGame} onChange={(e) => setGasUrlGame(e.target.value)}
                  placeholder="貼上 Web App URL..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition-shadow"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              className={`w-full py-4 ${theme.bg} text-white rounded-xl ${theme.bgHover} transition-all font-bold shadow-lg shadow-indigo-100 uppercase tracking-widest text-sm`}
            >
              儲存並套用設定
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200/50">
          <button
            onClick={() => handleTabChange('qa')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'qa' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-5 h-5" /> 問題總攬 {qaCount !== null ? `(${qaCount})` : ''}
          </button>
          <button
            onClick={() => handleTabChange('game')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'game' ? 'bg-white text-amber-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Gamepad2 className="w-5 h-5" /> 遊戲資訊 {gameCount !== null ? `(${gameCount})` : ''}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Input Panel */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6 sticky top-6">
            <h2 className="text-xl font-bold flex items-center gap-2 pb-4 border-b">
              <Upload className={`w-6 h-6 ${theme.textLight}`} /> 1. 提供資料來源
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-3 ml-1">貼上對話或遊戲文字</label>
                <textarea 
                  value={inputText} onChange={(e) => setInputText(e.target.value)} onPaste={handlePaste}
                  placeholder="在此貼上文字，或 Ctrl+V 貼上截圖..."
                  className={`w-full min-h-[10rem] px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 ${theme.ring.replace('ring-', 'ring-')}/10 focus:border-${theme.text.split('-')[1]}-400 resize-none transition-all placeholder:text-slate-400`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-3 ml-1 flex justify-between items-center">
                  或上傳截圖
                  {imageBase64 && <span className="text-emerald-500 flex items-center gap-1 text-xs font-medium"><Check className="w-3.5 h-3.5" /> 已載入</span>}
                </label>
                <div className="relative group">
                  <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-${theme.text.split('-')[1]}-300 transition-all overflow-hidden`}>
                    {imageBase64 ? (
                      <img src={imageBase64} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm font-medium">點擊或拖曳圖片</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  {imageBase64 && (
                    <button 
                      onClick={(e) => { e.preventDefault(); clearInput(); }}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={processWithAI}
              disabled={isProcessing || (!inputText && !imageBase64)}
              className={`w-full py-4 ${theme.bg} text-white rounded-2xl ${theme.bgHover} transition-all font-bold flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none shadow-lg shadow-indigo-100`}
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
              {isProcessing ? 'AI 分析中...' : '開始萃取資訊'}
            </button>
          </div>

          {/* Result Panel */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
            <h2 className="text-xl font-bold flex items-center gap-2 pb-4 border-b mb-6">
              <Check className={`w-6 h-6 ${theme.textLight}`} /> 2. 確認與修改
            </h2>
            
            {hasExtracted ? (
              <div className="space-y-5 flex-1 flex flex-col">
                {activeTab === 'qa' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600 ml-1">問題 (Question)</label>
                      <textarea 
                        value={extractedQA.question} onChange={(e) => setExtractedQA({...extractedQA, question: e.target.value})}
                        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${theme.ring} outline-none transition-all`}
                        rows="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600 ml-1">答案 (Answer)</label>
                      <textarea 
                        value={extractedQA.answer} onChange={(e) => setExtractedQA({...extractedQA, answer: e.target.value})}
                        className={`w-full min-h-[12rem] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${theme.ring} outline-none resize-none transition-all`}
                      />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 ml-1">來源 (Source)</label>
                        <input 
                          type="text" value={extractedQA.source} onChange={(e) => setExtractedQA({...extractedQA, source: e.target.value})}
                          className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${theme.ring} outline-none transition-all`}
                        />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">遊戲ID</label>
                      <input type="text" value={extractedGame.gameId} onChange={(e) => setExtractedGame({...extractedGame, gameId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">英文縮寫</label>
                      <input type="text" value={extractedGame.abbreviation} onChange={(e) => setExtractedGame({...extractedGame, abbreviation: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">遊戲名稱 (繁體)</label>
                      <input type="text" value={extractedGame.nameTw} onChange={(e) => setExtractedGame({...extractedGame, nameTw: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">名稱 (簡體)</label>
                      <input type="text" value={extractedGame.nameCn} onChange={(e) => setExtractedGame({...extractedGame, nameCn: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">名稱 (英文)</label>
                      <input type="text" value={extractedGame.nameEn} onChange={(e) => setExtractedGame({...extractedGame, nameEn: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">歷程文字</label>
                      <input type="text" value={extractedGame.historyText} onChange={(e) => setExtractedGame({...extractedGame, historyText: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">歷程網址 <Link className="w-2.5 h-2.5" /></label>
                      <input type="text" value={extractedGame.historyUrl} onChange={(e) => setExtractedGame({...extractedGame, historyUrl: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">說明文字</label>
                      <input type="text" value={extractedGame.manualText} onChange={(e) => setExtractedGame({...extractedGame, manualText: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">說明網址 <Link className="w-2.5 h-2.5" /></label>
                      <input type="text" value={extractedGame.manualUrl} onChange={(e) => setExtractedGame({...extractedGame, manualUrl: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">備註</label>
                      <input type="text" value={extractedGame.notes} onChange={(e) => setExtractedGame({...extractedGame, notes: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-amber-500 outline-none" />
                    </div>
                  </div>
                )}

                <div className="pt-6 mt-auto space-y-4">
                  <div className="flex gap-4">
                    <button 
                      onClick={clearInput} disabled={isSaving}
                      className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all font-bold disabled:opacity-50"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={saveToGoogleSheet} disabled={isSaving}
                      className={`flex-1 py-4 ${theme.bg} text-white rounded-2xl ${theme.bgHover} transition-all font-bold flex items-center justify-center gap-3 shadow-lg ${theme.disabledBg}`}
                    >
                      {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                      累積至「{activeTab === 'qa' ? '問題總攬' : '遊戲資訊'}」
                    </button>
                  </div>

                  {saveStatus === 'success' && (
                     <div className={`p-4 ${theme.bgLightHover} ${theme.text} rounded-2xl border border-${theme.text.split('-')[1]}-100 flex items-center justify-center gap-2 font-bold animate-fade-in`}>
                       <Check className="w-5 h-5"/> 寫入成功！
                     </div>
                  )}
                  {saveStatus === 'error' && (
                     <div className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100 flex items-center justify-center gap-2 font-bold animate-fade-in">
                       儲存失敗，請檢查網路或 GAS 設定。
                     </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-12 h-12 opacity-30" />
                </div>
                <p className="font-bold text-lg text-slate-400">等待 AI 分析結果</p>
                <p className="text-sm mt-1 text-slate-400">請在左側提供資料並開始萃取</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
