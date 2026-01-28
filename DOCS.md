# 🏢 Galli - Sistema de Gestão Condominial

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![Last Updated](https://img.shields.io/badge/updated-January%202026-orange)

> Sistema completo de gestão condominial com Assistente IA integrado, multi-tenant SaaS, e experiência mobile-first.

---

## 📑 Índice

### Visão Geral
- [1. Resumo Executivo](#1-resumo-executivo)
- [2. Principais Diferenciais](#2-principais-diferenciais)

### Para Marketing/Vendas
- [3. Proposta de Valor](#3-proposta-de-valor)
- [4. Módulos e Funcionalidades](#4-módulos-e-funcionalidades)
- [5. Perfis de Usuário](#5-perfis-de-usuário)
- [6. Diferenciais Competitivos](#6-diferenciais-competitivos)
- [7. Segurança (Visão Geral)](#7-segurança-visão-geral)

### Para Equipe Técnica
- [8. Arquitetura do Sistema](#8-arquitetura-do-sistema)
- [9. Stack Tecnológica](#9-stack-tecnológica)
- [10. Estrutura de Diretórios](#10-estrutura-de-diretórios)
- [11. Schema do Banco de Dados](#11-schema-do-banco-de-dados)
- [12. Edge Functions](#12-edge-functions)
- [13. Políticas de Segurança (RLS)](#13-políticas-de-segurança-rls)
- [14. Sistema de Cache](#14-sistema-de-cache)
- [15. Sistema de Notificações](#15-sistema-de-notificações)
- [16. Assistente IA (Galli)](#16-assistente-ia-galli)
- [17. Rotas e Permissões](#17-rotas-e-permissões)
- [18. Storage Buckets](#18-storage-buckets)
- [19. Variáveis de Ambiente](#19-variáveis-de-ambiente)
- [20. Realtime & WebSockets](#20-realtime--websockets)

### Guias e Referências
- [21. Guia de Contribuição](#21-guia-de-contribuição)
- [22. Guia de Deploy](#22-guia-de-deploy)
- [23. Troubleshooting](#23-troubleshooting)

---

# PARTE 1: VISÃO GERAL

## 1. Resumo Executivo

### O que é o Galli?

O **Galli** é uma plataforma SaaS completa para gestão de condomínios, desenvolvida com tecnologia de ponta para atender administradoras, síndicos, moradores e porteiros. O sistema centraliza todas as operações condominiais em uma única interface intuitiva, com Assistente de Inteligência Artificial integrado para atendimento 24/7.

### Problema que Resolve

| Problema Atual | Solução Galli |
|----------------|---------------|
| Comunicação fragmentada (WhatsApp, e-mail, papel) | Chat integrado por grupos/blocos com histórico |
| Dificuldade em reservar áreas comuns | Calendário visual com checagem de conflitos |
| Cobranças manuais e erros frequentes | Geração automática de cobranças com rateio |
| Falta de visibilidade para moradores | Dashboard personalizado por perfil |
| Atendimento limitado ao horário comercial | Assistente IA disponível 24/7 |
| Controle de acesso manual | Registro digital com notificações em tempo real |

### Principais Números

- **31+** páginas/módulos funcionais
- **49** tabelas no banco de dados
- **13** Edge Functions para lógica de backend
- **40+** Custom Hooks reutilizáveis
- **4** perfis de usuário (Admin, Síndico, Morador, Porteiro)

---

## 2. Principais Diferenciais

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🌟 DIFERENCIAIS GALLI                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  🤖 IA INTEGRADA      │  Assistente inteligente com contexto do condomínio │
│  🏢 MULTI-TENANT      │  Uma instalação, infinitas organizações            │
│  📱 PWA MOBILE-FIRST  │  Funciona offline, instalável como app             │
│  ⚡ PERFORMANCE       │  Cache inteligente + IndexedDB                     │
│  🔐 SEGURANÇA         │  RLS + RBAC + isolamento total de dados           │
│  🔔 TEMPO REAL        │  Notificações instantâneas via WebSocket          │
│  🎯 ONBOARDING        │  Tour guiado por papel do usuário                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PARTE 2: DOCUMENTAÇÃO PARA MARKETING/VENDAS

## 3. Proposta de Valor

### 3.1 Para Administradoras de Condomínios

| Benefício | Descrição |
|-----------|-----------|
| **Centralização** | Gerencie múltiplos condomínios em uma única plataforma |
| **Redução de Custos** | Automatize processos manuais e reduza equipe operacional |
| **Visibilidade Total** | Dashboards com métricas de todos os condomínios |
| **Escalabilidade** | Adicione novos condomínios sem aumentar complexidade |
| **Relatórios** | Dados consolidados para tomada de decisão |

### 3.2 Para Síndicos

| Benefício | Descrição |
|-----------|-----------|
| **Controle Financeiro** | Visão clara de inadimplência e receitas |
| **Comunicação Eficiente** | Avisos segmentados por bloco/grupo |
| **Gestão de Ocorrências** | Acompanhamento de manutenções e reclamações |
| **Transparência** | Biblioteca de documentos acessível a todos |
| **Decisões Baseadas em Dados** | Métricas e indicadores em tempo real |

### 3.3 Para Moradores

| Benefício | Descrição |
|-----------|-----------|
| **Autonomia** | Reserve áreas, autorize visitantes, consulte boletos |
| **Atendimento 24/7** | Assistente IA responde dúvidas a qualquer hora |
| **Notificações** | Saiba quando encomendas chegam ou visitantes são autorizados |
| **Transparência** | Acesse documentos, atas e comunicados do condomínio |
| **Praticidade** | Tudo no celular, instalável como aplicativo |

### 3.4 Para Porteiros

| Benefício | Descrição |
|-----------|-----------|
| **Controle de Acesso** | Registro digital de entradas e saídas |
| **Encomendas** | Notificação automática ao morador |
| **Visitantes** | Consulta rápida de autorizações prévias |
| **Histórico** | Busca de registros anteriores |
| **Agilidade** | Interface simplificada para operações rápidas |

---

## 4. Módulos e Funcionalidades

### 4.1 Módulo de Cadastros

Gerenciamento completo de toda a estrutura condominial.

| Funcionalidade | Descrição | Benefício |
|----------------|-----------|-----------|
| **Condomínios** | Cadastro de múltiplos condomínios por organização | Gestão centralizada |
| **Unidades** | Apartamentos, casas, salas comerciais | Flexibilidade |
| **Moradores** | Cadastro com tipo (proprietário, inquilino, dependente) | Controle preciso |
| **Veículos** | Placas, modelos, cores vinculados a moradores | Segurança |
| **Funcionários** | Gestão de equipe do condomínio | Organização |

### 4.2 Módulo de Operações e Rotinas

Automatização do dia-a-dia condominial.

| Funcionalidade | Descrição | Benefício |
|----------------|-----------|-----------|
| **Áreas Comuns** | Cadastro com fotos, regras e horários | Visual atrativo |
| **Reservas** | Calendário com detecção de conflitos | Zero problemas |
| **Manutenções** | Abertura, acompanhamento e histórico | Rastreabilidade |
| **Encomendas** | Registro com notificação automática | Agilidade |
| **Visitantes** | Autorização prévia pelo morador | Segurança |
| **Controle de Acesso** | Registro de entradas/saídas | Histórico completo |
| **Mediação de Conflitos** | Canal para resolver problemas entre vizinhos | Harmonia |

### 4.3 Módulo Financeiro

Controle completo de finanças do condomínio.

| Funcionalidade | Descrição | Benefício |
|----------------|-----------|-----------|
| **Cobranças** | Geração automática mensal | Sem trabalho manual |
| **Leituras de Consumo** | Água, luz, gás individualizados | Justiça no rateio |
| **Taxas Configuráveis** | Valores por m² ou fixos | Flexibilidade |
| **Despesas** | Registro com rateio automático | Transparência |
| **Dashboard do Morador** | Boletos, histórico, consumo | Autonomia |

### 4.4 Módulo de Comunicação

Comunicação integrada e eficiente.

| Funcionalidade | Descrição | Benefício |
|----------------|-----------|-----------|
| **Grupos de Chat** | Por bloco, torre ou personalizado | Organização |
| **Biblioteca de Documentos** | Atas, regulamentos, comunicados | Acesso fácil |
| **Notificações Push** | Avisos importantes em tempo real | Não perde nada |
| **Feed de Mensagens** | Mural do condomínio | Engajamento |

### 4.5 Assistente IA (Galli)

Inteligência Artificial integrada para atendimento.

| Capacidade | Descrição | Benefício |
|------------|-----------|-----------|
| **Consultas** | "Qual meu saldo devedor?" | Respostas instantâneas |
| **Ações** | "Reserve o salão para sábado" | Execução direta |
| **Contexto** | Sabe quem é o usuário e seu condomínio | Personalização |
| **24/7** | Disponível a qualquer hora | Sem espera |
| **Configurável** | Modelo e chave API por organização | Flexibilidade |

### 4.6 Módulo de Monitoramento (Admin)

Observabilidade completa do sistema.

| Funcionalidade | Descrição | Benefício |
|----------------|-----------|-----------|
| **Logs do Sistema** | Erros, avisos, informações | Debug fácil |
| **Alertas** | Notificações de problemas críticos | Ação rápida |
| **Métricas** | Taxa de erro, latência, disponibilidade | Visão geral |
| **Diagnóstico IA** | Análise automática de erros | Solução inteligente |

---

## 5. Perfis de Usuário

### 5.1 Administrador / Síndico

```
┌─────────────────────────────────────────────────────────────────┐
│                    👔 ADMINISTRADOR / SÍNDICO                   │
├─────────────────────────────────────────────────────────────────┤
│  ACESSO TOTAL AO SISTEMA                                        │
│                                                                 │
│  ✅ Dashboard completo com métricas                             │
│  ✅ Gestão de condomínios, unidades, moradores                  │
│  ✅ Controle financeiro total                                   │
│  ✅ Configuração de áreas comuns                                │
│  ✅ Gestão de usuários e permissões                             │
│  ✅ Acesso a documentos e comunicados                           │
│  ✅ Monitoramento do sistema                                    │
│  ✅ Configuração do Assistente IA                               │
│  ✅ Relatórios e exportações                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Morador

```
┌─────────────────────────────────────────────────────────────────┐
│                       🏠 MORADOR                                │
├─────────────────────────────────────────────────────────────────┤
│  ACESSO PERSONALIZADO À SUA UNIDADE                             │
│                                                                 │
│  ✅ Dashboard com resumo pessoal                                │
│  ✅ Consulta e pagamento de cobranças                           │
│  ✅ Reserva de áreas comuns                                     │
│  ✅ Autorização de visitantes                                   │
│  ✅ Abertura de manutenções                                     │
│  ✅ Chat por grupos/blocos                                      │
│  ✅ Acesso a documentos                                         │
│  ✅ Consulta ao Assistente IA                                   │
│  ✅ Gerenciar membros da unidade                                │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Porteiro

```
┌─────────────────────────────────────────────────────────────────┐
│                       🚪 PORTEIRO                               │
├─────────────────────────────────────────────────────────────────┤
│  ACESSO FOCADO EM CONTROLE DE ACESSO                            │
│                                                                 │
│  ✅ Dashboard de portaria                                       │
│  ✅ Registro de entradas/saídas                                 │
│  ✅ Controle de encomendas                                      │
│  ✅ Consulta de visitantes autorizados                          │
│  ✅ Busca de moradores e veículos                               │
│  ✅ Consulta ao Assistente IA                                   │
│  ✅ Acesso a documentos                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Super Admin (Sistema Isolado)

```
┌─────────────────────────────────────────────────────────────────┐
│                       🛡️ SUPER ADMIN                            │
├─────────────────────────────────────────────────────────────────┤
│  ACESSO TOTAL AO SISTEMA (AUTENTICAÇÃO ISOLADA)                 │
│                                                                 │
│  ✅ Login separado via /superadmin                              │
│  ✅ Monitoramento completo do sistema                           │
│  ✅ Visualização de logs e alertas críticos                     │
│  ✅ Gestão de organizações                                      │
│  ✅ Gestão de todos os usuários                                 │
│  ✅ Configurações globais                                       │
│  ✅ Diagnósticos de IA para erros                               │
│  ✅ Métricas e análise de saúde do sistema                      │
│                                                                 │
│  ⚠️  AUTENTICAÇÃO INDEPENDENTE:                                 │
│  - Credenciais armazenadas em super_admin_credentials           │
│  - Não usa Supabase Auth padrão                                 │
│  - JWT customizado via Edge Function superadmin-auth            │
│  - Sessão isolada do sistema principal                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Diferenciais Competitivos

### 6.1 Comparativo de Mercado

| Recurso | Galli | Concorrente A | Concorrente B |
|---------|-------|---------------|---------------|
| Multi-tenant SaaS | ✅ | ❌ | ✅ |
| Assistente IA integrado | ✅ | ❌ | ❌ |
| PWA (instalável) | ✅ | ❌ | ✅ |
| Funciona offline | ✅ | ❌ | ❌ |
| Notificações em tempo real | ✅ | ✅ | ❌ |
| Onboarding guiado | ✅ | ❌ | ❌ |
| Cache inteligente | ✅ | ❌ | ❌ |
| Mediação de conflitos | ✅ | ❌ | ❌ |
| Diagnóstico IA de erros | ✅ | ❌ | ❌ |
| Configuração IA por org | ✅ | ❌ | ❌ |

### 6.2 Tecnologia de Ponta

- **React 18** - Framework mais popular do mercado
- **TypeScript** - Código seguro e manutenível
- **Tailwind CSS** - Design moderno e responsivo
- **PostgreSQL 15** - Banco robusto e escalável
- **Edge Functions (Deno)** - Backend serverless
- **Realtime WebSockets** - Atualizações instantâneas

### 6.3 Segurança Enterprise

- Isolamento completo de dados por organização
- Row Level Security (RLS) em todas as tabelas
- Autenticação com JWT e refresh tokens
- Criptografia de dados sensíveis
- Auditoria de ações críticas

---

## 7. Segurança (Visão Geral)

### 7.1 Modelo de Segurança

```
┌─────────────────────────────────────────────────────────────────┐
│                    🔐 MODELO DE SEGURANÇA                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │  ORGANIZAÇÃO  │    │  ORGANIZAÇÃO  │    │  ORGANIZAÇÃO  │   │
│  │       A       │    │       B       │    │       C       │   │
│  │  ┌─────────┐  │    │  ┌─────────┐  │    │  ┌─────────┐  │   │
│  │  │Cond. 1  │  │    │  │Cond. 3  │  │    │  │Cond. 5  │  │   │
│  │  │Cond. 2  │  │    │  │Cond. 4  │  │    │  │Cond. 6  │  │   │
│  │  └─────────┘  │    │  └─────────┘  │    │  └─────────┘  │   │
│  └───────────────┘    └───────────────┘    └───────────────┘   │
│         ▲                    ▲                    ▲             │
│         │                    │                    │             │
│    ┌────┴────────────────────┴────────────────────┴────┐       │
│    │              ISOLAMENTO TOTAL (RLS)               │       │
│    │         Dados nunca se misturam entre orgs        │       │
│    └───────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Controle de Acesso (RBAC)

| Papel | Pode Ver | Pode Criar | Pode Editar | Pode Excluir |
|-------|----------|------------|-------------|--------------|
| **Super Admin** | Sistema completo | Tudo | Tudo | Tudo |
| **Administrador** | Organização | Tudo na org | Tudo na org | Tudo na org |
| **Síndico** | Seu condomínio | Maioria | Maioria | Limitado |
| **Morador** | Sua unidade | Limitado | Próprios dados | Próprios dados |
| **Porteiro** | Portaria | Registros | Registros | Não |

### 7.3 Sistema de Autenticação Dual

O sistema possui dois fluxos de autenticação independentes:

| Sistema | Rota | Tabela | Método |
|---------|------|--------|--------|
| **Usuários normais** | `/auth` | `auth.users` (Supabase) | Supabase Auth (JWT) |
| **Super Admin** | `/superadmin` | `super_admin_credentials` | Edge Function customizada |

> **⚠️ Importante:** O Super Admin usa autenticação isolada com credenciais armazenadas em tabela própria e senha hasheada (SHA-256 com salt). A sessão é gerenciada via `SuperAdminContext` no frontend.

### 7.4 Proteções Implementadas

- ✅ **Autenticação obrigatória** em todas as rotas protegidas
- ✅ **RLS (Row Level Security)** em 100% das tabelas
- ✅ **Validação de papel** em cada operação
- ✅ **Rate limiting** nas Edge Functions
- ✅ **Sanitização** de inputs
- ✅ **CORS configurado** corretamente
- ✅ **Secrets isolados** por organização
- ✅ **Autenticação Super Admin isolada** do sistema principal

---

# PARTE 3: DOCUMENTAÇÃO TÉCNICA

## 8. Arquitetura do Sistema

### 8.1 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (BROWSER)                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         PWA + Service Worker                            ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ││
│  │  │   React 18  │  │  React      │  │  Context    │  │  IndexedDB  │    ││
│  │  │  Components │  │  Query 5    │  │  Providers  │  │  Cache      │    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOVABLE CLOUD                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                          EDGE FUNCTIONS (Deno)                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  ││
│  │  │ ai-assistant │  │ create-user  │  │ process-     │  ...             ││
│  │  │              │  │ delete-user  │  │ monthly-     │                  ││
│  │  │              │  │ update-user  │  │ charges      │                  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                            CORE SERVICES                                ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ ││
│  │  │ PostgreSQL   │  │    Auth      │  │   Storage    │  │  Realtime   │ ││
│  │  │   15 (RLS)   │  │   (JWT)      │  │   (S3)       │  │ (WebSocket) │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ API Calls
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVIÇOS EXTERNOS                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │ Lovable AI   │  │  OpenAI /    │  │   Webhooks   │                       │
│  │   Gateway    │  │  Gemini      │  │   (Payment)  │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Fluxo de Dados

```
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  User    │───▶│   React      │───▶│   React     │───▶│   Supabase   │
│  Action  │    │   Component  │    │   Query     │    │   Client     │
└──────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                           │                   │
                                           │                   ▼
                                           │          ┌──────────────┐
                                           │          │   RLS Check  │
                                           │          └──────────────┘
                                           │                   │
                                           ▼                   ▼
                                    ┌─────────────┐    ┌──────────────┐
                                    │  IndexedDB  │    │  PostgreSQL  │
                                    │   (Cache)   │    │   (Source)   │
                                    └─────────────┘    └──────────────┘
```

---

## 9. Stack Tecnológica

### 9.1 Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component Library |
| Radix UI | latest | Accessible Primitives |
| React Query | 5.83.0 | Server State |
| React Router | 6.30.1 | Routing |
| React Hook Form | 7.61.1 | Form Handling |
| Zod | 3.25.76 | Validation |
| Lucide React | 0.462.0 | Icons |
| date-fns | 3.6.0 | Date Utilities |
| recharts | 2.15.4 | Charts |
| framer-motion | (via radix) | Animations |

### 9.2 State Management

| Tecnologia | Propósito |
|------------|-----------|
| React Query | Server state, caching, sync |
| Context API | Auth, organization, condominium state |
| IndexedDB (idb-keyval) | Offline persistence |

### 9.3 Backend (Lovable Cloud)

| Tecnologia | Propósito |
|------------|-----------|
| PostgreSQL 15 | Primary Database |
| PostgREST | Auto-generated REST API |
| GoTrue | Authentication (JWT) |
| Storage | S3-compatible file storage |
| Realtime | WebSocket subscriptions |
| Edge Functions | Deno-based serverless |
| pg_cron | Scheduled jobs |

### 9.4 PWA

| Tecnologia | Propósito |
|------------|-----------|
| vite-plugin-pwa | PWA configuration |
| Workbox | Service Worker |
| Web App Manifest | Installability |

---

## 10. Estrutura de Diretórios

```
galli/
├── public/
│   ├── favicon.ico
│   ├── favicon.png
│   ├── robots.txt
│   ├── placeholder.svg
│   └── icons/
│       ├── icon-192x192.png
│       ├── icon-512x512.png
│       └── icon-maskable-512x512.png
│
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Routes & providers
│   ├── App.css                     # Global styles
│   ├── index.css                   # Tailwind + CSS variables
│   ├── vite-env.d.ts               # Vite types
│   │
│   ├── assets/
│   │   ├── galli-logo.png
│   │   └── galli-logo.svg
│   │
│   ├── components/
│   │   ├── ui/                     # 50+ shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (50+ files)
│   │   │
│   │   ├── ai/                     # AI Assistant components
│   │   │   ├── AIChatPopup.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ConversationSidebar.tsx
│   │   │   ├── MobileConversationSheet.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── chat/                   # Group Chat components
│   │   │   ├── GroupChatEmptyState.tsx
│   │   │   ├── GroupChatHeader.tsx
│   │   │   ├── GroupChatInput.tsx
│   │   │   ├── GroupChatList.tsx
│   │   │   ├── GroupChatMessage.tsx
│   │   │   └── GroupChatRoom.tsx
│   │   │
│   │   ├── feed/                   # Feed components
│   │   │   ├── CreatePostDialog.tsx
│   │   │   ├── FeedCard.tsx
│   │   │   ├── FeedComments.tsx
│   │   │   ├── FeedEmptyState.tsx
│   │   │   └── FeedGroupFilter.tsx
│   │   │
│   │   ├── groups/                 # Block Groups
│   │   │   ├── GroupConfigAlert.tsx
│   │   │   └── GroupUnitsManager.tsx
│   │   │
│   │   ├── mediation/              # Neighbor Mediation
│   │   │   └── MediationTab.tsx
│   │   │
│   │   ├── monitoring/             # System Monitoring
│   │   │   ├── AIAnalysisPanel.tsx
│   │   │   ├── AlertsPanel.tsx
│   │   │   ├── LogsConsole.tsx
│   │   │   └── MetricsCards.tsx
│   │   │
│   │   ├── onboarding/             # Onboarding System
│   │   │   ├── OnboardingButton.tsx
│   │   │   ├── OnboardingChecklist.tsx
│   │   │   └── OnboardingTour.tsx
│   │   │
│   │   ├── pwa/                    # PWA Components
│   │   │   ├── PWAInstallPrompt.tsx
│   │   │   └── PWAUpdatePrompt.tsx
│   │   │
│   │   ├── settings/               # Settings Components
│   │   │   ├── AIConfigurationTab.tsx
│   │   │   ├── AIProviderConfig.tsx
│   │   │   ├── AIUsageStats.tsx
│   │   │   ├── AvatarUpload.tsx
│   │   │   ├── BulkFAQImport.tsx
│   │   │   ├── PasswordChangeForm.tsx
│   │   │   ├── UnitMembersTab.tsx
│   │   │   └── UnitUsersTab.tsx
│   │   │
│   │   └── (outros componentes globais)
│   │       ├── CondominiumSelector.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── DashboardLayout.tsx
│   │       ├── EmptyState.tsx
│   │       ├── GlobalSearch.tsx
│   │       ├── NotificationBell.tsx
│   │       ├── OrganizationSelector.tsx
│   │       ├── PageHeader.tsx
│   │       ├── PageLoadingSpinner.tsx
│   │       ├── ProtectedRoute.tsx
│   │       ├── ResponsiveDataView.tsx
│   │       ├── StatsCard.tsx
│   │       ├── TableSkeleton.tsx
│   │       └── ThemeToggle.tsx
│   │
│   ├── contexts/
│   │   ├── CondominiumContext.tsx  # Selected condominium state
│   │   ├── OrganizationContext.tsx # Selected organization state
│   │   └── UserRoleContext.tsx     # Auth & role state
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx          # Responsive detection
│   │   ├── use-toast.ts            # Toast notifications
│   │   ├── useAIAssistant.tsx      # AI chat logic
│   │   ├── useAIConversations.tsx  # Conversation management
│   │   ├── useAIKnowledgeBase.tsx  # Knowledge base CRUD
│   │   ├── useBlockGroups.tsx      # Block groups CRUD
│   │   ├── useChangePassword.tsx   # Password change
│   │   ├── useCommonAreaReservations.tsx
│   │   ├── useCommonAreas.tsx
│   │   ├── useCondominiumExpenses.tsx
│   │   ├── useCondominiumFilter.ts
│   │   ├── useDocuments.tsx
│   │   ├── useElectricityReadings.tsx
│   │   ├── useFinancialCharges.tsx
│   │   ├── useGroupChat.tsx
│   │   ├── useMaintenanceRequests.tsx
│   │   ├── useNeighborMediations.tsx
│   │   ├── useNotifications.tsx
│   │   ├── useOnboarding.tsx
│   │   ├── useOrgAIConfig.tsx
│   │   ├── useOrganizationFilter.ts
│   │   ├── usePackages.tsx
│   │   ├── usePrefetch.ts
│   │   ├── useProfile.tsx
│   │   ├── usePWA.tsx
│   │   ├── useReservationGuests.tsx
│   │   ├── useReservations.tsx
│   │   ├── useSystemLogs.tsx
│   │   ├── useTimeSlotConflict.tsx
│   │   ├── useUnitMembers.tsx
│   │   ├── useUnitUsers.tsx
│   │   ├── useUnits.tsx
│   │   ├── useUserPresence.tsx
│   │   ├── useUserRole.tsx
│   │   ├── useUsers.tsx
│   │   ├── useUtilityRates.tsx
│   │   ├── useVisitorAuth.tsx
│   │   └── useWaterReadings.tsx
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts           # Supabase client (auto-generated)
│   │       └── types.ts            # Database types (auto-generated)
│   │
│   ├── lib/
│   │   ├── errorHandler.ts         # Error handling utilities
│   │   ├── queryKeys.ts            # React Query key management
│   │   ├── queryPersister.ts       # IndexedDB persistence
│   │   ├── utils.ts                # General utilities (cn, etc.)
│   │   └── validationSchemas.ts    # Zod schemas
│   │
│   └── pages/
│       ├── Auth.tsx                # Login
│       ├── Auth.tsx                # Login/signup
│       ├── AdminSetup.tsx          # Initial admin setup
│       ├── NotFound.tsx            # 404 page
│       │
│       ├── Dashboard.tsx           # Admin dashboard
│       ├── ResidentDashboard.tsx   # Resident dashboard
│       ├── DoorkeeperDashboard.tsx # Doorkeeper dashboard
│       │
│       ├── Condominiums.tsx        # Condominium management
│       ├── CondominiumUnits.tsx    # Units by condominium
│       ├── Units.tsx               # All units
│       ├── Residents.tsx           # Resident management
│       ├── ResidentVehicles.tsx    # Vehicles by resident
│       ├── Vehicles.tsx            # All vehicles
│       ├── Employees.tsx           # Employee management
│       │
│       ├── CommonAreas.tsx         # Common areas config
│       ├── Reservations.tsx        # Reservation management
│       ├── MaintenanceRequests.tsx # Maintenance + mediation
│       ├── PackageControl.tsx      # Package management
│       ├── VisitorAuthorization.tsx# Visitor auth
│       ├── AccessControl.tsx       # Access logs
│       │
│       ├── BlockGroups.tsx         # Block/tower groups
│       ├── GroupChat.tsx           # Group chat
│       ├── Documents.tsx           # Document library
│       │
│       ├── FinancialManagement.tsx # Financial admin
│       ├── ResidentFinancial.tsx   # Resident finances
│       ├── UtilityReadings.tsx     # Water/electricity/gas
│       │
│       ├── UserManagement.tsx      # User management (legacy)
│       ├── UserManagementOptimized.tsx # User management (optimized)
│       │
│       ├── AIAssistant.tsx         # AI chat page
│       ├── Settings.tsx            # User settings
│       │
│       ├── owner/                  # Owner pages
│       │   ├── OwnerDashboard.tsx  # Owner dashboard
│       │   ├── OwnerMonitoring.tsx # System monitoring (superadmin only)
│       │   ├── OwnerOrganizations.tsx
│       │   ├── OwnerSettings.tsx
│       │   └── OwnerUsers.tsx
│       │
│       └── superadmin/             # SuperAdmin pages
│           ├── SuperAdminLogin.tsx # Login isolado
│           └── SuperAdminAccount.tsx
│
├── supabase/
│   ├── config.toml                 # Supabase config (auto-generated)
│   │
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── rate-limiter.ts     # Rate limiting utility
│   │   │   └── system-logger.ts    # Logging utility
│   │   │
│   │   ├── ai-assistant/
│   │   │   └── index.ts            # AI chat with tool calling
│   │   │
│   │   ├── ai-diagnostics/
│   │   │   └── index.ts            # AI error diagnosis
│   │   │
│   │   ├── create-user/
│   │   │   └── index.ts            # User creation (Admin API)
│   │   │
│   │   ├── delete-user/
│   │   │   └── index.ts            # User deletion
│   │   │
│   │   ├── update-user/
│   │   │   └── index.ts            # User update
│   │   │
│   │   ├── list-users/
│   │   │   └── index.ts            # List users
│   │   │
│   │   ├── manage-org-ai-config/
│   │   │   └── index.ts            # Org AI config CRUD
│   │   │
│   │   ├── process-monthly-charges/
│   │   │   └── index.ts            # CRON: monthly charges
│   │   │
│   │   ├── check-contract-expiry/
│   │   │   └── index.ts            # CRON: contract check
│   │   │
│   │   ├── fetch-system-logs/
│   │   │   └── index.ts            # Fetch logs
│   │   │
│   │   ├── manage-cron-schedule/
│   │   │   └── index.ts            # Manage CRON jobs
│   │   │
│   │   └── parse-faqs/
│   │       └── index.ts            # Parse FAQs for KB
│   │
│   └── migrations/
│       └── *.sql                   # Database migrations (auto-generated)
│
├── .env                            # Environment variables (auto-generated)
├── index.html                      # HTML entry point
├── vite.config.ts                  # Vite configuration
├── tailwind.config.ts              # Tailwind configuration
├── eslint.config.js                # ESLint configuration
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependencies
└── README.md                       # Basic readme
```

---

## 11. Schema do Banco de Dados

### 11.1 Diagrama ER Simplificado

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  organizations  │◄────────│  condominiums   │◄────────│     units       │
│  (Organizações) │  1:N    │  (Condomínios)  │  1:N    │   (Unidades)    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        │ 1:N                       │                           │ 1:N
        ▼                           │                           ▼
┌─────────────────┐                 │                   ┌─────────────────┐
│ user_org_members│                 │                   │    residents    │
│ (Membros Org)   │                 │                   │   (Moradores)   │
└─────────────────┘                 │                   └─────────────────┘
        │                           │                           │
        │ N:1                       │                           │ 1:N
        ▼                           │                           ▼
┌─────────────────┐                 │                   ┌─────────────────┐
│    profiles     │                 │                   │    vehicles     │
│   (Perfis)      │                 │                   │   (Veículos)    │
└─────────────────┘                 │                   └─────────────────┘
        │                           │
        │ 1:1                       │
        ▼                           │
┌─────────────────┐                 │
│   user_roles    │                 │
│   (Papéis)      │                 │
└─────────────────┘                 │
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  common_areas   │         │   employees     │         │  block_groups   │
│ (Áreas Comuns)  │         │ (Funcionários)  │         │    (Grupos)     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                                                       │
        │ 1:N                                                   │ N:M
        ▼                                                       ▼
┌─────────────────┐                                     ┌─────────────────┐
│  reservations   │                                     │ group_messages  │
│   (Reservas)    │                                     │  (Mensagens)    │
└─────────────────┘                                     └─────────────────┘
```

### 11.2 Tabelas por Domínio

#### Core / Multi-Tenant

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| `organizations` | Organizações (administradoras) | id, name, slug, owner_id, plan, max_condominiums |
| `user_organization_members` | Membros das organizações | id, user_id, organization_id, role |
| `profiles` | Perfis de usuário | id, full_name, avatar_url, phone |
| `user_roles` | Papéis de usuário | id, user_id, role (enum) |
| `organization_ai_config` | Config IA por organização | id, organization_id, ai_model, ai_api_key |

#### Cadastros

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| `condominiums` | Condomínios | id, organization_id, name, address, cnpj |
| `units` | Unidades (apartamentos) | id, condominium_id, number, block, floor, area_m2 |
| `residents` | Moradores | id, unit_id, name, email, phone, type (enum) |
| `vehicles` | Veículos | id, resident_id, plate, brand, model, color |
| `employees` | Funcionários | id, condominium_id, name, position, phone |
| `unit_users` | Usuários vinculados a unidades | id, unit_id, user_id |
| `unit_members` | Membros da unidade (não-usuários) | id, unit_id, name, phone, relationship |

#### Operações

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| `common_areas` | Áreas comuns | id, condominium_id, name, description, rules, capacity |
| `common_area_images` | Imagens das áreas | id, common_area_id, image_url, order |
| `reservations` | Reservas | id, common_area_id, unit_id, date, start_time, end_time, status |
| `reservation_guests` | Convidados da reserva | id, reservation_id, name |
| `reservation_checklist` | Checklist de reserva | id, reservation_id, item, checked |
| `maintenance_requests` | Solicitações de manutenção | id, unit_id, category, description, status, priority |
| `maintenance_request_updates` | Histórico de atualizações | id, request_id, status, notes, updated_by |
| `packages` | Encomendas | id, unit_id, tracking_code, sender, status, received_at |
| `access_logs` | Registro de acesso | id, condominium_id, visitor_name, type, unit_id, entry_at, exit_at |
| `visitor_authorizations` | Autorizações de visitantes | id, unit_id, visitor_name, valid_from, valid_until, status |
| `neighbor_mediations` | Mediações de conflito | id, condominium_id, reporter_unit_id, reported_unit_id, description, status |
| `mediation_responses` | Respostas de mediação | id, mediation_id, responder_id, message |

#### Financeiro

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| `financial_charges` | Cobranças | id, unit_id, type, amount, due_date, status, reference_month |
| `condominium_expenses` | Despesas do condomínio | id, condominium_id, category, description, amount, date |
| `expense_apportionments` | Rateios de despesas | id, expense_id, unit_id, amount, status |
| `water_readings` | Leituras de água | id, unit_id, reading, consumption, month, year |
| `electricity_readings` | Leituras de luz | id, unit_id, reading, consumption, month, year |
| `gas_readings` | Leituras de gás | id, unit_id, reading, consumption, month, year |
| `utility_rates` | Tarifas de utilidades | id, condominium_id, utility_type, rate_per_unit |
| `payment_webhooks` | Webhooks de pagamento | id, charge_id, provider, payload, processed_at |

#### Comunicação

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| `block_groups` | Grupos por bloco | id, condominium_id, name, block, is_default, message_permission |
| `block_group_members` | Membros do grupo | id, group_id, user_id |
| `block_group_condominiums` | Condomínios do grupo | id, group_id, condominium_id |
| `group_messages` | Mensagens do chat | id, group_id, author_id, content, reply_to_id |
| `group_message_reads` | Leituras de mensagens | id, group_id, user_id, last_read_at |
| `documents` | Documentos | id, condominium_id, title, category, file_url, uploaded_by |
| `notifications` | Notificações | id, user_id, title, message, read, type |
| `feed_messages` | Mensagens do feed | id, condominium_id, author_id, content, media_urls |
| `feed_comments` | Comentários do feed | id, message_id, author_id, content |

#### IA & Monitoramento

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| `ai_conversations` | Conversas com IA | id, user_id, title, created_at |
| `ai_messages` | Mensagens da IA | id, conversation_id, role, content |
| `ai_knowledge_base` | Base de conhecimento | id, organization_id, question, answer, category |
| `ai_usage_stats` | Estatísticas de uso | id, organization_id, category, question_count, date |
| `ai_diagnostics` | Diagnósticos da IA | id, log_id, diagnosis, suggestions, confidence |
| `system_logs` | Logs do sistema | id, level, service, message, metadata, resolved |
| `system_alerts` | Alertas do sistema | id, level, title, message, acknowledged |
| `error_solutions` | Soluções conhecidas | id, error_pattern, solution, success_rate |
| `onboarding_progress` | Progresso do onboarding | id, user_id, step, completed_at |

---

## 12. Edge Functions

### 12.1 Visão Geral

| Função | Tipo | Autenticação | Rate Limit | Descrição |
|--------|------|--------------|------------|-----------|
| `ai-assistant` | HTTP POST | JWT | 10/min | Chat com IA + tool calling |
| `ai-diagnostics` | HTTP POST | JWT | 5/min | Diagnóstico de erros |
| `create-user` | HTTP POST | Service Role | N/A | Criar usuário (Admin API) |
| `delete-user` | HTTP POST | Service Role | N/A | Excluir usuário |
| `update-user` | HTTP POST | Service Role | N/A | Atualizar usuário |
| `list-users` | HTTP GET | JWT | N/A | Listar usuários |
| `manage-org-ai-config` | HTTP ALL | JWT | N/A | CRUD config IA |
| `process-monthly-charges` | CRON | Service Role | N/A | Gerar cobranças mensais |
| `check-contract-expiry` | CRON | Service Role | N/A | Verificar contratos |
| `fetch-system-logs` | HTTP GET | JWT | N/A | Buscar logs |
| `manage-cron-schedule` | HTTP POST | JWT | N/A | Gerenciar agendamentos |
| `parse-faqs` | HTTP POST | JWT | N/A | Importar FAQs para KB |
| `superadmin-auth` | HTTP POST | Público | N/A | Autenticação isolada do SuperAdmin |
| `setup-superadmin` | HTTP POST | Setup Key | N/A | Criar credenciais iniciais do SuperAdmin |
| `analyze-system-health` | CRON | Service Role | N/A | Análise de saúde do sistema (15min) |

A Edge Function mais complexa do sistema. Implementa um assistente IA com:

#### Arquitetura

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          ai-assistant Flow                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Request ──────▶ 2. Auth Check ──────▶ 3. Rate Limit                 │
│                                                   │                      │
│                                                   ▼                      │
│  4. Load User Context ◀──────────────────────────┘                      │
│       │                                                                  │
│       ▼                                                                  │
│  5. Build System Prompt (role-based)                                     │
│       │                                                                  │
│       ▼                                                                  │
│  6. Get Tools for Role                                                   │
│       │                                                                  │
│       ▼                                                                  │
│  7. Call AI Model (streaming) ◀──────────────────────┐                  │
│       │                                               │                  │
│       ▼                                               │                  │
│  8. Tool Call? ───────────────▶ 9. Execute Tool ─────┘                  │
│       │ (no)                                                             │
│       ▼                                                                  │
│  10. Stream Response                                                     │
│       │                                                                  │
│       ▼                                                                  │
│  11. Track Usage Stats                                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Tools por Papel

| Papel | Tools Disponíveis |
|-------|-------------------|
| **morador** | consultar_cobranças, consultar_reservas, criar_reserva, consultar_manutenções, criar_manutenção, consultar_visitantes |
| **administrador/sindico** | Todos do morador + criar_cobrança, aprovar_reserva, atualizar_manutenção, consultar_inadimplentes |
| **porteiro** | consultar_encomendas, registrar_encomenda, consultar_visitantes_autorizados, registrar_entrada |

#### Contexto Injetado

```typescript
interface UserContext {
  userId: string;
  userName: string;
  role: 'administrador' | 'sindico' | 'morador' | 'porteiro';
  organizationId: string;
  organizationName: string;
  condominiumId?: string;
  condominiumName?: string;
  unitId?: string;
  unitNumber?: string;
}
```

### 12.3 process-monthly-charges (CRON)

Executada mensalmente para gerar cobranças automáticas:

```
┌───────────────────────────────────────────────────────────────┐
│                 process-monthly-charges                        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Para cada condomínio:                                     │
│     │                                                         │
│     ├── 2. Buscar taxas configuradas (água, luz, gás, cond.) │
│     │                                                         │
│     ├── 3. Para cada unidade:                                │
│     │     │                                                   │
│     │     ├── 4. Buscar leituras do mês                      │
│     │     │                                                   │
│     │     ├── 5. Calcular consumo × tarifa                   │
│     │     │                                                   │
│     │     └── 6. Criar financial_charge                      │
│     │                                                         │
│     └── 7. Notificar moradores                               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 12.4 superadmin-auth (Autenticação Isolada)

Edge Function para autenticação do Super Admin, independente do Supabase Auth:

```
┌───────────────────────────────────────────────────────────────┐
│                     superadmin-auth Flow                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. POST { email, password }                                  │
│       │                                                       │
│       ▼                                                       │
│  2. Buscar em super_admin_credentials por email               │
│       │                                                       │
│       ▼                                                       │
│  3. Hash password com salt armazenado (SHA-256)               │
│       │                                                       │
│       ▼                                                       │
│  4. Comparar hash_resultado com password_hash                 │
│       │                                                       │
│       ├── ❌ Não confere → 401 "Credenciais inválidas"        │
│       │                                                       │
│       └── ✅ Confere → Retornar dados do admin                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### Estrutura da Tabela

```sql
CREATE TABLE super_admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,      -- SHA-256 hash
  password_salt TEXT NOT NULL,      -- Salt único
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 13. Políticas de Segurança (RLS)

### 13.1 Funções de Segurança

```sql
-- Retorna IDs das organizações do usuário
CREATE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM user_organization_members 
  WHERE user_id = user_uuid;
$$ LANGUAGE sql STABLE;

-- Verifica se é owner da organização
CREATE FUNCTION is_organization_owner(user_uuid UUID, org_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = user_uuid
  );
$$ LANGUAGE sql STABLE;

-- Verifica se é admin da organização
CREATE FUNCTION is_organization_admin(user_uuid UUID, org_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql STABLE;

-- Verifica se tem acesso à organização
CREATE FUNCTION has_organization_access(user_uuid UUID, org_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_id
  );
$$ LANGUAGE sql STABLE;

-- Verifica se é morador de uma unidade
CREATE FUNCTION is_resident_of_unit(user_uuid UUID, target_unit_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_users 
    WHERE user_id = user_uuid 
    AND unit_id = target_unit_id
  );
$$ LANGUAGE sql STABLE;

-- Verifica papel do usuário
CREATE FUNCTION has_role(user_uuid UUID, required_role app_role)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid 
    AND role = required_role
  );
$$ LANGUAGE sql STABLE;
```

### 13.2 Padrões de Políticas

#### Tabelas com organization_id (ex: condominiums)

```sql
-- SELECT: usuário deve pertencer à organização
CREATE POLICY "users_read_own_org_condominiums" 
ON condominiums FOR SELECT USING (
  organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT: apenas admins
CREATE POLICY "admins_insert_condominiums" 
ON condominiums FOR INSERT WITH CHECK (
  is_organization_admin(auth.uid(), organization_id)
);

-- UPDATE: apenas admins
CREATE POLICY "admins_update_condominiums" 
ON condominiums FOR UPDATE USING (
  is_organization_admin(auth.uid(), organization_id)
);

-- DELETE: apenas owners
CREATE POLICY "owners_delete_condominiums" 
ON condominiums FOR DELETE USING (
  is_organization_owner(auth.uid(), organization_id)
);
```

#### Tabelas com unit_id (ex: financial_charges)

```sql
-- SELECT: morador vê suas cobranças, admin vê todas do condomínio
CREATE POLICY "users_read_charges" 
ON financial_charges FOR SELECT USING (
  -- Morador vê suas próprias cobranças
  is_resident_of_unit(auth.uid(), unit_id)
  OR
  -- Admin/síndico vê todas do condomínio
  EXISTS (
    SELECT 1 FROM units u
    JOIN condominiums c ON u.condominium_id = c.id
    WHERE u.id = unit_id
    AND is_organization_admin(auth.uid(), c.organization_id)
  )
);
```

#### Tabelas sensíveis (ex: organization_ai_config)

```sql
-- Apenas owners podem ver/editar config de IA
CREATE POLICY "owners_manage_ai_config" 
ON organization_ai_config FOR ALL USING (
  is_organization_owner(auth.uid(), organization_id)
);
```

---

## 14. Sistema de Cache

### 14.1 Estratégia de Cache

O sistema usa React Query com persistência em IndexedDB para otimizar performance:

```typescript
// src/lib/queryKeys.ts
export const cacheConfig = {
  // Dados que mudam raramente
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000,    // 1 hora
  },
  
  // Dados que mudam ocasionalmente
  semiDynamic: {
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 15 * 60 * 1000,    // 15 minutos
  },
  
  // Dados que mudam frequentemente
  dynamic: {
    staleTime: 60 * 1000,      // 1 minuto
    gcTime: 5 * 60 * 1000,     // 5 minutos
  },
  
  // Dados em tempo real
  realtime: {
    staleTime: 0,              // Sempre stale
    gcTime: 5 * 60 * 1000,     // 5 minutos
  },
} as const;
```

### 14.2 Aplicação por Tipo de Dado

| Tipo de Dado | Configuração | Exemplos |
|--------------|--------------|----------|
| Static | 30min stale / 1h gc | Condomínios, Áreas Comuns, Configurações |
| Semi-Dynamic | 5min stale / 15min gc | Moradores, Unidades, Documentos |
| Dynamic | 1min stale / 5min gc | Notificações, Logs, Reservas do dia |
| Realtime | 0 stale / 5min gc | Chat, Mensagens, Contadores |

### 14.3 Persistência IndexedDB

```typescript
// src/lib/queryPersister.ts
import { get, set, del } from 'idb-keyval';

export const createIDBPersister = () => ({
  persistClient: async (client) => {
    await set('react-query-cache', client);
  },
  restoreClient: async () => {
    return await get('react-query-cache');
  },
  removeClient: async () => {
    await del('react-query-cache');
  },
});
```

### 14.4 Configuração no App

```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: cacheConfig.semiDynamic.staleTime,
      gcTime: cacheConfig.semiDynamic.gcTime,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

<PersistQueryClientProvider 
  client={queryClient} 
  persistOptions={{ 
    persister: createIDBPersister(),
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    buster: 'v1.0.0', // Cache busting
  }}
>
```

---

## 15. Sistema de Notificações

### 15.1 Tipos de Notificação

| Tipo | Descrição | Visibilidade |
|------|-----------|--------------|
| `package` | Encomendas recebidas | Dashboard normal |
| `reservation` | Status de reservas | Dashboard normal |
| `visitor` | Visitantes autorizados | Dashboard normal |
| `maintenance` | Solicitações de manutenção | Dashboard normal |
| `financial` | Cobranças e pagamentos | Dashboard normal |
| `system` | Alertas de sistema/monitoramento | **Apenas SuperAdmin** |

> **Nota:** Notificações do tipo `system` são filtradas automaticamente no dashboard normal e aparecem apenas na área de SuperAdmin (`/superadmin/monitoring`).

### 15.2 Triggers Automáticos

O sistema usa triggers PostgreSQL para criar notificações automaticamente:

| Trigger | Evento | Notifica |
|---------|--------|----------|
| `notify_package_received` | INSERT em packages | Moradores da unidade |
| `notify_reservation_created` | INSERT em reservations | Admins do condomínio |
| `notify_reservation_status_changed` | UPDATE em reservations | Morador que reservou |
| `notify_maintenance_created` | INSERT em maintenance_requests | Admins do condomínio |
| `notify_maintenance_status_changed` | UPDATE em maintenance_requests | Morador que abriu |
| `notify_financial_charge_created` | INSERT em financial_charges | Moradores da unidade |
| `notify_visitor_authorization` | INSERT em visitor_authorizations | Porteiros |
| `notify_mediation_created` | INSERT em neighbor_mediations | Admins + unidade reportada |
| `notify_mediation_response` | INSERT em mediation_responses | Participantes |
| `notify_critical_system_error` | INSERT em system_logs (level=error) | SuperAdmins |

### 15.3 Estrutura da Tabela

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'package', 'reservation', 'maintenance', 'financial', etc.
  read BOOLEAN DEFAULT FALSE,
  data JSONB, -- Dados adicionais (IDs relacionados, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 15.3 Realtime Subscription

```typescript
// src/hooks/useNotifications.tsx
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Adiciona notificação ao estado
      queryClient.invalidateQueries(['notifications']);
      // Mostra toast
      toast({ title: payload.new.title, description: payload.new.message });
    }
  )
  .subscribe();
```

---

## 16. Assistente IA (Galli)

### 16.1 Arquitetura Completa

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ASSISTENTE IA (GALLI)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  Frontend       │                                                        │
│  │  ┌─────────────┐│    ┌─────────────────────────────────────────────────┐│
│  │  │AIChatPopup  ││◀──▶│                useAIAssistant                   ││
│  │  │AIAssistant  ││    │  - messages state                               ││
│  │  │ChatMessage  ││    │  - sendMessage() → streaming                    ││
│  │  │ChatInput    ││    │  - loadHistory()                                ││
│  │  └─────────────┘│    └─────────────────────────────────────────────────┘│
│  └─────────────────┘                         │                              │
│                                              │ HTTP POST                    │
│                                              ▼                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Edge Function: ai-assistant                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │ │
│  │  │ Auth Check  │─▶│ Rate Limit  │─▶│ Load Context│─▶│ Build Prompt │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘ │ │
│  │                                                            │          │ │
│  │                                                            ▼          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │ │
│  │  │Track Stats  │◀─│Stream Resp. │◀─│ Execute Tool│◀─│ Call AI Model│ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                              │                              │
│                                              ▼                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                          AI Model Options                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │ │
│  │  │ Lovable AI      │  │ OpenAI (org key)│  │ Gemini (org key)│       │ │
│  │  │ (default, free) │  │                 │  │                 │       │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 16.2 System Prompt (Exemplo para Morador)

```
Você é o Galli, assistente virtual do condomínio {condominiumName}.

## Sobre o usuário
- Nome: {userName}
- Papel: Morador
- Unidade: {unitNumber}
- Condomínio: {condominiumName}

## Suas capacidades
Como morador, você pode ajudar com:
- Consultar cobranças e boletos
- Verificar reservas de áreas comuns
- Fazer novas reservas
- Consultar solicitações de manutenção
- Abrir novas manutenções
- Verificar autorizações de visitantes

## Regras
1. Seja sempre cordial e profissional
2. Use os tools disponíveis para buscar informações reais
3. Nunca invente dados - se não encontrar, informe
4. Responda em português brasileiro
5. Seja conciso mas completo
```

### 16.3 Tool Calling

```typescript
// Exemplo de tool definition
const tools = [
  {
    type: "function",
    function: {
      name: "consultar_cobranças",
      description: "Consulta as cobranças do morador",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pendente", "pago", "vencido", "todos"],
            description: "Filtrar por status"
          },
          meses: {
            type: "number",
            description: "Quantidade de meses para buscar (padrão: 3)"
          }
        }
      }
    }
  },
  // ... mais tools
];

// Exemplo de tool execution
async function executeTool(name: string, args: any, context: UserContext) {
  switch (name) {
    case "consultar_cobranças":
      const charges = await supabase
        .from("financial_charges")
        .select("*")
        .eq("unit_id", context.unitId)
        .order("due_date", { ascending: false })
        .limit(args.meses * 4);
      return JSON.stringify(charges.data);
    // ... mais cases
  }
}
```

### 16.4 Configuração por Organização

Organizações podem usar modelo/chave próprios:

```typescript
// organization_ai_config table
{
  organization_id: "uuid",
  ai_model: "gpt-4" | "gpt-3.5-turbo" | "gemini-pro" | null,
  ai_api_key: "encrypted_key" | null, // Usa Lovable AI se null
}
```

---

## 17. Rotas e Permissões

### 17.1 Tabela Completa de Rotas

| Rota | Componente | Papéis | Descrição |
|------|------------|--------|-----------|
| `/` | Redirect | Público | Redireciona para /auth |
| `/auth` | Auth | Público | Login/Signup |
| `/admin-setup` | AdminSetup | Público | Setup inicial |
| `/dashboard` | Dashboard | admin, sindico | Dashboard principal |
| `/dashboard/resident` | ResidentDashboard | morador | Dashboard morador |
| `/dashboard/doorkeeper` | DoorkeeperDashboard | porteiro | Dashboard porteiro |
| `/dashboard/condominiums` | Condominiums | admin, sindico | Gestão de condomínios |
| `/dashboard/condominiums/:id/units` | CondominiumUnits | admin, sindico | Unidades do condomínio |
| `/dashboard/units` | Units | admin, sindico | Todas as unidades |
| `/dashboard/residents` | Residents | admin, sindico | Gestão de moradores |
| `/dashboard/residents/:id/vehicles` | ResidentVehicles | admin, sindico | Veículos do morador |
| `/dashboard/vehicles` | Vehicles | admin, sindico | Todos os veículos |
| `/dashboard/employees` | Employees | admin, sindico | Gestão de funcionários |
| `/dashboard/access` | AccessControl | admin, sindico, porteiro | Controle de acesso |
| `/dashboard/utility-readings` | UtilityReadings | admin, sindico | Leituras de consumo |
| `/dashboard/users` | UserManagement | admin, sindico | Gestão de usuários |
| `/dashboard/common-areas` | CommonAreas | admin, sindico | Áreas comuns |
| `/dashboard/block-groups` | BlockGroups | admin, sindico | Grupos/blocos |
| `/dashboard/group-chat` | GroupChat | admin, sindico, morador | Chat por grupo |
| `/dashboard/group-chat/:id` | GroupChat | admin, sindico, morador | Chat específico |
| `/dashboard/reservations` | Reservations | admin, sindico, morador | Reservas |
| `/dashboard/visitor-auth` | VisitorAuthorization | morador | Autorizar visitantes |
| `/dashboard/packages` | PackageControl | porteiro, admin, sindico | Encomendas |
| `/dashboard/maintenance` | MaintenanceRequests | admin, sindico, morador | Manutenções |
| `/dashboard/financial` | FinancialManagement | admin, sindico | Financeiro admin |
| `/dashboard/resident-financial` | ResidentFinancial | morador | Financeiro morador |
| `/dashboard/documents` | Documents | todos | Documentos |
| `/dashboard/ai-assistant` | AIAssistant | todos | Assistente IA |
| `/dashboard/settings` | Settings | todos | Configurações |
| `/superadmin` | SuperAdminLogin | Público | Login do SuperAdmin |
| `/superadmin/dashboard` | OwnerDashboard | SuperAdmin | Dashboard SuperAdmin |
| `/superadmin/monitoring` | OwnerMonitoring | SuperAdmin | Monitoramento do sistema |
| `/superadmin/organizations` | OwnerOrganizations | SuperAdmin | Gestão de organizações |
| `/superadmin/users` | OwnerUsers | SuperAdmin | Gestão de usuários |
| `/superadmin/settings` | OwnerSettings | SuperAdmin | Configurações |
| `/superadmin/account` | SuperAdminAccount | SuperAdmin | Conta do SuperAdmin |
| `*` | NotFound | Público | Página 404 |

### 17.2 Componente ProtectedRoute

```typescript
// src/components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: string | string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { role, loading, userId } = useUserRoleContext();
  
  if (loading) return <PageLoadingSpinner />;
  
  if (!userId) return <Navigate to="/auth" replace />;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  if (!roles.includes(role)) {
    // Redireciona para dashboard correto
    const redirectPath = role === 'morador' 
      ? '/dashboard/resident'
      : role === 'porteiro'
      ? '/dashboard/doorkeeper'
      : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
}
```

---

## 18. Storage Buckets

### 18.1 Buckets Configurados

| Bucket | Público | Tamanho Máx. | Tipos Permitidos | Uso |
|--------|---------|--------------|------------------|-----|
| `avatars` | Sim | 2MB | image/* | Fotos de perfil |
| `common-area-images` | Sim | 5MB | image/* | Imagens de áreas comuns |
| `visitor-documents` | Não | 10MB | image/*, application/pdf | Documentos de visitantes |
| `condominium-documents` | Não | 10MB | application/pdf, image/*, application/* | Documentos gerais |

### 18.2 Políticas de Storage

```sql
-- avatars: público para leitura, usuário para escrita
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- condominium-documents: apenas usuários da organização
CREATE POLICY "Users can view org documents" 
ON storage.objects FOR SELECT USING (
  bucket_id = 'condominium-documents'
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id::text = (storage.foldername(name))[1]
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
);
```

### 18.3 Upload de Arquivos

```typescript
// Exemplo de upload
const uploadAvatar = async (file: File) => {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const filePath = `${userId}/${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });
    
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);
    
  return publicUrl;
};
```

---

## 19. Variáveis de Ambiente

### 19.1 Frontend (.env)

```env
# Auto-geradas pelo Lovable Cloud
VITE_SUPABASE_URL=https://whrfazovnbxrpcfoxbrd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=whrfazovnbxrpcfoxbrd
```

### 19.2 Edge Functions (Secrets)

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto | Sim (auto) |
| `SUPABASE_ANON_KEY` | Chave pública | Sim (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço | Sim (auto) |
| `LOVABLE_API_KEY` | Chave para Lovable AI | Não (default AI) |

### 19.3 Secrets por Organização

Armazenados na tabela `organization_ai_config`:

| Campo | Descrição |
|-------|-----------|
| `ai_api_key` | Chave OpenAI/Gemini personalizada |
| `ai_model` | Modelo preferido |

---

## 20. Realtime & WebSockets

### 20.1 Tabelas com Realtime

```sql
-- Habilitar realtime para tabelas específicas
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_logs;
```

### 20.2 Padrão de Subscription

```typescript
// src/hooks/useGroupChat.tsx
useEffect(() => {
  const channel = supabase
    .channel(`group-${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        // Adiciona mensagem ao cache
        queryClient.setQueryData(
          ['group-messages', groupId],
          (old: Message[]) => [...old, payload.new]
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        // Remove mensagem do cache
        queryClient.setQueryData(
          ['group-messages', groupId],
          (old: Message[]) => old.filter(m => m.id !== payload.old.id)
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [groupId]);
```

### 20.3 Presence (Usuários Online)

```typescript
// src/hooks/useUserPresence.tsx
const channel = supabase.channel('online-users');

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    setOnlineUsers(Object.keys(state));
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    // Usuário entrou
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    // Usuário saiu
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    }
  });
```

---

# PARTE 4: GUIAS E REFERÊNCIAS

## 21. Guia de Contribuição

### 21.1 Padrões de Código

#### Estrutura de Componentes

```typescript
// 1. Imports (externos primeiro, depois internos)
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// 2. Types/Interfaces
interface ComponentProps {
  id: string;
  onSuccess?: () => void;
}

// 3. Component
export function Component({ id, onSuccess }: ComponentProps) {
  // 3.1 Hooks
  const { toast } = useToast();
  const [state, setState] = useState<string>('');
  
  // 3.2 Queries/Mutations
  const { data, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => fetchEntity(id),
  });
  
  // 3.3 Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 3.4 Handlers
  const handleClick = () => {
    // ...
  };
  
  // 3.5 Render
  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

#### Estrutura de Hooks

```typescript
// src/hooks/useEntity.tsx

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Entity {
  id: string;
  name: string;
  // ...
}

// Hook
export function useEntity(id?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['entities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
  
  // Create
  const createMutation = useMutation({
    mutationFn: async (newEntity: Partial<Entity>) => {
      const { data, error } = await supabase
        .from('entities')
        .insert(newEntity)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast({ title: 'Sucesso', description: 'Criado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
  
  return {
    data,
    isLoading,
    refetch,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

### 21.2 Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona reserva de churrasqueira
fix: corrige cálculo de rateio
docs: atualiza documentação de API
style: formata código com prettier
refactor: extrai hook useReservations
test: adiciona testes para financeiro
chore: atualiza dependências
```

### 21.3 Pull Requests

1. Criar branch a partir de `main`: `feat/nova-funcionalidade`
2. Fazer commits atômicos
3. Abrir PR com descrição clara
4. Aguardar review
5. Fazer merge após aprovação

---

## 22. Guia de Deploy

### 22.1 Deploy via Lovable

1. Acesse o projeto no Lovable
2. Clique em **Share** → **Publish**
3. Aguarde o build completar
4. Acesse via URL publicada: `https://galli.lovable.app`

### 22.2 Domínio Customizado

1. No Lovable, vá em **Settings** → **Domains**
2. Adicione seu domínio: `app.seucondominio.com.br`
3. Configure DNS:
   ```
   CNAME app → galli.lovable.app
   ```
4. Aguarde propagação DNS (até 48h)

### 22.3 Migrações de Banco

Migrações são aplicadas automaticamente via Lovable. Para migrações manuais:

1. Use a ferramenta de migração do Lovable
2. Revise o SQL gerado
3. Aprove a execução
4. Verifique os resultados

---

## 23. Troubleshooting

### 23.1 Problemas Comuns

#### "Dados não aparecem"

1. Verifique se o usuário está autenticado
2. Confirme que tem papel correto
3. Verifique políticas RLS
4. Cheque o console para erros de rede

```typescript
// Debug: verificar usuário atual
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Debug: verificar papel
const { data: role } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();
console.log('Role:', role);
```

#### "Edge Function retorna 500"

1. Verifique os logs da função
2. Confirme que secrets estão configurados
3. Verifique body do request

```typescript
// Debug: log de edge function
console.log('Request body:', await req.json());
```

#### "Cache desatualizado"

1. Force invalidação:
```typescript
queryClient.invalidateQueries({ queryKey: ['entities'] });
```

2. Limpe cache persistido:
```typescript
import { del } from 'idb-keyval';
await del('react-query-cache');
window.location.reload();
```

#### "Notificações não chegam"

1. Verifique se realtime está habilitado na tabela
2. Confirme subscription no hook
3. Verifique filtros do channel

### 23.2 Logs e Monitoramento

Acesse `/monitoramento` (admin/síndico) para:

- Visualizar logs do sistema
- Ver alertas ativos
- Métricas de performance
- Diagnóstico IA de erros

### 23.3 Contato Suporte

Para issues técnicos, abra uma issue no repositório ou entre em contato via Lovable.

---

## 📋 Changelog

### v1.0.0 (Janeiro 2026)
- Lançamento inicial
- Todos os módulos core implementados
- Assistente IA integrado
- PWA com suporte offline
- Sistema de monitoramento

---

## 📄 Licença

Projeto proprietário. Todos os direitos reservados.

---

<div align="center">

**Galli - Sistema de Gestão Condominial**

Desenvolvido com ❤️ usando Lovable

[galli.lovable.app](https://galli.lovable.app)

</div>
