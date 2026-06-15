-- AlterTable: add categories, bgColor, showcaseImages to brands
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "bg_color" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "showcase_images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
