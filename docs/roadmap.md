# Roadmap — Kairos-Personality

Ordem de construção para agentes. Cada fase tem pré-condições, entregas com critério de
aceite, um gate verificável por comando ou teste, um fluxo de implementação (a ordem em que
um agente deve construir as entregas) e o risco principal.

Fonte de verdade das decisões: `docs/estudo-arquitetura.md` (D1–D17, P1–P15, R1–R29, §9, §10).
Este roadmap **operacionaliza** o estudo; não decide de novo. Se a implementação revelar que
uma decisão do estudo está errada, a correção é **no estudo primeiro**, com nota de revisão
datada, e só depois no roadmap — nunca o contrário.

Mudar o protocolo do Brain (`C:\KairosBrain`) é sempre ADR no repositório do Brain, com
aprovação humana (ADR 0001 de lá). Este roadmap nunca altera o Brain.

Três documentos acompanham este roadmap: `AGENTS.md` (regras operacionais e invariantes
resumidas), `docs/status.md` (onde o trabalho está e o **registro de gate executado** de cada
fase) e `.kairos/skills/` (procedimentos que ajudam o agente; nenhum deles substitui
julgamento). O roadmap é a especificação e não é editado para registrar andamento — andamento
vai em `docs/status.md`.

Quatro princípios, nesta ordem de prioridade quando colidirem:

1. **Nenhuma entrega sem Zod e sem teste.** Contrato antes de comportamento — como no Brain.
2. **Nenhuma fase esconde violação de invariante.** Se uma entrega esbarra em P1–P15, a
   entrega está errada, não a invariante (ver `estudo-arquitetura.md` §4).
3. **Todo gate é comando ou teste**, nunca "parece estar funcionando".
4. **Cada fase deixa o repositório verde.** Sem fase pela metade no `main`.

---

## Como ler uma fase

Todo item de **Entregas** tem **Aceite**. Entrega sem critério de aceite não entra na fase.
O **Fluxo** de cada fase é a ordem recomendada de construção das entregas — pular a ordem é
permitido só se o agente comprovar que a dependência não existe naquele caso.

## Protocolo de execução (todo agente segue isto em toda fase)

1. **Ler antes de escrever.** Reler a seção correspondente de `estudo-arquitetura.md` citada
   na fase, mais as invariantes P1–P15 e os riscos R1–R29 citados nela. Não implementar de
   memória do que "parece ter sido decidido".
2. **Conferir o gate da fase anterior.** Se não passa, parar e corrigir ali — não construir
   em cima de uma fase vermelha.
3. **Contrato primeiro.** Para toda entrega que introduz ou muda um formato de dado
   (schema de `persona/`, `memory/`, `delegations.json`, envelope interno, vetor de
   `affect`), escrever o tipo Zod e o vetor de teste **antes** do código que o usa.
4. **Vetor ou teste que falha, depois o código mínimo** que o faz passar. Nenhuma entrega é
   "implementada" sem um teste que prove o critério de aceite listado.
5. **Rodar o gate inteiro da fase localmente** antes de marcar qualquer entrega como pronta —
   não só o teste novo.
6. **Nunca normalizar violação de invariante.** Antes de fechar uma entrega, conferir
   explicitamente contra a lista de P1–P15: se a entrega exige violar uma, a entrega
   está desenhada errado — voltar e redesenhar, não anotar "aceitar o risco" no código.
7. **Documentar a decisão, não só o código.** Se a implementação encontrar uma bifurcação que
   o estudo não previu, registrar a escolha em `docs/estudo-arquitetura.md` (seção e data),
   com `[Decidido durante a implementação]`, antes de prosseguir.
8. **Commit por entrega**, não por fase inteira. Mensagem de commit cita a entrega e o
   critério de aceite que ela satisfaz.
9. **Nenhum TODO, `any` silencioso ou placeholder** no código entregue. Entrega incompleta é
   entrega não feita.
10. **Mudança de protocolo do Brain para no ADR do Brain.** Se uma entrega só funciona
    mudando `plan.run`, o manifesto ou qualquer contrato do `C:\KairosBrain`, o agente para,
    registra a necessidade em §11.3 do estudo (candidato a ADR) e **não** implementa um
    contorno silencioso que mascare a lacuna.

---
## Spikes (relatório descartável de uma página em `docs/spikes/SN-nome.md`)

Rodam **antes** da fase que dependem deles. Um spike não produz código de produção — produz
uma resposta medida e um relatório. Se o spike reprovar a hipótese do estudo, a correção é no
estudo (nota de revisão) antes de a fase seguinte começar.

| Spike | Pergunta | Mede | Bloqueia |
|---|---|---|---|
| **S1** STT | Qual motor atende pt-BR espontâneo no microfone do responsável? | WER em corpus próprio, latência até parcial/final, VRAM/CPU, estabilidade 1h | F5 |
| **S2** TTS e RVC | Qual TTS tem prosódia controlável e voz aceitável em pt-BR? RVC compensa? | Latência até 1º áudio, qualidade percebida, controle de prosódia, expressividade, VRAM | F5 |
| **S3** Conjunto | LLM + avatar + voz cabem no orçamento de D10 nos perfis Padrão e Qualidade? | VRAM de pico por componente, RAM de pico, latência fim a fim, KV em `q8_0`/`q4_0`, visão (D17): VRAM de pico na codificação de print, tokens por imagem | F4, F6c, perfil Qualidade de D10 |
| **S4** Avatar | O pipeline de sprites em camadas (§8.1) mantém consistência de identidade entre peças? | Base, 8 expressões, 3 bocas, 4 poses; consistência cor/forma; retoque manual; recorte sem halo; custo de VRAM do atlas | F6a |
| **S5** LLM | Qual modelo, quantização e runtime sustentam persona, pt-BR e responder-ou-delegar no teto de D10/D11? | Acerto de delegação, conformidade de enum, aderência à persona, tom em pt-BR, latência, tok/s, VRAM; ordem do D16 (oficial → LoRA → sem censura) | F4 |
| **S6** Voz em Bun | O addon do sherpa-onnx roda sob Bun no Windows (STT, TTS, VAD)? | Instalar, carregar, rodar Whisper/Parakeet, Kokoro, VAD; latência e estabilidade 1h | F5 (decide se existe worker Python) |
| **S7** Hardening do runtime | O `llama-server` pinado cumpre P10 e os CVEs divulgados estão corrigidos no build? | Notas de versão por CVE; rotas permitidas; hash do binário e do GGUF | F0 (gate de hash), F4 |
| **S8** Persona e memória | O modelo sustenta persona sem recusa indevida e sem deriva? A memória lembra certo e esquece certo? | Corpus de gírias, replay de 500 turnos, 200 pedidos benignos (recusa indevida), injeção (obediência), recall/esquecimento/tombstone | F7 (gate de release) |
| **S9** Overlay e shell | Tauri (ou Electron) entrega overlay transparente com WebGL e hit-test por silhueta no Windows? Custo em repouso? | Janela transparente, hit-test por máscara alfa, DPI/múltiplos monitores, sem roubo de foco, custo em repouso, captura de tela para visão | F6a, F6c |

**Entrega de todo spike:** `docs/spikes/SN-nome.md` com pergunta, método, números medidos,
veredito (segue a hipótese do estudo / estudo precisa de nota de revisão) e data. Sem
relatório, o spike não conta como feito — mesmo que o agente "tenha testado manualmente".

---
## Fase 0 — Fundação

**Objetivo**: repositório, toolchain e um núcleo que sobe, loga e não fala com nada ainda.

**Pré-condições**: nenhuma. Ler `estudo-arquitetura.md` §3 (D3), §4 (P1–P15) e D9/P10 inteiros
antes de escrever a primeira linha — as invariantes de segurança do runtime nascem aqui.

**Entregas**

- Bun workspace: `apps/personality-core`, `apps/avatar-client` (esqueleto só, F6a enche),
  `packages/schema` (Zod + JSON Schema gerado), `scripts/`. `bun.lock` versionado.
  Aceite: `bun install` do zero cria os quatro espaços e nada mais.
