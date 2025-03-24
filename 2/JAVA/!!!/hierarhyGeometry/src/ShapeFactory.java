public class ShapeFactory {

    // Метод для создания прямоугольника
    public static Shape createRectangle(double length, double width) {
        return new Rectangle(length, width);
    }

    // Метод для создания круга
    public static Shape createCircle(double radius) {
        return new Circle(radius);
    }
}
