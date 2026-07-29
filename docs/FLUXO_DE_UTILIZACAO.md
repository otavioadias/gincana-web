# Fluxo de utilização — Gincana Solidária

Este documento apresenta como a plataforma deve ser utilizada, quais áreas estão disponíveis para cada perfil e como uma ação solidária percorre o fluxo desde o registro até a validação.

## 1. Visão geral

A Gincana Solidária é uma plataforma multi-equipe. Participantes e líderes acessam somente sua equipe. `VALIDATOR` e `SUPER_ADMIN` são perfis da plataforma e não pertencem a nenhuma equipe.

Os perfis disponíveis são:

| Perfil | Responsabilidade principal |
| --- | --- |
| `SUPER_ADMIN` | Cadastrar, ativar e suspender equipes já com seu líder inicial |
| `MANAGER` | Liderar a equipe, participar e administrar pessoas, campanhas, atividades, metas e validações |
| `VALIDATOR` | Analisar ações de todas as equipes sem participar delas |
| `MEMBER` | Participar das atividades e registrar ações solidárias |

## 2. Acesso à plataforma

### 2.1 Login

1. A pessoa acessa `/login`.
2. Informa e-mail e senha.
3. A aplicação envia os dados para `POST /auth/login`; não é necessário escolher organização.
4. Após o login, consulta `GET /me` para identificar o perfil e a equipe.
5. O redirecionamento acontece conforme o perfil:
   - `SUPER_ADMIN`: `/admin/organizations`;
   - `VALIDATOR`: `/validations`;
   - líder sem equipe: `/create-team`;
   - demais perfis: `/dashboard`.

Sem **Manter conectado**, os tokens ficam em `sessionStorage` e são removidos ao fechar a aba. Com a opção marcada, ficam em `localStorage` e a sessão sobrevive ao fechamento do navegador. Quando o token de acesso expira, a aplicação tenta renová-lo por `POST /auth/refresh`.

### 2.2 Criação de equipe

1. Na tela de login, selecione **Primeiro acesso de líder**.
2. Informe nome, e-mail e uma senha de pelo menos 6 caracteres.
3. A aplicação cria a conta `LEADER` em `POST /auth/register-leader`.
4. Sem uma equipe, o primeiro acesso é direcionado para `/create-team`.
5. O líder informa o nome e a aplicação chama `POST /teams`.
6. A pessoa entra automaticamente como líder (`MANAGER`) e participante.

### 2.3 Encerramento da sessão

Ao selecionar **Sair**:

1. a aplicação solicita a revogação do refresh token em `POST /auth/logout`;
2. remove os tokens da sessão;
3. limpa todo o cache do TanStack Query;
4. retorna para `/login`.

Essa limpeza evita que dados da organização anterior apareçam em uma nova sessão.

### 2.4 Troca obrigatória de senha

A interface contém uma tela informativa em `/change-password`, mas o fluxo ainda não pode ser concluído porque o contrato atual do `gincana-api`:

- não informa `mustChangePassword` em `GET /me`;
- não disponibiliza endpoint para alteração de senha.

O formulário de troca deverá ser habilitado quando essas operações forem publicadas pela API.

## 3. Fluxo do MEMBER

O `MEMBER` participa das campanhas, registra ações e acompanha a validação.

### 3.1 Consultar o dashboard

Em `/dashboard`, o participante pode consultar:

- pontos aprovados;
- pontos ainda em análise;
- andamento geral, somando o aprovado e o pendente sem misturar seus significados;
- andamento individual da pessoa autenticada;
- quantidade de ações;
- participação coletiva;
- progresso das metas;
- regularidade mensal;
- pontuação agrupada por atividade;
- ações recentes;
- filtro por campanha.

O dashboard apresenta resultados coletivos e evita ranking ou linguagem de cobrança individual.

### 3.2 Escolher uma atividade

Em `/activities`:

1. utilize os filtros de campanha e tipo de pontuação;
2. leia a descrição e a regra da atividade;
3. confira a pontuação estimada e o limite de ocorrências;
4. selecione **Registrar esta ação**.

Atividades pausadas ou que atingiram o limite continuam visíveis. O botão fica desabilitado e o motivo é apresentado no card.

### 3.3 Registrar uma ação

Em `/submissions/new`, o participante preenche:

1. **Sobre a ação**
   - atividade;
   - campanha;
   - data;
   - instituição beneficiada.
2. **Detalhes da contribuição**
   - quantidade e unidade; ou
   - itens dinâmicos, quando a atividade utiliza `PER_ITEM`.
3. **Participantes**
   - pessoas da equipe que participaram da ação.
4. **Evidências e observações**
   - imagens JPG, PNG ou WebP;
   - documentos PDF;
   - até 10 MB por arquivo;
   - até 5 evidências;
   - observações para contextualizar a ação.

