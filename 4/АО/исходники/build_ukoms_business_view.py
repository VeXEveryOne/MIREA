"""Build the UKOMS overview, business, and structural views in pr6.archimate.

The target model and its other views are preserved. The business scenario comes
from 4/diagrs/im/im-org.omni and the fourth-year IM/ROP card-preparation work.
The application and deployment view is built by build_ukoms_structure.py.
"""

from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET

from build_ukoms_structure import ELEMENTS, XSI, build_structure_root, ident


TARGET = Path(__file__).resolve().parent.parent / "пр6.archimate"
MAIN_VIEW_ID = "id-fde711a9d03046ec8a5c193fd454022e"
BUSINESS_DETAIL_VIEW_ID = ident("view", "ukoms-business-detail")

# key, type, label
BUSINESS_ELEMENTS = [
    ("designer", "BusinessRole", "Дизайнер"),
    ("ozon", "BusinessActor", "Маркетплейс Ozon"),
    ("config_process", "BusinessProcess", "Согласовать конфигурацию ПК"),
    ("images_process", "BusinessProcess", "Подготовить изображения"),
    ("card_process", "BusinessProcess", "Сформировать карточку"),
    ("publish_process", "BusinessProcess", "Опубликовать карточку"),
    ("components_object", "BusinessObject", "Сведения о комплектующих"),
    ("images_object", "BusinessObject", "Изображения товара"),
    ("publication_service", "BusinessService", "Публикация карточки на Ozon"),
    ("publication_interface", "BusinessInterface", "Канал передачи карточки"),
]

# key, relationship type, source, target
BUSINESS_RELATIONSHIPS = [
    ("commerce_designer", "AssignmentRelationship", "commerce", "designer"),
    ("lead_config", "AssignmentRelationship", "production_lead", "config_process"),
    ("designer_images", "AssignmentRelationship", "designer", "images_process"),
    ("manager_card", "AssignmentRelationship", "market_manager", "card_process"),
    ("manager_publish", "AssignmentRelationship", "market_manager", "publish_process"),
    ("config_images", "TriggeringRelationship", "config_process", "images_process"),
    ("images_card", "TriggeringRelationship", "images_process", "card_process"),
    ("card_publish", "TriggeringRelationship", "card_process", "publish_process"),
    ("config_data", "AccessRelationship", "config_process", "components_object"),
    ("images_data", "AccessRelationship", "images_process", "images_object"),
    ("card_data", "AccessRelationship", "card_process", "card_business"),
    ("publish_card", "AccessRelationship", "publish_process", "card_business"),
    ("process_service", "RealizationRelationship", "publish_process", "publication_service"),
    ("interface_service", "AssignmentRelationship", "publication_interface", "publication_service"),
    ("service_ozon", "ServingRelationship", "publication_service", "ozon"),
]

# key, x, y, width, height
BUSINESS_LAYOUT = [
    ("company", 575, 20, 240, 60),
    ("production", 90, 145, 240, 70),
    ("commerce", 720, 145, 240, 70),
    ("production_lead", 90, 265, 240, 70),
    ("designer", 450, 265, 220, 70),
    ("market_manager", 790, 265, 240, 70),
    ("config_process", 55, 405, 230, 72),
    ("images_process", 345, 405, 230, 72),
    ("card_process", 635, 405, 230, 72),
    ("publish_process", 925, 405, 230, 72),
    ("components_object", 55, 580, 230, 66),
    ("images_object", 345, 580, 230, 66),
    ("card_business", 635, 580, 230, 66),
    ("publication_service", 925, 580, 230, 66),
    ("publication_interface", 925, 725, 230, 66),
    ("ozon", 1280, 580, 230, 66),
]

# Relationships already in the moved structural model and shown in this view.
SHARED_RELATIONSHIPS = [
    ("company_production", "company", "production"),
    ("company_commerce", "company", "commerce"),
    ("production_lead", "production", "production_lead"),
    ("commerce_manager", "commerce", "market_manager"),
]

APPLICATION_SERVICES = [
    ("card_app_service", "Сервис формирования карточки"),
    ("publish_app_service", "Сервис передачи в Ozon"),
]

