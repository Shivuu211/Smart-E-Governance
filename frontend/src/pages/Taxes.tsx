import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  Coins,
  Plus,
  TrendingUp,
  Download,
  AlertCircle,
  CheckCircle,
  FileText,
  Printer,
  ChevronRight,
  Sparkles,
  Search,
  Wallet,
  ShieldCheck,
  Lock,
  Building,
  CreditCard,
  Smartphone,
  Building2,
  Check,
  QrCode,
  Landmark,
  X,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Tax, Payment } from '../types';
import TaxPaymentModal from '../components/TaxPaymentModal';
import { sanitizeDateYear, validate4DigitYear } from '../utils/dateValidation';
import svgLogo from '../assets/images/namma_panchayath_logo.svg';

let cachedLogoDataUrl: string = '';

const getPanchayatLogoDataUrl = (): Promise<string> => {
  if (cachedLogoDataUrl) return Promise.resolve(cachedLogoDataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          cachedLogoDataUrl = canvas.toDataURL('image/png');
          resolve(cachedLogoDataUrl);
        } else {
          resolve('');
        }
      } catch (err) {
        resolve('');
      }
    };
    img.onerror = () => {
      fetch(svgLogo)
        .then(r => r.text())
        .then(svgStr => {
          const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(fallbackImg, 0, 0, 400, 400);
              cachedLogoDataUrl = canvas.toDataURL('image/png');
              URL.revokeObjectURL(url);
              resolve(cachedLogoDataUrl);
            } else {
              URL.revokeObjectURL(url);
              resolve('');
            }
          };
          fallbackImg.onerror = () => {
            URL.revokeObjectURL(url);
            resolve('');
          };
          fallbackImg.src = url;
        })
        .catch(() => resolve(''));
    };
    img.src = svgLogo;
  });
};

const cleanAsciiText = (text: any): string => {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[^\x00-\x7F]/g, '').trim();
};

