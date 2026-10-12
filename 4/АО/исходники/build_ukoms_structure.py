"""Build the native Archi model for the UKOMS structural architecture view.

The business structure follows 4/diagrs/im/im-org.omni. Application components,
deployment nodes and artifacts follow 4/ИМ/OmniNotation/ИМ_ПР9-10_Архитектура.omni.
Only structural ArchiMate elements and relationships are used.
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from uuid import UUID, uuid5
import xml.etree.ElementTree as ET


ARCHI = "http://www.archimatetool.com/archimate"
XSI = "http://www.w3.org/2001/XMLSchema-instance"
ET.register_namespace("archimate", ARCHI)
ET.register_namespace("xsi", XSI)

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[2] / ".cache" / "ukoms-structure-staging.archimate"
NS = UUID("55067a24-606e-4dd7-9296-61f3036557b1")


def ident(kind: str, key: str) -> str:
    return "id-" + uuid5(NS, f"{kind}:{key}").hex


# key, ArchiMate type, display name, folder, x, y, width, height
ELEMENTS = [
    ("company", "BusinessActor", "ООО «Юкомс»", "business", 620, 25, 240, 62),
    ("commerce", "BusinessActor", "Отдел электронной коммерции", "business", 70, 145, 235, 70),
    ("production", "BusinessActor", "Производственный участок", "business", 430, 145, 235, 70),
    ("it", "BusinessActor", "Отдел ИТ-поддержки", "business", 790, 145, 235, 70),
    ("market_manager", "BusinessRole", "Менеджер маркетплейсов", "business", 70, 260, 235, 64),
    ("production_lead", "BusinessRole", "Руководитель производственного участка", "business", 430, 260, 235, 72),
    ("developer", "BusinessRole", "Ведущий разработчик", "business", 790, 260, 235, 64),
    ("card_business", "BusinessObject", "Карточка компьютерной системы", "business", 1160, 145, 250, 70),
    ("card_data", "DataObject", "Данные карточки", "application", 1160, 260, 250, 64),
    ("system", "ApplicationComponent", "ИС подготовки карточек", "application", 620, 390, 240, 62),
    ("web", "ApplicationComponent", "Веб-интерфейс", "application", 20, 520, 200, 66),
    ("services", "ApplicationComponent", "Прикладной модуль", "application", 260, 520, 200, 66),
    ("access", "ApplicationComponent", "Контроль доступа и аудит", "application", 500, 520, 200, 66),
    ("repository", "ApplicationComponent", "Репозиторий данных", "application", 740, 520, 200, 66),
    ("importer", "ApplicationComponent", "Импорт источников", "application", 980, 520, 200, 66),
    ("ozon_adapter", "ApplicationComponent", "Адаптер Ozon", "application", 1220, 520, 200, 66),
    ("frontend", "Artifact", "Интерфейс в браузере", "technology", 25, 665, 200, 66),
    ("app_build", "Artifact", "Сборка приложения", "technology", 290, 665, 200, 66),
    ("db_schema", "Artifact", "Схема БД и миграции", "technology", 760, 665, 200, 66),
    ("backups", "Artifact", "Копии БД и файлов", "technology", 1120, 665, 200, 66),
    ("workstation", "Device", "Рабочий компьютер", "technology", 25, 815, 200, 66),
    ("server", "Node", "Серверная виртуальная машина", "technology", 525, 815, 240, 66),
    ("backup_store", "Node", "Отдельное хранилище копий", "technology", 1100, 815, 240, 66),
]

# key, structural relationship type, source, target
RELATIONSHIPS = [
    ("company_commerce", "CompositionRelationship", "company", "commerce"),
    ("company_production", "CompositionRelationship", "company", "production"),
    ("company_it", "CompositionRelationship", "company", "it"),
    ("commerce_manager", "AssignmentRelationship", "commerce", "market_manager"),
    ("production_lead", "AssignmentRelationship", "production", "production_lead"),
    ("it_developer", "AssignmentRelationship", "it", "developer"),
    ("card_representation", "RealizationRelationship", "card_data", "card_business"),
    ("system_web", "CompositionRelationship", "system", "web"),
    ("system_services", "CompositionRelationship", "system", "services"),
    ("system_access", "CompositionRelationship", "system", "access"),
    ("system_repository", "CompositionRelationship", "system", "repository"),
    ("system_importer", "CompositionRelationship", "system", "importer"),
    ("system_ozon", "AggregationRelationship", "system", "ozon_adapter"),
    ("workstation_frontend", "AssignmentRelationship", "workstation", "frontend"),
    ("server_app", "AssignmentRelationship", "server", "app_build"),
    ("server_schema", "AssignmentRelationship", "server", "db_schema"),
    ("store_backups", "AssignmentRelationship", "backup_store", "backups"),
    ("frontend_web", "RealizationRelationship", "frontend", "web"),
    ("build_services", "RealizationRelationship", "app_build", "services"),
    ("schema_repository", "RealizationRelationship", "db_schema", "repository"),
]


def build_structure_root() -> ET.Element:
    root = ET.Element(
        f"{{{ARCHI}}}model",
        name="ООО «Юкомс» — структурная архитектура — Албахтин И.В.",
        id=ident("model", "ukoms"),
        version="5.0.0",
    )
    folder_names = [
        ("strategy", "Strategy"),
        ("business", "Business"),
        ("application", "Application"),
        ("technology", "Technology & Physical"),
        ("motivation", "Motivation"),
        ("implementation_migration", "Implementation & Migration"),
        ("other", "Other"),
        ("relations", "Relations"),
        ("diagrams", "Views"),
    ]
    folders = {
        kind: ET.SubElement(root, "folder", name=name, id=ident("folder", kind), type=kind)
        for kind, name in folder_names
    }

    element_ids = {}
    diagram_ids = {}
    for key, element_type, name, folder_kind, x, y, width, height in ELEMENTS:
        element_ids[key] = ident("element", key)
        diagram_ids[key] = ident("diagram-object", key)
        ET.SubElement(
            folders[folder_kind],
            "element",
            {f"{{{XSI}}}type": f"archimate:{element_type}", "name": name, "id": element_ids[key]},
        )

    relation_ids = {}
    inbound = defaultdict(list)
    outbound = defaultdict(list)
    for key, relation_type, source, target in RELATIONSHIPS:
        relation_ids[key] = ident("relationship", key)
        connection_id = ident("connection", key)
        inbound[target].append(connection_id)
        outbound[source].append((key, connection_id, target))
        ET.SubElement(
            folders["relations"],
            "element",
            {
                f"{{{XSI}}}type": f"archimate:{relation_type}",
                "id": relation_ids[key],
                "source": element_ids[source],
                "target": element_ids[target],
            },
        )

    view = ET.SubElement(
        folders["diagrams"],
        "element",
        {
            f"{{{XSI}}}type": "archimate:ArchimateDiagramModel",
            "name": "Структурная архитектура ООО «Юкомс»",
            "id": ident("view", "ukoms-structure"),
        },
    )
    for key, _element_type, _name, _folder_kind, x, y, width, height in ELEMENTS:
        attrs = {
            f"{{{XSI}}}type": "archimate:DiagramObject",
            "id": diagram_ids[key],
            "archimateElement": element_ids[key],
        }
        if inbound[key]:
            attrs["targetConnections"] = " ".join(inbound[key])
        child = ET.SubElement(view, "child", attrs)
        ET.SubElement(child, "bounds", x=str(x), y=str(y), width=str(width), height=str(height))
        for rel_key, connection_id, target in outbound[key]:
            ET.SubElement(
                child,
                "sourceConnection",
                {
                    f"{{{XSI}}}type": "archimate:Connection",
                    "id": connection_id,
                    "source": diagram_ids[key],
                    "target": diagram_ids[target],
                    "archimateRelationship": relation_ids[rel_key],
                },
            )

    return root


def main() -> None:
    root = build_structure_root()
    ET.indent(root, space="  ")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(root).write(OUTPUT, encoding="UTF-8", xml_declaration=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