A pontuação mostrada no formulário é apenas uma estimativa. A pontuação oficial é definida pela API durante a validação.

### 3.4 Salvar rascunho

Ao selecionar **Salvar rascunho**:

1. a aplicação cria a submissão em `POST /submissions`;
2. envia as evidências para `POST /submissions/{id}/evidences`;
3. mantém a submissão com status `DRAFT`;
4. redireciona para o detalhe da submissão.

### 3.5 Enviar para validação

Ao selecionar **Enviar para validação**:

1. a aplicação cria a submissão;
2. envia as evidências;
3. chama `POST /submissions/{id}/submit`;
4. o status muda de `DRAFT` para `SUBMITTED`;
5. a ação entra na fila de validação.

### 3.6 Acompanhar as ações

Em `/submissions`, qualquer integrante pode:

- filtrar por status;
- acompanhar ações de toda a equipe, inclusive pendentes de validação;
- consultar atividade, instituição, data e pontos;
- abrir o detalhe de cada ação.

No detalhe `/submissions/{id}`, são exibidos:

- dados da ação;
- quantidade e unidade;
- observações;
- evidências;
- estimativa e pontuação aprovada;
- linha do tempo;
- justificativa da validação, quando existente.

Quando o status for `NEEDS_CHANGES`, o participante deve verificar a justificativa e complementar as informações solicitadas assim que o back-end disponibilizar o fluxo de reenvio completo.

## 4. Fluxo do VALIDATOR

O `VALIDATOR` não possui membership e acessa apenas a fila global. Ele não vê dashboard, atividades, pessoas, metas ou configurações internas como integrante de uma equipe.

### 4.1 Consultar a fila

Em `/validations`, a aplicação usa `/validation/submissions`:

1. selecione o filtro de status;
2. identifique as ações enviadas ou em análise;
3. selecione uma ação para abrir o painel de análise.

O painel apresenta:

- atividade;
- data;
- instituição;
- pontuação estimada;
- observações;
- evidências disponíveis por URL assinada.

### 4.2 Registrar uma decisão

As decisões possíveis são:

| Decisão | Status enviado | Regras |
| --- | --- | --- |
| Aprovar | `APPROVED` | Pode utilizar a pontuação calculada pela API |
| Aprovar parcialmente | `PARTIALLY_APPROVED` | Exige pontos aprovados e justificativa |
| Solicitar complemento | `NEEDS_CHANGES` | Exige justificativa |
| Rejeitar | `REJECTED` | Exige justificativa |

Ao confirmar, a aplicação chama:

```text
POST /validation/submissions/{id}/validate
```

Uma justificativa deve ser objetiva, respeitosa e útil para quem registrou a ação.

## 5. Fluxo do MANAGER

O `MANAGER`, chamado de **Líder** na interface, possui as funções dos participantes e as áreas administrativas da própria equipe. A validação final é exclusiva do `VALIDATOR` da plataforma.

### 5.1 Administrar a equipe

Em `/members`, o manager pode:

- listar as pessoas;
- visualizar perfil e status;
- criar um acesso;
- escolher Líder (`MANAGER`) ou Participante (`MEMBER`);
- bloquear ou reativar um acesso;
- definir uma nova senha temporária.

Para criar uma pessoa:

1. selecione **Adicionar pessoa**;
2. informe nome e e-mail;
3. escolha o perfil;
4. defina uma senha temporária com pelo menos 6 caracteres;
5. confirme a criação.

### 5.2 Administrar campanhas

Em `/campaigns`, o manager pode:

- criar uma campanha;
- informar nome, descrição e período;
- definir o mínimo desejado de ações por mês;
- ativar ou encerrar uma campanha.

Os status previstos são:

- `DRAFT`;
- `ACTIVE`;
- `CLOSED`;
- `ARCHIVED`.

### 5.3 Administrar atividades

Em `/activities`, o manager também encontra o botão **Nova atividade**.

Ao criar uma atividade, informa:

- campanha;
- nome;
- descrição;
- tipo de pontuação;
- pontos;
- unidade;
- limite de ocorrências.

Os tipos de pontuação aceitos pela API são:

- `FIXED`;
- `PER_ITEM`;
- `PER_KG`;
- `PER_MEMBER`;
- `PER_COMPLETE_KIT`;
- `TIERED`;
- `MANUAL`.

### 5.4 Administrar metas

Em `/goals`, o manager pode criar metas:

- semanais (`WEEKLY`);
- mensais (`MONTHLY`).

Cada meta possui:

- campanha;
- data inicial e final;
- pontos desejados;
- quantidade desejada de ações.

As metas servem como direção coletiva e não como cobrança individual.

### 5.5 Validar ações

