// ============================================================
// 武天20周年記念公演：公演情報とチケット予約の設定
// 料金・席種・受付状況が決まったら、ここを書き換える
//
// ※ 席種・券種・料金・1回の上限枚数は backend/ticket/config.mjs にも同じ内容を書く
//   （npm test で両方が一致しているかを確かめる）
// ============================================================

export const EVENT = {
  title: "武天20周年記念公演",
  date: { year: 2027, month: 4, day: 29 },
  dateText: "2027年4月29日（木・祝）",
  openTime: "", // 開場時間 例 "13:00"（空のあいだは「未定」と表示）
  startTime: "", // 開演時間 例 "13:30"
  venue: "秋川キララホール",
};

export const TICKET_CONFIG = {
  // 予約 API の URL（backend/ticket をデプロイすると出力される ApiEndpoint）
  // 空のあいだはテストモード：送信しても予約されず、画面上で流れだけ確認できる
  apiEndpoint: "",

  // 受付状況 "before"（受付開始前）/ "open"（受付中）/ "closed"（受付終了）
  // 公演日を過ぎると、ここに関係なく「受付終了」になる
  status: "open",
  opensText: "", // 受付開始前に表示する開始日 例 "2027年1月10日（日）10:00"

  maxTicketsPerReservation: 10,

  seatTypes: [
    { id: "reserved", label: "指定席", note: "予約の時点で席を確保します。座席番号は当日受付でお伝えします。" },
    { id: "free", label: "自由席", note: "当日、開場後にお好きな席にお座りください。" },
  ],

  ticketKinds: [
    { id: "adult", label: "一般" },
    { id: "student", label: "高校生以下" },
  ],

  // 料金（円）。null のあいだは「調整中」と表示する
  prices: {
    reserved: { adult: null, student: null },
    free: { adult: null, student: null },
  },
};
