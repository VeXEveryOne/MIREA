from __future__ import annotations

import copy
import json
from pathlib import Path


from config import MODEL_DIR
CANONICAL = MODEL_DIR / "ПР1_BPMN_AS_IS.omni"
TARGETS = [CANONICAL]


document = json.loads(CANONICAL.read_text(encoding="utf-8"))
objects = document["layout"]["objects"]
custom_counter = 0


def custom_object(kind: str, properties: dict) -> str:
    global custom_counter
    custom_counter += 1
    key = f"object:rop_as_is_layout_{custom_counter}"
    objects[key] = {"type": kind, "properties": properties}
    return key


def set_bounds(di_id: str, x: float, y: float, width: float, height: float) -> None:
    bounds_ref = objects[di_id]["properties"]["bounds"]["ref"]
    objects[bounds_ref]["properties"] = {
        "x": x,
        "y": y,
        "width": width,
        "height": height,
    }


def set_waypoints(di_id: str, points: list[tuple[float, float]]) -> None:
    refs = []
    for x, y in points:
        refs.append({"ref": custom_object("dc:Point", {"x": x, "y": y})})
    objects[di_id]["properties"]["waypoint"] = refs


def set_label(
    di_id: str,
    x: float,
    y: float,
    width: float = 180,
    height: float = 46,
) -> None:
    bounds = custom_object(
        "dc:Bounds", {"x": x, "y": y, "width": width, "height": height}
    )
    label = custom_object("bpmndi:BPMNLabel", {"bounds": {"ref": bounds}})
    objects[di_id]["properties"]["label"] = {"ref": label}


def clear_label(di_id: str) -> None:
    objects[di_id]["properties"].pop("label", None)


# Основной лист: свёрнутый подпроцесс и явный возврат после отклонения Ozon.
main_shapes = {
    "id:Main_Ucoms_di": (20, 250, 2180, 420),
    "id:Main_PC4Games_di": (360, 20, 520, 70),
    "id:Main_ITPartner_di": (1080, 20, 520, 70),
    "id:Main_Ozon_di": (20, 790, 2180, 70),
    "id:Main_Start_di": (80, 383, 44, 44),
    "id:Main_Init_di": (180, 350, 220, 110),
    "id:Main_Prepare_di": (480, 350, 240, 110),
    "id:Main_Submit_di": (800, 350, 220, 110),
    "id:Main_Result_di": (1090, 350, 220, 110),
    "id:Main_Accepted_di": (1380, 378, 54, 54),
    "id:Main_Published_di": (1770, 383, 44, 44),
    "id:Main_RecordError_di": (1310, 525, 250, 105),
}
for shape_id, rect in main_shapes.items():
    set_bounds(shape_id, *rect)
objects["id:Main_Prepare_di"]["properties"]["isExpanded"] = False

main_edges = {
    "id:Main_F01_di": [(124, 405), (180, 405)],
    "id:Main_F02_di": [(400, 405), (480, 405)],
    "id:Main_F03_di": [(720, 405), (800, 405)],
    "id:Main_F04_di": [(1020, 405), (1090, 405)],
    "id:Main_F05_di": [(1310, 405), (1380, 405)],
    "id:Main_F06_di": [(1434, 405), (1770, 405)],
    "id:Main_F07_di": [(1407, 432), (1407, 525)],
    "id:Main_F08_di": [
        (1310, 578),
        (1180, 578),
        (1180, 655),
        (600, 655),
        (600, 460),
    ],
    "id:Main_M01_di": [(560, 350), (560, 135), (620, 135), (620, 90)],
    "id:Main_M02_di": [(700, 90), (700, 150), (650, 150), (650, 350)],
    "id:Main_M03_di": [(610, 350), (610, 180), (1300, 180), (1300, 90)],
    "id:Main_M04_di": [(1420, 90), (1420, 210), (690, 210), (690, 350)],
    "id:Main_M05_di": [(910, 460), (910, 790)],
    "id:Main_M06_di": [(1200, 790), (1200, 460)],
}
for edge_id, points in main_edges.items():
    set_waypoints(edge_id, points)
for edge_id in main_edges:
    clear_label(edge_id)
set_label("id:Main_F06_di", 1540, 365, 70, 32)
set_label("id:Main_F07_di", 1420, 465, 70, 32)
set_label("id:Main_F08_di", 760, 605, 310, 42)
set_label("id:Main_M01_di", 390, 105, 190, 44)
set_label("id:Main_M02_di", 700, 105, 220, 44)
set_label("id:Main_M03_di", 1050, 145, 190, 44)
set_label("id:Main_M04_di", 1425, 145, 220, 44)
set_label("id:Main_M05_di", 920, 630, 240, 44)
set_label("id:Main_M06_di", 1210, 630, 210, 44)


