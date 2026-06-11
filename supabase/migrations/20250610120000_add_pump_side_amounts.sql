alter table public.pump_logs
  add column if not exists amount_left_ml int check (amount_left_ml is null or amount_left_ml >= 0),
  add column if not exists amount_right_ml int check (amount_right_ml is null or amount_right_ml >= 0);
