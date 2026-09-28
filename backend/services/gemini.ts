import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

export async function analyzeGrievance(title: string, description: string, category: string) {
  if (!ai) {
    return {
      category,
      urgency: 'Medium',
      summary: 'Grievance received and queued for review by Gram Panchayath officers.',
      suggestedDepartment: 'General Administration'
    };
  }

  const prompt = `Analyze this Gram Panchayath grievance:
Title: ${title}
Description: ${description}
Category: ${category}

Respond with a valid JSON object containing:
- category: refined category name
- urgency: High | Medium | Low
- summary: brief 1-2 sentence summary
- suggestedDepartment: responsible department in Panchayath`;

  const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];

  for (const modelName of modelsToTry) {
    try {
      const fetchAi = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 4000));
      const response: any = await Promise.race([fetchAi, timeout]);

      if (response?.text) {
        return JSON.parse(response.text);
      }
    } catch (err: any) {
      // Continue to next model or default fallback
    }
  }

  return {
    category,
    urgency: 'Medium',
    summary: 'Grievance registered and assigned to Panchayath taskforce.',
    suggestedDepartment: 'Public Works & Sanitation'
  };
}

export async function getAiChatSupport(
  message: string,
  history: any[] = [],
  userRole: string = 'citizen',
  contextSummary: any = {}
) {
  const query = (message || '').trim().toLowerCase();
  const userName = contextSummary?.name || (userRole === 'officer' ? 'Officer' : userRole === 'admin' ? 'Administrator' : 'Citizen');
  const isGuest = userRole === 'guest' || !contextSummary?.isAuthenticated;

  // Immediate Greeting interceptor
  const isGreeting = /^(hi|hello|hey|namaste|namaskara|vanakkam|pranam|good\s*(morning|afternoon|evening|day)|greetings)(\s+.*|\!|\.|\?)*$/i.test(query) ||
    ['hi', 'hello', 'hey', 'namaste', 'namaskara'].includes(query);

  if (isGreeting) {
    if (isGuest) {
      return `Hi Visitor! What can I do for you?`;
    } else if (userRole === 'officer') {
      return `Hi Officer ${contextSummary?.name || ''}! What can I do for you?`.trim();
    } else {
      return `Hi ${userName}! What can I do for you?`;
    }
  }

  if (!ai) {
    return generateSmartFallbackResponse(message, userRole, contextSummary);
  }

  try {
    const rolePromptMap: Record<string, string> = {
      guest: `You are Gram Mitra AI, the dedicated public virtual guide for the Namma Panchayath Management System.
You are currently speaking to an UNAUTHENTICATED LANDING PAGE VISITOR.

YOUR MANDATE & SCOPE FOR UNAUTHENTICATED VISITORS:
1. You MUST answer questions about publicly available Namma Panchayath services, features, application procedures, certificates, welfare schemes, grievances, public notices, Panchayath assets, application tracking processes, language support (Kannada/English), and how to use the website.
2. STRICT PRIVACY & PERSONAL DATA PROTECTION RULE:
   - You MUST NEVER reveal or look up personal, private, or account-specific data for unauthenticated visitors (e.g. specific citizen grievance status, personal certificate applications, tax due amounts, personal profile info, or assigned officer details for a specific user).
   - IF A VISITOR ASKS FOR PERSONAL OR ACCOUNT-SPECIFIC INFORMATION (e.g., "What is my grievance status?", "Show my tax bill", "My certificate status", "Who is my assigned officer?", "My profile", "My account"):
     You MUST state clearly and politely:
     "To access your personal information, active application status, tax records, or assigned officer details, you must log into the Namma Panchayath portal. Please click 'Citizen Login' to sign into your account."`,

      citizen: `You are Gram Mitra AI, the dedicated in-application assistant for the Namma Panchayath Management System.
Your task is to assist Citizens with the services available inside this application:
- Applying for Certificates (Residence, Income, Birth, Death, Caste, Rural Area) & tracking status in "My Applications".
- Paying Municipal Taxes (Property Tax, Water Supply Bill, House Tax, Shop License) & downloading PDF payment receipts.
- Filing Civic Grievances (Water Supply, Streetlights, Roads, Sanitation) with interactive map locations & photos, and tracking status in "My Grievances".
- Exploring Active Welfare Schemes configured in the Namma Panchayath portal & submitting applications.
- Inspecting the Panchayath Assets Directory (Community Halls, Water Tanks, Borewells).
- Viewing Public Notices & Official Gram Sabha Announcements.`,

      officer: `You are Gram Mitra AI Co-Pilot, the dedicated in-application assistant for Panchayath Development Officers (PDO) and Field Officers.
Your task is to assist Officers with administrative workflows available in this application:
- Reviewing and approving/rejecting pending Certificate applications in the Certificates Desk.
- Managing assigned Ward Grievances, updating complaint status (In Progress / Resolved), and attaching site photo proof.
- Inspecting and updating operational logs for Panchayath Public Assets.
- Creating and broadcasting Public Notices & Gram Sabha announcements.
- Contacting other ward officers via the Officer Directory.`,

      admin: `You are Gram Mitra AI Executive Assistant, the dedicated in-application assistant for Sarpanch and Panchayath Administrators.
Your task is to assist Administrators with system management tools available in this application:
- Managing Panchayath Officers (Adding new officers, assigning wards/zones).
- Reviewing Citizen Profiles & jurisdiction records in Citizen Register.
- Overseeing Tax Collection Ledgers & unpaid accounts under Tax Desk.
- Viewing Executive Reports & Analytics (Revenue trends, Grievance SLA resolution rates, Certificate turnaround speed).
- Updating System Settings & portal configurations.`
    };

    const rolePrompt = rolePromptMap[userRole] || rolePromptMap.guest;

    const systemInstruction = `You are Gram Mitra AI, the dedicated IN-APPLICATION ASSISTANT for the Namma Panchayath Management System.

${rolePrompt}

STRICT IN-APPLICATION BOUNDARIES & OPERATIONAL RULES:
1. You MUST answer user questions based ONLY on the features, modules, data, workflows, and navigation paths available inside this Namma Panchayath application.
2. You MUST NOT provide general internet information, external government rules outside the application, or real-world offline procedures.
3. IF A REQUESTED FEATURE OR QUESTION DOES NOT EXIST IN THIS APPLICATION (e.g. Passport, Driving License, PAN Card, Aadhaar Card Enrollment/Update, Voter ID, Railway/Bus Tickets, external government websites like Seva Sindhu / Digilocker, or physical visits to district collectorate):
   You MUST state explicitly:
   "This feature is currently not available in the Namma Panchayath system."
   (You may then guide the user to relevant features that ARE available in this system).
4. Never invent unrequested features or reference external government websites unless explicitly configured by the administrator.

IN-APP EXACT MODULE & WORKFLOW GUIDE:
- Certificates Module ("Certificates Center"):
  • How to apply: Navigate to 'Certificates Center' in the sidebar -> Click 'Apply for Certificate' -> Select category (Income, Residence, Birth, Death, Caste) -> Fill details & upload required documents (Aadhaar, Electricity Bill, Ration Card as configured) -> Click 'Submit Application' -> Track status under 'My Applications' tab -> Download QR-verified PDF when approved by PDO.
- Taxes & Revenue Module ("Taxes & Revenue"):
  • How to pay: Navigate to 'Taxes & Revenue' -> View outstanding bills -> Click 'Pay Bill' -> Select payment mode -> Download official PDF receipt from 'Payment Receipts'.
- Grievance Redressal Module ("Grievance Redressal"):
  • How to file a civic grievance (MANDATORY EXACT FLOW):
    1. Navigate to 'Grievance Redressal' in the sidebar menu and click 'Lodge New Grievance'.
    2. Select category: Choose civic category (Water Supply, Streetlights, Roads & Potholes, Sanitation & Drainage, Waste Management, or Public Health).
    3. Select location: Pin the exact location on the interactive map or confirm your registered Ward/Zone.
    4. Add subject: Enter a concise title summarizing the problem.
    5. Add description: Provide detailed observations and attach photos if available.
    6. Select severity: Set urgency level (Low, Medium, High, or Critical).
    7. Submit grievance: Click 'Submit Grievance'.
    8. Receive grievance ID: Unique tracking ID (e.g., grv_...) is generated immediately.
    9. Track status: Monitor updates and officer resolution under the 'My Grievances' tab.
- Application Tracking Module:
  • How to track submissions:
    - Grievances: Navigate to 'Grievance Redressal' -> 'My Grievances' tab to view live status (Pending, Assigned, In Progress, Resolved).
    - Certificate applications: Navigate to 'Certificates Center' -> 'My Applications' tab to monitor verification and download certificates.
    - Welfare scheme applications: Navigate to 'Welfare Schemes' -> 'My Scheme Applications' tab.
    - Tax payment receipts: Navigate to 'Taxes & Revenue' -> 'Payment Receipts' tab to verify payments and download receipts.
    - If user provides an Application/Reference ID, look it up or ask them to provide their Reference ID.
- Welfare Schemes Module ("Welfare Schemes"):
  • How to apply: Navigate to 'Welfare Schemes' -> View active schemes -> Click 'Apply Now' -> Track status.
- Panchayath Assets Module ("Panchayath Assets"):
  • How to view: Navigate to 'Panchayath Assets' -> View interactive map & asset register -> Filter by category/zone.
- Public Notices ("Public Notices"):
  • View notices and announcements directly inside the app.

ACTIVE WELFARE SCHEMES CONFIGURED IN NAMMA PANCHAYATH DATABASE:
${(contextSummary?.activeSchemes || []).map((s: any) => `- **${s.name}** [Category: ${s.category || s.department || 'General'}]\n  • Benefits: ${s.benefits || s.description}\n  • Eligibility: ${s.eligibilityCriteria || 'Open to eligible Panchayath residents'}`).join('\n') || '- No active schemes currently listed.'}

CRITICAL WELFARE SCHEME MANDATE:
When the user asks about welfare schemes, government programs, or subsidies available in Namma Panchayath, you MUST list and describe ONLY the active schemes from the list above. Do NOT list, invent, or mention external or national schemes that are not in this list.

User System Context Snapshot: ${JSON.stringify(contextSummary)}

SYSTEM METRIC DATA (STRICT DATA DIRECTIVE):
When the user asks about the count or status of pending certificates, grievances, or unpaid taxes, you MUST strictly quote these exact live values from the User System Context Snapshot:
- Pending Certificates: ${contextSummary.pendingCertificates ?? 0}
- Total/Active Grievances: ${contextSummary.totalGrievances ?? 0}
- Unpaid Taxes Count: ${contextSummary.unpaidTaxesCount ?? 0}
Do NOT fabricate, guess, or hardcode any other numbers.

Formatting Instructions:
- Use clean Markdown formatting with clear headers, bullet points, and bold text.
- Refer to exact portal sections and buttons in bold text.`;

    const contents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      ...history.slice(-8).map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: typeof h.parts?.[0]?.text === 'string' ? h.parts[0].text : (h.message || String(h)) }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
    let resultText: string | null = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
        });
        if (response?.text) {
          resultText = response.text;
          break;
        }
      } catch (genErr: any) {
        // Fall back gracefully to the next model or smart response handler
      }
    }

    return resultText || generateSmartFallbackResponse(message, userRole, contextSummary);
  } catch (err) {
    return generateSmartFallbackResponse(message, userRole, contextSummary);
  }
}

