"""Keep Word's cached field values visible to python-docx artifact audits.

Word may save a SEQ field as fldSimple after refresh. Expanding that equivalent
representation retains its instruction, cached runs, formatting and PDF text.
Run after field refresh; this does not calculate or invent field results.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree

W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def expand(path):
    with ZipFile(path) as package:
        root=etree.fromstring(package.read('word/document.xml'))
        fields=root.findall('.//{'+W+'}fldSimple')
        for field in fields:
            parent=field.getparent();position=parent.index(field);runs=[]
            for kind in ('begin','instruction','separate'):
                run=etree.Element('{'+W+'}r')
                node=etree.SubElement(run,'{'+W+'}'+('instrText' if kind=='instruction' else 'fldChar'))
                if kind=='instruction':
                    node.text=field.get('{'+W+'}instr');node.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
                else:node.set('{'+W+'}fldCharType',kind)
                runs.append(run)
            runs.extend(list(field))
            run=etree.Element('{'+W+'}r');etree.SubElement(run,'{'+W+'}fldChar').set('{'+W+'}fldCharType','end');runs.append(run)
            parent.remove(field)
            for i,run in enumerate(runs):parent.insert(position+i,run)
        if not fields:return 0
        temporary=path.with_suffix('.writing.docx')
        with ZipFile(temporary,'w') as result:
            for item in package.infolist():result.writestr(item,etree.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True) if item.filename=='word/document.xml' else package.read(item.filename))
    temporary.replace(path);return len(fields)

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('documents',nargs='+',type=Path)
    for document in parser.parse_args().documents:print(document,expand(document))
