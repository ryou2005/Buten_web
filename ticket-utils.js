// チケット申込フォームの計算（画面に依存しない部分。tests/ticket-utils.test.js で確かめる）

import { isValidDate, tokyoToday } from "./schedule-events.js";

const dateNumber = ({ year, month, day }) => year * 10000 + month * 100 + day;

// 公演日を過ぎたか（公演当日はまだ過ぎていない扱い）
export function isEventOver(eventDate, now = new Date()) {
  return isValidDate(eventDate) && tokyoToday(now) > dateNumber(eventDate);
}

// いまの受付状況。公演日を過ぎたら設定に関係なく受付終了
export function salesState(config, eventDate, now = new Date()) {
  if (isEventOver(eventDate, now)) return "closed";
  return ["before", "open", "closed"].includes(config.status) ? config.status : "before";
}

export function countTickets(tickets) {
  return Object.values(tickets).reduce((sum, n) => sum + (Number.isInteger(n) && n > 0 ? n : 0), 0);
}

// 合計金額。枚数を選んだ券種に料金が決まっていないものがあれば null
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

export function formatYen(value) {
  if (!Number.isInteger(value)) return "調整中";
  return value === 0 ? "無料" : `${value.toLocaleString("ja-JP")}円`;
}

// 席種と人数の選び方に問題があれば、お客さんに見せる文を返す（問題なければ空文字）
export function selectionError(seatType, tickets, config) {
  if (!config.seatTypes.some((seat) => seat.id === seatType)) return "席種を選んでください。";
  const total = countTickets(tickets);
  if (total === 0) return "人数を1人以上選んでください。";
  if (total > config.maxPeoplePerApplication) {
    return `1回のお申し込みは${config.maxPeoplePerApplication}人までです。それより多い場合はお問い合わせください。`;
  }
  return "";
}
