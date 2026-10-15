# Clube de Leitura Grancont

Aplicação corporativa reconstruída a partir do projeto enviado pelo escritório. Identidade visual baseada na logo e nas referências de cultura Grancont: roxo, azul e laranja; navegação lateral, painel responsivo, modo escuro e movimento reduzido acessível.

## Código no GitHub

Esta branch reúne o código da versão 3 publicada do Clube de Leitura Grancont, incluindo a central administrativa, a migração de dados e os ajustes de identidade visual de 14/10/2026. Revisão de origem: `e098a96724e7bf938b0bd5878aca9dc9bd0a7259`.

Site: https://grancont-clube-de-leitura.romerojrr.chatgpt.site

O projeto usa o runtime de Sites, Cloudflare Workers, D1 e R2. O repositório contém código, imagens e migrações de esquema. Os registros de produção, senhas e segredos de ambiente ficam no serviço de hospedagem e não acompanham esta importação. A branch preserva o histórico do sistema anterior; alterações no GitHub não publicam automaticamente o Site.

## Uso

1. Abra o endereço publicado com a conta ChatGPT proprietária do site. A publicação inicial é privada.
2. Em **Acervo**, cadastre os títulos, capas e exemplares; em **Colaboradores**, cadastre os leitores.
3. Registre retiradas em **Empréstimos**. A disponibilidade, a prioridade da fila e o limite por leitor são validados no servidor.
4. Na devolução, marque se a leitura foi concluída. Somente essa confirmação avança as metas individual e coletiva.
5. Organize encontros, sugestões e compras nos módulos do clube.
6. Use **Conhecer com dados de exemplo** para experimentar os fluxos em memória, sem alterar dados reais.

A transição usa a exportação JSON autorizada de 14/10/2026: 32 livros, 25 colaboradores, 10 empréstimos ativos, 11 devoluções, 4 aquisições e 3 sugestões. IDs, vínculos, datas, renovações, observações e comentários são preservados. Os três votos anteriores são mantidos como contagem histórica. As 32 capas não vieram no arquivo; os títulos recebem capas tipográficas até o envio das imagens.

## Recursos

- Painel de acervo, leituras ativas, leitores, conclusões e próximos encontros.
- Acervo com cadastro, edição, capas enviadas, ISBN, páginas, localização, filtros, lista/cartões, manutenção e arquivamento.
- Empréstimos com estoque, limites por leitor, renovações, avaliação, comentário, progresso e devolução.
- Reservas com fila cronológica, cancelamento e retirada pelo próximo leitor.
- Colaboradores com metas individuais, histórico e perfis de leitor/administrador.
- Sugestões com votação por conta e encaminhamento para aquisições.
- Compras com previsão, valor total, quantidade e recebimento idempotente. Um título já existente recebe mais exemplares.
- Encontros com data, horário, livro, localização e confirmação de presença.
- Conquistas calculadas com leituras concluídas no ano corrente.
- Relatórios por período, devoluções no prazo, circulação atual, últimos seis meses e títulos mais emprestados.
- Central de avisos, lembretes preparados no aplicativo de e-mail, exportação CSV e backup dos registros JSON.
- Políticas configuráveis e histórico dos 1.000 últimos eventos de alteração.

Nenhum e-mail é disparado automaticamente. O botão **Preparar lembrete** abre o aplicativo de e-mail para revisão e envio pelo responsável.

## Importar dados existentes

**CSV de acervo:** Título; Autor; Categoria; Exemplares; ISBN; Páginas; Localização. Reconhece também cabeçalhos em inglês e o CSV de acervo do sistema antigo. **CSV de colaboradores:** Nome; E-mail; Setor. IDs são opcionais. Arquivos aceitam vírgula ou ponto e vírgula, aspas, BOM e campos multilinha.

**JSON:** objeto com arrays `books`, `employees`, `loans`, `reservations`, `suggestions`, `acquisitions` e/ou `events`. Importações com empréstimos precisam conter os livros e colaboradores referenciados, ou encontrá-los já cadastrados com os mesmos IDs. Os campos legados `copies` e `area` são convertidos.

Importação é aditiva e atômica: IDs já existentes são mantidos; títulos/e-mails duplicados com IDs distintos exigem revisão. Senhas, votos antigos, perfis administrativos, configurações e auditoria externa não são importados. Os colaboradores importados recebem perfil de leitor. Limites por arquivo: 4 MB, 300 registros por módulo e 500 registros no total. Use lotes maiores divididos em arquivos, primeiro os cadastros e depois o histórico.

