// Dashboard Bitcoin - lógica da página
// Preço atual, gráficos, cartões de resumo, seletor de período e tabela histórica

const API = "https://api.coingecko.com/api/v3";

// Guarda pedidos já feitos para não repetir (a API limita chamadas por minuto)
const cache = new Map();

// ---------- Ajudantes pequenos ----------

// Atalho para pegar um elemento da página pelo id
const el = (id) => document.getElementById(id);

// 1234.5 -> "US$ 1.234,50"
function formatarDolar(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "USD" });
}

// Mostra uma mensagem amigável no aviso amarelo (texto vazio esconde o aviso)
function mostrarAviso(texto) {
  const aviso = el("aviso");
  aviso.textContent = texto;
  aviso.hidden = !texto;
}

// Liga/desliga o modo "carregando": mostra o aviso, esmaece a tela e trava os botões
function definirCarregando(ligado) {
  el("carregando").hidden = !ligado;
  document.body.classList.toggle("ocupado", ligado);
  document.querySelectorAll("button").forEach((botao) => { botao.disabled = ligado; });
}

// Roda uma tarefa mostrando "carregando" e, aconteça o que acontecer, volta ao normal no fim
async function comCarregando(tarefa) {
  definirCarregando(true);
  try {
    await tarefa();
  } finally {
    definirCarregando(false);
  }
}

// Erros de conexão: se um pedido falhou assim, os próximos tendem a falhar também
const ERROS_DE_CONEXAO = ["LIMITE", "OFFLINE", "REDE"];

// Traduz o erro técnico para uma frase que qualquer pessoa entende.
// Devolve true se foi um erro de conexão (para quem chamou parar de insistir)
function tratarErro(erro) {
  console.error(erro);
  switch (erro.message) {
    case "LIMITE":
      mostrarAviso("Muitos pedidos em pouco tempo. Aguarde cerca de 1 minuto e recarregue a página.");
      break;
    case "OFFLINE":
      mostrarAviso("Você está sem internet. Confira a conexão e recarregue a página.");
      break;
    case "SEM_GRAFICO":
      mostrarAviso("Não consegui carregar a biblioteca dos gráficos (ela vem de um site externo). Confira a internet e recarregue a página.");
      break;
    case "Resposta inesperada":
      mostrarAviso("A API mandou uma resposta diferente do esperado. Tente de novo em alguns minutos.");
      break;
    default:
      // Quando a API recusa por excesso de pedidos, o navegador não consegue ler o motivo:
      // por isso a mensagem cita as duas possibilidades
      mostrarAviso("Não consegui buscar os dados. Pode ser falha na conexão ou o limite de pedidos da API gratuita. Aguarde 1 minuto e recarregue a página.");
  }
  return ERROS_DE_CONEXAO.includes(erro.message);
}

// O Chart.js vem de um site externo (CDN): pode não ter carregado
function graficosDisponiveis() {
  return typeof Chart !== "undefined";
}

// ---------- Busca de dados ----------

// Faz o pedido à API e guarda a resposta no cache.
// "formatoOk" confere se a resposta tem a forma esperada ANTES de guardar:
// assim uma resposta quebrada nunca fica presa no cache
async function buscarJson(url, formatoOk) {
  const confere = (dados) => dados != null && formatoOk(dados);

  if (cache.has(url)) return cache.get(url);

  // Cache salvo no navegador: sobrevive a recarregar a página
  const salvo = lerCacheSalvo(url);
  if (confere(salvo)) {
    cache.set(url, salvo);
    return salvo;
  }

  let resposta;
  try {
    resposta = await fetch(url);
  } catch (e) {
    // fetch só falha assim quando não consegue falar com o servidor
    throw new Error(navigator.onLine === false ? "OFFLINE" : "REDE");
  }
  if (resposta.status === 429) throw new Error("LIMITE");
  if (!resposta.ok) throw new Error("HTTP " + resposta.status);

  let dados;
  try {
    dados = await resposta.json();
  } catch (e) {
    throw new Error("Resposta inesperada");
  }
  if (!confere(dados)) throw new Error("Resposta inesperada");

  cache.set(url, dados);
  guardarCacheSalvo(url, dados);
  return dados;
}

// Respostas guardadas por 5 minutos (try/catch: o navegador pode bloquear o armazenamento)
const VALIDADE_CACHE_MS = 5 * 60 * 1000;

function lerCacheSalvo(url) {
  try {
    const item = JSON.parse(sessionStorage.getItem("btc:" + url));
    if (item && Date.now() - item.quando < VALIDADE_CACHE_MS) return item.dados;
  } catch (e) { /* sem cache salvo, segue sem ele */ }
  return null;
}

