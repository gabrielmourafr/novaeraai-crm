-- ============================================================
-- Notificação por email quando uma tarefa é atribuída.
--
-- users.email é a identidade de login (Supabase Auth) — mexer nela
-- quebraria o acesso. Então o email pra onde as notificações vão
-- fica numa coluna separada: notification_email. Quando ela é nula,
-- o sistema cai de volta no users.email.
--
-- Aditivo: nenhuma linha existente é alterada além do preenchimento
-- explícito abaixo.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_email TEXT;

COMMENT ON COLUMN users.notification_email IS
  'Email corporativo pra notificações do CRM. Se nulo, usa users.email (login).';

-- Email corporativo do desenvolvedor (o login segue sendo o gmail).
UPDATE users
   SET notification_email = 'gustavomonteazul@novaeraai.com.br'
 WHERE email = 'gustavomonteazul@gmail.com';
