// 予約の一覧を CSV に書き出す（当日の受付名簿・集計用。Excel でそのまま開ける）
//   使い方（backend/ticket で）: npm run export -- reservations.csv
//   AWS の認証情報（aws configure など）が必要

import { writeFileSync } from "node:fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { TICKET_CONFIG } from "../config.mjs";

const TABLE = process.env.RESERVATIONS_TABLE || "ButenTicketReservations";
const outFile = process.argv[2] || "reservations.csv";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "ap-northeast-1" }));

const items = [];
let ExclusiveStartKey;
do {
  const page = await db.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey }));
  items.push(...(page.Items || []));
  ExclusiveStartKey = page.LastEvaluatedKey;
} while (ExclusiveStartKey);

// フリガナ順（受付で探しやすいように）
items.sort((a, b) => (a.kana || "").localeCompare(b.kana || "", "ja"));

const seatLabel = (id) => TICKET_CONFIG.seatTypes.find((s) => s.id === id)?.label || id;
const statusLabel = { confirmed: "予約中", canceled: "キャンセル" };
const header = [
  "予約番号", "状態", "フリガナ", "お名前", "席種",
  ...TICKET_CONFIG.ticketKinds.map((k) => `${k.label}（枚）`),
  "合計（枚）", "電話番号", "メールアドレス", "ご連絡事項", "予約日時", "確認メール",
];
const rows = items.map((r) => [
  r.reservationId,
  statusLabel[r.status] || r.status,
  r.kana,
  r.name,
  seatLabel(r.seatType),
  ...TICKET_CONFIG.ticketKinds.map((k) => r.tickets?.[k.id] ?? 0),
  r.totalTickets,
  r.tel,
  r.email,
  r.message,
  new Date(r.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
  r.customerEmailSent === false ? "未送信" : "送信済み",
]);

const cell = (value) => {
  const s = String(value ?? "");
  // Excel で式として読まれないよう、= + - @ で始まる値は ' を付ける
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
writeFileSync(outFile, `﻿${csv}\r\n`, "utf8");

const active = items.filter((r) => r.status === "confirmed");
console.log(`${items.length}件を ${outFile} に書き出しました（予約中 ${active.length}件）`);
for (const seat of TICKET_CONFIG.seatTypes) {
  const sold = active.filter((r) => r.seatType === seat.id).reduce((sum, r) => sum + r.totalTickets, 0);
  console.log(`  ${seat.label}: ${sold} / ${TICKET_CONFIG.capacity[seat.id]}枚`);
}
