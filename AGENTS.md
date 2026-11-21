# AGENTS.md — Kairos-Personality

Guia operacional para qualquer agente (humano ou automático) que trabalhe neste repositório.
É curto de propósito: diz **o que não pode quebrar**, **o que só o responsável decide** e
**onde achar o resto**. O raciocínio vive no estudo; o procedimento, nas skills.

Comece por `docs/status.md`: ele diz onde o trabalho está e o que está bloqueado.

---

## 1. O que este projeto é

A Personality é o rosto e a voz do ecossistema Kairos: um LLM local que conduz a conversa com
uma persona (hoje **Akame**, semente provisória), um motor de emoção, voz (STT/TTS), um avatar
em sprites num overlay transparente sobre o desktop, e **delegação ao Brain** de tudo que o
LLM não faz sozinho. Na v1 é **cliente** do Brain (D1), pessoal e local (Q4).

Ela **não executa trabalho de agente**. Se o código se pegar abrindo arquivo, rodando tarefa ou
criando coisa para o usuário, deveria ter delegado ao Brain.

---

## 2. Fontes, em ordem de autoridade

| # | Documento | Papel |
|---|---|---|
| 1 | `docs/estudo-arquitetura.md` | **Decide.** D1–D17, P1–P15, R1–R29, spikes, fases, perguntas abertas |
| 2 | `docs/roadmap.md` | **Ordena.** Fases, entregas com aceite, gates, fluxo de construção |
| 3 | `AGENTS.md` (este) | **Como se trabalha aqui.** Invariantes resumidas, regras, armadilhas |
| 4 | `.kairos/skills/*` | **Procedimentos** que ajudam; nunca regra nova |
| 5 | `docs/status.md` | **Andamento.** Fase atual, registro de gate, handoff, pendências |

Em conflito, vale o de cima. Conflito se corrige no de baixo — **exceto** quando o estudo é
quem está errado: aí a correção entra no estudo primeiro, com nota datada (skill
`estudo-revisao`), e só depois nos demais. Nunca o contrário.

Contrato com o Brain: `C:\KairosBrain\docs\architecture.md`. Este repositório **não altera o
Brain**.

---

## 3. Stack

| Camada | Escolha |
|---|---|
| Runtime | Bun 1.4.3 + TypeScript 7.0.2 (ESM), fixados nas mesmas versões do Brain |
| Tipos | `tsc --noEmit` obrigatório — o Bun transpila, não tipa |
| Núcleo | `apps/personality-core` (TS): diálogo, afeto, persona, memória, delegação, supervisor do LLM |
| LLM | `llama-server` (llama.cpp) **pinado por hash**, só em loopback, API compatível com OpenAI (D9) |
| Validação | Zod como fonte; JSON Schema gerado e versionado |
| Estado | SQLite via `bun:sqlite` |
| Log e traço | `pino` estruturado com `trace`; spans OpenTelemetry por etapa do turno |
| Voz | Interfaces `SttEngine`/`TtsEngine`/`VoiceConverter`; **CPU por padrão**; motor decidido por S1/S2/S6 |
| Avatar | `AvatarRenderer` (interface) com PixiJS v8 e sprites PNG em camadas (§8.1) |
| Shell do cliente | Tauri é o candidato; **o S9 decide** (Q5). Canal com o núcleo: WebSocket local |
| Testes | `bun test` + vetores JSON + dublês; E2E reais por gate de fase |

O que depende de spike é "a definir" até o relatório existir em `docs/spikes/`. Não
implemente de memória uma escolha que o spike ainda não fez.

**O avatar é só sprites PNG em camadas** (§8.1). Não importe modelo de avatar de terceiros na v1.

---

## 4. Invariantes — NÃO VIOLAR

Resumo de `estudo-arquitetura.md` §4. Se uma entrega exige violar uma delas, a entrega está
desenhada errado: volte e redesenhe, não anote "risco aceito".