- `tsconfig` raiz: `strict`, `verbatimModuleSyntax`, `moduleResolution: bundler`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, **fixado nas mesmas versões do
  Brain** (Bun 1.4.3, TypeScript 7.0.2 — D3, §10).
  Aceite: `tsc --noEmit` reprova com um erro de tipo em qualquer pacote.
- `apps/personality-core/src/config.ts`: schema Zod, override por `KAIROS_PERSONALITY_*`,
  recusa de boot se inválido.
  Aceite: config inválida aborta o boot citando o campo, nunca stack trace cru.
- `pino` estruturado com `trace` (P9) em toda linha relevante a um turno.
  Aceite: nenhuma linha de log de um turno sem `trace`.
- **Manifesto de pins do runtime de LLM** (P10, D9): `models.lock.json` (hash SHA-256 do
  GGUF) e `runtime.lock.json` (hash do binário do `llama-server`).
  Aceite: script `verify:runtime-pins` falha se o hash em disco não bater com o manifesto.
- **Resultado do S7 registrado**: quais dos CVEs CVE-2026-43622…43632 (exceto 43625) têm
  correção no build escolhido; se não, o hardening de P10 (loopback, API key, rotas
  permitidas, sem `--sleep-idle-seconds`) está documentado como mitigação aceita.
  Aceite: `docs/spikes/S7-hardening-runtime.md` existe e `runtime.lock.json` aponta para o
  build ali escolhido.
- CI: `tsc --noEmit` + `bun test` em todo PR.
  Aceite: PR que reprova um dos dois não mergeia.
- `.gitignore`: `data/`, `secrets/`, `models/*.gguf`, `*.local`.
  Aceite: `git status` limpo depois de gerar config local e baixar um modelo de teste.

**Fluxo desta fase**

1. Rodar o **S7** primeiro (hardening do runtime) — ele decide qual build do `llama-server`
   o manifesto desta fase vai pinar; sem isso, `runtime.lock.json` fica sem fundamento.
2. Workspace e `tsconfig` (sem eles nada mais compila).
3. `config.ts` com Zod (todo o resto depende de config validada no boot).
4. `pino` com `trace`.
5. Manifesto de pins (`models.lock.json`, `runtime.lock.json`) e o script de verificação.
6. CI por último, depois que `bun test` já roda local.

**Gate**

```
bun install && bunx tsc --noEmit && bun test   # verde do zero
bun run verify:runtime-pins                    # hashes batem
```

**Risco**: tratar P10 como "fazer depois" porque ainda não há LLM rodando. Mitigação: o
manifesto de pins é entrega da Fase 0, não da Fase 4 — hash errado nunca chega a existir.

**Pronto quando**: alguém novo roda `bun install && bun test` e entende, pelo `config.ts` e
pelo manifesto, que runtime de LLM pinado por hash é regra desde o primeiro commit.

---

## Fase 1 — Contrato interno

**Objetivo**: os formatos de dado da Personality existem como tipo e como vetor, antes de
existir como comportamento. Espelha a Fase 1 do Brain (`packages/protocol`), mas para os
contratos **internos**: persona, memória, afeto e delegação.

**Pré-condições**: Fase 0 verde. Ler D5, D12, D13, D14, D15 e §5.1 inteiros.

**Entregas**

- `packages/schema`: tipos Zod para `PersonaLayers` (`identity`, `style`, `lexicon`, `goals`
  são `auto`; `traits_base`, `floors` são `locked` — D12), `AffectState` (PAD de emoção e humor,
  Big Five — D5), `MemoryRecord` por tier M0–M4 (D14), `WorkingFrame` (raiz `interactive` +
  frames por tarefa — §5.1), `DelegationEntry` com `tier: open|notify|sensitive` (D13).
  Aceite: todo campo citado nas tabelas de D5/D12/D13/D14 existe e tem o tipo certo
  (`locked` nunca aceita escrita de `auto` no tipo, não só em runtime).
- JSON Schema gerado de cada tipo Zod, versionado em `packages/schema/generated/*.json`.
  Aceite: `bun run gen:schema && git diff --exit-code` sem diferença.
- `delegations.json` (dado, não código) com `flow`, `description`, `slots` (JSON Schema),
  `risk`, `tier`, `lang` — formato de D2 e D13.
  Aceite: entrada sem `tier` reprova a validação do arquivo no load.
- `persona.seed.json` inicial = o JSON de D15/§6.2, validado contra o schema de
  `PersonaLayers`.
  Aceite: `floors` e `traits_base` do seed carregam exatamente os valores de §6.2.
- Script `check:delegations`: compara `delegations.json` com `C:\KairosBrain\flows\*.yaml`
  quando os dois repositórios estão lado a lado (D2).
  Aceite: `flow` em `delegations.json` sem arquivo YAML correspondente gera aviso, não erro
  fatal (o Brain pode estar ausente em CI).
- Vetores em `packages/schema/vectors/*.json`: persona válida, persona com `auto` escrevendo
  em `floors` (deve reprovar), afeto válido, afeto fora de `[-1,1]`, delegação `tier`
  ausente, delegação `sensitive` sem slots, memória M2 com PII de terceiro (deve reprovar,
  R26), tombstone sem conteúdo (deve aceitar), tombstone com conteúdo (deve reprovar).
  Aceite: todo vetor tem `id`, `input` e `expect` (ok ou motivo de rejeição).

**Fluxo desta fase**

1. `AffectState` e `PersonaLayers` primeiro — são a base de D5 e D12, e `DelegationEntry`
   e `MemoryRecord` os referenciam (ex.: `tier` depende de `risk`; memória referencia
   `persona/lexicon` para proveniência).
2. Geração de JSON Schema e o `gen:schema` com `git diff --exit-code` no CI.
3. `delegations.json` e `check:delegations`.
4. `persona.seed.json` validado contra o schema já pronto.
5. Vetores por último, cobrindo os casos de rejeição listados — especialmente os que provam
   que `locked`/`floors` não aceitam escrita de `auto` (P13) e que PII de terceiro não entra
   em M2/M3 (R26).

**Gate**

```
bun test packages/schema        # todos os vetores passam
bun run gen:schema && git diff --exit-code packages/schema/generated
bun run check:delegations       # sem erro fatal
```

**Risco**: tipo Zod e JSON Schema derivam e divergem, como no Brain. Mitigação idêntica:
geração no CI com `git diff --exit-code`.

**Pronto quando**: os vetores são a especificação executável de persona, memória e afeto —
mudar um tipo sem atualizar vetor quebra o build, exatamente como no Brain.

---
## Fase 2 — Cliente do Brain

**Objetivo**: `personality-core` fala com o Brain de ponta a ponta como **cliente** (D1), sem
nenhum LLM de persona ainda — um objetivo falso basta.

**Pré-condições**: Fase 1 verde. Ler B1–B16 (§3.1) e D2 inteiros — **esta fase existe para
provar ou refutar cada um dos B14/B15/B11/B12 contra o Brain real**, não só por leitura.

**Entregas**

- Cliente HTTP+SSE: `plan.run` (assíncrono do lado da Personality, mesmo sendo síncrono do
  lado do Brain — B3), `approval.decide`, `kind: cancel`, `GET /stream`.
  Aceite: `plan.run` não bloqueia o loop de diálogo — o núcleo segue conversável enquanto
  espera.
- Gerenciador de tarefas (§5.1): tabela `trace → tarefa → estado`
  (`running|awaiting-approval|executed|failed|cancelled|unknown`), SQLite.
  Aceite: matar o processo com uma tarefa `running` e subir de novo resulta em `unknown`
  (P11) e **nenhum reenvio automático**.
- Registro de intenções e deduplicação (P11): chave = hash de (turno, `flow`, slots
  canonicalizados), persistida antes do `plan.run`.
  Aceite: chamar `delegate` duas vezes com a mesma chave no mesmo turno só gera um
  `plan.run`; a segunda é descartada e registrada em log.
