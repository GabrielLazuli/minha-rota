import { Download } from "lucide-react"; // junte aos outros ícones já importados
import { Capacitor } from "@capacitor/core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Bus,
  Clock,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Tag,
} from "lucide-react";
import { CIDADES_ROTA, DiaTipo } from "./data/horarios";
import {
  calcularRotas,
  detectarDiaAtual,
  minutosParaHora,
  OpcaoViagem,
} from "./utils/planner";

const LISTA_CIDADES = Object.values(CIDADES_ROTA);
type ModoLista = "proxima" | "ultima" | "todas";

const rotuloTag = (tag: string) => {
  const rotulos: Record<string, string> = {
    "Dia de aula UESC": "Horário UESC",
    "Horário extra": "Horário extra",
    "Em trânsito": "Em trânsito",
  };
  return rotulos[tag] || tag.split(/\s+/).slice(0, 2).join(" ");
};

export default function App() {
  const [origemId, setOrigemId] = useState<string>("salobrinho");
  const [destinoId, setDestinoId] = useState<string>("buerarema");
  const [dia, setDia] = useState<DiaTipo>(() => detectarDiaAtual());
  const [aulaUesc, setAulaUesc] = useState<boolean>(true);
  const [destaqueId, setDestaqueId] = useState<string | null>(null);
  const [avisoTopo, setAvisoTopo] = useState<string | null>(null);
  const [modoLista, setModoLista] = useState<ModoLista>("proxima");
  const [agoraMinutos, setAgoraMinutos] = useState(() => {
    const agora = new Date();
    return agora.getHours() * 60 + agora.getMinutes();
  });

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { opcoes } = useMemo(
    () => calcularRotas(origemId, destinoId, dia, aulaUesc, 0),
    [origemId, destinoId, dia, aulaUesc],
  );

  const ultimaOpcao = useMemo(
    () => (opcoes.length > 0 ? opcoes[opcoes.length - 1] : null),
    [opcoes],
  );

  const proximaOpcaoAgora = useMemo(() => {
    if (opcoes.length === 0) return null;
    return opcoes.find((op) => op.minutosSaida >= agoraMinutos) || null;
  }, [opcoes, agoraMinutos]);

  const rotasVisiveis =
    modoLista === "todas"
      ? opcoes
      : modoLista === "ultima"
      ? ultimaOpcao
        ? [ultimaOpcao]
        : []
      : proximaOpcaoAgora
      ? [proximaOpcaoAgora]
      : [];
  const diaEhHoje = dia === detectarDiaAtual();

  useEffect(() => {
    const atualizarRelogio = () => {
      const agora = new Date();
      setAgoraMinutos(agora.getHours() * 60 + agora.getMinutes());
    };
    const intervalo = window.setInterval(atualizarRelogio, 30_000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!destaqueId) return;
    cardRefs.current[destaqueId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [destaqueId, modoLista]);

  const inverterSentido = () => {
    setOrigemId(destinoId);
    setDestinoId(origemId);
    setDestaqueId(null);
    setAvisoTopo(null);
    setModoLista("proxima");
  };

  const focarCard = (
    opcao: OpcaoViagem | null,
    mensagemFallback?: string,
    modoAlvo?: ModoLista,
  ) => {
    if (modoAlvo) setModoLista(modoAlvo);
    if (!opcao) {
      setAvisoTopo(
        mensagemFallback ||
          "Não há mais ônibus com conexão hoje para este trajeto.",
      );
      setDestaqueId(null);
      return;
    }
    setAvisoTopo(null);
    setDestaqueId(opcao.id);
    if (!modoAlvo && !rotasVisiveis.some((rota) => rota.id === opcao.id)) {
      setModoLista("todas");
    }
  };

  const envolveSalobrinho =
    origemId === "salobrinho" || destinoId === "salobrinho";
  const origemObj = CIDADES_ROTA[origemId];
  const destinoObj = CIDADES_ROTA[destinoId];

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* Header estilo Rota */}
      <header className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900 text-white px-4 pt-5 pb-7 shadow-md">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-400 text-purple-950 p-2 rounded-xl shadow-sm">
                <Bus className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">
                Minha Rota
              </h1>
            </div>
          </div>

          {/* Seletor Origem / Destino */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3 space-y-2.5">
            <div>
              <label className="block text-xs text-purple-200 font-semibold mb-1">
                De
              </label>
              <select
                value={origemId}
                onChange={(e) => {
                  const novo = e.target.value;
                  if (novo === destinoId) setDestinoId(origemId);
                  setOrigemId(novo);
                  setDestaqueId(null);
                  setModoLista("proxima");
                }}
                className="w-full bg-white text-slate-900 font-semibold text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {LISTA_CIDADES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id === "itabuna" ? c.curto : c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center relative z-10 translate-y-2">
              <button
                type="button"
                onClick={inverterSentido}
                title="Inverter origem e destino"
                className="bg-amber-400 hover:bg-amber-300 active:scale-95 transition text-purple-950 font-bold text-xs px-3 py-1.5 rounded-full shadow flex items-center gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Inverter
              </button>
            </div>

            <div>
              <label className="block text-xs text-purple-200 font-semibold mb-1">
                Para
              </label>
              <select
                value={destinoId}
                onChange={(e) => {
                  const novo = e.target.value;
                  if (novo === origemId) setOrigemId(destinoId);
                  setDestinoId(novo);
                  setDestaqueId(null);
                  setModoLista("proxima");
                }}
                className="w-full bg-white text-slate-900 font-semibold text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {LISTA_CIDADES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id === "itabuna" ? c.curto : c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        {/* Filtros de Dia e Aula UESC */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 space-y-3">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: "seg_sex", label: "Seg a Sex" },
              { id: "sabado", label: "Sábado" },
              { id: "domingo", label: "Dom / Fer" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDia(tab.id as DiaTipo);
                  setDestaqueId(null);
                  setAvisoTopo(null);
                  setModoLista("proxima");
                }}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  dia === tab.id
                    ? "bg-purple-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {envolveSalobrinho && dia === "seg_sex" && (
            <label className="flex items-center justify-between pt-1 cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-800">
                  Período letivo UESC (extras)
                </span>
              </div>
              <input
                type="checkbox"
                checked={aulaUesc}
                onChange={(e) => {
                  setAulaUesc(e.target.checked);
                  setModoLista("proxima");
                }}
                className="w-5 h-5 accent-purple-900 rounded cursor-pointer"
              />
            </label>
          )}
        </section>

        {/* Botões Rápidos: Próxima Rota vs Última Rota */}
        <section className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() =>
              focarCard(
                proximaOpcaoAgora,
                "Já passou o último horário de hoje! Veja as opções para amanhã.",
                "proxima",
              )
            }
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition text-white rounded-2xl p-3.5 text-left shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-sm leading-tight">
                Próxima rota
              </div>
              <div className="text-lg font-extrabold tabular-nums text-emerald-50 mt-1">
                {proximaOpcaoAgora
                  ? proximaOpcaoAgora.saidaOrigem
                  : "Encerrado"}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => focarCard(ultimaOpcao, undefined, "ultima")}
            className="bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition text-white rounded-2xl p-3.5 text-left shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-sm leading-tight">
                Última do dia
              </div>
              <div className="text-lg font-extrabold tabular-nums text-rose-50 mt-1">
                {ultimaOpcao?.saidaOrigem || "Sem opção"}
              </div>
            </div>
          </button>
        </section>

        {/* Aviso se usuário clicar em Próxima Rota após o último horário */}
        {avisoTopo && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{avisoTopo}</span>
          </div>
        )}

        {/* Lista de Horários */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {modoLista === "todas"
                ? `${opcoes.length} ${
                    opcoes.length === 1
                      ? "opção encontrada"
                      : "opções encontradas"
                  }`
                : modoLista === "ultima"
                ? "Última rota do dia"
                : proximaOpcaoAgora
                ? "Próxima rota"
                : "Sem próximas saídas hoje"}
            </h2>
            <span className="text-[11px] text-slate-400">
              {origemObj.curto} → {destinoObj.curto}
            </span>
          </div>

          {opcoes.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                setModoLista(modoLista === "todas" ? "proxima" : "todas");
                setDestaqueId(null);
              }}
              className="w-full bg-white border border-purple-200 text-purple-900 hover:bg-purple-50 font-semibold text-sm rounded-xl py-2.5 transition"
            >
              {modoLista === "todas"
                ? "Mostrar apenas a próxima rota"
                : "Ver todas as rotas"}
            </button>
          ) : null}

          {opcoes.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma conexão encontrada para este filtro.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tente ativar "Dias de aula na UESC" ou alterar o dia da semana.
              </p>
            </div>
          ) : rotasVisiveis.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">
                Não há mais saídas hoje para este trajeto.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => focarCard(ultimaOpcao, undefined, "ultima")}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                >
                  Ver última rota de hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoLista("todas");
                    setDestaqueId(null);
                  }}
                  className="rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-900 transition hover:bg-purple-50"
                >
                  Ver todas as rotas
                </button>
              </div>
            </div>
          ) : (
            rotasVisiveis.map((op) => {
              const destacado = destaqueId === op.id;
              const encerrada = diaEhHoje && op.minutosSaida < agoraMinutos;
              const proxima = diaEhHoje && proximaOpcaoAgora?.id === op.id;
              const destaqueUltima =
                modoLista === "ultima" && op.id === ultimaOpcao?.id;
              const chegadaEstimada = op.direta
                ? minutosParaHora(
                    op.minutosSaida +
                      (destinoId === "itabuna"
                        ? origemObj.tempoAteItabunaMin
                        : destinoObj.tempoAteItabunaMin),
                  )
                : null;
              return (
                <React.Fragment key={op.id}>
                  {modoLista === "todas" &&
                    diaEhHoje &&
                    proxima &&
                    opcoes.some((rota) => rota.minutosSaida < agoraMinutos) && (
                      <div className="flex items-center gap-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        <span className="h-px flex-1 bg-emerald-200" />
                        Próximos horários
                        <span className="h-px flex-1 bg-emerald-200" />
                      </div>
                    )}
                  <div
                    ref={(el) => {
                      cardRefs.current[op.id] = el;
                    }}
                    className={`rounded-2xl p-3.5 border transition-all ${
                      encerrada && !destaqueUltima
                        ? "bg-slate-100 opacity-60"
                        : "bg-white"
                    } ${
                      destaqueUltima
                        ? "border-rose-500 ring-2 ring-rose-500/30 shadow-md"
                        : destacado
                        ? "border-purple-700 ring-2 ring-purple-600/30 shadow-md animate-route-highlight"
                        : encerrada
                        ? "border-slate-300 shadow-sm"
                        : op.isUltimaDoDia
                        ? "border-rose-300 shadow-sm"
                        : "border-slate-200/90 shadow-sm"
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      {proxima && (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold tracking-wide text-emerald-800">
                          PRÓXIMO
                        </span>
                      )}
                      {encerrada && (
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold tracking-wide text-slate-700">
                          ENCERRADA
                        </span>
                      )}
                      {op.isUltimaDoDia && (
                        <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold tracking-wide text-rose-800">
                          ÚLTIMA DO DIA
                        </span>
                      )}
                    </div>

                    {op.direta ? (
                      <>
                        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-900">
                          <MapPin className="h-3.5 w-3.5" />
                          Direto
                        </div>
                        <div className="grid grid-cols-[16px_1fr]">
                          <div
                            className="flex flex-col items-center pt-1.5"
                            aria-hidden="true"
                          >
                            <span className="h-3 w-3 shrink-0 rounded-full border-2 border-purple-700 bg-white" />
                            <span className="w-px flex-1 bg-slate-300" />
                          </div>
                          <div className="pb-3">
                            <span className="block text-sm font-bold text-slate-900">
                              {origemObj.curto}
                            </span>
                            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-purple-950">
                              {op.saidaOrigem}
                            </span>
                          </div>

                          <div
                            className="flex justify-center pt-1"
                            aria-hidden="true"
                          >
                            <span className="h-3 w-3 rounded-full border-2 border-slate-400 bg-white" />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                            <span className="text-sm font-bold text-slate-900">
                              {destinoObj.curto}
                            </span>
                            <span className="text-xs font-medium tabular-nums text-slate-600">
                              ~{chegadaEstimada}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-[16px_1fr]">
                        <div
                          className="flex flex-col items-center pt-1.5"
                          aria-hidden="true"
                        >
                          <span className="h-3 w-3 shrink-0 rounded-full border-2 border-purple-700 bg-white" />
                          <span className="w-px flex-1 bg-slate-300" />
                        </div>
                        <div className="pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {origemObj.curto}
                            </span>
                          </div>
                          <span className="text-2xl font-extrabold tabular-nums tracking-tight text-purple-950">
                            {op.saidaOrigem}
                          </span>
                        </div>

                        <div
                          className="flex flex-col items-center pt-1.5"
                          aria-hidden="true"
                        >
                          <span className="h-3 w-3 shrink-0 rounded-full border-2 border-amber-500 bg-white" />
                          <span className="w-px flex-1 bg-slate-300" />
                        </div>
                        <div className="pb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900">
                              Itabuna
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">
                              Baldeação
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                              <Clock className="h-3 w-3" />
                              Chegada ~{op.chegadaHubEstimada}
                            </span>
                            {typeof op.folgaMinutos === "number" && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  op.statusConexao === "tranquilo"
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                {op.statusConexao === "tranquilo" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3" />
                                )}
                                +{op.folgaMinutos} min
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              2º ônibus
                            </span>
                            <span className="text-xl font-extrabold tabular-nums tracking-tight text-purple-950">
                              {op.saidaHubConexao}
                            </span>
                          </div>
                        </div>

                        <div
                          className="flex justify-center pt-1.5"
                          aria-hidden="true"
                        >
                          <span className="h-3 w-3 rounded-full border-2 border-slate-400 bg-white" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {destinoObj.curto}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tags Extras (Aula UESC, Estiva, Executivo, etc.) */}
                    {(op.tagsOrigem.length > 0 ||
                      op.tagsDestino.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2.5">
                        {op.tagsOrigem.map((tag, idx) => (
                          <span
                            key={`o-${idx}`}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-800"
                          >
                            <Tag className="h-3 w-3 shrink-0" />
                            {rotuloTag(tag)}
                          </span>
                        ))}
                        {op.tagsDestino.map((tag, idx) => (
                          <span
                            key={`d-${idx}`}
                            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-800"
                          >
                            <Tag className="h-3 w-3 shrink-0" />
                            {rotuloTag(tag)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </section>
        {/* Botão para baixar o APK Android (exibido apenas na versão web) */}
        {!Capacitor.isNativePlatform() && (
          <a
            href="https://drive.google.com/file/d/1WyMZqOFs6dof9Ocs_jILMa_ovJw0hYd5/view?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-purple-900 hover:bg-purple-950 active:scale-[0.98] transition text-white font-bold text-xs py-3.5 px-4 rounded-2xl shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Baixar app para Android (.APK)
          </a>
        )}
        {/* Rodapé informativo */}
        <footer className="text-center text-[10px] text-slate-500">
          Tabelas Rota ({origemObj.vigencia} / {destinoObj.vigencia}) • Sujeito
          a alterações
        </footer>
      </main>
    </div>
  );
}
