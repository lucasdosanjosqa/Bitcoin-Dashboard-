# Plano: Dashboard de Bitcoin em HTML

## Objetivo
Um painel simples que mostra o preço do Bitcoin com:
- Gráfico de variação **semanal** (últimos 7 dias)
- Gráfico de variação **anual** (últimos 365 dias)
- Visualização clara dos **dados históricos** (tabela)
- **Seletor de período** (datas) interativo

Prioridades: simplicidade, boa visualização, fácil para iniciantes.

## Stack
| Peça | Escolha | Por quê |
|---|---|---|
| Estrutura/estilo/lógica | HTML + CSS + JavaScript puro | Sem instalar nada; abre com duplo clique |
| Gráficos | Chart.js 4.4.x (CDN, versão fixa) + `chartjs-adapter-date-fns` | Simples, bonito, ótimo para eixos de data |
| Seletor de datas | `<input type="date">` nativo + botões rápidos (7d, 30d, 90d, 1 ano) | Zero biblioteca extra |
| Dados | CoinGecko API pública (sem chave) | Gratuita e sem autenticação |

## API
- Histórico: `GET https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=<unix>&to=<unix>`
- Preço atual: `GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`

**Limites conhecidos:**
- Sem chave, o histórico vai até ~365 dias atrás. Por isso "anual" = últimos 364 dias (1 dia de folga; o botão "1 ano" usa esse valor).
- Há limite de chamadas por minuto (erro 429). Usar cache em memória e mostrar aviso amigável.

## Arquivos
- `index.html` – estrutura da página
- `style.css` – visual responsivo (celular e computador), verde para alta e vermelho para queda
- `app.js` – lógica, em funções pequenas: `buscarPrecos`, `calcularVariacao`, `desenharGrafico`, `preencherTabela`, `tratarErro`
- `plan.md` – este plano
- `CLAUDE.md` – regras do projeto

## Etapas
- [x] 1. Criar `plan.md` e `CLAUDE.md`
- [x] 2. Esqueleto de `index.html` + `style.css` (sem dados)
- [x] 3. `app.js`: preço atual + últimos 7 dias → gráfico semanal
- [x] 4. Gráfico anual (365 dias) + cartões de variação %
- [x] 5. Seletor de datas + botões rápidos (validar: início < fim, máx. 365 dias atrás)
- [x] 6. Tabela histórica (data, preço, variação diária) com rolagem
- [x] 7. Estados de carregando/erro, cache, ajustes visuais e responsivo

## Como verificar
- Abrir `index.html` no navegador: preço atual aparece e os gráficos desenham.
- Trocar datas e botões rápidos: gráficos e tabela mudam.
- Datas inválidas (fim antes do início, mais de 1 ano atrás): mensagem clara.
- Sem internet: aviso na tela, sem quebrar.
- Modo celular do navegador (F12) e console sem erros.
