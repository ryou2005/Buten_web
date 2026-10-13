// 公演予定ページ（schedule.html）の .schedule-card を読み取り、日付で「これから」と「終わった公演」に分ける共通処理
// トップページ（近い公演3件）・公演予定ページ（終わった公演を外す）・公演実績ページ（終わった公演を足す）で使う

const tokyoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 日本時間の今日を 20261013 のような数にする
export function tokyoToday(now = new Date()) {
  const parts = Object.fromEntries(
    tokyoDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  return Number(`${parts.year}${parts.month}${parts.day}`);
}

// 2月30日のような存在しない日付や、読み取れなかった日付をはじく
export function isValidDate({ year, month, day }) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isInteger(year) && year >= 1000 &&
    Number.isInteger(month) && Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dateNumber = ({ year, month, day }) => year * 10000 + month * 100 + day;

// 今日以降の公演を近い順に3件（今日の公演は当日いっぱい残す）
export function getUpcomingEvents(events, now = new Date()) {
  const today = tokyoToday(now);
  return events
    .filter((event) => isValidDate(event) && dateNumber(event) >= today)
    .sort((a, b) => dateNumber(a) - dateNumber(b))
    .slice(0, 3);
}

// 日付が過ぎた公演を新しい順に
export function getPastEvents(events, now = new Date()) {
  const today = tokyoToday(now);
  return events
    .filter((event) => isValidDate(event) && dateNumber(event) < today)
    .sort((a, b) => dateNumber(b) - dateNumber(a));
}

// 予定の書き方を実績の書き方にする（「出演します」→「出演しました」、「行われる」→「行われた」）
export function toPastTense(text) {
  return text.replace(/行われる/g, "行われた").replace(/します(?=[。！!\s]|$)/g, "しました");
}

function readDetails(card, selector) {
  const element = card.querySelector(selector)?.cloneNode(true);
  element?.querySelector(".icon")?.remove();
  return element?.textContent.trim() || "未定";
}

// .schedule-card を読み取る（card は公演予定ページ上で使う元の要素）
export function readScheduleCards(root) {
  return Array.from(root.querySelectorAll(".schedule-card"), (card) => {
    const [month, day] = (card.querySelector(".date")?.textContent.trim() || "").split(".").map(Number);
    const flyer = card.querySelector(".schedule-flyer");
    return {
      card,
      year: Number(card.querySelector(".year")?.textContent.trim()),
      month,
      day,
      title: card.querySelector(".schedule-title")?.textContent.trim() || "",
      location: readDetails(card, ".schedule-location"),
      time: readDetails(card, ".schedule-time"),
      description: card.querySelector(".schedule-desc")?.textContent.trim() || "",
      flyer: flyer ? { href: flyer.href, alt: flyer.querySelector("img")?.alt || "" } : null,
    };
  }).filter((event) => event.title);
}

// 別のページから公演予定ページを読み込んで公演を取り出す
export async function fetchScheduleEvents() {
  const response = await fetch(new URL("schedule.html", document.baseURI), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);

  const scheduleDocument = new DOMParser().parseFromString(await response.text(), "text/html");
  const list = scheduleDocument.querySelector(".detailed-schedule-list");
  if (!list) throw new Error("Schedule list was not found");
  return readScheduleCards(list);
}

// 公演予定ページ：日付が過ぎた公演を一覧から外し、公演が残っていない年のボタンも隠す
export function hidePastScheduleCards(list, now = new Date()) {
  const events = readScheduleCards(list);
  const past = new Set(getPastEvents(events, now).map((event) => event.card));
  past.forEach((card) => card.remove());

  const remainingYears = new Set(events.filter((event) => !past.has(event.card)).map((event) => String(event.year)));
  document.querySelectorAll(".filter-btn").forEach((button) => {
    const year = button.textContent.trim().replace("年", "");
    if (/^\d{4}$/.test(year) && !remainingYears.has(year)) button.hidden = true;
  });

  if (remainingYears.size === 0) {
    const message = document.createElement("p");
    message.className = "schedule-empty";
    message.textContent = "現在、公演予定はありません。";
    list.append(message);
  }
}
