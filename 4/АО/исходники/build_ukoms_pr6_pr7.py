"""Build the UKOMS business-layer models for practical assignments 6 and 7.

PR6 contains active structural elements only. PR7 is based on the same concepts
and adds business behavior using the examples in the supplied PR7 model.
"""

from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from pathlib import Path
from uuid import UUID, uuid5
import xml.etree.ElementTree as ET


ARCHI = "http://www.archimatetool.com/archimate"
XSI = "http://www.w3.org/2001/XMLSchema-instance"
ET.register_namespace("archimate", ARCHI)
ET.register_namespace("xsi", XSI)

BASE = Path(__file__).resolve().parent.parent
PR6 = BASE / "Юкомс_ПР6_АлбахтинИВ.archimate"
PR7 = BASE / "пр7.archimate"
NS = UUID("1f1cb23b-238f-4fae-811c-1c67249cd7ae")


def uid(kind: str, key: str) -> str:
    return "id-" + uuid5(NS, f"{kind}:{key}").hex


# Key, ArchiMate type, name. PR6 uses only active business structure.
STRUCTURE = [
    ("company", "BusinessActor", "ООО «Юкомс»"),
    ("commerce", "BusinessActor", "Отдел электронной коммерции"),
    ("production", "BusinessActor", "Производственный участок"),
    ("it", "BusinessActor", "Отдел ИТ-поддержки"),
    ("ozon", "BusinessActor", "Маркетплейс Ozon"),
    ("manager", "BusinessRole", "Менеджер маркетплейсов"),
    ("designer", "BusinessRole", "Дизайнер"),
    ("lead", "BusinessRole", "Руководитель производственного участка"),
    ("developer", "BusinessRole", "Ведущий разработчик"),
    ("team", "BusinessCollaboration", "Группа подготовки карточки"),
    ("channel", "BusinessInterface", "Канал передачи карточки в Ozon"),
    ("cabinet", "BusinessInterface", "Кабинет продавца Ozon"),
]

# Key, relationship type, source key, target key.
STRUCTURE_RELATIONS = [
    ("company_commerce", "CompositionRelationship", "company", "commerce"),
    ("company_production", "CompositionRelationship", "company", "production"),
    ("company_it", "CompositionRelationship", "company", "it"),
    ("commerce_manager", "AssignmentRelationship", "commerce", "manager"),
    ("commerce_designer", "AssignmentRelationship", "commerce", "designer"),
    ("production_lead", "AssignmentRelationship", "production", "lead"),
    ("it_developer", "AssignmentRelationship", "it", "developer"),
    ("team_manager", "AggregationRelationship", "team", "manager"),
    ("team_designer", "AggregationRelationship", "team", "designer"),
    ("team_lead", "AggregationRelationship", "team", "lead"),
    ("commerce_channel", "CompositionRelationship", "commerce", "channel"),
    ("ozon_cabinet", "CompositionRelationship", "ozon", "cabinet"),
    ("cabinet_manager", "ServingRelationship", "cabinet", "manager"),
]

# PR7 adds all core business behavior kinds illustrated in the reference model.
BEHAVIOR = [
    ("request", "BusinessEvent", "Запрос на новую карточку"),
    ("agreement", "BusinessInteraction", "Согласовать требования к карточке"),
    ("manage", "BusinessFunction", "Ведение карточек маркетплейса"),
    ("end_to_end", "BusinessProcess", "Подготовить и опубликовать карточку"),
    ("configure", "BusinessProcess", "Уточнить конфигурацию ПК"),
    ("images", "BusinessProcess", "Подготовить изображения"),
    ("card", "BusinessProcess", "Сформировать карточку"),
    ("ready", "BusinessEvent", "Карточка готова к публикации"),
    ("publish", "BusinessProcess", "Опубликовать карточку"),
    ("service", "BusinessService", "Публикация карточки на Ozon"),
    ("components", "BusinessObject", "Сведения о комплектующих"),
    ("pictures", "BusinessObject", "Изображения товара"),
    ("product_card", "BusinessObject", "Карточка компьютерной системы"),
]