- Regra do pior resultado (D2, P1): ler `results[]` inteiro, não só `report` final (B10).
  Aceite: teste com fluxo de dois passos onde o primeiro é `partial` e o segundo
  `succeeded` resulta em resultado agregado `partial`.
- Tratamento de B11 (502 sem Report): estado `unknown`, fala conservadora, nunca "falhou
  limpo".
  Aceite: injetar um 502 no meio de um `plan.run` de teste resulta em tarefa `unknown`.
- `delegations.json` convertido em tool `delegate(flow, slots)` com Zod validando contra o
  JSON Schema de `slots` antes de enviar.
  Aceite: slot de tipo errado nunca chega a gerar `plan.run`.
- **E2E real contra `flows/two-step.yaml` do Brain** (ou um fluxo falso equivalente), não só
  contra mocks.
  Aceite: "Personality falso → Brain → nó" completa com Report agregado correto.
- **E2E de cancelamento**: confirmar **por execução, não por leitura**, se `kind: cancel`
  aborta um `plan.run` em andamento (B14 diz que não).
  Aceite: relatório no PR desta entrega confirma ou refuta B14 contra o Brain rodando; se
  confirmado, a fala de cancelamento vira "não consegui cancelar" (R19) na UI, e isso é
  testado.
- **E2E do buffer de eventos** (B15): confirmar o teto de 256 eventos por `trace` e o
  comportamento de `dropped`.
  Aceite: teste que gera mais de 256 eventos num `trace` e confere `dropped > 0` no
  snapshot.

**Fluxo desta fase**

1. Cliente HTTP+SSE puro (sem gerenciador de tarefas ainda) — provar que fala com o Brain.
2. Gerenciador de tarefas e persistência SQLite por cima do cliente.
3. Registro de intenções e deduplicação (depende do gerenciador de tarefas existir).
4. Regra do pior resultado e tratamento de B11 — exercitados primeiro com mocks, depois com
   o Brain real.
5. `delegate` como tool com Zod (só depois que o envio cru a `plan.run` já funciona).
6. Os três E2Es reais por último, nesta ordem: fluxo feliz, cancelamento, buffer de eventos
   — cada um é o gate de saída da fase, não um nice-to-have.

**Gate**

```
bun test                                  # unitário + integração com Brain real (ou nó falso)
bun run e2e:plan-run-happy-path           # Personality falso -> Brain -> nó
bun run e2e:cancel-during-plan-run        # confirma/refuta B14, registrado no relatório
bun run e2e:stream-buffer-256             # confirma B15
```

**Risco**: assumir que B14 ou B15 "devem" funcionar de um jeito e testar só isso. Mitigação:
os E2Es desta fase são para **descobrir** o comportamento real do Brain, não para confirmar
uma hipótese — se o resultado divergir do estudo, o estudo ganha nota de revisão (protocolo,
passo 7) antes de a Fase 3 começar.

**Pronto quando**: `plan.run`, aprovação, cancelamento e stream funcionam contra o Brain de
verdade, e o comportamento de B11/B12/B14/B15 está **confirmado por execução** em
`docs/estudo-arquitetura.md` §11.2 (não mais só "leitura, não execução").

---
## Fase 3 — Emoção, persona e memória

**Objetivo**: o `affect` existe, a persona é dado vivo com `auto`/`locked` de verdade, e a
memória tem `MemoryGate` e tombstone — tudo sem LLM de diálogo ainda (pode rodar com um
LLM falso ou eventos sintéticos).

**Pré-condições**: Fase 1 verde (schemas prontos). Pode rodar em paralelo parcial com a
Fase 4, mas **nunca mergear a Fase 4 antes do `MemoryGate` desta fase existir** — delegação
sem filtro de memória cria o caminho de R26 sem proteção.

**Entregas**

- `affect.step(estado, evento, dt, traços, regras) → estado'`, função pura TS (D5).
  Aceite: vetores JSON de entrada/saída (ver protocolo passo 3) cobrem: Report `succeeded`
  com `confidence: high`, `partial`, `failed` do agente, `synthetic: true` (não deve gerar
  "culpa" — D5), erro `BUDGET_EXCEEDED`/`APPROVAL_DENIED`/`TIMEOUT`/`NODE_UNAVAILABLE`.
- Simulador de curvas em CLI (TS) para ver decaimento/deriva ao longo do tempo.
  Aceite: rodar o simulador com os ganhos de §6.2 (`decay_per_min: 0.08`) produz uma curva
  que volta à linha de base em tempo finito e documentado.
- `persona/` versionado: camadas com regra de escrita por campo (`auto` vs `locked` — D12),
  log append-only de diffs, `rollback` para qualquer versão anterior, orçamento diário de
  edições (`max_edits_per_day`).
  Aceite: tentativa de `auto` escrever em `floors` ou `traits_base` é rejeitada no tipo
  (Fase 1) **e** auditada como tentativa no log (defesa em profundidade).
- `MemoryGate` determinístico na escrita de `memory/`: filtro de segredo/token/senha/caminho
  de arquivo e conteúdo de Report cru antes de M2/M3 (R26).
  Aceite: teste com um Report contendo um token de API nunca produz um registro M2/M3 com o
  token — nem truncado, nem ofuscado parcialmente.
- Esquecimento (`memory.forget`) com tombstone (`id`, `tier`, data, hash — **sem
  conteúdo**, P14) e `memory.audit: full` opcional (default desligado).
  Aceite: depois de um `forget`, `memory list` mostra o tombstone mas nenhuma rota do
  sistema recupera o conteúdo esquecido, mesmo com acesso direto ao SQLite (criptografar ou
  apagar de fato, não só marcar).
- `working/` por turno **e** por tarefa (§5.1): frame raiz `interactive` + um frame por
  delegação em voo, na mesma tabela.
  Aceite: duas delegações concorrentes no mesmo `trace` têm frames distintos e cada uma
  resolve com seu próprio `lastReport`, sem um sobrescrever o outro.
- Promoção `episodic → semantic` como operação explícita e logada (D14), nunca efeito
  colateral.
  Aceite: nenhuma escrita em M2/M3 acontece fora de uma chamada nomeada de promoção.

**Fluxo desta fase**

1. `affect.step` isolado, com os vetores JSON primeiro — é puro e não depende de nada além
   da Fase 1.
2. Simulador de curvas, para calibrar visualmente antes de prender a lógica em testes.
3. `persona/` com `auto`/`locked` e o log de edições — depende dos tipos da Fase 1.
4. `MemoryGate` **antes** de qualquer rota que escreva em `memory/` existir — o filtro vem
   primeiro, nunca como patch depois.
5. Tombstone e `forget` por cima do `MemoryGate` já funcionando.
6. `working/` com múltiplos frames por `trace` — pode ser feito em paralelo com os itens de
   memória, mas só integra com a Fase 2 depois que o gerenciador de tarefas de lá existir.
7. Promoção `episodic → semantic` por último, como o único caminho de escrita permitido.

**Gate**

```
bun test   # affect vetores, persona auto/locked, MemoryGate, tombstone, working frames
bun run simulate:affect-curves   # inspeção visual registrada no PR
```

**Risco**: `MemoryGate` vazar PII de terceiro por um caminho não coberto pelo teste (R26) —
é o risco de maior custo silencioso do projeto. Mitigação: todo novo campo que pode conter
texto livre de um nó (Report, `headline`, `caveats`) passa pelo `MemoryGate` por construção
de tipo, não por disciplina de quem escreve a rota.

**Pronto quando**: é possível rodar o simulador, ver a curva de humor se mover, escrever e
esquecer uma memória com tombstone, e nenhum teste de `auto` conseguir tocar em `floors`.

---
## Fase 4 — LLM e delegação

**Objetivo**: um LLM local de verdade conduz a conversa, decide responder-ou-delegar, e a
delegação por sensibilidade (D13) barra `sensitive` antes do envelope.

