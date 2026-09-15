# Placar do Plenário — STF (Pet 16.662)

Painel independente e não-oficial que acompanha a sessão do STF de 15/09/2026 sobre abrir ou não investigação contra o ministro Alexandre de Moraes.

- `index.html` — dashboard público. Só lê `data.json` e atualiza sozinho a cada ~12s.
- `admin.html` — painel de controle para atualizar `data.json` manualmente durante a sessão. Não é linkado no site público, mas **o repositório é público, então a URL não é secreta** — quem protege a escrita é o token do GitHub, não a obscuridade da URL (veja a seção Segurança).
- `data.json` — fonte única de verdade (status de cada ministro, quem está falando, inclinação estimada, linha do tempo).

## 1. Subir no GitHub Pages

```bash
git init
git add .
git commit -m "Painel inicial do placar STF"
gh repo create SEU-USUARIO/stf-dashboard --public --source=. --push
```

Depois, no GitHub: **Settings → Pages → Deploy from branch → main / (root)**. O site fica em `https://SEU-USUARIO.github.io/stf-dashboard/`.

## 2. Gerar o token para o painel de controle

O `admin.html` grava direto no `data.json` do repositório usando a API do GitHub, sem precisar de servidor. Para isso:

1. Vá em GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Restrinja o **Repository access** a só esse repositório (`stf-dashboard`).
3. Em **Permissions**, dê **Contents: Read and write**.
4. Em **Expiration**, use o menor prazo possível (ex: 1-2 dias) — não deixe sem validade. Depois da sessão, revogue o token manualmente em **Settings → Developer settings → Personal access tokens**, mesmo que ele ainda não tenha expirado.
5. Copie o token e cole no campo do `admin.html` (fica salvo só no `localStorage` do seu navegador — nunca é enviado a mais ninguém além da API do GitHub).

Abra `https://SEU-USUARIO.github.io/stf-dashboard/admin.html`, preencha `owner/repositório` (ex: `seu-usuario/stf-dashboard`), cole o token, clique em **Salvar configuração** e depois **Carregar estado atual**.

## 3. Operar durante a sessão

No `admin.html`:
- Marque o **status da sessão** e a **fase atual** (texto livre).
- Selecione **quem está falando agora**.
- Ajuste o **slider de inclinação** (0 = arquivar, 100 = abrir investigação) conforme o que a pessoa estiver dizendo na transmissão oficial.
- Quando um ministro terminar de votar, marque o **voto** dele na lista.
- Adicione eventos importantes na linha do tempo.
- Clique em **Publicar alterações no site**. O painel público (`index.html`) reflete a mudança em até ~12s.

O botão de publicar sempre busca o estado mais recente do `data.json` antes de gravar, então não sobrescreve uma atualização feita por outra pessoa (ou pela task automática) nesse meio-tempo.

## 4. Estimativa automática (opcional, melhor esforço)

Se quiser, é possível configurar uma cloud task agendada (via `/schedule` no Claude) para, a cada poucos minutos durante a sessão, ler um liveblog de notícias e escrever uma estimativa grosseira de inclinação em `data.json` (marcada como `"fonte": "auto"`). Isso é só um complemento — não é confiável sozinho, e qualquer atualização manual sempre tem prioridade. Combine comigo se quiser configurar isso antes da sessão.

## Segurança

Auditoria feita pensando no cenário de o site viralizar. O que já está mitigado no código:

- **XSS armazenado**: todo texto vindo de `data.json` (nomes, cargos, eventos da linha do tempo) passa por escape de HTML antes de ir para o DOM, tanto em `index.html` quanto em `admin.html`. Testado com payloads (`<img onerror=...>`, `<script>`) — nenhum executa.
- **Content-Security-Policy** restritiva em ambas as páginas (`script-src 'self'`, sem inline scripts/estilos), como segunda camada de defesa contra XSS mesmo que algum escape falhe no futuro.
- **Clickjacking**: `admin.html` se recusa a carregar dentro de um `<iframe>` de outro site.
- **Token do GitHub**: só existe no `localStorage` do navegador de quem opera; nunca é commitado no repositório nem enviado para qualquer domínio além de `api.github.com`.
- **Escopo mínimo**: o token deve ser fine-grained, restrito a este repositório, só com permissão de conteúdo — nunca um token clássico com acesso a tudo.

O que continua sendo risco residual (não dá pra eliminar num site 100% estático, sem backend):

- **Se o token vazar**, quem o pegar consegue reescrever `data.json` — ou seja, forjar um voto ou status falso para os ministros. Não consegue fazer mais nada além disso (o escopo do token não alcança outros repositórios nem sua conta). Mitigação: token de curta duração, revogado logo após a sessão, nunca usado em computador compartilhado.
- **Toda escrita fica registrada** no histórico do Git (`https://github.com/SEU-USUARIO/SEU-REPO/commits/main/data.json`) com autor, horário e diff — qualquer adulteração é rastreável e reversível (`git revert`).
- **A URL do `admin.html` não é secreta** (o repositório é público) — trate isso como público desde o início, não como "obscuro".
- Se no futuro a automação por IA (item 4) for ligada, o texto raspado de sites externos deve ser tratado como dado não confiável — ele passa pelo mesmo escape acima, mas revise o que a task está escrevendo antes de confiar cegamente.

## Aviso

Este painel não é um produto oficial do STF. Os votos confirmados vêm de atualização manual de quem está assistindo à transmissão; a barra de inclinação do ministro que está falando (antes do voto ser anunciado) é sempre uma estimativa e pode estar errada.
