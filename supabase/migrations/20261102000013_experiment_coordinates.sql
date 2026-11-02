-- Bento | Coordenadas do experimento (para localizar a parcela/área em campo)
-- Somente acréscimo de colunas opcionais. Coordenadas são internas: nunca entram em snapshot
-- público (private.experiment_public_card seleciona campos explicitamente e não as inclui).

alter table public.experiments
  add column if not exists latitude numeric(9, 6) check (latitude between -90 and 90),
  add column if not exists longitude numeric(9, 6) check (longitude between -180 and 180),
  add column if not exists coordenadas_fonte text check (char_length(coordenadas_fonte) <= 300);

alter table public.experiments
  add constraint experiments_coordenadas_par check ((latitude is null) = (longitude is null));

create index if not exists experiments_coords_idx on public.experiments (organization_id)
  where latitude is not null and archived_at is null;
