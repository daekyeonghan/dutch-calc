// 저장/조회에 쓰는 공유 타입.
import type { RoundingOption } from "./calc";

export interface SavedPerson {
  name: string;
  paid: number;
  share: number;
  balance: number;
  items: { label: string; amount: number }[];
}

export interface SettlementPayload {
  people: SavedPerson[];
  transactions: { from: string; to: string; amount: number }[];
  total: number;
  perPerson: number;
  residual: number;
  residualName: string | null;
  rounding: RoundingOption;
}

export interface SettlementListItem {
  id: string;
  title: string | null;
  total: number;
  peopleCount: number;
  createdAt: string;
}

export interface SettlementDetail extends SettlementListItem {
  payload: SettlementPayload;
}
