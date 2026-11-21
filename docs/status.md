# Status — Kairos-Personality

Andamento, handoff e registro de gate. **O roadmap é a especificação e não é editado para
registrar andamento; este arquivo é.** Todo agente lê isto primeiro e atualiza ao terminar a
sessão.

Atualizado em: 2026-11-21 · por: agente de implementação (F1 fechada)

---

## Onde estamos

- **Fase em curso:** nenhuma. **F1 Contrato interno fechada** com gate verde em 2026-11-21;
  F0 permanece verde e pinada.
- **Próxima ação:** **F2 (cliente do Brain) só depois da liberação do responsável** — exige o
  Brain rodando de verdade para B14/B15/B11/B12. Em paralelo: **S5** (modelo) antes da F4;
  S1/S2/S6 antes da F5.
- **Bloqueado por:** liberação para abrir a F2. Pendências 1 e 3 só antes da F6a e da F6c.

---

## Pendências do responsável (bloqueiam ou condicionam agentes)

**Triagem de 2026-11-21: nada aqui bloqueia a F0 até a F5.** O agente pode começar já. As
pendências 1, 3 e 8 só importam mais adiante e ficam adiadas com a fase indicada; as 4 e 6
foram dispensadas; as 2, 5, 7 e 9 foram resolvidas com o padrão descrito na linha.

| # | Pendência | Bloqueia | Origem |
|---|---|---|---|
| 1 | **[Adiada: só antes da F6a]** **Homologar as revisões v3.1 e v3.2 do estudo** (Akame, D16, Q14, D17, Q15, S9, R28, R29, D7/D10/Q5 revisados) — estão "sem registro de homologação" | F6a, F6b, F6c e S9 | estudo, cabeçalho |
| 2 | **[Resolvida em 2026-11-21: referências ao modelo de avatar descartado removidas do estudo, do roadmap, do `AGENTS.md` e das skills]** Resíduos do avatar antigo no estudo | consistência do estudo | verificação em 2026-11-21 |
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
| S7 | Hardening do runtime | concluído | `docs/spikes/S7-hardening-runtime.md` | F0 (gate de hash), F4 |
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
| F0 Fundação | concluída | verde | 901119b | 2026-11-21 |
| F1 Contrato interno | concluída | verde | 9df5d13 | 2026-11-21 |
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

### F0 — Fundação — 2026-11-21

- Commit: 901119b (S7 em 8206bc1; entregas em bf5ee03, 2982362, 35f2af6, f81b071, 901119b)   Máquina: piso   Build pinado: `runtime.lock.json` (b12359 / b1b770d9) + `models.lock.json` (Qwen3.5-4B-Q4_K_M, provisório até o S5)
- bun install && bunx tsc --noEmit && bun test: verde do zero; 23 testes em 6 arquivos, 44 asserções
- Comandos do gate da fase:
    bun install (do zero): quatro workspaces (apps/personality-core, apps/avatar-client, packages/schema, scripts); bun.lock idêntico ao versionado
    bun run verify:runtime-pins: 29 pins OK (2 archives, 26 binários, 1 GGUF)
    bun run gen:schema: 2 JSON Schemas gerados; git diff vazio
    CI GitHub (job verify): verde no push de 901119b; PR de prova com teste falso ficou BLOCKED e o merge foi recusado pela branch protection; PR fechado e branch removida
- Medições (se houver): S7 — bind só 127.0.0.1, 401 sem chave, 400 em `dry_allowed_length=INT32_MIN`, 678 → 3584 MiB de VRAM no piso → relatório: `docs/spikes/S7-hardening-runtime.md`
- Itens manuais registrados: `tsc --noEmit` reprovou uma sonda de tipo em cada um dos quatro workspaces (removidas); config local (`data/config.local.json`), chave em `secrets/` e GGUF em `models/` não aparecem no `git status`; `--sleep-idle-seconds` ausente da linha de comando
- Desvios do estudo ou do Fluxo: nenhum. Extensão local: `runtime/` adicionado ao `.gitignore` para não versionar os 56 arquivos do bundle; `scripts/` virou workspace para fechar os quatro espaços do aceite
- Itens que não foram verificados: fuzzing da API C / GGUF malicioso, soak de estabilidade e orçamento formal de VRAM (S3/F7); transição real de sleep (P10 proíbe a flag); CVEs de JNI Android (não estão no artefato Windows)

### F1 — Contrato interno — 2026-11-21

- Commit: dcddb1d (entregas em 04e8e6b, 07f4a26, 984610d, 8a6971d, 53a5711, d15fbca, ec1b5e9, 9df5d13, c511e34, 82adaca, 6d31844, e639b80, dcddb1d)   Máquina: piso   Build pinado: inalterado (`runtime.lock.json` / `models.lock.json`)
- bun install && bunx tsc --noEmit && bun test: verde; 37 testes em 11 arquivos, 333 asserções; `bun test packages/schema`: 14 testes em 5 arquivos, 284 asserções
- Comandos do gate da fase:
    bun test packages/schema: 14 pass, 0 fail
    bun run gen:schema && git diff --exit-code packages/schema/generated: 10 JSON Schemas gerados, diff vazio (exit 0)
    bun run check:delegations: 1 entrada, 1 fluxo do Brain, 0 avisos, exit 0
    bunx tsc --noEmit: exit 0
