# GastroBSC

Landing institucional de startup em desenvolvimento. Site estático, sem formulário ou analytics instalados.

## Publicação no Netlify

Importar este repositório, selecionar a branch `main` e usar o plano Free. O arquivo `netlify.toml` define a verificação e a pasta pública `dist`.

Cada push na branch de produção pode gerar um deploy e consumir a cota gratuita. Agrupar alterações e revisar previews antes de publicar.

## Verificação local

Com Node.js instalado: `node check-site.mjs`.

## Domínio e e-mail

Domínio: gastrobsc.com.br. Adicionar raiz e www ao projeto Netlify antes de alterar os registros do site no Registro.br. O e-mail depende de um provedor de caixa postal separado.

## Escopo público

Este repositório contém apenas a landing e seus ativos públicos. Documentação estratégica interna, dados de clientes e credenciais ficam fora dele. O SaaS será desenvolvido no projeto ProAPP conforme decisões próprias.

## Retorno de versão

Se uma publicação falhar, restaurar o deploy anterior no Netlify e corrigir a alteração no Git. Não mudar MX/TXT de e-mail durante ajustes do site.
