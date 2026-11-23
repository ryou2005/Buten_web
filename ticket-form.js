// 20周年記念公演 チケット予約フォーム（ticket.html）
// 入力 → 確認 → 完了 の3画面。席種・券種・料金は ticket-config.js から組み立てる

import { EVENT, TICKET_CONFIG } from "./ticket-config.js";
import { calcTotal, countTickets, formatYen, salesState, selectionError } from "./ticket-utils.js";

const STATUS_LABELS = { few: "残りわずか", soldout: "満席" };

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function seatPriceText(seatId) {
  const prices = TICKET_CONFIG.prices[seatId] || {};
  if (TICKET_CONFIG.ticketKinds.some((kind) => !Number.isInteger(prices[kind.id]))) return "料金 調整中";
  return TICKET_CONFIG.ticketKinds.map((kind) => `${kind.label} ${formatYen(prices[kind.id])}`).join(" ／ ");
}

function telDigitsOk(tel) {
  const digits = tel.replace(/\D/g, "").length;
  return /^[0-9+\-()\s]+$/.test(tel) && digits >= 10 && digits <= 13;
}

export function initTicketForm(form) {
  const main = form.closest(".ticket-main");
  const notice = main.querySelector("[data-ticket-notice]");
  const views = {
    input: form,
    confirm: main.querySelector('[data-step="confirm"]'),
    done: main.querySelector('[data-step="done"]'),
  };
  const seatBox = form.querySelector("[data-seat-options]");
  const kindBox = form.querySelector("[data-kind-options]");
  const totalBox = form.querySelector("[data-order-total]");
  const formError = form.querySelector("[data-form-error]");
  const confirmError = views.confirm.querySelector("[data-confirm-error]");
  const reserveBtn = views.confirm.querySelector("[data-reserve]");
  const endpoint = TICKET_CONFIG.apiEndpoint.replace(/\/+$/, "");
  const testMode = !endpoint;

  const showNotice = (title, body, className = "") => {
    notice.replaceChildren(el("strong", "", title), body);
    notice.className = `ticket-notice ${className}`.trim();
    notice.hidden = false;
  };

  const state = salesState(TICKET_CONFIG, EVENT.date);
  if (state === "before") {
    const opens = TICKET_CONFIG.opensText ? `${TICKET_CONFIG.opensText}から受付を開始します。` : "受付開始日は決まり次第お知らせします。";
    showNotice("チケットのご予約は準備中です", `${opens}もうしばらくお待ちください。`);
    return;
  }
  if (state === "closed") {
    showNotice("チケットのご予約受付は終了しました", "たくさんのご予約ありがとうございました。");
    return;
  }
  if (testMode) {
    showNotice("テストモード", "予約 API が設定されていないため、送信しても予約はされません（画面の流れだけ確認できます）。", "is-test");
  }

  // ---------- 席種 ----------
  const seatInputs = TICKET_CONFIG.seatTypes.map((seat, index) => {
    const label = el("label", "seat-option");
    const input = el("input");
    input.type = "radio";
    input.name = "seatType";
    input.value = seat.id;
    input.required = index === 0;
    const status = el("span", "seat-option-status");
    status.hidden = true;
    label.append(input, el("span", "seat-option-name", seat.label), el("span", "seat-option-price", seatPriceText(seat.id)), status);
    seatBox.append(label);
    return { seat, input, status };
  });
  const seatNote = el("p", "seat-note");
  seatBox.after(seatNote);

  const selectedSeat = () => seatInputs.find(({ input }) => input.checked)?.seat.id || "";

  const requestedSeat = new URLSearchParams(location.search).get("seat");
  const initial = seatInputs.find(({ seat }) => seat.id === requestedSeat);
  if (initial) initial.input.checked = true;

  // ---------- 枚数（− 枚数 ＋） ----------
  const tickets = Object.fromEntries(TICKET_CONFIG.ticketKinds.map((kind) => [kind.id, 0]));
  const steppers = TICKET_CONFIG.ticketKinds.map((kind) => {
    const row = el("div", "kind-row");
    const labelBox = el("div");
    const name = el("span", "kind-row-label", kind.label);
    name.id = `kind-${kind.id}`;
    const price = el("span", "kind-row-price");
    labelBox.append(name, price);

    const stepper = el("div", "stepper");
    const minus = el("button", "", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", `${kind.label}を1枚減らす`);
    const count = el("output", "", "0");
    count.setAttribute("aria-labelledby", name.id);
    const plus = el("button", "", "＋");
    plus.type = "button";
    plus.setAttribute("aria-label", `${kind.label}を1枚増やす`);
    minus.addEventListener("click", () => changeCount(kind.id, -1));
    plus.addEventListener("click", () => changeCount(kind.id, 1));
    stepper.append(minus, count, plus);

    row.append(labelBox, stepper);
    kindBox.append(row);
    return { kind, price, minus, plus, count };
  });

  const update = () => {
    const seatId = selectedSeat();
    const total = countTickets(tickets);
    const max = TICKET_CONFIG.maxTicketsPerReservation;
    steppers.forEach(({ kind, price, minus, plus, count }) => {
      count.textContent = String(tickets[kind.id]);
      minus.disabled = tickets[kind.id] === 0;
      plus.disabled = total >= max;
      const yen = seatId ? TICKET_CONFIG.prices[seatId]?.[kind.id] : undefined;
      price.textContent = seatId ? `1枚 ${formatYen(yen)}` : "";
    });
    seatNote.textContent = TICKET_CONFIG.seatTypes.find((seat) => seat.id === seatId)?.note || "";

    totalBox.replaceChildren();
    if (total > 0) {
      const amount = seatId ? calcTotal(seatId, tickets, TICKET_CONFIG.prices) : null;
      const countText = el("span");
      countText.append("合計 ", el("b", "", String(total)), " 枚");
      const amountText = el("span");
      amountText.append("当日お支払い ", amount === null ? "料金が決まり次第お知らせします" : el("b", "", formatYen(amount)));
      totalBox.append(countText, amountText);
    }
    if (total >= max) totalBox.append(el("span", "field-hint", `1回のご予約は${max}枚までです`));
  };

  function changeCount(kindId, diff) {
    const next = tickets[kindId] + diff;
    if (next < 0 || (diff > 0 && countTickets(tickets) >= TICKET_CONFIG.maxTicketsPerReservation)) return;
    tickets[kindId] = next;
    formError.hidden = true;
    update();
  }

  seatBox.addEventListener("change", () => {
    formError.hidden = true;
    update();
  });
  update();

  // ---------- 空き状況 ----------
  const applyAvailability = (availability = {}) => {
    seatInputs.forEach(({ seat, input, status }) => {
      const value = availability[seat.id];
      status.hidden = !STATUS_LABELS[value];
      status.textContent = STATUS_LABELS[value] || "";
      status.className = `seat-option-status ${value || ""}`;
      input.disabled = value === "soldout";
      if (input.disabled) input.checked = false;
    });
    update();
  };

  if (!testMode) {
    fetch(`${endpoint}/availability`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`${response.status}`))))
      .then((result) => applyAvailability(result.availability))
      .catch((error) => console.error("Availability could not be loaded:", error));
  }

  // ---------- 入力 → 確認 ----------
  const fields = {
    name: form.querySelector("#name"),
    kana: form.querySelector("#kana"),
    email: form.querySelector("#email"),
    emailConfirm: form.querySelector("#email-confirm"),
    tel: form.querySelector("#tel"),
    message: form.querySelector("#message"),
    website: form.querySelector("#website"),
    privacy: form.querySelector("#privacy-consent"),
  };

  const setValidity = (input, message) => {
    input.setCustomValidity(message);
    input.setAttribute("aria-invalid", message ? "true" : "false");
  };
  fields.emailConfirm.addEventListener("input", () => setValidity(fields.emailConfirm, ""));
  fields.tel.addEventListener("input", () => setValidity(fields.tel, ""));

  const showStep = (step) => {
    Object.entries(views).forEach(([name, view]) => {
      view.hidden = name !== step;
    });
    document.querySelectorAll("[data-step-label]").forEach((item) => {
      if (item.dataset.stepLabel === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    document.querySelector(".ticket-head")?.scrollIntoView({ behavior: "smooth", block: "start" });
    views[step].querySelector(".ticket-step-h")?.focus({ preventScroll: true });
  };

  let order = null;

  const summaryRows = (data) => {
    const seat = TICKET_CONFIG.seatTypes.find((s) => s.id === data.seatType);
    const ticketText = TICKET_CONFIG.ticketKinds
      .filter((kind) => data.tickets[kind.id] > 0)
      .map((kind) => `${kind.label} ${data.tickets[kind.id]}枚`)
      .join("\n");
    const amount = calcTotal(data.seatType, data.tickets, TICKET_CONFIG.prices);
    return [
      ["公演", `${EVENT.title}\n${EVENT.dateText}　${EVENT.venue}`],
      ["席種", seat?.label || data.seatType],
      ["枚数", `${ticketText}\n（合計 ${countTickets(data.tickets)}枚）`],
      ["当日お支払い", amount === null ? "料金が決まり次第お知らせします" : formatYen(amount), "total"],
      ["お名前", `${data.name}（${data.kana}）`],
      ["メールアドレス", data.email],
      ["電話番号", data.tel],
      ["ご連絡事項", data.message || "なし"],
    ];
  };

  const renderList = (list, rows) => {
    list.replaceChildren(...rows.map(([term, value, className]) => {
      const row = el("div", className);
      row.append(el("dt", "", term), el("dd", "", value));
      return row;
    }));
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formError.hidden = true;

    const problem = selectionError(selectedSeat(), tickets, TICKET_CONFIG);
    if (problem) {
      formError.textContent = problem;
      formError.hidden = false;
      seatBox.closest("fieldset").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setValidity(fields.emailConfirm, fields.email.value.trim() === fields.emailConfirm.value.trim() ? "" : "確認用のメールアドレスが一致しません");
    setValidity(fields.tel, !fields.tel.value.trim() || telDigitsOk(fields.tel.value.trim()) ? "" : "電話番号は数字とハイフンで、市外局番から入力してください");
    if (!form.reportValidity()) return;

    order = {
      seatType: selectedSeat(),
      tickets: { ...tickets },
      name: fields.name.value.trim(),
      kana: fields.kana.value.trim(),
      email: fields.email.value.trim(),
      tel: fields.tel.value.trim(),
      message: fields.message.value.trim(),
      privacyConsent: fields.privacy.checked,
      website: fields.website.value,
    };
    renderList(views.confirm.querySelector("[data-confirm-list]"), summaryRows(order));
    confirmError.hidden = true;
    showStep("confirm");
  });

  views.confirm.querySelector("[data-back]").addEventListener("click", () => showStep("input"));

  // ---------- 確認 → 予約 ----------
  const send = async (data) => {
    if (testMode) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { ok: true, result: { success: true, reservationId: "BT-TEST00", emailSent: false, test: true } };
    }
    const response = await fetch(`${endpoint}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { ok: response.ok, status: response.status, result: await response.json().catch(() => ({})) };
  };

  reserveBtn.addEventListener("click", async () => {
    if (!order) return;
    const originalText = reserveBtn.textContent;
    reserveBtn.disabled = true;
    reserveBtn.textContent = "予約しています…";
    confirmError.hidden = true;

    try {
      const { ok, status, result } = await send(order);
      if (ok && result.success) {
        views.done.querySelector("[data-reservation-id]").textContent = result.reservationId;
        views.done.querySelector("[data-done-mail]").textContent = result.test
          ? "（テストモードのため、メールは送られていません）"
          : result.emailSent
            ? `${order.email} に確認メールをお送りしました。`
            : "確認メールをお送りできませんでした。予約は完了していますので、この予約番号を控えておいてください。";
        renderList(views.done.querySelector("[data-done-list]"), summaryRows(order));
        form.reset();
        Object.keys(tickets).forEach((id) => {
          tickets[id] = 0;
        });
        update();
        order = null;
        showStep("done");
        return;
      }

      if (status === 409 && result.availability) applyAvailability(result.availability);
      const details = Array.isArray(result.details) ? `\n${result.details.join("\n")}` : "";
      confirmError.textContent = `${result.error || "予約できませんでした。もう一度お試しください。"}${details}`;
      confirmError.hidden = false;
    } catch (error) {
      console.error("Reservation failed:", error);
      confirmError.textContent =
        "通信エラーが発生しました。インターネットの接続を確かめて、もう一度お試しください。\n何度も失敗する場合は、お手数ですがお問い合わせフォームからご連絡ください。";
      confirmError.hidden = false;
    } finally {
      reserveBtn.disabled = false;
      reserveBtn.textContent = originalText;
    }
  });

  form.hidden = false;
}
