const tokyoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getUpcomingEvents(events, now = new Date()) {
  const parts = Object.fromEntries(
    tokyoDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  const today = Number(`${parts.year}${parts.month}${parts.day}`);

  return events
    .filter(({ year, month, day }) => {
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        Number.isInteger(year) && year >= 1000 &&
        Number.isInteger(month) && Number.isInteger(day) &&
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day &&
        year * 10000 + month * 100 + day >= today
      );
    })
    .sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day)
    .slice(0, 3);
}

function readDetails(card, selector) {
  const element = card.querySelector(selector)?.cloneNode(true);
  element?.querySelector(".icon")?.remove();
  return element?.textContent.trim() || "未定";
}

export async function initializeHomeSchedule(list) {
  try {
    const response = await fetch(new URL("schedule.html", document.baseURI), {
      cache: "no-cache",
    });
    if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);

    const scheduleDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    if (!scheduleDocument.querySelector(".detailed-schedule-list")) {
      throw new Error("Schedule list was not found");
    }

    const events = Array.from(scheduleDocument.querySelectorAll(".schedule-card"), (card) => {
      const [month, day] = (card.querySelector(".date")?.textContent.trim() || "").split(".").map(Number);
      return {
        year: Number(card.querySelector(".year")?.textContent.trim()),
        month,
        day,
        title: card.querySelector(".schedule-title")?.textContent.trim() || "",
        location: readDetails(card, ".schedule-location"),
        time: readDetails(card, ".schedule-time"),
      };
    });
    const upcomingEvents = getUpcomingEvents(events.filter((event) => event.title));
    const items = upcomingEvents.map((event) => {
      const item = document.createElement("div");
      item.className = "schedule-item";
      const date = document.createElement("div");
      date.className = "schedule-date";
      date.textContent = `${event.year}.${event.month}.${event.day}`;
      const content = document.createElement("div");
      content.className = "schedule-content";
      const heading = document.createElement("h3");
      const link = document.createElement("a");
      link.href = "schedule.html";
      link.textContent = event.title;
      heading.append(link);
      const details = document.createElement("p");
      const time = event.time.replace(/^start\s+/i, "");
      details.textContent = `場所：${event.location} / 時間：${time}`;
      content.append(heading, details);
      item.append(date, content);
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
