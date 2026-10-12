export const contextExample = `idef0 cards_context "Формирование и актуализация карточек товаров"
diagram sheet Контекст node=A-0 purpose="Описать подготовку карточек товаров" viewpoint="Менеджер маркетплейса"
function A0 "Формировать и актуализировать карточки товаров компьютерных систем" number=0
boundary request "Запрос на создание или изменение карточки" side=left order=0
boundary caseData "Сведения о корпусе" side=left order=1
boundary components "Ассортимент комплектующих" side=left order=2
boundary offers "Предложения и цены поставщиков" side=left order=3
boundary ozonRules "Требования Ozon" side=top order=0
boundary compatibilityRules "Правила совместимости" side=top order=1
boundary calculationRules "Правила цены, веса и изображений" side=top order=2
boundary bomOutput "Согласованная BOM" side=right order=0
boundary valuesOutput "Цена, вес и изображения" side=right order=1
boundary cardOutput "Опубликованная или обновлённая карточка" side=right order=2
boundary manager "Менеджер маркетплейсов" side=bottom order=0
boundary specialist "Технический специалист" side=bottom order=1
boundary designer "Дизайнер" side=bottom order=2
boundary systems "Поставщики, Ozon и разрозненные инструменты" side=bottom order=3
arrow requestArrow "Запрос" from=request to=A0 role=input
arrow caseArrow "Корпус" from=caseData to=A0 role=input
arrow componentsArrow "Комплектующие" from=components to=A0 role=input
arrow offersArrow "Цены и наличие" from=offers to=A0 role=input
arrow ozonControl "Требования Ozon" from=ozonRules to=A0 role=control
arrow compatibilityControl "Совместимость" from=compatibilityRules to=A0 role=control
arrow calculationControl "Расчёт и контент" from=calculationRules to=A0 role=control
arrow bomArrow "BOM" from=A0 to=bomOutput role=output
arrow valuesArrow "Показатели и изображения" from=A0 to=valuesOutput role=output
arrow cardArrow "Карточка" from=A0 to=cardOutput role=output
arrow managerMechanism "Менеджер" from=manager to=A0 role=mechanism
arrow specialistMechanism "Технический специалист" from=specialist to=A0 role=mechanism
arrow designerMechanism "Дизайнер" from=designer to=A0 role=mechanism
arrow systemsMechanism "Внешние системы" from=systems to=A0 role=mechanism
`;

export const decompositionExample = `idef0 cards_decomposition "Декомпозиция процесса формирования карточек AS IS"
diagram sheet Декомпозиция node=A0 purpose="Описать подготовку карточек товаров" viewpoint="Менеджер маркетплейса"
function A1 "Инициировать создание или изменение карточки" number=1
function A2 "Сформировать конфигурацию и сопоставить товары поставщиков" number=2
function A3 "Проверить совместимость комплектующих" number=3
function A4 "Рассчитать цену и вес, подготовить изображения" number=4
function A5 "Заполнить, проверить и опубликовать карточку в Ozon" number=5
boundary request "Запрос на карточку" side=left order=0
boundary assortment "Корпус, ассортимент и предложения поставщиков" side=left order=1
boundary ozonRules "Требования Ozon" side=top order=0
boundary compatibilityRules "Правила совместимости" side=top order=1
boundary calculationRules "Правила цены, веса и изображений" side=top order=2
boundary cardOutput "Опубликованная / обновлённая карточка" side=right order=0
boundary bomOutput "Подготовленная BOM" side=right order=1
boundary valuesOutput "Рассчитанные показатели и изображения" side=right order=2
boundary manager "Менеджер маркетплейсов" side=bottom order=0
boundary specialist "Технический специалист" side=bottom order=1
boundary supplier "Склад и поставщики" side=bottom order=2
boundary designer "Дизайнер" side=bottom order=3
boundary ozon "Ozon" side=bottom order=4
arrow requestArrow "Потребность" from=request to=A1 role=input
arrow assortmentArrow "Исходные сведения" from=assortment to=A2 role=input
arrow step12 "Запрос и выбранный корпус" from=A1 to=A2 role=input
arrow step23 "Проект конфигурации" from=A2 to=A3 role=input
arrow step34 "Согласованная BOM" from=A3 to=A4 role=input
arrow step45 "Данные карточки" from=A4 to=A5 role=input
arrow ozonControl "Требования площадки" from=ozonRules to=A5 role=control
arrow compatibilityControl "Ограничения" from=compatibilityRules to=A3 role=control
arrow calculationControl "Правила расчёта" from=calculationRules to=A4 role=control
arrow managerMechanism "Менеджер" from=manager to=A1 role=mechanism
arrow specialistMechanism "Специалист" from=specialist to=A3 role=mechanism
arrow supplierMechanism "Поставщики" from=supplier to=A2 role=mechanism
arrow designerMechanism "Дизайнер" from=designer to=A4 role=mechanism
arrow ozonMechanism "Ozon" from=ozon to=A5 role=mechanism
arrow bomArrow "BOM" from=A3 to=bomOutput role=output
arrow valuesArrow "Цена, вес, изображения" from=A4 to=valuesOutput role=output
arrow cardArrow "Карточка" from=A5 to=cardOutput role=output
`;
