/**
 * Line icons for the system types Decignal reads (lib/content.ts CONNECTS and CONNECTS_MORE): one
 * drawn object per type, 24px grid, 1.8px stroke in currentColor. Generic objects, never vendor logos.
 */
const PATHS: Record<string, string> = {
  // ERP: the ledger
  erp: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M4 9h16 M4 14.5h16 M10 9v11",
  // CRM: a contact and their card
  crm: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3.5 19.5c.4-3 2.6-5 5.5-5s5.1 2 5.5 5 M16 7h4.5 M16 11h4.5 M17.5 15h3",
  // Inventory and service records (the "mes" source id): the wrench
  mes: "M14.7 6.3a4 4 0 0 0-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.6-.6-.6-2.6z",
  // Spreadsheets and trackers (the "wms" source id): the grid
  wms: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M4 10h16 M4 15h16 M10 4v16",
  // Documents and files (the "sup" source id): the page with its corner turned
  sup: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v5h5 M9 13h6 M9 17h4",
  // Business communications (the "ext" source id): the message
  ext: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7.5 9.5h9 M7.5 13h6",
  // TMS: a lane between two stops
  tms: "M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7",
  // CMMS: the wrench
  cmms: "M14.7 6.3a4 4 0 0 0-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.6-.6-.6-2.6z",
  // SCADA and IoT: the gauge
  scada: "M4 17a8 8 0 1 1 16 0 M12 17l3.6-4.4 M12 18.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z M7 13.5l1 .6 M17 13.5l-1 .6 M12 9v1.2",
  // QMS: the inspection shield
  qms: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9 12l2 2 4-4",
  // POS: the receipt
  pos: "M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z M9 7.5h6 M9 11h6 M9 14.5h3.5",
  // DMS: the dealer's storefront
  dms: "M4 9l1.5-5h13L20 9 M4 9h16 M5 9v11h14V9 M10 20v-5h4v5",
  // Service desk: the headset
  desk: "M5 14v-2a7 7 0 0 1 14 0v2 M4 13.5h3v5H5a1 1 0 0 1-1-1z M20 13.5h-3v5h2a1 1 0 0 0 1-1z M19 18.5c0 1.6-1.8 2.5-5 2.5",
  // Data warehouse: the stacked store
  dwh: "M12 8.5c3.9 0 7-1.1 7-2.5S15.9 3.5 12 3.5 5 4.6 5 6s3.1 2.5 7 2.5z M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6 M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5",
  // Spreadsheets: the grid
  sheet: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M4 10h16 M4 15h16 M10 4v16",
};

/** Icon key for a record a workflow uses (lib/application-demos.ts sources). */
const SOURCE_ICON: [RegExp, string][] = [
  [/catalogue|alias|customer|allocation/i, "crm"], [/tracker|sheet|price file|unit rule/i, "sheet"], [/challan|return|rejection/i, "wms"],
  [/quotation|offer|datasheet|document/i, "sup"], [/debit|invoice|acknowledgement|remittance/i, "pos"], [/service|report/i, "desk"],
  [/asset|equipment/i, "cmms"], [/quote/i, "sheet"], [/order|PO|purchase|ERP|stock|dispatch/i, "erp"], [/folder|file|message|email/i, "ext"],
];
export const sourceIcon = (name: string) => SOURCE_ICON.find(([re]) => re.test(name))?.[1] ?? "sheet";

/** The colour of the system a record comes from (CONNECTS tones; the extra icons take their family's). */
const SOURCE_TONE: Record<string, string> = {
  erp: "cobalt", pos: "cobalt", crm: "violet", mes: "emerald", desk: "emerald", cmms: "emerald",
  wms: "saffron", sheet: "saffron", sup: "tangerine", ext: "pink",
};
export const sourceTone = (name: string) => SOURCE_TONE[sourceIcon(name)] ?? "cobalt";

/** An icon's path on its 24px grid, for drawings that place it inside their own SVG. */
export const systemPath = (id: string) => PATHS[id];

export function SystemIcon({ id, size = 24, className }: { id: string; size?: number; className?: string }) {
  const d = PATHS[id];
  if (!d) return null;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
