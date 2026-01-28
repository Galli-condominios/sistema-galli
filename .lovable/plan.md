
# Plano: Corrigir Redirecionamento Após Criação do Primeiro Condomínio

## Problema Identificado

O hook `useFirstCondominiumCheck` utiliza **estado local isolado** (`useState`) em cada componente que o chama. Isso significa que:

1. Quando `FirstCondominiumSetup` define `setNeedsFirstCondominium(false)`, apenas sua instância local é atualizada
2. Ao navegar para `/dashboard`, o `ProtectedRoute` cria uma **nova instância** do hook
3. Essa nova instância faz uma query ao banco e, devido a timing/race conditions, pode ainda avaliar que precisa do primeiro condomínio e redirecionar de volta

## Solucao Proposta

Converter o hook `useFirstCondominiumCheck` em um **Context Provider** compartilhado, garantindo que todas as partes da aplicacao usem a mesma instancia do estado.

---

## Arquivos a Modificar

### 1. Criar Contexto Compartilhado

**Arquivo**: `src/contexts/FirstCondominiumContext.tsx` (novo)

- Criar um `FirstCondominiumProvider` que encapsula toda a logica atual do hook
- Prover estado compartilhado para `needsFirstCondominium`, `loading`, `organizationId`, `organizationName`
- Expor funcoes `refetch` e `setNeedsFirstCondominium` para atualizacao global

### 2. Atualizar App.tsx

**Arquivo**: `src/App.tsx`

- Adicionar `FirstCondominiumProvider` na hierarquia de providers (apos `UserRoleProvider`)
- Garantir que o contexto esteja disponivel para todos os componentes protegidos

### 3. Atualizar Hook para Consumir Contexto

**Arquivo**: `src/hooks/useFirstCondominiumCheck.tsx`

- Transformar o hook para simplesmente consumir o contexto
- Manter a mesma interface de retorno para nao quebrar codigo existente

### 4. Atualizar ProtectedRoute

**Arquivo**: `src/components/ProtectedRoute.tsx`

- Nenhuma mudanca necessaria na interface, pois o hook mantera a mesma assinatura

### 5. Atualizar FirstCondominiumSetup

**Arquivo**: `src/pages/FirstCondominiumSetup.tsx`

- Nenhuma mudanca necessaria na interface, o `setNeedsFirstCondominium` agora atualizara o estado global

---

## Detalhes Tecnicos

### Nova Estrutura do Contexto

```text
FirstCondominiumProvider
    |
    +-- Estado Global
    |      needsFirstCondominium: boolean
    |      loading: boolean
    |      organizationId: string | null
    |      organizationName: string | null
    |
    +-- Metodos
           setNeedsFirstCondominium(value: boolean)
           refetch()
```

### Fluxo Corrigido

```text
FirstCondominiumSetup             ProtectedRoute (/dashboard)
        |                                    |
   criar condo                               |
        |                                    |
   setNeedsFirstCondominium(false) ---------> Estado Global Atualizado
        |                                    |
   navigate("/dashboard")                    |
        |                                    |
        |                           useFirstCondominiumCheck() 
        |                                    | (le do contexto global)
        |                                    |
        |                           needsFirstCondominium = false (correto!)
        |                                    |
        |                           renderiza Dashboard normalmente
```

---

## Ordem de Implementacao

1. Criar `FirstCondominiumContext.tsx` com toda a logica
2. Atualizar `App.tsx` para incluir o provider
3. Simplificar `useFirstCondominiumCheck.tsx` para consumir o contexto
4. Testar o fluxo completo de criacao do primeiro condominio

---

## Beneficios

- Estado compartilhado entre todos os componentes
- Eliminacao de race conditions no redirecionamento
- Codigo mais limpo e manutenivel
- Reutilizacao consistente em toda a aplicacao
