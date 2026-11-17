import { describe, expect, it } from "vitest";
import { adicionarItem, alterarQuantidade, contarItens, paraPayload, removerItem, totalCarrinho, type ItemCarrinho } from "./cart";

const base: Omit<ItemCarrinho, "key"> = {
  produtoId: "produto-1",
  nome: "Moqueca",
  precoBase: 50,
  adicionais: [{ id: "add-1", nome: "Farofa", preco: 5 }],
  quantidade: 1,
  observacao: "sem coentro",
  imagemUrl: null,
};

describe("cart", () => {
  it("adiciona e mescla linhas iguais", () => {
    const primeira = adicionarItem([], base);
    const segunda = adicionarItem(primeira, { ...base, quantidade: 2 });
    expect(segunda).toHaveLength(1);
    expect(segunda[0]?.quantidade).toBe(3);
    expect(contarItens(segunda)).toBe(3);
  });

  it("não mescla linhas com observações diferentes", () => {
    const primeira = adicionarItem([], base);
    const segunda = adicionarItem(primeira, { ...base, observacao: "com coentro" });
    expect(segunda).toHaveLength(2);
  });

  it("calcula total com adicionais", () => {
    const itens = adicionarItem([], { ...base, quantidade: 2 });
    expect(totalCarrinho(itens)).toBe(110);
  });

  it("altera quantidade e remove ao chegar a zero", () => {
    const itens = adicionarItem([], base);
    const key = itens[0]!.key;
    const atualizado = alterarQuantidade(itens, key, 4);
    expect(atualizado[0]?.quantidade).toBe(4);
    expect(alteraQuantidadeParaZero(atualizado, key)).toHaveLength(0);
  });

  it("remove item pelo identificador", () => {
    const itens = adicionarItem([], base);
    expect(removerItem(itens, itens[0]!.key)).toHaveLength(0);
  });

  it("monta o payload com ids e sem preços", () => {
    const itens = adicionarItem([], base);
    const payload = paraPayload(itens);
    expect(payload).toEqual([
      {
        produto_id: "produto-1",
        quantidade: 1,
        adicionais: ["add-1"],
        observacao: "sem coentro",
      },
    ]);
    expect(payload[0]).not.toHaveProperty("precoBase");
  });
});

function alteraQuantidadeParaZero(itens: ItemCarrinho[], key: string) {
  return alterarQuantidade(itens, key, 0);
}
