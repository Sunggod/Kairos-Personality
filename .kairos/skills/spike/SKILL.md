---
name: spike
description: Prepara, executa e relata um spike (S1–S9) do Kairos-Personality — pergunta, método, números, veredito — separando o que o agente mede do que só o responsável julga. Use ao abrir um spike ou ao escrever docs/spikes/SN-nome.md. Apoia o julgamento do agente; não substitui o estudo nem decide o que é gosto do responsável.
---

# Skill — Spike

Um spike responde **uma pergunta** com **número medido**. Não é protótipo nem código de
produção; é um experimento descartável que termina em um relatório de uma página. Sem
relatório, o spike não conta — mesmo que alguém "tenha testado na mão" (roadmap, Spikes).

Referências: `docs/roadmap.md` (tabela de spikes e "Dependências"), `docs/estudo-arquitetura.md`
(a seção de spikes, §9/§10), `AGENTS.md` §6 e §12, skill `measure`.

**Não use** para construir feature (é `phase-runner`) nem para reabrir uma decisão sem
medição (é `estudo-revisao`).

---

## 1. Antes de começar

1. **Releia a linha do spike** na tabela do estudo: pergunta, o que mede, o que bloqueia.
2. **Defina o veredito antes de medir.** Escreva a hipótese do estudo e o **critério** que a
   confirma ou reprova (um número, um limiar). Critério definido depois do resultado vira
   racionalização. Onde o limiar é decisão do responsável (D16, margem do enum de `flow`),
   ele precisa estar definido **antes** do teste — se não está, pare e pergunte.
3. **Separe o que é seu do que é humano:**

| Você (agente) faz | Só o responsável julga |
|---|---|
| Montar corpus, scripts, harness, coleta, tabelas | Qualidade percebida da voz (S1, S2) |
| Medir latência, VRAM, RAM, WER, tok/s, estabilidade | Retoque e identidade da arte (S4) |
| Preparar amostras lado a lado (A/B) | Influência percebida (S8) |
| Rodar e registrar | Aceitar ou rejeitar o resultado subjetivo |

   Para o que é humano: monte o experimento, deixe o material pronto e **pare**. Não
   "resolva" o julgamento por ele.
4. **Máquina piso.** Medição de VRAM, RAM e latência só vale na máquina piso (RTX 3050,
   i5-10400F, 15,9 GB, Windows) e com o build pinado. Fora dela, registre **"não medido"**.
5. **Dependências de spike:** confira "Dependências e ordem de execução" no roadmap. S7 e S5
   primeiro; os que pedem o responsável, cedo.

---

## 2. Método

- **Uma variável por vez.** Mudar modelo e quantização juntos não diz qual causou o quê.
- **Linha de base.** Todo número vem com a referência (o oficial contra o variante; f16
  contra `q8_0`).
- **Repetição.** Meça mais de uma vez; reporte a dispersão, não só a melhor rodada.
- **Corpus próprio.** pt-BR espontâneo, no microfone do responsável, nos casos reais de
  delegação — não benchmark em inglês de blog. Registre como o corpus foi montado.
- **Condição registrada.** Build (hash), flags, perfil, o que mais estava aberto, estado
  térmico quando relevante. Sem isso o número não é reproduzível.
- **Sem estimar.** Número [Estimativa] do estudo só vira fato se **você o mediu**. Se não
  deu para medir, diga "não medido" e por quê.
- **Efeitos colaterais.** Nada de baixar artefato fora do pin, nada de alterar `*.lock.json`
  para "o teste passar" (regra 1). O spike pode **propor** o hash; quem o grava é a fase.
- **Nada sensível no relatório:** transcrição, áudio, imagem, conteúdo de memória (P7).

---

## 3. Modelo do relatório

`docs/spikes/SN-nome.md`, uma página. Se passar disso, o excedente vira anexo.

