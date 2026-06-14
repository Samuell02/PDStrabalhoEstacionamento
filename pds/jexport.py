import os
import json

PASTAS_IGNORADAS = {
    ".git",
    "__pycache__",
    "node_modules",
    "venv",
    ".venv",
    ".idea",
    ".vscode"
}

# Pasta onde o script está salvo
PASTA_RAIZ = os.path.dirname(os.path.abspath(__file__))

# Arquivo de saída na mesma pasta do script
ARQUIVO_SAIDA = os.path.join(PASTA_RAIZ, "estrutura2.json")


def montar_estrutura(caminho):
    estrutura = {
        "nome": os.path.basename(caminho),
        "tipo": "pasta",
        "conteudo": []
    }

    try:
        itens = sorted(os.listdir(caminho))
    except (PermissionError, OSError):
        return estrutura

    for item in itens:
        caminho_item = os.path.join(caminho, item)

        if os.path.isdir(caminho_item):
            if item in PASTAS_IGNORADAS:
                continue

            estrutura["conteudo"].append(
                montar_estrutura(caminho_item)
            )

        else:
            estrutura["conteudo"].append({
                "nome": item,
                "tipo": "arquivo",
                "extensao": os.path.splitext(item)[1],
                "tamanho_bytes": os.path.getsize(caminho_item)
            })

    return estrutura


def main():
    estrutura = {
        "pasta_raiz": PASTA_RAIZ,
        "estrutura": montar_estrutura(PASTA_RAIZ)
    }

    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(
            estrutura,
            f,
            ensure_ascii=False,
            indent=2
        )

    print("\nEstrutura exportada com sucesso!")
    print(f"Arquivo JSON: {ARQUIVO_SAIDA}")


if __name__ == "__main__":
    main()