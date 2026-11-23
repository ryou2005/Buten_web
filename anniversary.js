// 20周年記念公演の告知
//   ・全ページ：スマホで画面下に「チケット予約」の帯を出す。公演日を過ぎたら告知（data-anniv-promo）を消す
//   ・特設ページ（20th.html）：料金表・開場時間・予約ボタンを ticket-config.js の内容にする

import { EVENT, TICKET_CONFIG } from "./ticket-config.js";
import { formatYen, isEventOver, salesState } from "./ticket-utils.js";

const PAGES_WITHOUT_BAR = ["20th.html", "ticket.html"];
const BAR_CLOSED_KEY = "buten-anniv-bar-closed";

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// 日時・会場・上限枚数を設定の内容にそろえる
export function fillEventInfo(root = document) {
  const time = [EVENT.openTime && `開場 ${EVENT.openTime}`, EVENT.startTime && `開演 ${EVENT.startTime}`].filter(Boolean).join(" ／ ");
  root.querySelectorAll('[data-event="date"]').forEach((node) => (node.textContent = EVENT.dateText));
  root.querySelectorAll('[data-event="venue"]').forEach((node) => (node.textContent = EVENT.venue));
  if (time) root.querySelectorAll('[data-event="time"]').forEach((node) => (node.textContent = time));
  root.querySelectorAll("[data-ticket-max]").forEach((node) => (node.textContent = String(TICKET_CONFIG.maxTicketsPerReservation)));
}

export function initAnniversaryPromo(now = new Date()) {
  if (isEventOver(EVENT.date, now)) {
    document.querySelectorAll("[data-anniv-promo]").forEach((node) => node.remove());
    return;
  }

  const page = location.pathname.split("/").pop();
  if (PAGES_WITHOUT_BAR.includes(page)) return;
  try {
    if (sessionStorage.getItem(BAR_CLOSED_KEY)) return;
  } catch {
    // 保存できない環境では毎回表示する
  }

  const bar = el("div", "anniv-bar");
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "20周年記念公演のお知らせ");
  const link = el("a", "anniv-bar-link");
  link.href = "20th.html";
  link.append(el("span", "anniv-bar-date", "2027.4.29"), el("span", "anniv-bar-text", "20周年記念公演 チケット予約"));
  const close = el("button", "anniv-bar-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "このお知らせを閉じる");
  close.addEventListener("click", () => {
    bar.remove();
    document.body.classList.remove("has-anniv-bar");
    try {
      sessionStorage.setItem(BAR_CLOSED_KEY, "1");
    } catch {
      // 保存できなくても閉じるだけ
    }
  });
  bar.append(link, close);
  document.body.append(bar);
  document.body.classList.add("has-anniv-bar");
}

function renderPriceTable(table) {
  const head = el("thead");
  const headRow = el("tr");
  headRow.append(el("th", "", "席種"), ...TICKET_CONFIG.ticketKinds.map((kind) => {
    const th = el("th", "", kind.label);
    th.scope = "col";
    return th;
  }));
  head.append(headRow);

  const body = el("tbody");
  TICKET_CONFIG.seatTypes.forEach((seat) => {
    const row = el("tr");
    const th = el("th", "", seat.label);
    th.scope = "row";
    row.append(th, ...TICKET_CONFIG.ticketKinds.map((kind) => {
      const price = TICKET_CONFIG.prices[seat.id]?.[kind.id];
      return el("td", Number.isInteger(price) ? "yen" : "tbd", formatYen(price));
    }));
    body.append(row);
  });
  table.querySelector("thead")?.remove();
  table.querySelector("tbody")?.replaceWith(body);
  table.querySelector("caption").after(head);
}

// 特設ページ：受付前・受付終了のときは予約ボタンを押せないようにする
export function initAnniversaryPage(root = document) {
  const table = root.querySelector("[data-price-table]");
  if (table) renderPriceTable(table);

  const state = salesState(TICKET_CONFIG, EVENT.date);
  if (state === "open") return;
  const label = state === "before" ? "予約受付 準備中" : "予約受付は終了しました";
  root.querySelectorAll("[data-ticket-cta]").forEach((link) => {
    link.textContent = label;
    link.classList.add("is-disabled");
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
  });
  const note = root.querySelector("[data-ticket-status-note]");
  if (note && state === "before" && TICKET_CONFIG.opensText) note.textContent = `${TICKET_CONFIG.opensText}から予約受付を開始します。`;
  if (note && state === "closed") note.textContent = "たくさんのご予約ありがとうございました。";
}