O líder não acessa `/validations`; isso preserva a independência da aprovação.

### 5.6 Configurar a identidade visual

Em `/settings`, é possível simular:

- nome da organização;
- cor primária;
- cor secundária;
- aparência da marca no dashboard.

As cores são validadas como valores hexadecimais antes de serem aplicadas à prévia.

O salvamento permanece desabilitado porque o `gincana-api` ainda não oferece:

- endpoint de configuração acessível ao `MANAGER`;
- upload de logo;
- marca e cores no retorno de `GET /me`.

## 6. Fluxo do SUPER_ADMIN

O `SUPER_ADMIN` administra a plataforma, mas não acessa dados internos das organizações.

### 6.1 Cadastrar uma organização

Em `/admin/organizations`:

1. selecione **Nova organização**;
2. informe nome e slug;
3. informe nome e e-mail do manager inicial;
4. defina uma senha temporária com pelo menos 6 caracteres;
5. informe cores opcionais;
6. confirme a criação.

A aplicação utiliza:

```text
POST /admin/organizations
```

A operação cria a organização e seu manager inicial.

### 6.2 Ativar ou suspender

Na listagem, o super administrador pode alternar o status entre:

- `ACTIVE`;
- `SUSPENDED`.

A alteração utiliza:

```text
PATCH /admin/organizations/{id}
```

Não são disponibilizados links para dashboard, membros, campanhas, atividades ou submissões das organizações.

### 6.3 Consultar saúde técnica

Em `/admin/metrics`, o super administrador consulta:

- disponibilidade da API;
- horário da última verificação;
- resposta do endpoint `GET /health`.

Essa área exibe somente informações técnicas e não apresenta dados internos dos tenants.

## 7. Ciclo de vida de uma submissão

```text
DRAFT
  └── SUBMITTED
        └── UNDER_REVIEW
              ├── APPROVED
              ├── PARTIALLY_APPROVED
              ├── NEEDS_CHANGES
              └── REJECTED

Uma submissão também pode chegar a CANCELLED quando a API permitir o cancelamento.
```

Significado dos status:

| Status | Exibição | Significado |
| --- | --- | --- |
| `DRAFT` | Rascunho | Ainda não foi enviado |
| `SUBMITTED` | Enviada | Aguarda validação |
| `UNDER_REVIEW` | Em análise | A análise foi iniciada |
| `NEEDS_CHANGES` | Complemento solicitado | Precisa de mais informações |
| `APPROVED` | Aprovada | A pontuação foi aprovada |
| `PARTIALLY_APPROVED` | Aprovada parcialmente | Parte da pontuação foi aprovada |
| `REJECTED` | Rejeitada | A ação não foi validada |
| `CANCELLED` | Cancelada | O registro foi cancelado |

## 8. Roteiro recomendado para demonstração

### Preparação pelo SUPER_ADMIN

1. Entrar como `SUPER_ADMIN`.
2. Criar uma organização e seu manager.
3. Confirmar que não existem links para dados internos da organização.

### Preparação pelo MANAGER

1. Entrar como manager.
2. Criar uma campanha.
3. Criar uma atividade.
4. Criar uma meta.
5. Adicionar um validator e um member.

### Participação do MEMBER

1. Entrar como member.
2. Consultar o dashboard.
3. Abrir uma atividade.
4. Registrar uma ação e anexar uma evidência.
5. Salvar como rascunho.
6. Criar outra ação e enviar para validação.

### Validação

1. Entrar como validator.
2. Abrir a fila.
3. Consultar a evidência.
4. Aprovar parcialmente, informando pontos e justificativa.

### Conferência final

1. Retornar à conta member.
2. Abrir **Ações da equipe**.
3. Verificar status, pontuação e linha do tempo.
4. Consultar o dashboard atualizado.

## 9. Execução local no WSL

### API

```bash
cd ~/projects/gincana-api
docker compose up -d
pnpm start:dev
```

A API utiliza `http://localhost:3000`.

### Web

Em outro terminal:

```bash
cd ~/projects/gincana-web
pnpm dev
```

O Web utiliza `http://localhost:3001`.

Para que o navegador permita a integração, o `gincana-api` deve aceitar `http://localhost:3001` em `CORS_ORIGINS`.

## 10. Limitações conhecidas do contrato atual

As seguintes funcionalidades dependem de evolução do `gincana-api`:

- troca de senha;
- identificação de troca obrigatória em `/me`;
- nome, logo e cores da organização em `/me`;
- fluxo completo de edição e reenvio após `NEEDS_CHANGES`;
- propriedades detalhadas das entidades no OpenAPI.

Essas limitações ficam isoladas na interface e nos adapters. Nenhum endpoint inexistente é simulado no ambiente de produção.