| | Invariante |
|---|---|
| P1 | **Fidelidade ao Report.** A persona estiliza; nunca altera `outcome`, `caveats` ou `effected`. `partial` nunca vira sucesso por tom ou humor |
| P2 | **Aprovação nunca vem do LLM.** Só de ação explícita do usuário na UI, por código determinístico |
| P3 | **Conteúdo de nó, áudio de terceiros e texto da tela são dado não confiável**: delimitado no prompt, nunca instrução |
| P4 | **Só o núcleo TS fala o protocolo do Brain.** Workers e cliente de avatar nunca falam com ele |
| P5 | **Zero nome de ecossistema em código.** O nome do nó é dado que volta no Report |
| P6 | **Todo motor atrás de interface** (LLM, STT, TTS, conversão de voz, avatar), trocável por configuração |
| P7 | **Local-first.** Áudio, transcrição, imagem e memória não saem da máquina; nada disso vai para log |
| P8 | **Estado afetivo só muda pelo motor de appraisal.** O LLM não escreve nele; tudo é auditável |
| P9 | **Um `trace` por turno**, propagado ao Brain, aos logs e aos spans |
| P10 | **O runtime de LLM é superfície de ataque**: loopback, binário e GGUF pinados por hash, nunca `--sleep-idle-seconds`, nunca estado/KV de fonte não confiável |
| P11 | **Delegação é no máximo uma vez por intenção**, garantida localmente (o Brain não propaga `idempotencyKey`) |
| P12 | **Forma livre, ação fechada.** A persona decide o que dizer; o núcleo decide o que pode ser feito. Nenhum caminho de ação passa pelo LLM |
| P13 | **`auto` nunca escreve em `floors` nem em `traits_base`** |
| P14 | **Memória opaca por padrão, auditável sob demanda.** Esquecimento gera tombstone sem conteúdo; `floors` não são memória |
| P15 | **Não mentir sobre ação ou intenção.** Não afirmar fato falso e, se perguntada, não negar o que fez nem o que tenta |

---

## 5. Regras duras do projeto

Além de P1–P15. Cada uma existe porque a alternativa já se mostrou um jeito fácil de errar.

1. **Hash de lock nunca é atualizado para fazer o gate passar.** `models.lock.json`,
   `runtime.lock.json` e o manifesto de arte mudam só depois de o artefato novo ter sido
   obtido, conferido e (se for modelo ou binário) coberto pelo spike correspondente.
2. **A persona não é suavizada.** O tom forte, o sarcasmo e o palavrão livre são decisão do
   responsável (D15, Q11), não defeito a corrigir. `floors` e `traits_base` **nunca** são
   editados por agente: valores atuais de Q11 — `explicit: allow`, `third_party_pii: never`,
   `identity: on_request`, `crisis: care`. O `persona.seed.json` é do responsável.
3. **Nenhum fallback que finja ser a coisa real.** Pacote de arte corrompido, modelo ausente,
   projetor incompatível, motor de voz fora: aviso visível ou fala honesta, nunca um substituto
   apresentado como se fosse ela.
4. **Nenhum parser tolerante na porta de entrada.** Toda fronteira (saída do LLM, payload do
   shell, resposta do Brain, arquivo de dado) valida com Zod. Nada de `JSON.parse` solto sem
   o schema logo em seguida.
5. **Dublês e fixtures nunca são importados por código de produção.**
6. **Relógio e aleatoriedade são injetados** em toda função pura (`affect.step`, `decide`).
   Sem `Date.now()` ou `Math.random()` dentro delas.
7. **Sem `any` silencioso, TODO ou placeholder** no que é entregue. Incompleto = não feito.
8. **Nada sensível em log**: transcrição, áudio, imagem, conteúdo de memória, texto de tela.
9. **Não versione** `data/`, `secrets/`, `models/*.gguf`, `*.local`.
10. **Mudança no Brain não é feita aqui.** Se uma entrega só funciona mudando o Brain, pare,
    registre em `estudo-arquitetura.md` §11.3 e avise o responsável. Não crie contorno
    silencioso que esconda a lacuna.

---

## 6. O que só o responsável decide ou faz

O agente prepara, mede, propõe e para. Não decide por ele:

- **Aceitar ADR** (do Brain ou daqui) e **homologar revisões do estudo** que mudam decisão de
  produto (D12–D17, Q*). Nota de revisão que só confirma ou refina um número medido não
  precisa esperar; a que muda decisão fica `[Proposta de revisão]` até a homologação.
- **Conteúdo da persona** (`persona.seed.json`, `floors`, `traits_base`).
- **Julgamento humano nos spikes**: qualidade percebida da voz (S1, S2), retoque e identidade
  da arte (S4), influência percebida (S8). O agente monta o experimento, coleta o objetivo e
  entrega o que falta para o responsável julgar.
- **Q15** (a v1 entrega o nível 3 de interação com a tela, ou não), reabrir **Q1/Q4** antes de
  distribuir, limiares do **D16**.
- **Medições que exigem a máquina piso** (RTX 3050, i5-10400F, 15,9 GB): só valem nela. Fora
  dela, o agente registra "não medido", nunca estima como se fosse medida.
- **Apagar** dado do usuário (`memory/`, `persona/`), a menos que o próprio fluxo de
  esquecimento do produto o faça.

---

## 7. O que o agente decide sozinho

Autonomia é a regra; as travas acima são a exceção. O agente decide, sem pedir:

- estrutura interna, nomes, divisão de módulos e bibliotecas **dentro da stack da §3**;
- a ordem de construção — o **Fluxo** de cada fase é ponto de partida, e desviar é permitido
  quando a dependência que o justificava não existe naquele caso (uma linha de justificativa
  em `docs/status.md`);
