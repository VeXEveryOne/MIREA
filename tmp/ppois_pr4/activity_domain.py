import json
p=r'D:/OmniNotation/examples/activity-parallel-pins.omni'
d=json.load(open(p,encoding='utf8'))
updates={
'work':'Актуализировать карточку','main':'Параллельная подготовка BOM и контента','payload':'Версия BOM','compose':'Сформировать BOM','fetch':'Загрузить цены и наличие','check':'Готова к публикации?','accept':'Опубликовать карточку','reject':'Показать ошибки и вернуть на доработку','dataOut':'Версия BOM','dataIn':'Версия BOM','unused':'Незавершённые данные','data':'Версия BOM','discard':'Зафиксировать ошибку'
}
for e in d['model']['elements']:
 if e['id'] in updates: e['label']=updates[e['id']]
line_repl={
'activity work "Подготовить карточку"':'activity work "Актуализировать карточку"',
'diagram main "Потоки управления и данных"':'diagram main "Параллельная подготовка BOM и контента"',
'class payload "Версия карточки"':'class payload "Версия BOM"',
'action compose "Подготовить BOM"':'action compose "Сформировать BOM"',
'action fetch "Получить предложения"':'action fetch "Загрузить цены и наличие"',
'decision check "Готово?"':'decision check "Готова к публикации?"',
'action accept Принять':'action accept "Опубликовать карточку"',
'action reject "Вернуть на доработку"':'action reject "Показать ошибки и вернуть на доработку"',
'outputPin dataOut Версия classifier=':'outputPin dataOut "Версия BOM" classifier=',
'inputPin dataIn Версия classifier=':'inputPin dataIn "Версия BOM" classifier=',
'outputPin unused Остаток classifier=':'outputPin unused "Незавершённые данные" classifier=',
'objectFlow data Версия from=':'objectFlow data "Версия BOM" from=',
'objectFlow discard Отбросить from=':'objectFlow discard "Зафиксировать ошибку" from='
}
for a,b in line_repl.items():
 d['source']=d['source'].replace(a,b)
 d['draft']=d['draft'].replace(a,b)
json.dump(d,open('tmp/ppois_pr4/activity_domain.omni','w',encoding='utf8'),ensure_ascii=False,indent=2)