O backup JSON inclui os registros e configurações para consulta. A importação mantém as políticas atuais, que podem ser ajustadas na tela Configurações. Capas enviadas são armazenadas separadamente e permanecem vinculadas ao mesmo site; o JSON não é um pacote portátil de imagens. Não envie o ZIP de código pela tela de importação.

## Acesso e dados

O Site mantém a proteção de acesso privado do ChatGPT e acrescenta contas internas com nome e senha. Os administradores iniciais são Romero e Ana Beatriz, criados uma única vez pela migração autorizada. A senha definida pelo responsável não faz parte do código: é armazenada como hash PBKDF2 com salt individual e segredo de ambiente. Sessões de oito horas usam cookies HttpOnly, Secure e SameSite; somente o hash do token é persistido. Há limitação de tentativas de login. A conta ChatGPT proprietária pode entrar alternativamente na conta interna vinculada de Romero.

Cadastrar um colaborador ou uma conta interna não libera o acesso à URL privada. O proprietário precisa autorizar separadamente os visitantes no compartilhamento do Site. Na Central do Administrador, é possível criar e editar contas, vincular leitores, alterar permissões, redefinir senhas, desativar acessos e encerrar sessões. Os papéis são resolvidos no servidor. Administradores gerenciam a biblioteca; leitores podem sugerir, votar, reservar, confirmar presença e atualizar a própria leitura. E-mails de outros leitores e a auditoria não são enviados a perfis de leitor.

O painel também reúne migração e qualidade dos dados, auditoria, backups, importações, políticas e relatórios. As devoluções antigas não confirmam leitura concluída: essa informação pode ser revisada individualmente no painel antes de entrar nas metas.

Configuração de runtime: `AUTH_PASSWORD_PEPPER` protege as senhas e fica exclusivamente nos segredos do Site. `TRANSITION_IMPORT_KEY` foi usado apenas na migração autorizada e removido após sua conclusão, desabilitando novas chamadas ao endpoint de transição. A migração verifica o hash do arquivo autorizado e grava dados, contas e comprovante em uma transação, sem repetir a importação em novas chamadas.

Os dados ficam em D1, separados por coleção e ID com chave composta. As alterações de registros e auditoria usam lote transacional condicionado a uma revisão e token de operação. Gravações concorrentes não sobrescrevem dados: a sessão desatualizada recebe um conflito e recarrega os dados. Nenhum registro real é armazenado apenas no navegador. Apenas o tema visual usa armazenamento local; a demonstração usa memória descartável.

Capas são armazenadas em R2. Uploads exigem perfil administrativo, assinatura PNG/JPEG/WebP válida e até 3 MB. O acesso a capas também exige autenticação e associação à biblioteca.

## Desenvolvimento e validação

Projeto Vinext/React/TypeScript, com o runtime oficial de Sites e migrações Drizzle. Preserve a identidade em `.openai/hosting.json` ao atualizar o projeto.

- Instalação: use o helper de dependências do plugin Sites.
- Tipos: `node node_modules/typescript/bin/tsc --noEmit`.
- Regras e transações: `node scripts/test-domain.mjs`.
- Migrações: `npm run db:generate`.
- Build: use o helper `build-site.mjs` do plugin Sites.
- Publicação: sincronize o repositório de origem e publique o artefato correspondente à revisão.

A validação inclui compilação, TypeScript e 23 testes cobrindo estoque, devolução idempotente, prioridade de reserva, renovações, limites, acesso, importações, CSV, concorrência com SQLite, conversão do banco completo e primitivas de autenticação. Para incluir o teste do arquivo real, informe seu caminho local em `GRANCONT_LEGACY_SOURCE`. A inspeção visual em navegador não estava disponível neste ambiente.

## Referências preservadas

`public/brand/grancont.jpg`: logo enviada.
`public/brand/valores.png`: ambição, atitude e proximidade.
`public/brand/cultura.png`: celebrar, padrão Grancont e crescimento em equipe.

As referências são utilizadas no sistema; os anexos originais não foram modificados.

## Ajuste visual de 14/10/2026

A marca na entrada e no menu utiliza `app/brand-logo.tsx`: um filtro SVG torna o fundo roxo transparente e exibe símbolo e assinatura em branco, preservando a geometria da imagem original `public/brand/grancont.jpg`. A ilustração da entrada usa `public/brand/cultura-transparent.png`, integrada ao fundo escuro sem moldura branca. Os originais foram preservados. A versão móvel apresenta texto e arte em sequência, sem sobreposição.

Ilustração editada com a ferramenta integrada de imagens. Brief: remover o fundo branco, preservar a composição roxa, azul e laranja e clarear as frases de apoio para leitura sobre o fundo escuro. As tentativas de recorte generativo da logo não foram usadas por apresentarem ruído; a marca utiliza o original através do componente SVG.