INTEGRATION_RELATIONSHIPS = [
    ("core_service", "RealizationRelationship", "services", "card_app_service"),
    ("adapter_service", "RealizationRelationship", "ozon_adapter", "publish_app_service"),
    ("card_app_serving", "ServingRelationship", "card_app_service", "card_process"),
    ("publish_app_serving", "ServingRelationship", "publish_app_service", "publish_process"),
    ("build_adapter", "RealizationRelationship", "app_build", "ozon_adapter"),
]

INTEGRATION_LAYOUT = [
    ("company", 35, 25, 235, 66),
    ("commerce", 35, 155, 235, 70),
    ("market_manager", 35, 290, 235, 68),
    ("card_process", 345, 290, 235, 68),
    ("publish_process", 655, 290, 235, 68),
    ("publication_service", 965, 290, 235, 68),
    ("publication_interface", 965, 155, 235, 68),
    ("ozon", 1285, 290, 235, 68),
    ("card_app_service", 345, 455, 235, 68),
    ("publish_app_service", 655, 455, 235, 68),
    ("services", 345, 590, 235, 68),
    ("ozon_adapter", 655, 590, 235, 68),
    ("app_build", 500, 725, 235, 68),
    ("server", 500, 860, 235, 68),
]

# Existing business and structural relationships reused in the overview.
INTEGRATION_SHARED_LINKS = [
    ("company_commerce", "company", "commerce"),
    ("commerce_manager", "commerce", "market_manager"),
    ("manager_card", "market_manager", "card_process"),
    ("card_publish", "card_process", "publish_process"),
    ("process_service", "publish_process", "publication_service"),
    ("interface_service", "publication_interface", "publication_service"),
    ("service_ozon", "publication_service", "ozon"),
    ("build_services", "app_build", "services"),
    ("server_app", "server", "app_build"),
]


def folders_by_type(root: ET.Element) -> dict[str, ET.Element]:
    return {folder.get("type"): folder for folder in root.findall("folder")}


def populate_view(
    view: ET.Element,
    layout: list[tuple[str, int, int, int, int]],
    links: list[tuple[str, str, str]],
    concept_ids: dict[str, str],
    relation_ids: dict[str, str],
    namespace: str,
) -> None:
    inbound = defaultdict(list)
    outbound = defaultdict(list)
    for key, source, target in links:
        connection_id = ident(f"{namespace}-connection", key)
        inbound[target].append(connection_id)
        outbound[source].append((key, connection_id, target))

    diagram_ids = {key: ident(f"{namespace}-diagram-object", key) for key, *_ in layout}
    for key, x, y, width, height in layout:
        attrs = {
            f"{{{XSI}}}type": "archimate:DiagramObject",
            "id": diagram_ids[key],
            "archimateElement": concept_ids[key],
        }
        if inbound[key]:
            attrs["targetConnections"] = " ".join(inbound[key])
        child = ET.SubElement(view, "child", attrs)
        ET.SubElement(child, "bounds", x=str(x), y=str(y), width=str(width), height=str(height))
        for relation_key, connection_id, target in outbound[key]:
            ET.SubElement(
                child,
                "sourceConnection",
                {
                    f"{{{XSI}}}type": "archimate:Connection",
                    "id": connection_id,
                    "source": diagram_ids[key],
                    "target": diagram_ids[target],
                    "archimateRelationship": relation_ids[relation_key],
                },
            )


