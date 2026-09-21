from report_engine import contract
from diagrams import build
from content_2_3 import practice2,practice3,WBS
from content_4_5 import practice4,practice5

assert sum(int(row[4]) for row in WBS)==432
contract()
figs=build()
for func in [practice2,practice3,practice4,practice5]:func(figs)
