# 🏗️ SGO — Sistema de Gestão Operacional de Obras

Plataforma SaaS multiempresa para gestão operacional de obras de construção civil.

---

## 📋 Índice
- [Stack](#stack)
- [Estrutura do Projeto](#estrutura)
- [Módulos do MVP](#módulos)
- [Setup do Banco de Dados](#banco)
- [Setup do Backend](#backend)
- [Setup do Frontend](#frontend)
- [Setup do Mobile](#mobile)
- [Docker](#docker)

---

## 🛠️ Stack <a name="stack"></a>

| Camada    | Tecnologia              |
|-----------|-------------------------|
| Backend   | FastAPI + Python 3.12   |
| Banco     | Supabase (PostgreSQL)   |
| Storage   | Supabase Storage        |
| Auth      | Supabase Auth + JWT     |
| Frontend  | Next.js 14 + TypeScript |
| Mobile    | Flutter 3.x             |
| Infra     | Docker Compose          |

---

## 📁 Estrutura do Projeto <a name="estrutura"></a>

```
sgo/
├── database/                    # Migrations SQL (Supabase)
│   ├── 00_migration_master.sql  # Executar no SQL Editor
│   ├── 01_extensions_and_types.sql
│   ├── 02_core_tables.sql       # master, construtoras, usuarios
│   ├── 03_obras.sql             # obras, estrutura, serviços
│   ├── 04_pcp.sql               # templates, atividades, dependências
│   ├── 05_efetivo_producao.sql  # efetivo diário, produções
│   ├── 06_fotos_impedimentos.sql
│   ├── 07_almoxarifado_equipamentos.sql
│   ├── 08_inspecoes_pendencias.sql
│   ├── 09_contratos_medicoes.sql
│   ├── 10_diario_obra.sql
│   ├── 11_rls_policies.sql      # Row Level Security multiempresa
│   ├── 12_triggers_functions_views.sql
│   └── 13_seed.sql              # Dados de desenvolvimento
│
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── core/                # config, auth, database, exceptions
│   │   ├── schemas/             # Pydantic: base, obras, pcp, operacional, qualidade
│   │   ├── routers/             # auth, obras, pcp, operacional, qualidade, misc
│   │   └── main.py
│   ├── .env
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                    # Next.js 14
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/    # Tela de login
│   │   │   └── (dashboard)/     # Todas as páginas autenticadas
│   │   │       ├── dashboard/   # KPIs executivos
│   │   │       ├── obras/       # Listagem + detalhe
│   │   │       ├── pcp/         # Atividades
│   │   │       ├── efetivo/     # Efetivo diário
│   │   │       ├── producoes/   # Apontamentos
│   │   │       ├── inspecoes/   # Qualidade
│   │   │       ├── pendencias/  # Não conformidades
│   │   │       ├── medicoes/    # Banco de medição
│   │   │       ├── equipamentos/
│   │   │       ├── empreiteiros/
│   │   │       └── diario/      # Diário automático
│   │   ├── components/layout/   # Sidebar
│   │   ├── contexts/auth.tsx    # Auth context
│   │   ├── lib/api.ts           # Cliente Axios
│   │   └── types/index.ts       # TypeScript types
│   ├── .env.local
│   └── package.json
│
├── mobile/                      # Flutter
│   ├── lib/
│   │   ├── core/
│   │   │   ├── auth/            # AuthProvider (Riverpod)
│   │   │   └── theme/           # AppTheme
│   │   ├── screens/
│   │   │   ├── auth/login_screen.dart
│   │   │   ├── home/home_screen.dart
│   │   │   ├── obras/           # Listagem obras
│   │   │   ├── pcp/             # Atividades
│   │   │   ├── efetivo/
│   │   │   ├── producoes/
│   │   │   ├── inspecoes/
│   │   │   ├── pendencias/
│   │   │   └── diario/
│   │   └── main.dart            # GoRouter + Supabase init
│   └── pubspec.yaml
│
└── docker-compose.yml
```

---

## 🗄️ Setup do Banco de Dados <a name="banco"></a>

1. Acesse o **SQL Editor** do Supabase: `https://supabase.com/dashboard/project/jsvdrmrfvlzeyskvprjv/sql`

2. Execute os arquivos **na ordem**:

```sql
-- Cole o conteúdo de cada arquivo na ordem:
01_extensions_and_types.sql
02_core_tables.sql
03_obras.sql
04_pcp.sql
05_efetivo_producao.sql
06_fotos_impedimentos.sql
07_almoxarifado_equipamentos.sql
08_inspecoes_pendencias.sql
09_contratos_medicoes.sql
10_diario_obra.sql
11_rls_policies.sql
12_triggers_functions_views.sql
-- Opcional (dev):
13_seed.sql
```

---

## ⚙️ Setup do Backend <a name="backend"></a>

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Edite com suas credenciais
uvicorn app.main:app --reload --port 8000
```

API disponível em: `http://localhost:8000`  
Docs: `http://localhost:8000/docs`

### Endpoints principais

| Método | Rota                      | Descrição              |
|--------|---------------------------|------------------------|
| POST   | `/api/v1/auth/login`      | Login                  |
| GET    | `/api/v1/auth/me`         | Usuário logado         |
| GET    | `/api/v1/obras`           | Listar obras           |
| POST   | `/api/v1/obras`           | Criar obra             |
| GET    | `/api/v1/pcp/atividades`  | Listar atividades      |
| POST   | `/api/v1/efetivo`         | Registrar efetivo      |
| POST   | `/api/v1/producoes`       | Lançar produção        |
| GET    | `/api/v1/inspecoes`       | Listar inspeções       |
| PUT    | `/api/v1/inspecoes/{id}`  | Atualizar inspeção     |
| GET    | `/api/v1/medicoes`        | Listar medições        |
| GET    | `/api/v1/dashboard/obras` | Dashboard consolidado  |

---

## 🖥️ Setup do Frontend <a name="frontend"></a>

```bash
cd frontend
npm install
cp .env.local.example .env.local   # já configurado
npm run dev
```

App disponível em: `http://localhost:3000`

### Páginas disponíveis

| Rota             | Módulo             |
|------------------|--------------------|
| `/login`         | Autenticação       |
| `/dashboard`     | Dashboard executivo|
| `/obras`         | Obras              |
| `/obras/[id]`    | Detalhe da obra    |
| `/pcp`           | PCP / Atividades   |
| `/efetivo`       | Efetivo Diário     |
| `/producoes`     | Produções          |
| `/inspecoes`     | Inspeções          |
| `/pendencias`    | Pendências         |
| `/medicoes`      | Medições           |
| `/equipamentos`  | Equipamentos       |
| `/empreiteiros`  | Empreiteiros       |
| `/diario`        | Diário de Obra     |

---

## 📱 Setup do Mobile (Flutter) <a name="mobile"></a>

```bash
cd mobile
cp .env.example .env
flutter pub get
flutter run
```

### Telas implementadas

- ✅ Login (Supabase Auth)
- ✅ Home (grid de módulos)
- ✅ Obras (listagem + progresso)
- ✅ PCP / Atividades
- ✅ Efetivo Diário
- ✅ Produções
- ✅ Inspeções
- ✅ Pendências
- ✅ Diário de Obra

---

## 🐳 Docker <a name="docker"></a>

```bash
# Na raiz do projeto
cp backend/.env.example backend/.env
docker-compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

---

## 🏢 Arquitetura Multiempresa

```
MASTER
 └── Construtora A         ← RLS: isolamento total
      ├── Usuários          ← perfis: admin, gerente, engenheiro...
      ├── Obras             ← estrutura recursiva
      ├── Empreiteiros      ← com colaboradores
      ├── Contratos         ← itens com preços unitários
      └── Produções         ← vinculadas a atividades
```

**Row Level Security (RLS):** cada usuário só acessa dados da sua construtora. Usuários empreiteiro só veem dados vinculados ao seu empreiteiro.

---

## 🔄 Fluxo Operacional

```
Atividade PCP
    ↓
Efetivo (presença da equipe)
    ↓
Produção (apontamento + rateio individual)
    ↓
Inspeção (aprovada / com ressalvas / reprovada)
    ↓
Pendência (se reprovada/ressalvas)
    ↓
Medição (banco de medição → fechamento)
    ↓
Diário de Obra (gerado automaticamente)
```

---

## 📊 Views e Triggers

| Objeto                    | Tipo    | Função                                  |
|---------------------------|---------|-----------------------------------------|
| `vw_dashboard_obra`       | View    | KPIs consolidados por obra              |
| `vw_progresso_estrutura`  | View    | % execução por unidade/bloco            |
| `vw_producao_empreiteiro` | View    | Produção agrupada por empreiteiro       |
| `fn_update_atividade_percentual` | Trigger | Atualiza % ao lançar produção   |
| `fn_bloquear_atividade_impedimento` | Trigger | Bloqueia/desbloqueia atividade |
| `fn_inspecao_criar_pendencia` | Trigger | Cria pendência ao reprovar        |
| `fn_gerar_diario_obra`    | Function| Gera/atualiza diário automaticamente   |
| `fn_calcular_medicao`     | Trigger | Calcula valor ao fechar medição         |

---

## 📝 Variáveis de Ambiente

```env
# backend/.env
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
APP_ENV=development
CORS_ORIGINS=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 📌 MVP Check

- ✅ Multiempresa com RLS
- ✅ Usuários e Permissões (7 perfis construtora + 3 empreiteiro)
- ✅ Obras com Estrutura Universal recursiva
- ✅ Biblioteca de Serviços
- ✅ PCP com Templates e Dependências
- ✅ Efetivo Diário com presença individual
- ✅ Produção e Rateio Individual
- ✅ Fotos vinculadas a atividades/inspeções/pendências
- ✅ Impedimentos por categoria
- ✅ Almoxarifado simplificado
- ✅ Equipamentos e Alocações
- ✅ Inspeções com fluxo completo
- ✅ Pendências com ciclo de correção
- ✅ Empreiteiros e Colaboradores
- ✅ Contratos com itens de preço
- ✅ Medições com banco de medição
- ✅ Diário de Obra automático
- ✅ Dashboard Executivo com views
