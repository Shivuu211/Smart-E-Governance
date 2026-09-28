import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  Building,
  CreditCard,
  Smartphone,
  Building2,
  Check,
  QrCode,
  Copy,
  CheckCircle,
  Download,
  FileText,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  RotateCw,
  ChevronRight,
  Sparkles,
  Info,
  X,
  Landmark,
  Eye,
  EyeOff
} from 'lucide-react';
import { Tax, Payment } from '../types';
import { NammaLogoSvg } from './NammaLogo';
import svgLogo from '../assets/images/namma_panchayath_logo.svg';
import { api } from '../services/api';

interface TaxPaymentModalProps {
  tax: Tax;
  user: any;
  onClose: () => void;
  onSuccess: (payment: Payment, methodLabel: string) => void;
  onDownloadReceipt: (payment: Payment) => void;
  onViewReceipt: (payment: Payment) => void;
}

type PaymentMethod = 'UPI' | 'Card' | 'NetBanking';

const POPULAR_BANKS = [
  { id: 'sbi', name: 'State Bank of India', short: 'SBI', color: 'bg-blue-600' },
  { id: 'hdfc', name: 'HDFC Bank', short: 'HDFC', color: 'bg-indigo-700' },
  { id: 'icici', name: 'ICICI Bank', short: 'ICICI', color: 'bg-amber-600' },
  { id: 'axis', name: 'Axis Bank', short: 'Axis', color: 'bg-rose-700' },
  { id: 'canara', name: 'Canara Bank', short: 'Canara', color: 'bg-sky-600' },
  { id: 'bob', name: 'Bank of Baroda', short: 'BOB', color: 'bg-orange-600' },
  { id: 'karnataka', name: 'Karnataka Bank', short: 'KBL', color: 'bg-red-600' },
  { id: 'pnb', name: 'Punjab National Bank', short: 'PNB', color: 'bg-yellow-700' },
];

const ALL_OTHER_BANKS = [
  'Bank of India',
  'Central Bank of India',
  'Federal Bank',
  'IDBI Bank',
  'Indian Bank',
  'Indian Overseas Bank',
  'IndusInd Bank',
  'Kotak Mahindra Bank',
  'Punjab & Sind Bank',
  'RBL Bank',
  'South Indian Bank',
  'UCO Bank',
  'Union Bank of India',
  'Yes Bank'
];

