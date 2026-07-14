import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildTaxWorkbook, getTaxReport, normalizeTaxRange } from "@/lib/tax-report";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const range = normalizeTaxRange(
    request.nextUrl.searchParams.get("from"),
    request.nextUrl.searchParams.get("to")
  );
  const report = await getTaxReport(range);
  const workbook = buildTaxWorkbook(report);
  const fileName = `igunbill-tax-${range.from}_${range.to}.xlsx`;

  return new NextResponse(workbook, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Cache-Control": "no-store"
    }
  });
}
