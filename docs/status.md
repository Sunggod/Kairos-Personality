# Status — Kairos-Personality

Andamento, handoff e registro de gate. **O roadmap é a especificação e não é editado para
registrar andamento; este arquivo é.** Todo agente lê isto primeiro e atualiza ao terminar a
sessão.

Atualizado em: 2026-11-21 · por: sessão de planejamento (nenhum código existe ainda)

---

## Onde estamos

- **Fase em curso:** nenhuma. Documentação pronta: `estudo-arquitetura.md` (v3.2),
  `roadmap.md` (F0–F7, spikes S1–S9, temas transversais), `AGENTS.md` e skills.
- **Próxima ação:** abrir a **F0**, começando pelo **S7** (hardening do runtime), que decide
  qual build do `llama-server` o manifesto de pins vai fixar. Em paralelo, e sem depender de
  nada: **S5** (modelo) e o que o responsável precisar julgar cedo (S1/S2).
- **Bloqueado por:** nada para a F0 até a F5. Pendências 1 e 3 só antes da F6a e da F6c.

---

## Pendências do responsável (bloqueiam ou condicionam agentes)

**Triagem de 2026-11-21: nada aqui bloqueia a F0 até a F5.** O agente pode começar já. As
pendências 1, 3 e 8 só importam mais adiante e ficam adiadas com a fase indicada; as 2, 4 e 6
foram dispensadas; as 5, 7 e 9 foram resolvidas com o padrão descrito na linha.

| # | Pendência | Bloqueia | Origem |
|---|---|---|---|
| 1 | **[Adiada: só antes da F6a]** **Homologar as revisões v3.1 e v3.2 do estudo** (Akame, D16, Q14, D17, Q15, S9, R28, R29, D7/D10/Q5 revisados) — estão "sem registro de homologação" | F6a, F6b, F6c e S9 | estudo, cabeçalho |
| 2 | **[Dispensada: não bloqueia; o agente corrige resíduo de Live2D que encontrar, com nota no estudo]** **Revisar as menções de Live2D que ficaram desatualizadas** no estudo: confirmadas no §0 (linha do D7), no §1 e no D17 item 1; a busca acusa 13 ocorrências fora do §13, várias legítimas (histórico em §8.1/§8.3/Q4). Falta separar o que é histórico do que é resíduo | consistência do estudo | verificação em 2026-11-21 |
| 3 | **[Adiada: só antes da F6c. Padrão enquanto isso: a v1 entrega os níveis 1 e 2; o nível 3 fica fora, como o roadmap já declara]** **Q15**: a v1 entrega o nível 3 de interação com a tela (agir via Brain) ou só os níveis 1 e 2? | escopo da F6c e do Brain | estudo §11.1 |
| 4 | **[Dispensada: o S1/S2/S6 medem a voz por conta própria; as fontes do estudo são só contexto]** **Reconfirmar as fontes de voz** (§13): URLs completas da primeira sessão não recuperadas; fonte do esclarecimento sobre RVC a localizar | homologação final | estudo §12, item 8 |
| 5 | **[Resolvida com padrão proposto, ajustável por você antes do S5: limiares do estudo mantidos (≥ 50 curtidas, ≥ 10.000 downloads/mês); a variante sem censura só é aceita se a queda contra o oficial for de no máximo 3 pontos percentuais em acerto de delegação e em conformidade do enum de `flow`. O agente copia isso como critério na hipótese do relatório do S5, antes de medir]** **Limiares do D16** (≥ 50 curtidas, ≥ 10.000 downloads/mês) e a **margem de piora aceitável** do enum de `flow`, definidos **antes** do teste do S5/S8 | S5, S8 | estudo D16 |
| 6 | **[Dispensada: irrelevante para a v1 pessoal e local]** **Ler os termos de uso** da plataforma de geração de imagem (Gemini) antes de qualquer distribuição | Nível B da F7 | estudo §8.3 |
| 7 | **[Resolvida: 8 h aceitas]** **Duração do soak** da F7 (proposta no roadmap: 8 h) | F7 | roadmap, F7 |
| 8 | **[Adiada: não bloqueia; a F4 fecha conservadora contra o fluxo de teste e diz isso no PR]** **ADRs B e D no Brain** (autenticar `approver`; falha parcial com Report) — urgência alta, trabalho no repositório do Brain | Nível B da F7; F4 sem eles fica conservadora | estudo §11.3 |
| 9 | **[Resolvida: relaxei a regra do `AGENTS.md` §13; o estudo fica como está]** **BOM no `estudo-arquitetura.md`**: o arquivo é UTF-8 com BOM, e `AGENTS.md` §13 diz "UTF-8 sem BOM". Remover o BOM do estudo ou relaxar a regra (não alterei o estudo: é documento que decide) | consistência; risco baixo | verificação em 2026-11-21 |

Decisões da sessão de planejamento aceitas como padrão (o agente segue, o responsável pode
ajustar): soak de 8 h na F7; captura de visão recusada se qualquer janela da lista de exclusão
estiver visível na região (F6c); o payload do shell não carrega título de janela (F6b); o que
vem da tela entra na regra de tier do D13 como `origin == "persona"`, nunca como pedido do
usuário (F6c).

