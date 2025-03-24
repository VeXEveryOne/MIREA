public class Main {
    public static void main(String[] args) {
        // Создаем фигуры с помощью фабрики
        Shape rectangle = ShapeFactory.createRectangle(10, 5);
        Shape circle = ShapeFactory.createCircle(7);

        // Печатаем информацию о фигурах
        System.out.println("Rectangle:");
        rectangle.print();
        System.out.println("Area: " + rectangle.area());
        System.out.println("Perimeter: " + rectangle.perimeter());

        System.out.println("\nCircle:");
        circle.print();
        System.out.println("Area: " + circle.area());
        System.out.println("Perimeter: " + circle.perimeter());
    }
}