function generateSmartFallbackResponse(message: string, userRole: string, contextSummary: any): string {
  const query = message.trim().toLowerCase();
  const isGuest = userRole === 'guest' || !contextSummary?.isAuthenticated;
  const userName = contextSummary?.name || (userRole === 'officer' ? 'Officer' : userRole === 'admin' ? 'Administrator' : 'Citizen');

  // Greeting check (Hi, Hello, Namaste, Hey, etc.)
  const isGreeting = /^(hi|hello|hey|namaste|namaskara|vanakkam|pranam|good\s*(morning|afternoon|evening|day)|greetings)(\s+.*|\!|\.|\?)*$/i.test(query) ||
    query === 'hi' || query === 'hello' || query === 'hey' || query === 'namaste' || query === 'namaskara';

  if (isGreeting) {
    if (isGuest) {
      return `Hi Visitor! What can I do for you?`;
    } else if (userRole === 'officer') {
      return `Hi Officer ${contextSummary?.name || ''}! What can I do for you?`.trim();
    } else {
      return `Hi ${userName}! What can I do for you?`;
    }
  }

  // Specific Reference ID Direct Lookup
  const idMatch = query.match(/\b(grv_[a-z0-9_-]+|cert_[a-z0-9_-]+|g_\d+|c_\d+)\b/i);
  if (idMatch) {
    const searchId = idMatch[1].toLowerCase();
    const userGrievances = contextSummary?.userGrievances || [];
    const userCertificates = contextSummary?.userCertificates || [];

    const matchedGrievance = userGrievances.find((g: any) => g.id.toLowerCase() === searchId || g.id.toLowerCase().includes(searchId));
    if (matchedGrievance) {
      return `### 📋 Grievance Status Details
- **Reference ID**: \`${matchedGrievance.id}\`
- **Subject**: **${matchedGrievance.title}**
- **Category**: ${matchedGrievance.category}
- **Current Status**: **${matchedGrievance.status}**
- **Assigned Officer**: ${matchedGrievance.assignedOfficerName || 'Ward Field Officer'}
- **Filed On**: ${matchedGrievance.createdAt ? new Date(matchedGrievance.createdAt).toLocaleDateString() : 'Recent'}

To view full details or track inspection updates, navigate to **Grievance Redressal** → **My Grievances**.`;
    }

    const matchedCert = userCertificates.find((c: any) => c.id.toLowerCase() === searchId || c.id.toLowerCase().includes(searchId));
    if (matchedCert) {
      return `### 📜 Certificate Application Status
- **Application ID**: \`${matchedCert.id}\`
- **Certificate**: **${matchedCert.certificateType}**
- **Current Status**: **${matchedCert.status}**
- **Submitted On**: ${matchedCert.createdAt ? new Date(matchedCert.createdAt).toLocaleDateString() : 'Recent'}

${matchedCert.status === 'Approved' ? '✅ Your certificate is approved! You can download your official QR-verified PDF directly from **Certificates Center** → **My Applications**.' : 'Your application is currently undergoing verification by the Panchayath Development Officer (PDO).'}`;
    }

    if (contextSummary?.isAuthenticated) {
      return `### 🔍 Reference ID Lookup
No active submission was found for Reference ID: \`${idMatch[1]}\`.

Please check your reference number:
- **Grievances**: Check under **Grievance Redressal** → **My Grievances**
- **Certificates**: Check under **Certificates Center** → **My Applications**
- **Welfare Schemes**: Check under **Welfare Schemes** → **My Scheme Applications**`;
    } else {
      return `### 🔒 Sign In to Track Specific ID
To track individual submissions with Reference ID \`${idMatch[1]}\`, please log into your registered citizen account:
1. Click **Citizen Login** at the top right of the landing page.
2. Sign in with your registered email or phone number.
3. Open Gram Mitra or visit **My Applications** / **My Grievances** to view real-time status.`;
    }
  }

  // Unauthenticated Privacy Protection Check (only for specific personal queries)
  const isGeneralInstructionQuery = query.includes('how to') || query.includes('how do i') || query.includes('how can i') || query.includes('guide') || query.includes('steps') || query.includes('track application') || query.includes('file grievance');
  if (isGuest && !isGeneralInstructionQuery) {
    const personalKeywords = [
      'my status', 'my grievance', 'my complaint', 'my certificate', 'my tax', 'my bill', 'my profile',
      'my application', 'my account', 'my details', 'who is my officer', 'my officer', 'assigned officer to me'
    ];
    if (personalKeywords.some(k => query.includes(k))) {
      return `### 🔒 Login Required to Access Personal Records
To view your personal information, active application status, tax records, or assigned officer details, you must log into the Namma Panchayath portal.

**Steps to Access Your Information:**
1. Click **Citizen Login** at the top right of the landing page.
2. Sign in with your registered email or phone number.
3. View your personal dashboard, **My Applications**, **My Grievances**, and **Due Taxes**.`;
    }
  }

  // Website usage & Language Support query
  if (query.includes('language') || query.includes('kannada') || query.includes('english') || query.includes('use website') || query.includes('how to use') || query.includes('portal guide')) {
    return `### 🌐 Portal Navigation & Usage Guide
Welcome to the **Namma Panchayath e-Governance Portal**!

**Key Features & Usage:**
- 🌍 **Language Support**: Use the **Kannada / English** toggle in the navigation bar to switch languages instantly.
- 🔐 **Citizen Account**: Click **Citizen Registration** to create an account and apply for services.
- 📜 **Certificates & Taxes**: Apply for certificates and pay municipal taxes online with instant PDF downloads.
- 🚨 **Civic Grievances**: Lodge complaints with GPS map location and photo attachments.
- 📢 **Public Information**: View official Gram Sabha notices, welfare schemes, and public assets.`;
  }

  // Out of scope / external feature detection
  const externalKeywords = [
    'passport', 'driving license', 'dl', 'pan card', 'pancard', 'aadhaar card', 'aadhar card',
    'voter id', 'voting card', 'election card', 'railway', 'train ticket', 'bus ticket',
    'seva sindhu', 'digilocker', 'income tax return', 'itr', 'district collector', 'epfo', 'pf'
  ];

  if (externalKeywords.some(k => query.includes(k))) {
    return `### ℹ️ Feature Availability Notice
This feature is currently not available in the Namma Panchayath system.

**Available Services in Namma Panchayath System:**
- 📜 **Certificates**: Residence, Income, Birth & Death certificates
- 💳 **Tax Payments**: Property Tax, Water Supply Bills & House Tax
- 🚨 **Civic Grievances**: Water supply, Streetlights, Roads & Sanitation
- 🏛️ **Welfare Schemes**: Gram Panchayath housing, agricultural & food subsidies
- 🏢 **Panchayath Assets**: Community halls, water tanks & borewell registry
- 📞 **Officer Directory**: Direct phone numbers of Sarpanch, PDO & Zone Officers`;
  }

  // Grievance Filing query (checked before generic water/tax checks)
  const isFilingGrievance = (
    query.includes('file a grievance') ||
    query.includes('file grievance') ||
    query.includes('lodge a grievance') ||
    query.includes('lodge grievance') ||
    query.includes('submit grievance') ||
    query.includes('raise a grievance') ||
    query.includes('raise grievance') ||
    query.includes('new grievance') ||
    query.includes('file a complaint') ||
    query.includes('file complaint') ||
    query.includes('lodge a complaint') ||
    query.includes('lodge complaint') ||
    query.includes('report issue') ||
    query.includes('report problem') ||
    query.includes('report a problem') ||
    query.includes('civic grievance') ||
    (query.includes('grievance') && !query.includes('track') && !query.includes('status')) ||
    (query.includes('complaint') && !query.includes('track') && !query.includes('status')) ||
    ((query.includes('street light') || query.includes('streetlight') || query.includes('pothole') || query.includes('drainage') || query.includes('sanitation')) && !query.includes('tax') && !query.includes('pay') && !query.includes('track'))
  );

  if (isFilingGrievance) {
    if (userRole === 'officer') {
      return `### 🚨 Zone Grievance Resolution Workflow
1. Navigate to **Officer Grievances** in the sidebar.
2. View complaints assigned to your ward (Total Registered: **${contextSummary.totalGrievances ?? 0}**).
3. Click on a ticket to inspect the issue description, site photo, and pinned map location.
4. Update complaint status to **In Progress** or **Resolved**.
5. Upload site photo proof of repair completion.`;
    }
    if (userRole === 'admin') {
      return `### 📊 Grievance Redressal Oversight
1. Navigate to **Reports & Analytics** in the sidebar.
2. Review overall resolution SLA times, open tickets (**${contextSummary.totalGrievances ?? 0}**), and officer ward performance.`;
    }
    return `### 🚨 How to File a Civic Grievance

Follow these exact steps inside the application:

1. **Navigate to Grievance Redressal**: Go to **Grievance Redressal** in the sidebar menu and click **Lodge New Grievance**.
2. **Select Category**: Choose the relevant civic category (Water Supply, Streetlights, Roads & Potholes, Sanitation & Drainage, Waste Management, or Public Health).
3. **Select Location**: Pin the exact problem location on the interactive GPS map or verify your registered Ward/Zone address.
4. **Add Subject**: Enter a clear, concise title summarizing your issue.
5. **Add Description**: Describe the problem in detail and attach on-site photos/images if available.
6. **Select Severity**: Choose the urgency level (**Low**, **Medium**, **High**, or **Critical**).
7. **Submit Grievance**: Click the **Submit Grievance** button to register your complaint.
8. **Receive Grievance ID**: The system immediately generates a unique tracking Reference ID (e.g., \`grv_174...\`).
9. **Track Status**: Monitor live updates, field inspection notes, and officer resolution under the **My Grievances** tab.`;
  }

  // Application / Submission Tracking query
  const isTrackingQuery = (
    query.includes('track') ||
    query.includes('tracking') ||
    (query.includes('status') && !query.includes('how to file') && !query.includes('how do i file')) ||
    query.includes('check application') ||
    query.includes('track application') ||
    query.includes('track grievance') ||
    query.includes('check my')
  );

  if (isTrackingQuery) {
    return `### 🔍 How to Track Your Applications & Submissions

You can track the real-time status of all your submissions across the portal:

- 🚨 **Grievances**:
  Navigate to **Grievance Redressal** → Select the **My Grievances** tab to check live progress (**Pending**, **Assigned**, **In Progress**, **Resolved**), inspect field remarks, and view your assigned ward officer.

- 📜 **Certificate Applications**:
  Navigate to **Certificates Center** → Select the **My Applications** tab to view verification progress (Residence, Income, Birth, Death, Caste) and download QR-verified digital certificates once approved.

- 🏛️ **Welfare Scheme Applications**:
  Navigate to **Welfare Schemes** → Select the **My Scheme Applications** tab to view application review status, officer verification, and sanction updates.

- 💳 **Tax Payment Receipts**:
  Navigate to **Taxes & Revenue** → Select **Payment Receipts** to verify cleared property/water tax payments and download official stamped PDF receipts.

💬 **Have an Application or Reference ID?**
Please reply with your **Application or Grievance Reference ID** (e.g., \`grv_...\` or \`cert_...\`) to look up its latest status directly!`;
  }

  // Certificate query
  if (query.includes('certificate') || query.includes('residence') || query.includes('income') || query.includes('birth') || query.includes('death') || query.includes('caste')) {
    if (userRole === 'officer') {
      return `### 📄 Certificate Verification Workflow
As a Panchayath Officer, you can manage citizen applications directly inside this portal:
1. Navigate to **Certificates Center** from the sidebar.
2. Review pending applications in your assigned queue (Current Pending: **${contextSummary.pendingCertificates ?? 0}**).
3. Inspect attached citizen documents (Electricity Bill, Aadhaar, Ration Card).
4. Click **Approve Certificate** to issue a QR-verified PDF or **Reject / Request Re-submission**.

*Note: Gram Mitra AI provides workflow guidance. Record updates are executed using the portal controls.*`;
    }
    if (userRole === 'admin') {
      return `### 📊 Certificate Issuance Analytics
- **Pending Approvals**: **${contextSummary.pendingCertificates ?? 0}** applications.
- **Management Step**: Navigate to **Reports & Analytics** in the sidebar to review approval turnaround times across all zones.`;
    }
    return `### 📜 How to Apply for Certificates
Follow these exact steps inside the application:
1. Navigate to **Certificates Center** in the sidebar menu.
2. Click **Apply for Certificate** and select the certificate category (e.g., **Income Certificate** or **Residence Certificate**).
3. Upload the required documents configured in the system (e.g., Proof of local residence, Ration Card, or Electricity Bill).
4. Click **Submit Application**.
5. Track your live status under the **My Applications** tab.
6. Once approved by the Panchayath Development Officer (PDO), download your official QR-verified PDF certificate directly from the portal.`;
  }

  // Tax query
  const isTaxQuery = (
    query.includes('tax') ||
    query.includes('property tax') ||
    query.includes('water tax') ||
    query.includes('water bill') ||
    query.includes('house tax') ||
    query.includes('pay bill') ||
    query.includes('pay taxes') ||
    query.includes('tax payment') ||
    query.includes('due taxes') ||
    (query.includes('pay') && (query.includes('bill') || query.includes('receipt') || query.includes('online')))
  );

  if (isTaxQuery) {
    if (userRole === 'officer' || userRole === 'admin') {
      return `### 💳 Revenue & Tax Management Desk
1. Navigate to **Tax Management Desk** (or **Taxes & Revenue**) in the sidebar.
2. Review zone tax ledgers and unpaid accounts (Current Unpaid: **${contextSummary.unpaidTaxesCount ?? 0}**).
3. Issue payment demand notices or log offline payments.
4. For revenue collection trends and financial audits, navigate to **Reports & Analytics**.`;
    }
    return `### 💳 How to Pay Taxes Online
Follow these exact steps inside the application:
1. Navigate to **Taxes & Revenue** in the sidebar menu.
2. View your outstanding bills under **Due Taxes** (Property Tax, Water Bill, House Tax).
3. Click **Pay Bill** next to the tax item.
4. Select your preferred payment method (UPI, Debit/Credit Card, Net Banking).
5. Complete the payment to update your account status instantly.
6. View and download your official PDF tax payment receipt under **Payment Receipts**.`;
  }

  // Scheme query
  if (query.includes('scheme') || query.includes('subsidy') || query.includes('welfare') || query.includes('yojana') || query.includes('benefit') || query.includes('kisan') || query.includes('awas') || query.includes('bhagya') || query.includes('krishi') || query.includes('vidya') || query.includes('jeevan') || query.includes('mahila') || query.includes('suraksha') || query.includes('yuva')) {
    const activeSchemes: any[] = contextSummary?.activeSchemes || [];
    
    if (activeSchemes.length === 0) {
      return `### 🏛️ Welfare Schemes in Namma Panchayath
There are currently no active welfare schemes configured in the Panchayath portal.

**How to check for updates:**
1. Navigate to **Welfare Schemes** in the sidebar menu.
2. New schemes announced by the Gram Panchayath will appear automatically.`;
    }

    const schemeNamesList = activeSchemes.map((s: any) => `* **${s.name}**`).join('\n');
    const schemeDetailsList = activeSchemes.map((s: any) => `* **${s.name}**${s.category ? ` *(${s.category})*` : ''}\n  - **Benefits**: ${s.benefits || s.description}\n  - **Eligibility**: ${s.eligibilityCriteria || 'Open to eligible Panchayath residents'}`).join('\n\n');

    return `### Active Welfare Schemes Available in the Portal:
${schemeNamesList}

---

### 📋 Scheme Details & Eligibility:
${schemeDetailsList}

---

### 🚀 How to Apply:
1. Navigate to **Welfare Schemes** in the sidebar menu.
2. Click **Apply Now** on your desired scheme.
3. Fill out the online application and attach required documents.
4. Track your application status under **My Scheme Applications**.
5. You can also use our **AI Scheme Checker** to evaluate your eligibility interactively!`;
  }

  // Asset query
  if (query.includes('asset') || query.includes('facility') || query.includes('building') || query.includes('hall') || query.includes('tank') || query.includes('pump')) {
    if (userRole === 'officer' || userRole === 'admin') {
      return `### 🏢 Panchayath Asset Register Management
1. Navigate to **Panchayath Assets** in the sidebar menu.
2. View public assets across all wards (Community Halls, Water Tanks, Borewells, Solar Lights).
3. Add new assets, update asset operational condition, or log maintenance inspections.`;
    }
    return `### 🏢 Panchayath Asset Directory
Follow these exact steps inside the application:
1. Navigate to **Panchayath Assets** in the sidebar menu.
2. Filter public assets by category (Community Halls, Overhead Water Tanks, Borewells).
3. View asset operational status, GPS map location, and inspection logs.`;
  }

  // Officer / Contact query
  if (query.includes('officer') || query.includes('contact') || query.includes('phone') || query.includes('pdo') || query.includes('sarpanch') || query.includes('directory')) {
    if (userRole === 'admin') {
      return `### 👥 Officer Directory Management
1. Navigate to **Officer Directory** (or **Officer Management**) in the sidebar menu.
2. Click **Add Officer** to register new officers.
3. Edit officer contact numbers, email addresses, and assigned ward jurisdictions.`;
    }
    return `### 📞 How to Find Officer Contacts
Follow these exact steps inside the application:
1. Navigate to **Officer Directory** in the sidebar menu.
2. View official phone numbers, email addresses, and office hours for:
   - **Sarpanch**: Rajesh Kumar Singh
   - **Panchayath Development Officer (PDO)**: Sunita Sharma
   - **Zone Officers** for North, South, East, and West Wards.`;
  }


  // Role Default
  if (userRole === 'officer') {
    return `Hello Officer! I am **Gram Mitra AI Co-Pilot**, your in-application workflow guide.\n\nI can help you navigate officer tasks in this system:\n- 📋 **Certificates Desk**: Approve/reject pending certificate requests.\n- 🚨 **Officer Grievances**: Resolve assigned ward complaints and attach site photos.\n- 🏛️ **Panchayath Assets**: Manage public asset inspection logs.\n- 📢 **Public Notices**: Broadcast announcements to citizens.`;
  }

  if (userRole === 'admin') {
    return `Welcome Administrator! I am **Gram Mitra AI Executive Assistant**, your in-application management guide.\n\nI can help you navigate administrative tools in this system:\n- 👥 **Officer Directory**: Add officers and assign ward zones.\n- 📊 **Reports & Analytics**: Track revenue trends and grievance SLA metrics.\n- 💳 **Tax Desk**: Inspect unpaid tax ledgers.\n- ⚙️ **Settings**: Configure portal preferences.`;
  }

  return `Hello! I am **Gram Mitra AI**, your virtual guide for the Namma Panchayath Management System.\n\nI can guide you through the features available in this application:\n- 📜 **Certificates Center** (Residence, Income, Birth & Death)\n- 💳 **Taxes & Revenue** (Property Tax, Water Bill, House Tax)\n- 🚨 **Grievance Redressal** (Water, Streetlights, Roads, Sanitation)\n- 🏛️ **Welfare Schemes** (Eligibility & Applications)\n- 🏢 **Panchayath Assets** (Public Facilities Directory)\n- 📞 **Officer Directory** (Officer phone numbers & emails)\n\nIf you ask about a feature not in this app, I will inform you immediately!`;
}

