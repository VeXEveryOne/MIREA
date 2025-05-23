# Оценка качества покрытия кода тестами.
#  pip install coverage
#  coverage run --branch -m pytest test.py
#  coverage report
#  coverage html

import math
from random import randint
from tkinter import Tk, Canvas, Button

CANVAS_WIDTH, CANVAS_HEIGHT = 800, 600
NODE_R = 15
C1, C2, C3, C4 = 0.2, 5, 20000, 0.1  # прикольно
DELAY = 10


class Graph:
    def __init__(self):
        self.nodes = []

    def add(self, text):
        self.nodes.append(Node(text))
        return self.nodes[-1]


class GUI:
    def __init__(self, root):
        self.root = root
        self.canvas = Canvas(root, width=CANVAS_WIDTH, height=CANVAS_HEIGHT, bg="white")
        self.draw_button = Button(root, text="Draw", command=self.start_draw)
        self.canvas.pack()
        self.draw_button.pack()
        self.nodes = None
        self.busy = None

    def draw_node(self, x, y, text, r=NODE_R):
        self.canvas.create_oval(x - r, y - r, x + r, y + r, fill="MistyRose2")
        self.canvas.create_text(x, y, text=text)

    def draw_graph(self):
        for n in self.nodes:
            for t in n.targets:
                self.canvas.create_line(n.vec.x, n.vec.y, t.vec.x, t.vec.y)
        for n in self.nodes:
            self.draw_node(n.vec.x, n.vec.y, n.text)

    def start_draw(self):
        self.canvas.delete("all")
        if self.busy:
            self.root.after_cancel(self.busy)
        random_layout(self.nodes)
        self.animate()

    def animate(self):
        self.canvas.delete("all")
        for _ in range(DELAY):
            force_layout(self.nodes)
        self.draw_graph()
        self.busy = self.root.after(5, self.animate)


def random_layout(nodes):
    for n in nodes:
        n.vec.x = randint(NODE_R * 4, CANVAS_WIDTH - NODE_R * 4 - 1)
        n.vec.y = randint(NODE_R * 4, CANVAS_HEIGHT - NODE_R * 4 - 1)


class Vec:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    # сигнатура функции
    def __sub__(self, v: "Vec") -> "Vec":
        # тело функции
        x = self.x - v.x
        y = self.y - v.y
        return Vec(x, y)

    def norm(self) -> float:
        return math.sqrt(self.x**2 + self.y**2)

    def unit(self) -> "Vec":
        return Vec(self.x / self.norm(), self.y / self.norm())

    def __mul__(self, v: float) -> "Vec":
        return Vec(self.x * v, self.y * v)

    def __add__(self, v: "Vec") -> "Vec":
        return Vec(self.x + v.x, self.y + v.y)


# self + v == self.__add__(v)
# vec * const == vec.__mul__(const)
# 3, 4, 5, (3 ** 2 + 4 ** 2) ** 0.5 == 5
# Eigenvector (единичный вектор)
# x / norm, y / norm
# norm(v) == || v || == sqrt(x ** 2 + y ** 2)
# Покрытие кода тестами.
# 3A: Arrange, Act, Assert
# SUT (System Under Test)
# pytest: Python testing framework


def test_vec_norm():
    a = Vec(3, 4)
    n = a.norm()
    assert n == 5


def test_vec_unit():
    a = Vec(3, 4)
    u = a.unit()
    assert u.x == 3 / 5
    assert u.y == 4 / 5


def test_vec_mul():
    a = Vec(1, 1)
    m = a * 3
    assert m.x == 3
    assert m.y == 3


def test_vec_sub():
    a = Vec(1, 2)
    b = Vec(3, 4)
    c = b - a
    assert c.x == 2
    assert c.y == 2


# self - v
# Сила, действующая на пружину
def f_spring(u: Vec, v: Vec) -> Vec:
    return (v - u).unit() * C1 * math.log((v - u).norm() / C2)


# smoke-test
def test_f_spring():
    a = Vec(2, 3)
    b = Vec(3, 2)
    c = f_spring(a, b)
    assert c


# Сила, действующая на точку
def f_ball(u, v):
    return (u - v).unit() * (C3 / ((v - u).norm() ** 2))


def test_f_ball():
    a = Vec(1, 2)
    b = Vec(3, 4)
    c = f_ball(a, b)
    assert c


class Node:
    def __init__(self, text):
        self.text = text
        self.targets: list[Node] = []
        self.vec = Vec(0, 0)

    def to(self, *nodes):
        for n in nodes:
            self.targets.append(n)
            n.targets.append(self)
        return self


# u - текущая вершина графа.
# nodes - все вершины графа.
def f(u: Node, nodes: list[Node]):
    f1 = Vec(0, 0)
    for v in u.targets:
        f1 = f1 + f_spring(u.vec, v.vec)
    # set(nodes) - set(targets) - {2}
    for w in set(nodes) - set(u.targets) - {u}:
        f1 = f1 + f_ball(u.vec, w.vec)
    return f1


def force_layout(nodes: list[Node]):
    forces: dict[Node, Vec] = {}
    for n in nodes:
        forces[n] = f(n, nodes)
    for n in nodes:
        n.vec = n.vec + forces[n]


def run():
    g = Graph()
    n1 = g.add("1")
    n2 = g.add("2")
    n3 = g.add("3")
    n4 = g.add("4")
    n5 = g.add("5")
    n6 = g.add("6")
    n7 = g.add("7")
    n1.to(n2, n3, n4, n5)
    n2.to(n5)
    n3.to(n2, n4)
    n6.to(n4, n1, n7)
    n7.to(n5, n1)
    root = Tk()
    w = GUI(root)
    w.nodes = g.nodes
    root.mainloop()


if __name__ == "__main__":
    run()
