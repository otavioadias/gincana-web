# Gincana Web

Interface Next.js para a API NestJS `gincana-api`. O projeto usa App Router, TypeScript strict, TanStack Query, React Hook Form, Zod, Recharts e uma biblioteca visual própria de componentes consistentes.

## Executar localmente

Pré-requisitos: Node.js 22+, pnpm e o `gincana-api` rodando em `http://localhost:3000`.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

O front-end abre em `http://localhost:3001`, origem já prevista no `.env.example` do back-end. Para validar:

```bash
pnpm lint
pnpm test
pnpm build
```

## Integração com a API

O contrato consultado está versionado em `contracts/openapi.json` e foi copiado do projeto irmão `gincana-api`. `NEXT_PUBLIC_API_URL` define a origem da API.

O cliente HTTP fica em `lib/api-client.ts`. A API retorna access e refresh tokens ao JavaScript, então os dois ficam encapsulados em `sessionStorage` por uma única camada. O refresh usa uma única Promise compartilhada para impedir rotações concorrentes. Nenhum componente acessa tokens diretamente. Essa escolha reduz persistência, mas um XSS ainda poderia ler tokens em uma sessão ativa; cookies HttpOnly exigiriam suporte adicional do back-end.

Todas as chaves do TanStack Query incluem `organizationId`, e login/logout limpam o QueryClient. Isso impede a reutilização do cache após troca de sessão ou organização.

## Divergências encontradas no OpenAPI

- `Organization`, `Membership`, `Campaign`, `Activity`, `Submission`, `Evidence` e `Goal` aparecem sem propriedades de resposta no OpenAPI. Os tipos de leitura ficam concentrados em `lib/types.ts`, com campos opcionais compatíveis com os models atuais da API.
- `/auth/login`, `/auth/refresh`, `/me` e os endpoints de dashboard documentam respostas como `object` genérico. Os adapters em `lib/services.ts` isolam os formatos confirmados pelo código do back-end.
- `/me` retorna apenas o principal autenticado; não inclui nome, logo, cores ou `mustChangePassword`.
- Não existe endpoint de alteração de senha.
- O upload documentado usa `multipart/form-data`, campo `file`, até 10 MB por arquivo. O controller aceita JPG, PNG, WebP e PDF.
- Configurações da equipe, disponibilidade por data, limites avançados, progresso de metas e planejamento mensal usam os endpoints tipados do contrato.
- O resumo do dashboard continua descrito como `object` genérico, embora a resposta do backend inclua `disqualified`; o adapter mantém esse formato isolado em `lib/types.ts`.

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://host.docker.internal:3000 -t gincana-web .
docker run --rm -p 3001:3001 gincana-web
```

O `next.config.ts` usa `output: "standalone"` e o Dockerfile copia apenas o servidor e os assets necessários para a imagem final.

O script `build:sites` produz, adicionalmente, o pacote Cloudflare Workers usado pela publicação no Sites. O Docker executa `build:next`, preservando o runtime standalone solicitado.
