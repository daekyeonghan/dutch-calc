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
  // 정산 결과가 계산된 시점(ISO). 저장 시각(createdAt)과 별개로, 공유·이미지에 표시.
  calculatedAt: string;
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