**Pré-condições**: Fase 2 verde (cliente do Brain) e Fase 3 verde (`MemoryGate` existe antes
de qualquer Report entrar no prompt). **S5 e S7 concluídos** (D9, D10, D11, D16 dependem dos
números deles).

**Entregas**

- Supervisor do `llama-server`: sobe, espera `/health`, reinicia com recuo exponencial;
  núcleo diz "indisponível" em vez de falar em silêncio sem LLM.
  Aceite: matar o `llama-server` em teste resulta em fala explícita de indisponibilidade,
  nunca em timeout silencioso para o usuário.
- `LlmClient` atrás de interface (P6), com flags do D9 (`-ngl 99`, `-c 8192`, `--parallel 1`,
  `--cache-type-k/v q8_0`, lista de rotas permitidas de P10).
  Aceite: só as rotas de chat compatíveis com OpenAI e `/health` são chamadas — um teste de
  contrato falha se qualquer outra rota (`/infill`, `/tokenize`, etc.) for invocada.
- Passo "responder ou delegar" com decodificação restrita por JSON Schema
  (`{action, flow?, slots?}` — D2).
  Aceite: saída do LLM com `flow` fora do enum de `delegations.json` nunca chega a gerar
  `plan.run` — é rejeitada pelo Zod da Fase 1 antes de qualquer rede.
- Regra de tier (D13): `tier = max(tier_do_fluxo, risk_do_passo, sideEffects_do_passo)`;
  `sensitive` com `origem == "persona"` (veio de `goals.json`, não de pedido do turno) é
  **recusado antes do envelope**, fail-closed em resposta ambígua.
  Aceite: teste com iniciativa própria (sem pedido do usuário no turno) e `tier: sensitive`
  nunca produz `plan.run` — fica só no log de recusa local.
- Ordem de procedência do modelo (D16): oficial com prompt → oficial com LoRA → sem censura
  (`huihui-ai`), cada etapa só avançando se a anterior não bastar, conforme o S5.
  Aceite: `docs/spikes/S5-llm.md` documenta qual etapa foi escolhida e por quê, antes do
  modelo final entrar no manifesto de pins (Fase 0).
- Entrada "turno do usuário" no afeto (D5): classificador leve em CPU ou campo opcional da
  saída restrita, nunca escrita direta no estado (P8).
  Aceite: teste de contrato prova que nenhum caminho do LLM escreve campos de `AffectState`
  diretamente — só `affect.step()` escreve.
- Conteúdo de Report como dado delimitado no prompt (P3), nunca instrução.
  Aceite: Report de teste com uma instrução embutida no `headline` (`"ignore regras
  anteriores..."`) não altera o comportamento de delegação nem a saída estruturada.

**Fluxo desta fase**

1. Supervisor do `llama-server` primeiro — nada funciona sem o processo de pé e saudável.
2. `LlmClient` com a lista de rotas permitidas, testado isoladamente contra um servidor real.
3. Passo "responder ou delegar" com decodificação restrita, usando o schema `DelegationEntry`
   da Fase 1 como fonte do enum.
4. Regra de tier por cima do passo anterior — é o gate antes do envelope sair.
5. Entrada de afeto do turno do usuário, ligando ao `affect.step` da Fase 3.
6. P3 (dado delimitado) testado com casos de injeção adversarial, não só o caminho feliz.
7. D16 por último: trocar de modelo oficial para LoRA ou sem censura é troca de
   configuração sobre a mesma interface, nunca uma reescrita.

**Gate**

```
bun test                         # rotas permitidas, decodificação restrita, tier, P3
bun run e2e:responder-ou-delegar # casos reais do S5 (persona, pt-BR, delegação)
bun run e2e:injecao-prompt       # Report com instrução embutida não muda o comportamento
```

**Risco**: o enum fechado do `flow` vazar por um caminho alternativo (ex.: um prompt de
sistema mal escrito que convence o LLM a produzir JSON fora do schema, mas que algum parser
tolerante aceita). Mitigação: o Zod da Fase 1 é a única porta de entrada — nenhum parser
tolerante, nunca `JSON.parse` solto sem o schema logo em seguida.

**Pronto quando**: é possível ter uma conversa real com a Akame, pedir algo que exige
`tier: sensitive` sem pedir explicitamente e ver a recusa fail-closed acontecer, e pedir algo
`open` e ver a delegação completar com o resultado certo (pior `outcome`, P1).

---
## Fase 5 — Voz

**Objetivo**: conversa por voz de ponta a ponta, com barge-in e sem estourar o orçamento de
VRAM/CPU de D10.

**Pré-condições**: Fase 4 verde. **S1, S2, S3 e S6 concluídos** — esta fase implementa a
escolha desses spikes, não decide de novo.

**Entregas**

- Interfaces `SttEngine`, `TtsEngine`, `VoiceConverter` (P6), com o motor escolhido pelo
  S1/S2/S6 por trás.
  Aceite: trocar o motor por configuração não exige tocar no núcleo de diálogo.
- STT e TTS **na CPU por padrão** (D6, D10); RVC opcional, **desligado por padrão**.
  Aceite: subir o sistema sem flag extra nunca aloca VRAM para voz.
- VAD e endpointing próprios; barge-in cancela TTS **e** a geração do LLM em curso.
  Aceite: falar por cima da persona interrompe o áudio em curso em menos do que o teto de
  latência do orçamento de §7.5, e a geração do LLM daquele turno é abortada, não só
  silenciada.
- Áudio real reproduzido alimenta o lip-sync, nunca estimativa do texto.
  Aceite: teste com um TTS que atrasa produz lip-sync atrasado junto — prova que a fonte é o
  áudio, não o texto.
- Push-to-talk ou toggle por padrão; microfone sempre ligado só com opt-in explícito (P7).
  Aceite: instalação limpa nunca liga o microfone em modo contínuo sem ação do usuário.
- STT ignorado enquanto o TTS fala um pedido de aprovação (D4) — não ouvir a si mesma.
  Aceite: teste de eco — tocar o áudio do próprio TTS de volta no microfone simulado nunca
  aciona uma aprovação.
- Orçamento de latência (§7.5) medido por spans OTel com o `trace` do turno.
  Aceite: span por etapa (VAD, STT, LLM até 1ª sentença, TTS até 1º áudio, RVC) aparece no
  backend de observabilidade com o `trace` correto.
- Injeção por áudio (R12): texto transcrito de terceiros (vídeo ao fundo) nunca dispara ação
  irreversível.
  Aceite: teste com um áudio de fundo contendo um comando ("comprar X") não produz
  `plan.run` sem que o usuário tenha falado isso no microfone principal com push-to-talk
  ativo.

**Fluxo desta fase**

1. Interfaces primeiro (contrato antes de comportamento), com um motor stub para testar o
   encaixe antes de integrar o motor real do S1/S2/S6.
2. STT real (motor do S1) isolado, só transcrição, sem ainda ligar ao LLM.
3. TTS real (motor do S2) isolado, só síntese a partir de texto fixo.
4. VAD, endpointing e barge-in — a parte que de fato acopla STT, TTS e o `LlmClient` da
   Fase 4.
5. Lip-sync a partir do áudio real (precisa do TTS já integrado).
6. Orçamento de latência instrumentado por último, quando todas as etapas já existem para
   medir.
7. Casos adversariais (eco, injeção por áudio) testados ao final, contra o pipeline
   completo — não contra componentes isolados.

**Gate**

```
bun test                      # VAD, barge-in, eco, injeção por áudio
bun run e2e:turno-de-voz      # fala -> transcrição -> resposta -> áudio, com spans OTel
```

**Risco**: medir latência só em componentes isolados e descobrir só em produção que a soma
estoura o orçamento de §7.5. Mitigação: o span fim a fim é gate desta fase, não telemetria
de "ver depois".

**Pronto quando**: uma conversa de voz completa acontece com STT/TTS na CPU, barge-in
funciona, e os spans do `trace` mostram cada etapa do orçamento de §7.5 separadamente.

---
## Fase 6a — Avatar, overlay e painel

