import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  FileCheck2,
  Gift,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Info,
  Building2,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Scheme, SchemeCheckerResult, SchemeCheckerResponse } from '../types';

interface AiSchemeCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScheme?: (scheme: Scheme) => void;
  allSchemes?: Scheme[];
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: string[];
  results?: SchemeCheckerResult[];
  isEvaluation?: boolean;
  timestamp: string;
}

export default function AiSchemeCheckerModal({
  isOpen,
  onClose,
  onApplyScheme,
  allSchemes = []
}: AiSchemeCheckerModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [collectedDetails, setCollectedDetails] = useState<Record<string, any>>({});
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const initialBotGreeting = "Hi! I'm Gram Mitra. I can help you find welfare schemes you may be eligible for in Namma Panchayath. I will ask you 4 quick questions to check your eligibility.\n\nWhat is your approximate annual family income?";

  // Helper to remove question numbers and raw asterisks from messages
  const formatBotMessage = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\*{1,2}Question\s+\d+\s+of\s+\d+\*{1,2}:?\s*/gi, '')
      .replace(/Question\s+\d+\s+of\s+\d+:?\s*/gi, '')
      .replace(/\*\*/g, '')
      .replace(/^\s*:\s*/, '')
      .trim();
  };

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Reset / initialize session when opened
  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        startAssessment();
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const startAssessment = () => {
    const initialMsg: ChatMessage = {
      id: `bot_init_${Date.now()}`,
      sender: 'bot',
      text: initialBotGreeting,
      options: [
        'Below ₹1,50,000',
        '₹1,50,000 - ₹2,50,000',
        '₹2,50,000 - ₹3,50,000',
        'Above ₹3,50,000'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialMsg]);
    setCollectedDetails({});
    setHasEvaluated(false);
    setInputMessage('');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputMessage('');
    setLoading(true);

    try {
      // Send chat history and current collectedDetails to backend AI Checker endpoint
      const payloadMessages = nextHistory.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res: SchemeCheckerResponse = await api.checkSchemeEligibilityAI(
        payloadMessages,
        collectedDetails
      );

      if (res && res.message) {
        if (res.collectedDetails) {
          setCollectedDetails(prev => ({ ...prev, ...res.collectedDetails }));
        }

        const isEval = res.type === 'evaluation' || (Array.isArray(res.results) && res.results.length > 0);
        if (isEval) {
          setHasEvaluated(true);
        }

        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: res.message,
          options: !isEval ? res.options : undefined,
          results: isEval ? res.results : undefined,
          isEvaluation: isEval,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err) {
      console.error('Error during AI scheme check:', err);
      // Fallback message
      const errorBotMsg: ChatMessage = {
        id: `bot_err_${Date.now()}`,
        sender: 'bot',
        text: "I experienced a brief connection hiccup while evaluating scheme data. Let's continue: Could you please re-confirm your details or click 'Check Again'?",
        options: ['Check Again', 'Yes, BPL Card Holder', 'Farmer', 'Below ₹1,50,000'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorBotMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (option: string) => {
    if (option === 'Check Again') {
      startAssessment();
      return;
    }
    if (option.toLowerCase() === 'others' || option.toLowerCase().includes('other')) {
      // Focus input field so user can type their custom occupation
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.placeholder = "Type your occupation (e.g., Electrician, Carpenter, Tailor)...";
      }
      return;
    }
    handleSendMessage(option);
  };

  const handleApplyClick = (result: SchemeCheckerResult) => {
    // Find the full scheme object from allSchemes or create standard stub
    const matchedScheme = (allSchemes || []).find(s => s.id === result.schemeId || s.name.toLowerCase() === result.schemeName.toLowerCase());
    if (matchedScheme && onApplyScheme) {
      onClose();
      onApplyScheme(matchedScheme);
    } else if (onApplyScheme) {
      const fallbackScheme: Scheme = {
        id: result.schemeId,
        name: result.schemeName,
        description: result.benefits || 'Panchayath Welfare Scheme',
        benefits: result.benefits || 'Panchayath welfare subsidy and benefits',
        eligibilityCriteria: result.explanation || 'Verified eligible resident',
        department: result.department || 'Administration',
        category: (result.category as any) || 'Housing',
        status: 'Active',
        requiredDocuments: result.requiredDocuments || ['Aadhaar Card', 'Income Certificate', 'Ration Card', 'Bank Passbook', 'Passport Photo'],
        createdAt: new Date().toISOString()
      };
      onClose();
      onApplyScheme(fallbackScheme);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="ai-scheme-checker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative flex h-[92vh] max-h-[850px] w-full max-w-4xl flex-col rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-5 py-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-inner">
              <Bot className="h-6 w-6 text-emerald-100" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
                  Gram Mitra AI
                </h3>
                <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-100 border border-emerald-400/30">
                  Scheme Eligibility Advisor
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Live conversational checker mapped directly to active Panchayath database schemes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="ai-scheme-checker-restart-btn"
              onClick={startAssessment}
              title="Start New Assessment"
              className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white border border-white/15 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Check Again</span>
            </button>
            <button
              id="ai-scheme-checker-close-btn"
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-white border border-white/15 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mandatory Official Guidance Disclaimer */}
        <div className="flex items-center gap-2.5 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[11px] leading-tight">
            <strong>Guidance Disclaimer:</strong> This is an eligibility guidance tool. Final eligibility and approval will be verified by the concerned Panchayath Officer.
          </p>
        </div>

        {/* 4-Question Progressive Step Tracker */}
        <div className="bg-slate-100/80 dark:bg-[#161F30] border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between overflow-x-auto text-[11px] font-medium">
          {(() => {
            const userMsgCount = messages.filter(m => m.sender === 'user').length;
            const currentStep = hasEvaluated ? 5 : Math.min(userMsgCount + 1, 4);
            const steps = [
              { num: 1, label: 'Income' },
              { num: 2, label: 'Occupation' },
              { num: 3, label: 'BPL Card' },
              { num: 4, label: 'Age & Details' }
            ];

            return (
              <div className="flex items-center gap-1.5 sm:gap-3 w-full justify-between sm:justify-start">
                <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider hidden sm:inline">
                  Evaluation Steps:
                </span>
                {steps.map((st, i) => {
                  const isDone = currentStep > st.num || hasEvaluated;
                  const isCurrent = currentStep === st.num && !hasEvaluated;

                  return (
                    <div key={st.num} className="flex items-center gap-1.5">
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-[10px]">{st.num}.</span>
                        <span>{st.label}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">→</span>
                      )}
                    </div>
                  );
                })}
                <div
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ml-auto ${
                    hasEvaluated
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span>Results</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Chat Messages Container */}
        <div
          id="ai-scheme-chat-container"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-[#0B1120]"
        >
          {messages.map((msg, index) => {
            const isBot = msg.sender === 'bot';

            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-end justify-end'}`}
              >
                {/* Bot Avatar */}
                {isBot && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-600/20">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`flex max-w-[90%] sm:max-w-[80%] flex-col ${
                    isBot ? 'items-start' : 'items-end'
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isBot
                        ? 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 rounded-tl-sm'
                        : 'bg-emerald-600 dark:bg-emerald-600 text-white rounded-tr-sm font-medium'
                    }`}
                  >
                    {/* Render message formatted text */}
                    <div className="whitespace-pre-line">
                      {isBot ? formatBotMessage(msg.text) : msg.text}
                    </div>

                    {/* Render Evaluation Results if present */}
                    {msg.results && msg.results.length > 0 && (
                      <div className="mt-4 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/80 w-full">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>EVALUATION SUMMARY ({msg.results.length} SCHEMES)</span>
                          <span>
                            {msg.results.filter(r => r.status === 'Eligible').length} Eligible
                          </span>
                        </div>

                        {msg.results.map((result, rIdx) => {
                          const isEligible = result.status === 'Eligible';
                          const isNotEligible = result.status === 'Not Eligible';

                          return (
                            <div
                              key={result.schemeId || rIdx}
                              id={`scheme-eval-card-${result.schemeId}`}
                              className={`rounded-2xl border p-4 transition-all ${
                                isEligible
                                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs'
                                  : isNotEligible
                                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                                  : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                              }`}
                            >
                              {/* Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-base mt-0.5">
                                    {isEligible ? '🟢' : isNotEligible ? '🔴' : '🟡'}
                                  </span>
                                  <div>
                                    <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                                      {result.schemeName}
                                    </h4>
                                    {result.category && (
                                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                        Category: {result.category} • {result.department || 'Gram Panchayath'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                      isEligible
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : isNotEligible
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-amber-500 text-white'
                                    }`}
                                  >
                                    {isEligible ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3" />
                                        Eligible
                                      </>
                                    ) : isNotEligible ? (
                                      <>
                                        <XCircle className="h-3 w-3" />
                                        Not Eligible
                                      </>
                                    ) : (
                                      <>
                                        <HelpCircle className="h-3 w-3" />
                                        More Info Required
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Explanation & Reason Details */}
                              <div className="mt-3 text-xs space-y-1.5">
                                {isEligible ? (
                                  <>
                                    <p className="text-emerald-950 dark:text-emerald-200 font-medium">
                                      {result.explanation || 'You are eligible. Your profile details match the scheme criteria.'}
                                    </p>
                                    {result.benefits && (
                                      <p className="text-slate-600 dark:text-slate-300">
                                        <strong className="text-slate-800 dark:text-slate-100">Benefits:</strong> {result.benefits}
                                      </p>
                                    )}
                                    {result.requiredDocuments && result.requiredDocuments.length > 0 && (
                                      <div className="pt-1">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                          Required Documents:
                                        </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {result.requiredDocuments.map((doc, dIdx) => (
                                            <span
                                              key={dIdx}
                                              className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#1E293B] px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300"
                                            >
                                              {doc}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : isNotEligible ? (
                                  <>
                                    <p className="text-rose-900 dark:text-rose-200 font-medium">
                                      {result.unmetRequirement || result.explanation || 'You are not eligible for this scheme.'}
                                    </p>
                                    {result.unmetRequirement && (
                                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                        <strong>Specific Requirement:</strong> {result.unmetRequirement}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="text-amber-900 dark:text-amber-200 font-medium">
                                      {result.missingInformation || result.explanation || 'Please provide additional details in the chat to assess eligibility.'}
                                    </p>
                                  </>
                                )}
                              </div>

                              {/* Apply Now Button for Eligible Schemes */}
                              {isEligible && (
                                <div className="mt-3.5 flex items-center justify-end pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                                  <button
                                    id={`apply-now-btn-${result.schemeId}`}
                                    onClick={() => handleApplyClick(result)}
                                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                                  >
                                    <span>Apply Now</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selectable Quick Options Pills below Bot message */}
                  {isBot && msg.options && msg.options.length > 0 && !hasEvaluated && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.options.map((opt, oIdx) => {
                        const isOther = opt.toLowerCase() === 'others' || opt.toLowerCase().includes('other');
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleOptionClick(opt)}
                            disabled={loading}
                            title={isOther ? "Click to type your specific occupation in the message box below" : undefined}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all hover:scale-102 active:scale-95 cursor-pointer disabled:opacity-50 ${
                              isOther
                                ? 'border border-dashed border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {isOther ? '✏️ Others (Type custom)' : opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Timestamp */}
                  <span className="mt-1 px-1 text-[10px] text-slate-400">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* AI Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] px-4 py-3 shadow-sm flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-600"></div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Gram Mitra AI is analyzing scheme criteria...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Chat Input Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 sm:p-4">
          {hasEvaluated ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium text-center sm:text-left">
                Eligibility check complete! You can review details, apply directly, or start a new check.
              </p>
              <button
                id="check-again-bottom-btn"
                onClick={startAssessment}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/15 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Check Again</span>
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                id="ai-scheme-chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your answer (e.g. ₹1,80,000, Farmer, Yes, 35 years)..."
                disabled={loading}
                className="flex-1 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-[#172033] focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                id="ai-scheme-chat-send-btn"
                disabled={!inputMessage.trim() || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
