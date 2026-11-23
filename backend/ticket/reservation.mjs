// 予約の入力チェック・予約番号・メール文面など（AWS に依存しない部分。tests/ticket-backend.test.js で確かめる）

import { randomInt } from "node:crypto";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 数字・ハイフン・空白・括弧・+ だけで、数字が10〜13桁
const TEL_PATTERN = /^[0-9+\-()\s]+$/;
const LIMITS = { name: 50, kana: 50, email: 254, tel: 20, message: 500 };

const tokyoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function tokyoToday(now) {
  const parts = Object.fromEntries(tokyoDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return Number(`${parts.year}${parts.month}${parts.day}`);
}

// 予約を受け付けられる状態か（公演日を過ぎたら締め切る。公演当日はまだ受け付ける）
export function isSalesOpen(config, event, now = new Date()) {
  const { year, month, day } = event.date;
  return config.status === "open" && tokyoToday(now) <= year * 10000 + month * 100 + day;
}

const text = (value) => (typeof value === "string" ? value.trim() : "");

// 送られてきた内容を確かめ、保存してよい形にそろえる
export function validateReservation(input, config) {
  const errors = [];
  const data = input && typeof input === "object" ? input : {};

  // ボット対策：人には見えない欄に入力があれば受け付けない
  if (text(data.website)) return { errors: ["送信できませんでした。"] };

  const seatType = text(data.seatType);
  if (!config.seatTypes.some((seat) => seat.id === seatType)) errors.push("席種を選んでください");

  const tickets = {};
  const sentTickets = data.tickets && typeof data.tickets === "object" ? data.tickets : {};
  let total = 0;
  for (const kind of config.ticketKinds) {
    const count = sentTickets[kind.id] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > config.maxTicketsPerReservation) {
      errors.push(`${kind.label}の枚数が正しくありません`);
      continue;
    }
    tickets[kind.id] = count;
    total += count;
  }
  const unknownKinds = Object.keys(sentTickets).filter((id) => !config.ticketKinds.some((kind) => kind.id === id));
  if (unknownKinds.length > 0) errors.push("券種が正しくありません");
  if (total === 0) errors.push("枚数を1枚以上選んでください");
  if (total > config.maxTicketsPerReservation) errors.push(`1回のご予約は${config.maxTicketsPerReservation}枚までです`);

  const name = text(data.name);
  const kana = text(data.kana);
  const email = text(data.email);
  const tel = text(data.tel);
  const message = text(data.message);

  if (!name) errors.push("お名前は必須です");
  if (!kana) errors.push("フリガナは必須です");
  if (!email) errors.push("メールアドレスは必須です");
  else if (!EMAIL_PATTERN.test(email)) errors.push("メールアドレスの形式が正しくありません");
  if (!tel) errors.push("電話番号は必須です");
  else {
    const digits = tel.replace(/\D/g, "").length;
    if (!TEL_PATTERN.test(tel) || digits < 10 || digits > 13) errors.push("電話番号の形式が正しくありません");
  }
  for (const [key, value] of Object.entries({ name, kana, email, tel, message })) {
    if (value.length > LIMITS[key]) errors.push("入力が長すぎる項目があります");
  }
  if (data.privacyConsent !== true) errors.push("個人情報の取り扱いへの同意が必要です");

  if (errors.length > 0) return { errors: [...new Set(errors)] };
  return { errors: [], value: { seatType, tickets, totalTickets: total, name, kana, email, tel, message } };
}

// 予約番号：読み間違えやすい文字（0/O、1/I/L、2/Z、5/S、8/B など）を除いた6文字
const NUMBER_CHARS = "ACDEFGHJKMNPQRTUVWXY34679";
export function createReservationNumber(random = randomInt) {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += NUMBER_CHARS[random(NUMBER_CHARS.length)];
  return `BT-${code}`;
}

// 合計金額（料金が決まっていない券種が含まれていれば null）
export function calcTotal(seatType, tickets, prices) {
  let total = 0;
  for (const [kind, count] of Object.entries(tickets)) {
    if (!count) continue;
    const price = prices[seatType]?.[kind];
    if (!Number.isInteger(price)) return null;
    total += price * count;
  }
  return total;
}

// 席種ごとの空き状況。正確な残り枚数は出さず「受付中 / 残りわずか / 満席」で返す
export function availabilityStatus(sold, capacity, fewThreshold) {
  const remaining = capacity - (sold || 0);
  if (remaining <= 0) return "soldout";
  if (remaining <= fewThreshold) return "few";
  return "available";
}

// 予約に必要な席が残っているときだけ増やせるよう、DynamoDB の条件に使う上限
// （売れた枚数 <= 上限 なら、今回の枚数を足しても定員を超えない）
export function soldLimitFor(capacity, count) {
  return capacity - count;
}

const yen = (value) => `${value.toLocaleString("ja-JP")}円`;

function ticketLines(reservation, config) {
  return config.ticketKinds
    .filter((kind) => reservation.tickets[kind.id] > 0)
    .map((kind) => `  ${kind.label} ${reservation.tickets[kind.id]}枚`)
    .join("\n");
}

function timeText(event) {
  const open = event.openTime ? `開場 ${event.openTime}` : "開場 未定";
  const start = event.startTime ? `開演 ${event.startTime}` : "開演 未定";
  return `${open} ／ ${start}`;
}

function summary(reservation, config, event) {
  const seat = config.seatTypes.find((s) => s.id === reservation.seatType)?.label || reservation.seatType;
  const total = calcTotal(reservation.seatType, reservation.tickets, config.prices);
  return [
    `【予約番号】${reservation.reservationId}`,
    "",
    `【公演】${event.title}`,
    `【日時】${event.dateText}　${timeText(event)}`,
    `【会場】${event.venue}`,
    "",
    `【席種】${seat}`,
    "【枚数】",
    ticketLines(reservation, config),
    `  合計 ${reservation.totalTickets}枚`,
    `【当日お支払い金額】${total === null ? "料金が決まり次第お知らせします" : yen(total)}`,
  ].join("\n");
}

// お客さんへの予約確認メール
export function customerEmail(reservation, config, event) {
  return {
    subject: `【和太鼓 武天】${event.title} ご予約確認（${reservation.reservationId}）`,
    body: `${reservation.name} 様

このたびは「${event.title}」をご予約いただき、ありがとうございます。
以下の内容でご予約を承りました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary(reservation, config, event)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 当日について
・会場の受付で「予約番号」と「お名前」をお伝えください。
・お支払いは当日、受付でお願いいたします。
・このメールは当日まで保存しておいてください。

■ 変更・キャンセルについて
お手数ですが、予約番号を添えてお問い合わせフォームよりご連絡ください。
https://wadaiko-buten.net/contact.html

※ このメールは送信専用のアドレスからお送りしています。

和太鼓 武天 -BUTEN-
https://wadaiko-buten.net/
`,
  };
}

// 運営への通知メール
export function adminEmail(reservation, config, event) {
  return {
    subject: `【武天】20周年公演 予約 ${reservation.reservationId} - ${reservation.name}様 ${reservation.totalTickets}枚`,
    body: `ウェブサイトから20周年記念公演のチケット予約が入りました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary(reservation, config, event)}

【お名前】${reservation.name}（${reservation.kana}）
【メールアドレス】${reservation.email}
【電話番号】${reservation.tel}
【ご連絡事項】
${reservation.message || "なし"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

予約日時: ${new Date(reservation.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
お客さんへの確認メール: ${reservation.customerEmailSent ? "送信済み" : "送信できませんでした（お客さんに連絡してください）"}
`,
  };
}