**Objetivo**: a Akame aparece na tela, em sprites por camadas (§8.1), dentro de um shell
desktop de verdade — não um navegador comum.

**Pré-condições**: Fase 4 verde (precisa de afeto e persona para mapear expressão). **S4 e
S9 concluídos** — o shell (Tauri ou Electron, Q5) e o pipeline de sprites já estão decididos
antes desta fase começar a construir em cima deles.

**Entregas**

- Shell escolhido no S9 (Tauri como candidato principal, D17/Q5), com janela overlay
  transparente, sem borda, sempre no topo.
  Aceite: a janela não aparece na barra de tarefas do Windows e fica acima de outras
  janelas sem roubar foco.
- `AvatarRenderer` (interface, P6) implementado com PixiJS v8 e os assets do pipeline de
  sprites validado no S4 (§8.1): `loadPack`, `setExpression`, `playState`, `setMouthLevel`,
  `lookAt`, `setScale`, `hitTest`, `dispose`.
  Aceite: trocar o pacote de sprites por outro (ex.: plano B de arte, §8.3 item 4) não exige
  tocar no motor de emoção nem no núcleo — só a implementação de `AvatarRenderer`.
- Hit-test por **máscara alfa** do quadro atual (§8.1): clique atravessa fora da silhueta.
  Aceite: clicar num ponto transparente do overlay chega à janela de baixo; clicar na
  silhueta é capturado pelo overlay.
- Manifesto de hash do pacote de arte (P10, F0): pacote faltando ou corrompido gera aviso
  visível, nunca um avatar de reserva apresentado como se fosse ela.
  Aceite: corromper um arquivo do pacote em teste produz um aviso na tela, não um
  fallback silencioso.
- Painel (configurações, chat, persona, memória, **escala do modelo**) aberto sob demanda e
  **destruído ao fechar**, nunca escondido.
  Aceite: medir RAM e GPU antes de abrir o painel, abrir, fechar, medir de novo — os números
  voltam ao nível anterior (dentro de margem de ruído).
- Orçamento de GPU do avatar (D10): 30 fps por padrão, render pausado quando a janela não
  está visível.
  Aceite: ocultar a janela (minimizar, tela cheia de outro app) derruba o uso de GPU do
  overlay a perto de zero, medido.
- Canal único cliente-núcleo: WebSocket local (D3), parâmetros de expressão a 30–60 fps sem
  passar pelo Brain nem pelo LLM.
  Aceite: teste de contrato prova que nenhum evento de posição/expressão do avatar passa
  pelo `LlmClient` da Fase 4.
- Lip-sync a partir do áudio reproduzido no cliente (herda da Fase 5).
  Aceite: mesmo teste de atraso da Fase 5, agora ponta a ponta com o avatar visível.

**Fluxo desta fase**

1. Shell com janela transparente vazia primeiro (sem avatar ainda) — provar que o S9
   funciona neste ambiente antes de desenhar algo nela.
2. `AvatarRenderer` com os assets do S4, sem hit-test ainda — só aparecer e animar.
3. Hit-test por máscara alfa por cima do renderer já funcionando.
4. Manifesto de hash e aviso de falha — proteção contra pacote corrompido antes de liberar
   para uso diário.
5. Painel sob demanda, com a medição de RAM/GPU de abrir-fechar como gate explícito.
6. Orçamento de GPU (pausar fora de visão) e o canal WebSocket de expressão por último,
   quando overlay e painel já coexistem.
7. Lip-sync integrado ao final, reaproveitando o áudio real da Fase 5.

**Gate**

```
bun test                         # hit-test, manifesto de hash, contrato "posição não passa pelo LLM"
bun run e2e:painel-abre-fecha    # RAM e GPU voltam ao nível anterior
bun run e2e:overlay-repouso      # GPU cai quando oculto, medido
```

**Risco**: o S9 ter validado o shell num cenário simples (uma janela, um monitor) e o
comportamento divergir com múltiplos monitores ou DPI misto em uso real. Mitigação: os
testes manuais de DPI/múltiplos monitores do S9 ficam registrados no relatório e são
reexecutados nesta fase como checklist manual, não só confiados ao spike.

**Pronto quando**: fechar o cliente inteiro (overlay + painel) nunca derruba o núcleo, e
reabrir traz o avatar de volta no estado afetivo atual, sem reiniciar a conversa.

---

## Fase 6b — Presença

**Objetivo**: a Akame se move pelo desktop com critério, não por sorteio puro — e sem nunca
passar pelo LLM (D17, itens 2 e 5). Esta fase entrega o nível 1 de interação com a tela:
**geometria**, sem visão.

**Pré-condições**: Fase 6a verde. Ler D17 (itens 2, 3 e 5), R24 e R29 inteiros. O **S9**
precisa ter confirmado que o shell expõe retângulos de janelas, cursor, monitor e tela cheia
(S9, item 7) e ter calibrado o limiar do modo jogo (S9, item 5).

**Entregas**

- Tipo Zod `WorldState` em `packages/schema` (retângulos de janelas, cursor, monitor, tela
  cheia, app ativo, `dnd`) e `PresenceIntent` (`stay | sit-on-window-edge | walk-taskbar |
  follow-cursor | sleep`), com vetores — contrato antes de comportamento (protocolo, passo 3).
  Aceite: payload do shell que não valida contra `WorldState` é descartado e logado com
  `trace`, nunca interpretado "no que dá"; o payload não carrega título de janela (só o que
  o diretor usa).
- **Diretor de presença**: função pura TS
  `decide(world, affect, idleMs, seed, config) → PresenceIntent` (D17), sem I/O e sem relógio
  interno.
  Aceite: vetores JSON — mesma semente e mesmo estado dão a mesma intenção; variando só a
  semente em 1.000 execuções, a distribuição respeita os pesos da configuração.
- Humor pesa a escolha (PAD do `affect`, D5).
  Aceite: teste estatístico — com humor baixo e energia baixa, `sleep` e `stay` ganham peso
  sobre `follow-cursor`, e o inverso com humor alto; sem hard-code de "se triste, dorme".
- Tetos de interrupção e fila de fala com prioridade e agrupamento (R24, §5.1).
  Aceite: simular uma sessão sintética em que o diretor e `goals.json` pedem 50 falas
  proativas; só o teto configurado é falado, o resto é agrupado ou descartado, e a fala
  pedida pelo usuário sempre passa na frente.
- Sair do caminho quando o cursor se aproxima; **"não perturbe"** (`dnd`) e **esconder em
  tela cheia**.
  Aceite: com `dnd` ligado nenhuma intenção gera movimento chamativo nem fala proativa; com
  tela cheia detectada o overlay some em até um quadro e volta ao sair, sem roubar foco.
- **Modo jogo** (D17, item 5): detecção por tela cheia exclusiva ou lista de apps, no limiar
  calibrado no S9; reduz o overlay a FPS mínimo ou o oculta; voz permanece na CPU; expõe o
  gancho `onGameMode(enter|exit)` para o projetor de visão (F6c).
  Aceite: entrar em modo jogo derruba o uso de GPU do overlay, medido; o gancho é chamado
  nas duas direções e testado com um projetor falso (a F6c liga o real).
- **A posição não passa pelo LLM** (P6, D17).
  Aceite: teste de contrato — nenhum evento de posição, intenção ou geometria chega ao
  `LlmClient` da Fase 4, nem como contexto de prompt.
- Simulador CLI de presença: roda `decide` por N minutos simulados com semente fixa e
  imprime a linha do tempo de intenções.
  Aceite: mesma semente imprime a mesma linha do tempo, byte a byte.

**Fluxo desta fase**

1. `WorldState`, `PresenceIntent` e vetores primeiro — o diretor não existe sem o contrato.
2. `decide` puro, só com vetores, sem shell e sem avatar: provar determinismo antes de
   mover qualquer pixel.
