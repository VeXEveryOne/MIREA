from PIL import Image
from matplotlib import pyplot as plt
import numpy as np
import random
from numba import njit

# Numba

def load_image(fname) :
    img = Image.open(fname)
    img.load()
    return np.array(img, dtype="uint8")

@njit
def generate_points(h: int, w: int, c: int) -> list[tuple[int, int]]:
    d = []
    for i in range(c):
        x = random.randint(0, w-1)
        y = random.randint(0, h-1)
        d.append((x, y))
    return d

def test_generate_points():
    points = generate_points(2, 2, 5)
    assert len(points) == 5

@njit
def distance(p, q):
    s = 0
    for i in range(len(p)):
        s += (p[i] - q[i]) ** 2
    return s ** 0.5

@njit
def voronoi(image, points_count):
    height = image.shape[0]
    width = image.shape[1]
    points = generate_points(height, width, points_count)
    for j in range(height):
        for i in range(width):
            x, y = points[0]
            d = distance( (i, j), (x, y) )
            for point in points:
                dis = distance((i, j), point)
                if dis < d:
                    x, y = point
                    d = dis
            image[j][i] = image[y][x] 
    return image

if __name__ == '__main__':
    I = load_image('winter1.jpg')
    plt.imshow(voronoi(I, 2000))
    plt.show()