export interface SchemeCheckerResult {
  schemeId: string;
  schemeName: string;
  status: 'Eligible' | 'Not Eligible' | 'More Information Required';
  explanation: string;
  unmetRequirement?: string;
  missingInformation?: string;
  benefits: string;
  requiredDocuments: string[];
  category?: string;
  department?: string;
}

export interface SchemeCheckerResponse {
  type: 'question' | 'evaluation';
  message: string;
  options?: string[];
  collectedDetails: Record<string, any>;
  results?: SchemeCheckerResult[];
}

export async function runSchemeCheckerChat(
  messages: Array<{ sender: 'bot' | 'user'; text: string }>,
  existingDetails: Record<string, any> = {},
  userProfile?: any,
  activeSchemes: any[] = []
): Promise<SchemeCheckerResponse> {
  const schemesList = activeSchemes && activeSchemes.length > 0 ? activeSchemes : [];
  
  if (schemesList.length === 0) {
    return {
      type: 'evaluation',
      message: 'There are currently no active welfare schemes configured in the Panchayath database.',
      collectedDetails: existingDetails,
      results: []
    };
  }

  // If Gemini AI client is available, leverage gemini-3.7-flash with JSON mode
  if (ai) {
    try {
      const userMessageCount = messages.filter(m => m.sender === 'user').length;
      const prompt = `You are "Gram Mitra AI", the intelligent conversational Scheme Eligibility Advisor for Namma Panchayath.
You are conducting a structured 4-question step-by-step interview to assess citizen eligibility for active welfare schemes in Namma Panchayath.

CRITICAL WELFARE SCHEMES CONFIGURED IN DATABASE:
${JSON.stringify(schemesList.map(s => ({
  id: s.id,
  name: s.name,
  category: s.category,
  description: s.description,
  benefits: s.benefits,
  eligibilityCriteria: s.eligibilityCriteria,
  requiredDocuments: s.requiredDocuments || ['Aadhaar Card', 'Income Certificate', 'Ration Card', 'Bank Passbook', 'Passport Photo']
})), null, 2)}

INTERVIEW PROTOCOL (MANDATORY 4-QUESTION PROGRESSION):
You MUST ask the citizen 4 distinct questions one by one before providing final evaluation results.
Current user response count in this chat: ${userMessageCount}

IMPORTANT FORMATTING RULE:
Do NOT include question numbers (like 'Question 1 of 4') or markdown asterisks (**) in your question messages. Keep questions clean and natural.

- If User Response Count is 0:
  Ask Question 1 (Income): "Hi! I'm Gram Mitra. I can help you find welfare schemes you may be eligible for in Namma Panchayath. I'll ask you 4 quick questions to check your eligibility.\n\nWhat is your approximate annual family income?"
  options: ["Below ₹1,50,000", "₹1,50,000 - ₹2,50,000", "₹2,50,000 - ₹3,50,000", "Above ₹3,50,000"]
  type: "question"

- If User Response Count is 1:
  Ask Question 2 (Occupation): "What is your primary occupation or livelihood?"
  options: ["Farmer / Agriculture", "Small Business Owner", "Student / Higher Education", "Daily Wage Worker", "Homemaker", "Salaried Officer", "Others"]
  type: "question"

- If User Response Count is 2:
  Ask Question 3 (BPL / Ration Card): "Do you hold a BPL (Below Poverty Line) or Priority Ration Card?"
  options: ["Yes, BPL / Priority Card", "No (APL / General)"]
  type: "question"

- If User Response Count is 3:
  Ask Question 4 (Age & Household Assets): "What is your age group (and any special category like small land holding)?"
  options: ["18 - 30 Years", "31 - 59 Years", "60+ Years (Senior Citizen)", "Student with 75%+ Marks", "Farmer with < 5 Acres"]
  type: "question"

- If User Response Count >= 4:
  Provide the final assessment!
  type: "evaluation"
  message: "Thank you! I have analyzed all your details against the active welfare schemes in Namma Panchayath. Here is your comprehensive eligibility assessment:"
  results: Array evaluating EVERY scheme in the active schemes list above with "Eligible", "Not Eligible", or "More Information Required".

Extract collected user details into "collectedDetails" (income, occupation, isBpl, age, gender, landAcres, isStudent, etc.).

Full Conversation History:
${messages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

Respond ONLY with valid JSON matching this schema:
{
  "type": "question" | "evaluation",
  "message": "string",
  "options": ["string", "string"], // pills for question type
  "collectedDetails": { ... },
  "results": [ // ONLY when type is "evaluation"
    {
      "schemeId": "string",
      "schemeName": "string",
      "status": "Eligible" | "Not Eligible" | "More Information Required",
      "explanation": "string",
      "unmetRequirement": "string",
      "missingInformation": "string",
      "benefits": "string",
      "requiredDocuments": ["string"],
      "category": "string",
      "department": "string"
    }
  ]
}`;

      const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest'];
      for (const modelName of modelsToTry) {
        try {
          const fetchAi = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 6500));
          const response: any = await Promise.race([fetchAi, timeout]);

          if (response?.text) {
            const parsed = JSON.parse(response.text);
            if (parsed && parsed.message) {
              return {
                type: (parsed.type === 'evaluation' && userMessageCount >= 3) ? 'evaluation' : (parsed.type === 'evaluation' && userMessageCount < 3) ? 'question' : parsed.type,
                message: parsed.message,
                options: Array.isArray(parsed.options) ? parsed.options : undefined,
                collectedDetails: parsed.collectedDetails || existingDetails,
                results: Array.isArray(parsed.results) && userMessageCount >= 3 ? parsed.results : undefined
              };
            }
          }
        } catch (err: any) {
          // Try next model or fallback
        }
      }
    } catch (err) {
      console.error('Gemini scheme checker error:', err);
    }
  }

  // Robust deterministic fallback evaluator that dynamically checks the exact database schemes
  return evaluateSchemesFallback(messages, existingDetails, userProfile, schemesList);
}

