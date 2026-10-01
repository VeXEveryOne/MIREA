import json
p='tmp/ppois_pr4/ПР4_Модель_деятельности.omni'
d=json.load(open(p,encoding='utf8'))
reps={
'action accept Опубликовать карточку kind=':'action accept "Опубликовать карточку" kind=',
'outputPin dataOut Версия BOM ':'outputPin dataOut "Версия BOM" ',
'inputPin dataIn Версия BOM ':'inputPin dataIn "Версия BOM" ',
'objectFlow data Версия BOM ':'objectFlow data "Версия BOM" ',
'outputPin unused Незавершённые данные ':'outputPin unused "Незавершённые данные" ',
'objectFlow discard Зафиксировать ошибку ':'objectFlow discard "Зафиксировать ошибку" '
}
for a,b in reps.items():
 d['source']=d['source'].replace(a,b)
 d['draft']=d['draft'].replace(a,b)
json.dump(d,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=2)
