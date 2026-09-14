#!/usr/bin/env python3
"""
Gera um arquivo de coleção de cenas do OBS já com todas as fontes de navegador
apontando para o servidor local.

    python3 gerar_cenas_obs.py                 # porta 7373
    python3 gerar_cenas_obs.py --port 7374

Depois, no OBS:  Coleção de Cenas -> Importar -> escolha o arquivo gerado.
Importar cria uma coleção NOVA; sua coleção atual não é tocada.
"""

import argparse
import json

SCENES = [
    ("Começando",  "/overlay/fullscreen.html?scene=starting", False),
    ("Volto já",   "/overlay/fullscreen.html?scene=brb",      False),
    ("Encerrando", "/overlay/fullscreen.html?scene=ending",   False),
    ("Jogando",    "/overlay/ingame.html",                    True),
    ("Papo",       "/overlay/talking.html",                   False),
]
ALERTS_PATH = "/overlay/alerts.html"


def browser_source(name, url):
    return {
        "balance": 0.5,
        "deinterlace_field_order": 0,
        "deinterlace_mode": 0,
        "enabled": True,
        "flags": 0,
        "hotkeys": {},
        "id": "browser_source",
        "mixers": 0,
        "monitoring_type": 0,
        "muted": False,
        "name": name,
        "prev_ver": 520093697,
        "private_settings": {},
        "push-to-mute": False,
        "push-to-mute-delay": 0,
        "push-to-talk": False,
        "push-to-talk-delay": 0,
        "settings": {
            "url": url,
            "width": 1920,
            "height": 1080,
            "fps_custom": False,
            "reroute_audio": False,
            "restart_when_active": False,
            "shutdown": True,
            "webpage_control_level": 1,
        },
        "sync": 0,
        "versioned_id": "browser_source",
        "volume": 1.0,
    }


def scene_item(name, item_id):
    return {
        "align": 5,
        "blend_method": "default",
        "blend_type": "normal",
        "bounds": {"x": 0.0, "y": 0.0},
        "bounds_align": 0,
        "bounds_type": 0,
        "crop_bottom": 0,
        "crop_left": 0,
        "crop_right": 0,
        "crop_top": 0,
        "group_item_backup": False,
        "hide_transition_duration": 0,
        "id": item_id,
        "locked": False,
        "name": name,
        "pos": {"x": 0.0, "y": 0.0},
        "private_settings": {},
        "rot": 0.0,
        "scale": {"x": 1.0, "y": 1.0},
        "scale_filter": "disable",
        "show_transition_duration": 0,
        "visible": True,
    }


def scene(name, items):
    return {
        "balance": 0.5,
        "deinterlace_field_order": 0,
        "deinterlace_mode": 0,
        "enabled": True,
        "flags": 0,
        "hotkeys": {},
        "id": "scene",
        "mixers": 0,
        "monitoring_type": 0,
        "muted": False,
        "name": name,
        "prev_ver": 520093697,
        "private_settings": {},
        "push-to-mute": False,
        "push-to-mute-delay": 0,
        "push-to-talk": False,
        "push-to-talk-delay": 0,
        "settings": {
            "custom_size": False,
            "id_counter": len(items),
            "items": items,
        },
        "sync": 0,
        "versioned_id": "scene",
        "volume": 1.0,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=7373)
    ap.add_argument("--out", default="Stream Kit Local.json")
    args = ap.parse_args()
    base = f"http://localhost:{args.port}"

    sources = []
    order = []

    # a fonte de alertas é a mesma em todas as cenas
    alert_name = "Alertas (Stream Kit)"
    sources.append(browser_source(alert_name, base + ALERTS_PATH))

    for scene_name, path, with_alerts in SCENES:
        src_name = f"{scene_name} (Stream Kit)"
        sources.append(browser_source(src_name, base + path))
        items = [scene_item(src_name, 1)]
        if with_alerts:
            items.insert(0, scene_item(alert_name, 2))  # alertas por cima
        sources.append(scene(scene_name, items))
        order.append({"name": scene_name})

    collection = {
        "current_program_scene": SCENES[0][0],
        "current_scene": SCENES[0][0],
        "current_transition": "Esmaecer",
        "groups": [],
        "modules": {},
        "name": "Stream Kit Local",
        "preview_locked": False,
        "quick_transitions": [],
        "saved_projectors": [],
        "scaling_enabled": False,
        "scaling_level": 0,
        "scaling_off_x": 0.0,
        "scaling_off_y": 0.0,
        "scene_order": order,
        "sources": sources,
        "transition_duration": 300,
        "transitions": [],
    }

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(collection, fh, ensure_ascii=False, indent=2)

    print(f"Pronto: {args.out}")
    print("No OBS: Coleção de Cenas -> Importar -> escolha esse arquivo.")
    print("Lembre de adicionar a sua webcam DENTRO das cenas 'Jogando' e 'Papo',")
    print("abaixo da camada do Stream Kit na lista de Fontes.")


if __name__ == "__main__":
    main()
