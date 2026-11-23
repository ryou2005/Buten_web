// 予約をキャンセルし、その枚数を空き席に戻す
//   使い方（backend/ticket で）: npm run cancel -- BT-XXXXXX
//   AWS の認証情報（aws configure など）が必要

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const RESERVATIONS_TABLE = process.env.RESERVATIONS_TABLE || "ButenTicketReservations";
const INVENTORY_TABLE = process.env.INVENTORY_TABLE || "ButenTicketInventory";
const reservationId = (process.argv[2] || "").trim().toUpperCase();

if (!/^BT-[A-Z0-9]{6}$/.test(reservationId)) {
  console.error("予約番号を指定してください。例: npm run cancel -- BT-AC3D4E");
  process.exit(1);
}

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "ap-northeast-1" }));

const { Item: reservation } = await db.send(new GetCommand({ TableName: RESERVATIONS_TABLE, Key: { reservationId } }));
if (!reservation) {
  console.error(`${reservationId} の予約は見つかりませんでした。`);
  process.exit(1);
}
if (reservation.status !== "confirmed") {
  console.error(`${reservationId} はすでにキャンセルされています。`);
  process.exit(1);
}

// 予約の状態を変えるのと、枚数を戻すのを同時に行う（二重に戻さないよう、状態が「予約中」のときだけ）
await db.send(new TransactWriteCommand({
  TransactItems: [
    {
      Update: {
        TableName: RESERVATIONS_TABLE,
        Key: { reservationId },
        UpdateExpression: "SET #status = :canceled, canceledAt = :now",
        ConditionExpression: "#status = :confirmed",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":canceled": "canceled", ":confirmed": "confirmed", ":now": new Date().toISOString() },
      },
    },
    {
      Update: {
        TableName: INVENTORY_TABLE,
        Key: { seatType: reservation.seatType },
        UpdateExpression: "SET sold = sold - :count",
        ConditionExpression: "sold >= :count",
        ExpressionAttributeValues: { ":count": reservation.totalTickets },
      },
    },
  ],
}));

console.log(`${reservationId}（${reservation.name}様・${reservation.totalTickets}枚）をキャンセルしました。`);
