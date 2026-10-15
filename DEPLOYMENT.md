# Publicação na Vercel

O projeto tem dois destinos de execução. `pnpm build` mantém o build Vinext/Workers usado pelo Sites. Na Vercel, `vercel.json` seleciona Next.js, `pnpm build:vercel` e a saída `.next`. A versão de Node é 22.x. Não configure a saída como `dist` ou `public`.

O build Next substitui o módulo de bindings nativos por clientes HTTP para D1 e R2. Nenhum dado é consultado durante o build. O login externo usa exclusivamente as contas internas; os cabeçalhos de identidade do ChatGPT não são confiáveis fora do Sites e são ignorados.

## Configuração do servidor

Defina estas variáveis em **Vercel → Project → Settings → Environment Variables**, no ambiente desejado. Nunca use o prefixo `NEXT_PUBLIC_` para elas.

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

Referências: [configuração da Vercel](https://vercel.com/docs/project-configuration/vercel-json), [API de consultas D1](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [compatibilidade S3 do R2](https://developers.cloudflare.com/r2/api/s3/api/).
