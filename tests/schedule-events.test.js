import assert from "node:assert/strict";
import test from "node:test";
import { getPastEvents, toPastTense } from "../schedule-events.js";

const event = (year, month, day) => ({ year, month, day });

test("日付が過ぎた公演を新しい順に返す（今日の公演はまだ含めない）", () => {
  const events = [event(2026, 10, 18), event(2026, 9, 20), event(2026, 10, 12), event(2026, 10, 13), event(2027, 4, 29)];
  assert.deepEqual(getPastEvents(events, new Date("2026-10-13T12:00:00+09:00")), [
    event(2026, 10, 12), event(2026, 9, 20),
  ]);
});

test("日本時間の日付が変わった時点で過去の公演になる", () => {
  const events = [event(2026, 10, 18)];
  assert.deepEqual(getPastEvents(events, new Date("2026-10-18T14:59:59Z")), []);
  assert.deepEqual(getPastEvents(events, new Date("2026-10-18T15:00:00Z")), events);
});

test("存在しない日付は過去の公演に入れない", () => {
  assert.deepEqual(getPastEvents([event(2025, 2, 30), event(NaN, 1, 1)], new Date("2026-10-13T00:00:00+09:00")), []);
});

test("予定の書き方を実績の書き方にする", () => {
  assert.equal(
    toPastTense("東秋留小学校で行われる「野辺大運動会」に出演します"),
    "東秋留小学校で行われた「野辺大運動会」に出演しました",
  );
  assert.equal(toPastTense("「あきる野産業祭」に出演します。"), "「あきる野産業祭」に出演しました。");
  assert.equal(toPastTense("武天kidsの成果発表会です"), "武天kidsの成果発表会です");
  assert.equal(toPastTense(""), "");
});
