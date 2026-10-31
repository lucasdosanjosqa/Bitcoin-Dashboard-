# CLAUDE.md – Dashboard de Bitcoin

## Sobre o projeto
Dashboard em HTML que mostra o preço do Bitcoin (gráfico semanal, anual, tabela histórica e seletor de datas). Veja `plan.md` para etapas e decisões.

## Como me comunicar (regras do usuário)
- Sempre em **português**.
- O usuário é **profissional não técnico**. A cada etapa, explicar o que está sendo feito como se ele tivesse **15 anos**: frases curtas, analogias, sem jargão. Se um termo técnico for inevitável, explicar na hora.
- Aplicar boas práticas de desenvolvimento no Claude Code.

## Stack (não trocar sem perguntar)
- HTML + CSS + JavaScript puro. **Sem build, sem npm, sem frameworks.**
- Chart.js 4.4.x + `chartjs-adapter-date-fns` por CDN, **sempre com versão fixa** (nunca `@latest`).
- Seletor de datas: `<input type="date">` nativo.
- Dados: CoinGecko API pública (`https://api.coingecko.com/api/v3`), **sem chave**.

## Estrutura
- `index.html` – estrutura da página
- `style.css` – visual (responsivo, claro/escuro)
- `app.js` – lógica
- `plan.md` – plano e checklist de etapas (marcar `[x]` ao concluir)

## Convenções de código
- Funções pequenas, com um único trabalho e nomes claros em português (`buscarPrecos`, `desenharGrafico`...).
- Comentários curtos em português explicando o "porquê".
- Textos da tela em português; datas no formato dd/mm/aaaa; preços em dólar (US$).
- Nunca colocar chaves, senhas ou dados pessoais no código.
- Toda chamada à API deve tratar erro (internet fora, erro 429 de limite) com mensagem amigável.

## Limites da API (importante)
- Sem chave: histórico de no máximo ~365 dias. Validar o seletor de datas para respeitar isso.
- Limite de chamadas por minuto: usar cache em memória e não repetir pedidos iguais.

## Como rodar e testar
- Rodar: abrir `index.html` no navegador (duplo clique). Não precisa de servidor.
- Testar: seguir a seção "Como verificar" do `plan.md` (gráficos, datas inválidas, sem internet, celular, console sem erros).

## Boas práticas de trabalho
- Ler o arquivo antes de editar; fazer mudanças pequenas e verificar o resultado.
- Pedir confirmação antes de ações difíceis de desfazer (apagar, sobrescrever, publicar).
- Uma etapa do `plan.md` por vez; atualizar o checklist ao terminar.
