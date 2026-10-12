import assert from "node:assert/strict";
import test from "node:test";
import { getUpcomingEvents } from "../home-schedule.js";

const event = (year, month, day) => ({ year, month, day });

test("shows the nearest three upcoming events even when source order is mixed", () => {
  const events = [
    event(2027, 4, 29), event(2026, 11, 15), event(2026, 9, 20),
    event(2026, 10, 31), event(2026, 11, 8), event(2026, 10, 18),
  ];
  const original = [...events];
  assert.deepEqual(getUpcomingEvents(events, new Date("2026-10-12T00:00:00+09:00")), [
    event(2026, 10, 18), event(2026, 10, 31), event(2026, 11, 8),
  ]);
  assert.deepEqual(events, original);
});

test("includes today's event and advances the list at midnight in Japan", () => {
  const events = [event(2026, 10, 18), event(2026, 10, 31), event(2026, 11, 8), event(2026, 11, 15)];
  assert.deepEqual(getUpcomingEvents(events, new Date("2026-10-18T14:59:59Z")), events.slice(0, 3));
  assert.deepEqual(getUpcomingEvents(events, new Date("2026-10-18T15:00:00Z")), events.slice(1));
});

test("handles year boundaries and fewer than three events", () => {
  const events = [event(2026, 12, 26), event(2027, 6, 13), event(2027, 4, 29)];
  assert.deepEqual(getUpcomingEvents(events, new Date("2027-01-01T00:00:00+09:00")), [
    event(2027, 4, 29), event(2027, 6, 13),
  ]);
  assert.deepEqual(getUpcomingEvents(events, new Date("2027-06-14T00:00:00+09:00")), []);
  assert.deepEqual(getUpcomingEvents([], new Date("2026-10-12T00:00:00+09:00")), []);
});

test("ignores malformed dates instead of rolling them into another month", () => {
  const events = [
    event(2027, 2, 29), event(2026, 13, 1), event(2026, 11, 0),
    event(NaN, 11, 1), event(2026, 11, undefined), event(2026, 11, 8),
  ];
  assert.deepEqual(getUpcomingEvents(events, new Date("2026-10-12T00:00:00+09:00")), [event(2026, 11, 8)]);
});