```markdown
# SN — <nome>

Data: <AAAA-MM-DD>   Máquina: <piso / outra>   Build: <hash do runtime / modelo>

## Pergunta
<a pergunta do estudo, copiada>

## Hipótese e critério (definidos antes de medir)
<o que o estudo supõe> — confirma se <limiar>; reprova se <limiar>.

## Método
<o que foi rodado, com quê, quantas vezes; corpus e como foi montado>

## Resultados
| Métrica | Linha de base | Candidato | Condição |
|---|---|---|---|
| ... | ... | ... | ... |

## O que não foi medido
<lista — "nenhum" só se for verdade>

## Veredito
**Segue o estudo** | **Estudo precisa de nota de revisão** | **Inconclusivo**
<uma ou duas frases com o motivo, apoiadas nos números>

## Consequências
<o que isto libera, bloqueia ou muda; fase afetada; hash proposto, se for o caso>

## Julgamento pendente do responsável
<o que só ele decide, com o material pronto — ou "nenhum">
```

---

## 4. Vereditos

- **Segue o estudo:** os números cumprem o critério. Registre e libere a fase dependente.
- **Reprova:** a hipótese não se sustenta. A **nota de revisão no estudo vem antes** da fase
  seguinte (`estudo-revisao`). Não contorne na implementação.
- **Inconclusivo:** o método não discriminou. Diga o que faltou e o que mediria a seguir. É um
  resultado válido — melhor que um "passou" frágil.
- **Resultado que surpreende** (melhor ou pior que o esperado): confira o método **antes** de
  comemorar ou revisar o estudo; surpresa costuma ser erro de medição.

---

## 5. Notas por spike

Lembretes, não regras; o estudo manda.

| Spike | Cuidado |
|---|---|
| S7 | Confirmar por nota de versão **qual build corrige cada CVE**; não adotar correção de terceiro sem revisão. Modelo de terceiro é convertido localmente e os dois hashes (safetensors e GGUF) vão ao manifesto |
| S5 | Seguir a **ordem do D16**: oficial com prompt → oficial com LoRA → sem censura. Para a variante sem censura, a mesma bateria com recusa indevida e obediência a injeção |
| S3 | Pico de VRAM **por componente** e do conjunto; spill para a CPU é falha. Inclui visão (D17): pico na codificação de print, tokens por imagem |
| S1/S2/S6 | CPU sem AVX-512: os números do estudo são [Estimativa]. S6 decide se existe worker Python |
| S4 | Consistência de identidade entre peças e custo de VRAM do atlas; o retoque é humano |
| S9 | Tauri e Electron **lado a lado**; decide o shell (Q5). Hit-test por silhueta, DPI misto e vários monitores são **teste manual registrado** |
| S8 | S5 mede o **modelo**, S8 mede o **sistema**. Influência percebida é humana |

---

## 6. Erros comuns

| Erro | Efeito |
|---|---|
| Definir o critério depois do resultado | racionalização, não medição |
| "Testei na mão" sem relatório | não conta |
| Medir fora da máquina piso e registrar como medida | orçamento estoura na máquina real |
| Mudar duas variáveis de uma vez | conclusão sem causa |
| Uma rodada só | dispersão desconhecida |
| Tratar [Estimativa] como fato | fundação falsa |
| Decidir o gosto do responsável | invade a decisão dele |
| Atualizar o lock para o teste passar | regra 1 violada |
| Relatório sem "o que não foi medido" | falsa sensação de completo |

---

## 7. Checklist

- [ ] Hipótese e critério escritos **antes** de medir; limiares do responsável já definidos.
- [ ] Separei o que é meu do que é julgamento humano e parei neste último.
- [ ] Medi na máquina piso, com build pinado, e registrei a condição — ou escrevi "não medido".
- [ ] Mais de uma rodada; uma variável por vez; linha de base presente.
- [ ] Nada sensível no relatório; nenhum lock alterado.
- [ ] Relatório de uma página em `docs/spikes/SN-nome.md`, com veredito e "o que não foi medido".
- [ ] Se reprovou: nota de revisão no estudo antes da fase seguinte.
- [ ] `docs/status.md` (tabela de spikes) atualizado.
