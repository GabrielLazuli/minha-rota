import { CIDADES_ROTA, DiaTipo, HorarioItem } from "../data/horarios";

export interface OpcaoViagem {
  id: string;
  direta: boolean;
  saidaOrigem: string;
  chegadaHubEstimada?: string;
  saidaHubConexao?: string;
  folgaMinutos?: number;
  statusConexao: "direto" | "tranquilo" | "apertado";
  tagsOrigem: string[];
  tagsDestino: string[];
  isUltimaDoDia: boolean;
  minutosSaida: number;
}

export function horaParaMinutos(hora: string): number {
  const [hh, mm] = hora.split(":").map(Number);
  return hh * 60 + mm;
}

export function minutosParaHora(totalMin: number): string {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const hh = Math.floor(norm / 60)
    .toString()
    .padStart(2, "0");
  const mm = (norm % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function detectarDiaAtual(): DiaTipo {
  const day = new Date().getDay();
  if (day === 0) return "domingo";
  if (day === 6) return "sabado";
  return "seg_sex";
}

function extrairTags(item: HorarioItem): string[] {
  const tags: string[] = [];
  if (item.apenasAulaUesc) tags.push("Dia de aula UESC");
  if (item.executivo) tags.push("Executivo");
  if (item.extra) tags.push("Horário extra");
  if (item.emTransito) tags.push("Em trânsito");
  if (item.obs) tags.push(item.obs);
  return tags;
}

function filtrarLista(
  lista: HorarioItem[],
  dia: DiaTipo,
  aulaUesc: boolean,
): HorarioItem[] {
  const filtrada = lista.filter((item) => {
    if (item.apenasAulaUesc && (!aulaUesc || dia !== "seg_sex")) return false;
    return true;
  });

  // Remove horários duplicados exatos no mesmo minuto, mantendo o regular como prioridade
  const mapa = new Map<string, HorarioItem>();
  for (const item of filtrada) {
    const existente = mapa.get(item.hora);
    if (!existente) {
      mapa.set(item.hora, { ...item });
    } else if (item.apenasAulaUesc && !existente.apenasAulaUesc) {
      continue;
    } else if (!item.apenasAulaUesc && existente.apenasAulaUesc) {
      mapa.set(item.hora, { ...item });
    }
  }
  return Array.from(mapa.values());
}

/**
 * Mescla os ônibus da linha Ilhéus <-> Itabuna quando a origem ou destino for Salobrinho,
 * pois a linha passa pela BR-415 parando no ponto do Salobrinho/UESC.
 */
function obterHorariosComLinhaIlheus(
  cidadeId: string,
  direcao: "idaParaItabuna" | "voltaDeItabuna",
  dia: DiaTipo,
  aulaUesc: boolean,
): HorarioItem[] {
  const base = [...CIDADES_ROTA[cidadeId][direcao][dia]];

  if (cidadeId === "salobrinho") {
    const linhaIlheus = CIDADES_ROTA.ilheus[direcao][dia];
    for (const item of linhaIlheus) {
      // Ilhéus -> Itabuna: sai de Ilhéus e passa no Salobrinho ~15 min depois
      // Itabuna -> Ilhéus: sai de Itabuna no horário da tabela e para no Salobrinho
      const horaNoPonto =
        direcao === "idaParaItabuna"
          ? minutosParaHora(horaParaMinutos(item.hora) + 15)
          : item.hora;

      base.push({
        ...item,
        hora: horaNoPonto,
        obs: item.obs
          ? `Linha Ilhéus • ${item.obs}`
          : "Linha Ilhéus (passa no ponto)",
      });
    }
  }

  base.sort((a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora));
  return filtrarLista(base, dia, aulaUesc);
}

export function calcularRotas(
  origemId: string,
  destinoId: string,
  dia: DiaTipo,
  aulaUesc: boolean,
  margemMinimaConexao = 0,
): { opcoes: OpcaoViagem[]; semConexaoApos?: string } {
  if (origemId === destinoId) return { opcoes: [] };

  const origem = CIDADES_ROTA[origemId];
  const destino = CIDADES_ROTA[destinoId];
  if (!origem || !destino) return { opcoes: [] };

  // Caso 1: Viagem direta para Itabuna (inclui linha Ilhéus se sair do Salobrinho)
  if (destinoId === "itabuna") {
    const saidas = obterHorariosComLinhaIlheus(
      origemId,
      "idaParaItabuna",
      dia,
      aulaUesc,
    );
    const opcoes: OpcaoViagem[] = saidas.map((item, idx) => ({
      id: `${origemId}-itabuna-${item.hora}-${idx}`,
      direta: true,
      saidaOrigem: item.hora,
      statusConexao: "direto",
      tagsOrigem: extrairTags(item),
      tagsDestino: [],
      isUltimaDoDia: idx === saidas.length - 1,
      minutosSaida: horaParaMinutos(item.hora),
    }));
    return { opcoes };
  }

  // Caso 2: Viagem direta saindo de Itabuna (inclui linha Ilhéus se for para o Salobrinho)
  if (origemId === "itabuna") {
    const saidas = obterHorariosComLinhaIlheus(
      destinoId,
      "voltaDeItabuna",
      dia,
      aulaUesc,
    );
    const opcoes: OpcaoViagem[] = saidas.map((item, idx) => ({
      id: `itabuna-${destinoId}-${item.hora}-${idx}`,
      direta: true,
      saidaOrigem: item.hora,
      statusConexao: "direto",
      tagsOrigem: extrairTags(item),
      tagsDestino: [],
      isUltimaDoDia: idx === saidas.length - 1,
      minutosSaida: horaParaMinutos(item.hora),
    }));
    return { opcoes };
  }

  // Caso 3: Linha Itabuna <-> Ilhéus passa direto pelo Salobrinho (sem baldeação em Itabuna)
  const isSalobrinhoIlheus =
    (origemId === "salobrinho" && destinoId === "ilheus") ||
    (origemId === "ilheus" && destinoId === "salobrinho");

  if (isSalobrinhoIlheus) {
    const baseHorarios =
      origemId === "ilheus"
        ? CIDADES_ROTA.ilheus.idaParaItabuna[dia]
        : CIDADES_ROTA.ilheus.voltaDeItabuna[dia];

    // Ônibus saindo de Itabuna para Ilhéus passa no ponto do Salobrinho ~30 min depois
    const ajustePassagemMin = origemId === "salobrinho" ? 30 : 0;
    const saidas = filtrarLista(baseHorarios, dia, aulaUesc);

    const opcoes: OpcaoViagem[] = saidas.map((item, idx) => {
      const minPassagem = horaParaMinutos(item.hora) + ajustePassagemMin;
      const horaPassagem = minutosParaHora(minPassagem);
      const tags = extrairTags(item);
      if (origemId === "salobrinho") {
        tags.unshift(`Sai de Itabuna às ${item.hora} (passa no Salobrinho)`);
      }

      return {
        id: `${origemId}-${destinoId}-${horaPassagem}-${idx}`,
        direta: true,
        saidaOrigem: horaPassagem,
        statusConexao: "direto",
        tagsOrigem: tags,
        tagsDestino: [],
        isUltimaDoDia: idx === saidas.length - 1,
        minutosSaida: minPassagem,
      };
    });

    return { opcoes };
  }

  // Caso 4: Baldeação em Itabuna (Origem -> Itabuna -> Destino)
  const trechos1 = obterHorariosComLinhaIlheus(
    origemId,
    "idaParaItabuna",
    dia,
    aulaUesc,
  );
  const trechos2 = obterHorariosComLinhaIlheus(
    destinoId,
    "voltaDeItabuna",
    dia,
    aulaUesc,
  );

  const resultados: OpcaoViagem[] = [];
  let primeiroSemConexao: string | undefined;

  for (let i = 0; i < trechos1.length; i++) {
    const t1 = trechos1[i];
    const minSaida1 = horaParaMinutos(t1.hora);
    const minChegadaHub = minSaida1 + origem.tempoAteItabunaMin;

    const conexao = trechos2.find((t2) => {
      const minSaida2 = horaParaMinutos(t2.hora);
      return minSaida2 >= minChegadaHub + margemMinimaConexao;
    });

    if (!conexao) {
      if (!primeiroSemConexao) primeiroSemConexao = t1.hora;
      continue;
    }

    const minSaida2 = horaParaMinutos(conexao.hora);
    const folga = minSaida2 - minChegadaHub;

    resultados.push({
      id: `${origemId}-${destinoId}-${t1.hora}-${conexao.hora}-${i}`,
      direta: false,
      saidaOrigem: t1.hora,
      chegadaHubEstimada: minutosParaHora(minChegadaHub),
      saidaHubConexao: conexao.hora,
      folgaMinutos: folga,
      statusConexao: folga >= 10 ? "tranquilo" : "apertado",
      tagsOrigem: extrairTags(t1),
      tagsDestino: extrairTags(conexao),
      isUltimaDoDia: false,
      minutosSaida: minSaida1,
    });
  }

  if (resultados.length > 0) {
    resultados[resultados.length - 1].isUltimaDoDia = true;
  }

  return { opcoes: resultados, semConexaoApos: primeiroSemConexao };
}
