import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  FileText,
  CreditCard,
  AlertTriangle,
  Award,
  Users,
  Building2,
  BarChart3,
  CheckCircle2,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface GramMitraChatWidgetProps {
  onNavigate?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  actionLinks?: { label: string; tab: string }[];
}

export default function GramMitraChatWidget({ onNavigate }: GramMitraChatWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const role = user ? user.role : 'guest';

  // Role display badge title
  const roleTitleMap: Record<string, string> = {
    guest: 'Public Service Guide',
    citizen: 'Citizen Assistant',
    officer: 'Officer Co-Pilot',
    admin: 'Executive Analytics Assistant'
  };

  // Welcome message template per role when user says Hi / greets
  const getWelcomeGreetingMessage = (): ChatMessage => {
    let welcomeText = '';

    if (!user) {
      welcomeText = `Hi Visitor! What can I do for you?`;
    } else if (role === 'officer') {
      welcomeText = `Hi Officer ${user?.name || ''}! What can I do for you?`.trim();
    } else if (role === 'admin') {
      welcomeText = `Hi ${user?.name || 'Administrator'}! What can I do for you?`;
    } else {
      welcomeText = `Hi ${user?.name || 'Citizen'}! What can I do for you?`;
    }

    return {
      id: `bot_welcome_${Date.now()}`,
      sender: 'bot',
      text: welcomeText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionLinks: []
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Clear or reset messages when authentication state or user changes
  useEffect(() => {
    setMessages([]);
  }, [user?.id, user?.role]);

  // Listen for global 'open-gram-mitra' custom event from any page
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e?.detail?.prompt) {
        handleSendMessage(e.detail.prompt);
      }
    };
    window.addEventListener('open-gram-mitra', handleOpenEvent);
    return () => window.removeEventListener('open-gram-mitra', handleOpenEvent);
  }, [messages, role]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Quick Action Buttons definitions
  const quickActions = !user ? [
    { label: '👋 Say Hi', prompt: 'Hi' },
    { label: '📜 Certificate Guide', prompt: 'How do I apply for a Residence or Income certificate?' },
    { label: '💳 Tax Payment Info', prompt: 'How does online tax payment work in this portal?' },
    { label: '🚨 File Grievance', prompt: 'How do I file a civic grievance?' },
    { label: '🔍 Track Application', prompt: 'How do I track my application status?' },
    { label: '🏛️ Welfare Schemes', prompt: 'What welfare schemes are offered by Gram Panchayath?' },
    { label: '🌐 Website Usage', prompt: 'How do I register an account or change language on this website?' }
  ] : role === 'officer' ? [
    { label: '👋 Say Hi', prompt: 'Hi' },
    { label: '📋 Task Summary', prompt: 'Show summary of my assigned grievances and tasks' },
    { label: '📄 Certificate Rules', prompt: 'What documents are mandatory for Residence and Income certificates?' },
    { label: '🚨 Zone Grievances', prompt: 'How do I inspect and resolve assigned citizen complaints?' },
    { label: '📞 Officer Roster', prompt: 'List contact numbers of PDO and zone officers' }
  ] : role === 'admin' ? [
    { label: '👋 Say Hi', prompt: 'Hi' },
    { label: '📊 Revenue Insights', prompt: 'Give me a summary of tax collection and unpaid accounts' },
    { label: '📈 Grievance SLA', prompt: 'What is the overall grievance resolution performance?' },
    { label: '👥 Officer Performance', prompt: 'Show officer ward coverage and task completion' },
    { label: '📜 Policy & Audit', prompt: 'What governance records are logged in the system?' }
  ] : [
    { label: '👋 Say Hi', prompt: 'Hi' },
    { label: '📜 Apply Certificate', prompt: 'How do I apply for a Residence or Income certificate?' },
    { label: '💳 Pay Property Tax', prompt: 'How do I pay my Property Tax online and get a receipt?' },
    { label: '🚨 File Grievance', prompt: 'How do I file a civic grievance?' },
    { label: '🔍 Track Application', prompt: 'How do I track my application status?' },
    { label: '🏛️ Welfare Schemes', prompt: 'Which welfare schemes am I eligible for?' },
    { label: '📞 Contact Officers', prompt: 'Give me the contact details of Gram Panchayath PDO and Sarpanch' }
  ];

  // Helper to extract relevant action links from message text
  const detectActionLinks = (text: string) => {
    const links: { label: string; tab: string }[] = [];
    const t = text.toLowerCase();

    if (!user) {
      if (t.includes('login') || t.includes('status') || t.includes('my') || t.includes('account') || t.includes('personal') || t.includes('track')) {
        links.push({ label: 'Citizen Login', tab: 'login' });
        links.push({ label: 'Register Account', tab: 'register' });
      } else {
        links.push({ label: 'Citizen Login', tab: 'login' });
      }
      return links.slice(0, 2);
    }

    if (t.includes('how to file a civic grievance') || t.includes('lodge new grievance') || (t.includes('grievance') && !t.includes('how to track') && !t.includes('tracking'))) {
      links.push({ label: 'Go to Grievances Redressal', tab: role === 'officer' ? 'officer-grievances' : 'grievances' });
    }
    if (t.includes('how to track') || t.includes('tracking') || t.includes('live application') || t.includes('submissions across the portal')) {
      links.push({ label: 'Go to Grievances Redressal', tab: role === 'officer' ? 'officer-grievances' : 'grievances' });
      links.push({ label: 'Go to Certificates Desk', tab: role === 'officer' ? 'officer-certificates' : 'certificates' });
      links.push({ label: 'Go to Welfare Schemes', tab: 'schemes' });
      return links.slice(0, 3);
    }
    if (t.includes('certificate') && !t.includes('how to track')) {
      links.push({ label: 'Go to Certificates Desk', tab: role === 'officer' ? 'officer-certificates' : 'certificates' });
    }
    if ((t.includes('tax') || t.includes('due taxes') || t.includes('property tax') || t.includes('water bill') || t.includes('house tax')) && !t.includes('how to file a civic grievance')) {
      links.push({ label: 'Go to Taxes & Revenue', tab: 'taxes' });
    }
    if (t.includes('scheme') || t.includes('subsidy') || t.includes('welfare') || t.includes('eligible') || t.includes('eligibility')) {
      if (role !== 'officer' && role !== 'admin') {
        links.push({ label: '🤖 Open AI Scheme Checker', tab: 'ai-scheme-checker' });
      }
      links.push({ label: 'Go to Welfare Schemes', tab: 'schemes' });
    }
    if (t.includes('asset') || t.includes('building') || t.includes('hall')) {
      if (role === 'admin' || role === 'officer') {
        links.push({ label: 'Go to Panchayath Assets', tab: 'asset-mgmt' });
      }
    }
    if (t.includes('officer') || t.includes('contact') || t.includes('phone') || t.includes('pdo') || t.includes('directory')) {
      if (role === 'admin') {
        links.push({ label: 'Go to Officer Directory', tab: 'employee-mgmt' });
      }
    }
    if (t.includes('reports') || t.includes('analytics') || t.includes('dashboard')) {
      if (role === 'admin') {
        links.push({ label: 'Go to Reports & Analytics', tab: 'reports' });
      }
    }

    // Deduplicate tabs
    const unique = links.filter((v, i, a) => a.findIndex(t => t.tab === v.tab) === i);
    return unique.slice(0, 3);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    const queryTrimmed = query.trim().toLowerCase();
    const isGreeting = /^(hi|hello|hey|namaste|namaskara|vanakkam|pranam|good\s*(morning|afternoon|evening|day)|greetings)(\s+.*|\!|\.|\?)*$/i.test(queryTrimmed) ||
      ['hi', 'hello', 'hey', 'namaste', 'namaskara'].includes(queryTrimmed);

    try {
      const historyPayload = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await api.sendAiMessage(query, historyPayload);
      let botText = res?.text;

      if (!botText && isGreeting) {
        setMessages(prev => [...prev, getWelcomeGreetingMessage()]);
        return;
      }

      botText = botText || "I am currently unable to process your query. Please contact the Gram Panchayath office directly.";

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionLinks: isGreeting ? getWelcomeGreetingMessage().actionLinks : detectActionLinks(botText)
      };

      setMessages(prev => [...prev, botMsg]);
    } catch {
      if (isGreeting) {
        setMessages(prev => [...prev, getWelcomeGreetingMessage()]);
      } else {
        const fallbackMsg: ChatMessage = {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: "Namaste! I am having trouble connecting to the network right now. Please try again shortly or contact your Panchayath office.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionLinks: detectActionLinks(query)
        };
        setMessages(prev => [...prev, fallbackMsg]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
  };

  // Simple clean formatter for AI markdown responses
  const renderFormattedText = (content: string) => {
    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="font-display font-bold text-xs mt-2 mb-1 text-emerald-950 dark:text-emerald-300">{trimmed.replace('### ', '')}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="font-display font-extrabold text-xs mt-2 mb-1 text-slate-900 dark:text-white">{trimmed.replace('## ', '')}</h3>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const itemText = trimmed.replace(/^[-•]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 text-xs text-slate-700 dark:text-slate-200">
            <span className="text-emerald-600 font-bold mt-0.5 dark:text-emerald-400">•</span>
            <span dangerouslySetInnerHTML={{ __html: parseBold(itemText) }} />
          </div>
        );
      }

      return (
        <p key={idx} className="my-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: parseBold(trimmed) }} />
      );
    });
  };

  const parseBold = (str: string) => {
    return str.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
  };

  return (
    <>
      {/* Floating Widget Trigger Button - ALWAYS circular, fixed at bottom-right */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-5 right-5 z-50 flex items-center justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              title="Open Gram Mitra AI Assistant"
              aria-label="Open Gram Mitra AI Assistant"
              className="group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-950/25 border-2 border-emerald-300/50 cursor-pointer dark:from-emerald-700 dark:via-emerald-600 dark:to-teal-600 dark:border-emerald-400/40 hover:shadow-2xl hover:shadow-emerald-500/35 transition-all"
            >
              {/* Subtle ambient glow behind */}
              <div className="absolute inset-0 rounded-full bg-emerald-400/25 blur-md -z-10 group-hover:bg-emerald-400/40 transition-colors" />

              {/* Centered White AI / Robot Icon */}
              <Bot className="h-7 w-7 text-white drop-shadow-xs" />

              {/* Small Yellow Sparkle/Star Badge at Top-Right */}
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900 ring-2 ring-white shadow-xs dark:ring-slate-900">
                ✦
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Modal (Minimized / Full View) */}
      <AnimatePresence>
        {isOpen && (
          isMinimized ? (
            /* Minimized Sleek Bar */
            <motion.div
              key="gram-mitra-minimized-bar"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="fixed bottom-4 right-4 sm:right-6 z-50 origin-bottom-right"
            >
              <div
                onClick={() => setIsMinimized(false)}
                className="group flex h-13 w-[300px] sm:w-[340px] items-center justify-between gap-2.5 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-3.5 py-2 text-white shadow-xl shadow-emerald-950/20 backdrop-blur-md cursor-pointer hover:shadow-2xl hover:border-emerald-400 transition-all dark:from-[#0d342d] dark:via-[#092b25] dark:to-[#0f172a] dark:border-teal-700/60"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner border border-white/30">
                    <Bot className="h-4.5 w-4.5" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-display text-xs font-bold tracking-tight text-white">Gram Mitra AI</span>
                      <span className="rounded-full bg-emerald-800/70 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-emerald-100 border border-emerald-300/30 dark:bg-emerald-900/80">
                        {roleTitleMap[role]}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-100/90 font-medium truncate">
                      Click to resume chat
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setIsMinimized(false)}
                    title="Expand Chat"
                    className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsMinimized(false);
                    }}
                    title="Close Assistant"
                    className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Expanded Floating Chat Modal */
            <motion.div
              key="gram-mitra-expanded-modal"
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              className={`fixed z-50 transition-all duration-300 ${
                isFullScreen
                  ? 'inset-2 sm:inset-4 md:inset-6 max-w-6xl mx-auto h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]'
                  : 'right-4 sm:right-6 bottom-4 sm:bottom-6 origin-bottom-right w-[92vw] sm:w-96 md:w-[420px] h-[85vh] max-h-[620px]'
              }`}
            >
              <div className="flex h-full w-full flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 overflow-hidden dark:border-[#334155] dark:bg-[#111827]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-emerald-700/30 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-3 text-white shrink-0 dark:border-teal-900/60 dark:bg-gradient-to-r dark:from-[#0d342d] dark:via-[#092b25] dark:to-[#0f172a]">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner border border-white/30">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-sm font-bold tracking-tight text-white">Gram Mitra AI</h3>
                        <span className="rounded-full bg-emerald-800/60 px-2 py-0.5 text-[9px] font-bold text-white border border-emerald-300/40 uppercase tracking-wider dark:bg-emerald-900/80 dark:border-emerald-500/30 dark:text-emerald-200">
                          {roleTitleMap[role]}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-100 font-medium dark:text-emerald-300/80">Namma Panchayath Virtual Helpdesk</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={handleResetChat}
                      title="Reset Conversation"
                      className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                      className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                    >
                      {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      title="Minimize Assistant"
                      className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsMinimized(false);
                        setIsFullScreen(false);
                      }}
                      title="Close Assistant"
                      className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Main Chat Body */}
                <>
                  {/* Policy Guardrail Banner */}
                  <div className="flex items-center gap-2 border-b border-emerald-200/80 bg-emerald-50/90 px-3.5 py-2 text-[10px] font-semibold text-emerald-950 shrink-0 dark:border-teal-900/60 dark:bg-[#123D3A]/60 dark:text-emerald-200">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <p className="leading-tight">
                      Gram Mitra provides step-by-step guidance for features available in this system. System record updates and formal approvals are performed by Panchayath Officers.
                    </p>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50 dark:bg-[#0F172A]">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-[300px] h-full text-center px-4 py-6">
                        <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-md border border-emerald-300/60 dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-300">
                          <Bot className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-slate-900 ring-2 ring-white">
                            ✦
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                          Gram Mitra AI Assistant
                        </h4>
                        <p className="mt-1.5 text-xs text-slate-500 max-w-[280px] dark:text-slate-400 leading-relaxed">
                          Type <strong>"Hi"</strong> or choose an option below to begin your consultation.
                        </p>

                        <div className="mt-5 flex flex-col gap-2 w-full max-w-[280px]">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => handleSendMessage("Hi")}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                            Say "Hi" to Gram Mitra
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {messages.map((m) => (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 12, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[88%] rounded-2xl p-3 shadow-xs text-xs ${
                                m.sender === 'user'
                                  ? 'bg-emerald-600 text-white rounded-br-xs font-medium dark:bg-emerald-600'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:border-[#334155] dark:shadow-none'
                              }`}
                            >
                              {m.sender === 'bot' && (
                                <div className="mb-1 flex items-center justify-between border-b border-slate-100 pb-1 dark:border-[#334155]">
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 font-display dark:text-emerald-400">
                                    <Bot className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                    Gram Mitra
                                  </span>
                                  <span className="text-[9px] text-slate-400 dark:text-[#94A3B8]">{m.timestamp}</span>
                                </div>
                              )}

                              <div className="prose prose-slate max-w-none dark:prose-invert">
                                {renderFormattedText(m.text)}
                              </div>

                              {/* Action Links if available */}
                              {m.actionLinks && m.actionLinks.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2 dark:border-[#334155]">
                                  {m.actionLinks.map((link, idx) => (
                                    <motion.button
                                      key={idx}
                                      whileHover={{ scale: 1.03 }}
                                      whileTap={{ scale: 0.97 }}
                                      type="button"
                                      onClick={() => {
                                        if (link.tab === 'ai-scheme-checker') {
                                          if (onNavigate) onNavigate('schemes');
                                          setTimeout(() => window.dispatchEvent(new CustomEvent('open-ai-scheme-checker')), 150);
                                          setIsMinimized(true);
                                        } else if (onNavigate) {
                                          onNavigate(link.tab);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer dark:bg-[#172033] dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-950/40"
                                    >
                                      <span>{link.label}</span>
                                      <ArrowRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                    </motion.button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="mt-1 text-[9px] text-slate-400 px-1 dark:text-[#94A3B8]">{m.timestamp}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}

                    {/* Animated Typing Indicator */}
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-center gap-2.5 rounded-2xl bg-white p-3 border border-slate-200 max-w-[75%] shadow-xs dark:bg-[#1E293B] dark:border-[#334155]"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          <Bot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-1 py-1">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="h-2 w-2 rounded-full bg-emerald-500"
                              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.6,
                                delay: i * 0.18,
                                ease: 'easeInOut'
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium dark:text-[#94A3B8]">Gram Mitra is thinking...</span>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Action Chips Bar */}
                  <div className="border-t border-slate-200 bg-white px-2.5 py-1.5 shrink-0 dark:border-[#334155] dark:bg-[#111827]">
                    <div className="px-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between dark:text-[#94A3B8]">
                      <span>Quick Action Services</span>
                      <span className="text-[8.5px] text-emerald-600 font-semibold dark:text-emerald-400">Role: {role}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5 scrollbar-thin">
                      {quickActions.map((act, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02, y: -0.5 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => handleSendMessage(act.prompt)}
                          className="rounded-lg border border-slate-200 bg-slate-100/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-950 transition-colors cursor-pointer whitespace-nowrap dark:border-[#334155] dark:bg-[#172033] dark:text-[#CBD5E1] dark:hover:border-emerald-500 dark:hover:bg-[#243247] dark:hover:text-white"
                        >
                          {act.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Input Controls */}
                  <div className="border-t border-slate-200 bg-white p-2.5 shrink-0 dark:border-[#334155] dark:bg-[#111827]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={
                          role === 'officer'
                            ? 'Ask about tasks, certificates, or asset logs...'
                            : role === 'admin'
                            ? 'Ask about revenue, SLAs, or officer performance...'
                            : 'Ask about certificates, taxes, schemes, or grievances...'
                        }
                        disabled={loading}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-[#334155] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#94A3B8] dark:focus:border-emerald-500 dark:focus:bg-[#172033]"
                      />
                      <motion.button
                        whileHover={!loading && inputMessage.trim() ? { scale: 1.06 } : {}}
                        whileTap={!loading && inputMessage.trim() ? { scale: 0.94 } : {}}
                        type="submit"
                        disabled={loading || !inputMessage.trim()}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all ${
                          loading || !inputMessage.trim()
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer dark:bg-emerald-500 dark:hover:bg-emerald-600'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                      </motion.button>
                    </form>
                  </div>
                </>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </>
  );
}
