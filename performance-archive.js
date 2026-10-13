// 公演実績ページ：公演予定ページで日付が過ぎた公演を、その年の一覧に自動で足す
// 同じ日付・同じ公演名を公演実績に手で書いてある場合は、手で書いたほうだけを残す

import { fetchScheduleEvents, getPastEvents, toPastTense } from "./schedule-events.js";

const pad = (n) => String(n).padStart(2, "0");
const normalize = (text) => text.replace(/\s+/g, "");

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// 年の見出しと一覧の入れ物を作り、年の新しい順になる位置に入れる
function ensureYearSection(history, year) {
  const existing = history.querySelector(`.year-section[data-year="${year}"]`);
  if (existing) return existing;

  const section = el("div", "year-section");
  section.dataset.year = String(year);
  const title = el("h2", "year-title", String(year));
  title.append(el("small", "", "年"));
  section.append(title, el("div", "perf-rows"));

  const sections = Array.from(history.querySelectorAll(".year-section"));
  const next = sections.find((s) => s.dataset.year === "older" || Number(s.dataset.year) < year);
  if (next) next.before(section);
  else history.querySelector(".perf-more")?.before(section);

  // 年のボタンも足す
  const filters = history.querySelector(".year-filters");
  if (filters && !filters.querySelector(`.year-btn[data-year="${year}"]`)) {
    const button = el("button", "year-btn", `${year}年`);
    button.dataset.year = String(year);
    button.setAttribute("aria-pressed", "false");
    const buttons = Array.from(filters.querySelectorAll(".year-btn"));
    const after = buttons.find((b) => b.dataset.year === "older" || Number(b.dataset.year) < year);
    if (after) after.before(button);
    else filters.append(button);
  }
  return section;
}

function buildRow(event) {
  const row = el("article", "perf-row");
  const dateText = `${pad(event.month)}.${pad(event.day)}`;
  const time = el("time", "", dateText);
  time.dateTime = `${event.year}-${pad(event.month)}-${pad(event.day)}`;

  const body = el("div", "perf-row-body");
  body.append(el("h3", "", event.title));
  const meta = el("p", "perf-meta");
  if (event.location !== "未定") meta.append(el("span", "venue", event.location));
  if (event.time !== "未定") meta.append(el("span", "start", event.time));
  if (meta.childElementCount > 0) body.append(meta);
  if (event.description) body.append(el("p", "perf-desc", toPastTense(event.description)));

  row.append(time, body);
  if (event.flyer) {
    const link = el("a", "flyer-link");
    link.href = event.flyer.href;
    link.target = "_blank";
    link.rel = "noopener";
    const img = el("img");
    img.src = event.flyer.href;
    img.alt = event.flyer.alt;
    img.loading = "lazy";
    link.append(img);
    row.append(link);
  }
  return row;
}

export async function addPastScheduleToHistory(history) {
  let events;
  try {
    events = getPastEvents(await fetchScheduleEvents());
  } catch (error) {
    // 読み込めなくても、手で書いた実績はそのまま見えるので何もしない
    console.error("Past schedule could not be loaded:", error);
    return false;
  }

  let added = false;
  events.forEach((event) => {
    const rows = ensureYearSection(history, event.year).querySelector(".perf-rows");
    const dateTime = `${event.year}-${pad(event.month)}-${pad(event.day)}`;
    const items = Array.from(rows.querySelectorAll(".perf-row"));
    const duplicate = items.some(
      (item) =>
        item.querySelector("time")?.dateTime === dateTime &&
        normalize(item.querySelector("h3")?.textContent || "") === normalize(event.title),
    );
    if (duplicate) return;

    // 日付の新しい順になる位置に入れる
    const row = buildRow(event);
    const next = items.find((item) => (item.querySelector("time")?.dateTime || "") < dateTime);
    if (next) next.before(row);
    else rows.append(row);
    added = true;
  });
  return added;
}
