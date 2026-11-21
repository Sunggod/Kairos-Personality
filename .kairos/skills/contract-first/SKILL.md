---
name: contract-first
description: Cria ou altera um formato de dado do Kairos-Personality (persona, memória, afeto, delegação, payload do shell, config) começando pelo contrato — tipo Zod, JSON Schema gerado e vetores — antes do código que o usa. Use sempre que um dado novo cruza uma fronteira ou um dado existente muda de forma. Apoia o julgamento do agente; não decide o conteúdo do dado.
---

# Skill — Contrato primeiro

O contrato é a especificação executável. Escrito antes, ele obriga a decidir o que o dado
**é** e o que ele **recusa** enquanto a decisão ainda é barata. Esta skill é um método, não
um molde: o formato de cada dado vem do estudo; aqui está a ordem de trabalho e o que
costuma ser esquecido.

Referências: `AGENTS.md` §4 (P1–P15) e §5 (regras 4, 6), `docs/roadmap.md` (Fase 1 e
"Migração de schema e de dados"), `docs/estudo-arquitetura.md` (D5, D12, D13, D14, D15).

**Não use** para decidir o que o dado deve conter quando o estudo é omisso (isso é
`estudo-revisao`) nem para comportamento (a lógica vem depois do contrato, não nele).

---

## 1. Quando é "contrato"

É contrato todo dado que atravessa uma fronteira ou sobrevive ao processo:

- arquivos de dado: `persona/`, `memory/`, `delegations.json`, `persona.seed.json`, `*.lock.json`;
- estado persistido: tabelas SQLite (tarefas, intenções, memória, tombstones);
- mensagens entre componentes: núcleo ↔ cliente (WebSocket), núcleo ↔ shell (geometria de
  janela, tela cheia), núcleo ↔ worker de voz, se existir;
- **saída do LLM** (chamada `delegate`, enum de `flow`) e **resposta do Brain**;
- configuração (`KAIROS_PERSONALITY_*`).

Dado que nunca sai de uma função (tipo interno de módulo) não precisa de vetor: precisa só
de tipo TypeScript decente.

---

## 2. A ordem

```
1. decidir o que o dado recusa  →  2. tipo Zod  →  3. vetores (válidos e inválidos)
→  4. JSON Schema gerado  →  5. só então o código que usa  →  6. versão e migração
```

### 2.1 Decida primeiro o que o dado recusa

Antes de escrever campo, escreva em lista curta **as coisas que não podem existir**. É o que
mais rende. Para este projeto, as recusas típicas vêm das invariantes:

| Recusa | Origem |
|---|---|
| `auto` escrevendo em `floors` ou `traits_base` — **impossível no tipo**, não só em runtime | P13, D12 |
| Tombstone com conteúdo | P14 |
| Memória M2/M3 com PII de terceiro, segredo, token, caminho de arquivo, Report cru | R26, P14 |
| `DelegationEntry` sem `tier`; `sensitive` sem `slots` | D13 |
| Valor de afeto fora de `[-1, 1]` | D5 |
| Campo desconhecido onde o contrato é fechado (`.strict()`) | regra 4 |
| Payload do shell com título de janela (ele só carrega o que o diretor usa) | roadmap F6b |
| Evento de posição indo ao `LlmClient` | P12 |

### 2.2 Tipo Zod

- Zod é a **fonte**. O tipo TypeScript sai de `z.infer`; ninguém mantém interface paralela.
- `.strict()` em fronteira de entrada: campo desconhecido é erro, não é ignorado.
- Prefira **união discriminada** a objeto com opcionais soltos: o estado impossível fica
  irrepresentável.
- `locked` vs `auto` vira **diferença de tipo** (por exemplo, um tipo de escrita que só aceita
  as chaves `auto`), de modo que o compilador recuse a violação.
- Valores numéricos com limites explícitos (`min`/`max`); strings que viram caminho, comando
  ou prompt têm formato restrito.
- Todo arquivo de dado e toda tabela carregam `schemaVersion`.
- Zod valida a **forma**; regra que depende de contexto (ex.: "`sensitive` exige pedido no
  turno") é código com teste, não refinamento escondido no schema.

### 2.3 Vetores

Em `packages/schema/vectors/*.json`. Todo vetor tem `id`, `input` e `expect` (`ok` ou o
**motivo** da rejeição). Boa cobertura tem metade de rejeições. Para cada recusa da §2.1:
um vetor que a exercita e um vizinho válido que prova que o schema não ficou apertado demais.

```json
{ "id": "persona-auto-escreve-floors", "input": { "...": "..." },
  "expect": { "reject": "locked_field_write" } }
```

Vetor que **só tem casos felizes** não prova que o contrato recusa nada.

### 2.4 JSON Schema gerado

`bun run gen:schema` escreve `packages/schema/generated/*.json`; o CI roda
`gen:schema && git diff --exit-code`. Nunca edite o gerado à mão. Se o gerado diverge do
Zod, o erro está no gerador ou no tipo, não no arquivo.

### 2.5 Só então o código

Quando o teste de contrato está verde, o código de comportamento entra — e valida a entrada
**na fronteira** com o schema (regra 4: nada de `JSON.parse` solto).

### 2.6 Versão e migração

- Campo **opcional novo**: versão menor. **Remover ou renomear**: versão maior.
- SQLite: migração só **para frente**, versionada. Rollback de schema não existe;
  `persona rollback` é outra coisa (volta o conteúdo, é log).
- Migração que toca `memory/` **nunca resgata conteúdo esquecido** (P14).
- Se a mudança quebra dado já gravado, ela precisa de migração **e** de vetor do dado antigo
  sendo aceito (ou recusado com motivo claro).

---

## 3. Fronteira com o Brain

O formato do Brain não é seu. Você o **consome**: valide a resposta com Zod no seu lado,
trate campo desconhecido com cuidado e **não redefina** o catálogo de erros dele. Se o
contrato do Brain precisa de algo novo, é candidato a ADR (`estudo-revisao`), não mudança
local nem contorno (regra 10).

---

## 4. Erros comuns

| Erro | Efeito |
|---|---|
| Escrever o código e "depois fazer o schema" | schema descreve o que o código faz, não o que deveria |
| Só vetores felizes | contrato que não recusa nada |
| `locked` só verificado em runtime | basta um caminho esquecido para violar P13 |
| Schema sem `.strict()` na entrada | campo inesperado passa em silêncio |
| `JSON.parse` sem Zod logo depois | parser tolerante na porta (regra 4) |
| Editar o JSON Schema gerado | o CI reverte na próxima rodada |
| Dado novo sem `schemaVersion` | migração futura sem ponto de apoio |
| Regra de contexto escondida em `.refine` | difícil de testar e de auditar |
| Vetor sem motivo de rejeição | "reprovou" por qualquer razão passa |

---

## 5. Checklist

- [ ] Listei o que o dado recusa antes de escrever campo.
- [ ] O tipo vem de `z.infer`; entrada em fronteira é `.strict()`.
- [ ] Estado impossível é irrepresentável (união discriminada, tipos de escrita separados).
- [ ] Há vetores felizes **e** de rejeição, cada rejeição com motivo.
- [ ] `gen:schema && git diff --exit-code` limpo.
- [ ] `schemaVersion` presente; migração só para frente, se mudou dado existente.
- [ ] Nenhum `JSON.parse` sem validação; dublê de teste não importado em produção.
- [ ] Contrato escrito **antes** do código que o usa.
