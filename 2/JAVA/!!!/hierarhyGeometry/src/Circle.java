public class Circle implements Shape {
    private double radius;

    // Конструктор для круга
    public Circle(double radius) {
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;  // Площадь круга
    }

    @Override
    public double perimeter() {
        return 2 * Math.PI * radius;  // Периметр круга (окружность)
    }

    @Override
    public void print() {
        System.out.println("Circle [Radius: " + radius + "]");
    }
}