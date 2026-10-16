# Publicação na Vercel

O projeto tem dois destinos de execução. `pnpm build` mantém o build Vinext/Workers usado pelo Sites. Na Vercel, `vercel.json` seleciona Next.js, `pnpm build:vercel` e a saída `.next`. A versão de Node é 22.x. Não configure a saída como `dist` ou `public`.

O build Next substitui os bindings nativos por um cliente HTTP de servidor para o Supabase. Nenhum dado é consultado durante o build. O login externo usa exclusivamente as contas internas; os cabeçalhos de identidade do ChatGPT não são confiáveis fora do Sites e são ignorados.

## Supabase na Vercel

O destino externo usa PostgreSQL no esquema privado `grancont` e o bucket privado `grancont-covers`. A Edge Function `grancont-backend` verifica uma chave exclusiva do servidor, aplica uma lista fixa de consultas parametrizadas e executa cada lote em uma transação. A função assume o papel restrito `grancont_runtime`; as tabelas não têm acesso direto por `anon` ou `authenticated`. Leituras em lote usam uma fotografia consistente dos dados; as gravações mantêm a revisão e o token que impedem sobrescritas concorrentes.

Variáveis **somente do servidor**, no ambiente **Production**:

| Variável | Finalidade |
| --- | --- |
| `GRANCONT_BACKEND_URL` | URL HTTPS da função `grancont-backend` do projeto Supabase |
| `GRANCONT_BACKEND_KEY` | Chave aleatória de 32 bytes em hexadecimal; variável Sensitive |
| `AUTH_PASSWORD_PEPPER` | Segredo usado na geração das senhas desse banco; variável Sensitive |

Não use `NEXT_PUBLIC_` e não copie os segredos ou dados reais para previews. Depois de mudar as variáveis, publique um novo deployment. A configuração existente de proteção da Vercel continua separada do login interno da biblioteca.

Para reproduzir a infraestrutura em outro projeto autorizado:

1. Aplique a migração de esquema em `supabase/migrations/`.
2. Gere uma chave aleatória, armazene somente seu SHA-256 em `grancont.gateway_keys` e configure a chave original na Vercel.
3. Publique `supabase/functions/grancont-backend/index.ts` junto com `lib/postgres-queries.ts` e `deno.json`. `verify_jwt=false` é intencional: a autenticação é feita pela chave de servidor validada no corpo da função. Chamadas sem chave ou com chave incorreta recebem 401.
4. Importe os registros e crie os hashes das contas em uma transação, com salt individual e o novo pepper. Não copie sessões antigas. Os arquivos de código nunca contêm esses dados ou senhas.
5. Copie as imagens pela Storage API, preservando o caminho `covers/<uuid>`. O backup JSON contém referências, não os arquivos de imagem.
6. Valide os dois logins, o painel administrativo, a leitura dos registros, o salvamento e as capas antes de adotar o novo endereço.

Novas consultas da aplicação devem entrar na lista explícita em `lib/postgres-queries.ts`; os testes detectam consultas ausentes. As funções usam as credenciais padrão do Supabase somente dentro do servidor. As operações de Storage ficam limitadas a imagens PNG/JPEG/WebP de até 3 MB no prefixo de capas.

## Alternativa: Cloudflare próprio

O adaptador anterior D1/R2 continua disponível quando `GRANCONT_BACKEND_URL` está ausente. Somente nessa configuração, defina as variáveis abaixo em **Vercel → Project → Settings → Environment Variables**. Nunca use o prefixo `NEXT_PUBLIC_` para elas.

| Variável | Valor esperado |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare que contém os serviços |
| `CLOUDFLARE_D1_DATABASE_ID` | UUID do banco D1 com o esquema e os dados da biblioteca |
| `CLOUDFLARE_API_TOKEN` | Token de servidor com acesso de leitura/escrita ao D1 autorizado |
| `AUTH_PASSWORD_PEPPER` | Segredo usado ao gerar os hashes das contas desse banco |
| `R2_BUCKET_NAME` | Bucket com as capas, sob o prefixo `covers/` |
| `R2_ACCESS_KEY_ID` | Chave S3 do R2 com acesso ao bucket |
| `R2_SECRET_ACCESS_KEY` | Segredo da chave S3 do R2 |

Use um banco e um bucket de teste separados nas previews que poderão gravar dados. Faça um novo deploy após configurar as variáveis.

**Copiar o código para o GitHub não copia o banco nem as contas.** `.openai/hosting.json` contém a identidade do Site e nomes de bindings; não contém IDs nem credenciais de Cloudflare utilizáveis na Vercel. Se o banco gerenciado pelo Sites não estiver acessível na sua própria conta Cloudflare, será necessário provisionar serviços próprios e executar uma migração autorizada antes de usar os registros reais na Vercel. Os arquivos SQL em `drizzle/` criam o esquema; eles não contêm contas ou registros de produção. Não reative o endpoint antigo de transição para tentar inicializar a nova hospedagem.

O código não grava dados no disco efêmero da Vercel, não inventa contas padrão e não substitui silenciosamente o banco real por dados de demonstração. Sem as variáveis, a interface pode abrir, mas operações reais exibem erro de configuração. O endpoint único de transição permanece desabilitado no destino externo.

## Verificações

```sh
pnpm install --frozen-lockfile
pnpm run build:vercel
node scripts/test-domain.mjs
pnpm run start:vercel
```

A instalação segue o lockfile existente. Os testes HTTP usam respostas simuladas e não acessam serviços reais. A validação de contas, dados e capas em produção exige as variáveis e os serviços configurados.

Referências: [configuração da Vercel](https://vercel.com/docs/project-configuration/vercel-json), [PostgreSQL em Edge Functions](https://supabase.com/docs/guides/functions/connect-to-postgres), [segredos de funções](https://supabase.com/docs/guides/functions/secrets), [API de consultas D1](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/).
