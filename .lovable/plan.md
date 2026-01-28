
# Plano: Corrigir Erro de CORS na Edge Function create-user

## Problema Identificado

A edge function `create-user` não estava respondendo porque:
1. **Edge function não estava deployada** - Já resolvido durante a investigação
2. **Headers CORS incompletos** - Os headers de CORS não incluem todos os headers que o cliente Supabase JS envia

O erro "Failed to send a request to the Edge Function" ocorre porque o navegador bloqueia requisições quando o servidor não aceita todos os headers que estão sendo enviados (preflight CORS falha).

## Solução

Atualizar os headers CORS em todas as edge functions para incluir os headers extras do Supabase client:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

## Arquivos a Modificar

1. **supabase/functions/create-user/index.ts** (linha 14)
   - Atualizar `Access-Control-Allow-Headers` para incluir os headers extras

2. **Outras edge functions afetadas** (para consistência):
   - `delete-user/index.ts`
   - `update-user/index.ts`  
   - `list-users/index.ts`
   - Outras que usam o mesmo padrão

## Resultado Esperado

Após a correção, o cadastro de usuários funcionará normalmente sem o erro "Failed to send a request to the Edge Function".

---

## Detalhes Técnicos

O cliente Supabase JS versão 2.81.1 envia os seguintes headers extras nas requisições:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

Quando o servidor não lista esses headers no `Access-Control-Allow-Headers`, o navegador bloqueia a requisição real após o preflight OPTIONS falhar.
