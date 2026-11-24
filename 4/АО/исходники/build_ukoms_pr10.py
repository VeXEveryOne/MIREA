"""Extend the UKOMS personal architecture with application active structure.

The lesson at 13:00 in the supplied recording asks for application services and
interfaces supporting user work, then main components with nested modules.
Application functions and processes belong to the next practical and are absent.
"""

from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET

from build_ukoms_pr6_pr7 import BASE, XSI, add_concepts, add_relations, uid, write
from build_ukoms_pr8 import PR8


PR10 = BASE / "Юкомс_ПР10_АлбахтинИВ.archimate"

# Key, ArchiMate type, name. Components and modules are named as nouns.
APPLICATION = [
    ("app_collab", "ApplicationCollaboration", "Подготовка и публикация карточки"),
    ("card_system", "ApplicationComponent", "ИС карточек товаров ЮКОМС"),
    ("ozon_gateway", "ApplicationComponent", "Шлюз обмена с Ozon"),
    ("catalog_module", "ApplicationComponent", "Каталог комплектующих"),
    ("media_module", "ApplicationComponent", "Медиатека товаров"),
    ("editor_module", "ApplicationComponent", "Редактор карточек"),
    ("publish_module", "ApplicationComponent", "Модуль публикации"),
    ("catalog_interface", "ApplicationInterface", "Интерфейс каталога"),
    ("editor_interface", "ApplicationInterface", "Интерфейс редактора карточек"),
    ("ozon_interface", "ApplicationInterface", "Интерфейс обмена с Ozon"),
    ("catalog_service", "ApplicationService", "Доступ к каталогу комплектующих"),
    ("editor_service", "ApplicationService", "Редактирование карточки товара"),
    ("publish_app_service", "ApplicationService", "Передача карточки в Ozon"),
]

# Key, relationship type, source key, target key, visible name, access type.
APPLICATION_RELATIONS = [
    ("app_collab_card_system", "AggregationRelationship", "app_collab", "card_system", "Является частью", None),
    ("app_collab_ozon_gateway", "AggregationRelationship", "app_collab", "ozon_gateway", "Является частью", None),
    ("card_system_catalog", "CompositionRelationship", "card_system", "catalog_module", "Является частью", None),
    ("card_system_media", "CompositionRelationship", "card_system", "media_module", "Является частью", None),
    ("card_system_editor", "CompositionRelationship", "card_system", "editor_module", "Является частью", None),
    ("card_system_catalog_interface", "CompositionRelationship", "card_system", "catalog_interface", "Является частью", None),
    ("card_system_editor_interface", "CompositionRelationship", "card_system", "editor_interface", "Является частью", None),
    ("ozon_gateway_publish", "CompositionRelationship", "ozon_gateway", "publish_module", "Является частью", None),
    ("ozon_gateway_interface", "CompositionRelationship", "ozon_gateway", "ozon_interface", "Является частью", None),
    ("catalog_interface_service", "AssignmentRelationship", "catalog_interface", "catalog_service", "Интерфейс выполняет", None),
    ("editor_interface_service", "AssignmentRelationship", "editor_interface", "editor_service", "Интерфейс выполняет", None),
    ("ozon_interface_service", "AssignmentRelationship", "ozon_interface", "publish_app_service", "Интерфейс выполняет", None),
    ("catalog_service_configure", "ServingRelationship", "catalog_service", "configure", "Сервис обслуживает", None),
    ("editor_service_images", "ServingRelationship", "editor_service", "images", "Сервис обслуживает", None),
    ("editor_service_card", "ServingRelationship", "editor_service", "card", "Сервис обслуживает", None),
    ("publish_service_publish", "ServingRelationship", "publish_app_service", "publish", "Сервис обслуживает", None),
    ("catalog_components_record", "AccessRelationship", "catalog_module", "components_record", "Имеет доступ на чтение", "1"),
    ("editor_card_record", "AccessRelationship", "editor_module", "card_record", "Имеет доступ на запись", "0"),
    ("publish_card_record", "AccessRelationship", "publish_module", "card_record", "Имеет доступ на чтение", "1"),
    ("editor_publish_flow", "FlowRelationship", "editor_module", "publish_module", "Данные карточки", None),
]

# Top-level diagram bounds. The application modules below are nested in their
# respective main components, as shown in the practical's component example.
TOP_LEVEL = [
    ("lead", 80, 20, 250, 70),
    ("designer", 570, 20, 220, 70),
    ("manager", 1110, 20, 250, 70),
    ("configure", 80, 160, 250, 70),
    ("images", 570, 160, 250, 70),
    ("card", 1090, 160, 250, 70),
    ("publish", 1650, 160, 250, 70),
    ("catalog_service", 80, 350, 270, 70),
    ("editor_service", 860, 350, 300, 70),
    ("publish_app_service", 1650, 350, 270, 70),
    ("catalog_interface", 80, 510, 270, 70),
    ("editor_interface", 860, 510, 300, 70),
    ("ozon_interface", 1650, 510, 270, 70),
    ("app_collab", 1170, 660, 300, 70),
    ("card_system", 250, 800, 1100, 230),
    ("ozon_gateway", 1570, 800, 460, 230),
    ("components_record", 300, 1100, 270, 70),
    ("card_record", 1040, 1100, 270, 70),
]

