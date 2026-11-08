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
    ("card_page", "Representation", "Страница карточки на Ozon", "business", 1230, 1210, 270, 65),
    ("card_record", "DataObject", "Запись карточки в ИС", "application", 1850, 1210, 250, 65),
    ("components_record", "DataObject", "Данные о комплектующих в ИС", "application", 530, 1210, 250, 65),
]

# Key, relationship type, source key, target key.
PASSIVE_RELATIONS = [
    ("card_contains_components", "CompositionRelationship", "product_card", "components"),
    ("card_contains_pictures", "CompositionRelationship", "product_card", "pictures"),
    ("page_represents_card", "RealizationRelationship", "card_page", "product_card"),
    ("record_realizes_card", "RealizationRelationship", "card_record", "product_card"),
    ("record_realizes_components", "RealizationRelationship", "components_record", "components"),
]

# The rows follow the card's life cycle. The supporting roles and interfaces sit
# above the work they perform; business information and its realizations sit below.
LAYOUT = {
    "company": (800, 20, 240, 65),
    "production": (120, 150, 235, 65),
    "commerce": (750, 150, 245, 65),
    "it": (1330, 150, 235, 65),
    "lead": (120, 310, 235, 65),
    "designer": (580, 310, 220, 65),
    "manager": (870, 310, 240, 65),
    "developer": (1330, 310, 235, 65),
    "cabinet": (1970, 310, 220, 65),
    "team": (360, 500, 245, 65),
    "manage": (925, 500, 260, 65),
    "end_to_end": (1270, 500, 280, 65),
    "channel": (1700, 500, 245, 65),
    "request": (20, 790, 175, 65),
    "agreement": (260, 790, 180, 65),
    "configure": (530, 790, 180, 65),
    "images": (790, 790, 180, 65),
    "card": (1050, 790, 180, 65),
    "ready": (1310, 790, 180, 65),
    "publish": (1570, 790, 180, 65),
    "service": (1830, 790, 180, 65),
    "ozon": (2090, 790, 180, 65),
    "components": (530, 1010, 220, 65),
    "pictures": (790, 1010, 220, 65),
    "product_card": (1230, 1010, 270, 65),
    "components_record": (530, 1210, 250, 65),
    "card_page": (1230, 1210, 270, 65),
    "card_record": (1850, 1210, 250, 65),
}

ROUTES = {
    "commerce_channel": [(875, 230), (1820, 230)],
    "cabinet_manager": [(2080, 400), (990, 400)],
    "lead_configure": [(237, 710), (625, 710)],
    "designer_images": [(690, 660), (885, 660)],
    "manager_card": [(1210, 440), (1210, 740)],
    "manager_publish": [(990, 465), (1660, 465), (1660, 740)],
    "team_agreement": [(480, 665), (355, 665)],
    "card_contains_components": [(1365, 1135), (640, 1135)],
    "card_contains_pictures": [(1365, 1170), (900, 1170)],
}

RELATION_LABELS = {
    'CompositionRelationship': 'Является частью',
    'AggregationRelationship': 'Является частью',
    'AssignmentRelationship': 'Выполняет',
    'TriggeringRelationship': 'Запускает',
    'AccessRelationship': 'Имеет доступ на запись',
    'RealizationRelationship': 'Реализует',
    'ServingRelationship': 'Обслуживает',
}


def label_relationships(root: ET.Element) -> None:
    """Use the relationship wording shown in the earlier practice models."""
    role_ids = {uid('concept', k) for k in ('manager', 'designer', 'lead', 'developer')}
    for rel in root.findall('.//element'):
        kind = rel.get(f'{{{XSI}}}type', '').split(':')[-1]
        if kind not in RELATION_LABELS:
            continue
        label = RELATION_LABELS[kind]
        if kind == 'AssignmentRelationship' and rel.get('target') in role_ids:
            label = 'Актор назначен на роль'
        if kind == 'AssignmentRelationship' and rel.get('source') in role_ids:
            label = 'Бизнес-роль выполняет'
        if rel.get('id') == uid('relation', 'team_agreement'):
            label = 'Выполняет совместно'
        if rel.get('id') == uid('relation', 'channel_service'):
            label = 'Интерфейс выполняет'
        if kind == 'AccessRelationship':
            rel.set('accessType', '1' if rel.get('id') == uid('relation', 'publish_product') else '0')
            label = 'Имеет доступ на чтение' if rel.get('accessType') == '1' else 'Имеет доступ на запись'
        if rel.get('id') == uid('relation', 'publish_service'):
            label = 'Реализует'
        if rel.get('id') == uid('relation', 'page_represents_card'):
            label = 'Носитель информации реализует'
        if rel.get('id') in (uid('relation', 'record_realizes_card'), uid('relation', 'record_realizes_components')):
            label = 'Объект данных реализует'
        if rel.get('id') == uid('relation', 'cabinet_manager'):
            label = 'Интерфейс обслуживает'
        if rel.get('id') == uid('relation', 'service_ozon'):
            label = 'Обслуживает'
        rel.set('name', label)


def compact_layout(root: ET.Element) -> None:
    """Place each concept once and reroute long connections through open rows."""
    nodes = {
        key: root.find(f".//child[@id='{uid('view-node-architecture', key)}']")
        for key in LAYOUT
    }
    if any(node is None for node in nodes.values()) or len(root.findall('.//child')) != len(LAYOUT):
        raise ValueError('Unexpected concepts in the integrated PR8 diagram')
    for key, node in nodes.items():
        bounds = node.find('bounds')
        if bounds is None:
            raise ValueError(f'Missing bounds for {key}')
        x, y, width, height = LAYOUT[key]
        bounds.attrib.update(x=str(x), y=str(y), width=str(width), height=str(height))
    for key, node in nodes.items():
        sx, sy = center(node)
        for conn in node.findall('sourceConnection'):
            conn.set('textPosition', '1')
            for point in conn.findall('bendpoint'):
                conn.remove(point)
            rel_id = conn.get('archimateRelationship')
            rel_key = next((candidate for candidate in ROUTES if uid('relation', candidate) == rel_id), None)
            if rel_key is None:
                continue
            target_node = next(n for n in nodes.values() if n.get('id') == conn.get('target'))
            tx, ty = center(target_node)
            for px, py in ROUTES[rel_key]:
                ET.SubElement(conn, 'bendpoint', {
                    'startX': str(px - sx), 'startY': str(py - sy),
                    'endX': str(px - tx), 'endY': str(py - ty),
                })


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

    label_relationships(root)
    compact_layout(root)
    write(root, PR8)


if __name__ == "__main__":
    main()
