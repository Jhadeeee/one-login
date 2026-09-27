export type EntryKind = 'income' | 'expense';
export type Entry = {
  id: string;
  kind: EntryKind;
  customer: string | null;
  description: string;
  amount_cents: number;
  occurred_at: string;
  pending?: boolean;
};
export type Snapshot = {
  month_key: string;
  month_label: string;
  in_cents: number;
  out_cents: number;
  entry_count: number;
  entries: Entry[];
};
export type Profile = { business_name: string; is_demo: boolean };
export type EntryInput = {
  id: string;
  kind: EntryKind;
  customer: string | null;
  description: string;
  amount_cents: number;
};
