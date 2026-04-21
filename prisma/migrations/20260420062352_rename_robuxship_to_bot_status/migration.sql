-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meetupWorldName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gameId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gameId" UUID,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "priceIdr" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "description" TEXT,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER NOT NULL DEFAULT 1,
    "stockEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "productId" UUID,
    "robloxUsername" TEXT NOT NULL,
    "customerPriceIdr" INTEGER NOT NULL,
    "robuxAmount" INTEGER,
    "robloxGamepassId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "botStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "botErrorMessage" TEXT,
    "midtransOrderId" TEXT,
    "midtransFeeIdr" INTEGER,
    "orderType" TEXT NOT NULL DEFAULT 'ROBUX',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "adminStatus" TEXT,
    "previousAdminStatus" TEXT,
    "customerWhatsapp" TEXT,
    "adminNote" TEXT,
    "meetupScheduledAt" TIMESTAMP(3),
    "meetupWorld" TEXT,
    "meetupServerCode" TEXT,
    "cancelReason" TEXT,
    "cancelRequestedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundStatus" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMeetupSlot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "worldName" TEXT NOT NULL,
    "serverCode" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "windowMinutes" INTEGER NOT NULL DEFAULT 60,
    "confirmedAt" TIMESTAMP(3),
    "handledBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemMeetupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminOrderNote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySalesSummary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" TIMESTAMP(3) NOT NULL,
    "robuxRevenue" INTEGER NOT NULL DEFAULT 0,
    "itemRevenue" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "robuxOrders" INTEGER NOT NULL DEFAULT 0,
    "itemOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySalesSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID,
    "serviceName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadData" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Game_name_key" ON "Game"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "GameCategory_gameId_isActive_sortOrder_idx" ON "GameCategory"("gameId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "GameCategory_gameId_slug_key" ON "GameCategory"("gameId", "slug");

-- CreateIndex
CREATE INDEX "Product_gameId_categoryId_idx" ON "Product"("gameId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Order_midtransOrderId_key" ON "Order"("midtransOrderId");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_orderType_adminStatus_idx" ON "Order"("orderType", "adminStatus");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_orderType_idx" ON "Order"("paymentStatus", "orderType");

-- CreateIndex
CREATE INDEX "Order_adminStatus_idx" ON "Order"("adminStatus");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ItemMeetupSlot_orderId_key" ON "ItemMeetupSlot"("orderId");

-- CreateIndex
CREATE INDEX "ItemMeetupSlot_status_scheduledAt_idx" ON "ItemMeetupSlot"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AdminOrderNote_orderId_idx" ON "AdminOrderNote"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesSummary_date_key" ON "DailySalesSummary"("date");

-- CreateIndex
CREATE INDEX "DailySalesSummary_date_idx" ON "DailySalesSummary"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");

-- CreateIndex
CREATE INDEX "SystemLog_orderId_idx" ON "SystemLog"("orderId");

-- CreateIndex
CREATE INDEX "SystemLog_serviceName_eventType_idx" ON "SystemLog"("serviceName", "eventType");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "GameCategory" ADD CONSTRAINT "GameCategory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GameCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMeetupSlot" ADD CONSTRAINT "ItemMeetupSlot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOrderNote" ADD CONSTRAINT "AdminOrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOrderNote" ADD CONSTRAINT "AdminOrderNote_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