function guardarCacheSalvo(url, dados) {
  try {
    sessionStorage.setItem("btc:" + url, JSON.stringify({ quando: Date.now(), dados }));
  } catch (e) { /* sem espaço ou bloqueado: tudo bem */ }
}

// Preço atual e variação das últimas 24 horas
async function buscarPrecoAtual() {
  const url = `${API}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`;
  // Se a API mandar algo diferente do esperado, avisa em vez de quebrar no meio
  const dados = await buscarJson(url, (d) => d.bitcoin && typeof d.bitcoin.usd === "number");
  // A variação pode faltar: nesse caso fica null e a tela mostra "--"
  return { preco: dados.bitcoin.usd, variacao24h: dados.bitcoin.usd_24h_change ?? null };
}

// Preços entre duas datas (datas em milissegundos). Devolve [[tempo, preço], ...]
async function buscarPrecos(deMs, ateMs) {
  // A API usa segundos. Arredondo para blocos de 5 min: assim o mesmo período
  // gera o mesmo endereço e o cache funciona (senão cada milissegundo seria "novo")
  const BLOCO = 300;
  const de = Math.floor(deMs / 1000 / BLOCO) * BLOCO;
  const ate = Math.floor(ateMs / 1000 / BLOCO) * BLOCO;
  const url = `${API}/coins/bitcoin/market_chart/range?vs_currency=usd&from=${de}&to=${ate}`;
  const dados = await buscarJson(url, (d) => Array.isArray(d.prices));
  return dados.prices;
}

// ---------- Mostrar na tela ----------

// Preenche o topo da página com o preço e a variação de 24h
function mostrarPrecoAtual({ preco, variacao24h }) {
  el("preco-atual").textContent = formatarDolar(preco);

  const campo = el("variacao-24h");
  if (variacao24h == null) {
    campo.textContent = "-- (24h)";
    campo.className = "variacao";
    return;
  }
  const sinal = variacao24h >= 0 ? "+" : "";
  campo.textContent = `${sinal}${variacao24h.toFixed(2)}% (24h)`;
  campo.className = "variacao " + (variacao24h >= 0 ? "alta" : "queda");
}

// Quanto o preço mudou, em %, do primeiro ao último ponto da lista.
// Com menos de 2 pontos não dá para comparar: devolve null
function calcularVariacao(precos) {
  if (precos.length < 2) return null;
  const primeiro = precos[0][1];
  const ultimo = precos[precos.length - 1][1];
  return ((ultimo - primeiro) / primeiro) * 100;
}

// Escreve uma porcentagem num cartão, com cor de alta/queda
function mostrarVariacaoNoCartao(idCartao, variacao) {
  const campo = el(idCartao);
  if (variacao == null) {
    campo.textContent = "--";
    campo.className = "";
    return;
  }
  const sinal = variacao >= 0 ? "+" : "";
  campo.textContent = `${sinal}${variacao.toFixed(2)}%`;
  campo.className = variacao >= 0 ? "alta" : "queda";
}

// Preenche os cartões de máxima e mínima do período
function mostrarMaximaEMinima(precos) {
  const valores = precos.map(([, valor]) => valor);
  el("cartao-max").textContent = formatarDolar(Math.max(...valores));
  el("cartao-min").textContent = formatarDolar(Math.min(...valores));
}

// A API pode mandar vários pontos por dia. Fico com o último preço de cada dia.
// Uso o dia em UTC (horário mundial) para a data bater com os dados da API.
// Devolve [["2026-10-30", 71000], ["2026-10-31", 72000], ...] em ordem de data
function agruparPorDia(precos) {
  const porDia = new Map();
  for (const [tempo, valor] of precos) {
    porDia.set(new Date(tempo).toISOString().slice(0, 10), valor);
  }
  return [...porDia.entries()];
}

// Monta uma célula (<td>) com texto e, se quiser, uma classe de cor
function criarCelula(texto, classe) {
  const celula = document.createElement("td");
  celula.textContent = texto;
  if (classe) celula.className = classe;
  return celula;
}

// Preenche a tabela de dados históricos (dia mais recente primeiro)
function preencherTabela(precos) {
  const dias = agruparPorDia(precos);
  const linhas = [];

  dias.forEach(([dia, preco], i) => {
    const celulaVariacao = i === 0
      ? criarCelula("--")  // o primeiro dia não tem dia anterior para comparar
      : (() => {
          const variacao = ((preco - dias[i - 1][1]) / dias[i - 1][1]) * 100;
          const sinal = variacao >= 0 ? "+" : "";
          return criarCelula(`${sinal}${variacao.toFixed(2)}%`, variacao >= 0 ? "alta" : "queda");
        })();

    const linha = document.createElement("tr");
    linha.append(criarCelula(formatarDataBR(dia)), criarCelula(formatarDolar(preco)), celulaVariacao);
    linhas.push(linha);
  });

  el("tabela-corpo").replaceChildren(...linhas.reverse());
}