# Лист подготовки: четыре роли, ручные задачи и три внутренних цикла потерь.
prep_shapes = {
    "id:Manager_di_1": (20, 20, 2600, 250),
    "id:Prep_Technical_di": (20, 270, 2600, 360),
    "id:Prep_Stock_di": (20, 630, 2600, 270),
    "id:Prep_Designer_di": (20, 900, 2600, 250),
    "id:Prep_PrepStart_di": (70, 108, 44, 44),
    "id:FindFiles_di_1": (170, 75, 250, 110),
    "id:Copy_di_1": (490, 385, 250, 110),
    "id:Prep_Check_di": (810, 385, 250, 110),
    "id:Prep_Compatible_di": (1120, 413, 54, 54),
    "id:Prep_Fix_di": (1020, 505, 250, 100),
    "id:Prep_Offers_di": (1220, 700, 260, 105),
    "id:Prep_Available_di": (1550, 726, 54, 54),
    "id:Prep_Replace_di": (1430, 385, 260, 110),
    "id:Prep_Calculate_di": (1750, 75, 250, 110),
    "id:Prep_Images_di": (2050, 970, 260, 105),
    "id:Complete_di_1": (2270, 103, 54, 54),
    "id:Missing_di_1": (1980, 165, 240, 90),
    "id:Prep_PrepEnd_di": (2500, 108, 44, 44),
}
for shape_id, rect in prep_shapes.items():
    set_bounds(shape_id, *rect)

prep_edges = {
    "id:Prep_D01_di": [(114, 130), (170, 130)],
    "id:Prep_D02_di": [(420, 130), (455, 130), (455, 440), (490, 440)],
    "id:Prep_D03_di": [(740, 440), (810, 440)],
    "id:Prep_D04_di": [(1060, 440), (1120, 440)],
    "id:Prep_D05_di": [(1147, 467), (1147, 505)],
    "id:Prep_D06_di": [(1020, 555), (965, 555), (965, 600), (935, 600), (935, 495)],
    "id:Prep_D07_di": [(1174, 440), (1195, 440), (1195, 752), (1220, 752)],
    "id:Prep_D08_di": [(1480, 752), (1550, 752)],
    "id:Prep_D09_di": [(1577, 726), (1577, 650), (1560, 650), (1560, 495)],
    "id:Prep_D10_di": [(1430, 440), (1380, 440), (1380, 315), (615, 315), (615, 385)],
    "id:Prep_D11_di": [(1604, 753), (1660, 753), (1660, 130), (1750, 130)],
    "id:Prep_D12_di": [(2000, 130), (2020, 130), (2020, 1022), (2050, 1022)],
    "id:D13_di_1": [(2310, 1022), (2350, 1022), (2350, 130), (2324, 130)],
    "id:D14_di_1": [(2270, 130), (2240, 130), (2240, 210), (2220, 210)],
    "id:D15_di_1": [(1980, 210), (1940, 210), (1940, 5), (295, 5), (295, 75)],
    "id:D16_di_1": [(2324, 130), (2500, 130)],
}
for edge_id, points in prep_edges.items():
    set_waypoints(edge_id, points)
    clear_label(edge_id)

set_label("id:Prep_D05_di", 1160, 470, 70, 32)
set_label("id:Prep_D06_di", 775, 555, 230, 42)
set_label("id:Prep_D07_di", 1180, 510, 70, 32)
set_label("id:Prep_D09_di", 1590, 635, 70, 32)
set_label("id:Prep_D10_di", 850, 320, 240, 42)
set_label("id:Prep_D11_di", 1620, 650, 70, 32)
set_label("id:D14_di_1", 2180, 120, 70, 32)
set_label("id:D15_di_1", 970, 10, 250, 42)
set_label("id:D16_di_1", 2390, 88, 70, 32)

# У шлюза полноты после переноса на правильный лист не было подписи.
set_label("id:Prep_Compatible_di", 1050, 350, 200, 42)
set_label("id:Prep_Available_di", 1460, 655, 230, 52)
set_label("id:Complete_di_1", 2200, 55, 190, 42)

main_refs = [
    "id:Main_Ucoms_di",
    "id:Main_PC4Games_di",
    "id:Main_ITPartner_di",
    "id:Main_Ozon_di",
    "id:Main_Start_di",
    "id:Main_Init_di",
    "id:Main_Prepare_di",
    "id:Main_Submit_di",
    "id:Main_Result_di",
    "id:Main_Accepted_di",
    "id:Main_Published_di",
    "id:Main_RecordError_di",
    *main_edges.keys(),
]
prep_refs = [*prep_shapes.keys(), *prep_edges.keys()]
objects["id:Plane_Main"]["properties"]["planeElement"] = [
    {"ref": value} for value in main_refs
]
objects["id:Plane_Preparation"]["properties"]["planeElement"] = [
    {"ref": value} for value in prep_refs
]

# Удаляем старые точки, подписи и границы, ссылки на которые исчезли после
# полной перекладки. Декодер OmniNotation требует, чтобы каждый DI-объект
# принадлежал одному из листов и был достижим от BPMNDiagram.
reachable: set[str] = set()


def collect_refs(value: object) -> None:
    if isinstance(value, dict):
        ref = value.get("ref")
        if isinstance(ref, str) and ref in objects and ref not in reachable:
            reachable.add(ref)
            collect_refs(objects[ref])
        for nested in value.values():
            collect_refs(nested)
    elif isinstance(value, list):
        for nested in value:
            collect_refs(nested)


for diagram_id in ("id:Diagram_Main", "id:Diagram_Preparation"):
    reachable.add(diagram_id)
    collect_refs(objects[diagram_id])
for object_id in list(objects):
    if object_id not in reachable:
        del objects[object_id]

encoded = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
for target in TARGETS:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(encoded, encoding="utf-8")

print(json.dumps({"updated": [str(path) for path in TARGETS]}, ensure_ascii=False, indent=2))