BEHAVIOR_RELATIONS = [
    ("request_agreement", "TriggeringRelationship", "request", "agreement"),
    ("team_agreement", "AssignmentRelationship", "team", "agreement"),
    ("agreement_configure", "TriggeringRelationship", "agreement", "configure"),
    ("lead_configure", "AssignmentRelationship", "lead", "configure"),
    ("designer_images", "AssignmentRelationship", "designer", "images"),
    ("manager_card", "AssignmentRelationship", "manager", "card"),
    ("manager_publish", "AssignmentRelationship", "manager", "publish"),
    ("configure_images", "TriggeringRelationship", "configure", "images"),
    ("images_card", "TriggeringRelationship", "images", "card"),
    ("card_ready", "TriggeringRelationship", "card", "ready"),
    ("ready_publish", "TriggeringRelationship", "ready", "publish"),
    ("process_configure", "CompositionRelationship", "end_to_end", "configure"),
    ("process_images", "CompositionRelationship", "end_to_end", "images"),
    ("process_card", "CompositionRelationship", "end_to_end", "card"),
    ("process_publish", "CompositionRelationship", "end_to_end", "publish"),
    ("manager_manage", "AssignmentRelationship", "manager", "manage"),
    ("manage_process", "AggregationRelationship", "manage", "end_to_end"),
    ("configure_components", "AccessRelationship", "configure", "components"),
    ("images_pictures", "AccessRelationship", "images", "pictures"),
    ("card_product", "AccessRelationship", "card", "product_card"),
    ("publish_product", "AccessRelationship", "publish", "product_card"),
    ("publish_service", "RealizationRelationship", "publish", "service"),
    ("channel_service", "AssignmentRelationship", "channel", "service"),
    ("service_ozon", "ServingRelationship", "service", "ozon"),
]


def new_model(name: str, key: str) -> tuple[ET.Element, dict[str, ET.Element]]:
    root = ET.Element(f"{{{ARCHI}}}model", name=name, id=uid("model", key), version="5.0.0")
    names = [
        ("strategy", "Strategy"), ("business", "Business"),
        ("application", "Application"), ("technology", "Technology & Physical"),
        ("motivation", "Motivation"),
        ("implementation_migration", "Implementation & Migration"),
        ("other", "Other"), ("relations", "Relations"), ("diagrams", "Views"),
    ]
    folders = {
        key: ET.SubElement(root, "folder", name=label, id=uid(f"folder-{key}", key), type=key)
        for key, label in names
    }
    return root, folders


def add_concepts(folder: ET.Element, concepts: list[tuple[str, str, str]]) -> None:
    for key, kind, name in concepts:
        ET.SubElement(folder, "element", {
            f"{{{XSI}}}type": f"archimate:{kind}", "name": name, "id": uid("concept", key),
        })


def add_relations(folder: ET.Element, relations: list[tuple[str, str, str, str]]) -> None:
    for key, kind, source, target in relations:
        ET.SubElement(folder, "element", {
            f"{{{XSI}}}type": f"archimate:{kind}", "id": uid("relation", key),
            "source": uid("concept", source), "target": uid("concept", target),
        })