- testes, vetores e fixtures além dos exigidos; refactors **dentro da fase**;
- subagentes e paralelismo para trabalho independente;
- **melhorar as skills** quando o procedimento mostrou falha: edite a skill e registre.

As skills e os roteiros existem para poupar descoberta, não para impedir uma solução melhor.
Se o roteiro não serve ao caso, desvie, diga em uma linha por quê, e siga.

---

## 8. Quando parar e perguntar

Pare — e registre a pergunta em `docs/status.md` — quando:

1. a decisão **não está no estudo** e muda contrato, invariante ou comportamento visível;
2. um **spike contradiz** o estudo (nota de revisão antes de seguir);
3. a entrega só funciona **mudando o Brain**;
4. o gate da fase anterior **está vermelho**;
5. o caminho exige **violar P1–P15** ou uma regra da §5;
6. a ação é **irreversível** e poderia ir para qualquer lado (apagar dado, trocar hash
   pinado, publicar).

**Não pare** por dúvida reversível: escolha o caminho mais razoável, registre a premissa e
siga. Sem ninguém por perto (trabalho não assistido), o mesmo vale: faça o que é reversível,
deixe a decisão irreversível preparada e documentada, e pare nela.

---

## 9. Estrutura

```
apps/personality-core    núcleo TS: diálogo, afeto, persona, memória, delegação, voz,
                         supervisor do llama-server, canal com o cliente
apps/avatar-client       overlay e painel (shell + PixiJS); o esqueleto nasce na F0
packages/schema          Zod, JSON Schema gerado, vetores em vectors/
scripts/                 verify:runtime-pins, check:delegations, check:licenses,
                         simulate:*, e2e:*, soak:*
docs/                    estudo-arquitetura.md, roadmap.md, status.md, spikes/, licencas.md
.kairos/skills/          procedimentos para agentes
data/  secrets/  models/ locais, fora do git
```

`packages/schema` não depende de nada com runtime: é o que deixa outro componente (ou outra
linguagem) ler os tipos e os vetores sem trazer o núcleo junto. **Decidido na F0/F1:** os
`*.lock.json` ficam na raiz; `persona.seed.json` e `delegations.json` em
`packages/schema/data/` (dado versionado, sem runtime); JSON Schema gerado em
`packages/schema/generated/` e vetores em `packages/schema/vectors/`.

---

## 10. Verificação

Base, em toda fase:

```
bun install
bunx tsc --noEmit          # gate de tipos
bun test                   # unitário, vetores, integração com dublês
```

Falha em qualquer um é falha — não existe "o código está pronto, o typecheck passa depois".
Os comandos de gate de cada fase estão no roadmap e passam a existir conforme as fases (por
exemplo `verify:runtime-pins` desde a F0, `check:delegations` desde a F1, `e2e:*` a partir da
F2). **Um comando de gate que ainda não existe é entrega da fase, não motivo para pular o
gate.**

Depois do gate, revise com a skill `code-review`: o gate é condição necessária, a revisão
pega o que ele não vê.

---

## 11. Fluxo de trabalho

A skill `phase-runner` detalha; o miolo é:

1. Abra `docs/status.md` e `docs/roadmap.md` na fase em curso. Leia as seções do estudo que a
   fase cita, mais P1–P15 e os R citados — **não implemente do que "parece ter sido decidido"**.
2. Confira o gate da fase anterior. Vermelho: pare e conserte ali.
3. Monte a lista de tarefas a partir das **Entregas** (cada uma já tem Aceite) e do **Fluxo**.
4. **Contrato antes de comportamento**: tipo Zod e vetor primeiro (skill `contract-first`).
5. Teste que falha, depois o código mínimo que o faz passar.
6. Rode o gate **inteiro** da fase antes de marcar uma entrega como pronta.
7. **Um commit por entrega**; a mensagem cita a entrega e o aceite que ela satisfaz.
8. Ao fechar a fase, escreva o **registro de gate executado** em `docs/status.md`.
9. Decisão nova que o estudo não previa: registre no estudo, com data e
   `[Decidido durante a implementação]` (skill `estudo-revisao`), **antes** de seguir.
10. Termine toda sessão atualizando `docs/status.md` (handoff): o que ficou pronto, o que
    ficou pendente, a próxima ação. A conversa some; o repositório fica.

---

## 12. Spikes e medições

- Um spike produz **resposta medida e relatório**, não código de produção: skill `spike`.
- Sem `docs/spikes/SN-nome.md` (pergunta, método, números, veredito, data), o spike **não
  conta**, mesmo que alguém "tenha testado na mão".
- Número do estudo marcado **[Estimativa]** só vira fato quando um spike o mede. Até lá, não
  é base para construir nada que dependa dele: skill `measure` para medir direito.
