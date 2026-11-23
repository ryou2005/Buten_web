// ============================================================
// 20周年記念公演 Web申込：座席割り当てツールで使う部品
//   ・申込フォームから届いた内容のチェック
//   ・お客さんへのメール（受付・席の決定）と、りょうへの通知メールの文面
// AWS や Supabase に依存しないので、ツールのサーバー側の処理からそのまま読み込んで使う
// config・event にはサイトの ticket-config.js の TICKET_CONFIG・EVENT を渡す
// ============================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 数字・ハイフン・空白・括弧・+ だけで、数字が10〜13桁
const TEL_PATTERN = /^[0-9+\-()\s]+$/;
const LIMITS = { name: 50, kana: 50, email: 254, tel: 20, message: 500 };
const SITE = "https://wadaiko-buten.net";

const text = (value) => (typeof value === "string" ? value.trim() : "");

const tokyoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 申し込みを受け付けられる状態か（status が open で、公演当日まで。日本時間で判定する）
export function isSalesOpen(config, event, now = new Date()) {
  const parts = Object.fromEntries(tokyoDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]));
  const today = Number(`${parts.year}${parts.month}${parts.day}`);
  const { year, month, day } = event.date;
  return config.status === "open" && today <= year * 10000 + month * 100 + day;
}

// 申込フォームから届いた内容を確かめ、保存してよい形にそろえる
// 受付番号は保存するときにツールのデータベースで通し番号（1, 2, 3…）を付ける
export function validateApplication(input, config) {
  const errors = [];
  const data = input && typeof input === "object" ? input : {};

  // ボット対策：人には見えない欄に入力があれば受け付けない
  if (text(data.website)) return { errors: ["送信できませんでした。"] };

  const seatType = text(data.seatType);
  if (!config.seatTypes.some((seat) => seat.id === seatType)) errors.push("席種を選んでください");

  const sentTickets = data.tickets && typeof data.tickets === "object" ? data.tickets : {};
  const tickets = {};
  let people = 0;
  for (const kind of config.ticketKinds) {
    const count = sentTickets[kind.id] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > config.maxPeoplePerApplication) {
      errors.push(`${kind.label}の人数が正しくありません`);
      continue;
    }
    tickets[kind.id] = count;
    people += count;
  }
  if (Object.keys(sentTickets).some((id) => !config.ticketKinds.some((kind) => kind.id === id))) errors.push("券種が正しくありません");
  if (people === 0) errors.push("人数を1人以上選んでください");
  if (people > config.maxPeoplePerApplication) errors.push(`1回のお申し込みは${config.maxPeoplePerApplication}人までです`);

  const sentCare = Array.isArray(data.care) ? data.care : [];
  const care = config.careOptions.map((option) => option.id).filter((id) => sentCare.includes(id));
  if (sentCare.length !== care.length) errors.push("配慮の項目が正しくありません");

  const name = text(data.name);
  const kana = text(data.kana);
  const email = text(data.email);
  const tel = text(data.tel);
  const message = text(data.message);

  if (!name) errors.push("お名前は必須です");
  if (!kana) errors.push("フリガナは必須です");
  if (!email) errors.push("メールアドレスは必須です");
  else if (!EMAIL_PATTERN.test(email)) errors.push("メールアドレスの形式が正しくありません");
  if (!tel) errors.push("電話番号は必須です");
  else {
    const digits = tel.replace(/\D/g, "").length;
    if (!TEL_PATTERN.test(tel) || digits < 10 || digits > 13) errors.push("電話番号の形式が正しくありません");
  }
  for (const [key, value] of Object.entries({ name, kana, email, tel, message })) {
    if (value.length > LIMITS[key]) errors.push("入力が長すぎる項目があります");
  }
  if (data.privacyConsent !== true) errors.push("個人情報の取り扱いへの同意が必要です");

  if (errors.length > 0) return { errors: [...new Set(errors)] };
  return { errors: [], value: { seatType, tickets, people, care, name, kana, email, tel, message } };
}

// 合計金額（料金が決まっていない券種が含まれていれば null）
export function calcTotal(seatType, tickets, prices) {
  let total = 0;
  for (const [kind, count] of Object.entries(tickets)) {
    if (!count) continue;
    const price = prices[seatType]?.[kind];
    if (!Number.isInteger(price)) return null;
    total += price * count;
  }
  return total;
}