def add_view(
    folder: ET.Element,
    key: str,
    name: str,
    layout: list[tuple[str, int, int, int, int]],
    relation_keys: list[str],
    all_relations: dict[str, tuple[str, str, str]],
    routes: dict[str, list[tuple[int, int]]] | None = None,
) -> None:
    view = ET.SubElement(folder, "element", {
        f"{{{XSI}}}type": "archimate:ArchimateDiagramModel",
        "name": name, "id": uid("view", key),
    })
    node_ids = {concept: uid(f"view-node-{key}", concept) for concept, *_ in layout}
    centers = {concept: (x + w // 2, y + h // 2) for concept, x, y, w, h in layout}
    incoming: dict[str, list[str]] = defaultdict(list)
    outgoing: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for relation_key in relation_keys:
        _, source, target = all_relations[relation_key]
        if source not in node_ids or target not in node_ids:
            raise ValueError(f"View {name}: missing endpoint for {relation_key}")
        connection_id = uid(f"view-connection-{key}", relation_key)
        incoming[target].append(connection_id)
        outgoing[source].append((relation_key, connection_id, target))
    for concept, x, y, w, h in layout:
        attrs = {
            f"{{{XSI}}}type": "archimate:DiagramObject",
            "id": node_ids[concept], "archimateElement": uid("concept", concept),
        }
        if incoming[concept]:
            attrs["targetConnections"] = " ".join(incoming[concept])
        node = ET.SubElement(view, "child", attrs)
        ET.SubElement(node, "bounds", x=str(x), y=str(y), width=str(w), height=str(h))
        for relation_key, connection_id, target in outgoing[concept]:
            connection = ET.SubElement(node, "sourceConnection", {
                f"{{{XSI}}}type": "archimate:Connection", "id": connection_id,
                "source": node_ids[concept], "target": node_ids[target],
                "archimateRelationship": uid("relation", relation_key),
            })
            for px, py in (routes or {}).get(relation_key, []):
                sx, sy = centers[concept]
                tx, ty = centers[target]
                ET.SubElement(connection, "bendpoint", {
                    "startX": str(px - sx), "startY": str(py - sy),
                    "endX": str(px - tx), "endY": str(py - ty),
                })


def write(root: ET.Element, path: Path) -> None:
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(path, encoding="UTF-8", xml_declaration=True)
    print(path)


def main() -> None:
    root6, folders6 = new_model("ООО «Юкомс» — ПР6: активная структура бизнес-слоя — Албахтин И.В.", "pr6")
    add_concepts(folders6["business"], STRUCTURE)
    add_relations(folders6["relations"], STRUCTURE_RELATIONS)
    relations = {key: (kind, source, target) for key, kind, source, target in STRUCTURE_RELATIONS + BEHAVIOR_RELATIONS}
    structure_layout = [
        ("company", 900, 20, 270, 70),
        ("production", 50, 170, 270, 70),
        ("commerce", 800, 170, 270, 70),
        ("it", 1350, 170, 270, 70),
        ("ozon", 1750, 170, 270, 70),
        ("lead", 50, 340, 270, 70),
        ("designer", 650, 340, 250, 70),
        ("manager", 980, 340, 270, 70),
        ("cabinet", 1750, 340, 270, 70),
        ("team", 350, 550, 280, 70),
        ("channel", 800, 550, 270, 70),
        ("developer", 1350, 550, 270, 70),
    ]
    structure_links = [key for key, *_ in STRUCTURE_RELATIONS]
    add_view(
        folders6["diagrams"], "architecture", "Архитектура ООО «Юкомс» — структура",
        structure_layout, structure_links, relations,
    )
    write(root6, PR6)

    # Preserve the exact structural concepts and relationships from PR6 in PR7.
    root7 = deepcopy(root6)
    root7.set("id", uid("model", "pr7"))
    root7.set("name", "ООО «Юкомс» — ПР7: поведение бизнес-слоя — Албахтин И.В.")
    folders7 = {folder.get("type"): folder for folder in root7.findall("folder")}
    add_concepts(folders7["business"], BEHAVIOR)
    add_relations(folders7["relations"], BEHAVIOR_RELATIONS)
    for view in list(folders7["diagrams"]):
        folders7["diagrams"].remove(view)
    behavior_layout = [
        ("company", 1100, 20, 280, 70),
        ("production", 50, 160, 260, 70),
        ("commerce", 800, 160, 270, 70),
        ("it", 1500, 160, 270, 70),
        ("lead", 50, 310, 260, 70),
        ("designer", 650, 310, 250, 70),
        ("manager", 1000, 310, 270, 70),
        ("cabinet", 2350, 310, 270, 70),
        ("team", 350, 490, 270, 70),
        ("manage", 1130, 490, 300, 70),
        ("end_to_end", 1520, 490, 310, 70),
        ("developer", 1500, 310, 270, 70),
        ("channel", 2150, 490, 280, 70),
        ("request", 50, 760, 230, 70),
        ("agreement", 350, 760, 250, 70),
        ("configure", 650, 760, 240, 70),
        ("images", 950, 760, 240, 70),
        ("card", 1250, 760, 240, 70),
        ("ready", 1550, 760, 240, 70),
        ("publish", 1850, 760, 240, 70),
        ("service", 2150, 760, 240, 70),
        ("ozon", 2450, 760, 240, 70),
        ("components", 650, 990, 240, 70),
        ("pictures", 950, 990, 240, 70),
        ("product_card", 1550, 990, 280, 70),
    ]
    behavior_links = structure_links + [key for key, *_ in BEHAVIOR_RELATIONS]
    routes = {
        "cabinet_manager": [(2485, 430), (1135, 430)],
        "commerce_channel": [(935, 270), (2100, 270), (2100, 525)],
        "lead_configure": [(180, 670), (770, 670)],
        "designer_images": [(775, 650), (1070, 650)],
        "manager_card": [(1080, 430), (1080, 680), (1370, 680)],
        "manager_publish": [(1280, 440), (1970, 440)],
    }
    add_view(
        folders7["diagrams"], "architecture", "Архитектура ООО «Юкомс» — структура и поведение",
        behavior_layout, behavior_links, relations, routes,
    )
    write(root7, PR7)


if __name__ == "__main__":
    main()
