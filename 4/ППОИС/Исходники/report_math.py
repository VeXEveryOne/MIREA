"""Small native OMML authoring path for the report's editable equations.

Only text, scripts, fractions, sums and delimiters are supported. Each input
is an XML element, never interpolated markup or unconverted LaTeX.
"""
from copy import deepcopy

from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def element(name, *children):
    node = OxmlElement('m:' + name)
    for child in children:
        node.append(deepcopy(child))
    return node


def text(value):
    run = element('r')
    props = OxmlElement('w:rPr')
    fonts = OxmlElement('w:rFonts')
    for name in ('ascii', 'hAnsi', 'cs', 'eastAsia'):
        fonts.set(qn('w:' + name), 'Times New Roman')
    props.append(fonts)
    size = OxmlElement('w:sz')
    size.set(qn('w:val'), '28')
    props.append(size)
    run.append(props)
    token = element('t')
    token.text = str(value)
    token.set(qn('xml:space'), 'preserve')
    run.append(token)
    return run


def sub(base, index):
    return element('sSub', element('e', text(base)), element('sub', text(index)))


def fraction(numerator, denominator):
    return element('f', element('num', *numerator), element('den', *denominator))


def delimiter(items, begin='(', end=')'):
    properties = element('dPr')
    for tag, value in [('begChr', begin), ('endChr', end)]:
        setting = element(tag)
        setting.set(qn('m:val'), value)
        properties.append(setting)
    return element('d', properties, element('e', *items))


def summation(items, lower='i = 1', upper='n'):
    props = element('naryPr')
    for tag, value in [('chr', '∑'), ('limLoc', 'undOvr')]:
        setting = element(tag)
        setting.set(qn('m:val'), value)
        props.append(setting)
    return element('nary', props, element('sub', text(lower)),
                   element('sup', text(upper)), element('e', *items))


def equation(report, *items):
    document = report.document
    if 'ReportEquation' not in document.styles:
        style = document.styles.add_style('ReportEquation', 1)
        style.base_style = document.styles['ReportReference']
        style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        style.paragraph_format.line_spacing = 1
        style.paragraph_format.keep_together = True
    paragraph = document.add_paragraph(style='ReportEquation')
    paragraph._p.append(element('oMath', *items))
    return paragraph
