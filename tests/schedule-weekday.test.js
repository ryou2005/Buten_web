import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const html = readFileSync(new URL("../schedule.html", import.meta.url), "utf8");

test("公演予定の曜日が日付と合っている", () => {
  const cards = [
    ...html.matchAll(
      /class="year">(\d+)<\/span>\s*<span class="date">(\d+)\.(\d+)<\/span>\s*<span class="day">(\w+)<\/span>/g,
    ),
  ];
  assert.ok(cards.length > 0, "schedule-card が見つからない");
  for (const [, year, month, day, weekday] of cards) {
    const actual = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    assert.equal(weekday, actual, `${year}.${month}.${day} の曜日`);
  }
});

test("ワークショップの開催日の曜日が日付と合っている", () => {
  const JA = ["日", "月", "火", "水", "木", "金", "土"];
  const workshop = readFileSync(new URL("../workshop.html", import.meta.url), "utf8");
  const dates = [...workshop.matchAll(/class="news-date">(.*?)<\/span>\s*<div/g)].map(([, inner]) =>
    inner.replace(/<[^>]+>/g, "").trim(),
  );
  assert.ok(dates.length > 0, "news-date が見つからない");
  for (const text of dates) {
    const [, year, month, day, weekday] = text.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2}) \((.)\)$/) || [];
    assert.ok(year, `日付の形が「2026.10.27 (火)」になっていない: ${text}`);
    assert.equal(weekday, JA[new Date(Date.UTC(year, month - 1, day)).getUTCDay()], `${text} の曜日`);
  }
});
