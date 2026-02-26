import { useState, useCallback, useMemo, useRef } from "react";
import * as XLSX from "xlsx"; // ← use this for local/Vercel deployment

// ─── Ledger Classification Map ──────────────────────────────────────────────
const CLASSIFICATION_RULES = [
  { keywords: ["trade payable", "creditor", "sundry creditor", "payable to vendor", "accounts payable"], grouping: "5.2 TRADE PAYABLES Non msme" },
  { keywords: ["advance from customer", "customer advance", "advance received"], grouping: "5.3 Advance from customers" },
  { keywords: ["salary", "salaries", "bonus", "wages"], grouping: "9.3 Salaries and bonus " },
  { keywords: ["provident fund", "pf contribution", "esic", "gratuity"], grouping: "9.3 Contribution to provident and other funds (refer note 14 (a))" },
  { keywords: ["staff welfare"], grouping: "9.3 Staff welfare expenses" },
  { keywords: ["interest on borrowing", "interest expense on borrow", "interest on loan"], grouping: "9.4 Interest expense on borrowings" },
  { keywords: ["interest accrued not due", "accrued interest not due"], grouping: "5.3 Interest accrued and not due on borrowings" },
  { keywords: ["interest accrued due", "interest accrued and due"], grouping: "5.3 Interest accrued and due on borrowings" },
  { keywords: ["interest accrued on fd", "interest accrued fixed deposit", "accrued interest on fd", "accrued interest on fds"], grouping: "7.5 Interest accrued on fixed deposits" },
  { keywords: ["interest accrued trade", "interest on trade payable"], grouping: "5.3 Interest accrued on trade payables" },
  { keywords: ["cash credit", "cc limit", "overdraft"], grouping: "5.1 Cash credit facility" },
  { keywords: ["term loan", "long term loan"], grouping: "4.1 Term loan from Bank ( refer note (a) below)" },
  { keywords: ["loan from financial institution", "nbfc loan"], grouping: "5.1 Loans from financial institutions (Refer note 2 below)" },
  { keywords: ["related party loan", "loan from director", "loan from shareholder"], grouping: "5.1 Loans and advances from related parties (Refer note 3 below)" },
  { keywords: ["debenture", "ncd", "ocd"], grouping: "4.1 Optional Convertible Debentures @ 10% Coupon " },
  { keywords: ["provision employee", "employee benefit provision", "leave encashment"], grouping: "4.2 Provision for employee benefits" },
  { keywords: ["security deposit received"], grouping: "6.4 Security deposits" },
  { keywords: ["capital advance", "advance for capital"], grouping: "6.4 Capital advance" },
  { keywords: ["advance income tax", "advance tax paid", "tds receivable", "tds credit"], grouping: "6.4 Advance Income Tax" },
  { keywords: ["security deposit paid", "deposit paid"], grouping: "6.4 Security deposits" },
  { keywords: ["prepaid", "prepaid expense", "prepaid insurance"], grouping: "7.4 'Prepaid expenses" },
  { keywords: ["prepaid lease", "lease deposit"], grouping: "7.4 'Prepaid lease rent" },
  { keywords: ["advance to vendor", "advance to supplier", "vendor advance"], grouping: "7.4 Advance to vendors " },
  { keywords: ["loan to employee", "advance to employee", "staff advance"], grouping: "7.4 'Loans and advances to employees" },
  { keywords: ["gst input", "gst receivable", "vat receivable", "service tax receivable", "input tax credit", "tds payable", "statutory", "withholding tax"], grouping: "5.3 Statutory Remittances (Contribution to PF and ESIC, withholding taxes etc.)" },
  { keywords: ["gst input credit", "gst credit receivable", "cenvat", "excise credit"], grouping: "7.4 'Balance with government authorities - Goods & Services Tax Input Credit Receivable" },
  { keywords: ["trade receivable", "debtor", "sundry debtor", "accounts receivable"], grouping: "7.2 Other trade receivables  - considered good" },
  { keywords: ["cash on hand", "petty cash", "cash in hand"], grouping: "7.3 (A) Cash on hand" },
  { keywords: ["current account", "saving account", "bank account", "balance with bank"], grouping: "7.3 (A) Balance with banks:" },
  { keywords: ["fixed deposit", "fd maturity 3 month", "short term deposit"], grouping: "7.3 (A) 'In other deposit accounts\n     - original maturity of 3 months or less" },
  { keywords: ["fixed deposit long", "fd more than 12", "bank deposit security"], grouping: "6.5 Bank deposits with more than 12 months maturity held as security against bank overdraft refer Note 5.1" },
  { keywords: ["depreciation", "accumulated depreciation", "amortization reserve"], grouping: "Tangible assets" },
  { keywords: ["accumulated amortization", "amortization of software", "amortization intangible"], grouping: "Intangible assets" },
  { keywords: ["tangible asset", "plant and machine", "machinery", "equipment", "vehicle", "car", "furniture", "building", "land", "shed", "computer"], grouping: "Tangible assets" },
  { keywords: ["intangible asset", "software", "computer software", "goodwill", "trademark", "patent"], grouping: "Intangible assets" },
  { keywords: ["equity share capital", "share capital", "paid up capital"], grouping: "Equity Share Capital" },
  { keywords: ["preference share"], grouping: "Preference Share capital" },
  { keywords: ["securities premium", "share premium"], grouping: "3.2 Securities Premium Account" },
  { keywords: ["retained earning", "surplus", "profit and loss account", "accumulated profit"], grouping: "Surplus in the statement of profit and loss" },
  { keywords: ["purchase raw material", "raw material purchase"], grouping: "9.1A Purchase of raw materials" },
  { keywords: ["purchase traded", "trading purchase", "goods purchased for resale"], grouping: "9.1B Purchase of traded goods" },
  { keywords: ["opening stock", "opening inventory"], grouping: "Opening Stock " },
  { keywords: ["closing stock", "closing inventory"], grouping: "closing stock " },
  { keywords: ["sales of services", "service revenue", "consulting revenue"], grouping: "8.1 Sales of Services " },
  { keywords: ["revenue engineering", "engineering income"], grouping: "8.1 Engineering" },
  { keywords: ["duty drawback", "export incentive", "meis"], grouping: "8.1 Duty Drawback & Other Export Incentives " },
  { keywords: ["potato", "cut potato", "potato sale"], grouping: "8.1 Potatoes" },
  { keywords: ["miscellaneous income", "other income", "sundry income"], grouping: "8.2 Miscellaneous Income" },
  { keywords: ["creditor no longer payable", "written back", "accounts written off"], grouping: "8.2 Creditors No Longer Payable " },
  { keywords: ["forex gain", "foreign exchange gain", "foreign currency gain"], grouping: "8.2 Net gain on foreign currency translation and transactions" },
  { keywords: ["interest on fd income", "fixed deposit interest income", "interest income"], grouping: "8.2 - Fixed deposits" },
  { keywords: ["security deposit income"], grouping: "8.2 - Security deposits" },
  { keywords: ["audit fee", "auditor remuneration", "statutory audit"], grouping: "9.5 Auditor's Remuneration (Refer note 9.6)" },
  { keywords: ["bad debt", "written off debtor", "irrecoverable"], grouping: "9.5 Bad debts" },
  { keywords: ["provision doubtful", "doubtful debt provision"], grouping: "9.5 Provision for doubtful debts" },
  { keywords: ["business promotion", "advertisement", "marketing expense"], grouping: "9.5 Business promotion and advertisement expenses" },
  { keywords: ["cold storage", "cold chain"], grouping: "9.5 Cold storage rent" },
  { keywords: ["commission on purchase", "purchase commission"], grouping: "9.5 Commission on purchases" },
  { keywords: ["telephone", "communication", "internet expense", "mobile expense"], grouping: "9.5 Communication cost" },
  { keywords: ["consumable", "consumable purchase"], grouping: "9.5 Consumable Purchase " },
  { keywords: ["insurance expense", "insurance premium"], grouping: "9.5 Insurance" },
  { keywords: ["investment written off"], grouping: "9.5 Investments written off" },
  { keywords: ["labour charge", "labour cost", "contract labour"], grouping: "9.5 Labour charges" },
  { keywords: ["lease rent expense", "lease rental"], grouping: "9.5 Lease Rent" },
  { keywords: ["miscellaneous expense", "other expense", "sundry expense"], grouping: "9.5 Miscellaneous expenses  " },
  { keywords: ["packing", "grading charge"], grouping: "9.5 Packing and grading charges" },
  { keywords: ["power", "electricity", "fuel", "energy expense"], grouping: "9.5 Power and fuel" },
  { keywords: ["professional fee", "legal fee", "consultancy fee"], grouping: "9.5 Professional fees  " },
  { keywords: ["rate and tax", "municipal tax", "professional tax"], grouping: "9.5 Rates and taxes" },
  { keywords: ["rent expense", "office rent", "factory rent"], grouping: "9.5 Rent" },
  { keywords: ["repair", "maintenance expense", "amc"], grouping: "9.5 Repairs and maintenance - Others" },
  { keywords: ["transport", "freight", "logistics expense", "courier"], grouping: "9.5 Transport expenses" },
  { keywords: ["travel", "conveyance", "hotel expense", "boarding"], grouping: "9.5 Travelling and conveyance" },
  { keywords: ["depreciation expense", "dep expense", "amortization expense"], grouping: "Depreciation and amortization expenses" },
  { keywords: ["borrowing cost", "loan processing fee", "bank charge"], grouping: "9.4 Other borrowing cost" },
  { keywords: ["inter branch", "head office", "branch account"], grouping: "Inter Branch Set off " },
  { keywords: ["investment", "mutual fund", "shares held"], grouping: "6.2 Investment in ABC Pvt. Ltd" },
  { keywords: ["gold coin", "gold investment"], grouping: "6.2 Investment in Gold Coins" },
  { keywords: ["nsc", "national saving"], grouping: "6.2 Investment in National Saving certificates" },
];