Nada aqui é agente decidindo pelo responsável: são decisões e leituras que só ele faz.

---

## Spikes

Estado: `não iniciado` · `em curso` · `concluído` (relatório em `docs/spikes/`) · `reprovou` (nota de revisão no estudo).

| Spike | Tema | Estado | Relatório | Bloqueia |
|---|---|---|---|---|
| S7 | Hardening do runtime | não iniciado | — | F0 (gate de hash), F4 |
| S5 | LLM (modelo, quantização, delegação, persona) | não iniciado | — | F4; medições de visão para F6c |
| S1 | STT pt-BR | não iniciado | — | F5 |
| S2 | TTS e RVC | não iniciado | — | F5 |
| S3 | Conjunto LLM + avatar + voz (e visão) | não iniciado | — | F4, F6c, perfil Qualidade |
| S6 | Voz sob Bun | não iniciado | — | F5 |
| S4 | Avatar em sprites | não iniciado | — | F6a |
| S9 | Overlay e shell | não iniciado | — | F6a, F6c |
| S8 | Persona e memória | não iniciado | — | F7 (gate de release) |

---

## Fases

| Fase | Estado | Gate | Commit | Data |
|---|---|---|---|---|
| F0 Fundação | não iniciada | — | — | — |
| F1 Contrato interno | não iniciada | — | — | — |
| F2 Cliente do Brain | não iniciada | — | — | — |
| F3 Emoção, persona e memória | não iniciada | — | — | — |
| F4 LLM e delegação | não iniciada | — | — | — |
| F5 Voz | não iniciada | — | — | — |
| F6a Avatar, overlay e painel | não iniciada | — | — | — |
| F6b Presença | não iniciada | — | — | — |
| F6c Visão | não iniciada | — | — | — |
| F7 Distribuição | não iniciada | — | — | — |

---

## Registro de gate executado

Preenchido pelo agente **ao fechar cada fase**, uma seção por fase, nunca apagada. Copie o
modelo abaixo.

```
### F<N> — <nome> — <data>

- Commit: <hash>   Máquina: <piso / outra>   Build pinado: <runtime.lock / models.lock>
- bun install && bunx tsc --noEmit && bun test: <resultado, nº de testes, nº de arquivos>
- Comandos do gate da fase:
    <comando>: <saída resumida>
- Medições (se houver): <valor, unidade, condição>  → relatório: docs/spikes/<...>
- Itens manuais registrados: <o que foi feito, onde, resultado>
- Desvios do estudo ou do Fluxo: <nenhum | nota de revisão em §X / justificativa em uma linha>
- Itens que não foram verificados: <lista — "nenhum" só se for verdade>
```

(Nenhuma fase foi fechada ainda.)

---

## Decisões tomadas durante a implementação

Índice das notas `[Decidido durante a implementação]` no estudo: data, seção, uma linha.

(nenhuma ainda)

---

## Desvios do Fluxo ou das skills

Quando o agente se afasta do roteiro, uma linha: data, fase, o que mudou, por quê. Se o desvio
se repetir, é sinal de que a skill ou o Fluxo precisa de edição.

(nenhum ainda)

---

## Log de sessões (handoff)

Mais recente primeiro. Cada sessão termina com uma entrada.

```
### <data> — <quem/qual agente>
- Feito: <entregas, com commit>
- Ficou pendente: <o que e por quê>
- Próxima ação: <uma frase>
- Perguntas ao responsável: <lista ou "nenhuma">
```

### 2026-11-21 (retomada) — Claude, sessão de planejamento
- Feito: a sessão anterior parou no meio da escrita das skills; só `phase-runner` existia em
  disco. Escritas as outras seis em `.kairos/skills/`: `contract-first` (144 linhas), `spike`
  (156), `measure` (113), `adversarial-tests` (132), `code-review` (236), `estudo-revisao`
  (135). Todas sem BOM, sem resíduo de mojibake, sem TODO; cada uma diz quando **não** usá-la.
- Ficou pendente: o amostrador de medição de `scripts/measure/` **não foi escrito** (a skill
  `measure` o cita como opcional, "escreva quando o primeiro spike precisar"). Nenhum código
  existe. Achado novo: `docs/estudo-arquitetura.md` tem BOM UTF-8, e `AGENTS.md` §13 pede
  "sem BOM" (pendência 9).
- Próxima ação: o responsável liberar o agente para a F0, começando pelo S7.
- Perguntas ao responsável: pendências 1 a 9 acima.

### 2026-11-21 — sessão de planejamento
- Feito: roadmap completo (F0–F7, spikes, temas transversais, riscos, fora de escopo),
  `AGENTS.md`, este arquivo e as skills em `.kairos/skills/`.
- Ficou pendente: as oito pendências do responsável acima; nenhum código existe.
- Próxima ação: iniciar o S7 e a F0.
- Perguntas ao responsável: ver tabela de pendências.