let graficoSemanal = null; // guardados para poder redesenhar depois
let graficoAnual = null;

// Desenha (ou redesenha) o gráfico de linha do preço
function desenharGrafico(idCanvas, precos, graficoAntigo) {
  if (!graficosDisponiveis()) throw new Error("SEM_GRAFICO");
  if (graficoAntigo) graficoAntigo.destroy();

  const estilo = getComputedStyle(document.documentElement);
  const corTexto = estilo.getPropertyValue("--texto-suave").trim();
  const corBorda = estilo.getPropertyValue("--borda").trim();
  const corLinha = estilo.getPropertyValue("--destaque").trim();

  return new Chart(el(idCanvas), {
    type: "line",
    data: {
      datasets: [{
        label: "Preço (US$)",
        data: precos.map(([tempo, valor]) => ({ x: tempo, y: valor })),
        borderColor: corLinha,
        backgroundColor: corLinha + "22",
        fill: true,
        pointRadius: 0,   // sem bolinhas: linha limpa
        borderWidth: 2,
        tension: 0.2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => formatarDolar(item.parsed.y) } },
      },
      scales: {
        x: { type: "time", ticks: { color: corTexto, maxTicksLimit: 7 }, grid: { color: corBorda } },
        y: { ticks: { color: corTexto, callback: (v) => formatarDolar(v) }, grid: { color: corBorda } },
      },
    },
  });
}

// ---------- Seletor de período ----------

const DIA_MS = 24 * 60 * 60 * 1000;
// 364 dias (e não 365) para ficar com folga dentro do limite da API gratuita
const DIAS_MAXIMOS = 364;
// O botão "1 ano" tem data-dias="365", mas na prática busca DIAS_MAXIMOS
const DIAS_DO_BOTAO_ANO = 365;

// Date -> "2026-10-31" (usa o dia local, para o campo de data entender)
function paraCampoData(data) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// "2026-10-31" -> 31/10/2026
function formatarDataBR(textoCampo) {
  const [ano, mes, dia] = textoCampo.split("-");
  return `${dia}/${mes}/${ano}`;
}

// A data de "n" dias atrás (conta por dia do calendário, sem errar em mudança de horário)
function diasAtras(data, n) {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() - n);
  return resultado;
}

// Limites do que o usuário pode escolher: de 364 dias atrás até hoje
function calcularLimites(hoje) {
  return { minimo: paraCampoData(diasAtras(hoje, DIAS_MAXIMOS)), maximo: paraCampoData(hoje) };
}

// Põe os limites nos campos de data. Chamada de novo a cada "Aplicar",
// porque a página pode ficar aberta de um dia para o outro
function atualizarLimitesDosCampos() {
  const { minimo, maximo } = calcularLimites(new Date());
  for (const id of ["data-inicio", "data-fim"]) {
    el(id).min = minimo;
    el(id).max = maximo;
  }
}

// Confere as datas. Devolve uma frase de erro, ou "" se estiver tudo certo.
// Não olha a tela: recebe tudo por parâmetro, o que facilita testar
function validarPeriodo(inicio, fim, { minimo, maximo }) {
  if (!inicio || !fim) return "Escolha a data inicial e a final.";
  if (inicio > fim) return "A data inicial precisa ser antes da data final.";
  if (inicio < minimo)
    return `Só consigo mostrar os últimos ${DIAS_MAXIMOS} dias (a partir de ${formatarDataBR(minimo)}).`;
  if (fim > maximo) return "A data final não pode ser no futuro.";
  return "";
}

// Quando não há dados para mostrar, limpa a área do período.
// Assim não sobra gráfico e tabela de um período diferente do escolhido
function limparPeriodo() {
  if (graficoAnual) graficoAnual.destroy();
  graficoAnual = null;
  mostrarVariacaoNoCartao("cartao-1a", null);
  el("cartao-max").textContent = "--";
  el("cartao-min").textContent = "--";
  el("tabela-corpo").replaceChildren();
  el("titulo-periodo").textContent = "Sem dados para o período escolhido";
}

