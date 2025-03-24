public class Rectangle implements Shape {
    private double length;
    private double width;

    // Конструктор для прямоугольника
    public Rectangle(double length, double width) {
        this.length = length;
        this.width = width;
    }

    @Override
    public double area() {
        return length * width;  // Площадь прямоугольника
    }

    @Override
    public double perimeter() {
        return 2 * (length + width);  // Периметр прямоугольника
    }

    @Override
    public void print() {
        System.out.println("Rectangle [Length: " + length + ", Width: " + width + "]");
    }
}
