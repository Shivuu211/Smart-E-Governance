import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileSignature,
  FileCheck2,
  Plus,
  Compass,
  Printer,
  FileText,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Download,
  Check,
  X,
  Upload,
  Paperclip,
  FileCheck,
  Eye,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Certificate } from '../types';
import { getZoneOfficerDesignation } from '../utils/zoneUtils';
import { sanitizeDateYear, validate4DigitYear } from '../utils/dateValidation';
import { sanitizeNameInput, validateName } from '../utils/nameValidation';
import svgLogo from '../assets/images/namma_panchayath_logo.svg';

let cachedLogoDataUrl: string = '';

const getPanchayathLogoDataUrl = (): Promise<string> => {
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

const CERTIFICATE_DOCUMENTS: Record<'Residence' | 'Birth' | 'Income' | 'Marriage', Array<{ id: string; name: string; description: string; mandatory: boolean }>> = {
  Residence: [
    { id: 'id_proof', name: 'Identity & Address Proof', description: 'Aadhaar Card, Voter ID, or Driving License', mandatory: true },
    { id: 'stay_proof', name: 'Proof of Local Residence', description: 'Electricity Bill, Water Bill, or Property Tax Receipt', mandatory: true },
    { id: 'ration_card', name: 'Ration Card / BPL Card', description: 'Front & Back Page Copy', mandatory: false },
    { id: 'self_decl', name: 'Self-Declaration Form / Passport Photo', description: 'Signed Self-Declaration or Passport Size Photo', mandatory: true },
  ],
  Birth: [
    { id: 'hospital_slip', name: 'Hospital Birth Slip / Discharge Record', description: 'Issued by Hospital / Primary Health Center', mandatory: true },
    { id: 'father_id', name: "Father's ID Proof", description: "Father's Aadhaar Card or Voter ID", mandatory: true },
    { id: 'mother_id', name: "Mother's ID Proof", description: "Mother's Aadhaar Card or Voter ID", mandatory: true },
    { id: 'marriage_cert', name: "Parents' Marriage Proof", description: "Marriage Certificate or Joint Photo Proof", mandatory: false },
  ],
  Income: [
    { id: 'applicant_id', name: 'Aadhaar Card of Family Head', description: 'Aadhaar Card showing local residential address', mandatory: true },
    { id: 'income_proof', name: 'Salary Slip / Form 16 / Land RTC Record', description: 'Employer Salary Certificate or Agricultural Land RTC', mandatory: true },
    { id: 'bank_statement', name: 'Bank Passbook / Statement', description: 'Last 6 Months Bank Transactions Copy', mandatory: true },
    { id: 'affidavit', name: 'Income Declaration Affidavit', description: 'Self-attested affidavit stating total family income', mandatory: true },
  ],
  Marriage: [
    { id: 'groom_id', name: "Groom's ID & Age Proof", description: "Groom's Aadhaar Card, Birth Certificate, or Marksheet", mandatory: true },
    { id: 'bride_id', name: "Bride's ID & Age Proof", description: "Bride's Aadhaar Card, Birth Certificate, or Marksheet", mandatory: true },
    { id: 'marriage_invitation', name: 'Wedding Invitation Card / Hall Receipt', description: 'Marriage Invitation Card or Marriage Hall Receipt', mandatory: true },
    { id: 'joint_photo', name: 'Joint Marriage Photo', description: 'Post-wedding Couple Joint Passport / Full Photo', mandatory: true },
    { id: 'witness_id', name: 'Two Witnesses ID Proof', description: 'Aadhaar / Voter ID of 2 Witnesses present at marriage', mandatory: true },
  ],
};

// Clean string utility to ensure no unrenderable Kannada or garbled Unicode characters enter jsPDF or templates
const cleanAsciiText = (text: string | undefined | null): string => {
  if (!text) return '';
  return text
    .replace(/[\u0C80-\u0CFF]/g, '') // remove Kannada Unicode characters
    .replace(/[^\x20-\x7E\r\n\t]/g, '') // remove any other non-ASCII unprintable characters
    .replace(/\s*\/\s*$/, '') // remove trailing dangling slashes
    .replace(/\s{2,}/g, ' ') // normalize whitespace
    .trim();
};

// Helper to convert currency numbers into clean English words (e.g. 20000 -> Twenty Thousand Rupees Only)
const numberToWords = (num: number): string => {
  if (isNaN(num) || num <= 0) return 'Zero Rupees';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  };

  return inWords(Math.floor(num)).trim() + ' Rupees Only';
};

