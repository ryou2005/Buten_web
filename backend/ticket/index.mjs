// 武天20周年記念公演 チケット予約 API（AWS Lambda + API Gateway + DynamoDB + SES）
//   GET  /availability  席種ごとの空き状況
//   POST /reservations  予約する（定員を超える予約は受け付けない）

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, DynamoDBDocumentClient, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { EVENT, TICKET_CONFIG } from "./config.mjs";
import {
  adminEmail,
  availabilityStatus,
  createReservationNumber,
  customerEmail,
  isSalesOpen,
  soldLimitFor,
  validateReservation,
} from "./reservation.mjs";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

const RESERVATIONS_TABLE = process.env.RESERVATIONS_TABLE;
const INVENTORY_TABLE = process.env.INVENTORY_TABLE;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

function respond(statusCode, body, origin) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function getAvailability() {
  const result = await db.send(new BatchGetCommand({
    RequestItems: {
      [INVENTORY_TABLE]: { Keys: TICKET_CONFIG.seatTypes.map((seat) => ({ seatType: seat.id })) },
    },
  }));
  const sold = Object.fromEntries((result.Responses?.[INVENTORY_TABLE] || []).map((item) => [item.seatType, item.sold || 0]));
  return Object.fromEntries(TICKET_CONFIG.seatTypes.map((seat) => [
    seat.id,
    availabilityStatus(sold[seat.id], TICKET_CONFIG.capacity[seat.id], TICKET_CONFIG.fewThreshold),
  ]));
}

class SoldOutError extends Error {}

// 席の確保と予約の保存を同時に行う（どちらかが失敗したら両方なかったことになる）
async function saveReservation(value) {
  const capacity = TICKET_CONFIG.capacity[value.seatType];
  const limit = soldLimitFor(capacity, value.totalTickets);
  if (limit < 0) throw new SoldOutError();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reservation = {
      ...value,
      reservationId: createReservationNumber(),
      status: "confirmed",
      createdAt: new Date().toISOString(),
      privacyConsent: true,
    };
    try {
      await db.send(new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: INVENTORY_TABLE,
              Key: { seatType: value.seatType },
              UpdateExpression: "SET sold = if_not_exists(sold, :zero) + :count",
              ConditionExpression: "attribute_not_exists(sold) OR sold <= :limit",
              ExpressionAttributeValues: { ":zero": 0, ":count": value.totalTickets, ":limit": limit },
            },
          },
          {
            Put: {
              TableName: RESERVATIONS_TABLE,
              Item: reservation,
              ConditionExpression: "attribute_not_exists(reservationId)",
            },
          },
        ],
      }));
      return reservation;
    } catch (error) {
      if (error.name !== "TransactionCanceledException") throw error;
      const [seatReason, idReason] = error.CancellationReasons || [];
      if (seatReason?.Code === "ConditionalCheckFailed") throw new SoldOutError();
      // 予約番号がたまたま重なったときは番号を変えてやり直す
      if (idReason?.Code !== "ConditionalCheckFailed") throw error;
    }
  }
  throw new Error("Could not create a unique reservation number");
}

async function sendEmail(to, { subject, body }, replyTo) {
  await ses.send(new SendEmailCommand({
    Source: SENDER_EMAIL,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: { Text: { Data: body, Charset: "UTF-8" } },
    },
  }));
}

async function createReservation(rawBody) {
  if (!isSalesOpen(TICKET_CONFIG, EVENT)) {
    return [403, { error: "現在、ご予約は受け付けておりません。" }];
  }

  let input;
  try {
    input = JSON.parse(rawBody || "{}");
  } catch {
    return [400, { error: "送信内容を読み取れませんでした。" }];
  }

  const { errors, value } = validateReservation(input, TICKET_CONFIG);
  if (errors.length > 0) return [400, { error: "入力内容をご確認ください。", details: errors }];

  let reservation;
  try {
    reservation = await saveReservation(value);
  } catch (error) {
    if (error instanceof SoldOutError) {
      return [409, { error: "申し訳ありません。選んだ席種はご希望の枚数をご用意できなくなりました。", availability: await getAvailability() }];
    }
    throw error;
  }
  console.log("Reservation saved:", reservation.reservationId, reservation.seatType, reservation.totalTickets);

  // メールが送れなくても予約は成立している（画面に予約番号を出す）
  let customerEmailSent = true;
  try {
    await sendEmail(reservation.email, customerEmail(reservation, TICKET_CONFIG, EVENT), NOTIFICATION_EMAIL);
  } catch (error) {
    customerEmailSent = false;
    console.error("Failed to send customer email:", error);
  }
  try {
    await sendEmail(NOTIFICATION_EMAIL, adminEmail({ ...reservation, customerEmailSent }, TICKET_CONFIG, EVENT), reservation.email);
  } catch (error) {
    console.error("Failed to send admin email:", error);
  }
  if (!customerEmailSent) {
    await db.send(new UpdateCommand({
      TableName: RESERVATIONS_TABLE,
      Key: { reservationId: reservation.reservationId },
      UpdateExpression: "SET customerEmailSent = :sent",
      ExpressionAttributeValues: { ":sent": false },
    })).catch((error) => console.error("Failed to record email status:", error));
  }

  return [200, {
    success: true,
    reservationId: reservation.reservationId,
    emailSent: customerEmailSent,
  }];
}

export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (event.httpMethod === "OPTIONS") return respond(204, {}, origin);

  try {
    if (event.httpMethod === "GET" && event.resource === "/availability") {
      return respond(200, { open: isSalesOpen(TICKET_CONFIG, EVENT), availability: await getAvailability() }, origin);
    }
    if (event.httpMethod === "POST" && event.resource === "/reservations") {
      const [status, body] = await createReservation(event.body);
      return respond(status, body, origin);
    }
    return respond(404, { error: "Not found" }, origin);
  } catch (error) {
    console.error("Unexpected error:", error);
    return respond(500, { error: "エラーが発生しました。時間をおいてもう一度お試しください。" }, origin);
  }
};
