# Masjid At-Towfiq marriage certificates

## What administrators can do
The **Community → Marriage certificates** page is visible only to portal administrators. It uses the supplied approved bilingual marriage certificate artwork, preserving its Arabic and English content, original logo, seal, signature lines and white/blue/gold layout.

Administrators enter:
- Groom's full name — calligraphic typography, automatically fitted to the name box.
- Bride's full name — same calligraphic typography.
- Witness 1 full name, witness 2 full name — formal serif lettering, separate spaces for handwritten signatures.
- Date of issue (required).
- Nikah date and Mahr (optional, because these may be provided later).

Use **Generate certificate** to verify the live preview and enable **Download PNG** and **Download A4 landscape PDF**. Both files are generated in the current browser. The PDF embeds the full-resolution completed certificate image on an A4 landscape page.

**Important:** This is a religious Nikah certificate, not a UK civil marriage certificate. Witness and registrar signature spaces remain blank until genuine signatures are obtained; the template's masjid seal is unchanged.

## One-time template configuration
The supplied approved design is a 1535×1024 image. A compressed JPEG copy has been provided in the ChatGPT conversation as:

`At-Towfiq-Approved-Marriage-Certificate-Template.jpg`

Download that image, open the administrator portal, navigate to **Community → Marriage certificates**, open **Approved certificate template · One-time setup / replacement**, choose the JPG, tick the confirmation checkbox and click **Save approved template**.

The browser verifies the dimensions, compresses if required, and stores the approved image as a private D1 `school_settings` entry (`masjid_marriage_certificate_template_v1`). Only the admin can upload or read it. All other school features and D1 migrations are unchanged.

The image can be replaced later with a corrected approved design by uploading a new JPG in the same settings section. Avoid changing it while actively producing an official certificate.

## Personal-data safeguards
The groom, bride, witnesses, dates and Mahr are **not saved** in D1, localStorage, external APIs, or server logs. They are rendered directly into browser canvas, and PNG/PDF files are downloaded locally by the administrator. When leaving/reloading the page, fields are cleared.

The generated copies contain personal data. Store them securely, restrict access, and handle retention according to the masjid's documented privacy policy. Do not rely on browser storage for an issuance register; this release deliberately does not create one.

No electronic witness or imam signatures are generated.

## Rollout
No database migration is needed.

```powershell
cd C:\App\Madrasah-At-Towfiq-Portal\madrasah-at-towfiq-portal
git pull origin main
npm run test
npx wrangler@latest deploy
```

Log in as an **admin**, upload the approved template, test with *dummy names*, and confirm that both the PNG and PDF are correctly downloadable and readable. Existing website/portal domains do not change.

## Reversibility
If the feature is rejected, revert the marriage-certificate merge commit from GitHub main and redeploy the portal. Leave the private D1 template entry intact until an authorised administrator explicitly removes it, so there is no risk of deleting live student data. No new D1 tables or migrations were introduced.

## Template quality note
The original template is raster artwork at 1535×1024; exporting at a larger dimension cannot create missing source detail. Keep the supplied original image rather than a screenshot. For large-format high-resolution commercial printing, request a vector or higher-resolution approved template from the designer.