export default function Taxes() {
  const { user } = useAuth();
  const cachedTaxes = api.getCachedSync('taxes');
  const cachedPayments = api.getCachedSync('payments');
  const [taxes, setTaxes] = useState<Tax[]>(cachedTaxes || []);
  const [payments, setPayments] = useState<Payment[]>(cachedPayments || []);
  const [citizens, setCitizens] = useState<any[]>([]);
  const [loading, setLoading] = useState(!cachedTaxes);

  // Billing states (Officer)
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [billType, setBillType] = useState<'Property Tax' | 'Water Tax' | 'House Tax'>('Property Tax');
  const [billAmount, setBillAmount] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('FY 2026-27');
  const [dueDate, setDueDate] = useState('');
  const [targetCitizenId, setTargetCitizenId] = useState('all');
  const [generating, setGenerating] = useState(false);

  // Deletion state (Officer ONLY)
  const [deleteTarget, setDeleteTarget] = useState<Tax | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Payment states (Citizen)
  const [activePaymentTax, setActivePaymentTax] = useState<Tax | null>(null);

  // Receipt printable state
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const taxList = await api.getTaxes();
      const payList = await api.getPayments();
      if (taxList) setTaxes(taxList);
      if (payList) setPayments(payList);

      if (user?.role === 'officer' || user?.role === 'admin') {
        const citizenList = await api.getCitizens();
        if (citizenList) setCitizens(citizenList);
      }
    } catch (err) {
      console.error('Error loading taxes data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billAmount || !dueDate) {
      alert('Please specify amount and due date.');
      return;
    }

    const dueErr = validate4DigitYear(dueDate, 1900, 2099, 'Due Date');
    if (dueErr) {
      alert(dueErr);
      return;
    }

    setGenerating(true);
    try {
      const res = await api.generateTaxBills({
        type: billType,
        amount: Number(billAmount),
        billingPeriod,
        dueDate,
        citizenId: targetCitizenId,
      });
      alert(res.message || 'Tax bills generated successfully.');
      setShowGenerateModal(false);
      setBillAmount('');
      setDueDate('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error generating bills.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: Payment, methodLabel: string) => {
    try {
      await loadData();
    } catch (err) {
      console.error('Error reloading taxes after payment:', err);
    }
  };

  const handleDeleteTax = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTax(deleteTarget.id);
      setTaxes(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete tax record.');
    } finally {
      setDeleting(false);
    }
  };

  const downloadReceiptPDF = async (rec: Payment) => {
    if (!rec) return;
    const taxCategory = (rec as any).taxType || rec.type || 'Public Utility Tax';
    const period = (rec as any).billingPeriod || 'FY 2026-27';
    const dateStr = rec.paymentDate ? new Date(rec.paymentDate).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
    const zoneStr = rec.zone || user?.village || user?.assignedZone || 'Bengaluru South';

    try {
      const logoData = await getPanchayatLogoDataUrl();

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Outer Card Background Frame
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 15, 180, 248, 6, 6, 'FD');

      // Header Top Bar
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.roundedRect(15, 15, 180, 12, 6, 6, 'F');
      doc.rect(15, 21, 180, 6, 'F');

      // Official Namma Panchayath Logo on Top Left
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', 20, 29, 22, 22);
        } catch (err) {
          console.warn('Could not render logo in tax receipt PDF:', err);
        }
      }

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('NAMMA PANCHAYATH TAX RECEIPT', 114, 37, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Department of Rural Development & Panchayat Raj • Government of Karnataka', 114, 43, { align: 'center' });
      doc.text('Gram Panchayat Namma Panchayath - Revenue & Tax Collection Division', 114, 48, { align: 'center' });

      // Verification Badge
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(52, 52, 124, 8, 2.5, 2.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text('OFFICIAL DIGITAL TAX RECEIPT (VERIFIED & RECORDED)', 114, 57.5, { align: 'center' });

      // Separator Line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(22, 64, 188, 64);

      // Data Rows
      const rows = [
        ['Transaction ID:', cleanAsciiText(rec.transactionId || '')],
        ['Citizen / Owner Name:', cleanAsciiText(rec.citizenName || user?.name || 'Resident')],
        ['Tax Category:', cleanAsciiText(taxCategory)],
        ['Billing Period:', cleanAsciiText(period)],
        ['Jurisdiction / Ward:', cleanAsciiText(zoneStr)],
        ['Payment Date & Time:', cleanAsciiText(dateStr)],
        ['Payment Mode / Channel:', cleanAsciiText(rec.type || 'UPI (QR Code)')],
        ['Payment Status:', 'PAID • VERIFIED BY E-GRAM TREASURY (DEMO)'],
      ];

      let yPos = 74;
      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(label, 26, yPos);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(value, 94, yPos);

        yPos += 3.2;
        doc.setDrawColor(241, 245, 249);
        doc.line(26, yPos, 184, yPos);
        yPos += 9;
      });

      // Total Paid Amount Box
      yPos += 2;
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(187, 247, 208); // emerald-200
      doc.roundedRect(26, yPos, 158, 22, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(22, 101, 52); // emerald-800
      doc.text('Total Amount Paid:', 34, yPos + 13.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(21, 128, 61); // emerald-700
      doc.text(`RS. ${rec.amount.toLocaleString('en-IN')}`, 176, yPos + 13.5, { align: 'right' });

      // Verification Stamp Box at Bottom with Logo
      yPos += 28;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(26, yPos, 158, 18, 3, 3, 'FD');

      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', 30, yPos + 2.5, 13, 13);
        } catch (e) {}
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(22, 101, 52);
      doc.text('DIGITALLY AUTHENTICATED & SETTLED IN REVENUE TREASURY', 114, yPos + 7, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`e-Gram Panchayath Revenue System | TXN: ${cleanAsciiText(rec.transactionId || 'PAID')} | Digital Challan`, 114, yPos + 12.5, { align: 'center' });

      // Note & Footer
      yPos += 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated tax challan issued by Namma Panchayath Digital Governance Platform.', 105, yPos, { align: 'center' });
      doc.text('Simulated sandbox demonstration receipt. Retain for official reference and property file.', 105, yPos + 4.5, { align: 'center' });

      // Trigger download
      const fileName = `Tax_Receipt_${cleanAsciiText(rec.transactionId || 'Payment')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  const handlePrintReceipt = () => {
    if (activeReceipt) {
      downloadReceiptPDF(activeReceipt);
    }
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const unpaidTaxes = taxes.filter(t => t.status === 'Unpaid');
  const paidTaxesCount = taxes.filter(t => t.status === 'Paid').length;
  const totalOutstanding = unpaidTaxes.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Title block */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-[#F8FAFC]">Gram Tax & Revenue Desk</h2>
          <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Track and settle public utility rates securely</p>
        </div>
        {user?.role === 'officer' && (
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-blue-700/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Generate Bills
          </button>
        )}
      </div>

      {/* Overview summaries */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Coins className="h-5 w-5" />
          </div>
          <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">
            {user?.role === 'citizen' ? 'Outstanding Dues' : 'Unpaid Dues'}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-[#F8FAFC]">₹{totalOutstanding}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">Settled Bills</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-[#F8FAFC]">{paidTaxesCount} Bills</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">Revenue Stream Status</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-[#F8FAFC]">100% Secure</p>
        </div>
      </div>

      {/* Core Tax List and History */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Outstanding invoices */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Bills Overview</span>
            
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
            ) : taxes.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">No active bills found.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {taxes.map(tax => (
                  <div
                    key={tax.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 dark:border-[#334155] bg-slate-50/50 dark:bg-[#172033]/80 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">{tax.type}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border tracking-wide ${
                          tax.status === 'Paid' 
                            ? 'status-badge-paid bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-500/60 shadow-xs' 
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                        }`}>
                          {tax.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                        Resident: {tax.citizenName} • Period: {tax.billingPeriod} • Due: {tax.dueDate}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="font-display text-sm font-extrabold text-slate-800 dark:text-[#F8FAFC]">₹{tax.amount.toLocaleString('en-IN')}</span>
                      {user?.role === 'citizen' && tax.status === 'Unpaid' && (
                        <button
                          onClick={() => setActivePaymentTax(tax)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/15 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Pay Bill</span>
                        </button>
                      )}
                      {tax.status === 'Paid' && (
                        <button
                          onClick={() => {
                            const match = payments.find(p => p.taxId === tax.id);
                            if (match) {
                              setActiveReceipt({
                                ...match,
                                taxType: tax.type,
                                billingPeriod: tax.billingPeriod,
                              } as any);
                            } else {
                              setActiveReceipt({
                                id: `receipt_${tax.id}`,
                                taxId: tax.id,
                                citizenId: tax.citizenId || '',
                                citizenName: tax.citizenName || user?.name || 'Resident',
                                amount: tax.amount,
                                type: 'UPI / Online Payment',
                                taxType: tax.type,
                                billingPeriod: tax.billingPeriod,
                                paymentDate: (tax as any).updatedAt || new Date().toISOString(),
                                transactionId: `TXN_PAID_${tax.id.slice(-6).toUpperCase()}`,
                              } as any);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Printer className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                          <span>Print Receipt</span>
                        </button>
                      )}
                      {user?.role === 'officer' && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(tax)}
                          title="Delete tax record (Officer Only)"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment receipts list */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Transaction History</span>
            <div className="mt-3 max-h-80 overflow-y-auto flex flex-col gap-2">
              {payments.length === 0 ? (
                <p className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">No payment receipts yet.</p>
              ) : (
                payments.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setActiveReceipt(p)}
                    className="cursor-pointer rounded-xl border border-slate-100 dark:border-[#334155] bg-slate-50/40 dark:bg-[#172033]/60 p-3 hover:bg-slate-50 dark:hover:bg-[#172033] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">₹{p.amount.toLocaleString('en-IN')} Paid</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </span>
                    </div>
                    {p.citizenName && (
                      <p className="mt-0.5 text-[10px] font-medium text-slate-600 dark:text-[#CBD5E1] truncate">{p.citizenName}</p>
                    )}
                    <p className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">{p.transactionId}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                      <FileText className="h-3 w-3" />
                      View Payment Details
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Payment Modal with UPI / Card / Net Banking */}
      {activePaymentTax && (
        <TaxPaymentModal
          tax={activePaymentTax}
          user={user}
          onClose={() => setActivePaymentTax(null)}
          onSuccess={handlePaymentSuccess}
          onDownloadReceipt={downloadReceiptPDF}
          onViewReceipt={(payment) => {
            setActivePaymentTax(null);
            setActiveReceipt(payment);
          }}
        />
      )}

      {/* Receipt View Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="printable-certificate w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl my-6">
            <div className="text-center border-b border-slate-100 dark:border-[#334155] pb-4">
              <div className="flex justify-center mb-3">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-500/40 bg-[#FDFBF7] p-1 shadow-md">
                  <img
                    src={svgLogo}
                    alt="Namma Panchayath Official Logo"
                    className="h-full w-full object-contain rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <span className="text-[10px] font-mono font-extrabold text-[#1E3A8A] dark:text-blue-400 block uppercase tracking-wider">
                GOVERNMENT OF KARNATAKA
              </span>
              <h4 className="font-display text-base font-extrabold text-slate-800 dark:text-[#F8FAFC] mt-0.5">
                NAMMA PANCHAYATH TAX RECEIPT
              </h4>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                Department of Rural Development &amp; Panchayat Raj
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                OFFICIAL DIGITAL TAX RECEIPT (VERIFIED &amp; RECORDED)
              </div>
            </div>

            <div className="my-5 flex flex-col gap-2.5 text-xs text-slate-600 dark:text-[#CBD5E1] leading-normal">
              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-[#334155]/50">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Transaction ID</span>
                <span className="font-mono font-bold text-slate-800 dark:text-[#F8FAFC]">{activeReceipt.transactionId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-[#334155]/50">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Citizen Name</span>
                <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{activeReceipt.citizenName}</span>
              </div>
              {((activeReceipt as any).taxType || activeReceipt.type) && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-[#334155]/50">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Tax Category</span>
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{(activeReceipt as any).taxType || activeReceipt.type}</span>
                </div>
              )}
              {(activeReceipt as any).billingPeriod && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-[#334155]/50">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Billing Period</span>
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{(activeReceipt as any).billingPeriod}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-[#334155]/50">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Payment Date & Time</span>
                <span className="font-medium text-slate-800 dark:text-[#F8FAFC]">
                  {activeReceipt.paymentDate ? new Date(activeReceipt.paymentDate).toLocaleString('en-IN') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-[#334155]/50">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Payment Mode</span>
                <span className="font-medium text-slate-800 dark:text-[#F8FAFC]">{activeReceipt.type || 'UPI / Online Payment'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-[#334155]/50">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Payment Status</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">Paid • Verified & Settled (Demo)</span>
              </div>
              <div className="flex justify-between items-center border-t-2 border-slate-100 dark:border-[#334155] pt-3 mt-1">
                <span className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Total Amount Paid</span>
                <span className="font-display font-black text-emerald-700 dark:text-emerald-400 text-lg">₹{activeReceipt.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-2.5 text-center">
                <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase">
                  ✓ OFFICIAL NAMMA PANCHAYATH TAX RECEIPT (VERIFIED)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 no-print pt-2 border-t border-slate-100 dark:border-[#334155]">
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-4 py-2 text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => downloadReceiptPDF(activeReceipt)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-md shadow-emerald-600/15"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill generation modal (Officer) */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl">
            <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC]">Generate Tax Invoice</h3>
            <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Issue a public utility tax invoice for a specific resident or bulk generation</p>

            <form onSubmit={handleGenerateBills} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Resident / Citizen</label>
                <select
                  value={targetCitizenId}
                  onChange={(e) => setTargetCitizenId(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="all">All Registered Citizens (Bulk)</option>
                  {citizens.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tax Type</label>
                <select
                  value={billType}
                  onChange={(e: any) => setBillType(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="Property Tax">Property Tax</option>
                  <option value="Water Tax">Water Tax</option>
                  <option value="House Tax">House Tax</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="e.g. 450"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Billing Period</label>
                <input
                  type="text"
                  required
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  placeholder="e.g. FY 2026-27"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Due Date</label>
                <input
                  type="date"
                  required
                  min="1900-01-01"
                  max="2099-12-31"
                  value={dueDate}
                  onChange={(e) => setDueDate(sanitizeDateYear(e.target.value))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500"
                />
              </div>

              <div className="mt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-4 py-2 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  {generating ? 'Processing Ledger...' : 'Dispatch Invoices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Officer Deleting Tax Bill */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Confirm Tax Bill Deletion</h3>
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Officer Authorization Required</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                Are you sure you want to permanently delete the <strong>{deleteTarget.type}</strong> bill of{' '}
                <strong className="text-rose-900 dark:text-rose-400 font-bold">₹{deleteTarget.amount.toLocaleString('en-IN')}</strong> issued to{' '}
                <strong>{deleteTarget.citizenName || 'Resident'}</strong> ({deleteTarget.billingPeriod})?
              </p>
              <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                This record will be permanently deleted from the Gram Panchayat tax register.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-4 py-2 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTax}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
