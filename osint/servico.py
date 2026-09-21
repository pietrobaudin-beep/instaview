"""
Serviço de busca de @ em outras redes, para testar no localhost.

Roda **fora** do Farejo: o site é Next.js na Vercel e não executa Python nem
chama binário. Aqui ele é um servidço separado, que o Farejo consultaria por
HTTP se você decidir seguir.

O que mudou em relação ao rascunho:

1. `--json` no Sherlock serve para **carregar** a lista de sites, não para
   gravar o resultado. Quem grava é `--output`, e é ele que usamos — do outro
   jeito o arquivo nunca aparecia e a resposta era sempre "nada encontrado".
2. A varredura é limitada a uma **lista curta** de redes (`--site`). Sem isso
   são ~400 sites por consulta: 40 segundos, bloqueio em vários e muito falso
   positivo.
3. O arquivo temporário nasce numa pasta própria e é apagado no fim, mesmo se
   der erro.
4. Tempo máximo por consulta, para o serviço não ficar pendurado.

Rodar:

    python3 -m venv .venv && . .venv/bin/activate
    pip install fastapi uvicorn sherlock-project
    uvicorn servico:app --port 8000

Testar:

    curl "http://localhost:8000/buscar/nasa"
"""

import asyncio
import json
import os
import shutil
import sys
import tempfile
import time

from fastapi import FastAPI, HTTPException

app = FastAPI(title="Farejo — localizador de @ em outras redes (teste)")

# As redes que o Farejo mostraria. Curta de propósito: a lista inteira do
# Sherlock (~400) não é um recurso, é um perfilamento — e demora.
REDES = [
    "TikTok",
    "Twitter",
    "YouTube",
    "Pinterest",
    "Twitch",
    "Reddit",
    "GitHub",
    "Spotify",
    "Facebook",
    "Telegram",
]

TEMPO_MAXIMO = 45  # segundos para a varredura inteira


def caminho_do_sherlock() -> str:
    """
    Onde está o executável.

    Rodando com `./.venv/bin/uvicorn`, a pasta do ambiente **não** entra no
    PATH — e o subprocesso não achava o `sherlock`, com `FileNotFoundError`.
    Por isso procuramos primeiro ao lado do próprio Python que está rodando.
    """
    ao_lado = os.path.join(os.path.dirname(sys.executable), "sherlock")
    if os.path.exists(ao_lado):
        return ao_lado
    return shutil.which("sherlock") or "sherlock"


@app.get("/buscar/{username}")
async def buscar_usuario(username: str):
    if not username or len(username) > 30 or not username.replace(".", "").replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="@ inválido")

    pasta = tempfile.mkdtemp(prefix="sherlock-")
    saida = os.path.join(pasta, f"{username}.json")
    comeco = time.time()

    comando = [
        caminho_do_sherlock(),
        username,
        "--output",
        saida,
        "--print-found",
        "--timeout",
        "5",
    ]
    for rede in REDES:
        comando += ["--site", rede]

    try:
        processo = await asyncio.create_subprocess_exec(
            *comando,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, erro = await asyncio.wait_for(processo.communicate(), timeout=TEMPO_MAXIMO)
        except asyncio.TimeoutError:
            processo.kill()
            raise HTTPException(status_code=504, detail="A varredura demorou demais.")

        if not os.path.exists(saida):
            # Sem arquivo: ou não achou nada, ou a CLI mudou de novo. Os dois
            # casos precisam aparecer, em vez de virar "nada encontrado".
            return {
                "username": username,
                "segundos": round(time.time() - comeco, 1),
                "total": 0,
                "perfis": [],
                "aviso": (erro or b"").decode()[:300] or "Nenhum perfil encontrado.",
            }

        with open(saida, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)

        perfis = [
            {"rede": rede, "url": info.get("url_user")}
            for rede, info in dados.items()
            if info.get("status") == "Claimed" or info.get("status") == "claimed"
        ]

        return {
            "username": username,
            "segundos": round(time.time() - comeco, 1),
            "total": len(perfis),
            "perfis": perfis,
            # O Farejo nunca afirma identidade: o mesmo @ pode ser outra pessoa.
            "aviso": "Mesmo @ nessas redes. Pode ser outra pessoa.",
        }
    finally:
        shutil.rmtree(pasta, ignore_errors=True)