def main() -> None:
    target_root = ET.parse(TARGET).getroot()
    if target_root.get("name") != "Бизнес-слой":
        raise ValueError("Expected the existing Бизнес-слой model")
    folders = folders_by_type(target_root)
    main_view = next(
        (item for item in folders["diagrams"].findall("element") if item.get("id") == MAIN_VIEW_ID),
        None,
    )
    if main_view is None:
        raise ValueError("The original Юкомс view was not found")

    structural_root = build_structure_root()
    structural_folders = folders_by_type(structural_root)
    structural_view = structural_folders["diagrams"].find("element")
    if structural_view is None:
        raise ValueError("Structural source has no view")
    managed_ids = {
        item.get("id")
        for kind in ("business", "application", "technology", "relations")
        for item in structural_folders[kind].findall("element")
    }
    managed_ids.update(ident("business-element", key) for key, *_ in BUSINESS_ELEMENTS)
    managed_ids.update(ident("business-relationship", key) for key, *_ in BUSINESS_RELATIONSHIPS)
    managed_ids.update(ident("integration-element", key) for key, *_ in APPLICATION_SERVICES)
    managed_ids.update(ident("integration-relationship", key) for key, *_ in INTEGRATION_RELATIONSHIPS)
    managed_ids.update((structural_view.get("id"), BUSINESS_DETAIL_VIEW_ID))

    # Rebuild only the objects owned by this script. All original views remain.
    for folder in folders.values():
        for item in list(folder.findall("element")):
            if item.get("id") in managed_ids:
                folder.remove(item)
    for child in list(main_view):
        main_view.remove(child)
    main_view.set("name", "Юкомс — сквозная архитектура")

    for kind in ("business", "application", "technology", "relations"):
        for item in structural_folders[kind].findall("element"):
            folders[kind].append(deepcopy(item))
    structural_view = deepcopy(structural_view)
    structural_view.set("name", "Юкомс — структура ИС и размещение")
    folders["diagrams"].append(structural_view)
    business_detail_view = ET.SubElement(
        folders["diagrams"],
        "element",
        {
            f"{{{XSI}}}type": "archimate:ArchimateDiagramModel",
            "name": "Юкомс — бизнес-процессы и сервис",
            "id": BUSINESS_DETAIL_VIEW_ID,
        },
    )

    concept_ids = {key: ident("element", key) for key, *_ in ELEMENTS}
    concept_ids.update({key: ident("business-element", key) for key, *_ in BUSINESS_ELEMENTS})
    concept_ids.update({key: ident("integration-element", key) for key, *_ in APPLICATION_SERVICES})
    for key, element_type, name in BUSINESS_ELEMENTS:
        ET.SubElement(
            folders["business"],
            "element",
            {f"{{{XSI}}}type": f"archimate:{element_type}", "name": name, "id": concept_ids[key]},
        )
    for key, name in APPLICATION_SERVICES:
        ET.SubElement(
            folders["application"],
            "element",
            {f"{{{XSI}}}type": "archimate:ApplicationService", "name": name, "id": concept_ids[key]},
        )

    relation_ids = {key: ident("relationship", key) for key, *_ in SHARED_RELATIONSHIPS}
    relation_ids.update({key: ident("relationship", key) for key in ("build_services", "server_app")})
    for key, relation_type, source, target in BUSINESS_RELATIONSHIPS:
        relation_ids[key] = ident("business-relationship", key)
        ET.SubElement(
            folders["relations"],
            "element",
            {
                f"{{{XSI}}}type": f"archimate:{relation_type}",
                "id": relation_ids[key],
                "source": concept_ids[source],
                "target": concept_ids[target],
            },
        )
    for key, relation_type, source, target in INTEGRATION_RELATIONSHIPS:
        relation_ids[key] = ident("integration-relationship", key)
        ET.SubElement(
            folders["relations"],
            "element",
            {
                f"{{{XSI}}}type": f"archimate:{relation_type}",
                "id": relation_ids[key],
                "source": concept_ids[source],
                "target": concept_ids[target],
            },
        )

    business_links = list(SHARED_RELATIONSHIPS)
    business_links.extend((key, source, target) for key, _type, source, target in BUSINESS_RELATIONSHIPS)
    populate_view(business_detail_view, BUSINESS_LAYOUT, business_links, concept_ids, relation_ids, "business")

    integration_links = list(INTEGRATION_SHARED_LINKS)
    integration_links.extend((key, source, target) for key, _type, source, target in INTEGRATION_RELATIONSHIPS)
    populate_view(main_view, INTEGRATION_LAYOUT, integration_links, concept_ids, relation_ids, "integration")

    ET.indent(target_root, space="  ")
    ET.ElementTree(target_root).write(TARGET, encoding="UTF-8", xml_declaration=True)
    print(TARGET)


if __name__ == "__main__":
    main()
