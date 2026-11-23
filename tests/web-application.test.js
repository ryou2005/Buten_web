import assert from "node:assert/strict";
import test from "node:test";
import { EVENT, TICKET_CONFIG } from "../ticket-config.js";
import {
  adminEmail,
  assignedEmail,
  isSalesOpen,
  receivedEmail,
  seatText,
  validateApplication,
} from "../backend/web-application/application.mjs";

const valid = {
  seatType: "reserved",
  tickets: { adult: 2, student: 1 },
  care: ["mobility"],
  name: " 山田 太郎 ",
  kana: "ヤマダ タロウ",
  email: "yamada@example.com",
  tel: "090-1234-5678",
  message: "",
  privacyConsent: true,
  website: "",
};

test("正しい申し込みは前後の空白を取って受け付け、人数を数える", () => {
  const { errors, value } = validateApplication(valid, TICKET_CONFIG);
  assert.deepEqual(errors, []);
  assert.equal(value.name, "山田 太郎");
  assert.equal(value.people, 3);
  assert.deepEqual(value.tickets, { adult: 2, student: 1 });
  assert.deepEqual(value.care, ["mobility"]);
  assert.equal("website" in value, false);
});

test("足りない・おかしい申し込みは受け付けない", () => {
  const errorsOf = (patch) => validateApplication({ ...valid, ...patch }, TICKET_CONFIG).errors;
  assert.ok(errorsOf({ seatType: "vip" }).length > 0);
  assert.ok(errorsOf({ tickets: { adult: 0, student: 0 } }).some((e) => e.includes("1人以上")));
  assert.ok(errorsOf({ tickets: { adult: 5, student: 4 } }).some((e) => e.includes("8人まで")));
  assert.deepEqual(errorsOf({ tickets: { adult: 5, student: 3 } }), []);
  assert.ok(errorsOf({ tickets: { adult: 1.5 } }).length > 0);
  assert.ok(errorsOf({ tickets: { adult: 1, child: 1 } }).some((e) => e.includes("券種")));
  assert.ok(errorsOf({ care: ["vip"] }).some((e) => e.includes("配慮")));
  assert.ok(errorsOf({ kana: "" }).some((e) => e.includes("フリガナ")));
  assert.ok(errorsOf({ email: "yamada@" }).length > 0);
  assert.ok(errorsOf({ tel: "090-1234" }).length > 0);
  assert.ok(errorsOf({ privacyConsent: "true" }).length > 0);
  assert.ok(errorsOf({ name: "あ".repeat(51) }).length > 0);
  assert.ok(errorsOf({ website: "https://spam.example" }).length > 0);
  assert.ok(validateApplication(null, TICKET_CONFIG).errors.length > 0);
});

test("受付は status が open で、公演当日まで（日本時間）", () => {
  assert.equal(isSalesOpen({ status: "open" }, EVENT, new Date("2027-04-29T14:59:59Z")), true);
  assert.equal(isSalesOpen({ status: "open" }, EVENT, new Date("2027-04-29T15:00:00Z")), false);
  assert.equal(isSalesOpen({ status: "before" }, EVENT, new Date("2027-01-01T00:00:00Z")), false);
});

test("席番号はツールと同じ「C列5〜7番」の書き方", () => {
  assert.equal(seatText({ row: "C", from: 5, to: 7 }), "C列5〜7番");
  assert.equal(seatText({ row: "G", from: 15, to: 15 }), "G列15番");
});

const application = { ...validateApplication(valid, TICKET_CONFIG).value, receiptNo: 12 };

test("受付メール：受付番号が入り、まだ確定ではないことを伝える", () => {
  const mail = receivedEmail(application, TICKET_CONFIG, EVENT);
  assert.match(mail.subject, /受付番号 12/);
  assert.match(mail.body, /山田 太郎 様/);
  assert.match(mail.body, /【受付番号】12/);
  assert.match(mail.body, /一般 2人/);
  assert.match(mail.body, /高校生以下 1人/);
  assert.match(mail.body, /まだご予約は確定していません/);
  assert.match(mail.body, /座席番号をメールでお知らせします/);
});

test("席の決定メール：指定席は座席番号、自由席は枚数。金額は料金が決まれば出る", () => {
  const reserved = assignedEmail(application, { row: "C", from: 5, to: 7 }, TICKET_CONFIG, EVENT);
  assert.match(reserved.subject, /ご予約が確定しました/);
  assert.match(reserved.body, /指定席 C列5〜7番（3席）/);
  assert.match(reserved.body, /受付番号」と「お名前」/);
  assert.match(reserved.body, /料金が決まりしだいお知らせします/);

  const free = assignedEmail({ ...application, seatType: "free" }, null, TICKET_CONFIG, EVENT);
  assert.match(free.body, /自由席 3枚/);

  const priced = { ...TICKET_CONFIG, prices: { ...TICKET_CONFIG.prices, reserved: { adult: 3000, student: 1000 } } };
  assert.match(assignedEmail(application, { row: "C", from: 5, to: 7 }, priced, EVENT).body, /当日お支払い金額】7,000円/);
});

test("りょうへの通知：連絡先と配慮が入り、ツールで割り当てるよう促す", () => {
  const mail = adminEmail(application, TICKET_CONFIG, EVENT);
  assert.match(mail.subject, /Web申込 12番 山田 太郎様 指定席3人/);
  assert.match(mail.body, /090-1234-5678/);
  assert.match(mail.body, /足が不自由な方がいる/);
  assert.match(mail.body, /ツールの「Web申込」から割り当てて/);
});
