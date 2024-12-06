-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "message_title" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" VARCHAR(50),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
