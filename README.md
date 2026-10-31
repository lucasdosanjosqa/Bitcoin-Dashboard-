# ₿ Dashboard Bitcoin

Painel simples, em uma única página, para acompanhar o preço do Bitcoin: gráfico semanal, gráfico de um período à sua escolha (até 1 ano), cartões de resumo e uma tabela com o histórico dia a dia.

Feito para ser **fácil de entender e de rodar**: não precisa instalar nada, não precisa de chave de API e não tem etapa de build.

## O que o dashboard mostra

- **Preço atual** em dólar, com a variação das últimas 24 horas.
- **Variação semanal:** gráfico dos últimos 7 dias.
- **Variação no período:** gráfico do período escolhido (padrão: 1 ano).
- **Cartões de resumo:** variação em 7 dias, variação no período, preço máximo e preço mínimo.
- **Seletor de período:** botões rápidos (7 dias, 30 dias, 90 dias, 1 ano) ou datas escolhidas à mão, com validação.
- **Dados históricos:** tabela com data, preço e variação diária (verde = alta, vermelho = queda).
- **Tema claro/escuro** automático, de acordo com o seu aparelho, e layout que se adapta ao celular.

## Como usar

1. Baixe os arquivos deste repositório (botão verde **Code → Download ZIP**) e descompacte.
2. Dê dois cliques no arquivo `index.html`. Ele abre no seu navegador.
3. É preciso ter internet, pois os preços e as bibliotecas dos gráficos vêm da web.

> Não é necessário servidor, Node.js ou qualquer instalação.

## Tecnologias

| Peça | O que usa |
|---|---|
| Estrutura, estilo e lógica | HTML, CSS e JavaScript puro |
| Gráficos | [Chart.js](https://www.chartjs.org/) 4.4.1 + `chartjs-adapter-date-fns` 3.0.0 (via CDN, versões fixas) |
| Seletor de datas | Campo de data nativo do navegador |
| Dados | [CoinGecko API](https://www.coingecko.com/en/api) pública, sem chave |

## Estrutura do projeto

```
index.html   Estrutura da página
style.css    Visual (cores, layout, responsivo, modo escuro)
app.js       Lógica: busca de dados, gráficos, cartões, seletor e tabela
plan.md      Plano de desenvolvimento e checklist das etapas
CLAUDE.md    Regras do projeto para o Claude Code
```

## Limites da API gratuita (importante)

- **Histórico de até ~1 ano.** Sem chave, a CoinGecko só entrega cerca de 365 dias. Por isso o dashboard usa no máximo 364 dias, e o seletor não deixa escolher datas mais antigas.
- **Limite de pedidos por minuto.** Se você recarregar muitas vezes seguidas, a API pode recusar os pedidos. Nesse caso aparece um aviso amarelo: espere cerca de 1 minuto e recarregue.
- Para economizar pedidos, as respostas ficam guardadas por 5 minutos no navegador.
- As datas da tabela seguem o horário mundial (UTC), então um dia pode diferir algumas horas do horário de Brasília.

## Desenvolvimento

O passo a passo das decisões e das etapas está em [`plan.md`](plan.md). As convenções do projeto (stack, estilo de código, como testar) estão em [`CLAUDE.md`](CLAUDE.md).

Para conferir o código rapidamente, sem abrir o navegador:

```bash
node --check app.js
```

## Aviso

Este projeto é educacional. Os valores exibidos **não são recomendação de investimento**.

## Fonte dos dados

Dados fornecidos pela [CoinGecko](https://www.coingecko.com/).
