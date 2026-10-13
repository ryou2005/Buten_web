import { fetchScheduleEvents, getUpcomingEvents } from "./schedule-events.js";

export { getUpcomingEvents };

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export async function initializeHomeSchedule(list) {
  try {
    const upcomingEvents = getUpcomingEvents(await fetchScheduleEvents());
    const items = upcomingEvents.map((event) => {
      // 行全体を公演予定ページへのリンクにする（年・曜日の上に月.日を大きく出す）
      const item = document.createElement("a");
      item.className = "event";
      item.href = "schedule.html";
      const date = document.createElement("div");
      date.className = "event-date";
      const yearAndDay = document.createElement("small");
      const weekday = WEEKDAYS[new Date(Date.UTC(event.year, event.month - 1, event.day)).getUTCDay()];
      yearAndDay.textContent = `${event.year} ${weekday}`;
      date.append(yearAndDay, `${event.month}.${event.day}`);
      const content = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = event.title;
      const details = document.createElement("p");
      const time = event.time.replace(/^start\s+/i, "");
      details.textContent = `場所：${event.location} / 時間：${time}`;
      content.append(heading, details);
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      item.append(date, content, arrow);
      return item;
    });

    if (items.length === 0) {
      const message = document.createElement("p");
      message.textContent = "現在、公演予定はありません。";
      items.push(message);
    }
    list.replaceChildren(...items);
  } catch (error) {
    console.error("Home schedule could not be loaded:", error);
    const message = document.createElement("p");
    message.textContent = "公演予定を読み込めませんでした。";
    const link = document.createElement("a");
    link.href = "schedule.html";
    link.textContent = "公演予定はこちら";
    list.replaceChildren(message, link);
  }
}