- Se o veredito reprova a hipótese do estudo, a nota de revisão vem **antes** da fase seguinte.

---

## 13. Armadilhas conhecidas

**Sobre o Brain** (estudo §3.1; é **leitura**, o que dá para confirmar só a F2 confirma):

- `plan.run` é **síncrono** e não tem job id (B3): chame em tarefa assíncrona, sem timeout
  curto.
- Falha no meio do plano devolve **502 sem Report** (B11): o estado é `unknown`, nunca "falhou
  limpo".
- O Brain **não propaga `idempotencyKey`** aos passos (B12): a deduplicação é só local (P11).
- `approver` é string livre sem autenticação (B8): P2 depende inteiramente daqui.
- `kind: cancel` **não aborta** um `plan.run` em andamento (B14): a fala é "não consegui
  cancelar".
- Buffer de stream de 256 eventos por `trace` (B15): `dropped` é o sinal de que caiu evento.
- O planner LLM do Brain não está ligado (B4): só fluxos nomeados funcionam; mandar só
  `objective` falha.
- Não existe rota de leitura de catálogo (B13): a lista de fluxos é local (`delegations.json`).

**Sobre o runtime de LLM:**

- Só as rotas de chat compatíveis com OpenAI e `/health` são usadas; qualquer outra é falha de
  contrato (P10).
- O LLM **pode repetir** uma chamada `delegate`: a barreira é o registro de intenções local.
- Modelo sem censura (D16) só entra pelo gate de elegibilidade; o padrão é o oficial.

**Sobre voz e avatar:**

- O addon do `sherpa-onnx` sob **Bun no Windows** não foi validado (S6) — se falhar, entra o
  worker Python; até lá, não assuma.
- O número de STT/TTS na CPU do i5-10400F (sem AVX-512) é estimativa até S1/S2/S3.
- Lip-sync vem do **áudio reproduzido**, não do texto.
- Clique atravessando o overlay, DPI misto e vários monitores são **teste manual registrado**.

**Sobre arquivos e codificação** — aprendido na prática:

- Tudo é **UTF-8**, sem BOM nos arquivos novos (o `estudo-arquitetura.md` tem BOM e fica como está). Edite com Edit/Write; não gere conteúdo de arquivo por script
  quando uma ferramenta de edição basta.
- **Nunca reconstrua um arquivo a partir de uma leitura que pode ter sido truncada**: leia por
  trechos, edite no trecho.
- Depois de editar, procure resíduo de mojibake (por exemplo sequências como `Ã©`, `â€`) e
  confira o número de linhas esperado.
- Log de ferramenta e mensagem de erro **nunca** entram no conteúdo gravado.

**Sobre o estudo:** as revisões v3.1 e v3.2 (Akame, D16, D17, Q15, S9, R28, R29) ainda estão
**sem registro de homologação**.
O ponto está em `docs/status.md`; não construa a F6a em cima de D17 sem a homologação.

---

## 14. Mudanças de decisão

A arquitetura não é imutável: descoberta nova, spike que reprova ou premissa que cai geram
**revisão do estudo**.

- **É revisão** (skill `estudo-revisao`): muda uma decisão D*, uma invariante P*, um orçamento,
  uma escolha de motor, um contrato interno, algo entrando ou saindo de "fora de escopo".
- **Não é revisão**: bug, refactor, teste ou vetor novo, nome interno, escolha de biblioteca
  dentro da stack.
- Toda revisão tem: o que mudou, a evidência, as alternativas descartadas, a consequência
  (inclusive o que piora), data e marca (`[Decidido durante a implementação]` ou
  `[Proposta de revisão]` se precisar de homologação).
- **Mudança que alcança o Brain** é candidato a ADR em `estudo-arquitetura.md` §11.3. O ADR em
  si vive no repositório do Brain e só o responsável o aceita; agente nunca marca `aceito`.

---

## 15. Skills

Em `.kairos/skills/`. Ajudam; não mandam. Cada uma diz, no próprio texto, quando **não** usá-la
e quando se afastar dela.

| Skill | Use quando |
|---|---|
| `phase-runner` | Começar, conduzir ou fechar uma fase do roadmap |
| `contract-first` | Criar ou mudar um formato de dado: Zod, JSON Schema, vetores |
| `spike` | Rodar um spike e escrever o relatório |
| `measure` | Medir VRAM, RAM, latência, FPS, estabilidade, de forma reproduzível |
| `adversarial-tests` | Escrever testes de injeção, eco, PII, esquecimento, hit-test |
| `code-review` | Revisar uma entrega ou fase depois do gate |
| `estudo-revisao` | Registrar decisão nova ou revisão no estudo; preparar candidato a ADR do Brain |
