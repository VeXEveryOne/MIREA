"""PR11-12: extend the existing personal model with application behavior/data."""
import xml.etree.ElementTree as ET
from build_ukoms_pr6_pr7 import BASE, XSI, uid, add_concepts, add_relations, add_view, write
from build_ukoms_pr10 import PR10

OUTPUT = BASE / 'Юкомс_ПР11_АлбахтинИВ.archimate'
CONCEPTS = [
 ('catalog_fn','ApplicationFunction','Поиск сведений о комплектующих'),
 ('media_fn','ApplicationFunction','Обработка изображений товара'),
 ('editor_fn','ApplicationFunction','Формирование данных карточки'),
 ('publish_fn','ApplicationFunction','Обмен карточками с Ozon'),
 ('sync','ApplicationInteraction','Синхронизировать карточку с Ozon'),
 ('auto_publish','ApplicationProcess','Опубликовать карточку через API'),
 ('validate','ApplicationProcess','Проверить данные карточки'),
 ('send','ApplicationProcess','Отправить карточку в Ozon'),
 ('save_status','ApplicationProcess','Сохранить результат публикации'),
 ('saved_event','ApplicationEvent','Карточка сохранена и отправлена на публикацию'),
 ('published_event','ApplicationEvent','Публикация подтверждена Ozon'),
 ('image_record','DataObject','Файлы изображений товара'),
 ('publication_record','DataObject','Результат публикации в Ozon'),
]
# key, type, source, target, caption, optional access mode (0 write, 1 read).
RELATIONS = [
 ('catalog_runs','AssignmentRelationship','catalog_module','catalog_fn','Компонент выполняет',None),
 ('media_runs','AssignmentRelationship','media_module','media_fn','Компонент выполняет',None),
 ('editor_runs','AssignmentRelationship','editor_module','editor_fn','Компонент выполняет',None),
 ('publish_runs','AssignmentRelationship','publish_module','publish_fn','Компонент выполняет',None),
 ('catalog_realizes','RealizationRelationship','catalog_fn','catalog_service','Функция реализует',None),
 ('media_realizes','RealizationRelationship','media_fn','editor_service','Функция реализует',None),
 ('editor_realizes','RealizationRelationship','editor_fn','editor_service','Функция реализует',None),
 ('publish_realizes','RealizationRelationship','publish_fn','publish_app_service','Функция реализует',None),
 ('catalog_reads','AccessRelationship','catalog_fn','components_record','Имеет доступ на чтение','1'),
 ('media_writes','AccessRelationship','media_fn','image_record','Имеет доступ на запись','0'),
 ('editor_writes','AccessRelationship','editor_fn','card_record','Имеет доступ на запись','0'),
 ('collab_sync','AssignmentRelationship','app_collab','sync','Совместно выполняет',None),
 ('sync_start','TriggeringRelationship','sync','auto_publish','Запускает',None),
 ('editor_saved','TriggeringRelationship','editor_fn','saved_event','Запускает',None),
 ('saved_sync','TriggeringRelationship','saved_event','sync','Запускает',None),
 ('gateway_process','AssignmentRelationship','ozon_gateway','auto_publish','Компонент выполняет',None),
 ('publish_process','CompositionRelationship','publish_fn','auto_publish','Является частью',None),
 ('auto_validate','CompositionRelationship','auto_publish','validate','Является частью',None),
 ('auto_send','CompositionRelationship','auto_publish','send','Является частью',None),
 ('auto_save','CompositionRelationship','auto_publish','save_status','Является частью',None),
 ('validate_send','TriggeringRelationship','validate','send','Запускает',None),
 ('send_save','TriggeringRelationship','send','save_status','Запускает',None),
 ('save_published','TriggeringRelationship','save_status','published_event','Запускает',None),
 ('validate_reads','AccessRelationship','validate','card_record','Имеет доступ на чтение','1'),
 ('save_writes','AccessRelationship','save_status','publication_record','Имеет доступ на запись','0'),
 ('auto_realizes','RealizationRelationship','auto_publish','publish_app_service','Процесс реализует',None),
 ('image_realizes','RealizationRelationship','image_record','pictures','Объект данных реализует',None),
 ('card_images','CompositionRelationship','card_record','image_record','Является частью',None),
]

LAYOUT = [
 ('catalog_service',20,20,260,65),('editor_service',530,20,280,65),('publish_app_service',1120,20,280,65),
 ('catalog_fn',20,220,260,65),('media_fn',350,220,260,65),('editor_fn',680,220,260,65),('publish_fn',1120,220,280,65),
 ('catalog_module',20,420,260,65),('media_module',350,420,260,65),('editor_module',680,420,260,65),('publish_module',1120,420,280,65),
 ('app_collab',20,660,260,65),('saved_event',350,660,260,65),('sync',680,660,260,65),('auto_publish',1120,660,280,65),('ozon_gateway',1560,660,260,65),
 ('validate',1120,870,260,65),('send',1450,870,260,65),('save_status',1780,870,260,65),('published_event',2110,870,260,65),
 ('components_record',20,1090,260,65),('image_record',350,1090,260,65),('card_record',930,1090,260,65),('publication_record',1780,1090,260,65),
 ('pictures',350,1270,260,65),
]

ROUTES = {
 'editor_saved':[(1020,250),(1020,560),(480,560)],
 'collab_sync':[(150,760),(810,760)],
 'publish_process':[(1460,250),(1460,600),(1260,600)],
 'auto_realizes':[(1510,690),(1510,50)],
 'catalog_reads':[(15,330),(15,1030),(150,1030)],
 'media_writes':[(320,330),(320,1030),(480,1030)],
 'editor_writes':[(975,250),(975,1030),(1060,1030)],
 'card_images':[(1060,1200),(480,1200)],
}

def main():
 root=ET.parse(PR10).getroot()
 root.set('id',uid('model','pr11'))
 root.set('name','ООО «Юкомс» — ПР11–12: поведение приложений и данные — Албахтин И.В.')
 folders={f.get('type'):f for f in root.findall('folder')}
 add_concepts(folders['application'],CONCEPTS)
 add_relations(folders['relations'],[(k,t,s,d) for k,t,s,d,*_ in RELATIONS])
 allrels={r.get('id'):r for r in folders['relations'].findall('element')}
 for k,t,s,d,label,access in RELATIONS:
  rel=allrels[uid('relation',k)];rel.set('name',label)
  if access is not None:rel.set('accessType',access)
 relations={k:(t,s,d) for k,t,s,d,*_ in RELATIONS}
 add_view(folders['diagrams'],'application_behavior','03 — Поведение приложений ЮКОМС и данные',LAYOUT,list(relations),relations,ROUTES)
 view=folders['diagrams'].findall('element')[-1]
 for c in view.iter('sourceConnection'):c.set('textPosition','1')
 ET.SubElement(view,'documentation').text='Основной сценарий успешной публикации. Отказы API и повторная отправка находятся за границами этой учебной диаграммы. Функции реализуют сервисы из ПР10; процесс публикации раскрыт последовательностью проверки, отправки и сохранения результата. ПР11–12.'
 write(root,OUTPUT)

if __name__=='__main__':main()
