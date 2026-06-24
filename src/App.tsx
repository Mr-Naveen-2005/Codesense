import React, { useState, useRef, useEffect } from "react";
import { 
  FileCode, 
  UploadCloud, 
  CheckCircle2, 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  Code
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Allowed extensions for code upload
const ALLOWED_EXTENSIONS = [
  ".py", ".js", ".ts", ".java", ".cpp", ".c", ".cs", ".go", ".rb", ".php", ".html", ".css"
];

interface DetectionResult {
  verdict: "AI_GENERATED" | "HUMAN_WRITTEN";
  confidence: number;
  language: string;
  reasoning: string;
  indicators: string[];
}

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<"line" | "function" | "file">("function");
  const [code, setCode] = useState<string>("");
  const [languageHint, setLanguageHint] = useState<string>("Auto Detect");
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Validation & Animation state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shouldShake, setShouldShake] = useState<boolean>(false);
  
  // API analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DetectionResult | null>(null);
  
  // Humanization state
  const [isHumanizing, setIsHumanizing] = useState<boolean>(false);
  const [humanizationError, setHumanizationError] = useState<string | null>(null);
  const [humanizedCode, setHumanizedCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Refs for scroll sync and highlight
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const humanizedCodeRef = useRef<HTMLElement>(null);

  // Calculate lines count for line numbering
  const linesCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(linesCount, 1) }, (_, i) => i + 1);

  // Synchronize scrolling between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Reset form and output state when changing tabs
  const handleTabChange = (tab: "line" | "function" | "file") => {
    setActiveTab(tab);
    setCode("");
    setFileName(null);
    setErrorMsg(null);
    setAnalysisResult(null);
    setHumanizedCode(null);
    setAnalysisError(null);
    setHumanizationError(null);
  };

  // Clear / Reset All
  const handleClear = () => {
    setCode("");
    setFileName(null);
    setErrorMsg(null);
    setAnalysisResult(null);
    setHumanizedCode(null);
    setAnalysisError(null);
    setHumanizationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag & Drop event handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Helper to read and validate uploaded file
  const processUploadedFile = (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    
    // Check extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMsg(`Unsupported file type. Please upload a supported format (${ALLOWED_EXTENSIONS.join(", ")}).`);
      return;
    }

    // Check size limit: 50KB
    if (file.size > 50 * 1024) {
      setErrorMsg("File too large. Max 50KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCode(text);
        setFileName(file.name);
        
        // Auto-detect extension to preset language hint
        const extToLanguage: Record<string, string> = {
          ".py": "Python",
          ".js": "JavaScript",
          ".ts": "TypeScript",
          ".java": "Java",
          ".cpp": "C++",
          ".c": "C++",
          ".cs": "C#",
          ".go": "Go",
          ".rb": "Ruby",
          ".php": "PHP",
          ".html": "HTML",
          ".css": "CSS"
        };
        if (extToLanguage[ext]) {
          setLanguageHint(extToLanguage[ext]);
        }
      }
    };
    reader.readAsText(file);
  };

  // Analyze Code API Trigger
  const handleAnalyze = async () => {
    setErrorMsg(null);
    setAnalysisError(null);
    setAnalysisResult(null);
    setHumanizedCode(null);

    const trimmedCode = code.trim();

    // Guard for empty or short input (< 3 chars)
    if (!trimmedCode || trimmedCode.length < 3) {
      setShouldShake(true);
      setErrorMsg("Please enter some code first.");
      setTimeout(() => setShouldShake(false), 500);
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, languageHint })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze code.");
      }

      const result: DetectionResult = await response.json();
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(err.message || "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Humanization API Trigger
  const handleHumanize = async () => {
    setHumanizationError(null);
    setHumanizedCode(null);
    setIsHumanizing(true);

    try {
      const response = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to humanize code.");
      }

      const data = await response.json();
      setHumanizedCode(data.humanizedCode);
    } catch (err: any) {
      setHumanizationError(err.message || "Failed to convert code.");
    } finally {
      setIsHumanizing(false);
    }
  };

  // Copy Humanized Code
  const handleCopyCode = () => {
    if (humanizedCode) {
      navigator.clipboard.writeText(humanizedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Highlight.js Hook to apply style after render
  useEffect(() => {
    if (humanizedCodeRef.current && (window as any).hljs && humanizedCode) {
      // Clear old syntax classes
      humanizedCodeRef.current.className = "font-mono text-sm";
      (window as any).hljs.highlightElement(humanizedCodeRef.current);
    }
  }, [humanizedCode]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col font-sans antialiased">
      {/* Navbar with brand */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#1A56DB] text-white p-2 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg tracking-tight text-gray-900 leading-none">CodeSense AI</h1>
              <p className="text-[10px] font-mono text-gray-400 mt-0.5 tracking-wider uppercase">Human or AI Classifier</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span className="hidden sm:inline">Engine: Gemini 1.5 Flash</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-sans font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Secure Sandbox
            </span>
          </div>
        </div>
      </header>

      {/* Main app container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* ZONE 1 — LEFT PANEL (Input Side) */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header tab bar with 3 mode tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 select-none">
              <button
                onClick={() => handleTabChange("line")}
                className={`flex-1 py-4 text-center font-sans text-sm font-medium transition-all relative ${
                  activeTab === "line" ? "text-[#1A56DB] font-semibold" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Paste a Line
                {activeTab === "line" && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A56DB]" />
                )}
              </button>
              <button
                onClick={() => handleTabChange("function")}
                className={`flex-1 py-4 text-center font-sans text-sm font-medium transition-all relative ${
                  activeTab === "function" ? "text-[#1A56DB] font-semibold" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Paste a Function
                {activeTab === "function" && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A56DB]" />
                )}
              </button>
              <button
                onClick={() => handleTabChange("file")}
                className={`flex-1 py-4 text-center font-sans text-sm font-medium transition-all relative ${
                  activeTab === "file" ? "text-[#1A56DB] font-semibold" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Upload / Paste File
                {activeTab === "file" && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A56DB]" />
                )}
              </button>
            </div>

            {/* Input area */}
            <div className="p-6 flex flex-col gap-4">
              
              {/* Optional language selector */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="language-hint" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Language Selector</label>
                <select
                  id="language-hint"
                  value={languageHint}
                  onChange={(e) => setLanguageHint(e.target.value)}
                  className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="Auto Detect">Auto Detect</option>
                  <option value="Python">Python</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="Java">Java</option>
                  <option value="C++">C++</option>
                  <option value="Go">Go</option>
                  <option value="PHP">PHP</option>
                </select>
              </div>

              {/* Input editor card with optional shake */}
              <div 
                className={`relative border border-gray-200 rounded-lg overflow-hidden flex flex-col transition-all bg-[#F3F4F6] ${
                  shouldShake ? "animate-shake border-red-500 shadow-md" : "focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
                }`}
              >
                {/* File Upload zone for Tab 3 if no file uploaded */}
                {activeTab === "file" && !fileName ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className={`p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      isDragging ? "bg-blue-50/50 border-2 border-dashed border-blue-500" : "hover:bg-gray-100/70"
                    }`}
                  >
                    <UploadCloud className={`w-12 h-12 mb-4 transition-transform ${isDragging ? "scale-110 text-blue-500" : "text-gray-400"}`} />
                    <span className="text-sm font-semibold text-gray-700">
                      Drag & drop your file here, or <span className="text-blue-600 font-bold underline">browse</span>
                    </span>
                    <span className="text-xs text-gray-500 mt-2 max-w-sm">
                      Supports python, javascript, typescript, java, cpp, go, ruby, php, html, css (max 50KB)
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept={ALLOWED_EXTENSIONS.join(",")}
                    />
                  </div>
                ) : (
                  <>
                    {/* Show File Header if Tab 3 and file is loaded */}
                    {activeTab === "file" && fileName && (
                      <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 font-medium text-gray-700">
                          <FileCode className="w-4 h-4 text-blue-600" />
                          <span>{fileName}</span>
                        </div>
                        <button 
                          onClick={handleClear}
                          className="hover:text-red-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Editor Frame with synched line numbers */}
                    <div className="flex">
                      {/* Line Numbers Column */}
                      {activeTab !== "line" && (
                        <div 
                          ref={lineNumbersRef}
                          className="bg-gray-100 text-gray-400 font-mono text-xs text-right pr-3 pl-2 py-3 select-none border-r border-gray-200 min-w-[42px] overflow-hidden leading-6"
                        >
                          {lineNumbers.map((num) => (
                            <div key={num} className="h-6 pr-0.5">{num}</div>
                          ))}
                        </div>
                      )}

                      {/* Text Input Container */}
                      {activeTab === "line" ? (
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="Paste a single line of code here to analyze..."
                          className="w-full bg-[#F3F4F6] text-gray-900 font-mono text-sm px-4 py-4 focus:outline-none placeholder-gray-400"
                        />
                      ) : (
                        <textarea
                          ref={textareaRef}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          onScroll={handleScroll}
                          rows={activeTab === "function" ? 12 : 16}
                          placeholder={
                            activeTab === "function" 
                              ? "Paste your code function, algorithm, or class here..." 
                              : "Review or edit your uploaded file contents here..."
                          }
                          className="w-full bg-[#F3F4F6] text-gray-900 font-mono text-sm px-4 py-3 focus:outline-none resize-none leading-6 placeholder-gray-400 overflow-y-auto"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Local validations (error messages) */}
              {errorMsg && (
                <div className="text-red-600 text-xs font-semibold flex items-center gap-1.5 px-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={`w-full py-3.5 px-6 rounded-lg text-white font-sans font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isAnalyzing 
                      ? "bg-blue-400 cursor-not-allowed" 
                      : analysisError 
                        ? "bg-red-600 hover:bg-red-700" 
                        : "bg-[#1A56DB] hover:bg-blue-800"
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : analysisError ? (
                    <span>Error — Try Again</span>
                  ) : (
                    <span>Analyze Code</span>
                  )}
                </button>

                <div className="text-center">
                  <button
                    onClick={handleClear}
                    className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* ZONE 2 — RIGHT PANEL (Output Side) */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-center min-h-[460px]">
            <AnimatePresence mode="wait">
              {!analysisResult && !isAnalyzing && !analysisError ? (
                /* Default empty state */
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center p-8 gap-4"
                >
                  <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-400 shadow-inner">
                    <Code className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">Awaiting Code Input</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                      Your analysis will appear here...
                    </p>
                  </div>
                </motion.div>
              ) : isAnalyzing ? (
                /* Dynamic analysis loading feedback */
                <motion.div 
                  key="loading-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center p-8 gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">Analyzing Code</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed animate-pulse">
                      Checking fingerprint structural features...
                    </p>
                  </div>
                </motion.div>
              ) : analysisError ? (
                /* Error Feedback */
                <motion.div 
                  key="error-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center p-8 gap-4 text-red-600"
                >
                  <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Analysis Failed</h3>
                    <p className="text-xs text-red-500 mt-1 max-w-xs leading-relaxed">
                      {analysisError}
                    </p>
                    <button 
                      onClick={handleAnalyze} 
                      className="mt-4 px-4 py-2 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium font-sans"
                    >
                      Retry Analysis
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Verdict Results Loaded */
                <motion.div 
                  key="results-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Verdict Badge Pill */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Verdict</span>
                    
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      {analysisResult.verdict === "HUMAN_WRITTEN" ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          HUMAN WRITTEN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                          <Bot className="w-4 h-4" />
                          AI GENERATED
                        </span>
                      )}
                    </motion.div>
                  </div>

                  {/* Confidence metrics */}
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">Confidence</span>
                      <span className={`text-2xl font-black ${
                        analysisResult.verdict === "HUMAN_WRITTEN" ? "text-[#059669]" : "text-[#DC2626]"
                      }`}>
                        {analysisResult.confidence}%
                      </span>
                    </div>

                    {/* Progress Bar with CSS Animation transition */}
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-[600ms] ease-out`}
                        style={{ 
                          width: `${analysisResult.confidence}%`,
                          backgroundColor: analysisResult.verdict === "HUMAN_WRITTEN" ? "#059669" : "#DC2626"
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Detected Language Tag */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Detected Language:</span>
                    <span className="inline-block px-2.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs font-semibold">
                      {analysisResult.language}
                    </span>
                  </div>

                  {/* "Why?" reasoning explanation */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Why?</h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-sans">
                      {analysisResult.reasoning}
                    </p>
                  </div>

                  {/* Indicators list breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">Indicators Detected</h4>
                    <ul className="space-y-1.5">
                      {analysisResult.indicators.map((indicator, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            analysisResult.verdict === "HUMAN_WRITTEN" ? "bg-emerald-500" : "bg-red-500"
                          }`} />
                          <span>{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </section>

        </div>

        {/* ZONE 3 — BOTTOM STRIP (Conditional, only when AI GENERATED is detected) */}
        <AnimatePresence>
          {analysisResult && analysisResult.verdict === "AI_GENERATED" && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-xl border border-gray-200 shadow-md p-6 flex flex-col gap-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-sans font-bold text-base text-gray-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-red-500" />
                    AI Detected
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Convert this code into human-style code.
                  </p>
                </div>

                <button
                  onClick={handleHumanize}
                  disabled={isHumanizing}
                  className="px-6 py-3 bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg font-sans font-semibold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  {isHumanizing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Convert to Human-Written Code</span>
                    </>
                  )}
                </button>
              </div>

              {humanizationError && (
                <div className="text-red-600 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {humanizationError}
                </div>
              )}

              {/* Converted humanized results */}
              {humanizedCode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Human-Written Version</span>
                    
                    <button
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md border border-gray-200 transition-colors cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Read-only syntax highlighted block */}
                  <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-[#F3F4F6] shadow-inner max-h-96 overflow-y-auto">
                    <pre className="p-4"><code ref={humanizedCodeRef} className="font-mono text-sm leading-6">{humanizedCode}</code></pre>
                  </div>
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400 font-sans mt-auto">
        <p>© 2026 CodeSense AI.</p>
      </footer>
    </div>
  );
}