export default function TaxPaymentModal({
  tax,
  user,
  onClose,
  onSuccess,
  onDownloadReceipt,
  onViewReceipt,
}: TaxPaymentModalProps) {
  // Method selection
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');

  // UPI state
  const [upiId, setUpiId] = useState('');
  const [upiMode, setUpiMode] = useState<'qr' | 'id'>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiCopied, setUpiCopied] = useState(false);

  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.name || '');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);

  // Net Banking state
  const [selectedBank, setSelectedBank] = useState<string>('State Bank of India');

  // Common payment process states
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('Connecting to Karnataka e-Treasury gateway...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<{ message: string; detail?: string } | null>(null);

  // Success state screen
  const [completedPayment, setCompletedPayment] = useState<Payment | null>(null);
  const [completedMethodLabel, setCompletedMethodLabel] = useState('');
  const [txCopied, setTxCopied] = useState(false);

  // Celebration Confetti effect for 1–2 seconds when payment succeeds
  useEffect(() => {
    if (!completedPayment) return;

    try {
      // Primary celebratory confetti burst
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10B981', '#059669', '#34D399', '#3B82F6', '#F59E0B'],
        disableForReducedMotion: true,
        zIndex: 99999,
        ticks: 200,
      });

      // Secondary soft celebration bursts after 320ms
      const timer = setTimeout(() => {
        confetti({
          particleCount: 35,
          angle: 60,
          spread: 45,
          origin: { x: 0.15, y: 0.65 },
          colors: ['#10B981', '#34D399', '#FBBF24'],
          zIndex: 99999,
          ticks: 180,
        });
        confetti({
          particleCount: 35,
          angle: 120,
          spread: 45,
          origin: { x: 0.85, y: 0.65 },
          colors: ['#10B981', '#34D399', '#FBBF24'],
          zIndex: 99999,
          ticks: 180,
        });
      }, 320);

      return () => clearTimeout(timer);
    } catch (err) {
      console.warn('Confetti animation error:', err);
    }
  }, [completedPayment]);

  // Fee calculation
  const coreAmount = tax.amount || 0;
  const lateFee = (tax as any).lateFee || 0;
  const convenienceFee = (tax as any).convenienceFee || 0;
  const totalAmount = coreAmount + lateFee + convenienceFee;

  // Property ID & details
  const propertyId = (tax as any).propertyId || `GP-2026-${tax.id.slice(-5).toUpperCase().padStart(5, '0')}`;
  const ownerName = tax.citizenName || user?.name || 'Resident';
  const villageZone = (tax as any).village || tax.zone || user?.village || user?.assignedZone || 'Kolar Ward 4';

  // Generate UPI QR Code dynamically for the total amount
  useEffect(() => {
    const upiString = `upi://pay?pa=nammapanchayath@gov.in&pn=Namma%20Panchayath&am=${totalAmount}&cu=INR&tn=TaxPayment-${tax.id}`;
    QRCode.toDataURL(upiString, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [totalAmount, tax.id]);

  // Card formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
    setErrorMessage(null);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setExpiry(raw);
    }
    setErrorMessage(null);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvv(raw);
    setErrorMessage(null);
  };

  // Card brand detection
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return { brand: 'Visa', color: 'text-blue-600' };
    if (clean.startsWith('51') || clean.startsWith('52') || clean.startsWith('53') || clean.startsWith('54') || clean.startsWith('55')) {
      return { brand: 'MasterCard', color: 'text-orange-600' };
    }
    if (clean.startsWith('60') || clean.startsWith('65') || clean.startsWith('81') || clean.startsWith('82')) {
      return { brand: 'RuPay', color: 'text-emerald-700' };
    }
    if (clean.startsWith('34') || clean.startsWith('37')) {
      return { brand: 'Amex', color: 'text-sky-700' };
    }
    return { brand: 'Card', color: 'text-slate-400' };
  };

  // Validate form based on active method
  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (selectedMethod === 'UPI') {
      if (upiMode === 'id') {
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,}$/;
        if (!upiId.trim()) {
          setErrorMessage('Please enter your UPI ID (e.g. name@okhdfcbank).');
          return false;
        }
        if (!upiRegex.test(upiId.trim())) {
          setErrorMessage('Please enter a valid UPI ID (e.g. mobile@upi or name@okhdfcbank).');
          return false;
        }
      }
    } else if (selectedMethod === 'Card') {
      const cleanNum = cardNumber.replace(/\s/g, '');
      if (cleanNum.length < 15) {
        setErrorMessage('Please enter a valid 16-digit Card Number.');
        return false;
      }
      if (!cardHolder.trim()) {
        setErrorMessage('Please enter the Cardholder Name as printed on the card.');
        return false;
      }
      if (!expiry || expiry.length < 5) {
        setErrorMessage('Please enter a valid Expiry Date (MM/YY).');
        return false;
      }
      const [expMonth] = expiry.split('/').map(Number);
      if (expMonth < 1 || expMonth > 12) {
        setErrorMessage('Invalid expiry month. Month must be between 01 and 12.');
        return false;
      }
      if (!cvv || cvv.length < 3) {
        setErrorMessage('Please enter a valid 3 or 4-digit CVV security code.');
        return false;
      }
    } else if (selectedMethod === 'NetBanking') {
      if (!selectedBank) {
        setErrorMessage('Please select your Bank for Net Banking authorization.');
        return false;
      }
    }

    if (!isConfirmed) {
      setErrorMessage('Please check the confirmation box to proceed.');
      return false;
    }

    return true;
  };

  // Payment execution with backend persistence and verification
  const handleProceedPayment = async () => {
    // Prevent duplicate payment submissions
    if (processing) return;
    if (!validateForm()) return;

    setProcessing(true);
    setErrorMessage(null);
    setPaymentError(null);
    setProcessingStage('Connecting to Karnataka e-Treasury gateway...');

    let methodLabel = 'UPI (BHIM / QR)';
    if (selectedMethod === 'UPI') {
      methodLabel = upiMode === 'id' ? `UPI (${upiId.trim()})` : 'UPI (QR Code)';
    } else if (selectedMethod === 'Card') {
      const brand = getCardBrand().brand;
      const last4 = cardNumber.replace(/\s/g, '').slice(-4) || 'XXXX';
      methodLabel = `${brand} Card (ending in •••• ${last4})`;
    } else if (selectedMethod === 'NetBanking') {
      methodLabel = `Net Banking (${selectedBank})`;
    }

    try {
      // Step 1: Gateway handshake state
      await new Promise((resolve) => setTimeout(resolve, 550));
      setProcessingStage(`Authorizing ${methodLabel} payment of ₹${totalAmount.toLocaleString('en-IN')}...`);
      await new Promise((resolve) => setTimeout(resolve, 550));
      setProcessingStage('Settling dues & recording in Gram Panchayath digital treasury...');

      // Step 2: Save to backend database first (requirement: backend confirms before showing success)
      const savedPayment = await api.payTax({
        taxId: tax.id,
        amount: totalAmount,
        type: methodLabel,
      });

      if (!savedPayment || (!savedPayment.id && !savedPayment.transactionId)) {
        throw new Error('Government revenue registry did not confirm payment settlement.');
      }

      // Step 3: Notify parent to refresh list/metrics
      onSuccess(savedPayment, methodLabel);

      // Step 4: Show animated success state
      setCompletedPayment(savedPayment);
      setCompletedMethodLabel(methodLabel);
    } catch (err: any) {
      console.error('Payment failed:', err);
      // Explicitly ensure success screen is never shown on failure
      setCompletedPayment(null);
      setPaymentError({
        message: err.message || 'Payment authorization was declined or gateway timed out.',
        detail: 'No funds were debited from your account. Your property tax invoice remains unpaid.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const copyTransactionId = (txnId: string) => {
    navigator.clipboard.writeText(txnId);
    setTxCopied(true);
    setTimeout(() => setTxCopied(false), 2000);
  };

  const copyGovtUpiId = () => {
    navigator.clipboard.writeText('nammapanchayath@gov.in');
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 sm:p-6 shadow-2xl my-6 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        
        {/* ========================================================================= */}
        {/* VIEW 1: PROCESSING STATE (CLEAN LOADING ANIMATION)                        */}
        {/* ========================================================================= */}
        {processing ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 animate-fade-in my-auto">
            {/* Animated Loading Spinner with e-Governance Shield */}
            <div className="relative mb-6 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="h-20 w-20 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-emerald-600 dark:border-t-emerald-400"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              <Lock className="h-3 w-3" />
              Karnataka e-Treasury Secure Gateway
            </span>

            <h3 className="mt-3 font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
              Processing Payment...
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-[#CBD5E1] max-w-sm">
              {processingStage}
            </p>

            {/* Transaction Amount Preview */}
            <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-[#172033] px-5 py-3 border border-slate-200/80 dark:border-[#334155] shadow-xs w-full max-w-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tax Due Amount</span>
                <span className="font-display text-lg font-black text-emerald-700 dark:text-emerald-400">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                <span>Citizen</span>
                <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{ownerName}</span>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Please do not close or refresh this window while transaction is settling.
            </p>
          </div>
        ) : paymentError ? (
          /* ========================================================================= */
          /* VIEW 2: PAYMENT FAILURE STATE (PROFESSIONAL ERROR WITH RETRY OPTION)      */
          /* ========================================================================= */
          <div className="flex flex-col items-center text-center py-6 px-4 animate-fade-in my-auto">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/30">
                <AlertCircle className="h-8 w-8" />
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 px-3 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              Payment Unsuccessful
            </span>

            <h3 className="mt-3 font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
              Payment Could Not Be Completed
            </h3>
            <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 max-w-md font-medium">
              {paymentError.message}
            </p>
            {paymentError.detail && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-[#CBD5E1] max-w-sm">
                {paymentError.detail}
              </p>
            )}

            {/* Safety Assurance */}
            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-[#172033] p-3 text-left text-xs border border-slate-200 dark:border-[#334155] w-full max-w-sm">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  No tax amount was deducted from your account. Your property tax invoice of <strong>₹{totalAmount.toLocaleString('en-IN')}</strong> remains active.
                </p>
              </div>
            </div>

            {/* Action buttons with retry */}
            <div className="mt-6 flex items-center justify-center gap-3 w-full max-w-sm">
              <button
                type="button"
                id="btn_retry_tax_payment"
                onClick={() => setPaymentError(null)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 px-4 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Payment</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#243044] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : completedPayment ? (
          /* ========================================================================= */
          /* VIEW 3: MODERN PAYMENT SUCCESSFUL ANIMATION & SCREEN                      */
          /* ========================================================================= */
          <div className="flex flex-col items-center text-center py-2 animate-fade-in">
            {/* Animated Green Checkmark inside Circular Success Icon */}
            <div className="relative mb-3 flex items-center justify-center">
              {/* Outer expanding gentle pulse */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.65, 0.35] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute h-24 w-24 rounded-full bg-emerald-400/25 dark:bg-emerald-500/20 blur-xs pointer-events-none"
              />

              {/* Outer decorative ring */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute h-20 w-20 rounded-full border-2 border-emerald-400/60 dark:border-emerald-500/40"
              />

              {/* Circular Success Badge with Spring Entrance */}
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 20,
                  delay: 0.1,
                }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-600/30 ring-4 ring-emerald-100 dark:ring-emerald-950/60"
              >
                {/* Animated SVG Checkmark with path drawing animation */}
                <svg
                  className="h-8 w-8 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.28,
                      ease: "easeOut",
                    }}
                  />
                </svg>
              </motion.div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Tax Payment Recorded Successfully
            </span>

            {/* Requirement 5: Display "Payment Successful!" and "Your property tax payment has been completed successfully." */}
            <h3 className="mt-2 font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
              Payment Successful!
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] max-w-md font-medium">
              {tax.type && !tax.type.toLowerCase().includes('property')
                ? `Your ${tax.type.toLowerCase()} payment has been completed successfully.`
                : 'Your property tax payment has been completed successfully.'}
            </p>

            {/* Official Confirmation Badge */}
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Direct e-Treasury Settlement • Digital Receipt & Challan Generated</span>
            </div>

            {/* Requirement 6: Dynamic Payment Information */}
            <div className="mt-4 w-full rounded-2xl border border-slate-200/80 dark:border-[#334155] bg-slate-50/70 dark:bg-[#172033]/70 p-4 text-left text-xs shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#334155] pb-3">
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">Amount Paid</span>
                  <span className="font-display text-xl font-black text-emerald-700 dark:text-emerald-400">
                    ₹{completedPayment.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Tax Type</span>
                  <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                    {completedPayment.taxType || tax.type || 'Property Tax'}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-slate-700 dark:text-[#CBD5E1]">
                <div className="bg-white dark:bg-[#1E293B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#334155]">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Transaction ID</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC] truncate text-[11px]">
                      {completedPayment.transactionId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyTransactionId(completedPayment.transactionId)}
                      className="ml-1 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer p-0.5"
                      title="Copy Transaction ID"
                    >
                      {txCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#334155]">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Payment Date & Time</span>
                  <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] mt-0.5 text-[11px] truncate">
                    {new Date(completedPayment.paymentDate).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#334155]">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Citizen & Property</span>
                  <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] mt-0.5 text-[11px] truncate">
                    {ownerName} • {propertyId}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#334155]">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Payment Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 text-[11px]">Paid & Verified in Treasury</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirement 7 & 8: Download Receipt & Done Buttons */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 w-full pt-2">
              <button
                type="button"
                id="tax_payment_download_receipt_btn"
                onClick={() => onDownloadReceipt(completedPayment)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex-1 min-w-[150px]"
              >
                <Download className="h-4 w-4" />
                <span>Download Receipt</span>
              </button>

              <button
                type="button"
                id="tax_payment_view_receipt_btn"
                onClick={() => onViewReceipt(completedPayment)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#243044] active:scale-98 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] transition-all cursor-pointer shadow-xs flex-1 min-w-[130px]"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                <span>View Receipt</span>
              </button>

              <button
                type="button"
                id="tax_payment_done_btn"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-100 dark:bg-[#172033] hover:bg-slate-200 dark:hover:bg-[#222f47] active:scale-98 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer w-full sm:w-auto"
              >
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Done</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: DYNAMIC CHOOSE PAYMENT METHOD INTERFACE                            */
          /* ========================================================================= */
          <>
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#334155] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Choose Payment Method</h3>
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                    Secure
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5">Select your preferred payment channel to settle tax dues</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="rounded-xl p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-[#172033] hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 1. Tax Details & Bill Summary */}
            <div className="mt-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2 mb-2.5">
                <div>
                  <p className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">{tax.type}</p>
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {tax.billingPeriod.includes('Financial Year') ? tax.billingPeriod : `Billing: ${tax.billingPeriod}`}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                  Due: {tax.dueDate}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]">
                <div className="bg-white/80 dark:bg-[#1E293B] p-2 rounded-xl border border-emerald-100/70 dark:border-[#334155]">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">Property ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC] truncate block">{propertyId}</span>
                </div>
                <div className="bg-white/80 dark:bg-[#1E293B] p-2 rounded-xl border border-emerald-100/70 dark:border-[#334155]">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">Citizen</span>
                  <span className="font-bold text-slate-900 dark:text-[#F8FAFC] truncate block">{ownerName}</span>
                </div>
                <div className="bg-white/80 dark:bg-[#1E293B] p-2 rounded-xl border border-emerald-100/70 dark:border-[#334155]">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">Zone / Ward</span>
                  <span className="font-bold text-slate-900 dark:text-[#F8FAFC] truncate block">{villageZone}</span>
                </div>
                <div className="bg-white/80 dark:bg-[#1E293B] p-2 rounded-xl border border-emerald-100/70 dark:border-[#334155]">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">Total Payable</span>
                  <span className="font-display font-black text-emerald-700 dark:text-emerald-400 text-xs block">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* 2. Choose Payment Method (Radio Cards) */}
            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">Choose Payment Method</label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                
                {/* Method 1: UPI */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('UPI');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                    selectedMethod === 'UPI'
                      ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-[#243044]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selectedMethod === 'UPI' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#172033]'
                    }`}>
                      {selectedMethod === 'UPI' && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <p className={`mt-2 text-xs font-bold ${selectedMethod === 'UPI' ? 'text-emerald-950 dark:text-emerald-300' : 'text-slate-900 dark:text-[#F8FAFC]'}`}>
                    UPI
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">QR Code, GPay, PhonePe, BHIM</p>
                </button>

                {/* Method 2: Debit/Credit Card */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('Card');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                    selectedMethod === 'Card'
                      ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-[#243044]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selectedMethod === 'Card' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#172033]'
                    }`}>
                      {selectedMethod === 'Card' && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <p className={`mt-2 text-xs font-bold ${selectedMethod === 'Card' ? 'text-emerald-950 dark:text-emerald-300' : 'text-slate-900 dark:text-[#F8FAFC]'}`}>
                    Debit / Credit Card
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">Visa, MasterCard, RuPay</p>
                </button>

                {/* Method 3: Net Banking */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('NetBanking');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                    selectedMethod === 'NetBanking'
                      ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-[#243044]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selectedMethod === 'NetBanking' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#172033]'
                    }`}>
                      {selectedMethod === 'NetBanking' && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <p className={`mt-2 text-xs font-bold ${selectedMethod === 'NetBanking' ? 'text-emerald-950 dark:text-emerald-300' : 'text-slate-900 dark:text-[#F8FAFC]'}`}>
                    Net Banking
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">SBI, HDFC, ICICI & 40+ Banks</p>
                </button>

              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. CONDITIONAL FIELDS PER SELECTED METHOD                                 */}
            {/* ========================================================================= */}

            {/* A. UPI FIELDS & DYNAMIC QR CODE */}
            {selectedMethod === 'UPI' && (
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#172033]/60 p-4 transition-all">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#334155] pb-2.5 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">UPI Payment Gateway</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200 dark:border-[#334155] text-[11px]">
                    <button
                      type="button"
                      onClick={() => setUpiMode('qr')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        upiMode === 'qr' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Scan QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMode('id')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        upiMode === 'id' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Enter UPI ID
                    </button>
                  </div>
                </div>

                {upiMode === 'qr' ? (
                  /* Dynamic QR Code View */
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/80 dark:border-[#334155]">
                    <div className="relative flex flex-col items-center bg-white p-2.5 rounded-2xl border-2 border-emerald-500/30 shadow-md">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Dynamic UPI Payment QR Code"
                          className="h-36 w-36 rounded-lg"
                        />
                      ) : (
                        <div className="h-36 w-36 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400 text-xs">
                          Generating QR...
                        </div>
                      )}
                      <span className="mt-1.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Scan with Any UPI App
                      </span>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                        Scan & Pay <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">₹{totalAmount.toLocaleString('en-IN')}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-1">
                        Use Google Pay, PhonePe, Paytm, BHIM, or any banking app to scan this dynamically generated tax payment QR.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#172033] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#334155] text-[10px] font-mono text-slate-600 dark:text-[#CBD5E1]">
                          <span>nammapanchayath@gov.in</span>
                          <button
                            type="button"
                            onClick={copyGovtUpiId}
                            className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                            title="Copy UPI ID"
                          >
                            {upiCopied ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Zero surcharge</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* UPI ID Input View */
                  <div className="space-y-3 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/80 dark:border-[#334155]">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Enter UPI ID / Virtual Payment Address (VPA)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => {
                            setUpiId(e.target.value);
                            setErrorMessage(null);
                          }}
                          placeholder="e.g. yourname@okhdfcbank or 9876543210@upi"
                          className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>
                    </div>

                    {/* Quick suffix chips */}
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mb-1.5">Quick Handles:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['@okhdfcbank', '@okaxis', '@oksbi', '@paytm', '@ybl', '@upi'].map((handle) => (
                          <button
                            key={handle}
                            type="button"
                            onClick={() => {
                              const base = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'user';
                              setUpiId(`${base}${handle}`);
                              setErrorMessage(null);
                            }}
                            className="rounded-lg bg-slate-50 dark:bg-[#172033] border border-slate-200 dark:border-[#334155] px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-300 dark:hover:border-emerald-800 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                          >
                            {handle}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. CARD PAYMENT FIELDS */}
            {selectedMethod === 'Card' && (
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#172033]/60 p-4 transition-all space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#334155] pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">Debit / Credit Card Details</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span>{getCardBrand().brand}</span>
                  </div>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4532 •••• •••• 8892"
                      maxLength={19}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 font-mono text-xs font-bold text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-[11px]">
                      <span className={getCardBrand().color}>{getCardBrand().brand}</span>
                    </div>
                  </div>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => {
                      setCardHolder(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Name as printed on card"
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry Date (MM/YY)</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={handleExpiryChange}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 font-mono text-xs font-bold text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CVV / Security Code</label>
                    <div className="relative">
                      <input
                        type={showCvv ? 'text' : 'password'}
                        value={cvv}
                        onChange={handleCvvChange}
                        placeholder="•••"
                        maxLength={4}
                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 font-mono text-xs font-bold text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvv(!showCvv)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* C. NET BANKING FIELDS */}
            {selectedMethod === 'NetBanking' && (
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#172033]/60 p-4 transition-all space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#334155] pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">Select Bank for Net Banking</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/50">
                    Instant Redirection
                  </span>
                </div>

                {/* Popular Banks Grid */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">Popular Banks</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {POPULAR_BANKS.map((b) => {
                      const isBankSelected = selectedBank === b.name;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBank(b.name);
                            setErrorMessage(null);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isBankSelected
                              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-2xs'
                              : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-[#243044]'
                          }`}
                        >
                          <div className={`flex h-6 w-6 items-center justify-center rounded-lg text-[9px] font-black text-white ${b.color}`}>
                            {b.short}
                          </div>
                          <span className={`text-[11px] font-bold truncate ${isBankSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-700 dark:text-[#CBD5E1]'}`}>
                            {b.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* All Banks Dropdown */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Or Select From All Indian Banks</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      setSelectedBank(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <optgroup label="Popular Banks">
                      {POPULAR_BANKS.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other Scheduled Banks">
                      {ALL_OTHER_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )}

            {/* Error Message banner */}
            {errorMessage && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <label className="mt-4 flex items-start gap-2.5 cursor-pointer rounded-2xl border border-slate-200/80 dark:border-[#334155] bg-slate-50/80 dark:bg-[#172033]/60 p-3 hover:bg-slate-100/80 dark:hover:bg-[#172033] transition-colors">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => {
                  setIsConfirmed(e.target.checked);
                  if (e.target.checked) setErrorMessage(null);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer accent-emerald-600"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                I confirm that the property details, zone info, and tax amount of <strong className="text-slate-900 dark:text-[#F8FAFC]">₹{totalAmount.toLocaleString('en-IN')}</strong> are accurate for this simulated payment.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProceedPayment}
                disabled={processing}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white transition-all shadow-md ${
                  processing
                    ? 'bg-slate-400 dark:bg-slate-600 cursor-wait shadow-none'
                    : selectedMethod === 'UPI'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer active:scale-98'
                    : selectedMethod === 'Card'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 cursor-pointer active:scale-98'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 cursor-pointer active:scale-98'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>
                  {processing
                    ? 'Processing Simulation...'
                    : selectedMethod === 'UPI'
                    ? `Proceed to Pay ₹${totalAmount.toLocaleString('en-IN')}`
                    : selectedMethod === 'Card'
                    ? `Pay ₹${totalAmount.toLocaleString('en-IN')} via Card`
                    : `Proceed to ${selectedBank || 'Bank'}`}
                </span>
                {!processing && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
