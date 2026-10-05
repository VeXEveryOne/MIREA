from __future__ import annotations

import re


PHRASES = [
    ("Схема кодирования BOM", "Схема кодирования модельного ряда"),
    ("Формат кода BOM", "Формат кода модельного ряда"),
    ("Редактор версии BOM", "Редактор версии модельного ряда"),
    ("Редактор BOM", "Редактор модельного ряда"),
    ("Версионируемая BOM", "Версионируемый модельный ряд"),
    ("версионируемая BOM", "версионируемый модельный ряд"),
    ("проверенная BOM", "проверенный модельный ряд"),
    ("Проверенная BOM", "Проверенный модельный ряд"),
    ("BOM проверена", "Модельный ряд проверен"),
    ("исходную BOM", "исходный модельный ряд"),
    ("Исходную BOM", "Исходный модельный ряд"),
    ("следующая BOM", "следующий модельный ряд"),
    ("Следующая BOM", "Следующий модельный ряд"),
    ("каждой BOM", "каждого модельного ряда"),
    ("этой BOM", "этого модельного ряда"),
    ("Пустая BOM", "Пустой модельный ряд"),
    ("пустая BOM", "пустой модельный ряд"),
    ("версией BOM", "версией модельного ряда"),
    ("версии BOM", "версии модельного ряда"),
    ("версию BOM", "версию модельного ряда"),
    ("версия BOM", "версия модельного ряда"),
    ("Версия BOM", "Версия модельного ряда"),
    ("слоты BOM", "слоты модельного ряда"),
    ("слот BOM", "слот модельного ряда"),
    ("Слот BOM", "Слот модельного ряда"),
    ("списка BOM", "списка модельных рядов"),
    ("список BOM", "список модельных рядов"),
    ("активные BOM", "активные модельные ряды"),
    ("затронутых BOM", "затронутых модельных рядов"),
    ("результаты по BOM", "результаты по модельным рядам"),
    ("для BOM", "для модельного ряда"),
    ("из BOM", "из модельного ряда"),
    ("в BOM", "в модельном ряду"),
    ("по BOM", "по модельному ряду"),
    ("BOM и правила", "Модельный ряд и правила"),
    ("BOM и версия", "Модельный ряд и версия"),
    ("BOM, выбранные", "Модельный ряд, выбранные"),
    ("BOM;", "Модельный ряд;"),
    ("BOM-", "MR-"),
    ("BOM", "модельный ряд"),
    ("БОМ", "модельный ряд"),
]


def replace_technical(value: str) -> str:
    value = value.replace("bom_", "model_line_")
    value = value.replace("bom_version_id", "model_line_version_id")
    value = value.replace("bom_slot", "model_line_slot")
    value = value.replace("bom_version", "model_line_version")
    value = value.replace("bom_id", "model_line_id")
    value = value.replace("ix_bom_case", "ix_model_line_case")
    value = re.sub(r"\bbom\b", "model_line", value)
    value = re.sub(r"\bBOM\b", "ModelLine", value)
    return value

GRAMMAR_FIXES = [
        ("составу Модельный ряд", "составу модельного ряда"),
        ("Версия\\nмодельный ряд", "Версия\\nмодельного ряда"),
        ("Новая модельный ряд", "Новый модельный ряд"),
        ("Модули модельный ряд", "Модули модельного ряда"),
        ("новая модельный ряд", "новый модельный ряд"),
        ("к карточкам, модельный ряд,", "к карточкам, модельным рядам,"),
        ("Создание модельный ряд", "Создание модельного ряда"),
        ("с остальной модельный ряд", "с остальным модельным рядом"),
        ("по каждого модельного ряда", "по каждому модельному ряду"),
        ("строки модельный ряд", "строки модельного ряда"),
        ("эта модельный ряд", "этот модельный ряд"),
        ("соответствуют модельный ряд", "соответствуют модельному ряду"),
        ("Атрибуты model_line модельный ряд", "Атрибуты сущности model_line «Модельный ряд»"),
        ("Атрибуты replacement_item Результат замены модельный ряд", "Атрибуты сущности replacement_item «Результат замены модельного ряда»"),
        ("той же Модельный ряд", "тому же модельному ряду"),
        ("указанной модельный ряд", "указанному модельному ряду"),
        ("состава модельный ряд", "состава модельного ряда"),
        ("изменении модельный ряд", "изменении модельного ряда"),
        ("все модельный ряд", "все модельные ряды"),
        ("затрагиваемых модельный ряд", "затрагиваемых модельных рядов"),
        ("изменённых модельный ряд", "изменённых модельных рядов"),
        ("из данных модельный ряд", "из данных модельного ряда"),
        ("историю версий модельный ряд", "историю версий модельных рядов"),
        ("фильтрацию модельный ряд", "фильтрацию модельных рядов"),
        ("1000 модельный ряд", "1000 модельных рядов"),
        ("Доступ к модельный ряд", "Доступ к модельным рядам"),
        ("Журнал изменения модельный ряд", "Журнал изменений модельных рядов"),
        ("модельный ряд и конфигурации", "Модельные ряды и конфигурации"),
        ("Найденная модельный ряд", "Найденный модельный ряд"),
        ("Результат замены модельный ряд", "Результат замены модельного ряда"),
        ("созданной Модельный ряд", "созданного модельного ряда"),
        ("внутри модельный ряд", "внутри модельного ряда"),
        ("модельный ряд, совместимость", "Модельный ряд, совместимость"),
        ("модельный ряд — тип", "MR — тип модельного ряда"),
        ("затронутые модельный ряд", "затронутые модельные ряды"),
        ("Экран модельный ряд", "Экран модельного ряда"),
        ("Версии модельный ряд", "Версии модельного ряда"),
]


def replace_visible(value: str) -> str:
    value = value.replace("bom_", "model_line_")
    value = value.replace("bom_version_id", "model_line_version_id")
    value = value.replace("bom_slot", "model_line_slot")
    value = value.replace("bom_version", "model_line_version")
    value = value.replace("bom_id", "model_line_id")
    value = value.replace("ix_bom_case", "ix_model_line_case")
    value = re.sub(r"\bbom\b", "model_line", value)
    for old, new in PHRASES:
        value = value.replace(old, new)
    for old, new in GRAMMAR_FIXES:
        value = value.replace(old, new)
    return value


def normalization_rules():
    """Export the same literal rules to the JS slide builder, without copying them."""
    return {'phrases': PHRASES, 'grammar': GRAMMAR_FIXES}


def replace_source(value: str) -> str:
    # Text inside DSL quotes is visible; identifiers outside quotes must remain
    # valid and match the corresponding model IDs.
    parts = re.split(r'("(?:\\.|[^"\\])*")', value)
    for index, part in enumerate(parts):
        if not part:
            continue
        if part.startswith('"'):
            parts[index] = '"' + replace_visible(part[1:-1]) + '"'
        else:
            parts[index] = replace_technical(part)
    return ''.join(parts)


IDENTIFIER_KEYS = {
    "id", "ref", "from", "to", "owner", "attribute", "element",
    "container", "diagramId", "source", "draft",
}


def transform(value, key: str | None = None):
    if isinstance(value, dict):
        return {replace_technical(k): transform(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [transform(v, key) for v in value]
    if isinstance(value, str):
        if key in {"source", "draft"}:
            return replace_source(value)
        if key in IDENTIFIER_KEYS:
            return replace_technical(value)
        if key == "literal" and value == "BOM":
            return "MR"
        return replace_visible(value)
    return value