3. Simulador CLI, para calibrar pesos olhando a linha do tempo antes de prender em testes.
4. Peso por humor ligado ao `affect` da Fase 3 (leitura apenas; P8 continua valendo).
5. Tetos de interrupção e fila de fala — antes de a intenção ter qualquer efeito visível.
6. Ligar a intenção ao `AvatarRenderer` e à geometria real do shell (só aqui o diretor mexe
   na tela).
7. `dnd`, tela cheia e modo jogo por último, testados contra o shell real, não só vetores.

**Gate**

```
bun test                         # determinismo, humor, tetos, contrato "posição não passa pelo LLM"
bun run simulate:presence        # linha do tempo reproduzível por semente, registrada no PR
bun run e2e:presenca-tela-cheia  # some em tela cheia, volta sem roubar foco; modo jogo derruba GPU
```

**Risco**: a movimentação ficar "esperta demais" e virar o R24 e o R29 — interrompe, cobre
botões, atrapalha. Mitigação: tetos e `dnd` são gate desta fase, não ajuste fino posterior;
na dúvida o diretor escolhe `stay`.

**Pronto quando**: com a mesma semente a Akame repete a mesma sessão, o humor muda *como*
ela se move sem mudar *se* ela respeita tela cheia e `dnd`, e `git grep` não acha nenhuma
rota de posição chegando ao LLM.

---

## Fase 6c — Visão

**Objetivo**: a Akame vê a tela **só quando pedida**, sem gravar nada, sem obedecer ao que lê
e sem estourar a VRAM (D17, itens 3 e 4). É o nível 2 de interação com a tela. O nível 3
(agir com mouse e teclado) **não é desta fase nem do avatar**: só existe via delegação ao
Brain, tier `sensitive`, aprovação por UI (D4, D13).

**Pré-condições**: Fase 6b verde (o gancho de modo jogo existe). **S3 e S5 concluídos com as
medições de visão** (arquivo oficial do `mmproj` e tamanho real, pico de VRAM na codificação
de print em 720p/1080p/1440p, tokens por print) e **S9 com a captura pelo shell e a lista de
janelas excluídas** (item 9). Sem essas medições a fase não começa — o teto de 5,0 GB é
hipótese até o S3 confirmar. Ler D10 (regra 1), D17, P3, P7, R12 e R28 inteiros.

**Entregas**

- Flag `vision.enabled`, **padrão `false`**; captura só por pedido do usuário ou em baixa
  frequência configurada.
  Aceite: instalação limpa nunca captura a tela; ligar a flag sem pedido não dispara
  captura sozinha.
- Captura pelo shell nativo (S9) e **indicador visível de captura**.
  Aceite: o indicador acende antes do primeiro byte capturado e só apaga depois do
  descarte da imagem; teste automático da ordem dos eventos e checklist manual no PR.
- **Lista de janelas e apps excluídos** (gerenciador de senhas, banco, etc., definida no S9;
  R28), configurável e versionada.
  Aceite: com um app da lista visível na região capturada a captura é **recusada** com fala
  explícita ("não vou olhar agora") e nenhum pixel chega ao projetor — fail-closed. Se o S9
  mostrar que a captura por janela é viável, o relatório dele pode relaxar isso.
- Projetor de visão **na GPU, nunca na CPU** (D17, item 4), com `VisionProjector` atrás de
  interface (P6) e `load`/`unload`.
  Aceite: o núcleo mede a VRAM livre no arranque e **recusa o perfil que não couber** (D10,
  regra 1); nenhuma configuração coloca o projetor na CPU nem permite spill de pesos.
- **Imagem descartada após a inferência; nada gravado em `memory/`** (P7). A descrição
  derivada da tela fica no `working/` do turno e só vai a M2/M3 por promoção explícita
  através do `MemoryGate` (F3).
  Aceite: após uma sessão de visão, uma varredura de `memory/`, `data/` e logs não acha
  nenhum arquivo de imagem nem payload base64 de imagem; o log não carrega a transcrição do
  que foi visto (R7).
- **Texto da tela como dado não confiável** delimitado no prompt (P3, R12, R28).
  Aceite: prints de teste com instrução embutida ("ignore as regras…", "delegue X") não
  geram `plan.run`, não alteram a saída estruturada e não mudam persona.
- **Nada derivado da tela vira ação por conta própria.** Para a regra de tier (D13), o que
  vem da tela é tratado como `origem == "persona"` (iniciativa própria), nunca como pedido do
  usuário.
  Aceite: um print que "pede" uma ação `sensitive` nunca produz `plan.run`; só um pedido do
  usuário no turno, mais aprovação por UI, produz.
- **Ligar o modo jogo ao projetor** (gancho da F6b): entrar em modo jogo descarrega o
  projetor; sair não o recarrega sozinho.
  Aceite: VRAM liberada medida ao entrar em modo jogo; a próxima visão pede recarga
  explícita.
- Matriz modelo × projetor documentada, incluindo a compatibilidade do projetor oficial com a
  variante escolhida no D16 (a do `huihui-ai` tem só o texto processado — pendência 10c do
  §12).
  Aceite: `docs/spikes/S5-llm.md` (ou nota sua) lista, por modelo do manifesto, se há projetor
  compatível; modelo sem projetor compatível **desliga a visão** com aviso, não improvisa.
- Orçamento de VRAM com visão (D10).
  Aceite: e2e mede o pico de VRAM com LLM + projetor + overlay + voz na CPU, nas três
  resoluções do S3; no perfil Padrão o pico fica em ≤ 5,0 GB, e acima disso a visão é
  recusada.

**Fluxo desta fase**

1. Ler os relatórios S3/S5/S9 e registrar os números que a fase assume (teto, resoluções,
   lista de exclusão) no topo do PR — sem números medidos não se escreve código.
2. `vision.enabled` e o fluxo de pedido (sem captura real ainda, com imagem de fixture).
3. `VisionProjector` na GPU com a verificação de VRAM de arranque — o "recusar" vem antes do
   "carregar".
4. Captura real pelo shell, indicador e lista de exclusão, nessa ordem (o indicador e a
   recusa existem antes de qualquer captura de verdade).
5. Descarte da imagem e a varredura "sem rastro" — antes de a descrição poder tocar em
   qualquer memória.
6. Texto da tela como dado delimitado, com os prints adversariais; e a regra de origem para
   D13.
7. Modo jogo e matriz modelo × projetor por último, quando o ciclo carregar-usar-descarregar
   já existe para medir.

**Gate**

```
bun test                       # flag, lista de exclusão, origem=persona, descarte, delimitação
bun run e2e:visao-injecao      # prints com instrução embutida não geram ação nem mudam saída
bun run e2e:visao-sem-rastro   # nenhuma imagem em memory/, data/ ou logs
bun run e2e:visao-vram-pico    # <= 5,0 GB no perfil Padrão; acima disso recusa
```

**Risco**: tratar o que ela vê como contexto "confiável" por vir do próprio desktop do
responsável. Mitigação: tela é entrada de terceiros por construção (uma página aberta, um
vídeo, uma mensagem recebida), com o mesmo tratamento do áudio (R12) e do Report (P3).

**Pronto quando**: você pede "o que tem na minha tela?", o indicador acende, ela responde,
o indicador apaga, a VRAM volta ao nível anterior, e a varredura de arquivos não acha um
único pixel — mesmo com um print dizendo para ela fazer outra coisa.

---

## Fase 7 — Distribuição

**Objetivo**: transformar o repositório verde num produto que sobe sozinho, aguenta uso
contínuo e tem as licenças e a procedência da arte e dos modelos fechadas. A v1 é pessoal e
local (Q4); esta fase tem **dois níveis de saída**, e o segundo só abre com gates extras.

- **Nível A — release pessoal**: empacotado, estável, licenças conferidas, para a máquina do
  responsável.
- **Nível B — distribuição a terceiros**: só depois de reabrir Q1 (o piso de hardware deixa
  de ser "a máquina de desenvolvimento") e Q4 (licença da arte gerada e termos da plataforma
  de geração), e com o ADR **B** do Brain resolvido (autenticar o `approver`, §11.3) — sem
  isso, qualquer processo local aprova uma ação sensível.