// Busca o período e atualiza o gráfico, os cartões e os títulos.
// Os campos de data só mudam depois que a busca dá certo (se falhar, a tela
// continua mostrando o período antigo por inteiro, sem misturar)
async function mostrarPeriodo(inicio, fim) {
  const deMs = new Date(inicio + "T00:00:00").getTime();
  // Fim do dia escolhido, mas nunca depois de "agora"
  const ateMs = Math.min(new Date(fim + "T23:59:59").getTime(), Date.now());

  const precos = await buscarPrecos(deMs, ateMs);
  el("data-inicio").value = inicio;
  el("data-fim").value = fim;

  if (precos.length < 2) {
    limparPeriodo();
    mostrarAviso("Não há dados suficientes nesse período. Tente um período maior.");
    return;
  }

  graficoAnual = desenharGrafico("grafico-anual", precos, graficoAnual);
  mostrarVariacaoNoCartao("cartao-1a", calcularVariacao(precos));
  mostrarMaximaEMinima(precos);
  preencherTabela(precos);
  el("titulo-periodo").textContent = `Variação de ${formatarDataBR(inicio)} a ${formatarDataBR(fim)}`;
}

// Marca visualmente qual botão rápido está ativo (nenhum, se for data manual)
function marcarBotaoAtivo(dias) {
  document.querySelectorAll(".botoes-rapidos button").forEach((botao) => {
    botao.classList.toggle("ativo", Number(botao.dataset.dias) === dias);
  });
}

// Botões rápidos: "últimos N dias"
async function aplicarPeriodoEmDias(dias) {
  const hoje = new Date();
  await mostrarPeriodo(paraCampoData(diasAtras(hoje, dias)), paraCampoData(hoje));
}

// Botão "Aplicar": usa as datas digitadas
async function aplicarPeriodoDasDatas() {
  // Atualiza o "hoje" antes de conferir (a página pode ter ficado aberta desde ontem)
  atualizarLimitesDosCampos();
  const inicio = el("data-inicio").value;
  const fim = el("data-fim").value;
  const erro = validarPeriodo(inicio, fim, calcularLimites(new Date()));
  if (erro) {
    mostrarAviso(erro);
    return;
  }
  mostrarAviso("");
  try {
    await comCarregando(() => mostrarPeriodo(inicio, fim));
    marcarBotaoAtivo(null); // datas escolhidas à mão: nenhum botão rápido fica ativo
  } catch (e) {
    tratarErro(e);
  }
}

// Liga os botões e campos às funções acima
function ligarSeletor() {
  atualizarLimitesDosCampos();

  document.querySelectorAll(".botoes-rapidos button").forEach((botao) => {
    botao.addEventListener("click", async () => {
      mostrarAviso("");
      try {
        // "1 ano" usa o máximo permitido pela API
        const dias = Math.min(Number(botao.dataset.dias), DIAS_MAXIMOS);
        await comCarregando(() => aplicarPeriodoEmDias(dias));
        marcarBotaoAtivo(Number(botao.dataset.dias));
      } catch (e) {
        tratarErro(e);
      }
    });
  });

  el("botao-aplicar").addEventListener("click", aplicarPeriodoDasDatas);
}

// ---------- Início ----------

// Cada parte da página tem o seu próprio try/catch: se uma falhar,
// as outras continuam aparecendo (só a que falhou mostra o aviso).
// Cada uma devolve false se o erro foi de conexão: aí não vale insistir nas próximas
async function carregarPrecoAtual() {
  try {
    mostrarPrecoAtual(await buscarPrecoAtual());
    return true;
  } catch (erro) {
    return !tratarErro(erro);
  }
}

async function carregarSemana() {
  const agora = Date.now();
  try {
    const precosSemana = await buscarPrecos(agora - 7 * DIA_MS, agora);
    if (precosSemana.length < 2) {
      mostrarAviso("Não há dados suficientes para o gráfico da semana.");
      return true;
    }
    graficoSemanal = desenharGrafico("grafico-semanal", precosSemana, graficoSemanal);
    mostrarVariacaoNoCartao("cartao-7d", calcularVariacao(precosSemana));
    return true;
  } catch (erro) {
    return !tratarErro(erro);
  }
}

async function carregarPeriodoInicial() {
  try {
    // Começa com o máximo permitido (quase 1 ano), que é o botão "1 ano"
    await aplicarPeriodoEmDias(DIAS_MAXIMOS);
    marcarBotaoAtivo(DIAS_DO_BOTAO_ANO);
  } catch (erro) {
    tratarErro(erro);
  }
}

async function iniciar() {
  mostrarAviso("");
  // Um de cada vez (e não todos juntos) para não estourar o limite de pedidos da API.
  // Se um falhar por conexão, para: insistir só piora o limite
  if (!(await carregarPrecoAtual())) return;
  if (!graficosDisponiveis()) {
    tratarErro(new Error("SEM_GRAFICO"));
    return;
  }
  if (!(await carregarSemana())) return;
  await carregarPeriodoInicial();
}

ligarSeletor();
comCarregando(iniciar);
