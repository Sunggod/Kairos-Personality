---
name: measure
description: Mede VRAM, RAM, latência, FPS, tok/s e estabilidade do Kairos-Personality de forma reproduzível, na máquina piso e com build pinado. Use em spikes (S1–S9), gates de fase (F4, F5, F6a, F6c) e no soak da F7. Apoia o julgamento do agente; não define orçamento nem interpreta qualidade subjetiva.
---

# Skill — Medir

Medição só serve se outra pessoa (ou você, daqui a um mês) conseguir repeti-la e chegar ao
mesmo número, na mesma ordem de grandeza. Esta skill diz **o que registrar, como amostrar e
o que não confundir**. Os orçamentos em si vêm do estudo (D10, §7.5) e estão resumidos nos
"Orçamentos consolidados" do roadmap — aqui só se mede contra eles.

Referências: `docs/roadmap.md` (Orçamentos consolidados, Estratégia de teste), estudo D10/D11/
§7.5, skill `spike`.

**Não use** para decidir se um número é aceitável (isso é o orçamento do estudo) nem para
julgar qualidade percebida (humano).

---

## 1. Regras que valem sempre

1. **Máquina piso.** RTX 3050 8 GB, i5-10400F (sem AVX-512), 15,9 GB, Windows. Fora dela o
   número é "não medido" para fins de orçamento. Nunca extrapole de uma máquina mais forte.
2. **Build pinado.** Runtime e modelo por hash (`*.lock.json`). Número de build não
   declarado não vale.
3. **Sistema em estado conhecido.** Anote o que mais estava aberto (navegador, jogo, IDE).
   Para pico de VRAM e RAM, parta de uma linha de base **sem** o seu processo.
4. **Mais de uma rodada.** No mínimo três; reporte mediana e pior caso, não só o melhor.
5. **Aquecimento separado.** A primeira rodada (carga fria, cache vazio, compilação de
   shader) é reportada à parte; ela é real para o usuário, mas não é regime.
6. **Fim a fim, não componente.** Soma de componentes dentro do orçamento não garante o
   total. Latência de turno vale quando medida do evento de entrada até o efeito observável.
7. **Spill para a CPU é falha.** Se a medição mostra memória compartilhada ou offload de
   camadas, registre como falha de orçamento, não como "ficou lento".
8. **Nada sensível nos dados medidos:** sem transcrição, áudio, imagem nem conteúdo de
   memória em log ou relatório (P7). Meça tamanhos e tempos, não conteúdo.

---

## 2. O que medir e como

| Grandeza | Como amostrar | Armadilha |
|---|---|---|
| **VRAM** | `nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits -l 1`, por processo com `--query-compute-apps`; reporte **pico** e **regime** | `memory.used` inclui o desktop e outros apps; subtraia a linha de base. WDDM pode mostrar "dedicada" e "compartilhada": só a dedicada conta |
| **RAM** | Contador do processo (working set / private bytes) e **RAM livre do sistema** após subir tudo; teto: ≥ 3 GB livres | Working set ≠ memória privada; o orçamento é sobre o que **sobra** |
| **Latência de turno** | Spans (OpenTelemetry) do evento de entrada ao primeiro áudio/efeito; um span por etapa (VAD, STT, LLM até a 1ª sentença, TTS até o 1º áudio) | Média esconde a cauda: reporte p50 e p95. O 1º áudio importa mais que o fim |
| **tok/s e latência até a 1ª sentença** | Do `llama-server` (tempos por requisição) e do cliente; separe *prompt processing* de *geração* | Contexto longo muda tudo; registre o tamanho do prompt e do KV |
| **KV / contexto** | Variar `q8_0` / `q4_0` / f16 **uma variável por vez** | A qualidade da persona também muda: meça os dois lados (S5, S3) |
| **FPS / overlay** | FPS efetivo do renderer a 30 fps, em repouso, mínimo e com render pausado; CPU e GPU do processo do shell | Overlay oculto precisa realmente pausar o render (S9) |
| **Painel** | RAM e GPU antes de abrir, com ele aberto, **depois de fechar** — têm de voltar ao nível anterior | Painel escondido ≠ destruído |
| **Estabilidade / soak** | Amostrar a cada 10 s por todo o período: memória do processo, handles, VRAM, p95 de latência, erros | Vazamento só aparece em horas; um gráfico de tendência vale mais que um número final |
| **Visão (D17)** | Pico de VRAM **na codificação** do print, tokens por imagem, tamanho do `mmproj` carregado; com e sem o projetor | O teto de 5,0 GB inclui o projetor; descarregá-lo deve devolver a VRAM |

---

## 3. Protocolo

1. **Declare a condição** (build, perfil, contexto, o que está aberto, número de rodadas).
2. **Linha de base** sem o seu processo; depois suba o conjunto.
3. **Aqueça**, registre a rodada fria à parte, e meça as rodadas de regime.
4. **Amostre contínuo** (não ponto único) para pico, vazamento e cauda.
5. **Salve os dados brutos** (CSV com timestamp) em `docs/spikes/data/` ou no anexo do
   relatório; o relatório cita o arquivo. Resumo sem bruto não é reproduzível.
6. **Compare com o orçamento** da tabela do roadmap e diga a folga em números.
7. **Registre o que não foi medido** e por quê.

Um amostrador reutilizável pode viver em `scripts/measure/` (coleta periódica de VRAM/RAM por
processo para CSV). Escreva-o quando o primeiro spike precisar; se já existir, reuse. É
ferramenta de apoio, não produto: não o importe de código de produção.

---

## 4. Estimativa não é medida

O estudo marca vários números como **[Estimativa]** (STT/TTS na CPU sem AVX-512, projetor de
visão, tokens por imagem, KV por token calculado). Eles servem para **planejar**, não para
construir algo que dependa deles. Enquanto o spike não os medir:

- não os cite como fato num relatório, PR ou commit;
- se a decisão de uma fase depende deles, é o spike que vem antes;
- ao medir, registre a **diferença** contra a estimativa — se for grande, é achado (candidato
  a nota de revisão).

---

## 5. Erros comuns

| Erro | Efeito |
|---|---|
| Medir uma vez, reportar o melhor | orçamento otimista |
| Não subtrair a VRAM do desktop | folga aparente que não existe |
| Medir componente isolado e somar | estoura no conjunto |
| Só média de latência | cauda invisível; barge-in e engasgos reais |
| Fora da máquina piso, registrado como medida | decisão sobre número que não vale |
| Soak com um ponto no fim | vazamento não detectado |
| Não guardar os dados brutos | ninguém reproduz |
| Esquecer o projetor na conta da visão | passa do teto de 5,0 GB |
| Deixar log com transcrição durante a medição | P7 violado |

---

## 6. Checklist

- [ ] Máquina piso e build pinado declarados.
- [ ] Linha de base sem o meu processo; condições anotadas.
- [ ] Rodada fria à parte; no mínimo três rodadas de regime; p50/p95 (ou pico) reportados.
- [ ] Amostragem contínua para pico, vazamento e soak.
- [ ] Dados brutos salvos e citados no relatório.
- [ ] Comparado com o orçamento do roadmap, com a folga em números.
- [ ] Spill para a CPU tratado como falha; nada sensível nos dados.
- [ ] "Não medido" explícito onde não deu para medir.
