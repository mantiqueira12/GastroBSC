# GastroBSC

Landing institucional de startup em desenvolvimento. Site estático, sem formulário ou analytics instalados.

## Publicação no Netlify

Importar este repositório, selecionar a branch `main` e usar o plano Free. O arquivo `netlify.toml` define a verificação e a pasta pública `dist`.

Cada push na branch de produção pode gerar um deploy e consumir a cota gratuita. Agrupar alterações e revisar previews antes de publicar.

## Verificação local

Com Node.js instalado, na pasta `github_site_v1/`:

- `node check-site.mjs`: links, metadados (título até 60 e descrição até 155 caracteres, canonical, Open Graph, 1 H1), sitemap, hash do JSON-LD e regras da CSP (sem `<script>` inline, `on*=`, `style="..."` nem recurso externo).
- `node --test`: testes das ferramentas e do próprio `check-site.mjs` (em `tests/`). No Node 24, rode sem argumento; `node --test tests/` falha.
- `node tests/serve-with-headers.mjs [porta]`: serve `dist/` com os cabeçalhos de `dist/_headers` (CSP real) para o QA no navegador. Não é usado no deploy.

## Domínio e e-mail

Domínio: gastrobsc.com.br. Adicionar raiz e www ao projeto Netlify antes de alterar os registros do site no Registro.br. O e-mail depende de um provedor de caixa postal separado.

## Escopo público

Este repositório contém apenas a landing e seus ativos públicos. Documentação estratégica interna, dados de clientes e credenciais ficam fora dele. Plano atual do MVP do site: `11_mvp_site_captacao/ROADMAP.md`, na pasta de documentação, fora deste repositório.

## Retorno de versão

Se uma publicação falhar, restaurar o deploy anterior no Netlify e corrigir a alteração no Git. Não mudar MX/TXT de e-mail durante ajustes do site.