**Pré-condições**: Fases 0 a 6c verdes. **S8 concluído** (é o gate de release de persona e
memória). Ler §8.3, D7, D9, D16, R13, R27, Q1 e Q4 antes de começar.

**Entregas**

- **Gate S8 de release**: `docs/spikes/S8-persona-memoria.md` com as seis medições do §10
  (gírias, replay de 500 turnos, 200 pedidos benignos, injeção, recall/esquecimento por 30
  dias, influência percebida), com a **margem de piora aceitável definida antes do teste**
  (D16), nunca ajustada depois do resultado.
  Aceite: taxa de obediência a injeção em **ação** é zero; taxa de recusa indevida caiu
  contra o modelo oficial; se qualquer um falha, o modelo cai para a etapa anterior do D16.
- Build do núcleo com `bun build --compile`; o worker de voz em Python **só existe se o S6
  falhou** (F5).
  Aceite: numa máquina sem Bun e sem Python instalados, o executável sobe, passa no
  `/health` e responde a um turno de teste.
- Empacotamento final do shell e do cliente (o shell já existe desde a F6a; aqui entra
  instalador, assinatura e atualização).
  Aceite: instalar e desinstalar numa conta limpa do Windows não deixa processo residente,
  entrada de inicialização nem arquivo fora do diretório de dados declarado.
- **Manifesto de release**: hashes do binário do núcleo, do `llama-server`, do GGUF, do
  `mmproj`, do pacote de arte e do shell (P10).
  Aceite: `verify:runtime-pins` (F0) passa sobre os **artefatos empacotados**, não só sobre
  a árvore de desenvolvimento; arquivo trocado depois do build reprova o boot com mensagem
  clara.
- **Checklist de licenças** fechado em `docs/licencas.md`: modelo de LLM e projetor, STT,
  TTS, RVC se ligado, PixiJS, shell, bibliotecas transitivas, e a procedência da arte (§8.3:
  plataforma de geração, registro de origem por asset, nada que lembre personagem existente).
  Aceite: script `check:licenses` lista toda dependência de produção com licença
  identificada; licença desconhecida ou incompatível reprova o build.
- **Soak**: sessão contínua com conversa sintética, voz, overlay e visão sob demanda, com a
  duração mínima **definida antes do teste** (proposta: 8 h, a confirmar pelo responsável).
  Aceite: sem crescimento de RAM ou VRAM acima da margem definida, sem handle vazado, sem
  tarefa presa em `running`, núcleo reiniciado no meio do soak volta com tarefas `unknown`
  e nenhum reenvio (P11, P12).
- **Revisão de privacidade** (R7, P7): varredura do pacote final e de uma sessão completa por
  áudio bruto, transcrições, imagens e conteúdo de memória em log ou fora de `data/`.
  Aceite: nada além do declarado; telemetria externa inexistente por padrão.
- Só no **Nível B**: Q1 e Q4 reabertas e respondidas no estudo (nota de revisão datada), e o
  ADR B do Brain com status aceito. Sem os dois, o Nível B não sai.

**Fluxo desta fase**

1. S8 primeiro — se o modelo reprova, tudo que vem depois seria empacotar a coisa errada.
2. Build do núcleo e teste em máquina limpa (descobre dependências ocultas cedo).
3. Empacotamento do shell e do cliente por cima de um núcleo que já sobe sozinho.
4. Manifesto de release e `verify:runtime-pins` sobre os artefatos finais.
5. Checklist de licenças e `check:licenses` — com a arte e o modelo conferidos por pessoa, o
   script cobre só as dependências de código.
6. Soak por último, sobre o build final e não sobre o de desenvolvimento.
7. Se houver Nível B: reabrir Q1/Q4, checar o ADR B e só então liberar.

**Gate**

```
bun test && bunx tsc --noEmit            # verde sobre o commit de release
bun run verify:runtime-pins --release    # hashes do pacote final batem com o manifesto
bun run check:licenses                   # nenhuma licença desconhecida
bun run soak:release                     # duração e margens definidas antes do teste
```

**Risco**: empacotar e descobrir só no soak que o executável compilado se comporta
diferente do `bun run` (caminho de arquivos, addon nativo, antivírus). Mitigação: o teste em
máquina limpa vem logo após o build, não no fim da fase.

**Pronto quando**: o responsável instala numa conta limpa, usa um dia inteiro, e todos os
hashes, licenças e a procedência da arte estão fechados no repositório — com o Nível B
explicitamente marcado como "não liberado" até Q1, Q4 e o ADR B estarem resolvidos.

---

## Dependências e ordem de execução

```
F0 → F1 → F2 → (F3 ∥ F4, paralelo parcial) → F5 → F6a → F6b → F6c → F7
```

| Spike | Antes de | Observação |
|---|---|---|
| S7 | F0 (gate de hash), F4 | Decide o build do `llama-server` pinado |
| S5 | F4 | Decide modelo; mede visão para a F6c |
| S1, S2, S3, S6 | F5 | S3 também mede a visão e o perfil Qualidade |
| S4, S9 | F6a | S9 decide o shell (Q5) e alimenta F6b e F6c |
| S3, S5 (visão) | F6c | Sem os números de visão a fase não começa |
| S8 | F7 | Gate de release de persona e memória |

**Dependência externa de F4**: delegação real só existe com fluxos reais em `flows/` do Brain
ou o planner ligado (R17). Até lá a F4 fecha contra o fluxo de teste, e isso fica escrito no
PR — não é "pronto" disfarçado.

**Trava entre F3 e F4**: a F4 não mergeia antes de o `MemoryGate` da F3 existir.

---

## Regra de fechamento de qualquer entrega

Uma entrega só vira "feita" quando **todas** as respostas abaixo são sim, e o PR as cita:

1. O critério de **Aceite** dela tem um teste ou comando que falha sem o código e passa com?
2. O **gate da fase** inteiro passou localmente, não só o teste novo?
3. Foi conferida contra **P1–P15** e os riscos **R** citados na fase, sem "aceitar o risco"?
4. Há contrato (Zod e vetor) para todo formato de dado novo, escrito **antes** do código?
5. A decisão nova, se existe, foi registrada no estudo com data e `[Decidido durante a
   implementação]`?
6. Se tocou o protocolo do Brain: parou no ADR e registrou em §11.3, sem contorno?
7. Sem TODO, `any` silencioso, placeholder ou fallback que finja ser a coisa real?

Entrega com uma resposta "não" volta para a fila — não vira exceção documentada.

---

## Temas transversais

Valem para todas as fases. Onde uma fase diz algo mais específico, a fase ganha.

### Estratégia de teste

Pirâmide, do rápido ao caro:

1. **Vetores JSON** — schema, `affect.step`, diretor de presença. Sem rede, sem processo, sem
   relógio. São a especificação executável.
2. **Unitário** — validação Zod, `MemoryGate`, regra de tier, deduplicação, `persona/`.
3. **Integração com dublês** — `LlmClient` falso, `SttEngine`/`TtsEngine` de stub, Brain
   falso (ou `flows/two-step.yaml`), `AvatarRenderer` de stub. Os dublês são infraestrutura
   de teste: ficam em pasta de fixtures e **nunca são importados por código de produção**
   (mesma armadilha do nó falso no Brain).
4. **E2E reais** (`bun run e2e:*`) — reservados para gate de fase, não para todo PR. Falam com
   o Brain de verdade, com o `llama-server` de verdade, com o shell de verdade.
5. **Medição** (spikes, orçamentos, soak) — produzem número e relatório, não "passou/falhou".
   Só valem na máquina piso (Q1) e com o build pinado.

Regras:

- Se um teste precisa do dispositivo real para passar, o contrato de interface está mal
  descrito — o dublê deveria bastar para o comportamento, e o real fica para o E2E.
- **Teste manual só para o que não dá para automatizar** (DPI misto, vários monitores,
  clique atravessando a janela, qualidade de voz). Teste manual conta quando está
  **registrado**: o que foi feito, em qual máquina, com qual build, resultado. "Testei na mão"
  sem registro não conta.
