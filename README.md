# Placar do Plenário — STF (Pet 16.662)

Painel independente e não-oficial que acompanha a sessão do STF de 15/09/2026 sobre abrir ou não investigação contra o ministro Alexandre de Moraes.

- `index.html` — dashboard público. Só lê `data.json` e atualiza sozinho a cada ~12s.
- `admin.html` — painel de controle para atualizar `data.json` manualmente durante a sessão. **Não é linkado no site público** — guarde a URL só com quem for operar.
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
4. Copie o token e cole no campo do `admin.html` (fica salvo só no `localStorage` do seu navegador — nunca é enviado a mais ninguém além da API do GitHub).

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

## Aviso

Este painel não é um produto oficial do STF. Os votos confirmados vêm de atualização manual de quem está assistindo à transmissão; a barra de inclinação do ministro que está falando (antes do voto ser anunciado) é sempre uma estimativa e pode estar errada.