const ALL_GROUPINGS = ["3.2 Securities Premium Account","4.1 Optional Convertible Debentures @ 10% Coupon ","4.1 Term loan from Bank ( refer note (a) below)","4.2 Provision for employee benefits","5.1 Cash credit facility","5.1 Loans and advances from related parties (Refer note 3 below)","5.1 Loans from financial institutions (Refer note 2 below)","5.2 TRADE PAYABLES Non msme","5.2 TRADE PAYABLES msme","5.3 Advance from customers","5.3 Current maturities of long-term debt ( refer note 4.1 (a) for security details)","5.3 Interest accrued and due on borrowings","5.3 Interest accrued and not due on borrowings","5.3 Interest accrued on trade payables","5.3 Statutory Remittances (Contribution to PF and ESIC, withholding taxes etc.)","6.2 Investment in ABC Pvt. Ltd","6.2 Investment in Gold Coins","6.2 Investment in National Saving certificates","6.2 XYZ Pvt Ltd","6.4 Advance Income Tax","6.4 Capital advance","6.4 Security deposits","6.5 Bank deposits with more than 12 months maturity held as security against bank overdraft refer Note 5.1","7.2 Other trade receivables  - considered good","7.3 (A) 'In other deposit accounts\n     - original maturity of 3 months or less","7.3 (A) Balance with banks:","7.3 (A) Cash on hand","7.3 (B) '(i) In other deposit accounts \n    - Original maturity more than 3 months ","7.3 (B) Fixed Deposit held as margin money ","7.4 'Balance with government authorities - Goods & Services Tax Input Credit Receivable","7.4 'Loans and advances to employees","7.4 'Prepaid expenses","7.4 'Prepaid lease rent","7.4 Advance to vendors ","7.5 Interest accrued on fixed deposits","8.1 Cut potato","8.1 Duty Drawback & Other Export Incentives ","8.1 Engineering","8.1 Potatoes","8.1 Sales of Services ","8.2 - Fixed deposits","8.2 - Security deposits","8.2 Creditors No Longer Payable ","8.2 Miscellaneous Income","8.2 Net gain on foreign currency translation and transactions","9.1A Purchase of raw materials","9.1B Purchase of traded goods","9.3 Contribution to provident and other funds (refer note 14 (a))","9.3 Gratuity Expenses","9.3 Salaries and bonus ","9.3 Staff welfare expenses","9.4 Interest expense on borrowings","9.4 Interest expense on trade payables","9.4 Other borrowing cost","9.5 Auditor's Remuneration (Refer note 9.6)","9.5 Bad debts","9.5 Business promotion and advertisement expenses","9.5 Cold storage rent","9.5 Commission on purchases","9.5 Communication cost","9.5 Consumable Purchase ","9.5 Insurance","9.5 Investments written off","9.5 Labour charges","9.5 Lease Rent","9.5 Miscellaneous expenses  ","9.5 Packing and grading charges","9.5 Power and fuel","9.5 Professional fees  ","9.5 Provision for doubtful debts","9.5 Rates and taxes","9.5 Rent","9.5 Repairs and maintenance - Others","9.5 Transport expenses","9.5 Travelling and conveyance","Depreciation and amortization expenses","Equity Share Capital","Intangible assets","Inter Branch Set off ","Less: Provision for doubtful debts","Opening Stock ","Preference Share capital","Surplus in the statement of profit and loss","Tangible assets","closing stock "];

