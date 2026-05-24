import { useMemo, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type EntryType = "in" | "out" | "reimburse" | "borrow" | "installment";

interface Entry {
  date?: string;
  desc: string;
  vendor?: string;
  amount: number;
  type: EntryType;
  note?: string;
  status?: "รอเบิก" | "เบิกแล้ว" | "ไม่เกี่ยว";
}

interface Account {
  key: string;
  name: string;
  badge?: string;
  installment?: { total: number; amount: number };
  entries: Entry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Data — แก้ข้อมูลของคุณตรงนี้
// ─────────────────────────────────────────────────────────────────────────────
const ACCOUNTS: Account[] = [
  {
    key: "kasikorn",
    name: "กสิกรเงินสด",
    badge: "เงินบริษัท · มีผ่อน",
    installment: { total: 10, amount: 4890 },
    entries: [
      { desc: "เงินสดสำรองจากบริษัท", amount: 50000, type: "in" },
      { desc: "เงินสำหรับผ่อนของ", amount: 48900, type: "in" },
      { desc: "งวดผ่อนเดือนที่ 1", amount: 4890, type: "installment" },
      { desc: "สำรองจ่าย (หักเลย ไม่เบิกคืน)", amount: 17416, type: "out" },
      { desc: "จ่ายเงินนอก (หักทิ้ง)", amount: 7610, type: "out" },
      { date: "02.05.26", desc: "ค่าแรง", vendor: "พี่ตั้น", amount: 800, type: "reimburse", status: "รอเบิก" },
      { date: "03.05.26", desc: "ค่าอาหาร", vendor: "ร้านเสือโฮก", amount: 3997, type: "reimburse", status: "รอเบิก" },
      { date: "08.05.26", desc: "จานเซรามิก", vendor: "ร้านจานเซรามิก", amount: 1950, type: "reimburse", status: "รอเบิก" },
      { date: "09.05.26", desc: "ดอกไม้ประดิษฐ์", vendor: "ห้างหุ้นส่วนฮักแก้ว", amount: 1130, type: "reimburse", status: "รอเบิก" },
      { date: "11.05.26", desc: "ค่าส่งของ", vendor: "Anan Cargo", amount: 350, type: "reimburse", status: "รอเบิก" },
      { date: "11.05.26", desc: "จอคอม", vendor: "Fixit", amount: 6500, type: "reimburse", status: "รอเบิก" },
      { date: "15.05.26", desc: "ดอกไม้", vendor: "Galaxy", amount: 600, type: "reimburse", status: "รอเบิก" },
      { date: "16.05.26", desc: "ค่าแรง", vendor: "พี่ตั้น", amount: 800, type: "reimburse", status: "รอเบิก" },
      { date: "17.05.26", desc: "ดอกไม้ผูกข้อมือและพวงมาลัย", vendor: "ห้างหุ้นส่วนฮักแก้ว", amount: 1240, type: "reimburse", status: "รอเบิก" },
      { desc: "ยืมไปใช้ส่วนตัว (ส่วนต่างยอด)", amount: 16186.47, type: "borrow" },
    ],
  },
  {
    key: "bangkok",
    name: "กรุงเทพเงินสด",
    badge: "เงินสำรอง · ไม่ใช้สะเปะสะปะ",
    entries: [
      { desc: "ยอดตั้งต้น (เงินสำรอง)", amount: 150000, type: "in" },
      { date: "ก.พ. 26", desc: "รายจ่าย", amount: 18500, type: "out", note: "ภาษี" },
      { date: "มี.ค. 26", desc: "รายจ่าย", amount: 10500, type: "out" },
      { date: "เม.ย. 26", desc: "รายจ่าย", amount: 15000, type: "out" },
    ],
  },
  {
    key: "cc_bbl",
    name: "บัตรเครดิตกรุงเทพ",
    badge: "ยังไม่เริ่มบันทึก",
    entries: [],
  },
  {
    key: "cc_ktc",
    name: "บัตรเครดิต KTC",
    badge: "ยังไม่เริ่มบันทึก",
    entries: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_META: Record<EntryType, { label: string; cls: string }> = {
  in:          { label: "รายรับ",       cls: "text-emerald-400" },
  out:         { label: "รายจ่าย",       cls: "text-rose-400"    },
  reimburse:   { label: "สำรองจ่าย",     cls: "text-amber-400"   },
  borrow:      { label: "ยืมส่วนตัว",    cls: "text-rose-400"    },
  installment: { label: "งวดผ่อน",       cls: "text-sky-400"     },
};

function money(n: number): string {
  const r = Math.round(n * 100) / 100;
  return "฿" + r.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface AccountSummary {
  balance: number;
  pending: number;
  borrowed: number;
  spent: number;
  installCount: number;
}

function summarize(acct: Account): AccountSummary {
  let balance = 0, pending = 0, borrowed = 0, spent = 0, installCount = 0;
  for (const e of acct.entries) {
    switch (e.type) {
      case "in":          balance += e.amount; break;
      case "out":         balance -= e.amount; spent += e.amount; break;
      case "installment": balance -= e.amount; installCount++; break;
      case "reimburse":   balance -= e.amount; pending += e.amount; break;
      case "borrow":      balance -= e.amount; borrowed += e.amount; break;
    }
  }
  return { balance, pending, borrowed, spent, installCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent = "default", sub }: { label: string; value: string; accent?: "default" | "gold" | "red" | "amber" | "blue"; sub?: string; }) {
  const accentCls = {
    default: "text-stone-100",
    gold:    "text-amber-300",
    red:     "text-rose-400",
    amber:   "text-amber-400",
    blue:    "text-sky-400",
  }[accent];
  return (
    <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4">
      <div className="text-xs text-stone-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accentCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-stone-500 mt-1">{sub}</div>}
    </div>
  );
}

function OverviewView({ accounts, onPick }: { accounts: Account[]; onPick: (key: string) => void; }) {
  const summaries = accounts.map(a => ({ acct: a, ...summarize(a) }));
  const totalCash    = summaries.reduce((s, x) => s + x.balance,  0);
  const totalPending = summaries.reduce((s, x) => s + x.pending,  0);
  const totalBorrow  = summaries.reduce((s, x) => s + x.borrowed, 0);

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs tracking-[0.2em] uppercase text-amber-300 mb-1">ภาพรวมการเงิน</div>
        <h1 className="text-3xl font-bold tracking-tight">ยอดรวมทุกบัญชี</h1>
        <div className="mt-3 text-5xl font-bold text-amber-300">{money(totalCash)}</div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-stone-400">
            รอเบิกคืน <span className="text-amber-400 font-medium">{money(totalPending)}</span>
          </span>
          <span className="text-stone-400">
            ยืมส่วนตัว <span className="text-rose-400 font-medium">{money(totalBorrow)}</span>
          </span>
        </div>
      </div>

      <div className="text-xs tracking-widest uppercase text-stone-500 mb-3">บัญชี ({accounts.length})</div>
      <div className="grid sm:grid-cols-2 gap-3">
        {summaries.map(({ acct, balance, pending, borrowed }) => (
          <button
            key={acct.key}
            onClick={() => onPick(acct.key)}
            className="text-left bg-stone-900/60 hover:bg-stone-900 border border-stone-800 hover:border-amber-700/50 rounded-xl p-4 transition"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="font-semibold text-stone-100">{acct.name}</div>
              <div className="text-lg font-bold text-amber-300 whitespace-nowrap">{money(balance)}</div>
            </div>
            {acct.badge && <div className="text-[11px] text-stone-500 mb-2">{acct.badge}</div>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
              {pending  > 0 && <span>รอเบิก <span className="text-amber-400">{money(pending)}</span></span>}
              {borrowed > 0 && <span>ยืม <span className="text-rose-400">{money(borrowed)}</span></span>}
              {acct.entries.length === 0 && <span className="italic">ยังไม่มีรายการ</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountView({ acct }: { acct: Account }) {
  const s = summarize(acct);
  const reimbItems = acct.entries.filter(e => e.type === "reimburse" && e.status === "รอเบิก");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-2xl font-bold">{acct.name}</h2>
        {acct.badge && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-amber-400">
            {acct.badge}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="ยอดคงเหลือ" value={money(s.balance)} accent="gold" />
        {s.pending  > 0 && <StatCard label="รอเบิกคืน"    value={money(s.pending)}  accent="amber" />}
        {s.borrowed > 0 && <StatCard label="ยืมใช้ส่วนตัว" value={money(s.borrowed)} accent="red" />}
        {acct.installment && (
          <StatCard
            label="ผ่อนคงเหลือ"
            value={money(Math.max(0, acct.installment.total - s.installCount) * acct.installment.amount)}
            accent="blue"
            sub={`เหลือ ${Math.max(0, acct.installment.total - s.installCount)} งวด · จ่ายแล้ว ${s.installCount}`}
          />
        )}
        {!s.pending && !s.borrowed && !acct.installment && acct.entries.length > 0 && (
          <StatCard label="จ่ายไปแล้ว" value={money(s.spent)} accent="red" />
        )}
      </div>

      {acct.entries.length === 0 ? (
        <div className="text-center text-stone-500 py-12 border border-dashed border-stone-800 rounded-xl">
          ยังไม่มีรายการ
        </div>
      ) : (
        <div className="overflow-x-auto border border-stone-800 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-stone-500 bg-stone-900/40">
                <th className="text-left py-3 px-4 font-medium">วันที่</th>
                <th className="text-left py-3 px-4 font-medium">รายการ</th>
                <th className="text-left py-3 px-4 font-medium">ประเภท</th>
                <th className="text-right py-3 px-4 font-medium">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {acct.entries.map((e, i) => {
                const m = TYPE_META[e.type];
                const sign = e.type === "in" ? "+" : "−";
                return (
                  <tr key={i} className="border-t border-stone-800/60">
                    <td className="py-2.5 px-4 text-stone-400 whitespace-nowrap">{e.date ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <div className="text-stone-100">{e.desc}</div>
                      {(e.vendor || e.note) && (
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {e.vendor}{e.vendor && e.note ? " · " : ""}{e.note && <em>{e.note}</em>}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-xs ${m.cls}`}>{m.label}</span>
                    </td>
                    <td className={`py-2.5 px-4 text-right whitespace-nowrap font-medium ${m.cls}`}>
                      {sign}{money(e.amount).slice(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reimbItems.length > 0 && (
        <div className="mt-8">
          <div className="text-xs tracking-widest uppercase text-amber-300 mb-3">
            รายการรอเบิก ({reimbItems.length} รายการ · {money(s.pending)})
          </div>
          <div className="overflow-x-auto border border-stone-800 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-stone-500 bg-stone-900/40">
                  <th className="text-left py-3 px-4 font-medium">วันที่</th>
                  <th className="text-left py-3 px-4 font-medium">รายการ</th>
                  <th className="text-left py-3 px-4 font-medium">ผู้ขาย</th>
                  <th className="text-right py-3 px-4 font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {reimbItems.map((e, i) => (
                  <tr key={i} className="border-t border-stone-800/60">
                    <td className="py-2.5 px-4 text-stone-400 whitespace-nowrap">{e.date ?? "—"}</td>
                    <td className="py-2.5 px-4">{e.desc}</td>
                    <td className="py-2.5 px-4 text-stone-400">{e.vendor ?? "—"}</td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export default function MoneyTracker() {
  const [tab, setTab] = useState<string>("overview");

  const tabs = useMemo(
    () => [{ key: "overview", label: "ภาพรวม" }, ...ACCOUNTS.map(a => ({ key: a.key, label: a.name }))],
    []
  );

  const activeAccount = ACCOUNTS.find(a => a.key === tab);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-1.5 mb-8 overflow-x-auto pb-1 -mx-4 px-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap border transition ${
                tab === t.key
                  ? "bg-amber-300 text-stone-950 border-amber-300 font-semibold"
                  : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <OverviewView accounts={ACCOUNTS} onPick={setTab} />
        ) : activeAccount ? (
          <AccountView acct={activeAccount} />
        ) : null}

        <footer className="mt-16 pt-6 border-t border-stone-800/60 text-center text-[11px] text-stone-600">
          ตัวติดตามเงินส่วนตัว · แก้ข้อมูลในไฟล์ที่ตัวแปร <code className="text-stone-400">ACCOUNTS</code>
        </footer>
      </div>
    </div>
  );
}