// 割り当てた席の書き方。ツールの書き方（「G列15番」）に合わせる
//   指定席 { row: "C", from: 5, to: 7 } → "C列5〜7番"　1席なら "C列5番"
export function seatText(seats) {
  if (!seats) return "";
  return seats.from === seats.to ? `${seats.row}列${seats.from}番` : `${seats.row}列${seats.from}〜${seats.to}番`;
}

const yen = (value) => `${value.toLocaleString("ja-JP")}円`;
const seatLabel = (config, id) => config.seatTypes.find((seat) => seat.id === id)?.label || id;

function peopleLines(application, config) {
  return config.ticketKinds
    .filter((kind) => application.tickets[kind.id] > 0)
    .map((kind) => `  ${kind.label} ${application.tickets[kind.id]}人`)
    .join("\n");
}

function timeText(event) {
  const open = event.openTime ? `開場 ${event.openTime}` : "開場 未定";
  const start = event.startTime ? `開演 ${event.startTime}` : "開演 未定";
  return `${open} ／ ${start}`;
}

function amountText(application, config) {
  const total = calcTotal(application.seatType, application.tickets, config.prices);
  return total === null ? "料金が決まりしだいお知らせします" : yen(total);
}

function summary(application, config, event) {
  return [
    `【受付番号】${application.receiptNo}`,
    "",
    `【公演】${event.title}`,
    `【日時】${event.dateText}　${timeText(event)}`,
    `【会場】${event.venue}`,
    "",
    `【席種】${seatLabel(config, application.seatType)}`,
    "【人数】",
    peopleLines(application, config),
    `  合計 ${application.people}人`,
    `【当日お支払い金額】${amountText(application, config)}`,
  ].join("\n");
}

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const FOOTER = `■ 変更・キャンセルについて
お手数ですが、受付番号を添えてお問い合わせフォームよりご連絡ください。
${SITE}/contact.html?subject=ticket

※ このメールは送信専用のアドレスからお送りしています。

和太鼓 武天 -BUTEN-
${SITE}/`;

// 申し込んだ直後にお客さんへ送る「受付メール」
export function receivedEmail(application, config, event) {
  const next = application.seatType === "reserved"
    ? "運営で座席を割り当て、決まりしだい座席番号をメールでお知らせします。"
    : "運営で確認のうえ、ご予約確定のメールをお送りします。";
  return {
    subject: `【和太鼓 武天】${event.title} お申し込みを受け付けました（受付番号 ${application.receiptNo}）`,
    body: `${application.name} 様

「${event.title}」にお申し込みいただき、ありがとうございます。
以下の内容でお申し込みを受け付けました。

${LINE}
${summary(application, config, event)}
${LINE}

■ このあとの流れ
${next}
まだご予約は確定していません。数日たってもメールが届かない場合は、お問い合わせください。

${FOOTER}
`,
  };
}

// りょうがツールで割り当てたときにお客さんへ送る「席の決定メール」
//   seats は指定席のとき { row, from, to }、自由席のときは null
export function assignedEmail(application, seats, config, event) {
  const seatLine = application.seatType === "reserved"
    ? `【座席】指定席 ${seatText(seats)}（${application.people}席）`
    : `【座席】自由席 ${application.people}枚（当日、開場後にお好きな席にお座りください）`;
  return {
    subject: `【和太鼓 武天】${event.title} ご予約が確定しました（受付番号 ${application.receiptNo}）`,
    body: `${application.name} 様

「${event.title}」のご予約が確定しました。

${LINE}
${summary(application, config, event)}
${seatLine}
${LINE}

■ 当日について
・会場の受付で「受付番号」と「お名前」をお伝えください。
・お支払いは当日、受付でお願いいたします。お支払いと引き換えにチケットをお渡しします。
・このメールは当日まで保存しておいてください。

${FOOTER}
`,
  };
}

// 申し込みが入ったときにりょうへ送る通知メール
export function adminEmail(application, config, event) {
  const care = config.careOptions.filter((option) => application.care.includes(option.id)).map((option) => `・${option.label}`);
  return {
    subject: `【武天】Web申込 ${application.receiptNo}番 ${application.name}様 ${seatLabel(config, application.seatType)}${application.people}人`,
    body: `20周年記念公演のWeb申込が入りました。座席割り当てツールの「Web申込」から割り当ててください。

${LINE}
${summary(application, config, event)}

【お名前】${application.name}（${application.kana}）
【メールアドレス】${application.email}
【電話番号】${application.tel}
【配慮が必要なこと】
${care.length > 0 ? care.join("\n") : "なし"}
【ご連絡事項】
${application.message || "なし"}
${LINE}
`,
  };
}
