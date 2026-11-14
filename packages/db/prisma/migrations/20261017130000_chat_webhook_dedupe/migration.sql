ALTER TABLE "chat_messages" ADD COLUMN "telegramUpdateId" TEXT;
CREATE UNIQUE INDEX "chat_messages_telegramUpdateId_key" ON "chat_messages"("telegramUpdateId");
