import React from 'react';
import {
  X,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  QrCode,
  Printer,
  Check,
  ExternalLink,
  Lock,
  Calendar,
  User,
  CreditCard,
  FileCheck
} from 'lucide-react';

export interface PreviewDocData {
  docName: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string;
  citizenName?: string;
  schemeName?: string;
  uploadedAt?: string;
}

interface DocumentPreviewModalProps {
  doc: PreviewDocData | null;
  onClose: () => void;
  onVerifyToggle?: (docName: string, isVerified: boolean) => void;
  isVerified?: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  doc,
  onClose,
  onVerifyToggle,
  isVerified = true
}) => {
  if (!doc) return null;

  const handleDownload = () => {
    if (doc.fileData && doc.fileData.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = doc.fileData;
      link.download = doc.fileName || `${doc.docName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Generate synthetic document text download for mock files
      const textContent = `NAMMA PANCHAYATH OFFICIAL E-VERIFIED DOCUMENT RECORD\n\nDocument Category: ${doc.docName}\nFile Name: ${doc.fileName || doc.docName + '.pdf'}\nCitizen Name: ${doc.citizenName || 'Resident'}\nScheme: ${doc.schemeName || 'Welfare Scheme'}\nVerification Hash: GP-HASH-2026-${Math.floor(100000 + Math.random() * 900000)}\nStatus: VERIFIED BY PANCHAYATH DEVELOPMENT OFFICER (PDO)\nDate: ${new Date().toLocaleString()}`;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.docName.replace(/\s+/g, '_')}_Verified_Record.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const isBase64Image = doc.fileData?.startsWith('data:image');
  const isBase64Pdf = doc.fileData?.startsWith('data:application/pdf');

  // Helper to render realistic document card templates
  const renderDocTemplate = () => {
    const docType = doc.docName.toLowerCase();
    const citizen = doc.citizenName || 'Priya Shinde';

    if (docType.includes('aadhaar')) {
      return (
        <div className="rounded-2xl border-2 border-slate-300 dark:border-[#334155] bg-gradient-to-b from-orange-50/50 via-white to-emerald-50/50 dark:from-orange-950/30 dark:via-[#1E293B] dark:to-emerald-950/30 p-5 shadow-inner">
          {/* Aadhaar Header */}
          <div className="flex items-center justify-between border-b-2 border-orange-500/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white font-black text-xs shadow-sm">
                GOI
              </div>
              <div>
                <p className="font-extrabold text-xs text-slate-800 dark:text-[#F8FAFC] tracking-tight">भारत सरकार • GOVERNMENT OF INDIA</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Unique Identification Authority of India</p>
              </div>
            </div>
            <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
              E-AADHAAR VERIFIED
            </span>
          </div>

          {/* Body */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-100 dark:bg-[#111827] p-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-300 dark:bg-[#243044] text-slate-600 dark:text-slate-300 font-bold text-xl">
                {citizen.charAt(0)}
              </div>
              <span className="mt-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Biometric Verified</span>
            </div>

            <div className="sm:col-span-2 space-y-1.5 text-xs text-slate-700 dark:text-[#CBD5E1]">
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">Name / नाम:</span> <strong className="text-slate-900 dark:text-[#F8FAFC]">{citizen}</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">DOB / जन्म तिथि:</span> <strong className="text-slate-800 dark:text-[#F8FAFC]">14/08/1992</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">Gender / लिंग:</span> <strong className="text-slate-800 dark:text-[#F8FAFC]">Female / महिला</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">Address / पता:</span> Gram Panchayath House #42, Main Rd, Bengaluru South Zone</p>
              
              <div className="mt-3 rounded-lg bg-slate-900 dark:bg-black px-3 py-2 text-white font-mono font-bold text-center text-sm tracking-widest shadow-sm border border-slate-800 dark:border-[#334155]">
                XXXX - XXXX - 7821
              </div>
            </div>
          </div>

          {/* Footer watermark */}
          <div className="mt-4 border-t border-slate-200 dark:border-[#334155] pt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>मेरा आधार, मेरी पहचान</span>
            <div className="flex items-center gap-1 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              <QrCode className="h-4 w-4" /> SHA-256 Validated
            </div>
          </div>
        </div>
      );
    }

    if (docType.includes('income')) {
      return (
        <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700/50 bg-gradient-to-b from-amber-50/60 via-white to-amber-50/20 dark:from-amber-950/30 dark:via-[#1E293B] dark:to-amber-950/20 p-5 shadow-inner">
          <div className="text-center border-b border-amber-200 dark:border-amber-800/60 pb-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs shadow-sm mb-1">
              <Building2 className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-[#F8FAFC] uppercase tracking-wide">DEPARTMENT OF REVENUE & LAND RECORDS</h4>
            <p className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">Official Annual Family Income Certificate (Form No. 16A)</p>
          </div>

          <div className="mt-4 space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed bg-white/80 dark:bg-[#111827]/80 p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Certificate No: <strong className="text-slate-800 dark:text-[#F8FAFC] font-mono">REV/INC/2026/78102</strong></p>
            <p>
              This is to certify that as per Gram Revenue Inspection records, the total annual family income of 
              <strong className="text-slate-900 dark:text-[#F8FAFC] font-bold mx-1">{citizen}</strong> 
              residing at Ward No. 4, Gram Panchayath Jurisdiction, from all agricultural and employment sources is:
            </p>
            <div className="my-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 p-2 text-center">
              <span className="text-base font-extrabold text-amber-900 dark:text-amber-200">₹ 1,80,000 / Year</span>
              <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">(Rupees One Lakh Eighty Thousand Only)</p>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">Valid for Financial Year 2026-2027 under Government Welfare Norms.</p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-amber-200 dark:border-amber-800/60 pt-3">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">Issued By: Revenue Inspector</p>
              <p>Gram Panchayath Revenue Office</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
              <CheckCircle2 className="h-4 w-4" /> Digital Seal Attached
            </div>
          </div>
        </div>
      );
    }

    if (docType.includes('ration')) {
      return (
        <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700/50 bg-gradient-to-b from-blue-50/60 via-white to-blue-50/20 dark:from-blue-950/30 dark:via-[#1E293B] dark:to-blue-950/20 p-5 shadow-inner">
          <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs">
                NFSA
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-[#F8FAFC]">FOOD & CIVIL SUPPLIES DEPARTMENT</h4>
                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">Priority Household (BPL) Smart Ration Card</p>
              </div>
            </div>
            <span className="rounded bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60">
              BPL ACTIVE
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-700 dark:text-[#CBD5E1] bg-white dark:bg-[#111827] p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Card Number</p>
              <p className="font-mono font-bold text-slate-800 dark:text-[#F8FAFC]">RC-BPL-2026-9041</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Head of Family</p>
              <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{citizen}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Family Members</p>
              <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">4 Registered Units</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Fair Price Shop (FPS)</p>
              <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">Gram Panchayath FPS #12</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-blue-100 dark:border-[#334155] pt-2">
            <span>Subsidized Grain & Subsidy Eligible</span>
            <span className="font-mono text-blue-700 dark:text-blue-400 font-semibold">Verified via ePDS Portal</span>
          </div>
        </div>
      );
    }

    if (docType.includes('bank') || docType.includes('passbook')) {
      return (
        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/50 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-[#1E293B] dark:to-emerald-950/20 p-5 shadow-inner">
          <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-xs">
                SBI
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-[#F8FAFC]">STATE BANK OF INDIA</h4>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">Savings Bank Passbook Front Page Statement</p>
              </div>
            </div>
            <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
              DBT ACTIVE
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-700 dark:text-[#CBD5E1] bg-white dark:bg-[#111827] p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Account Holder</p>
              <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{citizen}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Account Number</p>
              <p className="font-mono font-bold text-slate-800 dark:text-[#F8FAFC]">XXXX XXXX 4102</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">IFSC Code</p>
              <p className="font-mono font-bold text-slate-800 dark:text-[#F8FAFC]">SBIN0001234</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Branch Location</p>
              <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">Panchayath Rural Branch</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-emerald-100 dark:border-[#334155] pt-2">
            <span>Direct Benefit Transfer (DBT) Aadhaar Seeded</span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">NPCI Validated</span>
          </div>
        </div>
      );
    }

    if (docType.includes('photo') || docType.includes('passport')) {
      return (
        <div className="rounded-2xl border-2 border-indigo-300 dark:border-indigo-700/50 bg-gradient-to-b from-indigo-50/60 via-white to-indigo-50/20 dark:from-indigo-950/30 dark:via-[#1E293B] dark:to-indigo-950/20 p-5 text-center shadow-inner">
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-[#F8FAFC] uppercase tracking-wider">OFFICIAL PASSPORT SIZE PHOTOGRAPH</h4>
          <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold mb-4">Biometric Resident Identification Picture</p>

          <div className="mx-auto flex h-36 w-32 items-center justify-center rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-indigo-100 dark:bg-indigo-950/50 shadow-md">
            <div className="flex flex-col items-center gap-1">
              <User className="h-16 w-16 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300">{citizen}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 py-1.5 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> High-Resolution Biometric Photo Verified
          </div>
        </div>
      );
    }

    // Default Document Template
    return (
      <div className="rounded-2xl border-2 border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#334155] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-[#F8FAFC]">{doc.docName}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Official Resident Submitted Record</p>
            </div>
          </div>
          <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            E-RECORD VALIDATED
          </span>
        </div>

        <div className="mt-4 space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] bg-slate-50 dark:bg-[#111827] p-3.5 rounded-xl border border-slate-200 dark:border-[#334155]">
          <p><span className="text-slate-500 dark:text-slate-400 font-medium">Document Name:</span> <strong className="text-slate-800 dark:text-[#F8FAFC]">{doc.docName}</strong></p>
          <p><span className="text-slate-500 dark:text-slate-400 font-medium">File Name:</span> <strong className="font-mono text-slate-800 dark:text-[#F8FAFC]">{doc.fileName || `${doc.docName}.pdf`}</strong></p>
          <p><span className="text-slate-500 dark:text-slate-400 font-medium">Submitted By:</span> <strong className="text-slate-800 dark:text-[#F8FAFC]">{citizen}</strong></p>
          <p><span className="text-slate-500 dark:text-slate-400 font-medium">Application Scheme:</span> <strong className="text-slate-800 dark:text-[#F8FAFC]">{doc.schemeName || 'Gram Panchayath Welfare'}</strong></p>
          <p><span className="text-slate-500 dark:text-slate-400 font-medium">Verification Hash:</span> <strong className="font-mono text-xs text-blue-700 dark:text-blue-400">GP-2026-VERIFIED-49210</strong></p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#334155] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="rounded bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[9px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                  Officer Inspection Console
                </span>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC] mt-0.5">
                  Document Viewer: {doc.docName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Applicant: <strong className="text-slate-800 dark:text-[#F8FAFC]">{doc.citizenName || 'Priya Shinde'}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Meta Info Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50/80 dark:bg-[#111827] p-3 text-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{doc.fileName || `${doc.docName.replace(/\s+/g, '_')}_Verified.pdf`}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{doc.fileSize || '340 KB'} • Uploaded via Citizen Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                  <Check className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 text-[11px] font-extrabold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60">
                  <AlertTriangle className="h-3.5 w-3.5" /> Flagged
                </span>
              )}
            </div>
          </div>

          {/* Document Content View Box */}
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Authentic Digital Verification Record
            </p>

            {isBase64Image ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 dark:border-[#334155] bg-slate-900/90 dark:bg-black/90 p-4 shadow-inner">
                <img
                  src={doc.fileData}
                  alt={doc.docName}
                  className="max-h-[380px] w-auto rounded-xl object-contain shadow-2xl border border-white/20"
                />
                <span className="mt-3 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                  ✓ High-Resolution Citizen Attachment
                </span>
              </div>
            ) : isBase64Pdf ? (
              <iframe
                src={doc.fileData}
                title={doc.docName}
                className="w-full h-80 rounded-2xl border-2 border-slate-200 dark:border-[#334155] shadow-inner"
              />
            ) : (
              renderDocTemplate()
            )}
          </div>
        </div>

        {/* Footer Quick Controls */}
        <div className="mt-6 border-t border-slate-100 dark:border-[#334155] pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#243044] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#334155] transition-all shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Download File
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
