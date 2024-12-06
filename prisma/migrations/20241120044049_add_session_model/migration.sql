-- CreateTable
CREATE TABLE "user_messages" (
    "message_id" SERIAL NOT NULL,
    "username" VARCHAR(50),
    "message_title" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255),
    "password" VARCHAR(255),
    "user_type" VARCHAR(20) DEFAULT 'user',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "unique_username" ON "users"("username");

-- AddForeignKey
ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_username_fkey" FOREIGN KEY ("username") REFERENCES "users"("username") ON DELETE CASCADE ON UPDATE NO ACTION;


