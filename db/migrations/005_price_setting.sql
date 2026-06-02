-- 005_price_setting.sql
-- Add `setting` (inpatient/outpatient/both) to price_records. Together with the
-- existing billing_class column it lets the summary view isolate the facility
-- outpatient price from professional/component line items collapsed under one
-- CPT (the "$67 MRI" problem). billing_class/modifiers/methodology columns
-- already exist from 001; the normalizer just wasn't populating them.

-- Up Migration

ALTER TABLE price_records ADD COLUMN setting TEXT;

-- Down Migration

-- ALTER TABLE price_records DROP COLUMN IF EXISTS setting;