/**
 * Intelligent deterministic rule engine that parses citizen inputs across 4 sequential questions
 */
function evaluateSchemesFallback(
  messages: Array<{ sender: 'bot' | 'user'; text: string }>,
  existingDetails: Record<string, any> = {},
  userProfile?: any,
  schemesList: any[] = []
): SchemeCheckerResponse {
  const details = { ...existingDetails };

  // Parse all user messages
  const userMessages = messages.filter(m => m.sender === 'user').map(m => m.text.toLowerCase());
  const userAnswersCount = userMessages.length;

  for (const text of userMessages) {
    // 1. Income detection
    const lakhMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lacs|lac|l)/i);
    const numMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d{4,9})/i);
    if (lakhMatch) {
      details.income = parseFloat(lakhMatch[1]) * 100000;
    } else if (text.includes('below') || text.includes('< 1,50,000') || text.includes('1,20,000') || text.includes('150000')) {
      details.income = 120000;
    } else if (text.includes('1,50,000 - 2,50,000') || text.includes('1.5') || text.includes('2,00,000') || text.includes('180000')) {
      details.income = 180000;
    } else if (text.includes('2,50,000 - 3,50,000') || text.includes('2,50,000 - 4,00,000') || text.includes('3,00,000')) {
      details.income = 280000;
    } else if (text.includes('above') || text.includes('4,00,000') || text.includes('5,00,000')) {
      details.income = 500000;
    } else if (numMatch && !text.includes('year') && !text.includes('age') && !text.includes('old') && !text.includes('acre')) {
      const cleanNum = numMatch[1].replace(/,/g, '');
      const parsedVal = parseInt(cleanNum, 10);
      if (parsedVal > 1500 && parsedVal <= 20000000) {
        details.income = parsedVal;
      }
    }

    // 2. Occupation detection
    if (text.includes('farmer') || text.includes('agriculture') || text.includes('farming') || text.includes('cultivator') || text.includes('crop')) {
      details.occupation = 'Farmer';
    } else if (text.includes('student') || text.includes('studying') || text.includes('college') || text.includes('school')) {
      details.occupation = 'Student';
      details.isStudent = true;
    } else if (text.includes('teacher') || text.includes('teaching')) {
      details.occupation = 'Teacher';
    } else if (text.includes('business') || text.includes('shop') || text.includes('trade') || text.includes('merchant') || text.includes('store')) {
      details.occupation = 'Small Business Owner';
    } else if (text.includes('software') || text.includes('engineer') || text.includes('salaried') || text.includes('employee') || text.includes('officer')) {
      details.occupation = 'Salaried Officer';
    } else if (text.includes('homemaker') || text.includes('housewife') || text.includes('women entrepreneur')) {
      details.occupation = 'Homemaker';
      details.gender = 'Female';
    } else if (text.includes('labor') || text.includes('labour') || text.includes('worker') || text.includes('daily wage')) {
      details.occupation = 'Daily Wage Worker';
    }

    // 3. BPL / Ration Card status (Strictly only when text indicates BPL status)
    if (text.includes('bpl') || text.includes('below poverty') || text.includes('priority card') || text.includes('antyodaya')) {
      if (text.includes('yes') || text.includes('i have') || text.includes('holder') || !text.includes('no')) {
        details.isBpl = true;
      }
    }
    if (text.includes('apl') || text.includes('non-bpl') || text.includes('no (apl') || text.includes('general ration')) {
      details.isBpl = false;
    }
    if (text === 'yes' || text === 'yes, bpl / priority card' || text === 'yes, bpl card holder' || text === 'yes i do') {
      details.isBpl = true;
    }
    if (text === 'no' || text === 'no (apl / general)' || text === 'no, not a bpl holder' || text === 'no (apl / non-bpl card)') {
      details.isBpl = false;
    }

    // 4. Age and Special Categories
    if (text.includes('senior') || text.includes('60+') || text.includes('60 years') || text.includes('elderly')) {
      details.age = 65;
      details.isSenior = true;
    } else if (text.includes('18 - 30') || text.includes('18-30') || text.includes('youth') || text.includes('22') || text.includes('25')) {
      details.age = 24;
    } else if (text.includes('31 - 59') || text.includes('31-59') || text.includes('35') || text.includes('45')) {
      details.age = 40;
    } else {
      const ageMatch = text.match(/\b(\d{2})\b/);
      if (ageMatch && !text.includes('₹') && !text.includes('lakh')) {
        const val = parseInt(ageMatch[1], 10);
        if (val >= 18 && val <= 100) details.age = val;
      }
    }

    // 5. Land holding & Education marks
    if (text.includes('acre') || text.includes('< 5') || text.includes('small farmer') || text.includes('land')) {
      details.landAcres = 2;
      details.hasLand = true;
    }
    if (text.includes('75%') || text.includes('marks') || text.includes('scholarship')) {
      details.isStudent = true;
      details.twelfthMarks = 82;
    }
  }

  // Question 1: Annual Family Income
  if (userAnswersCount === 0) {
    return {
      type: 'question',
      message: "Hi! I'm Gram Mitra. I can help you find welfare schemes you may be eligible for in Namma Panchayath. I will ask you 4 quick questions to check your eligibility.\n\nWhat is your approximate annual family income?",
      options: ['Below ₹1,50,000', '₹1,50,000 - ₹2,50,000', '₹2,50,000 - ₹3,50,000', 'Above ₹3,50,000'],
      collectedDetails: details
    };
  }

  // Question 2: Primary Occupation
  if (userAnswersCount === 1) {
    return {
      type: 'question',
      message: "What is your primary occupation or livelihood?",
      options: ['Farmer / Agriculture', 'Small Business Owner', 'Student / Higher Education', 'Daily Wage Worker', 'Homemaker', 'Salaried Officer', 'Others'],
      collectedDetails: details
    };
  }

  // Question 3: BPL / Ration Card Status
  if (userAnswersCount === 2) {
    return {
      type: 'question',
      message: "Do you hold a BPL (Below Poverty Line) or Priority Ration Card?",
      options: ['Yes, BPL / Priority Card', 'No (APL / Non-BPL Card)'],
      collectedDetails: details
    };
  }

  // Question 4: Age Group & Category
  if (userAnswersCount === 3) {
    return {
      type: 'question',
      message: "What is your age group (and any special category like small land holding)?",
      options: ['18 - 30 Years', '31 - 59 Years', '60+ Years (Senior Citizen)', 'Student with 75%+ Marks', 'Farmer with < 5 Acres'],
      collectedDetails: details
    };
  }

  // Full evaluation after all 4 questions!
  const results: SchemeCheckerResult[] = schemesList.map(scheme => {
    const crit = (scheme.eligibilityCriteria || '').toLowerCase();
    const schemeName = scheme.name || 'Welfare Scheme';
    const benefits = scheme.benefits || 'Panchayath subsidy and welfare support';
    const requiredDocs = scheme.requiredDocuments || ['Aadhaar Card', 'Income Certificate', 'Ration Card', 'Bank Passbook', 'Passport Photo'];
    const dept = scheme.department || 'Administration';
    const cat = scheme.category || 'General';

    let isEligible = true;
    const matchedCriteria: string[] = [];
    let unmetReason = '';

    // Age requirement
    if (crit.includes('60 years') || crit.includes('senior citizen') || crit.includes('elderly')) {
      const userAge = details.age || 35;
      if (userAge >= 60 || details.isSenior) {
        matchedCriteria.push(`Applicant is ${userAge} years old (meets 60+ senior citizen requirement)`);
      } else {
        isEligible = false;
        unmetReason = `You are ${userAge} years old. This scheme requires the applicant to be 60 years or older.`;
      }
    } else if (crit.includes('18+') || crit.includes('aged 18')) {
      const userAge = details.age || 25;
      if (userAge >= 18) {
        matchedCriteria.push(`Applicant is aged 18 or above (${userAge} yrs)`);
      } else {
        isEligible = false;
        unmetReason = `Applicant must be at least 18 years of age.`;
      }
    }

    // Gender requirement
    if (isEligible && (crit.includes('female') || crit.includes('women') || schemeName.toLowerCase().includes('mahila') || schemeName.toLowerCase().includes('matru'))) {
      if (details.gender === 'Female' || details.occupation === 'Homemaker') {
        matchedCriteria.push('Applicant is a female resident / woman entrepreneur');
      } else if (details.gender === 'Male') {
        isEligible = false;
        unmetReason = `This scheme is exclusively reserved for female residents and rural women entrepreneurs.`;
      }
    }

    // Occupation requirement (Farmer)
    if (isEligible && (crit.includes('farmer') || crit.includes('agricultural') || schemeName.toLowerCase().includes('krishi'))) {
      const occ = (details.occupation || '').toLowerCase();
      if (occ.includes('farmer') || occ.includes('agriculture') || occ.includes('crop') || occ.includes('cultivator')) {
        matchedCriteria.push('Registered occupation as Farmer / Agricultural cultivator');
        if (details.landAcres !== undefined && details.landAcres <= 5) {
          matchedCriteria.push(`Land holding (${details.landAcres} acres) is within small-farmer limit (< 5 acres)`);
        }
      } else {
        isEligible = false;
        unmetReason = `Applicant occupation is "${details.occupation || 'Non-Farmer'}". This scheme is reserved for registered agricultural farmers.`;
      }
    }

    // Student requirement
    if (isEligible && (crit.includes('student') || crit.includes('education') || crit.includes('12th board') || schemeName.toLowerCase().includes('vidya'))) {
      const occ = (details.occupation || '').toLowerCase();
      if (occ.includes('student') || details.isStudent) {
        matchedCriteria.push('Applicant is enrolled as a resident student');
      } else {
        isEligible = false;
        unmetReason = `This scholarship is meant for resident students pursuing higher education.`;
      }
    }

    // Income limits
    if (isEligible) {
      const userIncome = details.income || 150000;
      if (crit.includes('2,00,000') || crit.includes('200000') || crit.includes('2 lakh')) {
        if (userIncome <= 200000) {
          matchedCriteria.push(`Annual income (₹${userIncome.toLocaleString()}) is below the ₹2,00,000 threshold`);
        } else {
          isEligible = false;
          unmetReason = `Your annual income (₹${userIncome.toLocaleString()}) exceeds the maximum allowed limit of ₹2,00,000 for this scheme.`;
        }
      } else if (crit.includes('3,50,000') || crit.includes('350000') || crit.includes('3.5 lakh')) {
        if (userIncome <= 350000) {
          matchedCriteria.push(`Annual income (₹${userIncome.toLocaleString()}) is within the ₹3,50,000 threshold`);
        } else {
          isEligible = false;
          unmetReason = `Your annual income (₹${userIncome.toLocaleString()}) exceeds the limit of ₹3,50,000.`;
        }
      }
    }

    // BPL Card status
    if (isEligible && (crit.includes('bpl') || crit.includes('priority family') || crit.includes('below poverty') || crit.includes('ration card'))) {
      if (details.isBpl === true) {
        matchedCriteria.push('Verified BPL / Priority Ration Card holder');
      } else if (details.isBpl === false) {
        if (crit.includes('under bpl') || crit.includes('listed under bpl') || schemeName.toLowerCase().includes('ayushman')) {
          isEligible = false;
          unmetReason = `This scheme strictly requires the household to be registered under the BPL (Below Poverty Line) category.`;
        }
      }
    }

    matchedCriteria.push('Active resident of Namma Gram Panchayath jurisdiction');

    if (isEligible) {
      return {
        schemeId: scheme.id,
        schemeName: scheme.name,
        status: 'Eligible',
        explanation: `Your ${matchedCriteria.slice(0, 3).join(', ')} match the eligibility criteria.`,
        benefits,
        requiredDocuments: requiredDocs,
        category: cat,
        department: dept
      };
    } else {
      return {
        schemeId: scheme.id,
        schemeName: scheme.name,
        status: 'Not Eligible',
        explanation: 'You do not currently satisfy one or more required eligibility conditions.',
        unmetRequirement: unmetReason || 'Eligibility criteria requirements are not met.',
        benefits,
        requiredDocuments: requiredDocs,
        category: cat,
        department: dept
      };
    }
  });

  return {
    type: 'evaluation',
    message: "Thank you! I have analyzed all your details across our 4 questions against the active welfare schemes in Namma Panchayath. Here is your comprehensive eligibility assessment:",
    collectedDetails: details,
    results
  };
}



