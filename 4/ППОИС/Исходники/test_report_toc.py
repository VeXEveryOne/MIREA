"""Keep the template's native TOC styles stable through report authoring."""
import unittest

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

from build_report_7 import configure_toc_styles
from report_layout import REFERENCE, configure_styles


class TocStyleTests(unittest.TestCase):
    def test_reuse_native_styles_and_explicit_hierarchy(self):
        document = Document(REFERENCE)
        configure_styles(document)
        configure_toc_styles(document)
        original = {s.name.casefold(): s.style_id for s in document.styles
                    if s.name.casefold() in ('toc 1', 'toc 2')}
        self.assertEqual(set(original), {'toc 1', 'toc 2'})
        configure_toc_styles(document)  # Repeat must not create another style.
        actual = [s for s in document.styles if s.name.casefold() in original]
        self.assertEqual(len(actual), 2)
        for style in actual:
            self.assertEqual(style.style_id, original[style.name.casefold()])
            self.assertTrue(style.builtin)
            self.assertEqual(style.font.name, 'Times New Roman')
            self.assertEqual(style.font.size.pt, 14)
            pf = style.paragraph_format
            self.assertEqual(pf.alignment, WD_ALIGN_PARAGRAPH.LEFT)
            self.assertAlmostEqual(pf.left_indent.cm, .7 if style.name.endswith('2') else 0, places=2)
            self.assertEqual(pf.first_line_indent, 0)
            self.assertEqual(pf.right_indent, 0)
            self.assertEqual(pf.line_spacing, 1)
            self.assertFalse(style.element.findall(qn('w:autoRedefine')))


if __name__ == '__main__':
    unittest.main()
