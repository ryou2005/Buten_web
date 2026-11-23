import assert from "node:assert/strict";
import test from "node:test";
import * as site from "../ticket-config.js";
import * as api from "../backend/ticket/config.mjs";
import {
  adminEmail,
  availabilityStatus,
  createReservationNumber,
  customerEmail,
  isSalesOpen,
  soldLimitFor,
  validateReservation,
} from "../backend/ticket/reservation.mjs";

const config = api.TICKET_CONFIG;
const valid = {
  seatType: "reserved",
  tickets: { adult: 2, student: 1 },
  name: " 山田 太郎 ",
  kana: "ヤマダ タロウ",
  email: "yamada@example.com",
  tel: "090-1234-5678",
  message: "",
  privacyConsent: true,
  website: "",
};

test("サイト側と予約 API 側で、公演・席種・券種・料金・上限枚数がそろっている", () => {
  const pick = ({ title, date, dateText, openTime, startTime, venue }) => ({ title, date, dateText, openTime, startTime, venue });
  assert.deepEqual(pick(site.EVENT), pick(api.EVENT));
  const ids = (list) => list.map(({ id, label }) => ({ id, label }));
  assert.deepEqual(ids(site.TICKET_CONFIG.seatTypes), ids(config.seatTypes));
  assert.deepEqual(ids(site.TICKET_CONFIG.ticketKinds), ids(config.ticketKinds));
  assert.deepEqual(site.TICKET_CONFIG.prices, config.prices);
  assert.equal(site.TICKET_CONFIG.maxTicketsPerReservation, config.maxTicketsPerReservation);
  assert.equal(site.TICKET_CONFIG.status, config.status);
  for (const seat of config.seatTypes) assert.ok(config.capacity[seat.id] > 0, `${seat.id} の定員がない`);
});

test("正しい予約は前後の空白を取って受け付ける", () => {
  const { errors, value } = validateReservation(valid, config);
  assert.deepEqual(errors, []);
  assert.equal(value.name, "山田 太郎");
  assert.equal(value.totalTickets, 3);
  assert.deepEqual(value.tickets, { adult: 2, student: 1 });
  assert.equal("website" in value, false);
});

test("足りない・おかしい入力は受け付けない", () => {
  const errorsOf = (patch) => validateReservation({ ...valid, ...patch }, config).errors;
  assert.ok(errorsOf({ seatType: "vip" }).length > 0);
  assert.ok(errorsOf({ tickets: { adult: 0, student: 0 } }).some((e) => e.includes("1枚以上")));
  assert.ok(errorsOf({ tickets: { adult: 6, student: 5 } }).some((e) => e.includes("10枚まで")));
  assert.ok(errorsOf({ tickets: { adult: 1.5 } }).length > 0);
  assert.ok(errorsOf({ tickets: { adult: -1, student: 3 } }).length > 0);
  assert.ok(errorsOf({ tickets: { adult: 1, child: 1 } }).some((e) => e.includes("券種")));
  assert.ok(errorsOf({ kana: "" }).some((e) => e.includes("フリガナ")));
  assert.ok(errorsOf({ email: "yamada@" }).length > 0);
  assert.ok(errorsOf({ tel: "090-1234" }).length > 0);
  assert.ok(errorsOf({ tel: "abc-defg-hijk" }).length > 0);
  assert.ok(errorsOf({ privacyConsent: "true" }).length > 0);
  assert.ok(errorsOf({ name: "あ".repeat(51) }).length > 0);
  assert.ok(errorsOf({ website: "https://spam.example" }).length > 0);
  assert.ok(validateReservation(null, config).errors.length > 0);
});

test("予約番号は BT- と読み間違えにくい6文字", () => {
  for (let i = 0; i < 200; i += 1) assert.match(createReservationNumber(), /^BT-[ACDEFGHJKMNPQRTUVWXY34679]{6}$/);
  assert.equal(createReservationNumber(() => 0), "BT-AAAAAA");
});

test("空き状況と、定員を超えないための上限", () => {
  assert.equal(availabilityStatus(undefined, 200, 30), "available");
  assert.equal(availabilityStatus(170, 200, 30), "few");
  assert.equal(availabilityStatus(200, 200, 30), "soldout");
  assert.equal(availabilityStatus(205, 200, 30), "soldout");
  // 定員200で3枚の予約：売れた枚数が197以下なら受け付けられる
  assert.equal(soldLimitFor(200, 3), 197);
});

test("受付は status が open で、公演当日まで", () => {
  const event = { date: { year: 2027, month: 4, day: 29 } };
  assert.equal(isSalesOpen({ status: "open" }, event, new Date("2027-04-29T14:59:59Z")), true);
  assert.equal(isSalesOpen({ status: "open" }, event, new Date("2027-04-29T15:00:00Z")), false);
  assert.equal(isSalesOpen({ status: "before" }, event, new Date("2027-01-01T00:00:00Z")), false);
});

test("確認メールに予約番号・席種・枚数・当日の案内が入る", () => {
  const reservation = { ...validateReservation(valid, config).value, reservationId: "BT-AC3D4E", createdAt: "2027-01-10T01:00:00Z" };
  const mail = customerEmail(reservation, config, api.EVENT);
  assert.match(mail.subject, /BT-AC3D4E/);
  assert.match(mail.body, /山田 太郎 様/);
  assert.match(mail.body, /【席種】指定席/);
  assert.match(mail.body, /一般 2枚/);
  assert.match(mail.body, /高校生以下 1枚/);
  assert.match(mail.body, /合計 3枚/);
  assert.match(mail.body, /受付/);

  const priced = { ...config, prices: { ...config.prices, reserved: { adult: 3000, student: 1000 } } };
  assert.match(customerEmail(reservation, priced, api.EVENT).body, /当日お支払い金額】7,000円/);

  const admin = adminEmail({ ...reservation, customerEmailSent: false }, config, api.EVENT);
  assert.match(admin.body, /090-1234-5678/);
  assert.match(admin.body, /送信できませんでした/);
});
