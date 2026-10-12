import { erdEngine } from "./document";
export const erdExampleSource = `erd revisions "Версии BOM и позиции"
diagram logical "Логическая модель" type=logical
diagram physical "Физическая модель" type=physical
entity version "Версия BOM" schema=public sqlName=bom_version
attribute bom "Код BOM" owner=version sqlName=bom_id sqlType=bigint nullable=false order=0
attribute rev "Номер версии" owner=version sqlName=revision sqlType=integer nullable=false order=1
key versionPk "Составной PK" owner=version kind=primary sqlName=bom_version_pkey
keyPart pkBom "" owner=versionPk attribute=bom order=0
keyPart pkRev "" owner=versionPk attribute=rev order=1
entity slot "Позиция BOM" schema=public sqlName=bom_slot
attribute slotId "Идентификатор" owner=slot sqlName=id sqlType=bigint nullable=false identity=always order=0
attribute slotBom "Код BOM" owner=slot sqlName=bom_id sqlType=bigint nullable=false order=1
attribute slotRev "Номер версии" owner=slot sqlName=revision sqlType=integer nullable=false order=2
attribute slotQty Количество owner=slot sqlName=quantity sqlType=integer nullable=false default=1 order=3
key slotPk PK owner=slot kind=primary sqlName=bom_slot_pkey
keyPart slotPkId "" owner=slotPk attribute=slotId order=0
relation contains "Содержит позиции" from=version to=slot fromMin=1 fromMax=1 toMin=0 toMax=many
foreignKey slotVersion "Версия позиции" owner=slot targetKey=versionPk relation=contains onDelete=restrict onUpdate=noAction match=full
fkPart slotVersionBom "" owner=slotVersion attribute=slotBom target=bom order=0
fkPart slotVersionRev "" owner=slotVersion attribute=slotRev target=rev order=1
check positive "Количество положительно" owner=slot expression="quantity > 0"
index latest "Позиции по версии" owner=slot sqlName=slot_version_idx method=btree
indexPart idxBom "" owner=latest attribute=slotBom direction=asc order=0
indexPart idxRev "" owner=latest attribute=slotRev direction=desc order=1
view versionL "" diagram=logical element=version
view slotL "" diagram=logical element=slot
view containsL "" diagram=logical element=contains from=versionL to=slotL
view versionP "" diagram=physical element=version
view slotP "" diagram=physical element=slot
view slotVersionP "" diagram=physical element=slotVersion from=slotP to=versionP
`;
export function createErdExample() {
  const checked = erdEngine.inspect(erdExampleSource);
  if (!checked.model)
    throw new Error(checked.diagnostics.map((d) => d.message).join("\n"));
  const d = erdEngine.create(checked.model);
  return erdEngine.move(d, {
    versionL: { x: 80, y: 80, width: 410, height: 170 },
    slotL: { x: 660, y: 80, width: 460, height: 245 },
    versionP: { x: 80, y: 80, width: 410, height: 170 },
    slotP: { x: 700, y: 80, width: 520, height: 285 },
  });
}
