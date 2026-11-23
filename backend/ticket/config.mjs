// ============================================================
// 武天20周年記念公演：予約 API の設定
// ※ 席種・券種・料金・1回の上限枚数は、サイト側の ticket-config.js と同じにする
//   （ルートで npm test を実行すると一致しているかを確かめる）
// 書き換えたら backend/ticket で sam build && sam deploy をやり直す
// ============================================================

export const EVENT = {
  title: "武天20周年記念公演",
  date: { year: 2027, month: 4, day: 29 },
  dateText: "2027年4月29日（木・祝）",
  openTime: "",
  startTime: "",
  venue: "秋川キララホール",
};

export const TICKET_CONFIG = {
  // "before" / "open" / "closed"。"open" のときだけ予約を受け付ける（公演日を過ぎたら自動で締め切る）
  status: "open",

  maxTicketsPerReservation: 10,

  seatTypes: [
    { id: "reserved", label: "指定席" },
    { id: "free", label: "自由席" },
  ],

  ticketKinds: [
    { id: "adult", label: "一般" },
    { id: "student", label: "高校生以下" },
  ],

  prices: {
    reserved: { adult: null, student: null },
    free: { adult: null, student: null },
  },

  // ネット予約で受け付ける席数（関係者席・招待席などを除いた数にする）
  // 予約の途中で変えても大丈夫（すでに予約された枚数はそのまま数える）
  capacity: {
    reserved: 200,
    free: 500,
  },

  // 残りがこの枚数以下になったら「残りわずか」と表示する
  fewThreshold: 30,
};
