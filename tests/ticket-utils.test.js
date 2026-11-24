import assert from "node:assert/strict";
import test from "node:test";
import { calcTotal, countTickets, formatYen, isEventOver, salesState, selectionError } from "../ticket-utils.js";

const eventDate = { year: 2027, month: 4, day: 29 };
const config = {
  status: "open",
  maxPeoplePerApplication: 8,
  seatTypes: [{ id: "reserved" }, { id: "free" }],
};

test("公演当日いっぱいまでは受付中、日本時間の翌日0時で受付終了になる", () => {
  assert.equal(salesState(config, eventDate, new Date("2027-04-29T14:59:59Z")), "open");
  assert.equal(salesState(config, eventDate, new Date("2027-04-29T15:00:00Z")), "closed");
  assert.equal(isEventOver(eventDate, new Date("2027-04-29T15:00:00Z")), true);
});

test("受付状況は設定どおり。知らない値は受付前として扱う", () => {
  const now = new Date("2027-01-01T00:00:00+09:00");
  assert.equal(salesState({ ...config, status: "before" }, eventDate, now), "before");
  assert.equal(salesState({ ...config, status: "closed" }, eventDate, now), "closed");
  assert.equal(salesState({ ...config, status: "opne" }, eventDate, now), "before");
});

test("料金が決まっていれば合計を出し、未定の券種を選んでいれば null", () => {
  const prices = { reserved: { adult: 3000, student: 1500 }, free: { adult: 2500, student: null } };
  assert.equal(calcTotal("reserved", { adult: 2, student: 1 }, prices), 7500);
  assert.equal(calcTotal("free", { adult: 2, student: 0 }, prices), 5000);
  assert.equal(calcTotal("free", { adult: 1, student: 1 }, prices), null);
});

test("金額の表示", () => {
  assert.equal(formatYen(3000), "3,000円");
  assert.equal(formatYen(0), "無料");
  assert.equal(formatYen(null), "調整中");
});

test("席種・人数の選び方をチェックする", () => {
  assert.equal(countTickets({ adult: 2, student: 3 }), 5);
  assert.match(selectionError("", { adult: 1 }, config), /席種/);
  assert.match(selectionError("free", { adult: 0, student: 0 }, config), /1人以上/);
  assert.match(selectionError("free", { adult: 5, student: 4 }, config), /8人まで/);
  assert.equal(selectionError("free", { adult: 5, student: 3 }, config), "");
});
