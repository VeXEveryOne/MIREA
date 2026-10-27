"""Extend the UKOMS PR7 architecture with relevant passive elements for PR8.

The source PR8 exercise illustrates business-object composition, representations,
and application data realizing business information. A product and contract are
outside the scoped card-preparation architecture, so they are not invented here.
"""

from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET

from build_ukoms_pr6_pr7 import BASE, PR7, XSI, add_concepts, add_relations, uid, write


PR8 = BASE / "Юкомс_ПР8_АлбахтинИВ.archimate"

# Key, ArchiMate type, name, folder, x, y, width, height.
PASSIVE = [
    ("card_page", "Representation", "Страница карточки на Ozon", "business", 1450, 1230, 290, 70),
    ("card_record", "DataObject", "Запись карточки в ИС", "application", 1850, 1230, 270, 70),
    ("components_record", "DataObject", "Данные о комплектующих в ИС", "application", 640, 1230, 270, 70),
]

# Key, relationship type, source key, target key.
PASSIVE_RELATIONS = [
    ("card_contains_components", "CompositionRelationship", "product_card", "components"),
    ("card_contains_pictures", "CompositionRelationship", "product_card", "pictures"),
    ("page_represents_card", "RealizationRelationship", "card_page", "product_card"),
    ("record_realizes_card", "RealizationRelationship", "card_record", "product_card"),
    ("record_realizes_components", "RealizationRelationship", "components_record", "components"),
]

ROUTES = {
    "card_contains_components": [(1690, 1120), (775, 1120)],
    "card_contains_pictures": [(1650, 1160), (1070, 1160)],
}


def center(node: ET.Element) -> tuple[int, int]:
    bounds = node.find("bounds")
    if bounds is None:
        raise ValueError("Diagram object has no bounds")
    return (
        int(bounds.get("x")) + int(bounds.get("width")) // 2,
        int(bounds.get("y")) + int(bounds.get("height")) // 2,
    )


def main() -> None:
    root = ET.parse(PR7).getroot()
    root.set("id", uid("model", "pr8"))
    root.set("name", "ООО «Юкомс» — ПР8: пассивные элементы бизнес-слоя — Албахтин И.В.")
    folders = {folder.get("type"): folder for folder in root.findall("folder")}
    views = folders["diagrams"].findall("element")
    if len(views) != 1:
        raise ValueError("Expected one integrated UKOMS view in PR7")
    view = views[0]
    view.set("name", "Архитектура ООО «Юкомс» — структура, поведение и данные")

    for folder_kind in ("business", "application"):
        add_concepts(
            folders[folder_kind],
            [(key, kind, name) for key, kind, name, folder, *_ in PASSIVE if folder == folder_kind],
        )
    add_relations(folders["relations"], PASSIVE_RELATIONS)

    concept_to_key = {
        uid("concept", key): key
        for key in (
            "company", "commerce", "production", "it", "ozon", "manager", "designer",
            "lead", "developer", "team", "channel", "cabinet", "request", "agreement",
            "manage", "end_to_end", "configure", "images", "card", "ready", "publish",
            "service", "components", "pictures", "product_card",
        )
    }
    nodes = {
        concept_to_key[node.get("archimateElement")]: node
        for node in view.findall("child")
    }
    for key, _kind, _name, _folder, x, y, width, height in PASSIVE:
        node = ET.SubElement(view, "child", {
            f"{{{XSI}}}type": "archimate:DiagramObject",
            "id": uid("view-node-architecture", key),
            "archimateElement": uid("concept", key),
        })
        ET.SubElement(node, "bounds", x=str(x), y=str(y), width=str(width), height=str(height))
        nodes[key] = node

    for key, _kind, source, target in PASSIVE_RELATIONS:
        source_node, target_node = nodes[source], nodes[target]
        connection_id = uid("view-connection-architecture", key)
        incoming = target_node.get("targetConnections", "").split()
        incoming.append(connection_id)
        target_node.set("targetConnections", " ".join(incoming))
        connection = ET.SubElement(source_node, "sourceConnection", {
            f"{{{XSI}}}type": "archimate:Connection",
            "id": connection_id,
            "source": source_node.get("id"),
            "target": target_node.get("id"),
            "archimateRelationship": uid("relation", key),
        })
        sx, sy = center(source_node)
        tx, ty = center(target_node)
        for px, py in ROUTES.get(key, []):
            ET.SubElement(connection, "bendpoint", {
                "startX": str(px - sx), "startY": str(py - sy),
                "endX": str(px - tx), "endY": str(py - ty),
            })

    write(root, PR8)


if __name__ == "__main__":
    main()
