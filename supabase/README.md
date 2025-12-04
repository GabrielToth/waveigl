# Supabase Database - WaveIGL

## 📁 Estrutura de Arquivos

### `/migrations/` - Migrações Incrementais
Contém as migrações históricas do banco de dados. **NÃO REMOVER!**

**Por que manter migrações?**
- ✅ Histórico de mudanças
- ✅ Possibilidade de rollback
- ✅ Versionamento do banco
- ✅ Aplicação incremental em produção
- ✅ Rastreabilidade de alterações

**Ordem das migrações:**
1. `20250220000000_final_schema_v2.sql` - Schema base
2. `20250221000000_add_phone_number.sql` - Campo telefone
3. `20250221000001_fix_linked_accounts_constraints.sql` - Correção de constraints
4. `20250601000000_unlink_quarantine.sql` - Sistema de quarentena
5. `20250602000000_user_roles_and_scopes.sql` - Roles e escopos OAuth
6. `20250603000000_subscriber_benefits.sql` - Sistema de benefícios

### `/schema.sql` - Schema Consolidado
**Arquivo único que representa o estado ATUAL do banco.**

**Quando usar:**
- 📖 Documentação do schema atual
- 🚀 Setup rápido de novos ambientes (dev/staging)
- 🔍 Referência para desenvolvedores
- 🧪 Testes e desenvolvimento local

**Quando NÃO usar:**
- ❌ Produção (use migrações incrementais)
- ❌ Bancos existentes com dados (use migrações)

## 🚀 Como Usar

### Para Novo Ambiente (sem dados):
```bash
# Aplicar schema completo
psql -f supabase/schema.sql
```

### Para Produção/Ambiente Existente:
```bash
# Aplicar migrações em ordem
psql -f supabase/migrations/20250220000000_final_schema_v2.sql
psql -f supabase/migrations/20250221000000_add_phone_number.sql
# ... etc
```

### Via Supabase CLI:
```bash
# Aplicar todas as migrações pendentes
supabase db reset
```

## 📊 Tabelas Principais

1. **profiles** - Perfis de usuários (estende auth.users)
2. **linked_accounts** - Contas vinculadas (Twitch, YouTube, Kick)
3. **moderation_actions** - Histórico de moderação
4. **active_timeouts** - Timeouts ativos
5. **chat_messages** - Cache de mensagens
6. **pending_unlinks** - Desvinculações pendentes
7. **subscriber_benefits** - Benefícios de assinantes
8. **discord_connections** - Conexões Discord

## 🔒 Segurança

- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Policies configuradas para acesso restrito
- ✅ Service role tem acesso completo (server-side apenas)
- ✅ Usuários só acessam seus próprios dados

## 📝 Notas

- O schema.sql é gerado manualmente e pode ficar desatualizado
- Sempre verifique as migrações mais recentes antes de usar schema.sql
- Em caso de divergência, as migrações são a fonte da verdade

