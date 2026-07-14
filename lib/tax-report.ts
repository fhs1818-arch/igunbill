import { PaymentStatus, RepairCategory, RepairPayer } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const BUILDING_NAME = "이건빌";

type TaxRange = {
  from: string;
  to: string;
};

export type TaxIncomeRow = {
  date: string;
  building: string;
  roomNumber: string;
  tenantName: string;
  monthlyRent: number;
  managementFee: string;
  paidDate: string;
  memo: string;
  status: PaymentStatus;
};

export type TaxExpenseRow = {
  date: string;
  building: string;
  category: RepairCategory;
  content: string;
  amount: number;
  vendor: string;
  evidence: string;
  payer: RepairPayer;
};

export type TaxSummary = {
  building: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
};

export type TaxReport = {
  from: string;
  to: string;
  incomes: TaxIncomeRow[];
  expenses: TaxExpenseRow[];
  summary: TaxSummary;
};

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function defaultTaxRange(): TaxRange {
  const today = new Date();
  const year = today.getFullYear();
  return {
    from: `${year}-01-01`,
    to: todayString()
  };
}

export function normalizeTaxRange(from?: string | null, to?: string | null): TaxRange {
  const fallback = defaultTaxRange();
  const safeFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : fallback.from;
  const safeTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : fallback.to;

  return safeFrom <= safeTo ? { from: safeFrom, to: safeTo } : { from: safeTo, to: safeFrom };
}

function toDateStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0);
}

function toDateEndExclusive(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day + 1, 0, 0, 0);
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function dateString(value: Date | string | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function paymentStatusText(status: PaymentStatus) {
  return {
    SCHEDULED: "예정",
    PAID: "입금완료",
    OVERDUE: "미납"
  }[status];
}

export function repairCategoryText(category: RepairCategory) {
  return {
    REPAIR: "수리비",
    SUPPLIES: "소모품",
    BROKERAGE: "부동산중개비",
    OTHER: "기타"
  }[category];
}

export function repairPayerText(payer: RepairPayer) {
  return {
    LANDLORD: "임대인",
    TENANT: "임차인"
  }[payer];
}

export async function getTaxReport(range: TaxRange): Promise<TaxReport> {
  const [payments, repairs] = await Promise.all([
    prisma.rentPayment.findMany({
      where: {
        paymentMonth: {
          gte: monthKey(range.from),
          lte: monthKey(range.to)
        }
      },
      include: {
        room: true
      },
      orderBy: [
        { paymentMonth: "asc" },
        { room: { roomNumber: "asc" } }
      ]
    }),
    prisma.repair.findMany({
      where: {
        date: {
          gte: toDateStart(range.from),
          lt: toDateEndExclusive(range.to)
        }
      },
      include: {
        room: true
      },
      orderBy: {
        date: "asc"
      }
    })
  ]);

  const incomes = payments.map((payment) => {
    const paidDate = dateString(payment.paidDate);
    return {
      date: paidDate || payment.paymentMonth,
      building: BUILDING_NAME,
      roomNumber: payment.room.roomNumber,
      tenantName: payment.room.tenantName ?? "",
      monthlyRent: payment.monthlyRent,
      managementFee: "",
      paidDate,
      memo: payment.memo ?? "",
      status: payment.status
    };
  });

  const expenses = repairs.map((repair) => ({
    date: dateString(repair.date),
    building: BUILDING_NAME,
    category: repair.category,
    content: `${repair.itemName}${repair.description ? ` - ${repair.description}` : ""}`,
    amount: repair.amount,
    vendor: "",
    evidence: "",
    payer: repair.payer
  }));

  const totalIncome = incomes
    .filter((income) => income.status === "PAID")
    .reduce((sum, income) => sum + income.monthlyRent, 0);
  const totalExpense = expenses
    .filter((expense) => expense.payer === "LANDLORD")
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    from: range.from,
    to: range.to,
    incomes,
    expenses,
    summary: {
      building: BUILDING_NAME,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense
    }
  };
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index: number) {
  let column = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }
  return column;
}

function sheetXml(rows: Array<Array<string | number>>) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const ref = `${columnName(cellIndex)}${rowIndex + 1}`;
          if (typeof cell === "number") {
            return `<c r="${ref}"><v>${cell}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function workbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="임대수입" sheetId="1" r:id="rId1"/>
    <sheet name="필요경비" sheetId="2" r:id="rId2"/>
    <sheet name="연간요약" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`;
}

function workbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs>
</styleSheet>`;
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files: Array<{ name: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name);
    const content = Buffer.from(file.content, "utf8");
    const crc = crc32(content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function buildTaxWorkbook(report: TaxReport) {
  const incomeRows: Array<Array<string | number>> = [
    [`기간: ${report.from} ~ ${report.to}`],
    ["금액 단위: 만원"],
    ["날짜", "건물", "호실", "세입자", "월세", "관리비", "입금일", "상태", "비고"],
    ...report.incomes.map((income) => [
      income.date,
      income.building,
      income.roomNumber,
      income.tenantName,
      income.monthlyRent,
      income.managementFee,
      income.paidDate,
      paymentStatusText(income.status),
      income.memo
    ])
  ];

  const expenseRows: Array<Array<string | number>> = [
    [`기간: ${report.from} ~ ${report.to}`],
    ["금액 단위: 만원"],
    ["날짜", "건물", "구분", "내용", "금액", "거래처", "증빙", "부담자"],
    ...report.expenses.map((expense) => [
      expense.date,
      expense.building,
      repairCategoryText(expense.category),
      expense.content,
      expense.amount,
      expense.vendor,
      expense.evidence,
      repairPayerText(expense.payer)
    ])
  ];

  const summaryRows: Array<Array<string | number>> = [
    [`기간: ${report.from} ~ ${report.to}`],
    ["금액 단위: 만원"],
    ["건물", "총수입", "총지출", "순수익"],
    [
      report.summary.building,
      report.summary.totalIncome,
      report.summary.totalExpense,
      report.summary.netIncome
    ],
    [
      "전체 합계",
      report.summary.totalIncome,
      report.summary.totalExpense,
      report.summary.netIncome
    ]
  ];

  return zipFiles([
    { name: "[Content_Types].xml", content: contentTypesXml() },
    { name: "_rels/.rels", content: rootRelsXml() },
    { name: "xl/workbook.xml", content: workbookXml() },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml() },
    { name: "xl/styles.xml", content: stylesXml() },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml(incomeRows) },
    { name: "xl/worksheets/sheet2.xml", content: sheetXml(expenseRows) },
    { name: "xl/worksheets/sheet3.xml", content: sheetXml(summaryRows) }
  ]);
}