export default function Certificates() {
  const { user } = useAuth();
  const cachedCerts = api.getCachedSync('certificates');
  const [certificates, setCertificates] = useState<Certificate[]>(cachedCerts || []);
  const [loading, setLoading] = useState(!cachedCerts);

  // Form states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [type, setType] = useState<'Residence' | 'Birth' | 'Income' | 'Marriage'>('Residence');
  const [formData, setFormData] = useState<any>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { fileName: string; size: string; uploadTime: string; dataUrl?: string; fileType?: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  // Document preview modal state
  const [viewingDoc, setViewingDoc] = useState<{ doc: any; citizenName?: string; certType?: string } | null>(null);

  // Focus view for print
  const [activePrintCertificate, setActivePrintCertificate] = useState<Certificate | null>(null);

  // Review states
  const [selectedApp, setSelectedApp] = useState<Certificate | null>(null);
  const [remarks, setRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCertificate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const targetId = deleteTarget.id;
    try {
      await api.deleteCertificate(targetId);
      setCertificates(prev => prev.filter(c => c.id !== targetId));
      if (selectedApp?.id === targetId) {
        setSelectedApp(null);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Error deleting certificate:', err);
      alert(err.message || 'Failed to delete certificate.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadCertificates();

    // Automatic Live Synchronization: Poll every 4 seconds for fresh certificates from backend
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadCertificates(true, true);
      }
    }, 4000);

    const handleFocus = () => {
      loadCertificates(true, true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCertificates(true, true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadCertificates = async (bypassCache = false, isBackground = false) => {
    try {
      const list = await api.getCertificates(bypassCache);
      if (list && Array.isArray(list)) {
        setCertificates(list);
        setSelectedApp(prev => {
          if (!prev) return null;
          const updated = list.find(c => c.id === prev.id);
          return updated || prev;
        });
      }
    } catch (err) {
      if (!isBackground) {
        console.error('Error loading certificates:', err);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  const handleFileUpload = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedDocs(prev => ({
        ...prev,
        [docId]: {
          fileName: file.name,
          size: sizeStr,
          uploadTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dataUrl,
          fileType: file.type,
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (docId: string) => {
    setUploadedDocs(prev => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name fields based on certificate type (no numbers or special characters)
    if (type === 'Residence') {
      const nameCheck = validateName(formData.fullName, true, 50, 'Full Name');
      if (!nameCheck.isValid) {
        alert(nameCheck.error);
        return;
      }
      const fatherCheck = validateName(formData.fatherName, true, 50, 'Father / Spouse Name');
      if (!fatherCheck.isValid) {
        alert(fatherCheck.error);
        return;
      }
    } else if (type === 'Birth') {
      const childCheck = validateName(formData.childName, true, 50, "Child's Full Name");
      if (!childCheck.isValid) {
        alert(childCheck.error);
        return;
      }
      const fatherCheck = validateName(formData.fatherName, true, 50, "Father's Name");
      if (!fatherCheck.isValid) {
        alert(fatherCheck.error);
        return;
      }
      const motherCheck = validateName(formData.motherName, true, 50, "Mother's Name");
      if (!motherCheck.isValid) {
        alert(motherCheck.error);
        return;
      }
    } else if (type === 'Marriage') {
      const husbandCheck = validateName(formData.husbandName, true, 50, 'Husband Name');
      if (!husbandCheck.isValid) {
        alert(husbandCheck.error);
        return;
      }
      const wifeCheck = validateName(formData.wifeName, true, 50, 'Wife Name');
      if (!wifeCheck.isValid) {
        alert(wifeCheck.error);
        return;
      }
    }

    if (type === 'Birth' && formData.dateOfBirth) {
      const dobError = validate4DigitYear(formData.dateOfBirth, 1900, 2099, 'Date of Birth');
      if (dobError) {
        alert(dobError);
        return;
      }
    }

    if (type === 'Marriage' && formData.dateOfMarriage) {
      const domError = validate4DigitYear(formData.dateOfMarriage, 1900, 2099, 'Date of Marriage');
      if (domError) {
        alert(domError);
        return;
      }
    }

    // Check mandatory document uploads
    const reqDocs = CERTIFICATE_DOCUMENTS[type] || [];
    const missingDocs = reqDocs.filter(d => d.mandatory && !uploadedDocs[d.id]);
    if (missingDocs.length > 0) {
      alert(`Please upload mandatory supporting document: ${missingDocs[0].name}`);
      return;
    }

    const attachedDocsList = (Object.entries(uploadedDocs) as [string, { fileName: string; size: string; uploadTime: string; dataUrl?: string; fileType?: string }][]).map(([docId, docMeta]) => {
      const docDef = reqDocs.find(d => d.id === docId);
      return {
        id: docId,
        title: docDef?.name || docId,
        fileName: docMeta.fileName,
        size: docMeta.size,
        uploadTime: docMeta.uploadTime,
        dataUrl: docMeta.dataUrl,
        fileType: docMeta.fileType,
      };
    });

    const finalDetails = {
      ...formData,
      attachedDocuments: attachedDocsList,
    };

    const tempCert: Certificate = {
      id: `cert_${Date.now()}`,
      citizenId: user?.id || 'citizen_1',
      citizenName: user?.name || 'Citizen User',
      type,
      status: 'Pending',
      details: finalDetails,
      qrCode: `GRAM_QR_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Instant optimistic update
    setCertificates(prev => [tempCert, ...prev]);
    setSelectedApp(tempCert);
    setFormData({});
    setUploadedDocs({});
    setShowApplyModal(false);

    try {
      const created = await api.applyCertificate(type, finalDetails);
      if (created && created.id) {
        setCertificates(prev => prev.map(c => c.id === tempCert.id ? created : c));
        setSelectedApp(created);
      }
    } catch (err: any) {
      console.error('Certificate background application error:', err);
    }
  };

  const getCertificateIssueDate = (cert: Certificate): string => {
    const dateStr = cert.issuedDate || cert.approvedAt || (cert.status === 'Approved' ? cert.updatedAt : cert.createdAt);
    if (!dateStr) return new Date().toLocaleDateString();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString() : d.toLocaleDateString();
  };

  const formatOfficerApproval = (cert: Certificate): string => {
    const approver = cert.approvedBy || getZoneOfficerDesignation(cert.zone);
    if (!approver) return '';
    // Remove any duplicate (OFFICER) occurrences
    let cleaned = approver.replace(/(\s*\(OFFICER\))+/gi, ' (OFFICER)').trim();
    // If no parenthetical designation exists and doesn't contain officer terms, append (OFFICER) once
    if (!/\(.*\)/.test(cleaned) && !/officer|pdo|admin|secretary/i.test(cleaned)) {
      cleaned = `${cleaned} (OFFICER)`;
    }
    return cleaned;
  };

  const handleReview = async (status: 'Approved' | 'Rejected' | 'Documents Verified') => {
    if (!selectedApp) return;

    setReviewing(true);
    const targetId = selectedApp.id;
    const now = new Date().toISOString();
    const updatedCert: Certificate = {
      ...selectedApp,
      status,
      approvedBy: status === 'Approved' ? (user?.name || 'Panchayath Officer') : selectedApp.approvedBy,
      approvedAt: status === 'Approved' ? now : selectedApp.approvedAt,
      issuedDate: status === 'Approved' ? now : selectedApp.issuedDate,
      updatedAt: now,
    };

    // Instant optimistic update
    setSelectedApp(updatedCert);
    setCertificates(prev => prev.map(c => c.id === targetId ? updatedCert : c));
    setRemarks('');

    try {
      await api.reviewCertificate(targetId, status, remarks);
    } catch (err: any) {
      console.error('Certificate review background sync error:', err);
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    // Pre-cache official Namma Panchayath logo for instant certificate export
    getPanchayathLogoDataUrl();
  }, []);

  const downloadCertificatePDF = async (cert: Certificate) => {
    if (!cert) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const logoData = await getPanchayathLogoDataUrl();

      // DEDICATED TEMPLATE FOR BIRTH CERTIFICATE (FORM NO. 5 / RBD ACT 1969)
      if (cert.type === 'Birth') {
        // Official Royal Navy & Gold Double Frame
        doc.setDrawColor(20, 45, 95); // Royal Navy
        doc.setLineWidth(1.2);
        doc.rect(8, 8, 194, 281);

        doc.setDrawColor(180, 140, 45); // Gold Accent
        doc.setLineWidth(0.6);
        doc.rect(11, 11, 188, 275);

        // Corner decorative marks
        doc.setDrawColor(180, 140, 45);
        doc.rect(13, 13, 5, 5);
        doc.rect(192, 13, 5, 5);
        doc.rect(13, 278, 5, 5);
        doc.rect(192, 278, 5, 5);

        // Official Namma Panchayath Logo on Top-Left
        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 16, 16, 24, 24);
          } catch (err) {
            console.warn('Could not render logo in header:', err);
          }
        }

        // Header Titles - Pure English (No unrenderable Unicode/Kannada)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(20, 45, 95);
        doc.text('GOVERNMENT OF KARNATAKA', 114, 22, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('DEPARTMENT OF RURAL DEVELOPMENT & PANCHAYATH RAJ', 114, 27.5, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136); // Teal/Emerald
        doc.text('GRAM PANCHAYATH NAMMA PANCHAYATH - CIVIL REGISTRATION SYSTEM', 114, 33, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('FORM NO. 5 (See Rule 9)', 114, 38.5, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('BIRTH CERTIFICATE', 114, 47, { align: 'center' });

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('(ISSUED UNDER SECTION 12/17 OF THE REGISTRATION OF BIRTHS & DEATHS ACT, 1969 & RULE 9 OF KARNATAKA RBD RULES 1999)', 114, 52, { align: 'center' });

        // Legal Certification Preamble
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('This is to certify that the following information has been taken from the original record of birth which is the register for', 105, 60, { align: 'center' });
        doc.text('Gram Panchayath Namma Panchayath, Taluk & District Administration, State of Karnataka, India.', 105, 64.5, { align: 'center' });

        // Registration Meta Details Strip
        let y = 70;
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.roundedRect(18, y, 174, 12, 2, 2, 'FD');

        const regNo = `NAMMA-B-2026-${cleanAsciiText(cert.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(cert.id).toUpperCase()}`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text(`Reg. No: ${regNo}`, 22, y + 7.5);

        doc.setTextColor(71, 85, 105);
        doc.text(`Reg. Date: ${new Date(cert.createdAt).toLocaleDateString()}`, 90, y + 7.5);
        doc.text(`Date of Issue: ${cleanAsciiText(getCertificateIssueDate(cert))}`, 142, y + 7.5);

        // Structured Official Grid / Table
        y = 86;
        const details = cert.details || {};
        const childName = cleanAsciiText(details.childName || cert.citizenName || 'Aarav Patel');
        const fatherName = cleanAsciiText(details.fatherName || 'Ramesh Patel');
        const motherName = cleanAsciiText(details.motherName || 'Meera Patel');
        const dob = cleanAsciiText(details.dateOfBirth || '2026-06-01');
        const placeOfBirth = cleanAsciiText(details.placeOfBirth || 'Community Hospital, Bengaluru South');
        let gender = cleanAsciiText(details.gender || '');
        if (!gender) {
          gender = (childName.toLowerCase().includes('devi') || childName.toLowerCase().includes('priya') || childName.toLowerCase().includes('kavita') || childName.toLowerCase().includes('meera')) ? 'Female' : 'Male';
        }
        const parentsAddress = cleanAsciiText(details.parentsAddress || `${cert.zone || 'Ward No. 1'}, Namma Panchayath, Karnataka - 560083`);
        const permanentAddress = cleanAsciiText(details.permanentAddress || `${cert.zone || 'Ward No. 1'}, Namma Panchayath, Karnataka - 560083`);

        const tableRows = [
          { label: "1. Child's Full Name", value: childName },
          { label: "2. Sex / Gender", value: gender },
          { label: "3. Date of Birth", value: `${dob} (Standard Civil Record)` },
          { label: "4. Place of Birth", value: placeOfBirth },
          { label: "5. Name of Mother", value: motherName },
          { label: "6. Name of Father", value: fatherName },
          { label: "7. Address of Parents at Time of Birth", value: parentsAddress },
          { label: "8. Permanent Address of Parents", value: permanentAddress },
          { label: "9. Registration District & State", value: "Bengaluru Rural District, Karnataka" },
        ];

        // Draw Table with distinct column widths to avoid any text collision
        // Total table width = 174 mm (from x = 18 to x = 192). Divider line at x = 90.
        // Left column: x = 18 to x = 90 (width 72 mm). Label text at x = 22, max width 65 mm.
        // Right column: x = 90 to x = 192 (width 102 mm). Value text at x = 94, max width 94 mm.
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.4);

        tableRows.forEach((row, idx) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const splitLabel = doc.splitTextToSize(row.label, 65);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          const splitVal = doc.splitTextToSize(row.value, 94);

          const maxLines = Math.max(splitLabel.length, splitVal.length);
          const rowHeight = Math.max(9.5, maxLines * 4.5 + 3.5);

          doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
          doc.rect(18, y, 174, rowHeight, 'FD');

          // Vertical divider line at x = 90
          doc.line(90, y, 90, y + rowHeight);

          // Draw label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(splitLabel, 22, y + (splitLabel.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          // Draw value
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(splitVal, 94, y + (splitVal.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          y += rowHeight;
        });

        // Verification seal block with Namma Panchayath Logo on Left
        y = 194;
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(167, 243, 208); // emerald-300
        doc.roundedRect(18, y, 174, 26, 3, 3, 'FD');

        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 22, y + 3, 20, 20);
          } catch (err) {
            console.warn('Could not render logo in seal:', err);
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 101, 52);
        doc.text('DIGITALLY SIGNED & VERIFIED BY REGISTRAR OF BIRTHS & DEATHS', 114, y + 8, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(`Authorized Officer: ${cleanAsciiText(formatOfficerApproval(cert))}`, 114, y + 14.5, { align: 'center' });

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Civil Registration Unit | Gram Panchayath Namma Panchayath | QR: ${cleanAsciiText(cert.qrCode || regNo)}`, 114, y + 20, { align: 'center' });

        // Official Signatures
        y = 238;
        doc.setDrawColor(203, 213, 225);
        doc.line(26, y + 8, 80, y + 8);
        doc.line(130, y + 8, 184, y + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Sub-Registrar of Births & Deaths', 53, y + 13, { align: 'center' });
        doc.text('Registrar of Births & Deaths / PDO', 157, y + 13, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Gram Panchayath Office', 53, y + 17.5, { align: 'center' });
        doc.text('Namma Panchayath e-Governance', 157, y + 17.5, { align: 'center' });

        // Legal footnote
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Statutory Notice: This is a computer-generated Birth Certificate issued under IT Act 2000 & RBD Act 1969. QR Code can be scanned for instant validation.', 105, 272, { align: 'center' });

        const filename = `Birth_Certificate_${cleanAsciiText(cert.id)}.pdf`;
        doc.save(filename);
        return;
      }

      // DEDICATED TEMPLATE FOR INCOME AND ASSET CERTIFICATE (FORM - F)
      if (cert.type === 'Income') {
        // Official Royal Navy & Gold Double Frame
        doc.setDrawColor(20, 45, 95); // Royal Navy
        doc.setLineWidth(1.2);
        doc.rect(8, 8, 194, 281);

        doc.setDrawColor(180, 140, 45); // Gold Accent
        doc.setLineWidth(0.6);
        doc.rect(11, 11, 188, 275);

        // Corner decorative marks
        doc.setDrawColor(180, 140, 45);
        doc.rect(13, 13, 5, 5);
        doc.rect(192, 13, 5, 5);
        doc.rect(13, 278, 5, 5);
        doc.rect(192, 278, 5, 5);

        // Official Namma Panchayath Logo on Top-Left
        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 16, 16, 24, 24);
          } catch (err) {
            console.warn('Could not render logo in header:', err);
          }
        }

        // Header Titles - Pure English
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(20, 45, 95);
        doc.text('GOVERNMENT OF KARNATAKA', 114, 22, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('DEPARTMENT OF REVENUE & RURAL DEVELOPMENT', 114, 27.5, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136); // Teal/Emerald
        doc.text('GRAM PANCHAYATH NAMMA PANCHAYATH - REVENUE & E-GOVERNANCE WING', 114, 33, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('FORM - F (See Rule 3B) / RD REVENUE DIRECTIVE', 114, 38.5, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('INCOME AND ASSET CERTIFICATE', 114, 47, { align: 'center' });

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('(ISSUED UNDER SECTION 15 OF THE KARNATAKA GRAM SWARAJ & PANCHAYATH RAJ ACT & REVENUE RULES)', 114, 52, { align: 'center' });

        // Legal Certification Preamble
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('This is to certify that after due inquiry, field inspection, and verification of revenue assessment records,', 105, 60, { align: 'center' });
        doc.text('the gross annual income from all sources of the applicant and family residing in Namma Panchayath is declared as follows:', 105, 64.5, { align: 'center' });

        // Registration Meta Details Strip
        let y = 70;
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.roundedRect(18, y, 174, 12, 2, 2, 'FD');

        const rdNo = `RD-INC-2026-${cleanAsciiText(cert.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(cert.id).toUpperCase()}`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text(`RD Ref: ${rdNo}`, 22, y + 7.5);

        doc.setTextColor(71, 85, 105);
        doc.text(`Reg. Date: ${new Date(cert.createdAt).toLocaleDateString()}`, 88, y + 7.5);
        doc.text(`Date of Issue: ${cleanAsciiText(getCertificateIssueDate(cert))}`, 138, y + 7.5);

        // Structured Official Grid / Table
        y = 86;
        const details = cert.details || {};
        const applicantName = cleanAsciiText(cert.citizenName || 'Ramesh Patel');
        const fatherName = cleanAsciiText(details.fatherName || details.guardianName || 'Suresh Patel (Head of Family)');
        const rawIncome = details.annualIncome || details.income || 20000;
        const parsedIncome = typeof rawIncome === 'string' ? parseFloat(rawIncome.replace(/[^0-9.]/g, '')) || 20000 : Number(rawIncome) || 20000;
        const incomeFormatted = `Rs. ${parsedIncome.toLocaleString('en-IN')}/- (${numberToWords(parsedIncome)})`;
        const occupation = cleanAsciiText(details.occupation || 'Officer / Service');
        const purpose = cleanAsciiText(details.purposeOfIssue || details.purpose || 'Higher Education / Scholarship / Government Scheme');
        const address = cleanAsciiText(`${cert.zone || 'Ward No. 1'}, Gram Panchayath Namma Panchayath, Bengaluru Rural District, Karnataka - 560083`);

        // Compute 1 year validity
        const issueDateObj = cert.createdAt ? new Date(cert.createdAt) : new Date();
        const validTillObj = new Date(issueDateObj);
        validTillObj.setFullYear(validTillObj.getFullYear() + 1);
        const validTillStr = validTillObj.toLocaleDateString();

        const tableRows = [
          { label: "1. Name of Applicant", value: applicantName },
          { label: "2. Father's / Guardian's Name", value: fatherName },
          { label: "3. Residential Address", value: address },
          { label: "4. Primary Occupation / Profession", value: occupation },
          { label: "5. Source(s) of Family Income", value: `${occupation} & Declared Family Assets` },
          { label: "6. Total Gross Assessed Annual Income", value: incomeFormatted },
          { label: "7. Purpose of Certificate", value: purpose },
          { label: "8. Non-Creamy Layer / Income Category", value: parsedIncome <= 800000 ? "Eligible (Gross Income below standard upper threshold)" : "General Category" },
          { label: "9. Certificate Validity Period", value: `Valid for 1 Year (Up to: ${validTillStr})` },
        ];

        // Draw Table
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.4);

        tableRows.forEach((row, idx) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const splitLabel = doc.splitTextToSize(row.label, 65);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          const splitVal = doc.splitTextToSize(row.value, 94);

          const maxLines = Math.max(splitLabel.length, splitVal.length);
          const rowHeight = Math.max(9.5, maxLines * 4.5 + 3.5);

          // Highlight row 6 (Annual Income) with warm subtle tint
          if (idx === 5) {
            doc.setFillColor(254, 249, 195); // amber-100
          } else {
            doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
          }
          doc.rect(18, y, 174, rowHeight, 'FD');

          // Vertical divider line at x = 90
          doc.line(90, y, 90, y + rowHeight);

          // Draw label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(splitLabel, 22, y + (splitLabel.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          // Draw value
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(idx === 5 ? 180 : 15, idx === 5 ? 83 : 23, idx === 5 ? 9 : 42); // bold amber-800 for income
          doc.text(splitVal, 94, y + (splitVal.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          y += rowHeight;
        });

        // Verification seal block with Namma Panchayath Logo on Left
        y = 194;
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(167, 243, 208); // emerald-300
        doc.roundedRect(18, y, 174, 26, 3, 3, 'FD');

        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 22, y + 3, 20, 20);
          } catch (err) {
            console.warn('Could not render logo in seal:', err);
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 101, 52);
        doc.text('DIGITALLY SIGNED & VERIFIED BY REVENUE & PANCHAYATH AUTHORITY', 114, y + 8, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(`Authorized Officer: ${cleanAsciiText(formatOfficerApproval(cert))}`, 114, y + 14.5, { align: 'center' });

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Revenue & E-Governance Wing | Gram Panchayath Namma Panchayath | QR: ${cleanAsciiText(cert.qrCode || rdNo)}`, 114, y + 20, { align: 'center' });

        // Official Signatures
        y = 238;
        doc.setDrawColor(203, 213, 225);
        doc.line(26, y + 8, 80, y + 8);
        doc.line(130, y + 8, 184, y + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Village Accountant / Revenue Inspector', 53, y + 13, { align: 'center' });
        doc.text('Panchayath Development Officer / Revenue Officer', 157, y + 13, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Gram Panchayath Office', 53, y + 17.5, { align: 'center' });
        doc.text('Namma Panchayath e-Governance', 157, y + 17.5, { align: 'center' });

        // Legal footnote
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Statutory Notice: This is a computer-generated digitally authenticated Income Certificate issued under Section 6 of IT Act 2000. Valid for 1 year.', 105, 272, { align: 'center' });

        const filename = `Income_Certificate_${cleanAsciiText(cert.id)}.pdf`;
        doc.save(filename);
        return;
      }

      // DEDICATED TEMPLATE FOR MARRIAGE CERTIFICATE (FORM - IV)
      if (cert.type === 'Marriage') {
        // Official Royal Navy & Gold Double Frame
        doc.setDrawColor(20, 45, 95); // Royal Navy
        doc.setLineWidth(1.2);
        doc.rect(8, 8, 194, 281);

        doc.setDrawColor(180, 140, 45); // Gold Accent
        doc.setLineWidth(0.6);
        doc.rect(11, 11, 188, 275);

        // Corner decorative marks
        doc.setDrawColor(180, 140, 45);
        doc.rect(13, 13, 5, 5);
        doc.rect(192, 13, 5, 5);
        doc.rect(13, 278, 5, 5);
        doc.rect(192, 278, 5, 5);

        // Official Namma Panchayath Logo on Top-Left
        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 16, 16, 24, 24);
          } catch (err) {
            console.warn('Could not render logo in header:', err);
          }
        }

        // Header Titles - Pure English
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(20, 45, 95);
        doc.text('GOVERNMENT OF KARNATAKA', 114, 22, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('DEPARTMENT OF STAMPS & REGISTRATION - RURAL DEVELOPMENT', 114, 27.5, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136); // Teal/Emerald
        doc.text('GRAM PANCHAYATH NAMMA PANCHAYATH - MARRIAGE REGISTRATION DIVISION', 114, 33, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('FORM - IV (See Rule 6) / REGISTER OF MARRIAGES', 114, 38.5, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('CERTIFICATE OF MARRIAGE', 114, 47, { align: 'center' });

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('(ISSUED UNDER SECTION 15 OF THE KARNATAKA MARRIAGES (REGISTRATION) ACT & CIVIL RULES)', 114, 52, { align: 'center' });

        // Legal Certification Preamble
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('This is to certify that the marriage solemnized between the Bridegroom and Bride named below', 105, 60, { align: 'center' });
        doc.text('has been duly verified and registered in the Register of Marriages maintained by Gram Panchayath Namma Panchayath:', 105, 64.5, { align: 'center' });

        // Registration Meta Details Strip
        let y = 70;
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.roundedRect(18, y, 174, 12, 2, 2, 'FD');

        const mrNo = `MR-2026-${cleanAsciiText(cert.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(cert.id).toUpperCase()}`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text(`Marriage Reg No: ${mrNo}`, 22, y + 7.5);

        doc.setTextColor(71, 85, 105);
        doc.text(`Reg. Date: ${new Date(cert.createdAt).toLocaleDateString()}`, 90, y + 7.5);
        doc.text(`Date of Issue: ${cleanAsciiText(getCertificateIssueDate(cert))}`, 140, y + 7.5);

        // Structured Official Grid / Table
        y = 86;
        const details = cert.details || {};
        const husbandName = cleanAsciiText(details.husbandName || cert.citizenName || 'Peter');
        const wifeName = cleanAsciiText(details.wifeName || 'Zendeya');
        const dateOfMarriage = cleanAsciiText(details.dateOfMarriage || '2025-11-11');
        const placeOfMarriage = cleanAsciiText(details.placeOfMarriage || 'Community Temple Hall, Namma Panchayath');
        const husbandAddress = cleanAsciiText(`${cert.zone || 'Ward No. 1'}, Gram Panchayath Namma Panchayath, Karnataka - 560083`);
        const wifeAddress = cleanAsciiText(`${cert.zone || 'Ward No. 1'}, Gram Panchayath Namma Panchayath, Karnataka - 560083`);

        const tableRows = [
          { label: "1. Bridegroom / Husband's Name", value: husbandName },
          { label: "2. Bride / Wife's Name", value: wifeName },
          { label: "3. Date of Marriage Solemnized", value: `${dateOfMarriage} (Standard Civil Record)` },
          { label: "4. Venue / Place of Marriage", value: placeOfMarriage },
          { label: "5. Husband's Permanent Address", value: husbandAddress },
          { label: "6. Wife's Permanent Address", value: wifeAddress },
          { label: "7. Act & Authority of Registration", value: "Karnataka Registration of Marriages Act, 1976 & Local Rules" },
          { label: "8. Registration Ledger Reference", value: "Register of Marriages, Vol. XII, Folio No. 42" },
          { label: "9. Jurisdiction District & State", value: "Bengaluru Rural District, State of Karnataka, India" },
        ];

        // Draw Table
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.4);

        tableRows.forEach((row, idx) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const splitLabel = doc.splitTextToSize(row.label, 65);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          const splitVal = doc.splitTextToSize(row.value, 94);

          const maxLines = Math.max(splitLabel.length, splitVal.length);
          const rowHeight = Math.max(9.5, maxLines * 4.5 + 3.5);

          doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
          doc.rect(18, y, 174, rowHeight, 'FD');

          // Vertical divider line at x = 90
          doc.line(90, y, 90, y + rowHeight);

          // Draw label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(splitLabel, 22, y + (splitLabel.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          // Draw value
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(splitVal, 94, y + (splitVal.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          y += rowHeight;
        });

        // Verification seal block with Namma Panchayath Logo on Left
        y = 194;
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(167, 243, 208); // emerald-300
        doc.roundedRect(18, y, 174, 26, 3, 3, 'FD');

        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 22, y + 3, 20, 20);
          } catch (err) {
            console.warn('Could not render logo in seal:', err);
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 101, 52);
        doc.text('DIGITALLY SIGNED & VERIFIED BY REGISTRAR OF MARRIAGES', 114, y + 8, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(`Authorized Officer: ${cleanAsciiText(formatOfficerApproval(cert))}`, 114, y + 14.5, { align: 'center' });

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Marriage Registration Division | Gram Panchayath Namma Panchayath | QR: ${cleanAsciiText(cert.qrCode || mrNo)}`, 114, y + 20, { align: 'center' });

        // Official Signatures
        y = 238;
        doc.setDrawColor(203, 213, 225);
        doc.line(26, y + 8, 80, y + 8);
        doc.line(130, y + 8, 184, y + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Panchayath Secretary / Marriage Officer', 53, y + 13, { align: 'center' });
        doc.text('Panchayath Development Officer / Registrar', 157, y + 13, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Gram Panchayath Office', 53, y + 17.5, { align: 'center' });
        doc.text('Namma Panchayath e-Governance', 157, y + 17.5, { align: 'center' });

        // Legal footnote
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Statutory Notice: This is a computer-generated Marriage Certificate issued under Section 15 of Karnataka Marriages Act & IT Act 2000.', 105, 272, { align: 'center' });

        const filename = `Marriage_Certificate_${cleanAsciiText(cert.id)}.pdf`;
        doc.save(filename);
        return;
      }

      // DEDICATED TEMPLATE FOR RESIDENCE / DOMICILE CERTIFICATE (FORM - III)
      if (cert.type === 'Residence') {
        // Official Royal Navy & Gold Double Frame
        doc.setDrawColor(20, 45, 95); // Royal Navy
        doc.setLineWidth(1.2);
        doc.rect(8, 8, 194, 281);

        doc.setDrawColor(180, 140, 45); // Gold Accent
        doc.setLineWidth(0.6);
        doc.rect(11, 11, 188, 275);

        // Corner decorative marks
        doc.setDrawColor(180, 140, 45);
        doc.rect(13, 13, 5, 5);
        doc.rect(192, 13, 5, 5);
        doc.rect(13, 278, 5, 5);
        doc.rect(192, 278, 5, 5);

        // Official Namma Panchayath Logo on Top-Left
        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 16, 16, 24, 24);
          } catch (err) {
            console.warn('Could not render logo in header:', err);
          }
        }

        // Header Titles - Pure English
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(20, 45, 95);
        doc.text('GOVERNMENT OF KARNATAKA', 114, 22, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('DEPARTMENT OF REVENUE & RURAL DEVELOPMENT', 114, 27.5, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136); // Teal/Emerald
        doc.text('GRAM PANCHAYATH NAMMA PANCHAYATH - CITIZEN SERVICES WING', 114, 33, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('FORM - III (See Rule 4) / RESIDENTIAL & DOMICILE REGISTER', 114, 38.5, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('RESIDENCE AND DOMICILE CERTIFICATE', 114, 47, { align: 'center' });

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('(ISSUED UNDER SECTION 12 OF THE KARNATAKA GRAM SWARAJ & PANCHAYATH RAJ ACT & LOCAL CIVIL RULES)', 114, 52, { align: 'center' });

        // Legal Certification Preamble
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('This is to certify that after due inquiry, electoral verification, and inspection of local household registers,', 105, 60, { align: 'center' });
        doc.text('the citizen named below is a bona fide resident of the territorial jurisdiction of Gram Panchayath Namma Panchayath:', 105, 64.5, { align: 'center' });

        // Registration Meta Details Strip
        let y = 70;
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.roundedRect(18, y, 174, 12, 2, 2, 'FD');

        const resNo = `RD-RES-2026-${cleanAsciiText(cert.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(cert.id).toUpperCase()}`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text(`RD Ref: ${resNo}`, 22, y + 7.5);

        doc.setTextColor(71, 85, 105);
        doc.text(`Reg. Date: ${new Date(cert.createdAt).toLocaleDateString()}`, 90, y + 7.5);
        doc.text(`Date of Issue: ${cleanAsciiText(getCertificateIssueDate(cert))}`, 140, y + 7.5);

        // Structured Official Grid / Table
        y = 86;
        const details = cert.details || {};
        const citizenName = cleanAsciiText(cert.citizenName || 'Ramesh Patel');
        const fatherName = cleanAsciiText(details.fatherName || details.guardianName || 'Suresh Patel');
        const durationOfStay = cleanAsciiText(details.durationOfStay || details.yearsOfResidence || '15 Years');
        const purpose = cleanAsciiText(details.purposeOfIssue || details.purpose || 'Government Identification / Address Verification');
        const houseNo = cleanAsciiText(details.houseNo || details.address || 'House No. 42/B');
        const fullAddress = cleanAsciiText(`${houseNo}, ${cert.zone || 'Ward No. 1'}, Gram Panchayath Namma Panchayath, Karnataka - 560083`);

        const tableRows = [
          { label: "1. Name of Resident / Citizen", value: citizenName },
          { label: "2. Father's / Guardian's / Spouse Name", value: fatherName },
          { label: "3. Complete Residential Address", value: fullAddress },
          { label: "4. Ward / Zone Jurisdiction", value: `${cleanAsciiText(cert.zone || 'Ward No. 1')} (Namma Panchayath)` },
          { label: "5. Duration of Continuous Residence", value: `${durationOfStay} (Verified via Household Census)` },
          { label: "6. Purpose of Certificate", value: purpose },
          { label: "7. Domicile Status", value: "Bona Fide Permanent Resident of Karnataka State" },
          { label: "8. Household Register Reference", value: "Family Register Book Vol. 4, Page 88" },
          { label: "9. Territorial Jurisdiction", value: "Bengaluru Rural District, State of Karnataka, India" },
        ];

        // Draw Table
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.4);

        tableRows.forEach((row, idx) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const splitLabel = doc.splitTextToSize(row.label, 65);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          const splitVal = doc.splitTextToSize(row.value, 94);

          const maxLines = Math.max(splitLabel.length, splitVal.length);
          const rowHeight = Math.max(9.5, maxLines * 4.5 + 3.5);

          doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
          doc.rect(18, y, 174, rowHeight, 'FD');

          // Vertical divider line at x = 90
          doc.line(90, y, 90, y + rowHeight);

          // Draw label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(splitLabel, 22, y + (splitLabel.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          // Draw value
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(splitVal, 94, y + (splitVal.length === 1 && rowHeight <= 10 ? 6.2 : 5));

          y += rowHeight;
        });

        // Verification seal block with Namma Panchayath Logo on Left
        y = 194;
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(167, 243, 208); // emerald-300
        doc.roundedRect(18, y, 174, 26, 3, 3, 'FD');

        if (logoData) {
          try {
            doc.addImage(logoData, 'PNG', 22, y + 3, 20, 20);
          } catch (err) {
            console.warn('Could not render logo in seal:', err);
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 101, 52);
        doc.text('DIGITALLY SIGNED & VERIFIED BY PANCHAYATH REVENUE AUTHORITY', 114, y + 8, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(`Authorized Officer: ${cleanAsciiText(formatOfficerApproval(cert))}`, 114, y + 14.5, { align: 'center' });

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Civil Services Wing | Gram Panchayath Namma Panchayath | QR: ${cleanAsciiText(cert.qrCode || resNo)}`, 114, y + 20, { align: 'center' });

        // Official Signatures
        y = 238;
        doc.setDrawColor(203, 213, 225);
        doc.line(26, y + 8, 80, y + 8);
        doc.line(130, y + 8, 184, y + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Village Accountant / Bill Collector', 53, y + 13, { align: 'center' });
        doc.text('Panchayath Development Officer / Secretary', 157, y + 13, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Gram Panchayath Office', 53, y + 17.5, { align: 'center' });
        doc.text('Namma Panchayath e-Governance', 157, y + 17.5, { align: 'center' });

        // Legal footnote
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Statutory Notice: This is a computer-generated Residence Certificate issued under Karnataka Gram Swaraj Act & IT Act 2000.', 105, 272, { align: 'center' });

        const filename = `Residence_Certificate_${cleanAsciiText(cert.id)}.pdf`;
        doc.save(filename);
        return;
      }

      // GENERIC CERTIFICATE FRAME (Fallback)
      doc.setDrawColor(30, 58, 138); // blue-900
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277);

      doc.setDrawColor(217, 119, 6); // amber-600
      doc.setLineWidth(0.5);
      doc.rect(13, 13, 184, 271);

      // Official Namma Panchayath Logo on Top-Left Header
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', 20, 18, 22, 22);
        } catch (err) {
          console.warn('Could not render logo in header:', err);
        }
      }

      // Header Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 58, 138);
      doc.text('NAMMA PANCHAYATH GOVERNANCE PORTAL', 114, 27, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Department of Rural Development & Panchayath Raj - Govt. of Karnataka', 114, 33, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(`${cleanAsciiText(cert.type).toUpperCase()} CERTIFICATE`, 114, 46, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(`Certificate No: ${cleanAsciiText(cert.id).toUpperCase()}`, 114, 53, { align: 'center' });

      // Body preamble
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text('This is to officially certify that the applicant details provided below have been verified', 105, 69, { align: 'center' });
      doc.text('and authenticated against Namma Panchayath ledgers and digital records.', 105, 75, { align: 'center' });

      // Citizen details
      let y = 88;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Applicant Name: ${cleanAsciiText(cert.citizenName)}`, 25, y);

      y += 8;
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Application Status: ${cleanAsciiText(cert.status)}`, 25, y);
      doc.text(`Issued Date: ${cleanAsciiText(getCertificateIssueDate(cert))}`, 115, y);

      y += 9;
      doc.setDrawColor(226, 232, 240);
      doc.line(25, y, 185, y);
      y += 9;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('Certificate Particulars:', 25, y);
      y += 8;

      if (cert.details) {
        Object.entries(cert.details).forEach(([key, value]) => {
          if (key === 'attachedDocuments') return;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(100, 116, 139);
          const formattedKey = cleanAsciiText(key.replace(/([A-Z])/g, ' $1')).toUpperCase();
          doc.text(`${formattedKey}:`, 30, y);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          const valStr = cleanAsciiText(typeof value === 'object' ? JSON.stringify(value) : String(value));
          doc.text(valStr, 105, y);
          y += 8;
        });
      }

      // Verification seal block with Namma Panchayath Logo on Left
      y = 208;
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(25, y, 160, 24, 4, 4, 'FD');

      // Logo inside verification block on left side
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', 29, y + 2.5, 19, 19);
        } catch (err) {
          console.warn('Could not render logo in seal:', err);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(22, 101, 52);
      doc.text('DIGITALLY SIGNED & QR VERIFIED', 114, y + 9.5, { align: 'center' });
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`Approved By: ${cleanAsciiText(formatOfficerApproval(cert))}`, 114, y + 16.5, { align: 'center' });

      // Signatures
      y = 250;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Panchayath Secretary', 40, y);
      doc.text(cleanAsciiText(getZoneOfficerDesignation(cert.zone)), 135, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Gram Panchayath Office', 40, y + 5);
      doc.text('Namma Panchayath e-Governance', 135, y + 5);

      const filename = `${cleanAsciiText(cert.type)}_Certificate_${cleanAsciiText(cert.id)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Certificate PDF generation error:', err);
    }
  };

  const triggerPrint = (cert: Certificate) => {
    downloadCertificatePDF(cert);
    setActivePrintCertificate(cert);
    const prevTitle = document.title;
    document.title = `${cert.type}_Certificate_${cert.id}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = prevTitle;
      }, 1000);
    }, 300);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60';
      case 'Documents Verified':
      case 'Doc Verified':
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60';
      case 'Approved':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60';
      case 'Rejected':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700';
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block special characters and numbers, allow navigation / deletion keys
    if (e.key.length === 1 && !/[a-zA-Z\s]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const renderFormFields = () => {
    switch (type) {
      case 'Residence':
        return (
          <>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName || ''}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => setFormData({ ...formData, fullName: sanitizeNameInput(e.target.value) })}
                placeholder="Applicant name"
                pattern="[A-Za-z\s]+"
                title="Full Name must contain only letters and spaces (no numbers or special characters)"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Father / Spouse Name *</label>
              <input
                type="text"
                required
                value={formData.fatherName || ''}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => setFormData({ ...formData, fatherName: sanitizeNameInput(e.target.value) })}
                placeholder="Guardian name"
                pattern="[A-Za-z\s]+"
                title="Must contain only letters and spaces (no numbers or special characters)"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Duration of stay (Years) *</label>
              <input
                type="text"
                required
                value={formData.durationOfStay || ''}
                onChange={(e) => setFormData({ ...formData, durationOfStay: e.target.value })}
                placeholder="e.g. 15 Years"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Purpose of issue *</label>
              <input
                type="text"
                required
                value={formData.purposeOfIssue || ''}
                onChange={(e) => setFormData({ ...formData, purposeOfIssue: e.target.value })}
                placeholder="e.g. School Admissions"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </>
        );
      case 'Birth':
        return (
          <>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Child's Full Name *</label>
              <input
                type="text"
                required
                value={formData.childName || ''}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => setFormData({ ...formData, childName: sanitizeNameInput(e.target.value) })}
                placeholder="Child's name"
                pattern="[A-Za-z\s]+"
                title="Child Name must contain only letters and spaces"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Father's Name *</label>
              <input
                type="text"
                required
                value={formData.fatherName || ''}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => setFormData({ ...formData, fatherName: sanitizeNameInput(e.target.value) })}
                placeholder="Father's name"
                pattern="[A-Za-z\s]+"
                title="Father Name must contain only letters and spaces"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Mother's Name *</label>
              <input
                type="text"
                required
                value={formData.motherName || ''}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => setFormData({ ...formData, motherName: sanitizeNameInput(e.target.value) })}
                placeholder="Mother's name"
                pattern="[A-Za-z\s]+"
                title="Mother Name must contain only letters and spaces"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Date of Birth *</label>
              <input
                type="date"
                required
                min="1900-01-01"
                max="2099-12-31"
                value={formData.dateOfBirth || ''}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: sanitizeDateYear(e.target.value) })}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Gender / Sex *</label>
              <select
                required
                value={formData.gender || 'Male'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Place of Birth (Hospital / Health Center / Home) *</label>
              <input
                type="text"
                required
                value={formData.placeOfBirth || ''}
                onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                placeholder="e.g. Community Health Center, Bengaluru South"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </>
        );
      case 'Income':
        return (
          <>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Annual Family Income (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.annualIncome || ''}
                onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                placeholder="e.g. 180000"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Primary Occupation *</label>
              <input
                type="text"
                required
                value={formData.occupation || ''}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="e.g. Agriculture / Store Operator"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Reason for certificate *</label>
              <input
                type="text"
                required
                value={formData.purposeOfIssue || ''}
                onChange={(e) => setFormData({ ...formData, purposeOfIssue: e.target.value })}
                placeholder="e.g. Subsidized Bank Farming Loan"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </>
        );
      case 'Marriage':
        return (
          <>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Husband Name *</label>
              <input
                type="text"
                required
                value={formData.husbandName || ''}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => setFormData({ ...formData, husbandName: sanitizeNameInput(e.target.value) })}
                placeholder="Groom full name"
                pattern="[A-Za-z\s]+"
                title="Husband Name must contain only letters and spaces"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Wife Name *</label>
              <input
                type="text"
                required
                value={formData.wifeName || ''}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => setFormData({ ...formData, wifeName: sanitizeNameInput(e.target.value) })}
                placeholder="Bride full name"
                pattern="[A-Za-z\s]+"
                title="Wife Name must contain only letters and spaces"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Date of Marriage *</label>
              <input
                type="date"
                required
                min="1900-01-01"
                max="2099-12-31"
                value={formData.dateOfMarriage || ''}
                onChange={(e) => setFormData({ ...formData, dateOfMarriage: sanitizeDateYear(e.target.value) })}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Place of Marriage *</label>
              <input
                type="text"
                required
                value={formData.placeOfMarriage || ''}
                onChange={(e) => setFormData({ ...formData, placeOfMarriage: e.target.value })}
                placeholder="e.g. Namma Panchayath Temple Hall"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upper header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-[#F8FAFC]">Gram e-Certificate Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Apply, track, and download legally validated certificates</p>
        </div>
        {user?.role === 'citizen' && (
          <button
            onClick={() => {
              setType('Residence');
              setFormData({});
              setShowApplyModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-blue-700/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Apply For Certificate
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Applications List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Applications Registry</span>
            <div className="mt-3 flex flex-col gap-3">
              {loading ? (
                <div className="flex py-10 justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
              ) : certificates.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">No applications recorded yet.</p>
              ) : (
                certificates.map(cert => (
                  <div
                    key={cert.id}
                    onClick={() => {
                      if (user?.role !== 'citizen') {
                        setSelectedApp(cert);
                      }
                    }}
                    className={`flex flex-col justify-between gap-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 transition-all hover:border-blue-300 dark:hover:border-emerald-500/50 shadow-xs ${
                      user?.role !== 'citizen' ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">
                            {cert.type} Certificate
                          </span>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${getStatusStyle(cert.status)}`}>
                            {cert.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                          Applicant: {cert.citizenName} • ID: {cert.id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {user?.role === 'officer' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(cert);
                            }}
                            title="Delete certificate application"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            <span>Delete</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">
                          {cert.status === 'Approved' ? `Approved: ${getCertificateIssueDate(cert)}` : `Applied: ${new Date(cert.createdAt).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Meta values */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#111827] p-2.5 rounded-xl text-[10px] font-medium text-slate-600 dark:text-[#CBD5E1] border border-slate-100 dark:border-[#334155]">
                      {cert.type === 'Residence' && (
                        <>
                          <p>Stay Duration: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{cert.details?.durationOfStay}</span></p>
                          <p>Purpose: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{cert.details?.purposeOfIssue}</span></p>
                        </>
                      )}
                      {cert.type === 'Birth' && (
                        <>
                          <p>Child: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{cert.details?.childName}</span></p>
                          <p>Date of Birth: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{cert.details?.dateOfBirth}</span></p>
                        </>
                      )}
                      {cert.type === 'Income' && (
                        <>
                          <p>Income: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">₹{cert.details?.annualIncome}</span></p>
                          <p>Occupation: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{cert.details?.occupation}</span></p>
                        </>
                      )}
                      {cert.type === 'Marriage' && (
                        <>
                          <p>Groom: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{cert.details?.husbandName}</span></p>
                          <p>Bride: <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{cert.details?.wifeName}</span></p>
                        </>
                      )}
                    </div>

                    {/* Attached Documents List */}
                    {cert.details?.attachedDocuments && cert.details.attachedDocuments.length > 0 && (
                      <div className="rounded-xl border border-blue-100 dark:border-emerald-900/40 bg-blue-50/50 dark:bg-emerald-950/20 p-2.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-emerald-400">Attached Documents ({cert.details.attachedDocuments.length})</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {cert.details.attachedDocuments.map((doc: any, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDoc({ doc, citizenName: cert.citizenName, certType: cert.type });
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#243044] border border-blue-200 dark:border-[#334155] hover:border-blue-400 dark:hover:border-emerald-500 hover:bg-blue-50/50 dark:hover:bg-[#334155] px-2.5 py-1 text-[9px] font-semibold text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-colors cursor-pointer"
                            >
                              <Paperclip className="h-3 w-3 text-blue-600 dark:text-emerald-400 shrink-0" />
                              <span>{doc.title}: <strong className="text-blue-700 dark:text-emerald-300">{doc.fileName}</strong></span>
                              <Eye className="h-3 w-3 text-blue-500 dark:text-emerald-400 ml-0.5 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* If approved, show printable receipt & QR triggers */}
                    {cert.status === 'Approved' && (
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#334155] pt-3.5 mt-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                          <span>QR Certified & Verified</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerPrint(cert);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-2.5 py-1.5 text-[10px] font-bold text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#334155] transition-colors cursor-pointer"
                        >
                          <Printer className="h-3 w-3" />
                          Download Verified PDF
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right operations detail / review block */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
            <h4 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
              {user?.role === 'admin' ? 'Certificate Inspection Console (Admin View)' : 'Zone Officer Verification Desk'}
            </h4>
            {user?.role !== 'citizen' && selectedApp ? (
              <div className="mt-4 flex flex-col gap-4">
                {/* Admin Read-Only Notice */}
                {user?.role === 'admin' && (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Admin View (Read-Only)</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Admins can view certificate applications across all zones. The verification, approval, and rejection processes are performed by the respective Zone Officers.
                    </p>
                  </div>
                )}

                {/* Officer Zone Mismatch Notice */}
                {user?.role === 'officer' && user.assignedZone && selectedApp.zone && selectedApp.zone !== user.assignedZone && (
                  <div className="rounded-2xl border border-blue-200 dark:border-emerald-800/60 bg-blue-50 dark:bg-emerald-950/40 p-3.5 text-xs text-blue-900 dark:text-emerald-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-emerald-300">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-emerald-400 shrink-0" />
                      <span>Zone Restricted ({selectedApp.zone})</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      This request belongs to <strong>{selectedApp.zone}</strong>. Only the assigned <strong>{getZoneOfficerDesignation(selectedApp.zone)}</strong> can verify and approve or reject this application.
                    </p>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-100 dark:border-[#334155] p-3 text-xs leading-normal">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase">Application Details</span>
                  <p className="mt-1 font-bold text-slate-800 dark:text-[#F8FAFC]">{selectedApp.citizenName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Type: {selectedApp.type} Certificate {selectedApp.zone ? `• Zone: ${selectedApp.zone}` : ''}</p>
                  
                  <div className="mt-3 border-t border-slate-200/60 dark:border-[#334155] pt-2 grid gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {Object.entries(selectedApp.details || {})
                      .filter(([k]) => k !== 'attachedDocuments')
                      .map(([k, v]: any) => (
                        <p key={k} className="capitalize">
                          {k.replace(/([A-Z])/g, ' $1')}: <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{v}</span>
                        </p>
                      ))}
                  </div>

                  {selectedApp.details?.attachedDocuments && selectedApp.details.attachedDocuments.length > 0 && (
                    <div className="mt-3 border-t border-slate-200/60 dark:border-[#334155] pt-2.5">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Verified Documents ({selectedApp.details.attachedDocuments.length})</span>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {selectedApp.details.attachedDocuments.map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-2 text-xs shadow-2xs hover:border-blue-300 dark:hover:border-emerald-500 transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Paperclip className="h-3.5 w-3.5 text-blue-600 dark:text-emerald-400 shrink-0" />
                              <div className="flex flex-col text-left overflow-hidden">
                                <p className="font-bold text-slate-800 dark:text-[#F8FAFC] text-[10px] truncate">{doc.title}</p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-400 truncate">{doc.fileName} ({doc.size})</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ doc, citizenName: selectedApp.citizenName, certType: selectedApp.type })}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-[#243044] hover:bg-blue-100 dark:hover:bg-[#334155] border border-blue-200 dark:border-[#334155] px-2 py-1 text-[9px] font-bold text-blue-700 dark:text-emerald-400 transition-colors cursor-pointer shrink-0 ml-1.5"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View Document</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Respective Zone Officer Actions */}
                {user?.role === 'officer' && (!user.assignedZone || !selectedApp.zone || selectedApp.zone === user.assignedZone) && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Verification Remarks</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="e.g. Documents verified against physical record ledger. Approved."
                        rows={3}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] p-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleReview('Rejected')}
                        disabled={reviewing || deleting}
                        className="rounded-xl border border-rose-100 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview('Documents Verified')}
                        disabled={reviewing || deleting}
                        className="rounded-xl border border-blue-200 dark:border-emerald-800/60 bg-blue-50 dark:bg-emerald-950/40 py-2.5 text-xs font-bold text-blue-700 dark:text-emerald-300 hover:bg-blue-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        Doc Verified
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview('Approved')}
                        disabled={reviewing || deleting}
                        className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/15 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-4 text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                {user?.role === 'citizen'
                  ? 'Citizens can apply on the left. Approved certificates can be downloaded instantly containing an official QR validation.'
                  : 'Select an application card from the registry to inspect documents and details.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Printable Certificate Template (Hidden on screen, visible only on print) */}
      {activePrintCertificate && activePrintCertificate.type === 'Birth' ? (
        <div className="printable-certificate hidden print:block max-w-3xl mx-auto border-8 border-double border-[#1E3A8A] p-8 text-center bg-white">
          {/* Top Header with Namma Panchayath Logo on Left */}
          <div className="flex justify-between items-center border-b-2 border-slate-300 pb-4">
            <div className="flex items-center gap-3.5 text-left">
              <img
                src={svgLogo}
                alt="Namma Panchayath Official Logo"
                className="h-16 w-16 object-contain rounded-full border-2 border-amber-600/60 bg-[#FDFBF7] p-1 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-xs font-mono font-extrabold text-[#1E3A8A] block uppercase">GOVERNMENT OF KARNATAKA</span>
                <span className="text-[10px] font-mono font-bold text-slate-700 block uppercase">Department of Rural Development &amp; Panchayath Raj</span>
                <span className="text-[11px] font-mono font-bold text-emerald-800 block uppercase">Gram Panchayath Namma Panchayath - Civil Registration</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-extrabold text-blue-900 block">FORM NO. 5</span>
              <span className="text-[9px] font-mono text-slate-500 block">(See Rule 9)</span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-6 uppercase">
            BIRTH CERTIFICATE
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wide">
            (ISSUED UNDER SECTION 12/17 OF THE REGISTRATION OF BIRTHS &amp; DEATHS ACT, 1969 &amp; RULE 9 OF KARNATAKA RBD RULES 1999)
          </p>

          <p className="text-[11px] text-slate-600 mt-4 leading-relaxed max-w-xl mx-auto italic">
            This is to certify that the following information has been taken from the original record of birth which is the register for Gram Panchayath Namma Panchayath, Taluk &amp; District Administration, State of Karnataka, India.
          </p>

          {/* Registration Details Strip */}
          <div className="mt-4 max-w-xl mx-auto bg-slate-100/90 border border-slate-300 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Registration No:</span>
              <span className="font-bold text-blue-900">NAMMA-B-2026-{cleanAsciiText(activePrintCertificate.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(activePrintCertificate.id).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Registration:</span>
              <span className="font-bold text-slate-800">{new Date(activePrintCertificate.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Issue:</span>
              <span className="font-bold text-emerald-800">{cleanAsciiText(getCertificateIssueDate(activePrintCertificate))}</span>
            </div>
          </div>

          {/* Structured Particulars Grid */}
          <div className="mt-5 max-w-xl mx-auto border border-slate-400 rounded-lg overflow-hidden text-xs text-left">
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">1. Child's Full Name</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.childName || activePrintCertificate.citizenName)}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">2. Sex / Gender</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                {cleanAsciiText(activePrintCertificate.details?.gender) || ((activePrintCertificate.details?.childName || '').toLowerCase().includes('devi') || (activePrintCertificate.details?.childName || '').toLowerCase().includes('priya') ? 'Female' : 'Male')}
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">3. Date of Birth</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.dateOfBirth || '2026-06-01')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">4. Place of Birth</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.placeOfBirth || 'Community Hospital, Bengaluru South')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">5. Name of Mother</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.motherName || 'Meera Patel')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">6. Name of Father</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.fatherName || 'Ramesh Patel')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">7. Address at Time of Birth</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.zone || 'Ward No. 1')}, Namma Panchayath, Karnataka</div>
            </div>
            <div className="grid grid-cols-12 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">8. Permanent Address of Parents</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.zone || 'Ward No. 1')}, Namma Panchayath, Karnataka</div>
            </div>
          </div>

          {/* Digital Signature & Verification Box with Logo on Left */}
          <div className="mt-6 max-w-xl mx-auto rounded-xl border border-emerald-400 bg-emerald-50/90 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={svgLogo}
                alt="Namma Panchayath Logo"
                className="h-12 w-12 object-contain rounded-full border border-emerald-500 bg-white p-0.5 shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 inline" />
                  DIGITALLY SIGNED &amp; QR VERIFIED UNDER CIVIL REGISTRATION
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  Authorized Officer: <span className="font-bold text-slate-900">{cleanAsciiText(formatOfficerApproval(activePrintCertificate))}</span>
                </p>
              </div>
            </div>
            <div className="text-right text-[9px] text-slate-500">
              <p className="font-bold text-slate-700">Civil Registration Seal</p>
              <p className="text-emerald-700">Gram Panchayath Office</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-end max-w-xl mx-auto">
            {/* Visual QR Code Generator */}
            <div className="flex flex-col items-center gap-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="h-14 w-14 bg-slate-800 p-1 rounded flex flex-col justify-between">
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-3.5 w-3.5 bg-white rounded"></div></div>
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-2.5 w-2.5 bg-white rounded"></div></div>
              </div>
              <span className="text-[7px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-1">{cleanAsciiText(activePrintCertificate.qrCode)}</span>
            </div>

            <div className="flex gap-8 text-center">
              <div>
                <div className="h-7 border-b border-slate-300 w-28 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Sub-Registrar</p>
                <p className="text-[8px] text-slate-500">Gram Panchayath Office</p>
              </div>
              <div>
                <div className="h-7 border-b border-slate-300 w-36 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Registrar of Births &amp; Deaths</p>
                <p className="text-[8px] text-slate-500">Namma Panchayath e-Governance</p>
              </div>
            </div>
          </div>

          <p className="text-[8px] text-slate-400 mt-6 italic">
            Statutory Notice: This is a computer-generated Birth Certificate issued under IT Act 2000 &amp; Section 12/17 of RBD Act 1969.
          </p>
        </div>
      ) : activePrintCertificate && activePrintCertificate.type === 'Income' ? (
        <div className="printable-certificate hidden print:block max-w-2.5xl mx-auto border-8 border-double border-slate-700 p-8 text-center bg-white">
          {/* Top Header with Namma Panchayath Logo on Left */}
          <div className="flex justify-between items-center border-b border-slate-300 pb-4">
            <div className="flex items-center gap-3 text-left">
              <img
                src={svgLogo}
                alt="Namma Panchayath Official Logo"
                className="h-16 w-16 object-contain rounded-full border border-slate-200 bg-[#FDFBF7] p-1 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-xs font-mono font-extrabold text-[#1E3A8A] block uppercase">GOVERNMENT OF KARNATAKA</span>
                <span className="text-[10px] font-mono font-bold text-slate-700 block uppercase">Department of Revenue &amp; Rural Development</span>
                <span className="text-[11px] font-mono font-bold text-emerald-800 block uppercase">Gram Panchayath Namma Panchayath - Revenue Wing</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-extrabold text-blue-900 block">FORM - F</span>
              <span className="text-[9px] font-mono text-slate-500 block">(See Rule 3B)</span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-6 uppercase">
            INCOME AND ASSET CERTIFICATE
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wide">
            (ISSUED UNDER SECTION 15 OF THE KARNATAKA GRAM SWARAJ &amp; PANCHAYATH RAJ ACT &amp; REVENUE RULES)
          </p>

          <p className="text-[11px] text-slate-600 mt-4 leading-relaxed max-w-xl mx-auto italic">
            This is to certify that after due inquiry, field inspection, and verification of local revenue records, the gross annual family income from all sources of the resident specified below is declared as follows:
          </p>

          {/* Registration Details Strip */}
          <div className="mt-4 max-w-xl mx-auto bg-slate-50 border border-slate-300 rounded-lg p-2.5 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">RD Reference No:</span>
              <span className="font-bold text-blue-900">RD-INC-2026-{cleanAsciiText(activePrintCertificate.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(activePrintCertificate.id).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Application Date:</span>
              <span className="font-bold text-slate-800">{new Date(activePrintCertificate.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Issue:</span>
              <span className="font-bold text-emerald-800">{cleanAsciiText(getCertificateIssueDate(activePrintCertificate))}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Validity:</span>
              <span className="font-bold text-amber-800">1 Year</span>
            </div>
          </div>

          {/* Structured Table */}
          <div className="mt-5 max-w-xl mx-auto border border-slate-400 rounded-lg overflow-hidden text-xs text-left">
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">1. Name of Applicant</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.citizenName || 'Ramesh Patel')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">2. Father's / Guardian's Name</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                {cleanAsciiText(activePrintCertificate.details?.fatherName || activePrintCertificate.details?.guardianName || 'Suresh Patel (Head of Family)')}
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">3. Residential Address</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.zone || 'Ward No. 1')}, Namma Panchayath, Karnataka - 560083</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">4. Primary Occupation</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.occupation || 'Officer / Service')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">5. Source of Income</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.occupation || 'Officer / Service')} &amp; Declared Family Assets</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-amber-50/70">
              <div className="col-span-5 p-2.5 font-bold text-amber-950 bg-amber-100/60 border-r border-slate-300">6. Gross Assessed Annual Income</div>
              <div className="col-span-7 p-2.5 font-extrabold text-amber-900">
                Rs. {Number(activePrintCertificate.details?.annualIncome || 20000).toLocaleString('en-IN')}/- ({numberToWords(Number(activePrintCertificate.details?.annualIncome || 20000))})
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">7. Purpose of Certificate</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.purposeOfIssue || activePrintCertificate.details?.purpose || 'Higher Education / Scholarship / Government Scheme')}</div>
            </div>
            <div className="grid grid-cols-12 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">8. Non-Creamy Layer / Category</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                {Number(activePrintCertificate.details?.annualIncome || 20000) <= 800000 ? 'Eligible (Gross Income below standard upper threshold)' : 'General Category'}
              </div>
            </div>
          </div>

          {/* Digital Signature & Verification Box with Logo on Left */}
          <div className="mt-6 max-w-xl mx-auto rounded-xl border border-emerald-400 bg-emerald-50/90 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={svgLogo}
                alt="Namma Panchayath Logo"
                className="h-12 w-12 object-contain rounded-full border border-emerald-500 bg-white p-0.5 shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 inline" />
                  DIGITALLY SIGNED &amp; QR VERIFIED UNDER REVENUE ADMINISTRATION
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  Authorized Officer: <span className="font-bold text-slate-900">{cleanAsciiText(formatOfficerApproval(activePrintCertificate))}</span>
                </p>
              </div>
            </div>
            <div className="text-right text-[9px] text-slate-500">
              <p className="font-bold text-slate-700">Revenue Authority Seal</p>
              <p className="text-emerald-700">Gram Panchayath Office</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-end max-w-xl mx-auto">
            {/* Visual QR Code Generator */}
            <div className="flex flex-col items-center gap-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="h-14 w-14 bg-slate-800 p-1 rounded flex flex-col justify-between">
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-3.5 w-3.5 bg-white rounded"></div></div>
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-2.5 w-2.5 bg-white rounded"></div></div>
              </div>
              <span className="text-[7px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-1">{cleanAsciiText(activePrintCertificate.qrCode || activePrintCertificate.id)}</span>
            </div>

            <div className="flex gap-8 text-center">
              <div>
                <div className="h-7 border-b border-slate-300 w-32 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Village Revenue Inspector</p>
                <p className="text-[8px] text-slate-500">Gram Panchayath Office</p>
              </div>
              <div>
                <div className="h-7 border-b border-slate-300 w-36 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Panchayath Development Officer</p>
                <p className="text-[8px] text-slate-500">Namma Panchayath e-Governance</p>
              </div>
            </div>
          </div>

          <p className="text-[8px] text-slate-400 mt-6 italic">
            Statutory Notice: This is a computer-generated digitally authenticated Income Certificate issued under Section 6 of IT Act 2000. Valid for 1 year from the date of issue.
          </p>
        </div>
      ) : activePrintCertificate && activePrintCertificate.type === 'Marriage' ? (
        <div className="printable-certificate hidden print:block max-w-2.5xl mx-auto border-8 border-double border-slate-700 p-8 text-center bg-white">
          {/* Top Header with Namma Panchayath Logo on Left */}
          <div className="flex justify-between items-center border-b border-slate-300 pb-4">
            <div className="flex items-center gap-3 text-left">
              <img
                src={svgLogo}
                alt="Namma Panchayath Official Logo"
                className="h-16 w-16 object-contain rounded-full border border-slate-200 bg-[#FDFBF7] p-1 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-xs font-mono font-extrabold text-[#1E3A8A] block uppercase">GOVERNMENT OF KARNATAKA</span>
                <span className="text-[10px] font-mono font-bold text-slate-700 block uppercase">Department of Stamps &amp; Registration • Rural Development</span>
                <span className="text-[11px] font-mono font-bold text-emerald-800 block uppercase">Gram Panchayath Namma Panchayath - Marriage Registration Division</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-extrabold text-blue-900 block">FORM - IV</span>
              <span className="text-[9px] font-mono text-slate-500 block">(See Rule 6)</span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-6 uppercase">
            CERTIFICATE OF MARRIAGE
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wide">
            (ISSUED UNDER SECTION 15 OF THE KARNATAKA MARRIAGES (REGISTRATION) ACT &amp; CIVIL RULES)
          </p>

          <p className="text-[11px] text-slate-600 mt-4 leading-relaxed max-w-xl mx-auto italic">
            This is to certify that the marriage solemnized between the Bridegroom and Bride named below has been duly verified and registered in the Register of Marriages maintained by Gram Panchayath Namma Panchayath:
          </p>

          {/* Registration Details Strip */}
          <div className="mt-4 max-w-xl mx-auto bg-slate-50 border border-slate-300 rounded-lg p-2.5 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Marriage Reg No:</span>
              <span className="font-bold text-blue-900">MR-2026-{cleanAsciiText(activePrintCertificate.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(activePrintCertificate.id).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Registration Date:</span>
              <span className="font-bold text-slate-800">{new Date(activePrintCertificate.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Issue:</span>
              <span className="font-bold text-emerald-800">{cleanAsciiText(getCertificateIssueDate(activePrintCertificate))}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Ledger Folio:</span>
              <span className="font-bold text-slate-700">Vol. XII / 42</span>
            </div>
          </div>

          {/* Structured Table */}
          <div className="mt-5 max-w-xl mx-auto border border-slate-400 rounded-lg overflow-hidden text-xs text-left">
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">1. Bridegroom / Husband's Name</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.husbandName || activePrintCertificate.citizenName || 'Peter')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">2. Bride / Wife's Name</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                {cleanAsciiText(activePrintCertificate.details?.wifeName || 'Zendeya')}
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">3. Date of Marriage Solemnized</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.dateOfMarriage || '2025-11-11')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">4. Venue / Place of Marriage</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.placeOfMarriage || 'Community Temple Hall, Namma Panchayath')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">5. Husband's Permanent Address</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.zone || 'Ward No. 1')}, Namma Panchayath, Karnataka - 560083</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">6. Wife's Permanent Address</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.zone || 'Ward No. 1')}, Namma Panchayath, Karnataka - 560083</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">7. Act &amp; Authority</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">Karnataka Registration of Marriages Act, 1976 &amp; Local Rules</div>
            </div>
            <div className="grid grid-cols-12 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">8. Registration Ledger Status</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                Duly Recorded in Permanent Civil Marriage Register
              </div>
            </div>
          </div>

          {/* Digital Signature & Verification Box with Logo on Left */}
          <div className="mt-6 max-w-xl mx-auto rounded-xl border border-emerald-400 bg-emerald-50/90 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={svgLogo}
                alt="Namma Panchayath Logo"
                className="h-12 w-12 object-contain rounded-full border border-emerald-500 bg-white p-0.5 shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 inline" />
                  DIGITALLY SIGNED &amp; QR VERIFIED BY REGISTRAR OF MARRIAGES
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  Authorized Officer: <span className="font-bold text-slate-900">{cleanAsciiText(formatOfficerApproval(activePrintCertificate))}</span>
                </p>
              </div>
            </div>
            <div className="text-right text-[9px] text-slate-500">
              <p className="font-bold text-slate-700">Marriage Authority Seal</p>
              <p className="text-emerald-700">Gram Panchayath Office</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-end max-w-xl mx-auto">
            {/* Visual QR Code Generator */}
            <div className="flex flex-col items-center gap-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="h-14 w-14 bg-slate-800 p-1 rounded flex flex-col justify-between">
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-3.5 w-3.5 bg-white rounded"></div></div>
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-2.5 w-2.5 bg-white rounded"></div></div>
              </div>
              <span className="text-[7px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-1">{cleanAsciiText(activePrintCertificate.qrCode || activePrintCertificate.id)}</span>
            </div>

            <div className="flex gap-8 text-center">
              <div>
                <div className="h-7 border-b border-slate-300 w-32 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Panchayath Secretary</p>
                <p className="text-[8px] text-slate-500">Marriage Registration Officer</p>
              </div>
              <div>
                <div className="h-7 border-b border-slate-300 w-36 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Panchayath Development Officer</p>
                <p className="text-[8px] text-slate-500">Namma Panchayath e-Governance</p>
              </div>
            </div>
          </div>

          <p className="text-[8px] text-slate-400 mt-6 italic">
            Statutory Notice: This is a computer-generated digitally authenticated Marriage Certificate issued under Section 15 of Karnataka Marriages Act &amp; IT Act 2000.
          </p>
        </div>
      ) : activePrintCertificate && activePrintCertificate.type === 'Residence' ? (
        <div className="printable-certificate hidden print:block max-w-2.5xl mx-auto border-8 border-double border-slate-700 p-8 text-center bg-white">
          {/* Top Header with Namma Panchayath Logo on Left */}
          <div className="flex justify-between items-center border-b border-slate-300 pb-4">
            <div className="flex items-center gap-3 text-left">
              <img
                src={svgLogo}
                alt="Namma Panchayath Official Logo"
                className="h-16 w-16 object-contain rounded-full border border-slate-200 bg-[#FDFBF7] p-1 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-xs font-mono font-extrabold text-[#1E3A8A] block uppercase">GOVERNMENT OF KARNATAKA</span>
                <span className="text-[10px] font-mono font-bold text-slate-700 block uppercase">Department of Revenue &amp; Rural Development</span>
                <span className="text-[11px] font-mono font-bold text-emerald-800 block uppercase">Gram Panchayath Namma Panchayath - Citizen Services Wing</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-extrabold text-blue-900 block">FORM - III</span>
              <span className="text-[9px] font-mono text-slate-500 block">(See Rule 4)</span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-6 uppercase">
            RESIDENCE AND DOMICILE CERTIFICATE
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wide">
            (ISSUED UNDER SECTION 12 OF THE KARNATAKA GRAM SWARAJ &amp; PANCHAYATH RAJ ACT &amp; LOCAL CIVIL RULES)
          </p>

          <p className="text-[11px] text-slate-600 mt-4 leading-relaxed max-w-xl mx-auto italic">
            This is to certify that after due inquiry, electoral verification, and inspection of local household registers, the citizen named below is a bona fide resident of the territorial jurisdiction of Gram Panchayath Namma Panchayath:
          </p>

          {/* Registration Details Strip */}
          <div className="mt-4 max-w-xl mx-auto bg-slate-50 border border-slate-300 rounded-lg p-2.5 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">RD Reference No:</span>
              <span className="font-bold text-blue-900">RD-RES-2026-{cleanAsciiText(activePrintCertificate.id || '').replace(/[^0-9]/g, '') || cleanAsciiText(activePrintCertificate.id).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Application Date:</span>
              <span className="font-bold text-slate-800">{new Date(activePrintCertificate.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Issue:</span>
              <span className="font-bold text-emerald-800">{cleanAsciiText(getCertificateIssueDate(activePrintCertificate))}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Domicile Status:</span>
              <span className="font-bold text-slate-800">Permanent</span>
            </div>
          </div>

          {/* Structured Table */}
          <div className="mt-5 max-w-xl mx-auto border border-slate-400 rounded-lg overflow-hidden text-xs text-left">
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">1. Name of Resident / Citizen</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.citizenName || 'Ramesh Patel')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">2. Father's / Guardian's / Spouse Name</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                {cleanAsciiText(activePrintCertificate.details?.fatherName || activePrintCertificate.details?.guardianName || 'Suresh Patel')}
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">3. Complete Residential Address</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                {cleanAsciiText(activePrintCertificate.details?.houseNo || activePrintCertificate.details?.address || 'House No. 42/B')}, {cleanAsciiText(activePrintCertificate.zone || 'Ward No. 1')}, Namma Panchayath, Karnataka - 560083
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">4. Ward / Zone Jurisdiction</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.zone || 'Ward No. 1')} (Gram Panchayath Namma Panchayath)</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">5. Duration of Continuous Stay</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.durationOfStay || activePrintCertificate.details?.yearsOfResidence || '15 Years')} (Verified via Household Census)</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">6. Purpose of Certificate</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">{cleanAsciiText(activePrintCertificate.details?.purposeOfIssue || activePrintCertificate.details?.purpose || 'Government Identification / Address Verification')}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-slate-300 bg-white">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">7. Domicile Status</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">Bona Fide Permanent Resident of Karnataka State</div>
            </div>
            <div className="grid grid-cols-12 bg-slate-50/50">
              <div className="col-span-5 p-2.5 font-bold text-slate-700 bg-slate-50 border-r border-slate-300">8. Family Register Status</div>
              <div className="col-span-7 p-2.5 font-bold text-slate-900">
                Family Register Book Vol. 4, Page 88 • Verified
              </div>
            </div>
          </div>

          {/* Digital Signature & Verification Box with Logo on Left */}
          <div className="mt-6 max-w-xl mx-auto rounded-xl border border-emerald-400 bg-emerald-50/90 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={svgLogo}
                alt="Namma Panchayath Logo"
                className="h-12 w-12 object-contain rounded-full border border-emerald-500 bg-white p-0.5 shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 inline" />
                  DIGITALLY SIGNED &amp; QR VERIFIED BY PANCHAYATH REVENUE AUTHORITY
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  Authorized Officer: <span className="font-bold text-slate-900">{cleanAsciiText(formatOfficerApproval(activePrintCertificate))}</span>
                </p>
              </div>
            </div>
            <div className="text-right text-[9px] text-slate-500">
              <p className="font-bold text-slate-700">Civil Authority Seal</p>
              <p className="text-emerald-700">Gram Panchayath Office</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-end max-w-xl mx-auto">
            {/* Visual QR Code Generator */}
            <div className="flex flex-col items-center gap-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="h-14 w-14 bg-slate-800 p-1 rounded flex flex-col justify-between">
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-3.5 w-3.5 bg-white rounded"></div></div>
                <div className="flex justify-between"><div className="h-3.5 w-3.5 bg-white rounded"></div><div className="h-2.5 w-2.5 bg-white rounded"></div></div>
              </div>
              <span className="text-[7px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-1">{cleanAsciiText(activePrintCertificate.qrCode || activePrintCertificate.id)}</span>
            </div>

            <div className="flex gap-8 text-center">
              <div>
                <div className="h-7 border-b border-slate-300 w-32 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Village Accountant</p>
                <p className="text-[8px] text-slate-500">Revenue Inspector</p>
              </div>
              <div>
                <div className="h-7 border-b border-slate-300 w-36 mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-800 mt-1">Panchayath Development Officer</p>
                <p className="text-[8px] text-slate-500">Namma Panchayath e-Governance</p>
              </div>
            </div>
          </div>

          <p className="text-[8px] text-slate-400 mt-6 italic">
            Statutory Notice: This is a computer-generated digitally authenticated Residence Certificate issued under Karnataka Gram Swaraj Act &amp; IT Act 2000.
          </p>
        </div>
      ) : activePrintCertificate && (
        <div className="printable-certificate hidden print:block max-w-2.5xl mx-auto border-8 border-double border-slate-700 p-8 text-center bg-white">
          {/* Top Header with Namma Panchayath Logo on Left */}
          <div className="flex justify-between items-center border-b border-slate-300 pb-4">
            <div className="flex items-center gap-3 text-left">
              <img
                src={svgLogo}
                alt="Namma Panchayath Official Logo"
                className="h-16 w-16 object-contain rounded-full border border-slate-200 bg-[#FDFBF7] p-1 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-xs font-mono font-extrabold text-blue-900 block">STATE REVENUE DEPARTMENT</span>
                <span className="text-xs font-mono font-bold text-emerald-800 block">GRAM PANCHAYATH NAMMA PANCHAYATH</span>
                <span className="text-[9px] font-mono text-slate-500 block">Govt. of Karnataka • Rural Development</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-slate-700 block">DIGITAL e-GOVERNANCE PORTAL</span>
              <span className="text-[9px] font-mono text-slate-500 block">AUTHENTICATED RECORD LEDGER</span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-8">
            CERTIFICATE OF {activePrintCertificate.type.toUpperCase()}
          </h1>
          <p className="text-xs text-slate-500 mt-1">ISSUED UNDER DIGITAL e-GOVERNANCE ACT, NAMMA PANCHAYATH</p>

          <div className="mt-8 text-left text-xs space-y-3 leading-relaxed max-w-xl mx-auto">
            <p>This is to certify that, after proper verification of official local documents, the resident specified below is officially recorded under the Gram Panchayath ledgers:</p>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-y-2 gap-x-4">
              <p>Applicant Name: <span className="font-bold text-slate-900">{activePrintCertificate.citizenName}</span></p>
              <p>Certificate Type: <span className="font-bold text-slate-900">{activePrintCertificate.type} Certificate</span></p>
              <p>Verification Ref: <span className="font-bold text-slate-900">{activePrintCertificate.id}</span></p>
              <p>Issue Date: <span className="font-bold text-slate-900">{getCertificateIssueDate(activePrintCertificate)}</span></p>
            </div>

            <div className="mt-6">
              <h4 className="font-bold text-slate-800">Core Registered Demographics:</h4>
              <div className="mt-2 grid grid-cols-2 gap-2 bg-white border border-slate-200 p-3 rounded">
                {Object.entries(activePrintCertificate.details || {})
                  .filter(([k]) => k !== 'attachedDocuments')
                  .map(([k, v]: any) => (
                    <p key={k} className="capitalize">
                      {k.replace(/([A-Z])/g, ' $1')}: <span className="font-bold text-slate-900">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                    </p>
                  ))}
              </div>
            </div>
          </div>

          {/* Digital Signature & Verification Box with Logo on Left */}
          <div className="mt-8 max-w-xl mx-auto rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={svgLogo}
                alt="Namma Panchayath Logo"
                className="h-12 w-12 object-contain rounded-full border border-emerald-400 bg-white p-0.5 shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 inline" />
                  DIGITALLY SIGNED &amp; QR VERIFIED
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  Approved By: <span className="font-bold text-slate-900">{formatOfficerApproval(activePrintCertificate)}</span>
                </p>
              </div>
            </div>
            <div className="text-right text-[9px] text-slate-500">
              <p className="font-bold text-slate-700">Digital Seal Verified</p>
              <p className="text-emerald-700">Namma Panchayath Office</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-end max-w-xl mx-auto">
            {/* Visual QR Code Generator */}
            <div className="flex flex-col items-center gap-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              {/* QR Box representation */}
              <div className="h-16 w-16 bg-slate-800 p-1 rounded flex flex-col justify-between">
                <div className="flex justify-between"><div className="h-4 w-4 bg-white rounded"></div><div className="h-4 w-4 bg-white rounded"></div></div>
                <div className="flex justify-between"><div className="h-4 w-4 bg-white rounded"></div><div className="h-3 w-3 bg-white rounded"></div></div>
              </div>
              <span className="text-[7px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-1">{activePrintCertificate.qrCode}</span>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400">Digitally Authenticated By</p>
              <p className="text-xs font-bold text-slate-800 mt-1">{formatOfficerApproval(activePrintCertificate)}</p>
              <p className="text-[9px] text-slate-500">Gram Panchayath Namma Panchayath Office</p>
            </div>
          </div>
        </div>
      )}

      {/* Application Submission Modal */}
      {showApplyModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowApplyModal(false)}
        >
          <div
            className="relative my-auto w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <h3 className="font-display text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">Apply for Official Certificate</h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-[#243044] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#334155] hover:text-slate-800 dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Select Type */}
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Certificate Category</label>
              <select
                value={type}
                onChange={(e: any) => {
                  setType(e.target.value);
                  setFormData({});
                  setUploadedDocs({});
                }}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="Residence">Residence (Domicile / Address Proof)</option>
                <option value="Birth">Birth Certificate</option>
                <option value="Income">Income Certificate</option>
                <option value="Marriage">Marriage Certificate</option>
              </select>
            </div>

            <form onSubmit={handleApply} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {renderFormFields()}

              {/* Supporting Documents Upload Section */}
              <div className="sm:col-span-2 mt-2 border-t border-slate-100 dark:border-[#334155] pt-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-blue-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">
                      Required Supporting Documents ({type} Certificate)
                    </h4>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400">* Upload files to complete application</span>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {(CERTIFICATE_DOCUMENTS[type] || []).map(doc => {
                    const uploaded = uploadedDocs[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                          uploaded
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-slate-50/80 dark:bg-[#111827] border-slate-200 dark:border-[#334155]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">{doc.name}</span>
                            {doc.mandatory ? (
                              <span className="rounded bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">Required *</span>
                            ) : (
                              <span className="rounded bg-slate-200/70 dark:bg-slate-700/60 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-300">Optional</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{doc.description}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {uploaded ? (
                            <div className="flex items-center gap-2 bg-white dark:bg-[#243044] px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                              <FileCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold text-slate-800 dark:text-[#F8FAFC] max-w-[130px] truncate">{uploaded.fileName}</span>
                                <span className="text-[8px] text-slate-400 dark:text-slate-400">{uploaded.size}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(doc.id)}
                                className="ml-1 text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                title="Remove file"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-blue-200 dark:border-emerald-700 bg-white dark:bg-[#243044] px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-emerald-400 shadow-2xs hover:bg-blue-50 dark:hover:bg-[#334155] transition-colors">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Attach Copy</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => handleFileUpload(doc.id, e)}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex justify-end gap-2.5 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#334155] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting Form...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal for Officer & Citizen */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1E293B] p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-[#334155] flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-emerald-950/40 text-blue-600 dark:text-emerald-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 dark:text-[#F8FAFC] text-sm sm:text-base">
                    {viewingDoc.doc.title || 'Attached Document'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Applicant: <strong className="text-slate-800 dark:text-[#F8FAFC]">{viewingDoc.citizenName || 'Resident'}</strong> • {viewingDoc.certType || ''} Certificate Request
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document Info Badge */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>e-Panchayath Portal Verified Record</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-[#1E293B] px-2 py-0.5 rounded-md font-bold border border-emerald-200 dark:border-emerald-800/60">
                {viewingDoc.doc.fileName} ({viewingDoc.doc.size || 'Attached'})
              </span>
            </div>

            {/* Document Preview Canvas */}
            <div className="mt-3.5 flex-1 overflow-y-auto min-h-[280px] max-h-[460px] rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-100/70 dark:bg-[#111827] p-4 flex flex-col items-center justify-center">
              {viewingDoc.doc.dataUrl ? (
                viewingDoc.doc.dataUrl.startsWith('data:image') || (viewingDoc.doc.fileName && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(viewingDoc.doc.fileName)) ? (
                  <img
                    src={viewingDoc.doc.dataUrl}
                    alt={viewingDoc.doc.title}
                    className="max-h-[400px] w-auto max-w-full rounded-xl object-contain shadow-md border border-white dark:border-[#334155]"
                  />
                ) : (
                  <iframe
                    src={viewingDoc.doc.dataUrl}
                    title={viewingDoc.doc.title}
                    className="w-full h-[380px] rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B]"
                  />
                )
              ) : (
                /* Government Document Scanned Copy Replica for mock/sample records */
                <div className="w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-sm text-slate-800 dark:text-[#F8FAFC] flex flex-col gap-3.5 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                    <span className="text-6xl font-black text-slate-900 dark:text-white rotate-[-30deg]">OFFICIAL ATTACHMENT</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-[#334155] pb-2.5">
                    <div>
                      <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-[#F8FAFC]">Official Document Record</h5>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400">Panchayath Raj & Rural Development Department</p>
                    </div>
                    <span className="rounded-full bg-blue-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[9px] font-bold text-blue-800 dark:text-emerald-300 border border-blue-200 dark:border-emerald-800/60">
                      OFFICER VERIFIED
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 dark:border-[#334155] pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Document Type:</span>
                      <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{viewingDoc.doc.title}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-[#334155] pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Uploaded File:</span>
                      <span className="font-mono text-[11px] text-blue-700 dark:text-emerald-400 font-bold">{viewingDoc.doc.fileName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-[#334155] pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">File Size:</span>
                      <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{viewingDoc.doc.size || '145 KB'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-[#334155] pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Applicant Name:</span>
                      <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{viewingDoc.citizenName || 'Resident'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-[#334155] pb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Upload Status:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Valid & Verified
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 dark:bg-[#111827] p-2.5 border border-slate-200 dark:border-[#334155] text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-slate-800 dark:text-[#F8FAFC] mb-0.5">Verification Note for Officer:</p>
                    This document copy is attested and attached to certificate request ID. Cross-check name and address against Gram Panchayath voter ledger.
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[9px] text-slate-400 dark:text-slate-400 font-mono">
                    <span>Doc ID: {viewingDoc.doc.id || 'DOC-9021'}</span>
                    <span>Checksum: Valid (256-bit)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-[#334155] pt-3">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#334155] transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewingDoc.doc.dataUrl && viewingDoc.doc.dataUrl.startsWith('data:')) {
                    const a = document.createElement('a');
                    a.href = viewingDoc.doc.dataUrl;
                    a.download = viewingDoc.doc.fileName || `${viewingDoc.doc.title || 'Certificate_Document'}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  } else {
                    const textContent = `NAMMA PANCHAYATH OFFICIAL ATTESTED DOCUMENT\n\nDocument Title: ${viewingDoc.doc.title || 'Verified Document'}\nFile Name: ${viewingDoc.doc.fileName || 'document.pdf'}\nApplicant Name: ${viewingDoc.citizenName || 'Resident'}\nCertificate Type: ${viewingDoc.certType || 'Official Record'}\nVerification Checksum: GP-CERT-DOC-${Math.floor(100000 + Math.random() * 900000)}\nAttested Date: ${new Date().toLocaleString()}`;
                    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(viewingDoc.doc.fileName || viewingDoc.doc.title || 'Certificate_Document').replace(/\s+/g, '_')}_Attested.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Download Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Officer Deleting Certificate */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Confirm Certificate Deletion</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Officer Authorization Required</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                Are you sure you want to permanently delete this <strong>{deleteTarget.type} Certificate</strong> application for <strong>{deleteTarget.citizenName}</strong> (ID: <code className="font-mono text-rose-900 dark:text-rose-300 font-bold">{deleteTarget.id}</code>)?
              </p>
              <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                This record will be permanently removed from the Panchayath register.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#334155] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCertificate}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Certificate</span>
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