- Medições (se houver): nenhuma — F1 é contrato, não medição
- Itens manuais registrados: a semente é comparada com o bloco JSON de §6.2 extraído do estudo (igualdade exata, teste automatizado); `git status` do Brain limpo depois de `check:delegations`; `bun install` do zero reproduziu `bun.lock` idêntico; CI verde no commit dcddb1d; varredura sem TODO/FIXME/`any`/`.skip`; cinco rodadas de revisão independente das barreiras P13/P14/R26: P13 resistiu sem ressalvas; 22 variações de bypass do filtro M2/M3 foram encontradas nas quatro primeiras e fechadas com vetores próprios, culminando na reescrita do filtro com detectores estruturais. **Trade-off explícito e versionado como vetor:** qualquer sequência de 10/11 dígitos é tratada como PII em M2/M3 — um ID longo pode ser descartado, CPF/telefone nunca entram (fail-closed)
- Desvios do estudo ou do Fluxo: nenhum. Extensões locais justificadas: gerador passou a escrever em `packages/schema/generated/` (exigido pelo comando do CI); `.gitignore` de `data/` para `/data/` para versionar `packages/schema/data/`; `check:delegations` lê também `.yml`/`.json`, como o README do Brain declara, sempre sem escrita. Nenhuma nota de estudo foi necessária: as decisões tomadas eram internas e foram registradas em `AGENTS.md` §9 e aqui
- Itens que não foram verificados: F2 não foi iniciada (B11/B12/B14/B15 contra o Brain real ficam para lá); migração de dado existente (não houve); julgamento humano de persona (S8) e demais spikes

---

## Decisões tomadas durante a implementação

Índice das notas `[Decidido durante a implementação]` no estudo: data, seção, uma linha.

- 2026-11-21 · D14 — filtro M2/M3 fail-closed: qualquer sequência de 10/11 dígitos é tratada como PII; trade-off de falso positivo registrado com 22 vetores de bypass. (pendência da F1)

---

## Desvios do Fluxo ou das skills

Quando o agente se afasta do roteiro, uma linha: data, fase, o que mudou, por quê. Se o desvio
se repetir, é sinal de que a skill ou o Fluxo precisa de edição.

2026-11-21 · F1 · nenhum desvio do Fluxo. Três ajustes locais: saída do gerador de
`packages/schema/schema/` para `packages/schema/generated/` (o comando do CI exige esse
caminho); `.gitignore` de `data/` para `/data/` (para versionar `packages/schema/data/`
sem liberar o `data/` local); `check:delegations` aceita `.yaml`, `.yml` e `.json` porque o
README do Brain declara essas extensões — continua somente leitura.

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

### 2026-11-21 — agente de implementação (F1)
- Feito: F1 fechada e publicada em treze commits (04e8e6b, 07f4a26, 984610d, 8a6971d,
  53a5711, d15fbca, ec1b5e9, 9df5d13, c511e34, 82adaca, 6d31844, e639b80, dcddb1d):
  `AffectState` e `PersonaLayers` com P13 irrepresentável no tipo, `MemoryRecord` com
  tombstone sem conteúdo e filtro R26, `WorkingFrame`, `DelegationEntry`, 10 JSON Schemas
  gerados, `delegations.json` com `check:delegations` somente leitura e `persona.seed.json`
  idêntico a §6.2. Gate da F1 e gate base verdes; CI verde em dcddb1d. Cinco rodadas de
  revisão independente: P13 resistiu sem ressalvas; 22 variações de bypass do filtro M2/M3
  foram fechadas e o filtro reescrito com detectores estruturais. Veredito final: P13 e
  P14/R26 resistidas, com fail-closed documentado para sequências de 10/11 dígitos.
- Ficou pendente: a F2 não foi aberta — exige liberação e o Brain rodando para B11/B12/B14/B15;
  os spikes S5/S1/S2/S3/S6/S4/S9/S8 seguem; revisões v3.1/v3.2 continuam sem homologação
  (só antes da F6a).
- Próxima ação: aguardar liberação para a F2; S5 pode ser preparado em paralelo.
- Perguntas ao responsável: liberar a F2 com o Brain de verdade disponível.

### 2026-11-21 — agente de implementação (F0)
- Feito: S7 concluído e publicado (8206bc1); F0 inteira entregue em cinco commits (bf5ee03
  workspace/tsconfig/avatar, 2982362 config Zod, 35f2af6 logger com trace, f81b071 pins e
  verify:runtime-pins, 901119b CI) e publicada. Gate verde; branch protection exige o check
  `verify` e foi provada com um PR de teste falho bloqueado, depois fechado.
- Ficou pendente: o GGUF pinado é provisório até o S5; homologação das revisões v3.1/v3.2
  (pendência 1) só antes da F6a; S1/S2/S6 e S3/S5 ficam para as fases seguintes.
- Próxima ação: abrir a F1 com `contract-first`, sem iniciar a F6a antes da homologação.
- Perguntas ao responsável: nenhuma para a F1 (pendências 1 e 3 seguem adiadas pela triagem).

### 2026-11-21 (entrega do workspace) — Claude, sessão de planejamento
- Feito: pendências triadas (só as essenciais mantidas); referências ao avatar descartado
  removidas do estudo (D7, §1, diagrama, §4, orçamento, D12, D17, §8.1 a §8.3, Q4, §13), do
  roadmap, do `AGENTS.md` e das skills; repositório criado e publicado em
  `github.com/Sunggod/Kairos-Personality` (branch `main`), com `.gitignore` e `.gitattributes`.
- Ficou pendente: nenhum código existe; amostrador de `scripts/measure/` não escrito.
- Próxima ação: o agente abre a F0 pelo S7 (skill `phase-runner`).
- Perguntas ao responsável: pendências 1 e 3 (só antes da F6a e da F6c); 8 (ADRs do Brain).

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