- Determinismo: relógio, aleatoriedade e semente são **injetados** em toda função pura
  (`affect.step`, `decide`). Nenhum `Date.now()` ou `Math.random()` dentro delas.
- Teste de comportamento adversarial (injeção, eco, PII) é parte do gate da fase que
  introduz a superfície, não um item "de segurança" para depois.

### Modelo de erro

- Erros do Brain (`BUDGET_EXCEEDED`, `APPROVAL_DENIED`, `TIMEOUT`, `NODE_UNAVAILABLE`,
  `CANCELLED` e os demais do catálogo de lá) são **consumidos**, nunca redefinidos aqui. Cada
  um tem um mapeamento explícito para (a) evento de `affect` (F3) e (b) fala conservadora.
- Erros **locais** (LLM indisponível, VRAM insuficiente para o perfil, hash divergente do
  manifesto, pacote de arte corrompido, captura recusada, schema inválido no boot) são
  tipados em **um único arquivo** do núcleo, cada um com: código, `retryable`, mensagem para
  humano e **o que a persona diz** quando ele ocorre.
- Regra herdada do Brain: erro de transporte nunca é engolido. Vira estado explícito
  (`unknown`, `failed`) e fala honesta — nunca "deu certo", nunca silêncio (P1, P15).
- O usuário nunca vê stack trace. O log vê tudo, com `trace` (P9), sem transcrição (R7).

### Orçamentos consolidados

Fonte: D10 e §7.5. **Aqui só se lembra deles; quem manda é o estudo.** Cada número abaixo
tem um gate que o mede, não uma suposição.

| Recurso | Teto (perfil Padrão, 8 GB) | Medido em |
|---|---|---|
| VRAM total | folga mínima de 1 GB sempre | S3, F4, F5, F6c |
| LLM (texto) | ≤ 4,0 GB | S3, S5, F4 |
| LLM com projetor de visão | ≤ 5,0 GB | S3, F6c |
| Avatar e desktop | ≤ 1,0 GB | S4, S9, F6a |
| Voz na GPU | ≤ 1,5 GB, só com folga medida; **padrão é CPU** | S3, F5 |
| RAM livre após subir tudo | ≥ 3 GB | S3, soak da F7 |
| Overlay | 30 fps; render pausado quando oculto | S9, F6a |
| Latência de turno de voz | tetos de §7.5, por span | F5 |

**Spill para a CPU é falha, não degradação.** O núcleo mede no arranque, escolhe o perfil
pela VRAM medida e recusa o que não cabe (D10, regra 1).

### Segurança

- Todo serviço local (`llama-server`, canal cliente-núcleo, `/healthz` e `/rpc` quando
  ligados) escuta **só em loopback**. Recusar bind fora dele.
- Binário do `llama-server`, GGUF, `mmproj` e pacote de arte **pinados por hash** (P10). O
  hash vem do que foi medido e revisado, nunca do que "faz o gate passar".
- O Brain **não autentica o `approver`** (B8): P2 é garantido inteiramente aqui, por ação de
  UI e código determinístico.
- Local-first (P7): nenhum áudio, transcrição, imagem ou memória sai da máquina. Nada disso
  vai para log. Telemetria externa não existe por padrão.
- Toda entrada de terceiros (Report, áudio de fundo, texto da tela, página lida por um nó) é
  **dado delimitado, nunca instrução** (P3, R12, R28).
- `data/`, `secrets/`, `models/*.gguf` e `*.local` fora do git.
- Modelo de terceiros (D16) só pelo gate de elegibilidade; padrão é o oficial.

### Migração de schema e de dados

- Adicionar campo opcional: versão menor. Remover ou renomear: versão maior. Todo arquivo de
  dado (`persona/`, `memory/`, `delegations.json`) carrega `schemaVersion`.
- Tabelas SQLite têm versão de migração; **só migração para frente**. Rollback de schema não
  existe. (`persona rollback` é outra coisa: volta uma versão do conteúdo, e é log, não
  migração.)
- Migração que toca `memory/` nunca resgata conteúdo esquecido: tombstone continua sem
  conteúdo (P14).

### Idempotência e reinício

- Delegação é no máximo uma vez por intenção, garantida localmente (P11); a chave é
  persistida **antes** do `plan.run`.
- Reinício do núcleo com tarefa `running` volta `unknown` e **nunca reenvia** (P11, P12).
- Ação irreversível nunca entra em retry automático.

---

## Critérios globais de fase pronta

Uma fase só está entregue quando, todas as linhas:

- `bunx tsc --noEmit` e `bun test` verdes;
- o gate da fase passou **e está registrado** em `docs/status.md` (comandos, saída resumida,
  data, commit, máquina quando houver medição);
- o estudo foi atualizado se alguma decisão mudou, com nota datada;
- `AGENTS.md` foi atualizado se surgiu convenção nova;
- nenhum TODO, `any` silencioso ou placeholder no código entregue;
- nenhum comportamento novo sem teste ou vetor que o prove;
- a seção "Regra de fechamento de qualquer entrega" (acima) vale para cada entrega, não só
  para a fase.

---

## Riscos do próprio roadmap

1. **Spikes dependem de julgamento humano e da máquina piso.** S1/S2 (qualidade de voz), S4
   (retoque de arte) e S8 (influência percebida) não se automatizam, e S3/S5 só valem na
   RTX 3050. Se ficarem para o fim, travam F4, F5 e F6a. Mitigação: **S7 e S5 primeiro**,
   depois S1/S2/S3/S6, e os que pedem o responsável são agendados cedo.
2. **A F2 pode refutar o estudo** (B14, B15, B11, B12). Se refutar, o estudo ganha nota de
   revisão **antes** de a F3 começar — a F3 e a F4 não herdam uma premissa que caiu.
3. **A F4 depende do Brain.** Fluxos reais em `flows/` e os ADRs de urgência alta (B e D)
   são trabalho no repositório do Brain, fora deste roadmap. Até lá a F4 fecha contra o
   fluxo de teste, e isso é dito no PR, não escondido.
4. **F3 e F4 em paralelo parcial** deixam a porta aberta para a F4 mergear sem `MemoryGate`.
   Regra: a F4 não mergeia antes dele (R26).
5. **A F5 só mede latência certa de ponta a ponta.** Componente isolado dentro do orçamento
   não garante a soma. O span fim a fim é gate, não telemetria.
6. **A F6a a F6c apoiam-se em D17, Q15, S9, R28 e R29, que o estudo ainda marca como "sem
   registro de homologação"** (v3.2). Antes da F6a, o responsável homologa essas revisões ou
   as ajusta; senão o agente constrói em cima de decisão em aberto.
7. **A F6c não começa sem os números de visão** de S3 e S5. Sem eles o teto de 5,0 GB é
   hipótese.
8. **Soak longo não roda em CI rápido.** É gate de release (F7), não de PR.
9. **Uma máquina só.** Sem segunda instalação, "funciona aqui" é o único sinal de
   portabilidade; por isso o Nível B da F7 reabre o piso de hardware (Q1).

---

## Fora de escopo

- Alterar o Brain: qualquer mudança de contrato, manifesto ou invariante dele é ADR lá, com
  aprovação humana.
- **Interação nível 3** (agir na tela com mouse e teclado) pelo avatar: só via delegação ao
  Brain, tier `sensitive`, aprovação por UI. A decisão de a v1 entregar isso está aberta (Q15).
- Memória procedimental M4 (v2).
- Fine-tuning na v1 (Q3); LoRA só se o S5 mostrar aderência insuficiente.
- Live2D e importação de modelos de terceiros (§8.1, D7).
- Serviço de nuvem como padrão (P7); só como adaptador explícito e opt-in.
- Personality como nó do Brain (D1): a infraestrutura nasce pronta e desligada, sem consumidor.
- Planner LLM do Brain (ADR-A); harness do Coder; KairosBot.
- Distribuição a terceiros antes do Nível B da F7.
