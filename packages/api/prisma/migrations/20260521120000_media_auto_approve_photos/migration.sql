-- Auto-approve existing portfolio/avatar/company media that should not require moderation
UPDATE "media_assets"
SET
  "is_approved" = true,
  "is_rejected" = false,
  "moderated_at" = COALESCE("moderated_at", NOW())
WHERE
  "type" IN ('AVATAR', 'PORTFOLIO_PHOTO', 'COMPANY_LOGO', 'COMPANY_BANNER', 'COMPANY_GALLERY')
  AND "is_rejected" = false
  AND "is_approved" = false;