function autoClassify(particularsName) {
  if (!particularsName) return "";
  const lower = particularsName.toLowerCase();
  for (const rule of CLASSIFICATION_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) return rule.grouping;
    }
  }
  return "";
}

function fmt(n) {
  if (n == null || isNaN(n) || n === "") return "-";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${formatted})` : formatted;
}

const SECTION_COLORS = {
  "3.": "#7c3aed", "4.": "#b45309", "5.": "#dc2626", "6.": "#0369a1",
  "7.": "#047857", "8.": "#0891b2", "9.": "#be185d",
  "Equity": "#6d28d9", "Preference": "#6d28d9", "Surplus": "#6d28d9",
  "Tangible": "#1e40af", "Intangible": "#1e40af", "Opening": "#374151",
  "Depreciation": "#374151", "closing": "#374151", "Inter Branch": "#374151",
  "Less:": "#374151",
};

function groupColor(g) {
  for (const [prefix, color] of Object.entries(SECTION_COLORS)) {
    if (g.startsWith(prefix)) return color;
  }
  return "#374151";
}

function parseExcelTB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        let sheetName = wb.SheetNames.find(n => n.toLowerCase().includes("tb")) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        let headerRow = -1;
        for (let i = 0; i < Math.min(20, rows.length); i++) {
          const r = rows[i];
          if (r.some(c => String(c).toLowerCase().includes("debit") || String(c).toLowerCase().includes("credit"))) {
            headerRow = i;
            break;
          }
        }

        const records = [];
        if (headerRow >= 0) {
          const headers = rows[headerRow].map(h => String(h).trim().toLowerCase());
          const pIdx = headers.findIndex(h => h.includes("particular") || h.includes("account") || h.includes("ledger") || h === "");
          const dIdx = headers.findIndex(h => h.includes("debit"));
          const cIdx = headers.findIndex(h => h.includes("credit"));
          const tIdx = headers.findIndex(h => h.includes("total") || h.includes("balance"));
          const gIdx = headers.findIndex(h => h.includes("group"));
          const sgIdx = headers.findIndex(h => h.includes("sub"));

          for (let i = headerRow + 1; i < rows.length; i++) {
            const row = rows[i];
            const name = String(row[pIdx] ?? row[0] ?? "").trim();
            if (!name || name.length < 2) continue;
            const debit = parseFloat(row[dIdx] ?? 0) || 0;
            const credit = parseFloat(row[cIdx] ?? 0) || 0;
            const total = tIdx >= 0 ? parseFloat(row[tIdx]) || (debit - credit) : (debit - credit);
            const existingGrouping = gIdx >= 0 ? String(row[gIdx] ?? "").trim() : "";
            const existingSub = sgIdx >= 0 ? String(row[sgIdx] ?? "").trim() : "";

            records.push({
              id: i,
              Particulars: name,
              Debit: debit,
              Credit: credit,
              Total: total,
              Final_Adjustment: total,
              Grouping: existingGrouping || autoClassify(name),
              Sub_Grouping: existingSub,
              Division: "Corporate",
              autoMatched: !existingGrouping,
              confidence: !existingGrouping ? (autoClassify(name) ? "AI" : "None") : "Original",
            });
          }
        }
        resolve({ records, sheetName, allSheets: wb.SheetNames });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function TBClassifier() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sheetName, setSheetName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setUploadMsg("");
    try {
      const result = await parseExcelTB(file);
      const tagged = result.records.map(r => ({
        ...r,
        autoMatched: r.confidence === "AI",
      }));
      setRecords(tagged);
      setSheetName(result.sheetName);
      const ai = tagged.filter(r => r.autoMatched && r.Grouping).length;
      const none = tagged.filter(r => !r.Grouping).length;
      setUploadMsg(`✓ Loaded ${tagged.length} entries from "${result.sheetName}" — ${ai} auto-classified, ${none} unmatched`);
    } catch (e) {
      setUploadMsg("⚠ Error reading file: " + e.message);
    }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const updateGrouping = (id, newGrouping) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, Grouping: newGrouping, confidence: "Manual" } : r));
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = !search || r.Particulars.toLowerCase().includes(search.toLowerCase()) || r.Grouping.toLowerCase().includes(search.toLowerCase());
      const matchGroup = filterGroup === "All" || r.Grouping === filterGroup;
      const matchStatus = filterStatus === "All" ||
        (filterStatus === "Matched" && r.Grouping && r.confidence !== "None") ||
        (filterStatus === "Unmatched" && !r.Grouping) ||
        (filterStatus === "AI" && r.autoMatched && r.Grouping) ||
        (filterStatus === "Manual" && r.confidence === "Manual") ||
        (filterStatus === "Original" && r.confidence === "Original");
      return matchSearch && matchGroup && matchStatus;
    });
  }, [records, search, filterGroup, filterStatus]);

  const groupSummary = useMemo(() => {
    const map = {};
    for (const r of records) {
      const g = r.Grouping || "(Unclassified)";
      if (!map[g]) map[g] = { grouping: g, count: 0, total: 0, debit: 0, credit: 0 };
      map[g].count++;
      map[g].total += r.Final_Adjustment || r.Total || 0;
      map[g].debit += r.Debit || 0;
      map[g].credit += r.Credit || 0;
    }
    return Object.values(map).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [records]);

  const stats = useMemo(() => ({
    total: records.length,
    matched: records.filter(r => r.Grouping).length,
    ai: records.filter(r => r.autoMatched && r.Grouping).length,
    unmatched: records.filter(r => !r.Grouping).length,
    manual: records.filter(r => r.confidence === "Manual").length,
  }), [records]);

  const exportClassified = () => {
    const ws_data = [
      ["Particulars", "Debit", "Credit", "Total", "Grouping", "Sub Grouping", "Division", "Classification Source"],
      ...records.map(r => [r.Particulars, r.Debit, r.Credit, r.Total, r.Grouping, r.Sub_Grouping, r.Division, r.confidence || ""])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!cols"] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 60 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "TB Classified");
    XLSX.writeFile(wb, "TB_Classified_Output.xlsx");
  };

  const confidenceBadge = (c) => {
    const styles = {
      Original: { bg: "#d1fae5", color: "#065f46", label: "Original" },
      AI: { bg: "#dbeafe", color: "#1e40af", label: "AI Match" },
      Manual: { bg: "#fef3c7", color: "#92400e", label: "Manual" },
      None: { bg: "#fee2e2", color: "#991b1b", label: "Unmatched" },
    };
    const s = styles[c] || styles.None;
    return (
      <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderBottom: "1px solid #1e293b", padding: "20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #6366f1, #3b82f6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f8fafc", letterSpacing: -0.5 }}>TB Financial Classifier</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Auto-match Trial Balance entries to ledger groupings</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {records.length > 0 && (
              <button onClick={exportClassified} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ↓ Export Excel
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          style={{
            border: "2px dashed #334155", borderRadius: 16, padding: "32px", textAlign: "center", cursor: "pointer",
            background: "#1e293b", marginBottom: 24, transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize: 32, marginBottom: 8 }}>{loading ? "⏳" : "📊"}</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#94a3b8" }}>
            {loading ? "Processing..." : "Drop your Trial Balance Excel here or click to upload"}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Supports .xlsx, .xls — auto-detects TB sheet & columns</div>
          {uploadMsg && <div style={{ marginTop: 12, fontSize: 13, color: uploadMsg.includes("⚠") ? "#f87171" : "#4ade80", fontWeight: 500 }}>{uploadMsg}</div>}
        </div>

        {records.length > 0 && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Entries", value: stats.total, color: "#6366f1" },
                { label: "Classified", value: stats.matched, color: "#10b981" },
                { label: "AI Auto-Matched", value: stats.ai, color: "#3b82f6" },
                { label: "Manual Override", value: stats.manual, color: "#f59e0b" },
                { label: "Unmatched", value: stats.unmatched, color: "#ef4444" },
              ].map(s => (
                <div key={s.label} style={{ background: "#1e293b", borderRadius: 12, padding: "16px 20px", borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#1e293b", borderRadius: 10, padding: 4, width: "fit-content" }}>
              {["table", "summary"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  background: activeTab === tab ? "#6366f1" : "transparent",
                  color: activeTab === tab ? "#fff" : "#64748b",
                  border: "none", borderRadius: 7, padding: "8px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
                }}>
                  {tab === "table" ? "📋 TB Entries" : "📊 Group Summary"}
                </button>
              ))}
            </div>

            {activeTab === "table" && (
              <>
                {/* Filters */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  <input
                    placeholder="🔍 Search particulars or grouping..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 240, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 14px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                  />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 14px", color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}>
                    <option value="All">All Status</option>
                    <option value="Matched">Matched</option>
                    <option value="AI">AI Matched</option>
                    <option value="Original">Original</option>
                    <option value="Manual">Manual</option>
                    <option value="Unmatched">Unmatched</option>
                  </select>
                  <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 14px", color: "#e2e8f0", fontSize: 13, cursor: "pointer", maxWidth: 280 }}>
                    <option value="All">All Groupings</option>
                    {ALL_GROUPINGS.map(g => <option key={g} value={g}>{g.substring(0, 60)}</option>)}
                    <option value="">(Unclassified)</option>
                  </select>
                  <span style={{ color: "#64748b", fontSize: 13, alignSelf: "center" }}>{filtered.length} rows</span>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #1e293b" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}>
                        {["Particulars", "Debit", "Credit", "Total", "Grouping", "Status", ""].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: h === "Debit" || h === "Credit" || h === "Total" ? "right" : "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 300).map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #0f172a", background: i % 2 === 0 ? "#1a2332" : "#1e293b" }}>
                          <td style={{ padding: "10px 16px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#cbd5e1" }} title={r.Particulars}>{r.Particulars}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: "#6ee7b7", fontFamily: "monospace", fontSize: 12 }}>{r.Debit ? fmt(r.Debit) : "-"}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: "#fca5a5", fontFamily: "monospace", fontSize: 12 }}>{r.Credit ? fmt(r.Credit) : "-"}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: r.Total < 0 ? "#f87171" : "#a3e635", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{fmt(r.Total)}</td>
                          <td style={{ padding: "10px 16px", maxWidth: 280 }}>
                            {editingId === r.id ? (
                              <select
                                autoFocus
                                defaultValue={r.Grouping}
                                onBlur={e => updateGrouping(r.id, e.target.value)}
                                onChange={e => updateGrouping(r.id, e.target.value)}
                                style={{ background: "#0f172a", border: "1px solid #6366f1", borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: 12, width: "100%" }}
                              >
                                <option value="">(Unclassified)</option>
                                {ALL_GROUPINGS.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            ) : (
                              <span
                                style={{ color: r.Grouping ? groupColor(r.Grouping) : "#475569", fontSize: 12, cursor: "pointer", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                title={r.Grouping || "Click to classify"}
                                onClick={() => setEditingId(r.id)}
                              >
                                {r.Grouping || <em style={{ color: "#475569" }}>Click to assign grouping</em>}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 16px" }}>{confidenceBadge(r.confidence || (r.Grouping ? "AI" : "None"))}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <button onClick={() => setEditingId(r.id === editingId ? null : r.id)} style={{ background: "none", border: "1px solid #334155", borderRadius: 6, padding: "3px 10px", color: "#64748b", fontSize: 11, cursor: "pointer" }}>✏️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length > 300 && <div style={{ textAlign: "center", padding: 12, color: "#475569", fontSize: 12 }}>Showing 300 of {filtered.length} rows — use filters to narrow down</div>}
                </div>
              </>
            )}

            {activeTab === "summary" && (
              <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #1e293b" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}>
                      {["Grouping / Classification", "# Entries", "Total Debit", "Total Credit", "Net Balance"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: h.includes("#") || h.includes("Total") || h.includes("Net") ? "right" : "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupSummary.map((g, i) => (
                      <tr key={g.grouping} style={{ borderBottom: "1px solid #0f172a", background: i % 2 === 0 ? "#1a2332" : "#1e293b" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: groupColor(g.grouping), marginRight: 8 }} />
                          <span style={{ color: "#cbd5e1", fontSize: 12 }}>{g.grouping}</span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8" }}>{g.count}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#6ee7b7", fontFamily: "monospace", fontSize: 12 }}>{fmt(g.debit)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#fca5a5", fontFamily: "monospace", fontSize: 12 }}>{fmt(g.credit)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: g.total < 0 ? "#f87171" : "#4ade80" }}>{fmt(g.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#1e293b", borderTop: "2px solid #334155" }}>
                      <td style={{ padding: "12px 16px", color: "#f8fafc", fontWeight: 700 }}>TOTAL</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#f8fafc", fontWeight: 700 }}>{records.length}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#6ee7b7", fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>{fmt(records.reduce((s, r) => s + (r.Debit || 0), 0))}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#fca5a5", fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>{fmt(records.reduce((s, r) => s + (r.Credit || 0), 0))}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#f8fafc", fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>{fmt(records.reduce((s, r) => s + (r.Total || 0), 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* How it works */}
            <div style={{ marginTop: 24, background: "#1e293b", borderRadius: 12, padding: "16px 20px", borderLeft: "3px solid #6366f1" }}>
              <div style={{ fontWeight: 600, color: "#a5b4fc", marginBottom: 8, fontSize: 13 }}>⚡ How Auto-Classification Works</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                <b style={{ color: "#94a3b8" }}>Original</b> — grouping already existed in your TB sheet.&nbsp;
                <b style={{ color: "#93c5fd" }}>AI Match</b> — keyword engine matched the ledger name to a classification.&nbsp;
                <b style={{ color: "#fcd34d" }}>Manual</b> — you overrode the classification using the ✏️ button.&nbsp;
                <b style={{ color: "#f87171" }}>Unmatched</b> — no keyword rule matched; click the cell to manually assign.
                <br />The classification engine uses <b style={{ color: "#94a3b8" }}>{CLASSIFICATION_RULES.length} keyword rules</b> covering {ALL_GROUPINGS.length} ledger groupings.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