# Coordinates here are relative to the containing application component.
NESTED = [
    ("card_system", "catalog_module", 50, 100, 260, 75),
    ("card_system", "media_module", 420, 100, 260, 75),
    ("card_system", "editor_module", 790, 100, 260, 75),
    ("ozon_gateway", "publish_module", 100, 100, 260, 75),
]

VIEW_RELATIONS = [
    "lead_configure", "designer_images", "manager_card", "manager_publish",
    *(key for key, *_ in APPLICATION_RELATIONS),
]

# A small number of bends keep the manager's second assignment and the data
# access to the shared card record clear of the other nodes.
ROUTES = {
    "manager_publish": [(1235, 120), (1775, 120)],
    "publish_card_record": [(1800, 1070), (1175, 1070)],
}


def add_application_view(diagrams: ET.Element) -> None:
    view = ET.SubElement(diagrams, "element", {
        f"{{{XSI}}}type": "archimate:ArchimateDiagramModel",
        "name": "02 — Слой приложений ЮКОМС и связи с бизнесом",
        "id": uid("view", "application_structure"),
    })
    nodes: dict[str, ET.Element] = {}
    centers: dict[str, tuple[int, int]] = {}

    def node(parent: ET.Element, key: str, x: int, y: int, width: int, height: int,
             parent_origin: tuple[int, int] = (0, 0)) -> None:
        diagram_node = ET.SubElement(parent, "child", {
            f"{{{XSI}}}type": "archimate:DiagramObject",
            "id": uid("view-node-application", key),
            "archimateElement": uid("concept", key),
        })
        ET.SubElement(diagram_node, "bounds", {
            "x": str(x), "y": str(y), "width": str(width), "height": str(height),
        })
        nodes[key] = diagram_node
        centers[key] = (parent_origin[0] + x + width // 2,
                        parent_origin[1] + y + height // 2)

    for key, x, y, width, height in TOP_LEVEL:
        node(view, key, x, y, width, height)
    bounds = {key: (x, y) for key, x, y, *_ in TOP_LEVEL}
    for parent_key, key, x, y, width, height in NESTED:
        node(nodes[parent_key], key, x, y, width, height, bounds[parent_key])

    if len(nodes) != len(TOP_LEVEL) + len(NESTED):
        raise ValueError("Duplicate concept in application view")
    for key in VIEW_RELATIONS:
        if key in ("lead_configure", "designer_images", "manager_card", "manager_publish"):
            source, target = {
                "lead_configure": ("lead", "configure"),
                "designer_images": ("designer", "images"),
                "manager_card": ("manager", "card"),
                "manager_publish": ("manager", "publish"),
            }[key]
        else:
            _, _, source, target, _, _ = next(r for r in APPLICATION_RELATIONS if r[0] == key)
        source_node, target_node = nodes[source], nodes[target]
        connection_id = uid("view-connection-application", key)
        incoming = target_node.get("targetConnections", "").split()
        incoming.append(connection_id)
        target_node.set("targetConnections", " ".join(incoming))
        connection = ET.SubElement(source_node, "sourceConnection", {
            f"{{{XSI}}}type": "archimate:Connection",
            "id": connection_id,
            "source": source_node.get("id"),
            "target": target_node.get("id"),
            "archimateRelationship": uid("relation", key),
            "textPosition": "1",
        })
        sx, sy = centers[source]
        tx, ty = centers[target]
        for px, py in ROUTES.get(key, []):
            ET.SubElement(connection, "bendpoint", {
                "startX": str(px - sx), "startY": str(py - sy),
                "endX": str(px - tx), "endY": str(py - ty),
            })


def main() -> None:
    root = ET.parse(PR8).getroot()
    root.set("id", uid("model", "pr10"))
    root.set("name", "ООО «Юкомс» — ПР10: структура слоя приложений — Албахтин И.В.")
    folders = {folder.get("type"): folder for folder in root.findall("folder")}
    business_views = folders["diagrams"].findall("element")
    if len(business_views) != 1:
        raise ValueError("Expected one complete business view from PR8")
    business_views[0].set("name", "01 — Полный бизнес-слой ЮКОМС")
    add_concepts(folders["application"], APPLICATION)
    add_relations(
        folders["relations"],
        [(key, kind, source, target) for key, kind, source, target, *_ in APPLICATION_RELATIONS],
    )
    rels = {rel.get("id"): rel for rel in folders["relations"].findall("element")}
    for key, _kind, _source, _target, label, access_type in APPLICATION_RELATIONS:
        rel = rels[uid("relation", key)]
        rel.set("name", label)
        if access_type is not None:
            rel.set("accessType", access_type)
    add_application_view(folders["diagrams"])
    write(root, PR10)


if __name__ == "__main__":
    main()
